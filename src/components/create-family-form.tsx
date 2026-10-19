"use client";

import { useAuth } from "@/components/auth-provider";
import { Button, Input, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateFamilyForm({ villageId }: { villageId: string }) {
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
    if (!name.trim()) return;

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
        name: name.trim(),
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
    router.push(`/family/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Aile / sülale adı"
        required
      />
      <Input
        value={aka}
        onChange={(e) => setAka(e.target.value)}
        placeholder="Lakap / aka (isteğe bağlı)"
      />
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Kısa not"
      />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" disabled={busy || !name.trim()}>
        Aile ekle
      </Button>
    </form>
  );
}
