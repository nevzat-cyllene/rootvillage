/** Deterministic layout when map_x/map_z are null. */

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function defaultIslandPosition(
  familyId: string,
  index: number,
): { x: number; z: number; seed: number } {
  const h = hashString(familyId);
  const angle = (index * 2.399963) + (h % 1000) / 1000; // golden-ish
  const ring = 4 + (index % 5) * 3.2 + ((h >> 8) % 100) / 80;
  const x = Math.cos(angle) * ring;
  const z = Math.sin(angle) * ring;
  const seed = (h % 6) + 1;
  return { x, z, seed };
}

export function resolveIslandPose(
  family: { id: string; map_x?: number | null; map_z?: number | null; map_seed?: number | null },
  index: number,
): { x: number; z: number; seed: number } {
  const fallback = defaultIslandPosition(family.id, index);
  return {
    x: family.map_x ?? fallback.x,
    z: family.map_z ?? fallback.z,
    seed: family.map_seed ?? fallback.seed,
  };
}
