"use client";

import { useAuth } from "@/components/auth-provider";
import { Button, Input, Textarea } from "@/components/ui";
import { clearAuthDraft, loadAuthDraft, saveAuthDraft } from "@/lib/auth-draft";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PersonDraft = {
  fullName: string;
  birthYear: string;
  deathYear: string;
  gender: Person["gender"];
  notes: string;
  parentId: string;
};

type EditDraft = {
  open: boolean;
  fullName: string;
  birthYear: string;
  deathYear: string;
  gender: Person["gender"];
  notes: string;
  generation: string;
};

export function CreatePersonForm({
  familyId,
  people,
}: {
  familyId: string;
  people: Person[];
}) {
  const draftKey = `create-person:${familyId}`;
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [gender, setGender] = useState<Person["gender"]>(null);
  const [notes, setNotes] = useState("");
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const resumed = useRef(false);

  useEffect(() => {
    const draft = loadAuthDraft<PersonDraft>(draftKey);
    if (!draft) return;
    setFullName(draft.data.fullName ?? "");
    setBirthYear(draft.data.birthYear ?? "");
    setDeathYear(draft.data.deathYear ?? "");
    setGender(draft.data.gender ?? null);
    setNotes(draft.data.notes ?? "");
    setParentId(draft.data.parentId ?? "");
    setRestoredNotice(true);
  }, [draftKey]);

  useEffect(() => {
    if (!user || resumed.current) return;
    const draft = loadAuthDraft<PersonDraft>(draftKey);
    if (!draft?.resumeSubmit) return;
    resumed.current = true;
    clearAuthDraft(draftKey);
    void performSubmit(draft.data);
  }, [user, draftKey]);

  async function performSubmit(data: PersonDraft) {
    if (!data.fullName.trim()) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      setBusy(false);
      return;
    }

    const { data: created, error: err } = await supabase
      .from("people")
      .insert({
        family_id: familyId,
        full_name: data.fullName.trim(),
        birth_year: data.birthYear ? Number(data.birthYear) : null,
        death_year: data.deathYear ? Number(data.deathYear) : null,
        gender: data.gender,
        notes: data.notes.trim() || null,
        created_by: u.id,
      })
      .select("id")
      .single();

    if (err || !created) {
      setBusy(false);
      setError(err?.message ?? "Kişi eklenemedi");
      return;
    }

    if (data.parentId) {
      await supabase.from("person_relations").insert({
        person_id: created.id,
        related_person_id: data.parentId,
        relation_type: "parent",
        created_by: u.id,
      });
    }

    await supabase.from("families").update({ is_incomplete: false }).eq("id", familyId);

    clearAuthDraft(draftKey);
    setBusy(false);
    setFullName("");
    setBirthYear("");
    setDeathYear("");
    setGender(null);
    setNotes("");
    setParentId("");
    setRestoredNotice(false);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: PersonDraft = { fullName, birthYear, deathYear, gender, notes, parentId };
    saveAuthDraft(draftKey, data, true);
    const ok = await requireAuth();
    if (!ok) return;
    clearAuthDraft(draftKey);
    await performSubmit(data);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      {restoredNotice && (
        <p className="rounded-[12px] bg-[#EAF4F1] px-3 py-2 text-[12px] font-medium text-[#286F61]">
          Girişten önce yazdığın bilgiler geri yüklendi.
        </p>
      )}
      <Input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Ad soyad"
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          placeholder="Doğum yılı"
          inputMode="numeric"
        />
        <Input
          value={deathYear}
          onChange={(e) => setDeathYear(e.target.value)}
          placeholder="Vefat yılı"
          inputMode="numeric"
        />
      </div>
      <select
        className="w-full rounded-[12px] border border-border-soft bg-bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
        value={gender ?? ""}
        onChange={(e) => setGender((e.target.value || null) as Person["gender"])}
      >
        <option value="">Cinsiyet (isteğe bağlı)</option>
        <option value="male">Erkek</option>
        <option value="female">Kadın</option>
        <option value="other">Diğer</option>
        <option value="unknown">Bilinmiyor</option>
      </select>
      {people.length > 0 && (
        <select
          className="w-full rounded-[12px] border border-border-soft bg-bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">Ebeveyn (isteğe bağlı)</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      )}
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Kısa not / anı"
      />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" disabled={busy || !fullName.trim()}>
        {busy ? "Kaydediliyor…" : "Kişi ekle"}
      </Button>
    </form>
  );
}

export function EditPersonQuick({ person }: { person: Person }) {
  const draftKey = `edit-person:${person.id}`;
  const { user, requireAuth, profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(person.full_name);
  const [birthYear, setBirthYear] = useState(person.birth_year?.toString() ?? "");
  const [deathYear, setDeathYear] = useState(person.death_year?.toString() ?? "");
  const [gender, setGender] = useState<Person["gender"]>(person.gender);
  const [notes, setNotes] = useState(person.notes ?? "");
  const [generation, setGeneration] = useState(
    person.generation != null ? String(person.generation) : "",
  );
  const [busy, setBusy] = useState(false);
  const resumed = useRef(false);

  useEffect(() => {
    const draft = loadAuthDraft<EditDraft>(draftKey);
    if (!draft) return;
    setOpen(true);
    setFullName(draft.data.fullName ?? person.full_name);
    setBirthYear(draft.data.birthYear ?? "");
    setDeathYear(draft.data.deathYear ?? "");
    setGender(draft.data.gender ?? null);
    setNotes(draft.data.notes ?? "");
    setGeneration(draft.data.generation ?? "");
  }, [draftKey, person.full_name]);

  useEffect(() => {
    if (!user || resumed.current) return;
    const draft = loadAuthDraft<EditDraft>(draftKey);
    if (!draft?.resumeSubmit) return;
    resumed.current = true;
    clearAuthDraft(draftKey);
    void performSave(draft.data);
  }, [user, draftKey]);

  async function performSave(data: EditDraft) {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      setBusy(false);
      return;
    }

    const genNum = data.generation.trim() ? Number(data.generation) : null;
    const payload = {
      full_name: data.fullName.trim(),
      birth_year: data.birthYear ? Number(data.birthYear) : null,
      death_year: data.deathYear ? Number(data.deathYear) : null,
      gender: data.gender,
      notes: data.notes.trim() || null,
      generation:
        genNum != null && Number.isFinite(genNum) && genNum >= 1 && genNum <= 20
          ? Math.round(genNum)
          : null,
    };

    await supabase.from("people").update(payload).eq("id", person.id);
    if (profile?.role !== "admin" && data.fullName.trim() !== person.full_name) {
      await supabase.from("edit_proposals").insert({
        target_type: "person",
        target_id: person.id,
        action: "update",
        payload,
        reason: "Kişi bilgisi güncellemesi",
        proposed_by: u.id,
        status: "accepted",
        resolved_by: u.id,
        resolved_at: new Date().toISOString(),
      });
    }

    clearAuthDraft(draftKey);
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  async function save() {
    const data: EditDraft = {
      open: true,
      fullName,
      birthYear,
      deathYear,
      gender,
      notes,
      generation,
    };
    saveAuthDraft(draftKey, data, true);
    const ok = await requireAuth();
    if (!ok) return;
    clearAuthDraft(draftKey);
    await performSave(data);
  }

  if (!open) {
    return (
      <Button variant="ghost" className="!px-2 !py-1 text-[12px]" onClick={() => setOpen(true)}>
        Düzenle
      </Button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-[12px] border border-border-soft bg-bg-elevated p-3">
      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ad soyad" />
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          placeholder="Doğum yılı"
          inputMode="numeric"
        />
        <Input
          value={deathYear}
          onChange={(e) => setDeathYear(e.target.value)}
          placeholder="Vefat yılı"
          inputMode="numeric"
        />
      </div>
      <select
        className="w-full rounded-[12px] border border-border-soft bg-bg-surface px-3.5 py-2.5 text-[15px] outline-none"
        value={gender ?? ""}
        onChange={(e) => setGender((e.target.value || null) as Person["gender"])}
      >
        <option value="">Cinsiyet</option>
        <option value="male">Erkek</option>
        <option value="female">Kadın</option>
        <option value="other">Diğer</option>
        <option value="unknown">Bilinmiyor</option>
      </select>
      <select
        className="w-full rounded-[12px] border border-border-soft bg-bg-surface px-3.5 py-2.5 text-[15px] outline-none"
        value={generation}
        onChange={(e) => setGeneration(e.target.value)}
      >
        <option value="">Nesil (otomatik)</option>
        <option value="1">1. nesil · kurucu</option>
        <option value="2">2. nesil · çocuk</option>
        <option value="3">3. nesil · torun</option>
        <option value="4">4. nesil · torun çocuğu</option>
        <option value="5">5. nesil</option>
        <option value="6">6. nesil</option>
        <option value="7">7. nesil</option>
        <option value="8">8. nesil</option>
      </select>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Not" />
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            clearAuthDraft(draftKey);
            setOpen(false);
          }}
        >
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
