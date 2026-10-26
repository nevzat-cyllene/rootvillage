"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button, Input, Textarea } from "@/components/ui";
import { clearAuthDraft, loadAuthDraft, saveAuthDraft } from "@/lib/auth-draft";
import { heritageTypeMeta } from "@/lib/heritage";
import { createClient } from "@/lib/supabase/client";
import { heritageEntryTypes, type HeritageEntryType } from "@/lib/types";
import { slugify } from "@/lib/utils";

const DRAFT_KEY = "create-heritage";

type HeritageDraft = {
  entryType: HeritageEntryType;
  title: string;
  titleTr: string;
  locationText: string;
  summary: string;
  content: string;
  sourceNote: string;
};

export function CreateHeritageEntryForm() {
  const { user, requireAuth } = useAuth();
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
  const [restoredNotice, setRestoredNotice] = useState(false);
  const resumed = useRef(false);

  useEffect(() => {
    const draft = loadAuthDraft<HeritageDraft>(DRAFT_KEY);
    if (!draft) return;
    setEntryType(draft.data.entryType ?? "region");
    setTitle(draft.data.title ?? "");
    setTitleTr(draft.data.titleTr ?? "");
    setLocationText(draft.data.locationText ?? "");
    setSummary(draft.data.summary ?? "");
    setContent(draft.data.content ?? "");
    setSourceNote(draft.data.sourceNote ?? "");
    setRestoredNotice(true);
  }, []);

  useEffect(() => {
    if (!user || resumed.current) return;
    const draft = loadAuthDraft<HeritageDraft>(DRAFT_KEY);
    if (!draft?.resumeSubmit) return;
    resumed.current = true;
    clearAuthDraft(DRAFT_KEY);
    void performSubmit(draft.data);
  }, [user]);

  async function performSubmit(data: HeritageDraft) {
    if (!data.title.trim()) return;

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

    const base = slugify(data.title) || "kayit";
    let slug = base;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: row, error: insertError } = await supabase
        .from("heritage_entries")
        .insert({
          entry_type: data.entryType,
          title: data.title.trim(),
          title_tr: data.titleTr.trim() || null,
          slug,
          location_text: data.locationText.trim() || null,
          summary: data.summary.trim() || null,
          content: data.content.trim() || null,
          source_note: data.sourceNote.trim() || null,
          created_by: u.id,
        })
        .select("slug")
        .single();

      if (!insertError && row) {
        clearAuthDraft(DRAFT_KEY);
        router.push(`/archive/${row.slug}`);
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

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const data: HeritageDraft = {
      entryType,
      title,
      titleTr,
      locationText,
      summary,
      content,
      sourceNote,
    };
    saveAuthDraft(DRAFT_KEY, data, true);
    const ok = await requireAuth();
    if (!ok) return;
    clearAuthDraft(DRAFT_KEY);
    await performSubmit(data);
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
      {restoredNotice && (
        <p className="rounded-[12px] bg-[#EAF4F1] px-3 py-2 text-[12px] font-medium text-[#286F61]">
          Girişten önce yazdığın bilgiler geri yüklendi.
        </p>
      )}
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
