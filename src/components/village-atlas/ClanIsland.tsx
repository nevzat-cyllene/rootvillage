"use client";

import { Html } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type IslandData = {
  id: string;
  name: string;
  aka: string | null;
  peopleCount: number;
  generationCount: number;
  cluster: number | null;
  kinshipLinks: Array<{ familyId: string; strength: number }>;
  childPeople: Array<{ id: string; fullName: string; familyId: string }>;
  incomplete: boolean;
  x: number;
  z: number;
  seed: number;
};

/** Shared settlement props: ana ev + küçük ev + ağaç + at + araba */
export function SettlementProps({
  roof = "#5B6B7C",
  compact = false,
}: {
  roof?: string;
  compact?: boolean;
}) {
  const s = compact ? 0.72 : 1;
  return (
    <group scale={s}>
      {/* Ana ev */}
      <mesh position={[-0.32, 0.5, 0.05]} castShadow>
        <boxGeometry args={[0.7, 0.62, 0.55]} />
        <meshStandardMaterial color="#FCFDFE" roughness={0.48} metalness={0.04} transparent />
      </mesh>
      <mesh position={[-0.32, 0.9, 0.05]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.54, 0.44, 4]} />
        <meshStandardMaterial color={roof} roughness={0.42} metalness={0.18} transparent />
      </mesh>
      <mesh position={[-0.31, 0.48, 0.34]}>
        <boxGeometry args={[0.16, 0.24, 0.025]} />
        <meshStandardMaterial color="#F6B85B" emissive="#F6A83D" emissiveIntensity={0.5} transparent />
      </mesh>

      {/* Küçük ev */}
      <mesh position={[0.52, 0.42, -0.12]} castShadow>
        <boxGeometry args={[0.46, 0.46, 0.4]} />
        <meshStandardMaterial color="#F3F7FA" roughness={0.54} transparent />
      </mesh>
      <mesh position={[0.52, 0.72, -0.12]} castShadow rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.36, 0.32, 4]} />
        <meshStandardMaterial color={roof} roughness={0.5} metalness={0.12} transparent />
      </mesh>

      {/* Ağaç */}
      <mesh position={[0.72, 0.58, 0.55]} castShadow>
        <sphereGeometry args={[0.22, 20, 16]} />
        <meshStandardMaterial color="#6C9278" roughness={0.8} transparent />
      </mesh>
      <mesh position={[0.72, 0.32, 0.55]}>
        <cylinderGeometry args={[0.045, 0.06, 0.36, 10]} />
        <meshStandardMaterial color="#72563F" transparent />
      </mesh>

      {/* At */}
      <group position={[-0.85, 0.34, 0.62]} rotation={[0, -0.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.18, 0.16]} />
          <meshStandardMaterial color="#8B654A" roughness={0.9} transparent />
        </mesh>
        <mesh position={[0.24, 0.12, 0]} castShadow>
          <boxGeometry args={[0.13, 0.18, 0.13]} />
          <meshStandardMaterial color="#7A563E" roughness={0.9} transparent />
        </mesh>
        {[-0.13, 0.13].flatMap((x) =>
          [-0.05, 0.05].map((z) => (
            <mesh key={`${x}:${z}`} position={[x, -0.18, z]} castShadow>
              <cylinderGeometry args={[0.016, 0.02, 0.26, 7]} />
              <meshStandardMaterial color="#5E4232" roughness={1} transparent />
            </mesh>
          )),
        )}
      </group>

      {/* Araba */}
      <group position={[-0.78, 0.28, -0.55]} rotation={[0, 0.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.44, 0.16, 0.28]} />
          <meshStandardMaterial color="#A97747" roughness={0.86} transparent />
        </mesh>
        {[-0.18, 0.18].map((x) => (
          <mesh key={x} position={[x, -0.11, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.035, 16]} />
            <meshStandardMaterial color="#4F3B31" roughness={0.95} transparent />
          </mesh>
        ))}
        <mesh position={[0.4, -0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.46, 8]} />
          <meshStandardMaterial color="#6D4D34" roughness={1} transparent />
        </mesh>
      </group>
    </group>
  );
}

export function ClanIsland({
  data,
  selected,
  onSelect,
  onDragEnd,
  draggable,
  onDragState,
  dimmed = false,
}: {
  data: IslandData;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, z: number) => void;
  draggable: boolean;
  onDragState?: (dragging: boolean) => void;
  dimmed?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const settlement = useRef<THREE.Group>(null);
  const materials = useRef<THREE.MeshStandardMaterial[]>([]);
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);
  const offset = useRef(new THREE.Vector3());
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!body.current) return;
    const mats: THREE.MeshStandardMaterial[] = [];
    body.current.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        mats.push(obj.material);
      }
    });
    materials.current = mats;
  });

  const colors = useMemo(() => {
    const palettes = [
      { land: "#D8DCE2", roof: "#5B6B7C" },
      { land: "#E2E6EC", roof: "#4A5562" },
      { land: "#D0D5DC", roof: "#6E7C8C" },
      { land: "#E8EBEE", roof: "#3F4A57" },
      { land: "#D5DAE1", roof: "#5B6B7C" },
      { land: "#DEE3E9", roof: "#4A5562" },
    ];
    const clusterPalettes = [
      { land: "#D9EBE5", roof: "#2F7969" },
      { land: "#DBE7F5", roof: "#426FA7" },
      { land: "#F0E0EC", roof: "#8D4F80" },
      { land: "#F2E5D8", roof: "#A66533" },
      { land: "#E5E3F3", roof: "#6467A4" },
      { land: "#E1EBDD", roof: "#557D50" },
    ];
    if (data.cluster != null) {
      return clusterPalettes[data.cluster % clusterPalettes.length]!;
    }
    return palettes[(data.seed - 1) % palettes.length]!;
  }, [data.seed, data.cluster]);

  const restScale = 0.9 + Math.min(data.peopleCount, 12) * 0.045;
  const stage = Math.min(data.generationCount, 3);

  useFrame(({ clock }) => {
    if (!group.current || dragging.current) return;
    const t = clock.elapsedTime;
    group.current.position.x = data.x;
    group.current.position.z = data.z;
    group.current.position.y = Math.sin(t * 0.7 + data.seed) * 0.06;
    if (body.current) body.current.scale.setScalar(restScale);

    if (settlement.current) {
      const target = selected ? 1.1 : hovered ? 1.06 : 1;
      settlement.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
      settlement.current.rotation.y = Math.sin(t * 0.32 + data.seed) * 0.025;
    }

    const opacityTarget = dimmed ? 0.35 : 1;
    for (const mat of materials.current) {
      // Three.js materials are intentionally updated frame-by-frame for this visual transition.
      // eslint-disable-next-line react-hooks/immutability
      mat.transparent = dimmed || mat.opacity < 0.99;
      mat.opacity += (opacityTarget - mat.opacity) * 0.12;
    }
  });

  function pointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onSelect(data.id);
    if (!draggable || !group.current) return;
    dragging.current = true;
    onDragState?.(true);
    offset.current.set(
      group.current.position.x - e.point.x,
      0,
      group.current.position.z - e.point.z,
    );
  }

  function pointerMove(e: ThreeEvent<PointerEvent>) {
    if (!dragging.current || !group.current) return;
    e.stopPropagation();
    e.ray.intersectPlane(plane, hit);
    group.current.position.x = hit.x + offset.current.x;
    group.current.position.z = hit.z + offset.current.z;
  }

  function pointerUp() {
    if (!dragging.current || !group.current) return;
    dragging.current = false;
    onDragState?.(false);
    onDragEnd(data.id, group.current.position.x, group.current.position.z);
  }

  return (
    <group
      ref={group}
      position={[data.x, 0, data.z]}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <group ref={body} scale={restScale}>
        <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
          <cylinderGeometry args={[1.4, 1.58, 0.24, 64]} />
          <meshStandardMaterial
            color={selected || hovered ? "#F9FCFF" : colors.land}
            roughness={0.7}
            metalness={0.12}
            transparent
          />
        </mesh>
        <mesh position={[0, -0.015, 0]}>
          <cylinderGeometry args={[1.52, 1.72, 0.16, 64]} />
          <meshStandardMaterial color="#96A3B2" roughness={0.94} transparent />
        </mesh>

        <group ref={settlement}>
          {stage === 0 ? (
            <>
              <mesh position={[0, 0.31, 0]} castShadow>
                <cylinderGeometry args={[0.48, 0.58, 0.2, 18]} />
                <meshStandardMaterial color="#D7DEE7" roughness={0.8} transparent />
              </mesh>
              <mesh position={[0, 0.5, 0]} castShadow>
                <sphereGeometry args={[0.15, 24, 18]} />
                <meshStandardMaterial
                  color="#FFB454"
                  emissive="#FF7A2F"
                  emissiveIntensity={0.8}
                  transparent
                />
              </mesh>
            </>
          ) : (
            <SettlementProps roof={colors.roof} />
          )}
        </group>

        {selected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[1.62, 1.78, 64]} />
            <meshBasicMaterial color="#5B6B7C" transparent opacity={0.5} />
          </mesh>
        )}
      </group>

      {/* Label outside body scale so the family name stays readable */}
      <Html
        position={[0, 2.15, 0]}
        center
        distanceFactor={6}
        occlude={false}
        zIndexRange={[100, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-white/80 bg-white/95 px-3.5 py-1.5 text-[13px] font-semibold tracking-[-0.02em] text-text shadow-[0_10px_28px_rgba(31,42,55,0.18)] backdrop-blur-xl">
          {data.name}
          <span className="ml-1.5 text-[10px] font-medium text-text-tertiary">
            {stage === 0 ? "temel" : `${data.generationCount} nesil`}
          </span>
        </div>
      </Html>
    </group>
  );
}
