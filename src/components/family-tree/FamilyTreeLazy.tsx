"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const FamilyTreeCanvas = dynamic(
  () => import("@/components/family-tree/FamilyTreeCanvas").then((m) => m.FamilyTreeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="pedigree-shell fixed inset-0 z-[25] flex items-center justify-center">
        <div className="rounded-full border border-white/80 bg-white/90 px-4 py-2 text-[13px] text-text-secondary shadow-sm backdrop-blur-xl">
          Soy ağacı yükleniyor…
        </div>
      </div>
    ),
  },
);

export function FamilyTreeLazy(props: ComponentProps<typeof FamilyTreeCanvas>) {
  return <FamilyTreeCanvas {...props} />;
}
