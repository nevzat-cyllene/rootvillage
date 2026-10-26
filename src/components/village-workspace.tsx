"use client";

import { CreateFamilyForm } from "@/components/create-family-form";
import { VillageAtlasLazy } from "@/components/village-atlas/VillageAtlasLazy";
import { Badge, Button, EmptyState, Surface } from "@/components/ui";
import type { Family } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

type Tab = "atlas" | "list";

export function VillageWorkspace({
  villageId,
  villageName,
  villageTurkishName,
  families,
}: {
  villageId: string;
  villageName: string;
  villageTurkishName?: string | null;
  families: Family[];
}) {
  const [tab, setTab] = useState<Tab>("atlas");
  const [createOpen, setCreateOpen] = useState(false);

  const tabs = (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/villages"
        className="rounded-full border border-border-soft bg-white/90 px-3 py-1.5 text-[12px] font-medium text-text-secondary shadow-sm backdrop-blur-xl hover:text-text"
      >
        ← Köyler
      </Link>
      <div className="flex items-center gap-1 rounded-full border border-border-soft bg-white/90 p-1 shadow-sm backdrop-blur-xl w-fit">
        {(
          [
            { id: "atlas", label: "Atlas" },
            { id: "list", label: "Liste" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
              tab === t.id ? "bg-text text-white" : "text-text-secondary hover:text-text",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Button
        type="button"
        className="!bg-[#236B5B] !px-3.5 !py-2 text-[12px] shadow-[0_8px_24px_rgba(35,107,91,0.22)] hover:!bg-[#195849]"
        onClick={() => setCreateOpen(true)}
      >
        <span aria-hidden>＋</span> Yeni aile
      </Button>
    </div>
  );

  const createDialog = createOpen ? (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0B1220]/45 p-3 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Yeni aile ekle"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setCreateOpen(false);
      }}
    >
      <div className="kinship-sheet-enter max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_28px_90px_rgba(8,18,35,0.28)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#236B5B]">Yeni ocak</p>
            <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.04em]">Atlasa bir aile ekle</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
              Önce temel görünür. Kişiler ve nesiller bağlandıkça ev, ağaç ve yerleşke gelişir.
            </p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-bg-elevated text-lg text-text-secondary transition hover:bg-border-soft hover:text-text"
            onClick={() => setCreateOpen(false)}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <CreateFamilyForm
          villageId={villageId}
          stayOnVillage
          onCreated={() => setCreateOpen(false)}
        />
      </div>
    </div>
  ) : null;

  if (tab === "atlas") {
    return (
      <>
        <VillageAtlasLazy
          villageId={villageId}
          villageName={villageName}
          villageAlternateName={villageTurkishName}
          families={families}
          fullscreen
          topSlot={tabs}
        />
        {createDialog}
      </>
    );
  }

  return (
    <div>
      <div className="mb-5">{tabs}</div>

      {families.length === 0 ? (
        <EmptyState
          title="Henüz aile yok"
          description="İlk aile kaydını ekleyerek başlayın."
        />
      ) : (
        <ul className="stagger mb-8 grid gap-3 sm:grid-cols-2">
          {families.map((f) => (
            <li key={f.id}>
              <Link
                href={`/family/${f.id}`}
                className="group block rounded-[20px] border border-white/80 bg-[linear-gradient(145deg,#ffffff_0%,#f3f8fa_100%)] p-5 shadow-[0_10px_34px_rgba(35,62,82,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[#9FC8BD] hover:shadow-[0_20px_48px_rgba(35,96,81,0.14)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{f.name}</h3>
                    {f.aka && (
                      <p className="mt-0.5 text-[12px] text-text-secondary">Lakap: {f.aka}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge>{f.people_count ?? 0} kişi</Badge>
                    <Badge>
                      {(f.generation_count ?? 0) === 0 ? "Yeni ocak" : `${f.generation_count} nesil`}
                    </Badge>
                    {f.disputed && <Badge tone="warn">Tartışmalı</Badge>}
                    {(f.is_incomplete || (f.people_count ?? 0) === 0) && (
                      <Badge tone="accent">Eksik</Badge>
                    )}
                  </div>
                </div>
                {f.notes && (
                  <p className="mt-2 line-clamp-2 text-[13px] text-text-secondary">{f.notes}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Surface className="mb-4">
        <h2 className="mb-1 text-[18px] font-semibold tracking-[-0.02em]">Yeni aile</h2>
        <p className="mb-4 text-[13px] text-text-secondary">
          Kısa bir aile adı verin; atlas üzerinde yeni bir ada olarak görünür.
        </p>
        <CreateFamilyForm villageId={villageId} />
      </Surface>
      {createDialog}
    </div>
  );
}
