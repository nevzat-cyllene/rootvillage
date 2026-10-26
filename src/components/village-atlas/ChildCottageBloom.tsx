"use client";

import { SettlementProps } from "@/components/village-atlas/ClanIsland";
import { Html, Line } from "@react-three/drei";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type BloomChild = {
  id: string;
  fullName: string;
};

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function elasticOut(t: number) {
  if (t === 0 || t === 1) return t;
  return 2 ** (-10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return parts[0]!;
}

const ROOF_COLORS = ["#5B6B7C", "#A66533", "#2F7969", "#8D4F80", "#426FA7"];

function ParentArc({
  from,
  to,
}: {
  from: { x: number; z: number };
  to: { x: number; z: number };
}) {
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const lift = Math.min(0.9, 0.28 + distance * 0.08);
  const points: Array<[number, number, number]> = [
    [from.x, 0.22, from.z],
    [(from.x + to.x) / 2, lift, (from.z + to.z) / 2],
    [to.x, 0.22, to.z],
  ];
  return (
    <Line
      points={points}
      color="#5B8F7E"
      lineWidth={1.8}
      transparent
      opacity={0.55}
      dashed
      dashScale={2}
      dashSize={0.28}
      gapSize={0.16}
    />
  );
}

function PersonCottage({
  id,
  origin,
  target,
  delay,
  name,
  seed,
  active,
  expanded,
  onSelect,
}: {
  id: string;
  origin: { x: number; z: number };
  target: { x: number; z: number };
  delay: number;
  name: string;
  seed: number;
  active: boolean;
  expanded: boolean;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const started = useRef<number | null>(null);
  const roof = ROOF_COLORS[seed % ROOF_COLORS.length]!;
  const settled = useRef(false);

  useEffect(() => {
    started.current = null;
    settled.current = false;
    if (group.current) {
      group.current.position.set(origin.x, 0.2, origin.z);
      group.current.scale.setScalar(0.01);
    }
  }, [origin.x, origin.z, active, id]);

  useFrame(({ clock }) => {
    if (!group.current || !active) return;
    const now = performance.now();
    if (started.current == null) started.current = now;
    const elapsed = now - started.current - delay;

    if (elapsed < 0) {
      group.current.position.set(origin.x, 0.15, origin.z);
      group.current.scale.setScalar(0.01);
      return;
    }

    const raw = Math.min(1, elapsed / 580);
    const move = easeOutCubic(raw);
    const pop = elasticOut(Math.min(1, raw * 1.08));
    const x = origin.x + (target.x - origin.x) * move;
    const z = origin.z + (target.z - origin.z) * move;
    const hop = Math.sin(move * Math.PI) * 0.72;
    group.current.position.set(x, hop + 0.12, z);

    const baseScale = expanded ? 1.05 : 0.55;
    const scale = 0.01 + (baseScale - 0.01) * pop;
    // After spawn, gently lerp toward expanded/compact target
    if (raw >= 1) {
      settled.current = true;
      const current = group.current.scale.x;
      const next = current + (baseScale - current) * 0.14;
      group.current.scale.setScalar(next);
      group.current.position.y = 0.12 + Math.sin(clock.elapsedTime * 0.8 + seed) * 0.03;
    } else {
      group.current.scale.setScalar(scale);
    }
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.9 + seed) * 0.06;
  });

  function pointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    onSelect(id);
  }

  return (
    <group
      ref={group}
      position={[origin.x, 0.2, origin.z]}
      scale={0.01}
      onPointerDown={pointerDown}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {/* Tiny land pad */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[expanded ? 1.15 : 0.55, expanded ? 1.25 : 0.62, 0.08, 28]} />
        <meshStandardMaterial color={expanded ? "#F4F7FA" : "#D8DCE2"} roughness={0.85} />
      </mesh>

      {expanded ? (
        <SettlementProps roof={roof} />
      ) : (
        <group>
          <mesh castShadow position={[0, 0.28, 0]}>
            <boxGeometry args={[0.48, 0.4, 0.4]} />
            <meshStandardMaterial color="#FFFEFB" roughness={0.45} />
          </mesh>
          <mesh castShadow position={[0, 0.56, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.38, 0.3, 4]} />
            <meshStandardMaterial color={roof} roughness={0.4} metalness={0.12} />
          </mesh>
          <mesh position={[0, 0.26, 0.22]}>
            <boxGeometry args={[0.1, 0.14, 0.02]} />
            <meshStandardMaterial color="#F6B85B" emissive="#F6A83D" emissiveIntensity={0.45} />
          </mesh>
        </group>
      )}

      <Html distanceFactor={8} position={[0, expanded ? 1.55 : 0.85, 0]} center>
        <div
          className={`pointer-events-none whitespace-nowrap rounded-full border border-white/80 bg-white/95 font-semibold tracking-[-0.02em] text-text shadow-[0_6px_18px_rgba(31,42,55,0.14)] ${
            expanded ? "px-3 py-1 text-[12px]" : "px-2 py-0.5 text-[10px]"
          }`}
        >
          {expanded ? name : shortName(name)}
        </div>
      </Html>

      {expanded && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[1.2, 1.34, 48]} />
          <meshBasicMaterial color="#2F8C78" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}

export function ChildCottageBloom({
  origin,
  people,
  active,
  expandedId,
  onSelectPerson,
}: {
  origin: { x: number; z: number };
  people: BloomChild[];
  active: boolean;
  expandedId: string | null;
  onSelectPerson: (id: string) => void;
}) {
  const targets = useMemo(() => {
    const n = Math.max(people.length, 1);
    const radius = 2.05 + Math.min(people.length, 8) * 0.18;
    return people.map((child, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        child,
        x: origin.x + Math.cos(angle) * radius,
        z: origin.z + Math.sin(angle) * radius,
        delay: i * 70,
        seed: i + 1,
      };
    });
  }, [people, origin.x, origin.z]);

  if (!active || people.length === 0) return null;

  return (
    <group>
      {targets.map(({ child, x, z }) => (
        <ParentArc key={`arc-${child.id}`} from={origin} to={{ x, z }} />
      ))}
      {targets.map(({ child, x, z, delay, seed }) => (
        <PersonCottage
          key={child.id}
          id={child.id}
          origin={origin}
          target={{ x, z }}
          delay={delay}
          name={child.fullName}
          seed={seed}
          active={active}
          expanded={expandedId === child.id}
          onSelect={onSelectPerson}
        />
      ))}
    </group>
  );
}
