"use client";

import { useAuth } from "@/components/auth-provider";
import { Button, Input, Textarea } from "@/components/ui";
import { clearAuthDraft, loadAuthDraft, saveAuthDraft } from "@/lib/auth-draft";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DRAFT_KEY = "create-village";

type VillageDraft = {
  name: string;
  nameTr: string;
  description: string;
};

export function CreateVillageForm() {
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameTr, setNameTr] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const resumed = useRef(false);

  useEffect(() => {
    const draft = loadAuthDraft<VillageDraft>(DRAFT_KEY);
    if (!draft) return;
    setName(draft.data.name ?? "");
    setNameTr(draft.data.nameTr ?? "");
    setDescription(draft.data.description ?? "");
    setRestoredNotice(true);
  }, []);

  useEffect(() => {
    if (!user || resumed.current) return;
    const draft = loadAuthDraft<VillageDraft>(DRAFT_KEY);
    if (!draft?.resumeSubmit) return;
    resumed.current = true;
    clearAuthDraft(DRAFT_KEY);
    void performSubmit(draft.data);
  }, [user]);

  async function performSubmit(data: VillageDraft) {
    if (!data.name.trim()) return;

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

    const base = slugify(data.name) || "koy";
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const { data: row, error: err } = await supabase
        .from("villages")
        .insert({
          name: data.name.trim(),
          name_tr: data.nameTr.trim() || null,
          slug,
          description: data.description.trim() || null,
          created_by: u.id,
        })
        .select("slug")
        .single();

      if (!err && row) {
        clearAuthDraft(DRAFT_KEY);
        setBusy(false);
        router.push(`/v/${row.slug}`);
        router.refresh();
        return;
      }

      if (err?.code === "23505") {
        slug = `${base}-${Math.floor(Math.random() * 900 + 100)}`;
        continue;
      }

      setError(err?.message ?? "Köy eklenemedi");
      setBusy(false);
      return;
    }

    setError("Bu isimde slug çakışması oluştu, tekrar dene.");
    setBusy(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: VillageDraft = { name, nameTr, description };
    saveAuthDraft(DRAFT_KEY, data, true);
    const ok = await requireAuth();
    if (!ok) return;
    clearAuthDraft(DRAFT_KEY);
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
          Köyün yerel / Kürtçe adı
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Köy adı"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
          Türkçe adı <span className="font-normal text-text-tertiary">(isteğe bağlı)</span>
        </label>
        <Input
          value={nameTr}
          onChange={(e) => setNameTr(e.target.value)}
          placeholder="Varsa resmî veya yaygın Türkçe karşılığı"
        />
        <p className="mt-1.5 text-[12px] text-text-tertiary">
          Kaydedildiğinde ana adın hemen altında gösterilir; topluluk daha sonra güncelleyebilir.
        </p>
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Kısa açıklama (isteğe bağlı)"
      />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" disabled={busy || !name.trim()}>
        {busy ? "Kaydediliyor…" : "Köy oluştur"}
      </Button>
    </form>
  );
}
