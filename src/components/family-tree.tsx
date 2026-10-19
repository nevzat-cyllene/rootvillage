"use client";

import { useAuth } from "@/components/auth-provider";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { linksForPerson, pickDefaultFocus } from "@/lib/tree";
import type { Person, PersonRelation } from "@/lib/types";
import { cn, formatYearRange } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AddRole = "parent" | "child" | "sibling" | "spouse";

export function FamilyTree({
  familyId,
  people,
  relations,
}: {
  familyId: string;
  people: Person[];
  relations: PersonRelation[];
}) {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [focusId, setFocusId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<AddRole | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pan / zoom
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => {
    if (!focusId || !people.some((p) => p.id === focusId)) {
      setFocusId(pickDefaultFocus(people));
    }
  }, [people, focusId]);

  const focus = people.find((p) => p.id === focusId) ?? null;
  const links = useMemo(
    () => (focusId ? linksForPerson(focusId, people, relations) : null),
    [focusId, people, relations],
  );

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
  }, [focusId, resetView]);

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  }

  function onPointerUp() {
    drag.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.min(1.8, Math.max(0.55, scale + (e.deltaY > 0 ? -0.08 : 0.08)));
    setScale(next);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinch.current = { dist, scale };
      drag.current = null;
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinch.current) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const next = Math.min(1.8, Math.max(0.55, pinch.current.scale * (dist / pinch.current.dist)));
      setScale(next);
    }
  }

  function onTouchEnd() {
    pinch.current = null;
  }

  async function addRelative() {
    if (!focus || !addRole || !name.trim()) return;
    const ok = await requireAuth();
    if (!ok) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    const { data: created, error: err } = await supabase
      .from("people")
      .insert({
        family_id: familyId,
        full_name: name.trim(),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (err || !created) {
      setBusy(false);
      setError(err?.message ?? "Eklenemedi");
      return;
    }

    const rels: Array<{
      person_id: string;
      related_person_id: string;
      relation_type: "parent" | "spouse";
      created_by: string;
    }> = [];

    if (addRole === "parent") {
      // created is parent of focus
      rels.push({
        person_id: focus.id,
        related_person_id: created.id,
        relation_type: "parent",
        created_by: user.id,
      });
    } else if (addRole === "child") {
      rels.push({
        person_id: created.id,
        related_person_id: focus.id,
        relation_type: "parent",
        created_by: user.id,
      });
    } else if (addRole === "sibling") {
      // same parents as focus
      const parentRels = relations.filter(
        (r) => r.person_id === focus.id && r.relation_type === "parent",
      );
      if (parentRels.length === 0) {
        // no parents yet — still create person; user can link later
      } else {
        for (const pr of parentRels) {
          rels.push({
            person_id: created.id,
            related_person_id: pr.related_person_id,
            relation_type: "parent",
            created_by: user.id,
          });
        }
      }
    } else if (addRole === "spouse") {
      rels.push({
        person_id: focus.id,
        related_person_id: created.id,
        relation_type: "spouse",
        created_by: user.id,
      });
    }

    if (rels.length) {
      await supabase.from("person_relations").insert(rels);
    }

    await supabase.from("families").update({ is_incomplete: false }).eq("id", familyId);

    setBusy(false);
    setName("");
    setAddRole(null);
    setFocusId(created.id);
    router.refresh();
  }

  if (people.length === 0) {
    return (
      <div className="mb-8 rounded-[var(--radius)] border border-dashed border-border bg-bg-surface/70 px-5 py-10 text-center">
        <p className="text-[16px] font-semibold tracking-[-0.02em]">Ağaç burada büyüyecek</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-text-secondary">
          İstediğin kişiden başla — sen, amcan, deden… Sonra yukarı (ebeveyn), aşağı (çocuk), yan
          (kardeş / eş) ekle. Atadan gelmek zorunda değilsin.
        </p>
      </div>
    );
  }

  const roleLabel: Record<AddRole, string> = {
    parent: "Ebeveyn (anne / baba / dede yönü)",
    child: "Çocuk",
    sibling: "Kardeş",
    spouse: "Eş",
  };

  return (
    <section className="mb-10 animate-fade-up">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em]">Soy ağacı</h2>
          <p className="mt-1 text-[13px] text-text-secondary">
            Ortadaki kişiye dokunup gez. Sürükle · iki parmakla yakınlaştır. Her yönden ekle.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="!py-1.5 !px-3 text-[13px]" onClick={resetView}>
            Ortala
          </Button>
          <Button
            variant="ghost"
            className="!py-1.5 !px-3 text-[13px]"
            onClick={() => setScale((s) => Math.min(1.8, s + 0.15))}
          >
            +
          </Button>
          <Button
            variant="ghost"
            className="!py-1.5 !px-3 text-[13px]"
            onClick={() => setScale((s) => Math.max(0.55, s - 0.15))}
          >
            −
          </Button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative h-[min(68vh,560px)] touch-none overflow-hidden rounded-[18px] border border-border-soft bg-[linear-gradient(180deg,#f7f7f8_0%,#fafafa_50%,#f3f4f6_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(210,210,215,0.7) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />

        <div
          className="absolute left-1/2 top-1/2 will-change-transform"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          {focus && links && (
            <div className="flex w-[320px] flex-col items-center gap-5 sm:w-[420px]">
              {/* Parents row */}
              <TreeRow label="Yukarı · ebeveynler">
                {links.parents.map((p) => (
                  <PersonNode
                    key={p.id}
                    person={p}
                    onSelect={() => setFocusId(p.id)}
                    tone="up"
                  />
                ))}
                <AddNode label="+ Ebeveyn" onClick={() => setAddRole("parent")} />
              </TreeRow>

              <Connector />

              {/* Focus + side */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                    Yan · kardeş
                  </span>
                  <div className="flex flex-col gap-2">
                    {links.siblings.slice(0, 4).map((p) => (
                      <PersonNode
                        key={p.id}
                        person={p}
                        onSelect={() => setFocusId(p.id)}
                        tone="side"
                        compact
                      />
                    ))}
                    <AddNode label="+ Kardeş" onClick={() => setAddRole("sibling")} compact />
                  </div>
                </div>

                <PersonNode person={focus} focus onSelect={() => undefined} tone="focus" />

                <div className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                    Yan · eş
                  </span>
                  <div className="flex flex-col gap-2">
                    {links.spouses.map((p) => (
                      <PersonNode
                        key={p.id}
                        person={p}
                        onSelect={() => setFocusId(p.id)}
                        tone="side"
                        compact
                      />
                    ))}
                    <AddNode label="+ Eş" onClick={() => setAddRole("spouse")} compact />
                  </div>
                </div>
              </div>

              <Connector />

              {/* Children */}
              <TreeRow label="Aşağı · çocuklar">
                {links.children.map((p) => (
                  <PersonNode
                    key={p.id}
                    person={p}
                    onSelect={() => setFocusId(p.id)}
                    tone="down"
                  />
                ))}
                <AddNode label="+ Çocuk" onClick={() => setAddRole("child")} />
              </TreeRow>
            </div>
          )}
        </div>

        <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-text-secondary">
          Odak: {focus?.full_name ?? "—"} · dokunarak dallara geç
        </p>
      </div>

      {focus && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
          <Link href={`/person/${focus.id}`} className="font-medium text-accent hover:underline">
            {focus.full_name} detayı →
          </Link>
          <span className="text-text-secondary">
            {formatYearRange(focus.birth_year, focus.death_year)}
          </span>
        </div>
      )}

      {addRole && (
        <div className="mt-4 rounded-[14px] border border-border-soft bg-bg-surface p-4 shadow-[var(--shadow)]">
          <p className="text-[14px] font-semibold">
            {focus?.full_name} → {roleLabel[addRole]}
          </p>
          <p className="mt-1 text-[12px] text-text-secondary">
            İsim yaz, kaydet. Ağaç o kişiyi merkeze alır — böylece yukarı/aşağı/yan büyür.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ad soyad"
              onKeyDown={(e) => {
                if (e.key === "Enter") void addRelative();
              }}
            />
            <div className="flex gap-2">
              <Button disabled={busy || !name.trim()} onClick={() => void addRelative()}>
                Ekle
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAddRole(null);
                  setName("");
                  setError(null);
                }}
              >
                Vazgeç
              </Button>
            </div>
          </div>
          {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
        </div>
      )}
    </section>
  );
}

function TreeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
        {label}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>
    </div>
  );
}

function Connector() {
  return <div className="h-6 w-px bg-gradient-to-b from-border to-steel/60" aria-hidden />;
}

function PersonNode({
  person,
  onSelect,
  focus = false,
  compact = false,
  tone,
}: {
  person: Person;
  onSelect: () => void;
  focus?: boolean;
  compact?: boolean;
  tone: "up" | "down" | "side" | "focus";
}) {
  return (
    <button
      type="button"
      data-node
      onClick={onSelect}
      className={cn(
        "pressable rounded-[14px] border text-left transition-shadow",
        compact ? "min-w-[100px] px-2.5 py-2" : "min-w-[124px] px-3 py-2.5",
        focus
          ? "border-text bg-text text-white shadow-[0_8px_28px_rgba(29,29,31,0.18)]"
          : "border-border-soft bg-bg-surface text-text shadow-[var(--shadow)] hover:border-border",
        tone === "up" && !focus && "border-t-2 border-t-accent/40",
        tone === "down" && !focus && "border-b-2 border-b-accent/40",
      )}
    >
      <p className={cn("font-semibold tracking-[-0.02em]", compact ? "text-[12px]" : "text-[13px]")}>
        {person.full_name}
      </p>
      {!compact && (
        <p className={cn("mt-0.5 text-[11px]", focus ? "text-white/70" : "text-text-secondary")}>
          {formatYearRange(person.birth_year, person.death_year)}
        </p>
      )}
    </button>
  );
}

function AddNode({
  label,
  onClick,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      data-node
      onClick={onClick}
      className={cn(
        "pressable rounded-[14px] border border-dashed border-border bg-white/70 text-text-secondary hover:border-accent hover:text-text",
        compact ? "min-w-[100px] px-2.5 py-2 text-[11px]" : "min-w-[110px] px-3 py-2.5 text-[12px]",
        "font-medium",
      )}
    >
      {label}
    </button>
  );
}
