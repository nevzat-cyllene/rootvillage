"use client";

import { useAuth } from "@/components/auth-provider";
import { PersonAvatar } from "@/components/person-avatar";
import { Button, Input, Textarea } from "@/components/ui";
import { uploadPersonAvatar } from "@/lib/avatar-upload";
import { createClient } from "@/lib/supabase/client";
import {
  extendedLinksForPerson,
  linksForPerson,
  pickDefaultFocus,
  wouldCreateParentCycle,
} from "@/lib/tree";
import type { Person, PersonRelation } from "@/lib/types";
import { cn, formatYearRange } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AddRole = "parent" | "child" | "sibling" | "spouse";
type Gender = Person["gender"];

type PersonDraft = {
  full_name: string;
  birth_year: string;
  death_year: string;
  gender: Gender;
  notes: string;
  avatar_url: string | null;
  avatarFile: File | null;
};

const emptyDraft = (): PersonDraft => ({
  full_name: "",
  birth_year: "",
  death_year: "",
  gender: null,
  notes: "",
  avatar_url: null,
  avatarFile: null,
});

const ROLE_LABEL: Record<AddRole, string> = {
  parent: "Ebeveyn",
  child: "Çocuk",
  sibling: "Kardeş",
  spouse: "Eş",
};

function draftToPayload(d: PersonDraft, avatarUrl?: string | null) {
  return {
    full_name: d.full_name.trim(),
    birth_year: d.birth_year ? Number(d.birth_year) : null,
    death_year: d.death_year ? Number(d.death_year) : null,
    gender: d.gender,
    notes: d.notes.trim() || null,
    avatar_url: avatarUrl !== undefined ? avatarUrl : d.avatar_url,
  };
}

function personToDraft(p: Person): PersonDraft {
  return {
    full_name: p.full_name,
    birth_year: p.birth_year?.toString() ?? "",
    death_year: p.death_year?.toString() ?? "",
    gender: p.gender,
    notes: p.notes ?? "",
    avatar_url: p.avatar_url ?? null,
    avatarFile: null,
  };
}

/** Erkek / belirsiz: eş sağda. Kadın: eş solda. */
function spouseOnLeft(focus: Person): boolean {
  return focus.gender === "female";
}

function defaultGenderForRole(role: AddRole, focus: Person | null): Gender {
  if (role === "spouse" && focus?.gender === "male") return "female";
  if (role === "spouse" && focus?.gender === "female") return "male";
  return null;
}

export function PersonRelationStudio({
  familyId,
  people,
  relations,
}: {
  familyId: string;
  people: Person[];
  relations: PersonRelation[];
}) {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<AddRole | null>(null);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionRole, setConnectionRole] = useState<AddRole>("parent");
  const [connectionPersonId, setConnectionPersonId] = useState("");
  const [draft, setDraft] = useState<PersonDraft>(emptyDraft());
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<PersonDraft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!focusId || !people.some((p) => p.id === focusId)) {
      setFocusId(pickDefaultFocus(people));
    }
  }, [people, focusId]);

  const focus = people.find((p) => p.id === focusId) ?? null;
  const links = useMemo(
    () => (focusId ? linksForPerson(focusId, people, relations) : null),
    [focusId, people, relations],
  );
  const primarySpouseId = links?.spouses[0]?.id ?? null;
  const spouseLinks = useMemo(
    () =>
      primarySpouseId
        ? linksForPerson(primarySpouseId, people, relations)
        : null,
    [primarySpouseId, people, relations],
  );

  useEffect(() => {
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 420);
    return () => window.clearTimeout(t);
  }, [focusId]);

  useEffect(() => {
    setEditOpen(false);
    setConnectionsOpen(false);
    setError(null);
  }, [focusId]);

  function openAdd(role: AddRole) {
    setAddRole(role);
    setEditOpen(false);
    setError(null);
    setDraft({
      ...emptyDraft(),
      gender: defaultGenderForRole(role, focus),
    });
  }

  function openEdit() {
    if (!focus) return;
    setEditDraft(personToDraft(focus));
    setEditOpen(true);
    setAddRole(null);
    setError(null);
  }

  function openConnections() {
    setAddRole(null);
    setEditOpen(false);
    setConnectionRole("parent");
    setConnectionPersonId("");
    setConnectionsOpen(true);
    setError(null);
  }

  async function connectExistingPerson() {
    if (!focus || !connectionPersonId) return;
    const selected = people.find((person) => person.id === connectionPersonId);
    if (!selected || selected.id === focus.id) {
      setError("Bağlanacak geçerli bir kişi seçin.");
      return;
    }

    const ok = await requireAuth();
    if (!ok) return;
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    const pending: Array<{
      person_id: string;
      related_person_id: string;
      relation_type: "parent" | "spouse";
      created_by: string;
    }> = [];

    if (connectionRole === "parent") {
      if (wouldCreateParentCycle(focus.id, selected.id, relations)) {
        setBusy(false);
        setError("Bu ebeveyn bağlantısı soy ağacında döngü oluşturur.");
        return;
      }
      pending.push({
        person_id: focus.id,
        related_person_id: selected.id,
        relation_type: "parent",
        created_by: user.id,
      });
    } else if (connectionRole === "child") {
      if (wouldCreateParentCycle(selected.id, focus.id, relations)) {
        setBusy(false);
        setError("Bu çocuk bağlantısı soy ağacında döngü oluşturur.");
        return;
      }
      pending.push({
        person_id: selected.id,
        related_person_id: focus.id,
        relation_type: "parent",
        created_by: user.id,
      });
    } else if (connectionRole === "spouse") {
      const alreadySpouses = relations.some(
        (relation) =>
          relation.relation_type === "spouse" &&
          ((relation.person_id === focus.id && relation.related_person_id === selected.id) ||
            (relation.person_id === selected.id && relation.related_person_id === focus.id)),
      );
      if (alreadySpouses) {
        setBusy(false);
        setError("Bu eş bağlantısı zaten var.");
        return;
      }
      pending.push({
        person_id: focus.id,
        related_person_id: selected.id,
        relation_type: "spouse",
        created_by: user.id,
      });
    } else {
      const parentIds = relations
        .filter((relation) => relation.person_id === focus.id && relation.relation_type === "parent")
        .map((relation) => relation.related_person_id);
      if (parentIds.length === 0) {
        setBusy(false);
        setError("Kardeş bağlantısı için önce odak kişinin en az bir ebeveynini ekleyin.");
        return;
      }
      for (const parentId of parentIds) {
        const alreadyLinked = relations.some(
          (relation) =>
            relation.person_id === selected.id &&
            relation.related_person_id === parentId &&
            relation.relation_type === "parent",
        );
        if (!alreadyLinked) {
          pending.push({
            person_id: selected.id,
            related_person_id: parentId,
            relation_type: "parent",
            created_by: user.id,
          });
        }
      }
    }

    const uniquePending = pending.filter(
      (candidate) =>
        !relations.some(
          (relation) =>
            relation.person_id === candidate.person_id &&
            relation.related_person_id === candidate.related_person_id &&
            relation.relation_type === candidate.relation_type,
        ),
    );
    if (uniquePending.length === 0) {
      setBusy(false);
      setError("Bu bağlantı zaten kayıtlı.");
      return;
    }

    const { error: insertError } = await supabase.from("person_relations").insert(uniquePending);
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setConnectionsOpen(false);
    setConnectionPersonId("");
    router.refresh();
  }

  async function removeConnection(relationId: string) {
    const ok = await requireAuth();
    if (!ok) return;
    setBusy(true);
    setError(null);
    const { error: deleteError } = await createClient()
      .from("person_relations")
      .delete()
      .eq("id", relationId);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  async function addRelative() {
    if (!focus || !addRole || !draft.full_name.trim()) return;
    const ok = await requireAuth();
    if (!ok) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    let avatarUrl = draft.avatar_url;
    try {
      if (draft.avatarFile) {
        avatarUrl = await uploadPersonAvatar(draft.avatarFile);
      }
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Fotoğraf yüklenemedi");
      return;
    }

    const payload = draftToPayload(draft, avatarUrl);
    const { data: created, error: err } = await supabase
      .from("people")
      .insert({
        family_id: familyId,
        ...payload,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (err || !created) {
      setBusy(false);
      setError(err?.message ?? "Eklenemedi");
      return;
    }

    // Re-upload with stable person id path if file was used
    if (draft.avatarFile) {
      try {
        const stable = await uploadPersonAvatar(draft.avatarFile, created.id);
        await supabase.from("people").update({ avatar_url: stable }).eq("id", created.id);
      } catch {
        /* keep first url */
      }
    }

    const rels: Array<{
      person_id: string;
      related_person_id: string;
      relation_type: "parent" | "spouse";
      created_by: string;
    }> = [];

    if (addRole === "parent") {
      rels.push({
        person_id: focus.id,
        related_person_id: created.id,
        relation_type: "parent",
        created_by: user.id,
      });
    } else if (addRole === "child") {
      rels.push({
        person_id: created.id,
        related_person_id: focus.id,
        relation_type: "parent",
        created_by: user.id,
      });
      // Also link child to spouse(s) of focus as parent when known
      for (const sp of links?.spouses ?? []) {
        rels.push({
          person_id: created.id,
          related_person_id: sp.id,
          relation_type: "parent",
          created_by: user.id,
        });
      }
    } else if (addRole === "sibling") {
      const parentRels = relations.filter(
        (r) => r.person_id === focus.id && r.relation_type === "parent",
      );
      for (const pr of parentRels) {
        rels.push({
          person_id: created.id,
          related_person_id: pr.related_person_id,
          relation_type: "parent",
          created_by: user.id,
        });
      }
    } else if (addRole === "spouse") {
      rels.push({
        person_id: focus.id,
        related_person_id: created.id,
        relation_type: "spouse",
        created_by: user.id,
      });
    }

    if (rels.length) {
      await supabase.from("person_relations").insert(rels);
    }

    await supabase.from("families").update({ is_incomplete: false }).eq("id", familyId);

    setBusy(false);
    setDraft(emptyDraft());
    setAddRole(null);
    setFocusId(created.id);
    router.refresh();
  }

  async function saveFocusEdit() {
    if (!focus || !editDraft.full_name.trim()) return;
    const ok = await requireAuth();
    if (!ok) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();
    let avatarUrl = editDraft.avatar_url;
    try {
      if (editDraft.avatarFile) {
        avatarUrl = await uploadPersonAvatar(editDraft.avatarFile, focus.id);
      }
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Fotoğraf yüklenemedi");
      return;
    }

    const { error: err } = await supabase
      .from("people")
      .update(draftToPayload(editDraft, avatarUrl))
      .eq("id", focus.id);

    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEditOpen(false);
    router.refresh();
  }

  if (people.length === 0) {
    return (
      <div className="mb-8 rounded-[18px] border border-dashed border-border bg-bg-surface/70 px-5 py-10 text-center">
        <p className="text-[16px] font-semibold tracking-[-0.02em]">İlişki haritası boş</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-text-secondary">
          İlk kişiyi ekledikten sonra ebeveyn, eş ve çocuk bağlarını buradan kurarsınız.
        </p>
      </div>
    );
  }

  const spouseLeft = focus ? spouseOnLeft(focus) : false;
  const primarySpouse = links?.spouses[0] ?? null;
  const extraSpouses = links?.spouses.slice(1) ?? [];
  const focusSiblings = links?.siblings ?? [];
  const spouseSiblings = spouseLinks?.siblings ?? [];
  const focusFanSide: "left" | "right" = spouseLeft ? "right" : "left";

  return (
    <section className="mb-10 animate-fade-up">
      <div className="mb-4">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em]">İlişki haritası</h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          Üstte odak kişinin ebeveynleri, ortada çift ve yanlarında kardeş fan’ı, altta çocuklar.
          Eşe tıklayınca odak değişir.
        </p>
      </div>

      <div className="overflow-x-auto overflow-y-hidden rounded-[20px] border border-border-soft bg-[linear-gradient(165deg,#f7f8fa_0%,#eef1f4_48%,#fafafa_100%)] p-4 sm:p-6">
        {/* Parents of focus only */}
        <TreeBand label="Ebeveynler">
          {(links?.parents ?? []).map((p) => (
            <PersonChip key={p.id} person={p} onSelect={() => setFocusId(p.id)} />
          ))}
          <AddChip label="+ Ebeveyn" onClick={() => openAdd("parent")} />
        </TreeBand>

        <Connector />

        <div className="mb-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
          Kişi ve eş
        </div>

        <div className="mx-auto flex w-max max-w-none items-center justify-center gap-1 px-2 sm:gap-2">
          {focusFanSide === "left" && (
            <SiblingFan
              side="left"
              siblings={focusSiblings}
              onSelect={setFocusId}
              onAdd={() => openAdd("sibling")}
            />
          )}
          {spouseLeft && primarySpouse && (
            <SiblingFan
              side="left"
              siblings={spouseSiblings}
              onSelect={setFocusId}
              onAdd={() => {
                setFocusId(primarySpouse.id);
                openAdd("sibling");
              }}
            />
          )}

          <div
            className={cn(
              "relative z-10 flex items-stretch gap-3",
              spouseLeft && "flex-row-reverse",
            )}
          >
            {focus && (
              <HeroPersonCard
                person={focus}
                variant="focus"
                pulse={pulse}
                onEdit={openEdit}
                onConnections={openConnections}
                detailHref={`/person/${focus.id}`}
              />
            )}
            {primarySpouse ? (
              <HeroPersonCard
                person={primarySpouse}
                variant="partner"
                onSelect={() => setFocusId(primarySpouse.id)}
              />
            ) : (
              <AddChip label="+ Eş" onClick={() => openAdd("spouse")} large />
            )}
          </div>

          {!spouseLeft && primarySpouse && (
            <SiblingFan
              side="right"
              siblings={spouseSiblings}
              onSelect={setFocusId}
              onAdd={() => {
                setFocusId(primarySpouse.id);
                openAdd("sibling");
              }}
            />
          )}
          {focusFanSide === "right" && (
            <SiblingFan
              side="right"
              siblings={focusSiblings}
              onSelect={setFocusId}
              onAdd={() => openAdd("sibling")}
            />
          )}
        </div>

        {extraSpouses.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {extraSpouses.map((p) => (
              <PersonChip key={p.id} person={p} onSelect={() => setFocusId(p.id)} />
            ))}
          </div>
        )}
        {primarySpouse && (
          <div className="mt-2 flex justify-center">
            <AddChip label="+ Eş" onClick={() => openAdd("spouse")} />
          </div>
        )}

        <Connector />

        <TreeBand label="Çocuklar">
          {(links?.children ?? []).map((p) => (
            <PersonChip key={p.id} person={p} onSelect={() => setFocusId(p.id)} />
          ))}
          <AddChip label="+ Çocuk" onClick={() => openAdd("child")} />
        </TreeBand>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setFocusId(p.id)}
              className={cn(
                "pressable shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium",
                p.id === focusId
                  ? "border-text bg-text text-white"
                  : "border-border-soft bg-bg-surface text-text-secondary hover:text-text",
              )}
            >
              {p.full_name}
            </button>
          ))}
        </div>
      </div>

      {connectionsOpen && focus && (
        <ConnectionSheet
          focus={focus}
          people={people}
          relations={relations}
          role={connectionRole}
          selectedPersonId={connectionPersonId}
          busy={busy}
          error={error}
          onRoleChange={setConnectionRole}
          onPersonChange={setConnectionPersonId}
          onSave={() => void connectExistingPerson()}
          onRemove={(relationId) => void removeConnection(relationId)}
          onCancel={() => {
            setConnectionsOpen(false);
            setConnectionPersonId("");
            setError(null);
          }}
        />
      )}

      {addRole && focus && (
        <PersonFormSheet
          title={`${focus.full_name} → ${ROLE_LABEL[addRole]}`}
          draft={draft}
          setDraft={setDraft}
          busy={busy}
          error={error}
          onSave={() => void addRelative()}
          onCancel={() => {
            setAddRole(null);
            setDraft(emptyDraft());
            setError(null);
          }}
        />
      )}

      {editOpen && focus && (
        <PersonFormSheet
          title={`${focus.full_name} — bilgileri düzenle`}
          draft={editDraft}
          setDraft={setEditDraft}
          busy={busy}
          error={error}
          onSave={() => void saveFocusEdit()}
          onCancel={() => {
            setEditOpen(false);
            setError(null);
          }}
          saveLabel="Güncelle"
        />
      )}
    </section>
  );
}

function TreeBand({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
        {label}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>
    </div>
  );
}

function Connector() {
  return <div className="mx-auto my-3 h-5 w-px bg-gradient-to-b from-border to-steel/50" aria-hidden />;
}

function HeroPersonCard({
  person,
  variant,
  pulse,
  onEdit,
  onConnections,
  onSelect,
  detailHref,
}: {
  person: Person;
  variant: "focus" | "partner";
  pulse?: boolean;
  onEdit?: () => void;
  onConnections?: () => void;
  onSelect?: () => void;
  detailHref?: string;
}) {
  const isFocus = variant === "focus";
  const genderRing =
    person.gender === "female"
      ? "ring-[var(--gender-female)]/40"
      : person.gender === "male"
        ? "ring-[var(--gender-male)]/40"
        : "ring-border-soft";

  const inner = (
    <>
      <div className="mb-2 flex justify-center">
        <PersonAvatar person={person} size="lg" inverted={isFocus} />
      </div>
      <p className="text-[14px] font-semibold tracking-[-0.02em]">{person.full_name}</p>
      <p className={cn("mt-1 text-[11px]", isFocus ? "text-white/65" : "text-text-secondary")}>
        {formatYearRange(person.birth_year, person.death_year)}
      </p>
      {person.gender && (
        <p className={cn("mt-0.5 text-[10px]", isFocus ? "text-white/50" : "text-text-tertiary")}>
          {genderLabel(person.gender)}
        </p>
      )}
      {isFocus && onEdit && detailHref && (
        <div className="mt-2.5 flex justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium hover:bg-white/25"
          >
            Düzenle
          </button>
          {onConnections && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConnections();
              }}
              className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium hover:bg-white/20"
            >
              Bağlar
            </button>
          )}
          <Link
            href={detailHref}
            onClick={(e) => e.stopPropagation()}
            className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium hover:bg-white/20"
          >
            Sayfa
          </Link>
        </div>
      )}
      {!isFocus && (
        <p className="mt-2 text-[10px] font-medium text-text-tertiary">Odaklamak için dokun</p>
      )}
    </>
  );

  if (isFocus) {
    return (
      <div
        className={cn(
          "relative w-[168px] rounded-[18px] border border-text bg-text px-3 py-3.5 text-center text-white shadow-[0_12px_36px_rgba(29,29,31,0.22)] transition-transform duration-300",
          pulse && "scale-[1.03]",
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "pressable relative w-[168px] rounded-[18px] border border-border-soft bg-bg-surface px-3 py-3.5 text-center shadow-[0_10px_32px_rgba(0,0,0,0.08)] ring-2 transition-transform",
        genderRing,
      )}
    >
      {inner}
    </button>
  );
}

function ConnectionSheet({
  focus,
  people,
  relations,
  role,
  selectedPersonId,
  busy,
  error,
  onRoleChange,
  onPersonChange,
  onSave,
  onRemove,
  onCancel,
}: {
  focus: Person;
  people: Person[];
  relations: PersonRelation[];
  role: AddRole;
  selectedPersonId: string;
  busy: boolean;
  error: string | null;
  onRoleChange: (role: AddRole) => void;
  onPersonChange: (personId: string) => void;
  onSave: () => void;
  onRemove: (relationId: string) => void;
  onCancel: () => void;
}) {
  const byId = new Map(people.map((person) => [person.id, person]));
  const directConnections = relations.flatMap((relation) => {
    if (relation.relation_type === "parent" && relation.person_id === focus.id) {
      const person = byId.get(relation.related_person_id);
      return person ? [{ relation, person, label: "Ebeveyn" }] : [];
    }
    if (relation.relation_type === "parent" && relation.related_person_id === focus.id) {
      const person = byId.get(relation.person_id);
      return person ? [{ relation, person, label: "Çocuk" }] : [];
    }
    if (relation.relation_type === "spouse") {
      const otherId = relation.person_id === focus.id ? relation.related_person_id : relation.related_person_id === focus.id ? relation.person_id : null;
      const person = otherId ? byId.get(otherId) : null;
      return person ? [{ relation, person, label: "Eş" }] : [];
    }
    return [];
  });
  const extended = extendedLinksForPerson(focus.id, people, relations);
  const roleHelp: Record<AddRole, string> = {
    parent: "Seçilen kişi odak kişinin ebeveyni olur.",
    child: "Seçilen kişi odak kişinin çocuğu olur.",
    sibling: "Seçilen kişi odak kişinin bilinen ebeveynleriyle bağlanır.",
    spouse: "Seçilen kişi odak kişinin eşi olarak bağlanır.",
  };

  return (
    <div className="mt-4 animate-fade-up rounded-[16px] border border-border-soft bg-bg-surface p-4 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold tracking-[-0.02em]">{focus.full_name} · bağlar</p>
          <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
            Ebeveyn ve eş ilişkileri kaynak kayıttır; diğer akrabalık adları bunlardan hesaplanır.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="text-[12px] text-text-secondary hover:text-text">
          Kapat
        </button>
      </div>

      <div className="mt-4 rounded-[12px] border border-border-soft bg-bg-elevated/60 p-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["parent", "Ebeveyn"],
              ["child", "Çocuk"],
              ["sibling", "Kardeş"],
              ["spouse", "Eş"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onRoleChange(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                role === id ? "bg-text text-white" : "bg-bg-surface text-text-secondary hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-text-secondary">{roleHelp[role]}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedPersonId}
            onChange={(event) => onPersonChange(event.target.value)}
            className="min-w-0 flex-1 rounded-[10px] border border-border-soft bg-bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
          >
            <option value="">Mevcut bir kişi seçin</option>
            {people
              .filter((person) => person.id !== focus.id)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.full_name}
                </option>
              ))}
          </select>
          <Button type="button" disabled={busy || !selectedPersonId} onClick={onSave}>
            Bağla
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      <div className="mt-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-secondary">Doğrudan bağlar</p>
        {directConnections.length === 0 ? (
          <p className="mt-2 text-[13px] text-text-secondary">Henüz doğrudan bir ilişki kaydı yok.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {directConnections.map(({ relation, person, label }) => (
              <li key={relation.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-border-soft px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{person.full_name}</p>
                  <p className="text-[11px] text-text-secondary">{label}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRemove(relation.id)}
                  className="shrink-0 text-[12px] font-medium text-danger hover:underline disabled:opacity-50"
                >
                  Bağı kaldır
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {extended.length > 0 && (
        <div className="mt-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-secondary">Hesaplanan akrabalıklar</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {extended.map(({ person, label }) => (
              <span key={`${person.id}-${label}`} className="rounded-full border border-border-soft bg-bg-elevated px-2.5 py-1 text-[12px] text-text-secondary">
                {person.full_name} · {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SiblingFan({
  side,
  siblings,
  onSelect,
  onAdd,
}: {
  side: "left" | "right";
  siblings: Person[];
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  const visible = siblings.slice(0, 4);
  const rest = siblings.length - visible.length;

  return (
    <div className="sibling-fan" data-side={side}>
      {visible.map((p) => (
        <button
          key={p.id}
          type="button"
          className="sibling-fan-item pressable w-[108px] shrink-0 rounded-[14px] border border-border-soft bg-bg-surface/95 px-2 py-2 text-center shadow-[var(--shadow)]"
          onClick={() => onSelect(p.id)}
          title={p.full_name}
        >
          <div className="mb-1 flex justify-center">
            <PersonAvatar person={p} size="sm" />
          </div>
          <p className="truncate text-[11px] font-semibold tracking-[-0.02em]">{p.full_name}</p>
        </button>
      ))}
      {rest > 0 && (
        <span className="sibling-fan-item rounded-full bg-bg-elevated px-2 py-1 text-[10px] font-medium text-text-secondary">
          +{rest}
        </span>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="sibling-fan-item pressable shrink-0 rounded-[12px] border border-dashed border-border bg-white/80 px-2 py-3 text-[10px] font-medium text-text-secondary hover:text-text"
      >
        +
      </button>
    </div>
  );
}

function PersonChip({
  person,
  onSelect,
  large = false,
  tone,
}: {
  person: Person;
  onSelect: () => void;
  large?: boolean;
  tone?: "spouse";
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "pressable flex items-center gap-2 rounded-[14px] border bg-bg-surface text-left shadow-[var(--shadow)] hover:border-border",
        large ? "min-w-[148px] px-3 py-2.5" : "min-w-[120px] max-w-[160px] px-2.5 py-2",
        tone === "spouse" ? "border-accent/35" : "border-border-soft",
      )}
    >
      <PersonAvatar person={person} size={large ? "md" : "sm"} />
      <span className="min-w-0">
        <p className={cn("truncate font-semibold tracking-[-0.02em]", large ? "text-[13px]" : "text-[12px]")}>
          {person.full_name}
        </p>
        <p className="mt-0.5 text-[10px] text-text-secondary">
          {formatYearRange(person.birth_year, person.death_year)}
        </p>
      </span>
    </button>
  );
}

function AddChip({
  label,
  onClick,
  large = false,
}: {
  label: string;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "pressable rounded-[14px] border border-dashed border-border bg-white/70 font-medium text-text-secondary hover:border-accent hover:text-text",
        large ? "min-w-[140px] px-3 py-2.5 text-[12px]" : "min-w-[100px] px-2.5 py-2 text-[11px]",
      )}
    >
      {label}
    </button>
  );
}

function PersonFormSheet({
  title,
  draft,
  setDraft,
  busy,
  error,
  onSave,
  onCancel,
  saveLabel = "Kaydet",
}: {
  title: string;
  draft: PersonDraft;
  setDraft: (d: PersonDraft) => void;
  busy: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const previewUrl =
    draft.avatarFile != null
      ? URL.createObjectURL(draft.avatarFile)
      : draft.avatar_url;

  return (
    <div className="mt-4 animate-fade-up rounded-[16px] border border-border-soft bg-bg-surface p-4 shadow-[var(--shadow)]">
      <p className="text-[14px] font-semibold tracking-[-0.02em]">{title}</p>
      <div className="mt-3 space-y-2.5">
        <div className="flex items-center gap-3">
          <PersonAvatar
            gender={draft.gender}
            avatarUrl={previewUrl}
            size="lg"
          />
          <label className="pressable cursor-pointer rounded-full border border-border-soft bg-bg-elevated px-3 py-2 text-[12px] font-medium text-text-secondary hover:text-text">
            Fotoğraf ekle
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setDraft({ ...draft, avatarFile: file });
              }}
            />
          </label>
        </div>
        <Input
          autoFocus
          value={draft.full_name}
          onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
          placeholder="Ad soyad"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={draft.birth_year}
            onChange={(e) => setDraft({ ...draft, birth_year: e.target.value })}
            placeholder="Doğum yılı"
            inputMode="numeric"
          />
          <Input
            value={draft.death_year}
            onChange={(e) => setDraft({ ...draft, death_year: e.target.value })}
            placeholder="Vefat yılı"
            inputMode="numeric"
          />
        </div>
        <select
          className="w-full rounded-[12px] border border-border-soft bg-bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
          value={draft.gender ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              gender: (e.target.value || null) as Gender,
            })
          }
        >
          <option value="">Cinsiyet (isteğe bağlı)</option>
          <option value="male">Erkek</option>
          <option value="female">Kadın</option>
          <option value="other">Diğer</option>
          <option value="unknown">Bilinmiyor</option>
        </select>
        <Textarea
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Not / anı (isteğe bağlı)"
        />
      </div>
      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button disabled={busy || !draft.full_name.trim()} onClick={onSave}>
          {saveLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}

function genderLabel(g: NonNullable<Gender>): string {
  if (g === "male") return "Erkek";
  if (g === "female") return "Kadın";
  if (g === "other") return "Diğer";
  return "Bilinmiyor";
}

/** @deprecated use PersonRelationStudio */
export { PersonRelationStudio as FamilyTree };
