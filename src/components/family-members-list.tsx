"use client";

import { EditPersonQuick } from "@/components/create-person-form";
import { PersonAvatar } from "@/components/person-avatar";
import { Badge } from "@/components/ui";
import {
  generationBadgeLabel,
  generationKinLabel,
  resolvePersonGeneration,
} from "@/lib/tree";
import type { Person, PersonRelation } from "@/lib/types";
import { cn, formatYearRange } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";

export function FamilyMembersList({
  familyId,
  familyName,
  people,
  relations,
  founderPersonId = null,
}: {
  familyId: string;
  familyName: string;
  people: Person[];
  relations: PersonRelation[];
  founderPersonId?: string | null;
}) {
  const rows = useMemo(() => {
    const memo = new Map<string, number>();
    return people
      .map((person) => {
        const generation = resolvePersonGeneration(
          person.id,
          people,
          relations,
          memo,
          founderPersonId,
        );
        return { person, generation };
      })
      .sort((a, b) => {
        if (a.generation !== b.generation) return a.generation - b.generation;
        return a.person.full_name.localeCompare(b.person.full_name, "tr");
      });
  }, [people, relations, founderPersonId]);

  const byGeneration = useMemo(() => {
    const groups = new Map<number, typeof rows>();
    for (const row of rows) {
      const list = groups.get(row.generation) ?? [];
      list.push(row);
      groups.set(row.generation, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [rows]);

  if (people.length === 0) return null;

  return (
    <section className="mb-8 animate-fade-up">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
            {familyName}
          </p>
          <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">Aile üyeleri</h2>
          <p className="mt-1 max-w-xl text-[13px] text-text-secondary">
            Nesiller ailenin kurucusundan aşağı sayılır. Kartlara tıklayarak kişiye veya ailesine gidin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {founderPersonId && (
            <Badge tone="accent">
              Kurucu: {people.find((p) => p.id === founderPersonId)?.full_name ?? "atanmış"}
            </Badge>
          )}
          <Badge>{people.length} kişi</Badge>
        </div>
      </div>

      <div className="space-y-6">
        {byGeneration.map(([generation, members]) => (
          <div key={generation}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className="rounded-full bg-[#EAF4F1] px-2.5 py-1 text-[11px] font-semibold text-[#286F61]">
                {generationKinLabel(generation)}
              </span>
              <span className="text-[12px] text-text-tertiary">{members.length} kişi</span>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {members.map(({ person, generation: gen }) => {
                const parentNames = relations
                  .filter(
                    (r) =>
                      r.relation_type === "parent" &&
                      r.person_id === person.id &&
                      people.some((p) => p.id === r.related_person_id),
                  )
                  .map((r) => people.find((p) => p.id === r.related_person_id)?.full_name)
                  .filter(Boolean);

                const otherFamily = person.family_id !== familyId;

                return (
                  <li key={person.id}>
                    <article
                      className={cn(
                        "group relative overflow-hidden rounded-[18px] border border-border-soft/90 bg-bg-surface/90 p-3.5 transition duration-200",
                        "hover:-translate-y-0.5 hover:border-[#9BC4B8]/55 hover:bg-white hover:shadow-[0_14px_36px_rgba(31,55,48,0.1)]",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <PersonAvatar
                          gender={person.gender}
                          avatarUrl={person.avatar_url}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              href={`/person/${person.id}`}
                              className="truncate text-[15px] font-semibold tracking-[-0.02em] text-text transition group-hover:text-[#1F5F52]"
                            >
                              {person.full_name}
                            </Link>
                            <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                              {generationBadgeLabel(gen)}
                            </span>
                            {person.id === founderPersonId && (
                              <span className="rounded-full bg-[#EAF4F1] px-2 py-0.5 text-[10px] font-semibold text-[#286F61]">
                                Kurucu
                              </span>
                            )}
                            {person.disputed && <Badge tone="warn">Tartışmalı</Badge>}
                          </div>
                          <p className="mt-0.5 text-[12px] text-text-secondary">
                            {formatYearRange(person.birth_year, person.death_year)}
                            {parentNames.length > 0 && ` · ebeveyn: ${parentNames.join(", ")}`}
                          </p>
                          {person.notes && (
                            <p className="mt-1 line-clamp-2 text-[12px] text-text-tertiary">
                              {person.notes}
                            </p>
                          )}
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <Link
                              href={`/person/${person.id}`}
                              className="rounded-full bg-bg-elevated px-2.5 py-1 text-[11px] font-medium text-text-secondary transition hover:bg-[#EAF4F1] hover:text-[#286F61]"
                            >
                              Kişi sayfası
                            </Link>
                            <Link
                              href={`/family/${person.family_id}`}
                              className="rounded-full bg-bg-elevated px-2.5 py-1 text-[11px] font-medium text-text-secondary transition hover:bg-[#EAF4F1] hover:text-[#286F61]"
                            >
                              {otherFamily ? "Kendi ailesine git" : "Aile kaydı"}
                            </Link>
                            <div className="ml-auto opacity-70 transition group-hover:opacity-100">
                              <EditPersonQuick person={person} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
