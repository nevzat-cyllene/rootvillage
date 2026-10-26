"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge, Button } from "@/components/ui";
import { AtlasEnvironment } from "@/components/village-atlas/AtlasEnvironment";
import { ChildCottageBloom } from "@/components/village-atlas/ChildCottageBloom";
import { ClanIsland, type IslandData } from "@/components/village-atlas/ClanIsland";
import { resolveIslandPose } from "@/lib/atlas-layout";
import { createClient } from "@/lib/supabase/client";
import type { Family } from "@/lib/types";
import { ContactShadows, Line, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

function useHdDpr() {
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  useEffect(() => {
    const cap = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 2, 3);
    setDpr([1, cap]);
  }, []);
  return [dpr, setDpr] as const;
}

const CLUSTER_COLORS = ["#2F8C78", "#4D7FC4", "#A15E93", "#C67C3D", "#6D70B8", "#598763"];

function KinshipPaths({
  islands,
  focusFamilyId,
}: {
  islands: IslandData[];
  focusFamilyId: string | null;
}) {
  const byId = new Map(islands.map((island) => [island.id, island]));

  const paths = islands.flatMap((island) =>
    island.kinshipLinks.flatMap((link) => {
      const target = byId.get(link.familyId);
      if (!target || island.id.localeCompare(target.id) >= 0) return [];
      const distance = Math.hypot(target.x - island.x, target.z - island.z);
      const lift = Math.min(1.2, 0.35 + distance * 0.035);
      const relatedToFocus =
        focusFamilyId != null &&
        (island.id === focusFamilyId || target.id === focusFamilyId);
      const color = relatedToFocus
        ? "#2F8C78"
        : island.cluster != null
          ? CLUSTER_COLORS[island.cluster % CLUSTER_COLORS.length]!
          : "#7E93A8";
      return [{
        key: `${island.id}:${target.id}`,
        points: [
          [island.x, 0.24, island.z],
          [(island.x + target.x) / 2, lift, (island.z + target.z) / 2],
          [target.x, 0.24, target.z],
        ] as Array<[number, number, number]>,
        color,
        strength: link.strength,
        relatedToFocus,
      }];
    }),
  );

  return (
    <>
      {paths.map((path) => (
        <Line
          key={path.key}
          points={path.points}
          color={path.color}
          lineWidth={
            path.relatedToFocus
              ? Math.min(5, 1.8 + path.strength)
              : Math.min(4.5, 1.2 + path.strength * 0.75)
          }
          transparent
          opacity={
            path.relatedToFocus
              ? 0.85
              : focusFamilyId
                ? 0.16
                : path.strength > 1
                  ? 0.72
                  : 0.42
          }
          dashed={!path.relatedToFocus && path.strength === 1}
          dashScale={2.2}
          dashSize={0.35}
          gapSize={0.22}
        />
      ))}
    </>
  );
}

export function VillageAtlas({
  villageId,
  villageName,
  villageAlternateName,
  families,
  fullscreen = false,
  topSlot,
}: {
  villageId: string;
  villageName?: string;
  villageAlternateName?: string | null;
  families: Family[];
  fullscreen?: boolean;
  topSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; z: number }>>({});
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [dpr, setDpr] = useHdDpr();
  const [shadowSize, setShadowSize] = useState(2048);
  const [bloomKey, setBloomKey] = useState(0);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("atlas-immersive");
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.classList.remove("atlas-immersive");
    };
  }, [fullscreen]);

  const childrenByPerson = families[0]?.children_by_person ?? {};

  const islands: IslandData[] = useMemo(
    () =>
      families.map((f, i) => {
        const pose = resolveIslandPose(f, i);
        const override = positions[f.id];
        return {
          id: f.id,
          name: f.name,
          aka: f.aka,
          peopleCount: f.people_count ?? 0,
          generationCount: f.generation_count ?? ((f.people_count ?? 0) > 0 ? 1 : 0),
          cluster: f.kinship_cluster ?? null,
          kinshipLinks: (f.kinship_links ?? []).map((link) => ({
            familyId: link.family_id,
            strength: link.strength,
          })),
          childPeople: (f.child_people ?? []).map((child) => ({
            id: child.id,
            fullName: child.full_name,
            familyId: child.family_id,
          })),
          incomplete: f.is_incomplete || (f.people_count ?? 0) === 0,
          x: override?.x ?? pose.x,
          z: override?.z ?? pose.z,
          seed: pose.seed,
        };
      }),
    [families, positions],
  );

  const selected = families.find((f) => f.id === selectedId) ?? null;
  const selectedIsland = islands.find((i) => i.id === selectedId) ?? null;

  const familyChildren = useMemo(() => {
    if (!selectedIsland) return [] as Array<{ id: string; fullName: string }>;
    return selectedIsland.childPeople.map((c) => ({
      id: c.id,
      fullName: c.fullName,
    }));
  }, [selectedIsland]);

  const grandchildBloom = useMemo(() => {
    if (!selectedIsland || !expandedChildId) return null;
    const kids = childrenByPerson[expandedChildId] ?? [];
    if (kids.length === 0) return null;

    const n = Math.max(familyChildren.length, 1);
    const idx = Math.max(
      0,
      familyChildren.findIndex((c) => c.id === expandedChildId),
    );
    const radius = 2.05 + Math.min(n, 8) * 0.18;
    const angle = (idx / n) * Math.PI * 2 - Math.PI / 2;
    return {
      origin: {
        x: selectedIsland.x + Math.cos(angle) * radius,
        z: selectedIsland.z + Math.sin(angle) * radius,
      },
      people: kids.map((k) => ({ id: k.id, fullName: k.full_name })),
    };
  }, [selectedIsland, expandedChildId, childrenByPerson, familyChildren]);

  useEffect(() => {
    setExpandedChildId(null);
    if (selectedId) setBloomKey((k) => k + 1);
  }, [selectedId]);

  useEffect(() => {
    if (expandedChildId) setBloomKey((k) => k + 1);
  }, [expandedChildId]);

  const atlasView = useMemo(() => {
    if (islands.length === 0) return { x: 0, z: 0, distance: 12 };
    const x = islands.reduce((sum, island) => sum + island.x, 0) / islands.length;
    const z = islands.reduce((sum, island) => sum + island.z, 0) / islands.length;
    const radius = Math.max(
      0,
      ...islands.map((island) => Math.hypot(island.x - x, island.z - z)),
    );
    return { x, z, distance: Math.min(30, Math.max(7.5, radius * 1.65 + 7)) };
  }, [islands]);

  async function persistPosition(id: string, x: number, z: number) {
    setPositions((prev) => ({ ...prev, [id]: { x, z } }));
    const ok = await requireAuth();
    if (!ok) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("families")
      .update({ map_x: x, map_z: z })
      .eq("id", id)
      .eq("village_id", villageId);
    if (error) console.error("map persist", error.message);
    else router.refresh();
  }

  function handleSelectFamily(id: string) {
    setSelectedId(id);
  }

  function handleSelectChild(personId: string) {
    setExpandedChildId((prev) => (prev === personId ? null : personId));
  }

  function clearSelection() {
    setSelectedId(null);
    setExpandedChildId(null);
  }

  const shellClass = fullscreen
    ? "fixed inset-0 z-[25] bg-[#E8ECF1]"
    : "relative mb-8 overflow-hidden rounded-[20px] border border-border-soft bg-[#E8ECF1]";

  const canvasWrapClass = fullscreen
    ? "atlas-touch-lock absolute inset-0 h-full w-full"
    : "atlas-touch-lock h-[min(68vh,580px)] w-full";

  const childCount = familyChildren.length;
  const expandedLabel =
    familyChildren.find((c) => c.id === expandedChildId)?.fullName ?? null;

  if (families.length === 0) {
    return (
      <div
        className={
          fullscreen
            ? "fixed inset-0 z-[25] flex items-center justify-center bg-[#E8ECF1] px-6"
            : "flex h-[min(62vh,520px)] items-center justify-center rounded-[20px] border border-dashed border-border bg-bg-elevated/60 px-6 text-center"
        }
      >
        <div className="text-center">
          {topSlot && <div className="mb-8 flex justify-center">{topSlot}</div>}
          <p className="text-[16px] font-semibold tracking-[-0.02em]">Atlas boş</p>
          <p className="mt-2 text-[13px] text-text-secondary">
            İlk aile kaydını ekleyince burada bir ada olarak görünür.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className={canvasWrapClass}>
        <Canvas
          shadows
          dpr={dpr}
          camera={{
            position: [
              atlasView.x + atlasView.distance * 0.72,
              atlasView.distance * 0.82,
              atlasView.z + atlasView.distance * 0.72,
            ],
            fov: 40,
            near: 0.1,
            far: 120,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          onPointerMissed={clearSelection}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(new THREE.Color("#E8ECF1"));
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            scene.fog = new THREE.Fog("#E8ECF1", 42, 95);
          }}
        >
          <PerformanceMonitor
            onDecline={() => {
              setDpr(([min, max]) => [min, Math.max(1.25, max - 0.35)]);
              setShadowSize(1024);
            }}
          />

          <Suspense fallback={null}>
            <AtlasEnvironment shadowMapSize={shadowSize} />
            <ContactShadows
              position={[0, 0.01, 0]}
              opacity={0.28}
              scale={48}
              blur={2.2}
              far={14}
            />
            <KinshipPaths islands={islands} focusFamilyId={selectedId} />
            {islands.map((island) => (
              <ClanIsland
                key={island.id}
                data={island}
                selected={island.id === selectedId}
                onSelect={handleSelectFamily}
                onDragEnd={(id, x, z) => void persistPosition(id, x, z)}
                draggable={Boolean(user) && !selectedId}
                onDragState={(d) => setOrbitEnabled(!d)}
                dimmed={Boolean(selectedId) && island.id !== selectedId}
              />
            ))}
            {selectedIsland && (
              <ChildCottageBloom
                key={`bloom-${selectedId}-${bloomKey}`}
                origin={{ x: selectedIsland.x, z: selectedIsland.z }}
                people={familyChildren}
                active={Boolean(selectedId)}
                expandedId={expandedChildId}
                onSelectPerson={handleSelectChild}
              />
            )}
            {grandchildBloom && (
              <ChildCottageBloom
                key={`grand-${selectedId}-${expandedChildId}-${bloomKey}`}
                origin={grandchildBloom.origin}
                people={grandchildBloom.people}
                active
                expandedId={null}
                onSelectPerson={() => {
                  /* grandchildren stay compact; expand stays on parent cottage */
                }}
              />
            )}
          </Suspense>

          <OrbitControls
            makeDefault
            enabled={orbitEnabled}
            enableDamping
            dampingFactor={0.06}
            minDistance={4}
            maxDistance={Math.max(28, atlasView.distance * 2.2)}
            maxPolarAngle={Math.PI / 2.12}
            target={
              selectedIsland
                ? [selectedIsland.x, 0.35, selectedIsland.z]
                : [atlasView.x, 0.35, atlasView.z]
            }
            touches={{
              ONE: THREE.TOUCH.PAN,
              TWO: THREE.TOUCH.DOLLY_ROTATE,
            }}
          />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <div className="pointer-events-auto flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-2">
            {topSlot}
            {villageName && (
              <div className="rounded-[16px] border border-border-soft/80 bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-xl">
                <p className="text-[14px] font-semibold tracking-[-0.02em] text-text">{villageName}</p>
                {villageAlternateName && (
                  <p className="mt-0.5 text-[11px] font-medium text-text-secondary">{villageAlternateName}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="rounded-full border border-border-soft/80 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-text-secondary backdrop-blur">
              Sürükle · döndür · yakınlaştır
              {user ? " · adayı taşı" : ""}
            </p>
            <p className="rounded-full border border-border-soft/80 bg-white/85 px-3 py-1.5 text-[11px] font-medium text-text-tertiary backdrop-blur">
              {families.length} ada · HD
            </p>
          </div>
        </div>
      </div>

      {selected && selectedIsland && (
        <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 animate-fade-up sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[340px]">
          <div className="rounded-[18px] border border-border-soft bg-bg-surface/95 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.14)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[17px] font-semibold tracking-[-0.02em]">{selected.name}</p>
                {selected.aka && (
                  <p className="mt-0.5 text-[12px] text-text-secondary">Lakap: {selected.aka}</p>
                )}
              </div>
              <button
                type="button"
                className="text-[12px] text-text-secondary hover:text-text"
                onClick={clearSelection}
              >
                Kapat
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{selected.people_count ?? 0} kişi</Badge>
              <Badge>
                {(selected.generation_count ?? 0) === 0
                  ? "Yeni ocak"
                  : `${selected.generation_count} nesil`}
              </Badge>
              {selectedIsland.incomplete && <Badge tone="accent">Eksik</Badge>}
              {selected.disputed && <Badge tone="warn">Tartışmalı</Badge>}
            </div>
            {selected.notes && (
              <p className="mt-2 line-clamp-3 text-[13px] text-text-secondary">{selected.notes}</p>
            )}
            {childCount > 0 ? (
              <p className="mt-2 rounded-[10px] bg-[#EAF4F1] px-2.5 py-2 text-[11px] font-medium text-[#286F61]">
                {expandedLabel
                  ? `${expandedLabel} seçili${
                      grandchildBloom
                        ? ` · ${grandchildBloom.people.length} çocuğu açıldı`
                        : " · tam ocak"
                    }`
                  : `Kurucunun ${childCount} çocuğu · tıklayınca büyür`}
              </p>
            ) : (
              <p className="mt-2 rounded-[10px] bg-[#F3F4F6] px-2.5 py-2 text-[11px] font-medium text-text-tertiary">
                Kurucunun çocuk kaydı yok
              </p>
            )}
            {(selected.kinship_links?.length ?? 0) > 0 && (
              <p className="mt-2 rounded-[10px] bg-[#EAF4F1] px-2.5 py-2 text-[11px] font-medium text-[#286F61]">
                {selected.kinship_links!.length} aileyle kayıtlı akrabalık yolu
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Link href={`/family/${selected.id}`} className="flex-1">
                <Button className="w-full">Aileye gir</Button>
              </Link>
              {!user && (
                <Button variant="secondary" onClick={() => void requireAuth()}>
                  Giriş
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
