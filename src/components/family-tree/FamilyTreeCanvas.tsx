"use client";

import { useAuth } from "@/components/auth-provider";
import { PersonAvatar } from "@/components/person-avatar";
import { PersonCard } from "@/components/family-tree/PersonCard";
import { useTreeEditor } from "@/components/family-tree/TreeEditor";
import { TreeToolbar, ZoomControls } from "@/components/family-tree/TreeToolbar";
import { usePanZoom } from "@/components/family-tree/use-pan-zoom";
import { childrenOf, parentsOf, spousesOf } from "@/lib/pedigree/graph";
import { kinshipLabels } from "@/lib/pedigree/kinship";
import { layoutVillage, type LayoutCard } from "@/lib/pedigree/layout";
import { planLink, ROLE_LABEL, type AddRole } from "@/lib/pedigree/mutations";
import { buildSampleTree, isSampleId } from "@/lib/pedigree/sample-tree";
import type { Family, Person, PersonRelation } from "@/lib/types";
import { cn, formatYearRange } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TOOLBAR_INSET = 150;
const BOTTOM_INSET = 110;
const DRAG_THRESHOLD = 7;

type DragState = { key: string; personId: string; dx: number; dy: number; overKey: string | null };
type DropMenu = { sourceId: string; targetId: string; x: number; y: number };

export function FamilyTreeCanvas({
  villageId,
  villageName,
  villageAlternateName,
  families,
  people,
  relations,
  canEdit,
  topSlot,
  fullscreen = true,
}: {
  villageId: string;
  villageName?: string;
  villageAlternateName?: string | null;
  families: Family[];
  people: Person[];
  relations: PersonRelation[];
  canEdit: boolean;
  topSlot?: React.ReactNode;
  fullscreen?: boolean;
}) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  /* ------------------------------------------------------------ data */
  const [liveFamilies, setFamilies] = useState(families);
  const [livePeople, setPeople] = useState(people);
  const [liveRelations, setRelations] = useState(relations);
  useEffect(() => setFamilies(families), [families]);
  useEffect(() => setPeople(people), [people]);
  useEffect(() => setRelations(relations), [relations]);

  // Sample preview only for a truly empty village — never after real people
  // existed (otherwise deleting the last person resurrects the sample tree).
  const [allowSample, setAllowSample] = useState(() => people.length === 0);
  useEffect(() => {
    if (people.length > 0) setAllowSample(false);
  }, [people.length]);
  const sampleMode = allowSample && livePeople.length === 0;
  const display = useMemo(() => {
    if (!sampleMode) return { families: liveFamilies, people: livePeople, relations: liveRelations };
    const sample = buildSampleTree(villageId);
    return {
      families: [...sample.families, ...liveFamilies],
      people: sample.people,
      relations: sample.relations,
    };
  }, [liveFamilies, livePeople, liveRelations, sampleMode, villageId]);

  const layout = useMemo(
    () => layoutVillage(display.families, display.people, display.relations),
    [display],
  );

  /* ------------------------------------------------------- selection */
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedEmptyFamilyId, setSelectedEmptyFamilyId] = useState<string | null>(null);
  const selectedCard = selectedKey ? layout.cardByKey.get(selectedKey) ?? null : null;
  const selectedPerson = selectedCard ? layout.graph.people.get(selectedCard.personId) ?? null : null;
  const selectedEmptyFamily = selectedEmptyFamilyId
    ? display.families.find((f) => f.id === selectedEmptyFamilyId) ?? null
    : null;
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(null);

  const [referenceId, setReferenceId] = useState<string | null>(null);
  useEffect(() => {
    if (referenceId && layout.graph.people.has(referenceId)) return;
    const firstFrame = layout.frames.find((f) => layout.cards.some((c) => c.familyId === f.familyId));
    const family = display.families.find((f) => f.id === firstFrame?.familyId);
    const founder = family?.founder_person_id && layout.graph.people.has(family.founder_person_id)
      ? family.founder_person_id
      : layout.cards.find((c) => !c.ghost)?.personId ?? null;
    setReferenceId(founder);
  }, [display.families, layout, referenceId]);

  const labels = useMemo(() => kinshipLabels(referenceId, layout.graph), [referenceId, layout.graph]);

  /* -------------------------------------------------------- pan/zoom */
  const containerRef = useRef<HTMLDivElement>(null);
  const { transform, fitTo, zoomBy, toCanvas, handlers, lastGestureMovedRef } = usePanZoom(containerRef);
  /** Toolbar stacks on narrow screens; measure it instead of guessing. */
  const toolbarInset = useCallback(() => {
    const toolbar = containerRef.current?.parentElement?.querySelector<HTMLElement>(".pedigree-toolbar");
    return toolbar ? toolbar.offsetHeight + 8 : TOOLBAR_INSET;
  }, []);
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    const signature = `${villageId}:${sampleMode}`;
    if (fittedFor.current === signature) return;
    const raf = requestAnimationFrame(() => {
      fittedFor.current = signature;
      fitTo(layout.bounds, { padding: 40, maxK: 0.9, animate: false, topInset: toolbarInset(), bottomInset: sampleMode ? 120 : 24 });
    });
    return () => cancelAnimationFrame(raf);
  }, [fitTo, layout.bounds, sampleMode, toolbarInset, villageId]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("tree-immersive");
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.classList.remove("tree-immersive");
    };
  }, [fullscreen]);

  // Plain functions: the React Compiler memoizes these; manual useCallback
  // deps conflicted with its inference.
  const focusFamily = (familyId: string) => {
    const frame = layout.frames.find((f) => f.familyId === familyId);
    if (!frame) return;
    setActiveFamilyId(familyId);
    fitTo(frame, { padding: 48, maxK: 1, topInset: toolbarInset(), bottomInset: 24 });
  };

  const flyToCard = (card: LayoutCard) => {
    fitTo(
      { x: card.x - 260, y: card.y - 180, w: card.w + 520, h: card.h + 360 },
      { padding: 0, maxK: 1, topInset: toolbarInset(), bottomInset: BOTTOM_INSET },
    );
  };

  const selectPerson = (personId: string, fly = true) => {
    const key = layout.primaryCardByPerson.get(personId);
    if (!key) return;
    setSelectedEmptyFamilyId(null);
    setSelectedKey(key);
    const card = layout.cardByKey.get(key);
    if (card) {
      setActiveFamilyId(card.familyId);
      if (fly) flyToCard(card);
    }
  };

  const selectEmptyFamily = (familyId: string) => {
    setSelectedKey(null);
    setSelectedEmptyFamilyId(familyId);
    setActiveFamilyId(familyId);
    focusFamily(familyId);
    containerRef.current?.focus({ preventScroll: true });
  };

  /* ---------------------------------------------------------- editor */
  const editor = useTreeEditor({
    villageId,
    families: liveFamilies,
    people: livePeople,
    relations: liveRelations,
    graph: layout.graph,
    setPeople,
    setRelations,
    setFamilies,
    onPersonCreated: (id) => {
      // Layout recomputes on next render; select after it settles.
      window.setTimeout(() => setSelectedKey(id), 0);
    },
  });
  const editable = canEdit && !sampleMode;
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ------------------------------------------------------ drag & drop */
  const dragRef = useRef<{ key: string; personId: string; startX: number; startY: number; active: boolean; pointerId: number } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropMenu, setDropMenu] = useState<DropMenu | null>(null);
  /** A finished drag also fires a click; swallow that one. */
  const suppressClick = useRef(false);

  const hitTest = useCallback(
    (clientX: number, clientY: number, excludeKey: string) => {
      const point = toCanvas(clientX, clientY);
      for (const card of layout.cards) {
        if (card.key === excludeKey || card.ghost) continue;
        if (point.x >= card.x && point.x <= card.x + card.w && point.y >= card.y && point.y <= card.y + card.h) {
          return card.key;
        }
      }
      return null;
    },
    [layout.cards, toCanvas],
  );

  const onCardPointerDown = (event: React.PointerEvent, card: LayoutCard) => {
    if (!editable || card.ghost || event.button !== 0) return;
    dragRef.current = {
      key: card.key,
      personId: card.personId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      pointerId: event.pointerId,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d) {
      const dx = event.clientX - d.startX;
      const dy = event.clientY - d.startY;
      if (!d.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        d.active = true;
        try {
          containerRef.current?.setPointerCapture(d.pointerId);
        } catch {
          /* pointer may already be gone */
        }
      }
      if (d.active) {
        const overKey = hitTest(event.clientX, event.clientY, d.key);
        setDrag({ key: d.key, personId: d.personId, dx: dx / transform.k, dy: dy / transform.k, overKey });
        return;
      }
    }
    handlers.onPointerMove(event);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d) {
      dragRef.current = null;
      if (d.active) {
        const overKey = hitTest(event.clientX, event.clientY, d.key);
        const target = overKey ? layout.cardByKey.get(overKey) : null;
        suppressClick.current = true;
        setDrag(null);
        if (target) {
          setDropMenu({ sourceId: d.personId, targetId: target.personId, x: event.clientX, y: event.clientY });
        }
        return;
      }
    }
    handlers.onPointerUp(event);
  };

  const dropOptions = useMemo(() => {
    if (!dropMenu) return [];
    const roles: AddRole[] = ["child", "parent", "spouse", "sibling"];
    const targetName = layout.graph.people.get(dropMenu.targetId)?.full_name ?? "Kişi";
    return roles.map((role) => {
      const plan = planLink({
        role,
        focusId: dropMenu.targetId,
        otherId: dropMenu.sourceId,
        relations: liveRelations,
        people: livePeople,
      });
      const verb: Record<AddRole, string> = {
        child: `${targetName} kişisinin çocuğu yap`,
        parent: `${targetName} kişisinin ebeveyni yap`,
        spouse: `${targetName} ile eş yap`,
        sibling: `${targetName} ile kardeş yap`,
      };
      return { role, label: verb[role], error: plan.error };
    });
  }, [dropMenu, layout.graph.people, livePeople, liveRelations]);

  async function applyDrop(role: AddRole) {
    if (!dropMenu) return;
    const partners = spousesOf(layout.graph, dropMenu.targetId);
    const err = await editor.linkExisting(
      role,
      dropMenu.targetId,
      dropMenu.sourceId,
      role === "child" && partners.length === 1 ? partners[0] : null,
    );
    setDropMenu(null);
    if (err) setToast(err);
    else setToast("Bağ kuruldu.");
  }

  /* -------------------------------------------------------- keyboard */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (editor.sheetOpen || dropMenu) return;
    if (event.key === "Escape") {
      setSelectedKey(null);
      return;
    }
    if (!selectedCard || !selectedPerson) return;
    const g = layout.graph;
    const pick = (ids: string[]) => {
      const id = ids.find((candidate) => layout.primaryCardByPerson.has(candidate));
      if (id) selectPerson(id);
    };
    if (event.key === "ArrowUp") {
      event.preventDefault();
      pick(parentsOf(g, selectedPerson.id));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      pick(childrenOf(g, selectedPerson.id));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const dir = event.key === "ArrowLeft" ? -1 : 1;
      const sameRow = layout.cards
        .filter((c) => c.generation === selectedCard.generation && c.key !== selectedCard.key)
        .filter((c) => (dir < 0 ? c.x < selectedCard.x : c.x > selectedCard.x))
        .sort((a, b) => (dir < 0 ? b.x - a.x : a.x - b.x));
      const next = sameRow[0];
      if (next) {
        setSelectedKey(next.key);
        flyToCard(next);
      }
    }
  };

  /* --------------------------------------------------------- render */
  const activeEdgePerson = drag?.personId ?? selectedPerson?.id ?? null;
  const selectedCards = selectedPerson ? layout.cards.filter((c) => c.personId === selectedPerson.id) : [];
  const haloVisible = editable && selectedCard && !selectedCard.ghost && !drag;

  return (
    <div
      className={cn(
        "pedigree-shell",
        fullscreen ? "fixed inset-0 z-[25]" : "relative mb-8 h-[min(72vh,680px)] overflow-hidden rounded-[20px] border border-border-soft",
      )}
    >
      <div
        ref={containerRef}
        className="pedigree-stage absolute inset-0 touch-none overflow-hidden outline-none"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(event) => {
          if (suppressClick.current || lastGestureMovedRef.current) {
            suppressClick.current = false;
            lastGestureMovedRef.current = false;
            event.stopPropagation();
          }
        }}
        onClick={() => {
          setSelectedKey(null);
          setSelectedEmptyFamilyId(null);
          setDropMenu(null);
        }}
      >
        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`, transformOrigin: "0 0" }}
        >
          {/* Family frames */}
          {layout.frames.map((frame) => {
            const family = display.families.find((f) => f.id === frame.familyId);
            const sample = isSampleId(frame.familyId);
            return (
              <div
                key={frame.familyId}
                className={cn(
                  "pedigree-frame absolute rounded-[32px] border transition-colors",
                  activeFamilyId === frame.familyId && "pedigree-frame-active",
                  sample && "pedigree-frame-sample",
                )}
                style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }}
              >
                <button
                  type="button"
                  data-no-pan
                  onClick={(event) => {
                    event.stopPropagation();
                    if (frame.placeholder) selectEmptyFamily(frame.familyId);
                    else focusFamily(frame.familyId);
                  }}
                  className="pedigree-frame-label absolute left-5 top-3 flex items-baseline gap-2 rounded-full px-3 py-1 text-left"
                >
                  <span className="text-[15px] font-semibold tracking-[-0.02em]">{frame.name} Ailesi</span>
                  {family?.aka && <span className="text-[11px] text-text-secondary">· {family.aka}</span>}
                  {sample && (
                    <span className="rounded-full bg-[#FFF1D6] px-2 py-[1px] text-[10px] font-semibold text-[#9A5B00]">
                      Örnek
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          {/* Connectors */}
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1} aria-hidden>
            {layout.edges.map((edge) => {
              const active = activeEdgePerson != null && edge.personIds.includes(activeEdgePerson);
              return (
                <path
                  key={edge.key}
                  d={edge.d}
                  className={cn(
                    "pedigree-edge",
                    `pedigree-edge-${edge.kind}`,
                    active && "pedigree-edge-active",
                    activeEdgePerson != null && !active && "pedigree-edge-muted",
                  )}
                />
              );
            })}
            {selectedCards.length > 1 &&
              selectedCards.slice(1).map((ghost) => {
                const primary = selectedCards[0]!;
                const x1 = primary.x + primary.w / 2;
                const y1 = primary.y + primary.h / 2;
                const x2 = ghost.x + ghost.w / 2;
                const y2 = ghost.y + ghost.h / 2;
                const lift = Math.min(260, Math.abs(x2 - x1) * 0.25 + 80);
                return (
                  <path
                    key={`ghostlink:${ghost.key}`}
                    d={`M ${x1} ${y1} C ${x1} ${y1 - lift}, ${x2} ${y2 - lift}, ${x2} ${y2}`}
                    className="pedigree-edge pedigree-edge-ghostlink"
                  />
                );
              })}
          </svg>

          {/* Empty-family placeholders */}
          {layout.frames.map((frame) =>
            frame.placeholder ? (
              <button
                key={`placeholder:${frame.familyId}`}
                type="button"
                data-no-pan
                onClick={(event) => {
                  event.stopPropagation();
                  selectEmptyFamily(frame.familyId);
                }}
                className={cn(
                  "pedigree-placeholder absolute flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed px-3 text-center transition",
                  selectedEmptyFamilyId === frame.familyId && "pedigree-placeholder-selected",
                )}
                style={{ left: frame.placeholder.x, top: frame.placeholder.y, width: 168, height: 196 }}
              >
                <span className="text-[13px] font-semibold text-text">{frame.name} Ailesi</span>
                <span className="mt-1 text-[11px] text-text-secondary">Henüz kişi yok</span>
                <span className="mt-3 text-[10px] font-medium text-text-tertiary">
                  {canEdit ? "Seç · kurucu ekle veya sil" : "Boş aile"}
                </span>
              </button>
            ) : null,
          )}

          {/* Cards */}
          {layout.cards.map((card) => {
            const person = layout.graph.people.get(card.personId);
            if (!person) return null;
            const isDragging = drag?.key === card.key;
            return (
              <PersonCard
                key={card.key}
                card={card}
                person={person}
                kinLabel={labels.get(card.personId) ?? null}
                selected={selectedKey === card.key}
                dimmed={false}
                dropTarget={drag?.overKey === card.key}
                dragging={isDragging}
                dragOffset={isDragging ? { dx: drag!.dx, dy: drag!.dy } : null}
                readOnly={!editable}
                onPointerDown={(event) => onCardPointerDown(event, card)}
                onSelect={(key) => {
                  setSelectedEmptyFamilyId(null);
                  setSelectedKey(key);
                  setActiveFamilyId(card.familyId);
                  containerRef.current?.focus({ preventScroll: true });
                }}
                onJumpToPrimary={(personId) => selectPerson(personId)}
              />
            );
          })}

          {/* "+" handles around the selected card */}
          {haloVisible && selectedCard && (() => {
            // Put "+ Eş" on the free side of the card (away from an existing spouse).
            const neighbourRight = layout.cards.some(
              (c) => c.householdId === selectedCard.householdId && c.key !== selectedCard.key && c.x > selectedCard.x && c.x - (selectedCard.x + selectedCard.w) < 60,
            );
            const spouseLeft = neighbourRight ? selectedCard.x - 74 : selectedCard.x + selectedCard.w + 10;
            return (
              <div data-no-pan className="hidden sm:block">
                <HaloButton
                  label="＋ Ebeveyn"
                  style={{ left: selectedCard.x + selectedCard.w / 2 - 48, top: selectedCard.y - 38 }}
                  onClick={() => editor.openAdd("parent", selectedCard.personId, selectedCard.familyId)}
                />
                <HaloButton
                  label="＋ Çocuk"
                  style={{ left: selectedCard.x - 4, top: selectedCard.y + selectedCard.h + 10 }}
                  onClick={() => editor.openAdd("child", selectedCard.personId, selectedCard.familyId)}
                />
                <HaloButton
                  label="＋ Kardeş"
                  style={{ left: selectedCard.x + selectedCard.w - 84, top: selectedCard.y + selectedCard.h + 10 }}
                  onClick={() => editor.openAdd("sibling", selectedCard.personId, selectedCard.familyId)}
                />
                <HaloButton
                  label="＋ Eş"
                  style={{ left: spouseLeft, top: selectedCard.y + selectedCard.h / 2 - 16 }}
                  onClick={() => editor.openAdd("spouse", selectedCard.personId, selectedCard.familyId)}
                />
              </div>
            );
          })()}
        </div>
      </div>

      {/* HUD */}
      <TreeToolbar
        topSlot={topSlot}
        villageName={villageName}
        villageAlternateName={villageAlternateName}
        peopleCount={livePeople.length}
        families={display.families}
        activeFamilyId={activeFamilyId}
        onFocusFamily={focusFamily}
        people={display.people}
        onPickPerson={(id) => selectPerson(id)}
        referenceId={referenceId}
        onReferenceChange={setReferenceId}
        sampleMode={sampleMode}
      />

      <div className="pointer-events-none absolute bottom-4 right-3 z-20 flex flex-col items-end gap-2 sm:right-4">
        <ZoomControls
          zoom={transform.k}
          onZoomIn={() => zoomBy(1.25)}
          onZoomOut={() => zoomBy(0.8)}
          onFit={() => {
            setActiveFamilyId(null);
            fitTo(layout.bounds, { padding: 56, maxK: 0.9, topInset: toolbarInset(), bottomInset: 24 });
          }}
        />
      </div>

      {sampleMode && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-3">
          <div className="pointer-events-auto flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-[18px] border border-[#F3D9A4] bg-[#FFF8E8]/95 px-4 py-3 text-center shadow-[0_18px_50px_rgba(120,80,0,0.14)] backdrop-blur-xl">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#6B4300]">Örnek ağaç · önizleme</p>
              <p className="text-[11px] text-[#8A5A00]">
                Bu köyde henüz kişi yok. Kart renkleri, akrabalık etiketleri ve çizgiler böyle görünür.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                disabled={editor.busy}
                onClick={() => void editor.loadSample()}
                className="pressable rounded-full bg-[#9A5B00] px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-[#7E4A00] disabled:opacity-60"
              >
                {editor.busy ? "Yükleniyor…" : "Bu örneği köye yükle"}
              </button>
            )}
          </div>
        </div>
      )}

      {selectedEmptyFamily && !sampleMode && (
        <EmptyFamilyBar
          family={selectedEmptyFamily}
          editable={editable}
          canRemove={editable}
          isAdmin={isAdmin}
          busy={editor.busy}
          onClose={() => setSelectedEmptyFamilyId(null)}
          onAddFounder={() => editor.openFounder(selectedEmptyFamily.id)}
          onRemove={async (reason) => {
            const result = await editor.removeFamily(selectedEmptyFamily.id, reason);
            if (result === "deleted") {
              setSelectedEmptyFamilyId(null);
              setToast(`“${selectedEmptyFamily.name}” ailesi silindi`);
              return null;
            }
            if (result === "proposed") {
              setToast(`Aile silme önerisi gönderildi · admin onayı bekleniyor`);
              return null;
            }
            setToast(result);
            return result;
          }}
        />
      )}

      {selectedCard && selectedPerson && !sampleMode && (
        <SelectionBar
          card={selectedCard}
          person={selectedPerson}
          kinLabel={labels.get(selectedPerson.id) ?? null}
          editable={editable}
          canRemove={editable}
          isAdmin={isAdmin}
          busy={editor.busy}
          onClose={() => setSelectedKey(null)}
          onEdit={() => editor.openEdit(selectedPerson.id)}
          onConnections={() => editor.openConnections(selectedPerson.id)}
          onAdd={(role) => editor.openAdd(role, selectedPerson.id, selectedCard.familyId)}
          onJump={() => selectPerson(selectedPerson.id)}
          onSetReference={() => setReferenceId(selectedPerson.id)}
          isReference={referenceId === selectedPerson.id}
          onRemove={async (reason) => {
            const result = await editor.removePerson(selectedPerson.id, reason);
            if (result === "deleted") {
              setSelectedKey(null);
              setToast(`“${selectedPerson.full_name}” kalıcı silindi`);
              return null;
            }
            if (result === "proposed") {
              setToast(`Silme önerisi gönderildi · admin onayı bekleniyor`);
              return null;
            }
            setToast(result);
            return result;
          }}
        />
      )}

      {selectedCard && selectedPerson && sampleMode && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-3">
          <div className="rounded-full border border-white/80 bg-white/90 px-4 py-2 text-[12px] text-text-secondary shadow-sm backdrop-blur-xl">
            <span className="font-semibold text-text">{selectedPerson.full_name}</span>
            {labels.get(selectedPerson.id) && <> · {labels.get(selectedPerson.id)}</>}
          </div>
        </div>
      )}

      {dropMenu && (
        <DropMenuPopover
          menu={dropMenu}
          sourceName={layout.graph.people.get(dropMenu.sourceId)?.full_name ?? "Kişi"}
          options={dropOptions}
          busy={editor.busy}
          onPick={(role) => void applyDrop(role)}
          onClose={() => setDropMenu(null)}
        />
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-[max(5.5rem,env(safe-area-inset-top))] z-40 flex justify-center px-3">
          <div className="rounded-full bg-[#101827]/90 px-4 py-2 text-[12px] font-medium text-white shadow-lg backdrop-blur">
            {toast}
          </div>
        </div>
      )}

      {editor.sheets}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function HaloButton({ label, style, onClick }: { label: string; style: React.CSSProperties; onClick: () => void }) {
  return (
    <button
      type="button"
      style={style}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="pedigree-halo-btn pressable absolute flex h-8 items-center whitespace-nowrap rounded-full border border-[#9FC8BD] bg-white px-3 text-[11px] font-semibold text-[#236B5B] shadow-[0_8px_22px_rgba(35,107,91,0.18)] hover:bg-[#EFF8F5]"
    >
      {label}
    </button>
  );
}

function EmptyFamilyBar({
  family,
  editable,
  canRemove,
  isAdmin,
  busy,
  onClose,
  onAddFounder,
  onRemove,
}: {
  family: Family;
  editable: boolean;
  canRemove: boolean;
  isAdmin: boolean;
  busy: boolean;
  onClose: () => void;
  onAddFounder: () => void;
  onRemove: (reason?: string) => Promise<string | null>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reason, setReason] = useState("");
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
    setReason("");
  }, [family.id]);

  async function confirm() {
    setRemoving(true);
    const err = await onRemove(reason);
    setRemoving(false);
    if (!err) setConfirmDelete(false);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      <div className="pointer-events-auto kinship-sheet-enter w-full max-w-2xl rounded-[22px] border border-white/80 bg-white/95 p-3 shadow-[0_22px_60px_rgba(20,40,60,0.22)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-dashed border-border-soft bg-bg-elevated text-[15px] font-semibold text-text-secondary">
            {family.name.slice(0, 1).toLocaleUpperCase("tr")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold tracking-[-0.02em]">{family.name} Ailesi</p>
            <p className="truncate text-[11px] text-text-secondary">Henüz kişi yok · boş ocak</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bg-elevated text-text-secondary hover:text-text"
            aria-label="Seçimi bırak"
          >
            ×
          </button>
        </div>
        {editable ? (
          <>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={onAddFounder}
                className="pressable rounded-full border border-[#9FC8BD] bg-[#EFF8F5] px-3 py-1.5 text-[11px] font-semibold text-[#236B5B] hover:bg-[#DFF1EB]"
              >
                ＋ Kurucu ekle
              </button>
              {canRemove && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="pressable rounded-full border border-border-soft bg-white px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:border-border hover:text-text"
                >
                  Sil
                </button>
              )}
            </div>
            {canRemove && confirmDelete && (
              <div className="mt-2.5 flex flex-col gap-2 rounded-[14px] border border-border-soft bg-bg-elevated/80 px-3 py-2.5">
                <p className="text-[12px] leading-snug text-text-secondary">
                  {isAdmin
                    ? `“${family.name}” ailesi kalıcı silinecek.`
                    : `“${family.name}” için silme önerisi admin onayına gider.`}
                </p>
                {!isAdmin && (
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Neden silinmeli? (isteğe bağlı)"
                    className="w-full rounded-[12px] border border-border-soft bg-white px-3 py-2 text-[13px] outline-none placeholder:text-text-tertiary focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
                  />
                )}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy || removing}
                    onClick={() => void confirm()}
                    className="pressable rounded-full bg-text px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2d2d2f] disabled:opacity-60"
                  >
                    {removing || busy ? "İşleniyor…" : isAdmin ? "Kalıcı sil" : "Öneri gönder"}
                  </button>
                  <button
                    type="button"
                    disabled={removing}
                    onClick={() => setConfirmDelete(false)}
                    className="pressable rounded-full border border-border-soft bg-white px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:text-text"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function SelectionBar({
  card,
  person,
  kinLabel,
  editable,
  canRemove,
  isAdmin,
  busy,
  isReference,
  onClose,
  onEdit,
  onConnections,
  onAdd,
  onJump,
  onSetReference,
  onRemove,
}: {
  card: LayoutCard;
  person: Person;
  kinLabel: string | null;
  editable: boolean;
  canRemove: boolean;
  isAdmin: boolean;
  busy: boolean;
  isReference: boolean;
  onClose: () => void;
  onEdit: () => void;
  onConnections: () => void;
  onAdd: (role: AddRole) => void;
  onJump: () => void;
  onSetReference: () => void;
  onRemove: (reason?: string) => Promise<string | null>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reason, setReason] = useState("");
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
    setReason("");
  }, [person.id]);

  async function confirm() {
    setRemoving(true);
    const err = await onRemove(reason);
    setRemoving(false);
    if (!err) setConfirmDelete(false);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      <div className="pointer-events-auto kinship-sheet-enter w-full max-w-2xl rounded-[22px] border border-white/80 bg-white/95 p-3 shadow-[0_22px_60px_rgba(20,40,60,0.22)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <PersonAvatar person={person} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold tracking-[-0.02em]">{person.full_name}</p>
            <p className="truncate text-[11px] text-text-secondary">
              {formatYearRange(person.birth_year, person.death_year)}
              {kinLabel ? ` · ${kinLabel}` : ""}
              {card.ghost ? " · başka ağaçtan eş" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onSetReference}
            className={cn(
              "hidden shrink-0 rounded-full border px-2.5 py-1.5 text-[11px] font-medium sm:block",
              isReference ? "border-[#236B5B] bg-[#E3F3EE] text-[#18594B]" : "border-border-soft text-text-secondary hover:text-text",
            )}
            title="Akrabalıkları bu kişiye göre göster"
          >
            {isReference ? "Referans" : "Referans yap"}
          </button>
          <Link
            href={`/person/${person.id}`}
            className="shrink-0 rounded-full border border-border-soft px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text"
          >
            Sayfa
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bg-elevated text-text-secondary hover:text-text"
            aria-label="Seçimi bırak"
          >
            ×
          </button>
        </div>
        {card.ghost ? (
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={onJump} className="pressable rounded-full bg-text px-3 py-1.5 text-[11px] font-semibold text-white">
              Kendi ağacına git ↗
            </button>
          </div>
        ) : editable ? (
          <>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(["parent", "child", "spouse", "sibling"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => onAdd(role)}
                  className="pressable rounded-full border border-[#9FC8BD] bg-[#EFF8F5] px-3 py-1.5 text-[11px] font-semibold text-[#236B5B] hover:bg-[#DFF1EB]"
                >
                  ＋ {ROLE_LABEL[role]}
                </button>
              ))}
              <span className="mx-0.5 w-px self-stretch bg-border-soft" aria-hidden />
              <button type="button" onClick={onEdit} className="pressable rounded-full bg-text px-3 py-1.5 text-[11px] font-semibold text-white">
                Düzenle
              </button>
              <button type="button" onClick={onConnections} className="pressable rounded-full border border-border-soft bg-white px-3 py-1.5 text-[11px] font-semibold text-text hover:border-border">
                Bağlar · kaldır
              </button>
              {canRemove && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="pressable rounded-full border border-border-soft bg-white px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition hover:border-border hover:text-text"
                >
                  Sil
                </button>
              )}
              <span className="ml-auto hidden self-center text-[10px] text-text-tertiary md:block">
                İpucu: kartı başka bir kartın üstüne sürükleyip bağ kur
              </span>
            </div>
            {canRemove && confirmDelete && (
              <div className="mt-2.5 flex flex-col gap-2 rounded-[14px] border border-border-soft bg-bg-elevated/80 px-3 py-2.5">
                <p className="text-[12px] leading-snug text-text-secondary">
                  {isAdmin
                    ? `“${person.full_name}” kalıcı silinecek. Bağları da gider; geri alınamaz.`
                    : `“${person.full_name}” için silme önerisi admin onayına gider.`}
                </p>
                {!isAdmin && (
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Neden silinmeli? (isteğe bağlı)"
                    className="w-full rounded-[12px] border border-border-soft bg-white px-3 py-2 text-[13px] outline-none placeholder:text-text-tertiary focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
                  />
                )}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy || removing}
                    onClick={() => void confirm()}
                    className="pressable rounded-full bg-text px-3.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#2d2d2f] disabled:opacity-60"
                  >
                    {removing || busy ? "İşleniyor…" : isAdmin ? "Kalıcı sil" : "Öneri gönder"}
                  </button>
                  <button
                    type="button"
                    disabled={removing}
                    onClick={() => setConfirmDelete(false)}
                    className="pressable rounded-full border border-border-soft bg-white px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:text-text"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function DropMenuPopover({
  menu,
  sourceName,
  options,
  busy,
  onPick,
  onClose,
}: {
  menu: DropMenu;
  sourceName: string;
  options: Array<{ role: AddRole; label: string; error: string | null }>;
  busy: boolean;
  onPick: (role: AddRole) => void;
  onClose: () => void;
}) {
  const width = 300;
  const left = Math.min(Math.max(12, menu.x - width / 2), (typeof window !== "undefined" ? window.innerWidth : 1200) - width - 12);
  const top = Math.min(menu.y + 12, (typeof window !== "undefined" ? window.innerHeight : 800) - 260);
  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} aria-hidden />
      <div
        role="menu"
        className="kinship-sheet-enter fixed z-[61] rounded-[18px] border border-white/80 bg-white/97 p-2 shadow-[0_24px_70px_rgba(20,40,60,0.28)] backdrop-blur-xl"
        style={{ left, top, width }}
      >
        <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
          {sourceName} →
        </p>
        {options.map((option) => (
          <button
            key={option.role}
            type="button"
            role="menuitem"
            disabled={busy || Boolean(option.error)}
            onClick={() => onPick(option.role)}
            title={option.error ?? undefined}
            className={cn(
              "flex w-full flex-col items-start rounded-[12px] px-2.5 py-2 text-left transition",
              option.error ? "cursor-not-allowed opacity-55" : "hover:bg-[#EFF8F5]",
            )}
          >
            <span className="text-[13px] font-semibold text-text">{option.label}</span>
            {option.error && <span className="text-[11px] text-danger">{option.error}</span>}
          </button>
        ))}
        <button type="button" onClick={onClose} className="mt-1 w-full rounded-[12px] px-2.5 py-2 text-left text-[12px] text-text-secondary hover:bg-bg-elevated">
          Vazgeç
        </button>
      </div>
    </>
  );
}
