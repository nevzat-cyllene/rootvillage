"use client";

import { useAuth } from "@/components/auth-provider";
import { Button, Input, Textarea } from "@/components/ui";
import { normalizeFamilyName } from "@/lib/family-name";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateFamilyForm({
  villageId,
  stayOnVillage = false,
  onCreated,
}: {
  villageId: string;
  stayOnVillage?: boolean;
  onCreated?: (familyId: string) => void;
}) {
  const { requireAuth } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [aka, setAka] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await requireAuth();
    if (!ok) return;
    const cleaned = normalizeFamilyName(name);
    if (!cleaned) return;

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
      .from("families")
      .insert({
        village_id: villageId,
        name: cleaned,
        aka: aka.trim() || null,
        notes: notes.trim() || null,
        is_incomplete: true,
        created_by: user.id,
      })
      .select("id")
      .single();

    setBusy(false);
    if (err || !data) {
      setError(err?.message ?? "Aile eklenemedi");
      return;
    }

    setName("");
    setAka("");
    setNotes("");
    onCreated?.(data.id);
    if (!stayOnVillage) router.push(`/family/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
          Aile adı
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hacı Mehmet"
          required
        />
        <p className="mt-1.5 text-[12px] text-text-tertiary">
          Kısa tut; “Ailesi” eklemene gerek yok — otomatik temizlenir.
        </p>
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
          Lakap
        </label>
        <Input
          value={aka}
          onChange={(e) => setAka(e.target.value)}
          placeholder="Yerel lakap (isteğe bağlı)"
        />
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Kısa not"
      />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" disabled={busy || !name.trim()}>
        {busy ? "Ocak kuruluyor…" : "Aile ocağını kur"}
      </Button>
    </form>
  );
}
