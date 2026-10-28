"use client";

import { Button, EmptyState, Surface } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { EditProposal } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminProposals({ proposals }: { proposals: EditProposal[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function resolve(proposal: EditProposal, accept: boolean) {
    setBusyId(proposal.id);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusyId(null);
      return;
    }

    if (accept && proposal.action === "delete") {
      const now = new Date().toISOString();
      if (proposal.target_type === "family") {
        await supabase
          .from("people")
          .update({ deleted_at: now })
          .eq("family_id", proposal.target_id)
          .is("deleted_at", null);
        await supabase.from("families").update({ deleted_at: now }).eq("id", proposal.target_id);
      } else {
        const table =
          proposal.target_type === "village"
            ? "villages"
            : proposal.target_type === "person"
              ? "people"
              : "person_relations";
        await supabase.from(table).update({ deleted_at: now }).eq("id", proposal.target_id);
      }
    }

    if (accept && proposal.action === "update" && proposal.payload) {
      const table =
        proposal.target_type === "village"
          ? "villages"
          : proposal.target_type === "family"
            ? "families"
            : "people";
      const allowedFields = proposal.target_type === "person"
        ? ["full_name", "birth_year", "death_year", "gender", "notes", "avatar_url", "generation"]
        : proposal.target_type === "family"
          ? ["name", "aka", "notes", "is_incomplete", "disputed", "founder_person_id"]
          : ["name", "name_tr", "description"];
      const safePayload = Object.fromEntries(
        Object.entries(proposal.payload).filter(([key]) => allowedFields.includes(key)),
      );
      if (Object.keys(safePayload).length > 0) {
        await supabase.from(table).update(safePayload).eq("id", proposal.target_id);
      }
    }

    await supabase
      .from("edit_proposals")
      .update({
        status: accept ? "accepted" : "rejected",
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", proposal.id);

    setBusyId(null);
    router.refresh();
  }

  if (proposals.length === 0) {
    return (
      <EmptyState
        title="Bekleyen öneri yok"
        description="Üyeler silme veya düzeltme önerdiğinde burada görünür."
      />
    );
  }

  return (
    <ul className="stagger space-y-3">
      {proposals.map((p) => (
        <li key={p.id}>
          <Surface>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-semibold tracking-[-0.02em]">
                  {p.action === "delete" ? "Silme" : "Güncelleme"} ·{" "}
                  {p.target_type === "family"
                    ? "aile"
                    : p.target_type === "person"
                      ? "kişi"
                      : p.target_type === "village"
                        ? "köy"
                        : p.target_type}
                  {typeof p.payload?.name === "string" ? ` · ${p.payload.name}` : ""}
                </p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  {p.reason ?? "Gerekçe yok"} · {relativeTime(p.created_at)}
                </p>
                <p className="mt-2 font-mono text-[12px] text-text-tertiary">{p.target_id}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={busyId === p.id}
                  onClick={() => void resolve(p, true)}
                >
                  Onayla
                </Button>
                <Button
                  variant="secondary"
                  disabled={busyId === p.id}
                  onClick={() => void resolve(p, false)}
                >
                  Reddet
                </Button>
              </div>
            </div>
          </Surface>
        </li>
      ))}
    </ul>
  );
}
