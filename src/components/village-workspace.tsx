"use client";

import { CreateFamilyForm } from "@/components/create-family-form";
import { VillageAtlasLazy } from "@/components/village-atlas/VillageAtlasLazy";
import { Badge, EmptyState, Surface } from "@/components/ui";
import type { Family } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

type Tab = "atlas" | "list";

export function VillageWorkspace({
  villageId,
  villageName,
  families,
}: {
  villageId: string;
  villageName: string;
  families: Family[];
}) {
  const [tab, setTab] = useState<Tab>("atlas");

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
    </div>
  );

  if (tab === "atlas") {
    return (
      <VillageAtlasLazy
        villageId={villageId}
        villageName={villageName}
        families={families}
        fullscreen
        topSlot={tabs}
      />
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
                className="pressable block rounded-[var(--radius)] titanium-surface p-5"
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
    </div>
  );
}
