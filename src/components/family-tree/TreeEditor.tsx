"use client";

import { useAuth } from "@/components/auth-provider";
import {
  ConnectionSheet,
  PersonFormSheet,
  ROLE_LABEL,
  defaultGenderForRole,
  draftToPayload,
  emptyDraft,
  personToDraft,
  type AddRole,
  type PersonDraft,
} from "@/components/family-tree/person-sheets";
import { uploadPersonAvatar } from "@/lib/avatar-upload";
import { partnersOf, type KinGraph } from "@/lib/pedigree/graph";
import {
  deleteRelation,
  hardDeletePerson,
  insertPerson,
  insertRelations,
  markFamilyFounder,
  planLink,
  updatePerson,
} from "@/lib/pedigree/mutations";
import { insertSampleTree } from "@/lib/pedigree/sample-tree";
import { createClient } from "@/lib/supabase/client";
import type { Family, Person, PersonRelation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type AddState = { role: AddRole; focusId: string; familyId: string } | { role: "founder"; familyId: string } | null;

export type TreeEditor = {
  busy: boolean;
  openAdd: (role: AddRole, focusId: string, familyId: string) => void;
  openFounder: (familyId: string) => void;
  openEdit: (personId: string) => void;
  openConnections: (personId: string) => void;
  /** Admin: hard-delete. Contributor: edit_proposals delete request. */
  removePerson: (personId: string, reason?: string) => Promise<"deleted" | "proposed" | string>;
  linkExisting: (role: AddRole, focusId: string, otherId: string, coParentId?: string | null) => Promise<string | null>;
  loadSample: () => Promise<void>;
  /** Sheets / dialogs; render once inside the canvas. */
  sheets: React.ReactNode;
  /** True while any sheet is open (disables canvas keyboard shortcuts). */
  sheetOpen: boolean;
};

export function useTreeEditor({
  villageId,
  families,
  people,
  relations,
  graph,
  setPeople,
  setRelations,
  setFamilies,
  onPersonCreated,
}: {
  villageId: string;
  families: Family[];
  people: Person[];
  relations: PersonRelation[];
  graph: KinGraph;
  setPeople: React.Dispatch<React.SetStateAction<Person[]>>;
  setRelations: React.Dispatch<React.SetStateAction<PersonRelation[]>>;
  setFamilies: React.Dispatch<React.SetStateAction<Family[]>>;
  onPersonCreated?: (personId: string) => void;
}): TreeEditor {
  const router = useRouter();
  const { requireAuth, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [add, setAdd] = useState<AddState>(null);
  const [draft, setDraft] = useState<PersonDraft>(emptyDraft());
  const [coParentId, setCoParentId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PersonDraft>(emptyDraft());
  const [connectionsId, setConnectionsId] = useState<string | null>(null);
  const [connectionRole, setConnectionRole] = useState<AddRole>("parent");
  const [connectionPersonId, setConnectionPersonId] = useState("");

  const personById = useCallback((id: string) => people.find((p) => p.id === id) ?? null, [people]);

  const ensureUser = useCallback(async () => {
    const ok = await requireAuth();
    if (!ok) return null;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { supabase, user } : null;
  }, [requireAuth]);

  const reset = () => {
    setAdd(null);
    setEditId(null);
    setConnectionsId(null);
    setDraft(emptyDraft());
    setCoParentId(null);
    setConnectionPersonId("");
    setError(null);
  };

  /* ---------------- open helpers ---------------- */

  const openAdd = useCallback(
    (role: AddRole, focusId: string, familyId: string) => {
      const focus = personById(focusId);
      setEditId(null);
      setConnectionsId(null);
      setError(null);
      setDraft({ ...emptyDraft(), gender: defaultGenderForRole(role, focus) });
      const partners = partnersOf(graph, focusId);
      setCoParentId(role === "child" && partners.length > 0 ? partners[0]! : null);
      setAdd({ role, focusId, familyId });
    },
    [graph, personById],
  );

  const openFounder = useCallback((familyId: string) => {
    setEditId(null);
    setConnectionsId(null);
    setError(null);
    setDraft(emptyDraft());
    setAdd({ role: "founder", familyId });
  }, []);

  const openEdit = useCallback(
    (personId: string) => {
      const person = personById(personId);
      if (!person) return;
      setAdd(null);
      setConnectionsId(null);
      setError(null);
      setEditDraft(personToDraft(person));
      setEditId(personId);
    },
    [personById],
  );

  const openConnections = useCallback((personId: string) => {
    setAdd(null);
    setEditId(null);
    setError(null);
    setConnectionRole("parent");
    setConnectionPersonId("");
    setConnectionsId(personId);
  }, []);

  /* ---------------- writes ---------------- */

  const pullPersonIfMissing = useCallback(
    async (supabase: ReturnType<typeof createClient>, personId: string) => {
      if (people.some((p) => p.id === personId)) return;
      const { data } = await supabase.from("people").select("*").eq("id", personId).maybeSingle();
      if (data) setPeople((prev) => (prev.some((p) => p.id === personId) ? prev : [...prev, data as Person]));
    },
    [people, setPeople],
  );

  const linkExisting = useCallback(
    async (role: AddRole, focusId: string, otherId: string, coParent?: string | null): Promise<string | null> => {
      const plan = planLink({ role, focusId, otherId, relations, people, coParentId: coParent ?? null });
      if (plan.error) return plan.error;
      const session = await ensureUser();
      if (!session) return "Oturum gerekli.";
      setBusy(true);
      const { ids, error: insertError } = await insertRelations(session.supabase, plan.rows, session.user.id);
      if (insertError) {
        setBusy(false);
        return insertError;
      }
      setRelations((prev) => [
        ...prev,
        ...plan.rows.map((row, index) => ({ id: ids[index] ?? `optimistic-${Date.now()}-${index}`, ...row })),
      ]);
      await pullPersonIfMissing(session.supabase, otherId);
      setBusy(false);
      router.refresh();
      return null;
    },
    [ensureUser, people, pullPersonIfMissing, relations, router, setRelations],
  );

  const saveAdd = useCallback(async () => {
    if (!add || !draft.full_name.trim()) return;
    const session = await ensureUser();
    if (!session) return;
    const { supabase, user } = session;
    setBusy(true);
    setError(null);

    let avatarUrl = draft.avatar_url;
    try {
      if (draft.avatarFile) avatarUrl = await uploadPersonAvatar(draft.avatarFile);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Fotoğraf yüklenemedi");
      return;
    }
    const payload = draftToPayload(draft, avatarUrl);
    const { id, error: insertError } = await insertPerson(supabase, add.familyId, payload, user.id);
    if (!id) {
      setBusy(false);
      setError(insertError);
      return;
    }
    if (draft.avatarFile) {
      try {
        const stable = await uploadPersonAvatar(draft.avatarFile, id);
        await updatePerson(supabase, id, { avatar_url: stable });
        payload.avatar_url = stable;
      } catch {
        /* keep first url */
      }
    }

    let newRelations: PersonRelation[] = [];
    if (add.role !== "founder") {
      const plan = planLink({
        role: add.role,
        focusId: add.focusId,
        otherId: id,
        relations,
        people,
        coParentId: add.role === "child" ? coParentId : null,
      });
      if (plan.error) {
        await hardDeletePerson(supabase, id);
        setBusy(false);
        setError(plan.error);
        return;
      }
      const { ids, error: relationError } = await insertRelations(supabase, plan.rows, user.id);
      if (relationError) {
        await hardDeletePerson(supabase, id);
        setBusy(false);
        setError(`Kişi oluşturuldu ancak bağ kurulamadı: ${relationError}`);
        return;
      }
      newRelations = plan.rows.map((row, index) => ({ id: ids[index] ?? `optimistic-${id}-${index}`, ...row }));
    }

    const family = families.find((f) => f.id === add.familyId);
    const familyHasPeople = people.some((p) => p.family_id === add.familyId);
    const becomesFounder = add.role === "founder" || (!family?.founder_person_id && !familyHasPeople);
    await markFamilyFounder(supabase, add.familyId, becomesFounder ? id : null);
    if (becomesFounder) {
      setFamilies((prev) =>
        prev.map((f) => (f.id === add.familyId ? { ...f, founder_person_id: id, is_incomplete: false } : f)),
      );
    }

    const now = new Date().toISOString();
    const created: Person = {
      id,
      family_id: add.familyId,
      full_name: payload.full_name,
      birth_year: payload.birth_year,
      death_year: payload.death_year,
      gender: payload.gender,
      notes: payload.notes,
      avatar_url: payload.avatar_url ?? null,
      generation: null,
      disputed: false,
      created_by: user.id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    setPeople((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, created]));
    if (newRelations.length) setRelations((prev) => [...prev, ...newRelations]);
    setBusy(false);
    reset();
    onPersonCreated?.(id);
    router.refresh();
  }, [add, coParentId, draft, ensureUser, families, onPersonCreated, people, relations, router, setFamilies, setPeople, setRelations]);

  const saveEdit = useCallback(async () => {
    if (!editId || !editDraft.full_name.trim()) return;
    const session = await ensureUser();
    if (!session) return;
    setBusy(true);
    setError(null);
    let avatarUrl = editDraft.avatar_url;
    try {
      if (editDraft.avatarFile) avatarUrl = await uploadPersonAvatar(editDraft.avatarFile, editId);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Fotoğraf yüklenemedi");
      return;
    }
    const payload = draftToPayload(editDraft, avatarUrl);
    const updateError = await updatePerson(session.supabase, editId, payload);
    setBusy(false);
    if (updateError) {
      setError(updateError);
      return;
    }
    setPeople((prev) => prev.map((p) => (p.id === editId ? { ...p, ...payload, avatar_url: payload.avatar_url ?? null } : p)));
    reset();
    router.refresh();
  }, [editDraft, editId, ensureUser, router, setPeople]);

  const removeConnection = useCallback(
    async (relationId: string) => {
      const session = await ensureUser();
      if (!session) return;
      setBusy(true);
      setError(null);
      if (!relationId.startsWith("optimistic-")) {
        const deleteError = await deleteRelation(session.supabase, relationId);
        if (deleteError) {
          setBusy(false);
          setError(deleteError);
          return;
        }
      }
      setRelations((prev) => prev.filter((r) => r.id !== relationId));
      setBusy(false);
      router.refresh();
    },
    [ensureUser, router, setRelations],
  );

  const removePerson = useCallback(
    async (personId: string, reason?: string): Promise<"deleted" | "proposed" | string> => {
      const session = await ensureUser();
      if (!session) return "Giriş gerekli";
      setBusy(true);
      setError(null);
      const person = people.find((p) => p.id === personId);
      const isAdmin = profile?.role === "admin";

      if (isAdmin) {
        const deleteError = await hardDeletePerson(session.supabase, personId);
        if (deleteError) {
          setBusy(false);
          setError(deleteError);
          return deleteError;
        }
        setPeople((prev) => prev.filter((p) => p.id !== personId));
        setRelations((prev) =>
          prev.filter((r) => r.person_id !== personId && r.related_person_id !== personId),
        );
        setFamilies((prev) =>
          prev.map((f) =>
            f.founder_person_id === personId ? { ...f, founder_person_id: null } : f,
          ),
        );
        setBusy(false);
        router.refresh();
        return "deleted";
      }

      const { error: proposalError } = await session.supabase.from("edit_proposals").insert({
        target_type: "person",
        target_id: personId,
        action: "delete",
        payload: person ? { name: person.full_name } : null,
        reason: reason?.trim() || (person ? `${person.full_name} silme önerisi` : "Silme önerisi"),
        proposed_by: session.user.id,
      });
      setBusy(false);
      if (proposalError) {
        setError(proposalError.message);
        return proposalError.message;
      }
      router.refresh();
      return "proposed";
    },
    [ensureUser, people, profile?.role, router, setFamilies, setPeople, setRelations],
  );

  const loadSample = useCallback(async () => {
    const session = await ensureUser();
    if (!session) return;
    setBusy(true);
    const { error: sampleError } = await insertSampleTree(session.supabase, villageId, session.user.id);
    setBusy(false);
    if (sampleError) {
      setError(sampleError);
      window.alert(`Örnek ağaç yüklenemedi: ${sampleError}`);
      return;
    }
    router.refresh();
  }, [ensureUser, router, villageId]);

  /* ---------------- sheets ---------------- */

  const addFocus = add && add.role !== "founder" ? personById(add.focusId) : null;
  const addPartners = add && add.role === "child" ? partnersOf(graph, add.focusId) : [];
  const editPerson = editId ? personById(editId) : null;
  const connectionsFocus = connectionsId ? personById(connectionsId) : null;
  const addFamily = add ? families.find((f) => f.id === add.familyId) : null;

  const sheets = (
    <>
      {add && (add.role === "founder" || addFocus) && (
        <PersonFormSheet
          eyebrow={add.role === "founder" ? "Kurucu kişi" : "Yeni kişi"}
          title={
            add.role === "founder"
              ? `${addFamily?.name ?? "Aile"} · ilk kişiyi ekle`
              : `${addFocus!.full_name} → ${ROLE_LABEL[add.role]}`
          }
          draft={draft}
          setDraft={setDraft}
          busy={busy}
          error={error}
          onSave={() => void saveAdd()}
          onCancel={reset}
        >
          {add.role === "child" && addPartners.length > 0 && (
            <div>
              <p className="mb-2 text-[12px] font-medium text-text-secondary">Diğer ebeveyn</p>
              <div className="flex flex-wrap gap-1.5">
                {addPartners.map((partnerId) => {
                  const partner = personById(partnerId);
                  if (!partner) return null;
                  return (
                    <button
                      key={partnerId}
                      type="button"
                      onClick={() => setCoParentId(partnerId)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                        coParentId === partnerId
                          ? "border-[#286F61] bg-[#E3F3EE] text-[#18594B]"
                          : "border-border-soft bg-white text-text-secondary hover:text-text",
                      )}
                    >
                      {partner.full_name}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setCoParentId(null)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] font-medium transition",
                    coParentId == null
                      ? "border-[#286F61] bg-[#E3F3EE] text-[#18594B]"
                      : "border-border-soft bg-white text-text-secondary hover:text-text",
                  )}
                >
                  Bilinmiyor
                </button>
              </div>
            </div>
          )}
        </PersonFormSheet>
      )}

      {editPerson && (
        <PersonFormSheet
          eyebrow="Kişiyi düzenle"
          title={editPerson.full_name}
          draft={editDraft}
          setDraft={setEditDraft}
          busy={busy}
          error={error}
          onSave={() => void saveEdit()}
          onCancel={reset}
          saveLabel="Güncelle"
        />
      )}

      {connectionsFocus && (
        <ConnectionSheet
          focus={connectionsFocus}
          people={people}
          relations={relations}
          role={connectionRole}
          selectedPersonId={connectionPersonId}
          busy={busy}
          error={error}
          onRoleChange={setConnectionRole}
          onPersonChange={setConnectionPersonId}
          onSave={() => {
            void (async () => {
              const partners = partnersOf(graph, connectionsFocus.id);
              const err = await linkExisting(
                connectionRole,
                connectionsFocus.id,
                connectionPersonId,
                connectionRole === "child" && partners.length === 1 ? partners[0] : null,
              );
              if (err) setError(err);
              else {
                setConnectionPersonId("");
                setError(null);
              }
            })();
          }}
          onRemove={(relationId) => void removeConnection(relationId)}
          onCancel={reset}
        />
      )}
    </>
  );

  return {
    busy,
    openAdd,
    openFounder,
    openEdit,
    openConnections,
    removePerson,
    linkExisting,
    loadSample,
    sheets,
    sheetOpen: Boolean(add || editId || connectionsId),
  };
}
