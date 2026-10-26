"use client";

import { useAuth } from "@/components/auth-provider";
import { Button, Input, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateVillageForm() {
  const { requireAuth } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameTr, setNameTr] = useState("");
  const [description, setDescription] = useState("");
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

    const base = slugify(name) || "koy";
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const { data, error: err } = await supabase
        .from("villages")
        .insert({
          name: name.trim(),
          name_tr: nameTr.trim() || null,
          slug,
          description: description.trim() || null,
          created_by: user.id,
        })
        .select("slug")
        .single();

      if (!err && data) {
        setBusy(false);
        router.push(`/v/${data.slug}`);
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

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
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
        Köy oluştur
      </Button>
    </form>
  );
}
