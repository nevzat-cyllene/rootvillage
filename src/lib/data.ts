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

  return (data ?? []).map((row) => ({
    ...(row as Family),
    people_count: Array.isArray(row.people)
      ? (row.people[0] as { count: number } | undefined)?.count ?? 0
      : 0,
  }));
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
