"use client";

import { useAuth } from "@/components/auth-provider";
import { Button, Input, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreatePersonForm({
  familyId,
  people,
}: {
  familyId: string;
  people: Person[];
}) {
  const { requireAuth } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [notes, setNotes] = useState("");
  const [parentId, setParentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await requireAuth();
    if (!ok) return;
    if (!fullName.trim()) return;

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

    const { data, error: err } = await supabase
      .from("people")
      .insert({
        family_id: familyId,
        full_name: fullName.trim(),
        birth_year: birthYear ? Number(birthYear) : null,
        death_year: deathYear ? Number(deathYear) : null,
        notes: notes.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (err || !data) {
      setBusy(false);
      setError(err?.message ?? "Kişi eklenemedi");
      return;
    }

    if (parentId) {
      await supabase.from("person_relations").insert({
        person_id: data.id,
        related_person_id: parentId,
        relation_type: "parent",
        created_by: user.id,
      });
    }

    // Mark family as less incomplete once people exist
    await supabase.from("families").update({ is_incomplete: false }).eq("id", familyId);

    setBusy(false);
    setFullName("");
    setBirthYear("");
    setDeathYear("");
    setNotes("");
    setParentId("");
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
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
        Kişi ekle
      </Button>
    </form>
  );
}

export function EditPersonQuick({ person }: { person: Person }) {
  const { requireAuth, profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(person.full_name);
  const [notes, setNotes] = useState(person.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    const ok = await requireAuth();
    if (!ok) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    const payload = {
      full_name: fullName.trim(),
      notes: notes.trim() || null,
    };

    if (profile?.role === "admin") {
      await supabase.from("people").update(payload).eq("id", person.id);
    } else {
      // Direct update allowed for authenticated users per plan RLS;
      // also log a proposal trail for transparency on name changes
      await supabase.from("people").update(payload).eq("id", person.id);
      if (fullName.trim() !== person.full_name) {
        await supabase.from("edit_proposals").insert({
          target_type: "person",
          target_id: person.id,
          action: "update",
          payload,
          reason: "İsim / not güncellemesi",
          proposed_by: user.id,
          status: "accepted",
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        });
      }
    }

    setBusy(false);
    setOpen(false);
    router.refresh();
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
      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => void save()}>
          Kaydet
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
