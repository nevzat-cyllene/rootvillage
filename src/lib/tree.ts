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

  const parents = [
    ...new Map(
      parentIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((person) => [person!.id, person!]),
    ).values(),
  ];

  const children = [
    ...new Map(
      relations
        .filter((r) => r.related_person_id === focusId && r.relation_type === "parent")
        .map((r) => byId.get(r.person_id))
        .filter(Boolean)
        .map((person) => [person!.id, person!]),
    ).values(),
  ];

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

function genderedLabel(
  person: Person,
  labels: { female: string; male: string; fallback: string },
): string {
  if (person.gender === "female") return labels.female;
  if (person.gender === "male") return labels.male;
  return labels.fallback;
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
  const push = (person: Person, label: string) => {
    if (person.id !== focusId) relatives.push({ person, label });
  };

  for (const sibling of focusLinks.siblings) {
    push(sibling, genderedLabel(sibling, {
      female: "Kız kardeş",
      male: "Erkek kardeş",
      fallback: "Kardeş",
    }));

    const siblingLinks = linksForPerson(sibling.id, people, relations);
    for (const child of siblingLinks.children) push(child, "Yeğen");
    for (const spouse of siblingLinks.spouses) {
      push(spouse, genderedLabel(spouse, {
        female: "Yenge",
        male: "Enişte",
        fallback: "Kardeşinin eşi",
      }));
    }
  }

  for (const parent of focusLinks.parents) {
    const parentLinks = linksForPerson(parent.id, people, relations);
    for (const grandparent of parentLinks.parents) {
      const label = grandparent.gender === "male"
        ? "Dede"
        : grandparent.gender === "female"
          ? parent.gender === "female" ? "Anneanne" : parent.gender === "male" ? "Babaanne" : "Büyükanne"
          : "Büyük ebeveyn";
      push(grandparent, label);
    }
    for (const sibling of parentLinks.siblings) {
      push(sibling, kinLabel(sibling, parent));
      const auntUncleLinks = linksForPerson(sibling.id, people, relations);
      for (const cousin of auntUncleLinks.children) push(cousin, "Kuzen");
    }
  }

  for (const child of focusLinks.children) {
    const childLinks = linksForPerson(child.id, people, relations);
    for (const grandchild of childLinks.children) push(grandchild, "Torun");
    for (const spouse of childLinks.spouses) {
      const label =
        spouse.gender === "female"
          ? "Gelin"
          : spouse.gender === "male"
            ? "Damat"
            : "Çocuğunun eşi";
      push(spouse, label);
    }
  }

  for (const spouse of focusLinks.spouses) {
    const spouseFamily = linksForPerson(spouse.id, people, relations);
    for (const parent of spouseFamily.parents) {
      push(parent, genderedLabel(parent, {
        female: "Kayınvalide",
        male: "Kayınpeder",
        fallback: "Eşinin ebeveyni",
      }));
    }
    for (const sibling of spouseFamily.siblings) push(sibling, "Eşinin kardeşi");
  }

  const seen = new Set<string>();
  return relatives.filter(({ person, label }) => {
    const key = `${person.id}:${label}`;
    if (person.id === focusId || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Generation number within a family (1 = founding / no in-family parents). */
export function resolvePersonGeneration(
  personId: string,
  people: Person[],
  relations: PersonRelation[],
  memo = new Map<string, number>(),
  path = new Set<string>(),
): number {
  const cached = memo.get(personId);
  if (cached != null) return cached;
  if (path.has(personId)) return 1;

  const person = people.find((p) => p.id === personId);
  if (!person) return 1;
  if (person.generation != null && person.generation >= 1) {
    memo.set(personId, person.generation);
    return person.generation;
  }

  const nextPath = new Set(path).add(personId);
  const inFamilyParents = relations
    .filter(
      (r) =>
        r.relation_type === "parent" &&
        r.person_id === personId &&
        people.some((p) => p.id === r.related_person_id && p.family_id === person.family_id),
    )
    .map((r) => r.related_person_id);

  const generation =
    inFamilyParents.length === 0
      ? 1
      : 1 +
        Math.max(
          ...inFamilyParents.map((parentId) =>
            resolvePersonGeneration(parentId, people, relations, memo, nextPath),
          ),
        );

  memo.set(personId, generation);
  return generation;
}

/** Short kinship label relative to founding generation (1). */
export function generationKinLabel(generation: number): string {
  if (generation <= 1) return "1. nesil · kurucu";
  if (generation === 2) return "Çocuk · 2. nesil";
  if (generation === 3) return "Torun · 3. nesil";
  if (generation === 4) return "Torun çocuğu · 4. nesil";
  if (generation === 5) return "Torunun torunu · 5. nesil";
  return `${generation}. nesil`;
}

export function generationBadgeLabel(generation: number): string {
  if (generation <= 1) return "1. nesil";
  if (generation === 2) return "Çocuk";
  if (generation === 3) return "Torun";
  if (generation === 4) return "Torun çocuğu";
  return `${generation}. nesil`;
}
