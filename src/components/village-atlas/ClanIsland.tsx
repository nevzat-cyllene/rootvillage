"use client";

import { Html } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type IslandData = {
  id: string;
  name: string;
  aka: string | null;
  peopleCount: number;
  incomplete: boolean;
  x: number;
  z: number;
  seed: number;
};

export function ClanIsland({
  data,
  selected,
  onSelect,
  onDragEnd,
  draggable,
  onDragState,
}: {
  data: IslandData;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, z: number) => void;
  draggable: boolean;
  onDragState?: (dragging: boolean) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const dragging = useRef(false);
  const offset = useRef(new THREE.Vector3());
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const colors = useMemo(() => {
    const palettes = [
      { land: "#D8DCE2", rock: "#A8B0BA", roof: "#5B6B7C" },
      { land: "#E2E6EC", rock: "#9AA3AE", roof: "#4A5562" },
      { land: "#D0D5DC", rock: "#8E97A3", roof: "#6E7C8C" },
      { land: "#E8EBEE", rock: "#ADB5BF", roof: "#3F4A57" },
      { land: "#D5DAE1", rock: "#7A8490", roof: "#5B6B7C" },
      { land: "#DEE3E9", rock: "#9099A5", roof: "#4A5562" },
    ];
    return palettes[(data.seed - 1) % palettes.length]!;
  }, [data.seed]);

  useFrame(({ clock }) => {
    if (!group.current || dragging.current) return;
    const t = clock.elapsedTime;
    group.current.position.y = Math.sin(t * 0.7 + data.seed) * 0.06;
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

  const scale = 0.9 + Math.min(data.peopleCount, 12) * 0.045;

  return (
    <group
      ref={group}
      position={[data.x, 0, data.z]}
      scale={scale}
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
      <mesh castShadow receiveShadow position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.4, 64]} />
        <meshStandardMaterial
          color={selected || hovered ? "#F7F8FA" : colors.land}
          roughness={0.78}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.58, 64]} />
        <meshStandardMaterial color="#AEB6C0" roughness={0.95} />
      </mesh>

      <mesh position={[-0.28, 0.5, 0.08]} castShadow>
        <boxGeometry args={[0.58, 0.58, 0.48]} />
        <meshStandardMaterial color="#FAFBFC" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[-0.28, 0.86, 0.08]} castShadow>
        <coneGeometry args={[0.45, 0.38, 4]} />
        <meshStandardMaterial color={colors.roof} roughness={0.5} metalness={0.2} />
      </mesh>

      {data.seed % 2 === 0 && (
        <mesh position={[0.48, 0.42, -0.12]} castShadow>
          <boxGeometry args={[0.42, 0.42, 0.36]} />
          <meshStandardMaterial color="#F0F2F5" roughness={0.6} />
        </mesh>
      )}

      <mesh position={[0.58, 0.62, 0.48]} castShadow>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial color={colors.rock} roughness={0.85} />
      </mesh>
      <mesh position={[0.58, 0.32, 0.48]}>
        <cylinderGeometry args={[0.045, 0.055, 0.28, 10]} />
        <meshStandardMaterial color="#6E7A88" />
      </mesh>

      {(selected || hovered) && (
        <Html distanceFactor={9} position={[0, 1.45, 0]} center>
          <div className="pointer-events-none whitespace-nowrap rounded-full border border-border-soft bg-white/95 px-3 py-1 text-[12px] font-semibold tracking-[-0.02em] text-text shadow-sm backdrop-blur">
            {data.name}
            {data.incomplete ? " ·" : ""}
          </div>
        </Html>
      )}

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[1.62, 1.78, 64]} />
          <meshBasicMaterial color="#5B6B7C" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}
