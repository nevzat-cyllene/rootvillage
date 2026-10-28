import type { Person } from "@/lib/types";
import {
  ancestorDistances,
  childrenOf,
  parentsOf,
  spousesOf,
  type KinGraph,
} from "@/lib/pedigree/graph";

/**
 * Turkish kinship term of `toId` as seen from `fromId` ("X'in …").
 *
 * Strategy (standard consanguinity computation):
 *   1. Blood: find the closest common ancestor; (up, down) = generations from
 *      `from` and `to` up to that ancestor; classify the pair, using the
 *      side (father/mother) and genders for the Turkish term.
 *   2. Affinal: if no blood path, look one marriage hop away in both
 *      directions (spouse of a blood relative, blood relative of a spouse).
 *   3. Otherwise null (no known kinship).
 */
export function kinshipLabel(fromId: string, toId: string, graph: KinGraph): string | null {
  if (fromId === toId) return "Kendisi";
  const to = graph.people.get(toId);
  const from = graph.people.get(fromId);
  if (!to || !from) return null;

  const blood = bloodLabel(fromId, toId, graph);
  if (blood) return blood;

  if (spousesOf(graph, fromId).includes(toId)) return "Eşi";

  // Spouse of a blood relative.
  for (const partnerId of spousesOf(graph, toId)) {
    const rel = bloodRelation(fromId, partnerId, graph);
    if (!rel) continue;
    return spouseOfRelativeLabel(rel, to, graph.people.get(partnerId)!);
  }

  // Blood relative of a spouse.
  for (const spouseId of spousesOf(graph, fromId)) {
    const rel = bloodRelation(spouseId, toId, graph);
    if (!rel) continue;
    return relativeOfSpouseLabel(rel, from, to, graph);
  }

  // Two marriage hops: spouse of a blood relative of my spouse
  // (bacanak / elti / eşinin yengesi …).
  for (const spouseId of spousesOf(graph, fromId)) {
    for (const partnerId of spousesOf(graph, toId)) {
      const rel = bloodRelation(spouseId, partnerId, graph);
      if (!rel) continue;
      if (rel.up === 1 && rel.down === 1) {
        if (from.gender === "male" && to.gender === "male") return "Bacanağı";
        if (from.gender === "female" && to.gender === "female") return "Eltisi";
      }
      return `Eşinin ${lowerFirst(spouseOfRelativeLabel(rel, to, graph.people.get(partnerId)!))}`;
    }
  }

  // Step relations: child of a spouse who is not my child.
  for (const spouseId of spousesOf(graph, fromId)) {
    if (childrenOf(graph, spouseId).includes(toId)) {
      return gendered(to, "Üvey oğlu", "Üvey kızı", "Üvey çocuğu");
    }
  }
  for (const parentId of parentsOf(graph, fromId)) {
    if (spousesOf(graph, parentId).includes(toId)) {
      return gendered(to, "Üvey babası", "Üvey annesi", "Üvey ebeveyni");
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */

type BloodRelation = {
  up: number;
  down: number;
  /** Parent of `from` through whom the common ancestor is reached. */
  viaParent: Person | null;
  /** Whether both parents are shared (full siblings). */
  full: boolean;
};

function bloodRelation(fromId: string, toId: string, graph: KinGraph): BloodRelation | null {
  if (fromId === toId) return { up: 0, down: 0, viaParent: null, full: true };
  const fromAnc = ancestorDistances(graph, fromId);
  const toAnc = ancestorDistances(graph, toId);
  let best: { up: number; down: number; via: string | null } | null = null;
  for (const [ancestor, f] of fromAnc) {
    const t = toAnc.get(ancestor);
    if (!t) continue;
    const total = f.up + t.up;
    if (!best || total < best.up + best.down || (total === best.up + best.down && f.up < best.up)) {
      best = { up: f.up, down: t.up, via: f.via };
    }
  }
  if (!best) return null;

  let full = false;
  if (best.up === 1 && best.down === 1) {
    const a = new Set(parentsOf(graph, fromId));
    const shared = parentsOf(graph, toId).filter((p) => a.has(p));
    full = shared.length >= 2 || (a.size === 1 && parentsOf(graph, toId).length === 1);
  }
  return {
    up: best.up,
    down: best.down,
    viaParent: best.via ? graph.people.get(best.via) ?? null : null,
    full,
  };
}

function bloodLabel(fromId: string, toId: string, graph: KinGraph): string | null {
  const rel = bloodRelation(fromId, toId, graph);
  if (!rel) return null;
  const from = graph.people.get(fromId)!;
  const to = graph.people.get(toId)!;
  return describeBlood(rel, from, to);
}

function describeBlood(rel: BloodRelation, from: Person, to: Person): string {
  const { up, down, viaParent } = rel;
  const side = viaParent?.gender === "male" ? "father" : viaParent?.gender === "female" ? "mother" : null;

  // Direct line downwards.
  if (up === 0) {
    if (down === 1) return gendered(to, "Oğlu", "Kızı", "Çocuğu");
    if (down === 2) return "Torunu";
    if (down === 3) return "Torununun çocuğu";
    return `${down - 1}. kuşak torunu`;
  }
  // Direct line upwards.
  if (down === 0) {
    if (up === 1) return gendered(to, "Babası", "Annesi", "Ebeveyni");
    if (up === 2) {
      if (to.gender === "male") return "Dedesi";
      if (to.gender === "female") {
        if (side === "father") return "Babaannesi";
        if (side === "mother") return "Anneannesi";
        return "Büyükannesi";
      }
      return "Büyük ebeveyni";
    }
    if (up === 3) return gendered(to, "Büyük dedesi", "Büyük ninesi", "Büyük büyük ebeveyni");
    return `${up - 1}. kuşak atası`;
  }
  // Siblings.
  if (up === 1 && down === 1) {
    const older = from.birth_year != null && to.birth_year != null && to.birth_year < from.birth_year;
    const younger = from.birth_year != null && to.birth_year != null && to.birth_year > from.birth_year;
    const prefix = rel.full ? "" : "Üvey ";
    if (to.gender === "male") return prefix + (older ? "Abisi" : younger ? "Erkek kardeşi" : "Erkek kardeşi");
    if (to.gender === "female") return prefix + (older ? "Ablası" : "Kız kardeşi");
    return prefix + "Kardeşi";
  }
  // Aunts / uncles (and great-).
  if (down === 1 && up >= 2) {
    const great = up > 2 ? "Büyük " : "";
    if (to.gender === "male") return great + (side === "mother" ? "Dayısı" : side === "father" ? "Amcası" : "Amcası / dayısı");
    if (to.gender === "female") return great + (side === "mother" ? "Teyzesi" : side === "father" ? "Halası" : "Halası / teyzesi");
    return great + "Ebeveyninin kardeşi";
  }
  // Nieces / nephews.
  if (up === 1 && down >= 2) {
    if (down === 2) return "Yeğeni";
    return "Yeğeninin çocuğu";
  }
  // Cousins.
  if (up === 2 && down === 2) return "Kuzeni";
  if (up >= 2 && down >= 2) {
    const degree = Math.min(up, down) - 1;
    const removed = Math.abs(up - down);
    if (removed === 0) return `${degree}. derece kuzeni`;
    if (up > down) return "Ebeveyninin kuzeni";
    return "Kuzeninin çocuğu";
  }
  return "Uzak akrabası";
}

/* ------------------------------------------------------------------ */
/* Affinal                                                             */
/* ------------------------------------------------------------------ */

function spouseOfRelativeLabel(rel: BloodRelation, to: Person, partner: Person): string {
  const { up, down } = rel;
  if (up === 0 && down === 1) return gendered(to, "Damadı", "Gelini", "Çocuğunun eşi");
  if (up === 0 && down === 2) return "Torununun eşi";
  if (up === 1 && down === 1) {
    if (to.gender === "female") return "Yengesi";
    if (to.gender === "male") return "Eniştesi";
    return "Kardeşinin eşi";
  }
  if (down === 1 && up >= 2) {
    if (to.gender === "female") return "Yengesi";
    if (to.gender === "male") return "Eniştesi";
    return "Ebeveyninin kardeşinin eşi";
  }
  if (up === 1 && down === 2) return "Yeğeninin eşi";
  if (up === 2 && down === 2) return "Kuzeninin eşi";
  if (down === 0 && up === 1) return gendered(to, "Üvey babası", "Üvey annesi", "Ebeveyninin eşi");
  return `${partner.full_name.split(" ")[0]}'in eşi`;
}

function relativeOfSpouseLabel(rel: BloodRelation, from: Person, to: Person, graph: KinGraph): string {
  const { up, down } = rel;
  if (down === 0 && up === 1) return gendered(to, "Kayınpederi", "Kayınvalidesi", "Eşinin ebeveyni");
  if (down === 0 && up === 2) return gendered(to, "Eşinin dedesi", "Eşinin ninesi", "Eşinin büyük ebeveyni");
  if (up === 1 && down === 1) {
    if (to.gender === "male") return "Kayınbiraderi";
    if (to.gender === "female") return from.gender === "male" ? "Baldızı" : "Görümcesi";
    return "Eşinin kardeşi";
  }
  if (up === 0 && down === 1) {
    // Spouse's child; if also mine the blood path would have matched earlier.
    return gendered(to, "Üvey oğlu", "Üvey kızı", "Üvey çocuğu");
  }
  const spouseView = describeBlood(rel, graph.people.get(spousesOf(graph, from.id)[0] ?? from.id) ?? from, to);
  return `Eşinin ${lowerFirst(spouseView)}`;
}

/* ------------------------------------------------------------------ */

function gendered(person: Person, male: string, female: string, fallback: string): string {
  if (person.gender === "male") return male;
  if (person.gender === "female") return female;
  return fallback;
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLocaleLowerCase("tr") + value.slice(1);
}

/** Convenience: labels for every person relative to one reference person. */
export function kinshipLabels(referenceId: string | null, graph: KinGraph): Map<string, string> {
  const out = new Map<string, string>();
  if (!referenceId || !graph.people.has(referenceId)) return out;
  for (const id of graph.people.keys()) {
    const label = kinshipLabel(referenceId, id, graph);
    if (label) out.set(id, label);
  }
  return out;
}
