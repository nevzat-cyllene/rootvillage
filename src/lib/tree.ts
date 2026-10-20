import type { Person, PersonRelation } from "@/lib/types";

export type TreeLinks = {
  parents: Person[];
  children: Person[];
  spouses: Person[];
  siblings: Person[];
};

export type ExtendedRelative = {
  person: Person;
  label: string;
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

/** True when adding child -> parent would make someone their own ancestor. */
export function wouldCreateParentCycle(
  childId: string,
  parentId: string,
  relations: PersonRelation[],
): boolean {
  if (childId === parentId) return true;

  const seen = new Set<string>();
  const visitAncestors = (personId: string): boolean => {
    if (personId === childId) return true;
    if (seen.has(personId)) return false;
    seen.add(personId);
    return relations
      .filter((relation) => relation.person_id === personId && relation.relation_type === "parent")
      .some((relation) => visitAncestors(relation.related_person_id));
  };

  return visitAncestors(parentId);
}

function kinLabel(relative: Person, parent: Person): string {
  if (relative.gender === "female") {
    if (parent.gender === "male") return "Hala";
    if (parent.gender === "female") return "Teyze";
  }
  if (relative.gender === "male") {
    if (parent.gender === "male") return "Amca";
    if (parent.gender === "female") return "Dayı";
  }
  return "Ebeveynin kardeşi";
}

/**
 * These labels are derived from the two primary relations instead of being
 * stored separately. This keeps aunt/uncle and in-law information consistent
 * whenever a parent or spouse relation changes.
 */
export function extendedLinksForPerson(
  focusId: string,
  people: Person[],
  relations: PersonRelation[],
): ExtendedRelative[] {
  const focusLinks = linksForPerson(focusId, people, relations);
  const relatives: ExtendedRelative[] = [];

  for (const parent of focusLinks.parents) {
    const parentLinks = linksForPerson(parent.id, people, relations);
    for (const sibling of parentLinks.siblings) {
      relatives.push({ person: sibling, label: kinLabel(sibling, parent) });
    }
  }

  for (const child of focusLinks.children) {
    const childLinks = linksForPerson(child.id, people, relations);
    for (const spouse of childLinks.spouses) {
      const label =
        spouse.gender === "female"
          ? "Gelin"
          : spouse.gender === "male"
            ? "Damat"
            : "Çocuğunun eşi";
      relatives.push({ person: spouse, label });
    }
  }

  const seen = new Set<string>();
  return relatives.filter(({ person, label }) => {
    const key = `${person.id}:${label}`;
    if (person.id === focusId || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
