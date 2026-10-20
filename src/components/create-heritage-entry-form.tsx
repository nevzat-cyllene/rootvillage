"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button, Input, Textarea } from "@/components/ui";
import { heritageTypeMeta } from "@/lib/heritage";
import { createClient } from "@/lib/supabase/client";
import { heritageEntryTypes, type HeritageEntryType } from "@/lib/types";
import { slugify } from "@/lib/utils";

export function CreateHeritageEntryForm() {
  const { requireAuth } = useAuth();
  const router = useRouter();
  const [entryType, setEntryType] = useState<HeritageEntryType>("region");
  const [title, setTitle] = useState("");
  const [titleTr, setTitleTr] = useState("");
  const [locationText, setLocationText] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const ok = await requireAuth();
    if (!ok || !title.trim()) return;

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

    const base = slugify(title) || "kayit";
    let slug = base;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error: insertError } = await supabase
        .from("heritage_entries")
        .insert({
          entry_type: entryType,
          title: title.trim(),
          title_tr: titleTr.trim() || null,
          slug,
          location_text: locationText.trim() || null,
          summary: summary.trim() || null,
          content: content.trim() || null,
          source_note: sourceNote.trim() || null,
          created_by: user.id,
        })
        .select("slug")
        .single();

      if (!insertError && data) {
        router.push(`/archive/${data.slug}`);
        router.refresh();
        return;
      }
      if (insertError?.code === "23505") {
        slug = `${base}-${Math.floor(Math.random() * 900 + 100)}`;
        continue;
      }
      setError(insertError?.message ?? "Kayıt eklenemedi.");
      setBusy(false);
      return;
    }

    setError("Bu başlık için benzersiz bir bağlantı oluşturulamadı. Lütfen tekrar deneyin.");
    setBusy(false);
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">Kayıt türü</label>
        <select
          value={entryType}
          onChange={(event) => setEntryType(event.target.value as HeritageEntryType)}
          className="w-full rounded-[12px] border border-border-soft bg-bg-surface px-3.5 py-2.5 text-[15px] text-text outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
        >
          {heritageEntryTypes.map((type) => (
            <option key={type} value={type}>
              {heritageTypeMeta[type].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
          Yerel / Kürtçe başlık
        </label>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Örn. Amed" required />
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] font-medium text-text-secondary">
          Türkçe karşılığı <span className="font-normal text-text-tertiary">(isteğe bağlı)</span>
        </label>
        <Input
          value={titleTr}
          onChange={(event) => setTitleTr(event.target.value)}
          placeholder="Varsa resmî veya yaygın Türkçe ad"
        />
      </div>
      <Input
        value={locationText}
        onChange={(event) => setLocationText(event.target.value)}
        placeholder="Bağlam veya konum (isteğe bağlı)"
      />
      <Textarea
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        placeholder="Kısa özet: Bu kayıt neden önemli?"
      />
      <details className="rounded-[12px] border border-border-soft bg-bg-elevated/60 px-3.5 py-2.5">
        <summary className="cursor-pointer text-[13px] font-medium text-text-secondary">Ayrıntı ve kaynak ekle</summary>
        <div className="mt-3 space-y-3">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Hikâye, tarihsel bağlam veya aktarım"
          />
          <Input
            value={sourceNote}
            onChange={(event) => setSourceNote(event.target.value)}
            placeholder="Kaynak, kişi veya eser"
          />
        </div>
      </details>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <Button type="submit" disabled={busy || !title.trim()} className="w-full">
        {busy ? "Kaydediliyor…" : "Kayıt oluştur"}
      </Button>
    </form>
  );
}
