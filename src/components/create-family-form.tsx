"use client";

import { useAuth } from "@/components/auth-provider";
import { Button, Input, Textarea } from "@/components/ui";
import { clearAuthDraft, loadAuthDraft, saveAuthDraft } from "@/lib/auth-draft";
import { normalizeFamilyName } from "@/lib/family-name";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type FamilyDraft = {
  name: string;
  aka: string;
  notes: string;
};

export function CreateFamilyForm({
  villageId,
  onCreated,
}: {
  villageId: string;
  onCreated?: (familyId: string) => void;
}) {
  const draftKey = `create-family:${villageId}`;
  const { user, loading: authLoading, requireAuth } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [aka, setAka] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const resumed = useRef(false);

  useEffect(() => {
    const draft = loadAuthDraft<FamilyDraft>(draftKey);
    if (!draft) return;
    setName(draft.data.name ?? "");
    setAka(draft.data.aka ?? "");
    setNotes(draft.data.notes ?? "");
    setRestoredNotice(true);
  }, [draftKey]);

  useEffect(() => {
    if (authLoading || !user || resumed.current) return;
    const draft = loadAuthDraft<FamilyDraft>(draftKey);
    if (!draft?.resumeSubmit) return;
    resumed.current = true;
    void performSubmit(draft.data);
  }, [user, authLoading, draftKey]);

  async function performSubmit(data: FamilyDraft) {
    const cleaned = normalizeFamilyName(data.name);
    if (!cleaned) {
      setError("Aile adı gerekli.");
      return;
    }

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      setBusy(false);
      setError("Oturum bulunamadı. Tekrar giriş yap.");
      return;
    }

    const { data: row, error: err } = await supabase
      .from("families")
      .insert({
        village_id: villageId,
        name: cleaned,
        aka: data.aka.trim() || null,
        notes: data.notes.trim() || null,
        is_incomplete: true,
        created_by: u.id,
      })
      .select("id")
      .single();

    if (err || !row) {
      setBusy(false);
      setError(err?.message ?? "Aile eklenemedi");
      return;
    }

    clearAuthDraft(draftKey);
    setName("");
    setAka("");
    setNotes("");
    setRestoredNotice(false);
    onCreated?.(row.id);
    // Always land on the family page so the founder can be added next.
    router.push(`/family/${row.id}`);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (authLoading || busy) return;
    const data: FamilyDraft = { name, aka, notes };
    if (!name.trim()) {
      setError("Aile adı gerekli.");
      return;
    }
    if (!user) {
      saveAuthDraft(draftKey, data, true);
      await requireAuth();
      return;
    }
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
      <Button type="submit" disabled={busy || authLoading || !name.trim()}>
        {busy ? "Ocak kuruluyor…" : authLoading ? "Oturum kontrol…" : "Aile ocağını kur"}
      </Button>
    </form>
  );
}
