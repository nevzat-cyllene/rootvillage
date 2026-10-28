"use client";

import { PersonAvatar } from "@/components/person-avatar";
import { Button, Input, Textarea } from "@/components/ui";
import { ROLE_LABEL, type AddRole } from "@/lib/pedigree/mutations";
import { createClient } from "@/lib/supabase/client";
import { extendedLinksForPerson } from "@/lib/tree";
import type { Person, PersonRelation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export type { AddRole };
export { ROLE_LABEL };

export type Gender = Person["gender"];

export type PersonDraft = {
  full_name: string;
  birth_year: string;
  death_year: string;
  gender: Gender;
  notes: string;
  avatar_url: string | null;
  avatarFile: File | null;
};

export type PersonSearchOption = Pick<Person, "id" | "full_name" | "gender" | "family_id"> & {
  familyName?: string | null;
  villageName?: string | null;
};

export const emptyDraft = (): PersonDraft => ({
  full_name: "",
  birth_year: "",
  death_year: "",
  gender: null,
  notes: "",
  avatar_url: null,
  avatarFile: null,
});

export function draftToPayload(d: PersonDraft, avatarUrl?: string | null) {
  return {
    full_name: d.full_name.trim(),
    birth_year: d.birth_year ? Number(d.birth_year) : null,
    death_year: d.death_year ? Number(d.death_year) : null,
    gender: d.gender,
    notes: d.notes.trim() || null,
    avatar_url: avatarUrl !== undefined ? avatarUrl : d.avatar_url,
  };
}

export function personToDraft(p: Person): PersonDraft {
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

export function defaultGenderForRole(role: AddRole, focus: Person | null): Gender {
  if (role === "spouse" && focus?.gender === "male") return "female";
  if (role === "spouse" && focus?.gender === "female") return "male";
  return null;
}

export function genderLabel(g: NonNullable<Gender>): string {
  if (g === "male") return "Erkek";
  if (g === "female") return "Kadın";
  if (g === "other") return "Diğer";
  return "Bilinmiyor";
}

/* ------------------------------------------------------------------ */
/* Person create / edit sheet                                          */
/* ------------------------------------------------------------------ */

export function PersonFormSheet({
  title,
  eyebrow = "Kişi kaydı",
  draft,
  setDraft,
  busy,
  error,
  onSave,
  onCancel,
  saveLabel = "Kaydet",
  children,
}: {
  title: string;
  eyebrow?: string;
  draft: PersonDraft;
  setDraft: (d: PersonDraft) => void;
  busy: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  /** Extra fields rendered under the person fields (e.g. co-parent picker). */
  children?: React.ReactNode;
}) {
  const previewUrl =
    draft.avatarFile != null
      ? URL.createObjectURL(draft.avatarFile)
      : draft.avatar_url;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#07111F]/50 p-3 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="kinship-sheet-enter max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_28px_90px_rgba(8,18,35,0.3)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#286F61]">{eyebrow}</p>
            <p className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">{title}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bg-elevated text-lg text-text-secondary transition hover:bg-border-soft hover:text-text"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <PersonAvatar gender={draft.gender} avatarUrl={previewUrl} size="lg" />
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
          <div>
            <p className="mb-2 text-[12px] font-medium text-text-secondary">Cinsiyet</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["female", "Kadın", "♀"],
                  ["male", "Erkek", "♂"],
                  ["other", "Diğer", "◇"],
                  ["unknown", "Bilinmiyor", "?"],
                ] as const
              ).map(([value, label, symbol]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDraft({ ...draft, gender: value })}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-[13px] border px-3 py-2.5 text-[12px] font-semibold transition",
                    draft.gender === value && value === "female" && "border-[#D76B91] bg-[#FFF0F5] text-[#9C365D] shadow-[0_6px_20px_rgba(215,107,145,0.16)]",
                    draft.gender === value && value === "male" && "border-[#4D8ED8] bg-[#EDF6FF] text-[#235E9E] shadow-[0_6px_20px_rgba(77,142,216,0.16)]",
                    draft.gender === value && value !== "female" && value !== "male" && "border-accent bg-accent-soft text-accent",
                    draft.gender !== value && "border-border-soft bg-white text-text-secondary hover:border-border hover:text-text",
                  )}
                >
                  <span className="text-base" aria-hidden>{symbol}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {children}
          <Textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Not / anı (isteğe bağlı)"
          />
        </div>
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
        <div className="mt-3 flex gap-2">
          <Button disabled={busy || !draft.full_name.trim()} onClick={onSave}>
            {busy ? "Kaydediliyor…" : saveLabel}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Vazgeç
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Connect existing person / manage direct links                       */
/* ------------------------------------------------------------------ */

export function ConnectionSheet({
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
  const [query, setQuery] = useState("");
  const [remoteOptions, setRemoteOptions] = useState<PersonSearchOption[]>([]);
  const [searching, setSearching] = useState(false);
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
    parent: `${focus.full_name}’in ebeveyni (üst nesil) olarak bağlanır.`,
    child: `${focus.full_name}’in çocuğu (alt nesil) olarak bağlanır.`,
    sibling: `${focus.full_name} ile aynı ebeveynlere bağlanır (kardeş).`,
    spouse: `${focus.full_name}’in eşi olur.`,
  };

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setRemoteOptions([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const { data } = await createClient()
          .from("people")
          .select("id, full_name, gender, family_id, families(name, villages(name))")
          .is("deleted_at", null)
          .neq("id", focus.id)
          .ilike("full_name", `%${term.replace(/[%_,]/g, "")}%`)
          .limit(12);

        if (cancelled) return;
        const rows = (data ?? []) as Array<{
          id: string;
          full_name: string;
          gender: Person["gender"];
          family_id: string;
          families: {
            name?: string | null;
            villages?: { name?: string | null } | Array<{ name?: string | null }> | null;
          } | Array<{
            name?: string | null;
            villages?: { name?: string | null } | Array<{ name?: string | null }> | null;
          }> | null;
        }>;
        setRemoteOptions(rows.map((row) => {
          const family = Array.isArray(row.families) ? row.families[0] : row.families;
          const village = Array.isArray(family?.villages) ? family.villages[0] : family?.villages;
          return {
            id: row.id,
            full_name: row.full_name,
            gender: row.gender,
            family_id: row.family_id,
            familyName: family?.name ?? null,
            villageName: village?.name ?? null,
          };
        }));
        setSearching(false);
      })();
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, focus.id]);

  const localOptions: PersonSearchOption[] = people
    .filter((person) => person.id !== focus.id)
    .filter((person) => !query.trim() || person.full_name.toLocaleLowerCase("tr").includes(query.trim().toLocaleLowerCase("tr")));
  const optionMap = new Map<string, PersonSearchOption>();
  for (const option of [...localOptions, ...remoteOptions]) optionMap.set(option.id, option);
  const options = [...optionMap.values()].slice(0, 14);
  const selectedOption = optionMap.get(selectedPersonId) ?? byId.get(selectedPersonId);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#07111F]/50 p-3 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${focus.full_name} için bağ ekle`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="kinship-sheet-enter max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_28px_90px_rgba(8,18,35,0.3)] sm:p-6">
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
          <div className="mt-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Köyde veya başka bir ailede kişi ara…"
            />
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-[14px] border border-border-soft bg-white p-1.5">
              {options.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onPersonChange(person.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[11px] px-3 py-2 text-left transition",
                    selectedPersonId === person.id
                      ? "bg-[#E3F3EE] text-[#18594B] ring-1 ring-[#76B5A5]/45"
                      : "hover:bg-bg-elevated",
                  )}
                >
                  <PersonAvatar gender={person.gender} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{person.full_name}</span>
                    <span className="block truncate text-[11px] text-text-secondary">
                      {person.familyName ?? (person.family_id === focus.family_id ? "Aynı aile" : "Bağlı başka aile")}
                      {person.villageName ? ` · ${person.villageName}` : ""}
                    </span>
                  </span>
                  {selectedPersonId === person.id && <span aria-hidden>✓</span>}
                </button>
              ))}
              {searching && <p className="px-3 py-4 text-center text-[12px] text-text-secondary">Aranıyor…</p>}
              {!searching && options.length === 0 && (
                <p className="px-3 py-4 text-center text-[12px] text-text-secondary">
                  En az iki harf yaz; tüm ailelerde arayalım.
                </p>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[12px] text-text-secondary">
                {selectedOption ? `${selectedOption.full_name} seçildi` : "Bağlanacak kişiyi seç"}
              </p>
              <Button type="button" disabled={busy || !selectedPersonId} onClick={onSave}>
                {busy ? "Bağlanıyor…" : "Bağı kur"}
              </Button>
            </div>
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
    </div>
  );
}
