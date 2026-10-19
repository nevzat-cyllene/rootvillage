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

    let base = slugify(name) || "koy";
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const { data, error: err } = await supabase
        .from("villages")
        .insert({
          name: name.trim(),
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
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Köy adı"
        required
      />
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
