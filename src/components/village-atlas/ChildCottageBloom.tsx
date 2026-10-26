"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
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

function MiniCottage({
  origin,
  target,
  delay,
  name,
  seed,
  active,
}: {
  origin: { x: number; z: number };
  target: { x: number; z: number };
  delay: number;
  name: string;
  seed: number;
  active: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const started = useRef<number | null>(null);
  const roofColors = useMemo(
    () => ["#5B6B7C", "#A66533", "#2F7969", "#8D4F80", "#426FA7"],
    [],
  );
  const roof = roofColors[seed % roofColors.length]!;

  useEffect(() => {
    started.current = null;
    if (group.current) {
      group.current.position.set(origin.x, 0.2, origin.z);
      group.current.scale.setScalar(0.01);
    }
  }, [origin.x, origin.z, active, name]);

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
    group.current.scale.setScalar(0.01 + 0.55 * pop);
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.9 + seed) * 0.08;
  });

  return (
    <group ref={group} position={[origin.x, 0.2, origin.z]} scale={0.01}>
      <mesh castShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[0.42, 0.36, 0.36]} />
        <meshStandardMaterial color="#FFFEFB" roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 0.48, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.34, 0.28, 4]} />
        <meshStandardMaterial color={roof} roughness={0.4} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.2, 0.19]}>
        <boxGeometry args={[0.1, 0.14, 0.02]} />
        <meshStandardMaterial color="#F6B85B" emissive="#F6A83D" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.06, 20]} />
        <meshStandardMaterial color="#D8DCE2" roughness={0.85} />
      </mesh>
      <Html distanceFactor={8} position={[0, 0.78, 0]} center>
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-white/80 bg-white/95 px-2 py-0.5 text-[10px] font-semibold tracking-[-0.02em] text-text shadow-[0_6px_18px_rgba(31,42,55,0.14)]">
          {shortName(name)}
        </div>
      </Html>
    </group>
  );
}

export function ChildCottageBloom({
  origin,
  people,
  active,
}: {
  origin: { x: number; z: number };
  people: BloomChild[];
  active: boolean;
}) {
  const targets = useMemo(() => {
    const n = Math.max(people.length, 1);
    const radius = 1.55 + Math.min(people.length, 8) * 0.12;
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
      {targets.map(({ child, x, z, delay, seed }) => (
        <MiniCottage
          key={child.id}
          origin={origin}
          target={{ x, z }}
          delay={delay}
          name={child.fullName}
          seed={seed}
          active={active}
        />
      ))}
    </group>
  );
}
