"use client";

import { PersonAvatar } from "@/components/person-avatar";
import type { LayoutCard } from "@/lib/pedigree/layout";
import type { Person } from "@/lib/types";
import { cn, formatYearRange } from "@/lib/utils";
import { memo } from "react";

export type CardTone = "male" | "female" | "neutral";

export function toneOf(gender: Person["gender"]): CardTone {
  if (gender === "male") return "male";
  if (gender === "female") return "female";
  return "neutral";
}

function generationChip(generation: number): string {
  if (generation <= 0) return "Üst soy";
  if (generation === 1) return "1. nesil";
  return `${generation}. nesil`;
}

export const PersonCard = memo(function PersonCard({
  card,
  person,
  kinLabel,
  selected,
  dimmed,
  dropTarget,
  dragging,
  dragOffset,
  readOnly,
  onPointerDown,
  onSelect,
  onJumpToPrimary,
}: {
  card: LayoutCard;
  person: Person;
  kinLabel: string | null;
  selected: boolean;
  dimmed: boolean;
  dropTarget: boolean;
  dragging: boolean;
  dragOffset: { dx: number; dy: number } | null;
  readOnly: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onSelect: (key: string) => void;
  onJumpToPrimary?: (personId: string) => void;
}) {
  const tone = toneOf(person.gender);
  const deceased = person.death_year != null;

  return (
    <div
      data-card={card.key}
      data-no-pan
      role="button"
      tabIndex={-1}
      aria-label={person.full_name}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      onClick={(event) => {
        event.stopPropagation();
        if (dragging) return;
        onSelect(card.key);
      }}
      className={cn(
        "pedigree-card group absolute select-none rounded-[20px] border text-center transition-[box-shadow,transform,opacity] duration-200",
        `pedigree-card-${tone}`,
        card.ghost && "pedigree-card-ghost",
        selected && "pedigree-card-selected",
        dimmed && "opacity-35",
        dropTarget && "pedigree-card-drop",
        dragging && "pedigree-card-dragging",
        !readOnly && !card.ghost && "cursor-grab active:cursor-grabbing",
      )}
      style={{
        left: card.x,
        top: card.y,
        width: card.w,
        height: card.h,
        transform: dragOffset ? `translate(${dragOffset.dx}px, ${dragOffset.dy}px) scale(1.04)` : undefined,
        zIndex: dragging ? 30 : selected ? 20 : undefined,
      }}
    >
      <div className="pedigree-card-stripe" aria-hidden />
      <div className="flex h-full flex-col items-center px-3 pb-2.5 pt-3.5">
        <div className="relative">
          <PersonAvatar person={person} size="lg" />
          <span
            className={cn(
              "pedigree-gender-badge absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[12px] font-bold shadow-sm",
              tone === "male" && "bg-[var(--gender-male)] text-white",
              tone === "female" && "bg-[var(--gender-female)] text-white",
              tone === "neutral" && "bg-[#8A96A3] text-white",
            )}
            aria-hidden
          >
            {tone === "male" ? "♂" : tone === "female" ? "♀" : "•"}
          </span>
        </div>
        <p className="mt-2.5 line-clamp-2 min-h-[36px] text-[14px] font-semibold leading-[18px] tracking-[-0.02em] text-text">
          {person.full_name}
        </p>
        <p className={cn("mt-0.5 text-[11px] tabular-nums", deceased ? "text-text-secondary" : "text-text-tertiary")}>
          {formatYearRange(person.birth_year, person.death_year)}
        </p>
        <div className="mt-auto flex w-full flex-col items-center gap-1">
          {kinLabel ? (
            <span className="pedigree-kin-chip max-w-full truncate rounded-full px-2.5 py-[3px] text-[11px] font-semibold">
              {kinLabel}
            </span>
          ) : (
            <span className="h-[21px]" />
          )}
          <div className="flex items-center gap-1">
            {card.isFounder && (
              <span className="rounded-full bg-[#EAF4F1] px-2 py-[2px] text-[10px] font-semibold text-[#286F61]">
                Kurucu
              </span>
            )}
            <span className="rounded-full bg-black/[0.045] px-2 py-[2px] text-[10px] font-medium text-text-secondary">
              {generationChip(card.generation)}
            </span>
            {person.disputed && (
              <span className="rounded-full bg-[#FFF1D6] px-2 py-[2px] text-[10px] font-semibold text-[#9A5B00]">
                Tartışmalı
              </span>
            )}
          </div>
        </div>
      </div>
      {card.ghost && onJumpToPrimary && (
        <button
          type="button"
          data-no-pan
          onClick={(event) => {
            event.stopPropagation();
            onJumpToPrimary(person.id);
          }}
          className="pedigree-ghost-jump absolute inset-x-3 -bottom-3 rounded-full border border-white bg-white px-2 py-1 text-[10px] font-semibold text-text-secondary shadow-sm transition hover:text-text"
        >
          Kendi ağacına git ↗
        </button>
      )}
    </div>
  );
});
