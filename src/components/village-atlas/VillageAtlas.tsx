"use client";

import { useAuth } from "@/components/auth-provider";
import { Badge, Button } from "@/components/ui";
import { AtlasEnvironment } from "@/components/village-atlas/AtlasEnvironment";
import { ClanIsland, type IslandData } from "@/components/village-atlas/ClanIsland";
import { resolveIslandPose } from "@/lib/atlas-layout";
import { createClient } from "@/lib/supabase/client";
import type { Family } from "@/lib/types";
import { ContactShadows, OrbitControls, PerformanceMonitor } from "@react-three/drei";
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

export function VillageAtlas({
  villageId,
  villageName,
  families,
  fullscreen = false,
  topSlot,
}: {
  villageId: string;
  villageName?: string;
  families: Family[];
  fullscreen?: boolean;
  topSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const { user, requireAuth } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; z: number }>>({});
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [dpr, setDpr] = useHdDpr();
  const [shadowSize, setShadowSize] = useState(2048);

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

  const shellClass = fullscreen
    ? "fixed inset-0 z-[25] bg-[#E8ECF1]"
    : "relative mb-8 overflow-hidden rounded-[20px] border border-border-soft bg-[#E8ECF1]";

  const canvasWrapClass = fullscreen
    ? "atlas-touch-lock absolute inset-0 h-full w-full"
    : "atlas-touch-lock h-[min(68vh,580px)] w-full";

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
          camera={{ position: [14, 16, 14], fov: 40, near: 0.1, far: 120 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          onPointerMissed={() => setSelectedId(null)}
          onCreated={({ gl, scene }) => {
            gl.setClearColor(new THREE.Color("#E8ECF1"));
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            // Far fog so zoom stays sharp up close
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
            {islands.map((island) => (
              <ClanIsland
                key={island.id}
                data={island}
                selected={island.id === selectedId}
                onSelect={setSelectedId}
                onDragEnd={(id, x, z) => void persistPosition(id, x, z)}
                draggable={Boolean(user)}
                onDragState={(d) => setOrbitEnabled(!d)}
              />
            ))}
          </Suspense>

          <OrbitControls
            makeDefault
            enabled={orbitEnabled}
            enableDamping
            dampingFactor={0.06}
            minDistance={4}
            maxDistance={48}
            maxPolarAngle={Math.PI / 2.12}
            target={[0, 0.2, 0]}
            touches={{
              ONE: THREE.TOUCH.PAN,
              TWO: THREE.TOUCH.DOLLY_ROTATE,
            }}
          />
        </Canvas>
      </div>

      {/* Floating chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        <div className="pointer-events-auto flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-2">
            {topSlot}
            {villageName && (
              <p className="rounded-full border border-border-soft/80 bg-white/90 px-3.5 py-1.5 text-[14px] font-semibold tracking-[-0.02em] text-text shadow-sm backdrop-blur-xl">
                {villageName}
              </p>
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
                onClick={() => setSelectedId(null)}
              >
                Kapat
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{selected.people_count ?? 0} kişi</Badge>
              {selectedIsland.incomplete && <Badge tone="accent">Eksik</Badge>}
              {selected.disputed && <Badge tone="warn">Tartışmalı</Badge>}
            </div>
            {selected.notes && (
              <p className="mt-2 line-clamp-3 text-[13px] text-text-secondary">{selected.notes}</p>
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
