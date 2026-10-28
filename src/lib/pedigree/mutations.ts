import type { createClient } from "@/lib/supabase/client";
import type { Person, PersonRelation } from "@/lib/types";
import { wouldCreateParentCycle } from "@/lib/tree";

export type AddRole = "parent" | "child" | "sibling" | "spouse";

export const ROLE_LABEL: Record<AddRole, string> = {
  parent: "Ebeveyn",
  child: "Çocuk",
  sibling: "Kardeş",
  spouse: "Eş",
};

export type RelationDraft = {
  person_id: string;
  related_person_id: string;
  relation_type: "parent" | "spouse";
};

export type LinkPlan = { rows: RelationDraft[]; error: string | null };

const parentIdsOf = (id: string, relations: PersonRelation[]) =>
  relations.filter((r) => r.person_id === id && r.relation_type === "parent").map((r) => r.related_person_id);

const areSpouses = (a: string, b: string, relations: PersonRelation[]) =>
  relations.some(
    (r) =>
      r.relation_type === "spouse" &&
      ((r.person_id === a && r.related_person_id === b) || (r.person_id === b && r.related_person_id === a)),
  );

const exists = (row: RelationDraft, relations: PersonRelation[]) =>
  relations.some(
    (r) =>
      r.person_id === row.person_id &&
      r.related_person_id === row.related_person_id &&
      r.relation_type === row.relation_type,
  );

/**
 * Compute the relation rows needed to make `otherId` the `role` of `focusId`,
 * validating against the current graph. Pure: safe to call for previews
 * (e.g. drag-and-drop menus) before any write.
 */
export function planLink(options: {
  role: AddRole;
  focusId: string;
  otherId: string;
  relations: PersonRelation[];
  people: Pick<Person, "id" | "full_name">[];
  /** For `child`: the focus person's partner who is the other parent. */
  coParentId?: string | null;
}): LinkPlan {
  const { role, focusId, otherId, relations, coParentId } = options;
  const nameOf = (id: string) => options.people.find((p) => p.id === id)?.full_name ?? "Kişi";
  if (focusId === otherId) return { rows: [], error: "Bir kişi kendisiyle bağlanamaz." };

  const rows: RelationDraft[] = [];

  if (role === "parent") {
    if (wouldCreateParentCycle(focusId, otherId, relations)) {
      return { rows, error: "Bu bağ soy ağacında döngü oluşturur (kişi kendi atası olamaz)." };
    }
    const current = parentIdsOf(focusId, relations);
    if (current.includes(otherId)) return { rows, error: "Bu ebeveyn bağı zaten kayıtlı." };
    if (current.length >= 2) {
      return { rows, error: `${nameOf(focusId)} için zaten iki ebeveyn kayıtlı.` };
    }
    if (areSpouses(focusId, otherId, relations)) {
      return { rows, error: "Eş olarak kayıtlı bir kişi ebeveyn yapılamaz." };
    }
    rows.push({ person_id: focusId, related_person_id: otherId, relation_type: "parent" });
  } else if (role === "child") {
    if (wouldCreateParentCycle(otherId, focusId, relations)) {
      return { rows, error: "Bu bağ soy ağacında döngü oluşturur (kişi kendi torunu olamaz)." };
    }
    const current = parentIdsOf(otherId, relations);
    if (current.includes(focusId)) return { rows, error: "Bu çocuk bağı zaten kayıtlı." };
    if (current.length >= 2) {
      return { rows, error: `${nameOf(otherId)} için zaten iki ebeveyn kayıtlı.` };
    }
    if (areSpouses(focusId, otherId, relations)) {
      return { rows, error: "Eş olarak kayıtlı bir kişi çocuk yapılamaz." };
    }
    rows.push({ person_id: otherId, related_person_id: focusId, relation_type: "parent" });
    if (coParentId && coParentId !== otherId && !current.includes(coParentId) && current.length === 0) {
      if (!wouldCreateParentCycle(otherId, coParentId, relations)) {
        rows.push({ person_id: otherId, related_person_id: coParentId, relation_type: "parent" });
      }
    }
  } else if (role === "spouse") {
    if (areSpouses(focusId, otherId, relations)) return { rows, error: "Bu eş bağı zaten kayıtlı." };
    if (parentIdsOf(focusId, relations).includes(otherId) || parentIdsOf(otherId, relations).includes(focusId)) {
      return { rows, error: "Ebeveyn–çocuk olarak kayıtlı kişiler eş yapılamaz." };
    }
    rows.push({ person_id: focusId, related_person_id: otherId, relation_type: "spouse" });
  } else {
    const parents = parentIdsOf(focusId, relations);
    if (parents.length === 0) {
      return { rows, error: `Kardeş bağı için önce ${nameOf(focusId)} kişisinin en az bir ebeveynini ekleyin.` };
    }
    const otherParents = parentIdsOf(otherId, relations);
    for (const parentId of parents) {
      if (otherParents.includes(parentId)) continue;
      if (otherParents.length + rows.length >= 2) {
        return { rows: [], error: `${nameOf(otherId)} için zaten iki ebeveyn kayıtlı.` };
      }
      if (wouldCreateParentCycle(otherId, parentId, relations)) {
        return { rows: [], error: "Bu bağ soy ağacında döngü oluşturur." };
      }
      rows.push({ person_id: otherId, related_person_id: parentId, relation_type: "parent" });
    }
    if (rows.length === 0) return { rows, error: "Bu kişiler zaten kardeş olarak kayıtlı." };
  }

  const unique = rows.filter((row) => !exists(row, relations));
  if (unique.length === 0) return { rows: [], error: "Bu bağ zaten kayıtlı." };
  return { rows: unique, error: null };
}

/* ------------------------------------------------------------------ */
/* Supabase writes (browser client)                                    */
/* ------------------------------------------------------------------ */

export type PersonPayload = {
  full_name: string;
  birth_year: number | null;
  death_year: number | null;
  gender: Person["gender"];
  notes: string | null;
  avatar_url: string | null;
};

export type WriteClient = ReturnType<typeof createClient>;

export async function insertPerson(
  supabase: WriteClient,
  familyId: string,
  payload: PersonPayload,
  userId: string,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("people")
    .insert({ family_id: familyId, ...payload, created_by: userId })
    .select("id")
    .single();
  if (error || !data) return { id: null, error: error?.message ?? "Kişi eklenemedi" };
  return { id: data.id as string, error: null };
}

export async function insertRelations(
  supabase: WriteClient,
  rows: RelationDraft[],
  userId: string,
): Promise<{ ids: string[]; error: string | null }> {
  if (rows.length === 0) return { ids: [], error: null };
  const { data, error } = await supabase
    .from("person_relations")
    .insert(rows.map((row) => ({ ...row, created_by: userId })))
    .select("id");
  if (error) return { ids: [], error: error.message };
  return { ids: (data ?? []).map((row) => row.id as string), error: null };
}

export async function deleteRelation(supabase: WriteClient, relationId: string): Promise<string | null> {
  const { error } = await supabase.from("person_relations").delete().eq("id", relationId);
  return error?.message ?? null;
}

export async function updatePerson(
  supabase: WriteClient,
  personId: string,
  payload: Partial<PersonPayload>,
): Promise<string | null> {
  const { error } = await supabase.from("people").update(payload).eq("id", personId);
  return error?.message ?? null;
}

/** Permanent delete — cascades person_relations via FK. Admin-only at RLS. */
export async function hardDeletePerson(supabase: WriteClient, personId: string): Promise<string | null> {
  const { error } = await supabase.from("people").delete().eq("id", personId);
  return error?.message ?? null;
}

/** @deprecated use hardDeletePerson — kept for rollback paths that need a quick undo insert failure cleanup */
export async function softDeletePerson(supabase: WriteClient, personId: string): Promise<string | null> {
  return hardDeletePerson(supabase, personId);
}

export async function markFamilyFounder(
  supabase: WriteClient,
  familyId: string,
  founderPersonId: string | null,
): Promise<string | null> {
  const patch: Record<string, unknown> = { is_incomplete: false };
  if (founderPersonId) patch.founder_person_id = founderPersonId;
  const { error } = await supabase.from("families").update(patch).eq("id", familyId);
  return error?.message ?? null;
}
