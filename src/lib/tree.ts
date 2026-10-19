import type { Person, PersonRelation } from "@/lib/types";

export type TreeLinks = {
  parents: Person[];
  children: Person[];
  spouses: Person[];
  siblings: Person[];
};

export function buildPersonIndex(people: Person[]) {
  return new Map(people.map((p) => [p.id, p]));
}

/** relation: person_id has related_person_id as parent */
export function linksForPerson(
  focusId: string,
  people: Person[],
  relations: PersonRelation[],
): TreeLinks {
  const byId = buildPersonIndex(people);

  const parentIds = relations
    .filter((r) => r.person_id === focusId && r.relation_type === "parent")
    .map((r) => r.related_person_id);

  const parents = parentIds.map((id) => byId.get(id)).filter(Boolean) as Person[];

  const children = relations
    .filter((r) => r.related_person_id === focusId && r.relation_type === "parent")
    .map((r) => byId.get(r.person_id))
    .filter(Boolean) as Person[];

  const spouseIds = new Set<string>();
  for (const r of relations) {
    if (r.relation_type !== "spouse") continue;
    if (r.person_id === focusId) spouseIds.add(r.related_person_id);
    if (r.related_person_id === focusId) spouseIds.add(r.person_id);
  }
  const spouses = [...spouseIds].map((id) => byId.get(id)).filter(Boolean) as Person[];

  // siblings = share at least one parent, exclude self
  const siblingIds = new Set<string>();
  for (const pid of parentIds) {
    for (const r of relations) {
      if (r.relation_type === "parent" && r.related_person_id === pid && r.person_id !== focusId) {
        siblingIds.add(r.person_id);
      }
    }
  }
  const siblings = [...siblingIds].map((id) => byId.get(id)).filter(Boolean) as Person[];

  return { parents, children, spouses, siblings };
}

export function pickDefaultFocus(people: Person[]): string | null {
  if (people.length === 0) return null;
  // Prefer someone with both parents and children if possible, else first
  return people[0]?.id ?? null;
}
