"use client";

import type { Family } from "@/lib/types";
import dynamic from "next/dynamic";

const VillageAtlas = dynamic(
  () =>
    import("@/components/village-atlas/VillageAtlas").then((m) => m.VillageAtlas),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[25] flex items-center justify-center bg-[#E8ECF1]">
        <p className="text-[13px] font-medium text-text-secondary">Atlas yükleniyor…</p>
      </div>
    ),
  },
);

export function VillageAtlasLazy({
  villageId,
  villageName,
  villageAlternateName,
  families,
  fullscreen,
  topSlot,
}: {
  villageId: string;
  villageName?: string;
  villageAlternateName?: string | null;
  families: Family[];
  fullscreen?: boolean;
  topSlot?: React.ReactNode;
}) {
  return (
    <VillageAtlas
      villageId={villageId}
      villageName={villageName}
      villageAlternateName={villageAlternateName}
      families={families}
      fullscreen={fullscreen}
      topSlot={topSlot}
    />
  );
}
