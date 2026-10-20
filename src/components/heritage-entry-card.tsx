import Link from "next/link";
import { Badge } from "@/components/ui";
import { heritageLabel } from "@/lib/heritage";
import type { HeritageEntry } from "@/lib/types";

export function HeritageEntryCard({ entry }: { entry: HeritageEntry }) {
  return (
    <Link
      href={`/archive/${entry.slug}`}
      className="pressable flex h-full flex-col rounded-[var(--radius)] titanium-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge tone="accent">{heritageLabel(entry.entry_type)}</Badge>
        {entry.location_text && (
          <span className="max-w-[45%] truncate text-right text-[12px] text-text-tertiary">
            {entry.location_text}
          </span>
        )}
      </div>
      <h2 className="mt-4 text-[18px] font-semibold tracking-[-0.025em] text-text">{entry.title}</h2>
      {entry.title_tr && <p className="mt-1 text-[13px] text-text-secondary">{entry.title_tr}</p>}
      <p className="mt-3 line-clamp-3 flex-1 text-[13px] leading-relaxed text-text-secondary">
        {entry.summary || entry.content || "Bu kayıt için henüz bir özet eklenmedi."}
      </p>
      {(entry.year_start || entry.year_end) && (
        <p className="mt-4 text-[12px] font-medium text-text-tertiary">
          {entry.year_start ?? "?"} — {entry.year_end ?? "?"}
        </p>
      )}
    </Link>
  );
}
