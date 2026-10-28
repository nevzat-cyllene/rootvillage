"use client";

import { useAuth } from "@/components/auth-provider";
import { Button, EmptyState, Input, Surface, Textarea } from "@/components/ui";
import { clearAuthDraft, loadAuthDraft, saveAuthDraft } from "@/lib/auth-draft";
import { createClient } from "@/lib/supabase/client";
import type { Comment, CommentTarget } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function CommentsPanel({
  targetType,
  targetId,
  initialComments,
  title = "Notlar",
  description = "Düzeltme, bağlam veya dönem bilgisi ekleyin.",
  placeholder,
}: {
  targetType: CommentTarget;
  targetId: string;
  initialComments: Comment[];
  title?: string;
  description?: string;
  placeholder?: string;
}) {
  const draftKey = `comment:${targetType}:${targetId}`;
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumed = useRef(false);

  useEffect(() => {
    const draft = loadAuthDraft<{ body: string }>(draftKey);
    if (draft?.data.body) setBody(draft.data.body);
  }, [draftKey]);

  useEffect(() => {
    if (!user || resumed.current) return;
    const draft = loadAuthDraft<{ body: string }>(draftKey);
    if (!draft?.resumeSubmit || !draft.data.body.trim()) return;
    resumed.current = true;
    clearAuthDraft(draftKey);
    void postComment(draft.data.body);
  }, [user, draftKey]);

  async function postComment(text: string) {
    if (!text.trim()) return;
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

    const { error: err } = await supabase.from("comments").insert({
      target_type: targetType,
      target_id: targetId,
      body: text.trim(),
      author_id: u.id,
    });

    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    clearAuthDraft(draftKey);
    setBody("");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    saveAuthDraft(draftKey, { body }, true);
    const ok = await requireAuth();
    if (!ok) return;
    clearAuthDraft(draftKey);
    await postComment(body);
  }

  return (
    <section className="mt-10 animate-fade-up">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em]">{title}</h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            {description}
          </p>
        </div>
      </div>

      <Surface className="mb-4">
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              placeholder ??
              (user
                ? "Örn: Bu aile 1950’lerde X mahallesinde otururdu…"
                : "Kısa bir not veya düzeltme bırak…")
            }
          />
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !body.trim()}>
              Yorum ekle
            </Button>
          </div>
        </form>
      </Surface>

      {initialComments.length === 0 ? (
        <EmptyState
          title="Henüz not yok"
          description="Bu kayıt için ilk notu ekleyebilirsiniz."
        />
      ) : (
        <ul className="stagger space-y-3">
          {initialComments.map((c) => (
            <li key={c.id} className="rounded-[14px] border border-border-soft bg-bg-surface px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium">
                  {c.author?.display_name ?? "Üye"}
                </p>
                <p className="text-[12px] text-text-secondary">{relativeTime(c.created_at)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-text">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DisputeToggle({
  table,
  id,
  disputed,
}: {
  table: "families" | "people";
  id: string;
  disputed: boolean;
}) {
  const { requireAuth } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const ok = await requireAuth();
    if (!ok) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from(table).update({ disputed: !disputed }).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <Button variant={disputed ? "danger" : "secondary"} disabled={busy} onClick={() => void toggle()}>
      {disputed ? "Tartışmalı işaretini kaldır" : "Bilgi tartışmalı"}
    </Button>
  );
}

export function SoftDeleteButton({
  table,
  id,
  displayName,
  label,
  compact = false,
  className,
  onDone,
}: {
  table: "villages" | "families" | "people";
  id: string;
  /** Shown in confirm copy and stored on delete proposals for admin review. */
  displayName?: string;
  label?: string;
  /** Smaller chip trigger for atlas / list cards. */
  compact?: boolean;
  className?: string;
  onDone?: (mode: "deleted" | "proposed") => void;
}) {
  const { user, profile, requireAuth } = useAuth();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isAdmin = profile?.role === "admin";
  const entity =
    table === "villages" ? "köy" : table === "families" ? "aile" : "kişi";
  const triggerLabel =
    label ?? (isAdmin ? `${entity === "aile" ? "Aileyi" : entity === "kişi" ? "Kişiyi" : "Köyü"} sil` : "Silme öner");

  async function run() {
    const ok = await requireAuth();
    if (!ok) return;

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (!u) {
      setBusy(false);
      return;
    }

    const now = new Date().toISOString();

    // Admins soft-delete immediately; members create a proposal for admin approval.
    if (isAdmin) {
      if (table === "families") {
        await supabase
          .from("people")
          .update({ deleted_at: now })
          .eq("family_id", id)
          .is("deleted_at", null);
      }
      await supabase.from(table).update({ deleted_at: now }).eq("id", id);
      setBusy(false);
      setOpen(false);
      onDone?.("deleted");
      router.refresh();
      return;
    }

    await supabase.from("edit_proposals").insert({
      target_type: table === "villages" ? "village" : table === "families" ? "family" : "person",
      target_id: id,
      action: "delete",
      payload: displayName ? { name: displayName } : null,
      reason: reason.trim() || (displayName ? `${displayName} silme önerisi` : "Silme önerisi"),
      proposed_by: u.id,
    });

    setBusy(false);
    setOpen(false);
    onDone?.("proposed");
    router.refresh();
  }

  if (!open) {
    if (compact) {
      return (
        <button
          type="button"
          className={
            className ??
            "rounded-full border border-danger/25 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-danger shadow-sm backdrop-blur hover:bg-danger/10"
          }
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void (user ? setOpen(true) : requireAuth());
          }}
        >
          {triggerLabel}
        </button>
      );
    }
    return (
      <Button
        variant="ghost"
        className={className}
        onClick={() => void (user ? setOpen(true) : requireAuth())}
      >
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div
      className="flex min-w-[220px] flex-col gap-2 rounded-[12px] border border-border-soft bg-bg-elevated p-3 shadow-lg"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <p className="text-[12px] leading-snug text-text-secondary">
        {isAdmin
          ? `${displayName ? `“${displayName}”` : `Bu ${entity}`} kalıcı olarak listeden kalkar.`
          : `Admin onayından sonra ${displayName ? `“${displayName}”` : `bu ${entity}`} silinir.`}
      </p>
      {!isAdmin && (
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Neden kaldırılmalı?"
        />
      )}
      <div className="flex gap-2">
        <Button variant="danger" disabled={busy} onClick={() => void run()}>
          {isAdmin ? "Sil" : "Öneri gönder"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
