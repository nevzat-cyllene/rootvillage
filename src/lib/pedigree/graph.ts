import type { Person, PersonRelation } from "@/lib/types";

/**
 * Adjacency view over `people` + `person_relations`.
 *
 * Relation semantics (see migrations 001/005):
 *   parent: person_id = child, related_person_id = parent
 *   spouse: symmetric
 *
 * Only edges whose both ends resolve to a known person are kept, so partial
 * payloads (e.g. relatives hidden by RLS) never produce dangling references.
 */
export type KinGraph = {
  people: Map<string, Person>;
  /** child → parents */
  parents: Map<string, string[]>;
  /** parent → children */
  children: Map<string, string[]>;
  /** person → spouses */
  spouses: Map<string, string[]>;
  /** person → co-parents that are not recorded as spouses */
  coParents: Map<string, string[]>;
};

function push(map: Map<string, string[]>, key: string, value: string) {
  const list = map.get(key);
  if (!list) {
    map.set(key, [value]);
    return;
  }
  if (!list.includes(value)) list.push(value);
}

export function buildGraph(people: Person[], relations: PersonRelation[]): KinGraph {
  const byId = new Map(people.map((person) => [person.id, person]));
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  const spouses = new Map<string, string[]>();

  for (const relation of relations) {
    if (!byId.has(relation.person_id) || !byId.has(relation.related_person_id)) continue;
    if (relation.person_id === relation.related_person_id) continue;
    if (relation.relation_type === "parent") {
      push(parents, relation.person_id, relation.related_person_id);
      push(children, relation.related_person_id, relation.person_id);
    } else if (relation.relation_type === "spouse") {
      push(spouses, relation.person_id, relation.related_person_id);
      push(spouses, relation.related_person_id, relation.person_id);
    }
  }

  const coParents = new Map<string, string[]>();
  for (const [, parentIds] of parents) {
    if (parentIds.length < 2) continue;
    for (const a of parentIds) {
      for (const b of parentIds) {
        if (a === b) continue;
        if (spouses.get(a)?.includes(b)) continue;
        push(coParents, a, b);
      }
    }
  }

  // Stable ordering: men first, then birth year, then name — keeps layouts
  // deterministic between renders and data refreshes.
  const order = (a: string, b: string) => comparePeople(byId.get(a)!, byId.get(b)!);
  for (const map of [parents, children, spouses, coParents]) {
    for (const list of map.values()) list.sort(order);
  }

  return { people: byId, parents, children, spouses, coParents };
}

export function comparePeople(a: Person, b: Person): number {
  const ay = a.birth_year ?? Number.POSITIVE_INFINITY;
  const by = b.birth_year ?? Number.POSITIVE_INFINITY;
  if (ay !== by) return ay - by;
  return a.full_name.localeCompare(b.full_name, "tr");
}

export function parentsOf(graph: KinGraph, id: string): string[] {
  return graph.parents.get(id) ?? [];
}
export function childrenOf(graph: KinGraph, id: string): string[] {
  return graph.children.get(id) ?? [];
}
export function spousesOf(graph: KinGraph, id: string): string[] {
  return graph.spouses.get(id) ?? [];
}
/** Spouses plus co-parents without a spouse record. */
export function partnersOf(graph: KinGraph, id: string): string[] {
  const out = [...spousesOf(graph, id)];
  for (const partner of graph.coParents.get(id) ?? []) {
    if (!out.includes(partner)) out.push(partner);
  }
  return out;
}

/** Walk up from `id` to the top-most ancestor following first parents. */
export function topAncestor(graph: KinGraph, id: string): string {
  let current = id;
  const seen = new Set<string>([id]);
  for (;;) {
    const ps = parentsOf(graph, current);
    const next = ps.find((p) => !seen.has(p));
    if (!next) return current;
    seen.add(next);
    current = next;
  }
}

/** Ancestors with shortest upward distance and the first parent on that path. */
export function ancestorDistances(
  graph: KinGraph,
  id: string,
): Map<string, { up: number; via: string | null }> {
  const out = new Map<string, { up: number; via: string | null }>([[id, { up: 0, via: null }]]);
  const queue: Array<{ id: string; up: number; via: string | null }> = [{ id, up: 0, via: null }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const parent of parentsOf(graph, current.id)) {
      if (out.has(parent)) continue;
      const via = current.via ?? parent;
      out.set(parent, { up: current.up + 1, via });
      queue.push({ id: parent, up: current.up + 1, via });
    }
  }
  return out;
}
