import { createClient } from "@/lib/supabase/server";
import type {
  Comment,
  CommentTarget,
  EditProposal,
  Family,
  HeritageEntry,
  Person,
  PersonRelation,
  Profile,
  Village,
} from "@/lib/types";

export async function getVillages(query?: string): Promise<Village[]> {
  const supabase = await createClient();
  const term = query?.trim();
  const villagesQuery = (includeTurkishName: boolean) => {
    let request = supabase
      .from("villages")
      .select("*, families(count)")
      .is("deleted_at", null)
      .order("name", { ascending: true });
    if (term) {
      request = includeTurkishName
        ? request.or(`name.ilike.%${term}%,name_tr.ilike.%${term}%`)
        : request.ilike("name", `%${term}%`);
    }
    return request;
  };

  let { data, error } = await villagesQuery(true);
  // Deploys remain readable until migration 004 has been applied.
  if (error?.code === "42703" || error?.code === "PGRST204") {
    ({ data, error } = await villagesQuery(false));
  }
  if (error) {
    console.error("getVillages", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...(row as Village),
    family_count: Array.isArray(row.families)
      ? (row.families[0] as { count: number } | undefined)?.count ?? 0
      : 0,
  }));
}

export async function getHeritageEntries(query?: string): Promise<HeritageEntry[]> {
  const supabase = await createClient();
  let q = supabase
    .from("heritage_entries")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (query?.trim()) {
    const term = query.trim();
    q = q.or(`title.ilike.%${term}%,title_tr.ilike.%${term}%,location_text.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    console.error("getHeritageEntries", error.message);
    return [];
  }
  return (data ?? []) as HeritageEntry[];
}

export async function getHeritageEntryBySlug(slug: string): Promise<HeritageEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("heritage_entries")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("getHeritageEntryBySlug", error.message);
    return null;
  }
  return data as HeritageEntry | null;
}

export async function getVillageBySlug(slug: string): Promise<Village | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("villages")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("getVillageBySlug", error.message);
    return null;
  }
  return data as Village | null;
}

export async function getFamiliesByVillage(villageId: string): Promise<Family[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("families")
    .select("*, people(count)")
    .eq("village_id", villageId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("getFamiliesByVillage", error.message);
    return [];
  }

  const families = (data ?? []).map((row) => ({
    ...(row as Family),
    people_count: Array.isArray(row.people)
      ? (row.people[0] as { count: number } | undefined)?.count ?? 0
      : 0,
  }));

  const familyIds = families.map((family) => family.id);
  if (familyIds.length === 0) return families;

  const { data: peopleRows, error: peopleError } = await supabase
    .from("people")
    .select("id, family_id, full_name")
    .in("family_id", familyIds)
    .is("deleted_at", null);

  if (peopleError || !peopleRows?.length) {
    return families.map((family) => ({
      ...family,
      generation_count: (family.people_count ?? 0) > 0 ? 1 : 0,
      offspring_family_ids: [],
      child_people: [],
      children_by_person: {},
    }));
  }

  const personIds = peopleRows.map((person) => person.id);
  const familyByPerson = new Map(peopleRows.map((person) => [person.id, person.family_id]));
  const nameByPerson = new Map(peopleRows.map((person) => [person.id, person.full_name as string]));
  const { data: relationRows } = await supabase
    .from("person_relations")
    .select("person_id, related_person_id, relation_type")
    .or(`person_id.in.(${personIds.join(",")}),related_person_id.in.(${personIds.join(",")})`)
    .is("deleted_at", null);

  const parentsByChild = new Map<string, string[]>();
  const familyLinkCounts = new Map<string, number>();
  /** parentFamilyId → child family ids (cross-family only) */
  const offspringByFamily = new Map<string, Set<string>>();
  /** parentPersonId → direct children (deduped) */
  const childrenByPersonMaps = new Map<
    string,
    Map<string, { id: string; full_name: string }>
  >();

  for (const relation of relationRows ?? []) {
    const personFamily = familyByPerson.get(relation.person_id);
    const relatedFamily = familyByPerson.get(relation.related_person_id);
    if (personFamily && relatedFamily && personFamily !== relatedFamily) {
      const [left, right] = [personFamily, relatedFamily].sort();
      const key = `${left}:${right}`;
      familyLinkCounts.set(key, (familyLinkCounts.get(key) ?? 0) + 1);
    }

    if (relation.relation_type !== "parent") continue;

    // person_id = child, related_person_id = parent
    const childId = relation.person_id;
    const parentId = relation.related_person_id;
    const childFamily = familyByPerson.get(childId);
    const parentFamily = familyByPerson.get(parentId);
    if (!childFamily || !parentFamily) continue;

    const childName = nameByPerson.get(childId);
    if (childName) {
      const personBucket = childrenByPersonMaps.get(parentId) ?? new Map();
      personBucket.set(childId, { id: childId, full_name: childName });
      childrenByPersonMaps.set(parentId, personBucket);
    }

    if (childFamily !== parentFamily) {
      const set = offspringByFamily.get(parentFamily) ?? new Set();
      set.add(childFamily);
      offspringByFamily.set(parentFamily, set);
    }

    // Same-family parents only for generation depth (existing behavior)
    if (childFamily !== parentFamily) continue;
    const current = parentsByChild.get(childId) ?? [];
    current.push(parentId);
    parentsByChild.set(childId, current);
  }

  const childrenByPerson: Record<string, Array<{ id: string; full_name: string }>> = {};
  for (const [parentId, kids] of childrenByPersonMaps) {
    childrenByPerson[parentId] = [...kids.values()];
  }

  /**
   * Atlas bloom children: only direct kids of founding members
   * (no in-family parent). Avoids flooding the map with grandchildren.
   */
  const founderChildrenByFamily = new Map<
    string,
    Map<string, { id: string; full_name: string; family_id: string }>
  >();
  for (const familyId of familyIds) {
    const members = peopleRows.filter((person) => person.family_id === familyId);
    const founders = members.filter(
      (person) => (parentsByChild.get(person.id) ?? []).length === 0,
    );
    const bucket = new Map<string, { id: string; full_name: string; family_id: string }>();
    for (const founder of founders) {
      for (const child of childrenByPersonMaps.get(founder.id)?.values() ?? []) {
        const childFamily = familyByPerson.get(child.id);
        if (!childFamily) continue;
        bucket.set(child.id, {
          id: child.id,
          full_name: child.full_name,
          family_id: childFamily,
        });
      }
    }
    founderChildrenByFamily.set(familyId, bucket);
  }

  const depthMemo = new Map<string, number>();
  const generationDepth = (personId: string, path = new Set<string>()): number => {
    const memoized = depthMemo.get(personId);
    if (memoized) return memoized;
    if (path.has(personId)) return 1;

    const nextPath = new Set(path).add(personId);
    const parents = parentsByChild.get(personId) ?? [];
    const depth = parents.length === 0
      ? 1
      : 1 + Math.max(...parents.map((parentId) => generationDepth(parentId, nextPath)));
    depthMemo.set(personId, depth);
    return depth;
  };

  const clusterParent = new Map(familyIds.map((id) => [id, id]));
  const findCluster = (id: string): string => {
    const parent = clusterParent.get(id) ?? id;
    if (parent === id) return id;
    const root = findCluster(parent);
    clusterParent.set(id, root);
    return root;
  };
  const unionCluster = (left: string, right: string) => {
    const leftRoot = findCluster(left);
    const rightRoot = findCluster(right);
    if (leftRoot !== rightRoot) clusterParent.set(rightRoot, leftRoot);
  };

  for (const [key, strength] of familyLinkCounts) {
    if (strength < 2) continue;
    const [left, right] = key.split(":");
    if (left && right) unionCluster(left, right);
  }

  const clusterRoots = [...new Set(
    familyIds
      .map((id) => findCluster(id))
      .filter((root) => familyIds.filter((id) => findCluster(id) === root).length > 1),
  )];

  return families.map((family) => {
    const familyPeople = peopleRows.filter((person) => person.family_id === family.id);
    const kinshipLinks = [...familyLinkCounts.entries()].flatMap(([key, strength]) => {
      const [left, right] = key.split(":");
      if (left === family.id && right) return [{ family_id: right, strength }];
      if (right === family.id && left) return [{ family_id: left, strength }];
      return [];
    });
    const root = findCluster(family.id);
    return {
      ...family,
      generation_count: familyPeople.length === 0
        ? 0
        : Math.max(...familyPeople.map((person) => generationDepth(person.id))),
      kinship_cluster: clusterRoots.includes(root) ? clusterRoots.indexOf(root) : null,
      kinship_links: kinshipLinks,
      offspring_family_ids: [...(offspringByFamily.get(family.id) ?? [])],
      child_people: [...(founderChildrenByFamily.get(family.id)?.values() ?? [])],
      children_by_person: childrenByPerson,
    };
  });
}

export async function getFamilyById(id: string): Promise<Family | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("getFamilyById", error.message);
    return null;
  }
  return data as Family | null;
}

export async function getPeopleByFamily(familyId: string): Promise<Person[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("getPeopleByFamily", error.message);
    return [];
  }
  return (data ?? []) as Person[];
}

export async function getPersonById(id: string): Promise<Person | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("getPersonById", error.message);
    return null;
  }
  return data as Person | null;
}

export async function getPeopleByIds(ids: string[]): Promise<Person[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .in("id", ids)
    .is("deleted_at", null);

  if (error) {
    console.error("getPeopleByIds", error.message);
    return [];
  }
  return (data ?? []) as Person[];
}

export async function getRelationshipGraph(
  seedPeople: Person[],
  expansionDepth = 3,
): Promise<{ people: Person[]; relations: PersonRelation[] }> {
  const peopleById = new Map(seedPeople.map((person) => [person.id, person]));
  const relationsById = new Map<string, PersonRelation>();
  let frontier = seedPeople.map((person) => person.id);

  for (let depth = 0; depth < expansionDepth && frontier.length > 0; depth += 1) {
    const foundRelations = await getRelationsForPeople(frontier);
    for (const relation of foundRelations) relationsById.set(relation.id, relation);

    const discoveredIds = new Set<string>();
    for (const relation of foundRelations) {
      if (!peopleById.has(relation.person_id)) discoveredIds.add(relation.person_id);
      if (!peopleById.has(relation.related_person_id)) discoveredIds.add(relation.related_person_id);
    }

    const discoveredPeople = await getPeopleByIds([...discoveredIds]);
    for (const person of discoveredPeople) peopleById.set(person.id, person);
    frontier = discoveredPeople.map((person) => person.id);
  }

  return {
    people: [...peopleById.values()],
    relations: [...relationsById.values()],
  };
}

export async function getRelationsForPeople(
  personIds: string[],
): Promise<PersonRelation[]> {
  if (personIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("person_relations")
    .select("*")
    .or(`person_id.in.(${personIds.join(",")}),related_person_id.in.(${personIds.join(",")})`)
    .is("deleted_at", null);

  if (error) {
    console.error("getRelationsForPeople", error.message);
    return [];
  }
  return (data ?? []) as PersonRelation[];
}

export async function getComments(
  targetType: CommentTarget,
  targetId: string,
): Promise<Comment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles(id, display_name, avatar_url, role)")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getComments", error.message);
    return [];
  }
  return (data ?? []) as Comment[];
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? {
    id: user.id,
    display_name: user.user_metadata?.full_name ?? user.email ?? "Kullanıcı",
    avatar_url: user.user_metadata?.avatar_url ?? null,
    role: "member",
  };
}

export async function getPendingProposals(): Promise<EditProposal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edit_proposals")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPendingProposals", error.message);
    return [];
  }
  return (data ?? []) as EditProposal[];
}
