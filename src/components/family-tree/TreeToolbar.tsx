"use client";

import { PersonAvatar } from "@/components/person-avatar";
import type { Family, Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

export function TreeToolbar({
  topSlot,
  villageName,
  villageAlternateName,
  peopleCount,
  families,
  activeFamilyId,
  onFocusFamily,
  people,
  onPickPerson,
  referenceId,
  onReferenceChange,
  sampleMode,
}: {
  topSlot?: React.ReactNode;
  villageName?: string;
  villageAlternateName?: string | null;
  peopleCount: number;
  families: Family[];
  activeFamilyId: string | null;
  onFocusFamily: (familyId: string) => void;
  people: Person[];
  onPickPerson: (personId: string) => void;
  referenceId: string | null;
  onReferenceChange: (personId: string) => void;
  sampleMode: boolean;
}) {
  return (
    <div className="pedigree-toolbar pointer-events-none absolute inset-x-0 top-0 z-20 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
      <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {topSlot}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {villageName && (
              <div className="rounded-[16px] border border-white/80 bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-xl">
                <p className="text-[14px] font-semibold tracking-[-0.02em] text-text">
                  {villageName}
                  {villageAlternateName && villageAlternateName !== villageName && (
                    <span className="ml-1.5 text-[12px] font-medium text-text-secondary">· {villageAlternateName}</span>
                  )}
                </p>
                <p className="text-[11px] text-text-secondary">
                  {families.length} aile · {peopleCount} kişi{sampleMode ? " · örnek görünüm" : ""}
                </p>
              </div>
            )}
            <FamilyChips families={families} activeFamilyId={activeFamilyId} onFocusFamily={onFocusFamily} />
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          <PersonSearch people={people} onPick={onPickPerson} />
          <ReferencePicker people={people} referenceId={referenceId} onChange={onReferenceChange} />
        </div>
      </div>
    </div>
  );
}

function FamilyChips({
  families,
  activeFamilyId,
  onFocusFamily,
}: {
  families: Family[];
  activeFamilyId: string | null;
  onFocusFamily: (familyId: string) => void;
}) {
  if (families.length === 0) return null;
  return (
    <div className="flex max-w-[min(70vw,560px)] items-center gap-1 overflow-x-auto rounded-full border border-white/80 bg-white/90 p-1 shadow-sm backdrop-blur-xl [scrollbar-width:none]">
      {families.map((family) => (
        <button
          key={family.id}
          type="button"
          onClick={() => onFocusFamily(family.id)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
            activeFamilyId === family.id ? "bg-text text-white" : "text-text-secondary hover:bg-bg-elevated hover:text-text",
          )}
        >
          {family.name}
          <span className={cn("ml-1 text-[10px]", activeFamilyId === family.id ? "text-white/70" : "text-text-tertiary")}>
            {family.people_count ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}

function PersonSearch({ people, onPick }: { people: Person[]; onPick: (personId: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("tr");
    if (!term) return [];
    return people
      .filter((person) => person.full_name.toLocaleLowerCase("tr").includes(term))
      .slice(0, 8);
  }, [people, query]);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <label className="flex h-10 items-center gap-2 rounded-full border border-white/80 bg-white/90 pl-3 pr-2 shadow-sm backdrop-blur-xl">
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="9" cy="9" r="5.5" />
          <path d="M13.5 13.5 17 17" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) {
              onPick(results[0].id);
              setOpen(false);
              setQuery("");
            }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Kişi ara…"
          className="w-[132px] bg-transparent text-[13px] outline-none placeholder:text-text-tertiary sm:w-[170px]"
        />
      </label>
      {open && results.length > 0 && (
        <ul className="absolute right-0 top-full z-30 mt-1.5 w-[260px] overflow-hidden rounded-[16px] border border-white/80 bg-white/95 p-1.5 shadow-[0_18px_50px_rgba(20,40,60,0.18)] backdrop-blur-xl">
          {results.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(person.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2.5 rounded-[11px] px-2 py-1.5 text-left hover:bg-bg-elevated"
              >
                <PersonAvatar person={person} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{person.full_name}</span>
                  <span className="block text-[11px] text-text-secondary">
                    {person.birth_year ?? "?"}{person.death_year ? ` – ${person.death_year}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReferencePicker({
  people,
  referenceId,
  onChange,
}: {
  people: Person[];
  referenceId: string | null;
  onChange: (personId: string) => void;
}) {
  if (people.length === 0) return null;
  const sorted = [...people].sort((a, b) => a.full_name.localeCompare(b.full_name, "tr"));
  return (
    <label className="kinship-focus-picker !min-h-10 !py-0" title="Akrabalık etiketleri bu kişiye göre hesaplanır">
      <span>Açısından</span>
      <select value={referenceId ?? ""} onChange={(event) => onChange(event.target.value)}>
        {sorted.map((person) => (
          <option key={person.id} value={person.id}>
            {person.full_name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onFit,
  zoom,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  zoom: number;
}) {
  return (
    <div className="pointer-events-auto flex flex-col overflow-hidden rounded-[14px] border border-white/80 bg-white/90 shadow-sm backdrop-blur-xl">
      <button type="button" onClick={onZoomIn} className="grid h-10 w-10 place-items-center text-[18px] text-text hover:bg-bg-elevated" aria-label="Yakınlaştır">
        +
      </button>
      <div className="border-t border-border-soft px-1 py-0.5 text-center text-[10px] tabular-nums text-text-tertiary">
        {Math.round(zoom * 100)}%
      </div>
      <button type="button" onClick={onZoomOut} className="grid h-10 w-10 place-items-center border-t border-border-soft text-[18px] text-text hover:bg-bg-elevated" aria-label="Uzaklaştır">
        −
      </button>
      <button type="button" onClick={onFit} className="grid h-10 w-10 place-items-center border-t border-border-soft text-text hover:bg-bg-elevated" aria-label="Sığdır" title="Tümünü sığdır">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M7 3H3v4M13 3h4v4M7 17H3v-4M13 17h4v-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
