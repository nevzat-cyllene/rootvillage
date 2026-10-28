import { hierarchy, tree } from "d3-hierarchy";
import type { Family, Person, PersonRelation } from "@/lib/types";
import {
  buildGraph,
  childrenOf,
  comparePeople,
  parentsOf,
  partnersOf,
  spousesOf,
  type KinGraph,
} from "@/lib/pedigree/graph";

/* ------------------------------------------------------------------ */
/* Geometry constants (canvas units = CSS px at zoom 1)                */
/* ------------------------------------------------------------------ */

export const CARD_W = 168;
export const CARD_H = 196;
/** Gap between spouses inside a household (marriage line lives here). */
export const SPOUSE_GAP = 34;
/** Gap between sibling households. */
export const SIBLING_GAP = 40;
/** Gap between households that are not siblings (cousins). */
export const COUSIN_GAP = 84;
/** Vertical distance between generation rows. */
export const ROW_H = CARD_H + 128;
/** Horizontal distance between family trees. */
export const FAMILY_GAP = 240;
const FRAME_PAD = 36;
const FRAME_HEAD = 44;

/* ------------------------------------------------------------------ */
/* Output types                                                        */
/* ------------------------------------------------------------------ */

export type LayoutCard = {
  /** Unique within the layout. Primary cards use the person id. */
  key: string;
  personId: string;
  /** The family tree this card is drawn in. */
  familyId: string;
  householdId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Married in from another tree; the real card lives elsewhere. */
  ghost: boolean;
  isAnchor: boolean;
  /** Generation row: 1 = founder, 2 = children, 0 or less = ancestors of founder. */
  generation: number;
  isFounder: boolean;
};

export type LayoutEdge = {
  key: string;
  kind: "union" | "union-informal" | "descent" | "cross";
  d: string;
  /** People this edge connects (used for highlighting). */
  personIds: string[];
};

export type FamilyFrame = {
  familyId: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where to render the "add founder" placeholder when the family is empty. */
  placeholder: { x: number; y: number } | null;
};

export type TreeLayout = {
  cards: LayoutCard[];
  edges: LayoutEdge[];
  frames: FamilyFrame[];
  bounds: { x: number; y: number; w: number; h: number };
  cardByKey: Map<string, LayoutCard>;
  /** Primary (non-ghost) card key for every drawn person. */
  primaryCardByPerson: Map<string, string>;
  graph: KinGraph;
};

/* ------------------------------------------------------------------ */
/* Internal model                                                      */
/* ------------------------------------------------------------------ */

type Member = { personId: string; ghost: boolean; informal: boolean };
type Union = { partnerId: string | null; childIds: string[] };
type Household = {
  anchorId: string;
  familyId: string;
  members: Member[];
  unions: Union[];
  children: Household[];
  width: number;
};

type PlacedHousehold = {
  household: Household;
  cx: number;
  depth: number;
  node: { x: number; y: number };
};

/* ------------------------------------------------------------------ */
/* Public entry                                                        */
/* ------------------------------------------------------------------ */

export function layoutVillage(
  families: Family[],
  people: Person[],
  relations: PersonRelation[],
): TreeLayout {
  const graph = buildGraph(people, relations);
  const familyIds = new Set(families.map((family) => family.id));
  const visited = new Set<string>();

  const cards: LayoutCard[] = [];
  const edges: LayoutEdge[] = [];
  const frames: FamilyFrame[] = [];
  const drawnParentLinks = new Set<string>();

  let cursorX = 0;
  for (const family of orderFamilies(families, graph)) {
    const result = layoutFamily(family, graph, familyIds, visited, drawnParentLinks);
    const shiftX = cursorX - result.minX;
    for (const card of result.cards) card.x += shiftX;
    for (const edge of result.edges) edge.d = shiftPath(edge.d, shiftX, 0);
    const frame: FamilyFrame = {
      familyId: family.id,
      name: family.name,
      x: cursorX - FRAME_PAD,
      y: result.minY - FRAME_PAD - FRAME_HEAD,
      w: result.maxX - result.minX + FRAME_PAD * 2,
      h: result.maxY - result.minY + FRAME_PAD * 2 + FRAME_HEAD,
      placeholder: result.placeholder
        ? { x: result.placeholder.x + shiftX, y: result.placeholder.y }
        : null,
    };
    cards.push(...result.cards);
    edges.push(...result.edges);
    frames.push(frame);
    cursorX += frame.w - FRAME_PAD + FAMILY_GAP;
  }

  const cardByKey = new Map(cards.map((card) => [card.key, card]));
  const primaryCardByPerson = new Map<string, string>();
  for (const card of cards) {
    if (!card.ghost) primaryCardByPerson.set(card.personId, card.key);
  }

  // Parent links that could not be drawn as a descent bus (cousin marriages,
  // children anchored in another family tree, …) become dashed cross edges.
  for (const [childId, parentIds] of graph.parents) {
    const childKey = primaryCardByPerson.get(childId);
    if (!childKey) continue;
    const child = cardByKey.get(childKey)!;
    for (const parentId of parentIds) {
      if (drawnParentLinks.has(`${childId}:${parentId}`)) continue;
      const parentKey = primaryCardByPerson.get(parentId);
      if (!parentKey) continue;
      const parent = cardByKey.get(parentKey)!;
      const x1 = parent.x + parent.w / 2;
      const y1 = parent.y + parent.h;
      const x2 = child.x + child.w / 2;
      const y2 = child.y;
      const bend = Math.max(60, Math.abs(y2 - y1) / 2);
      edges.push({
        key: `cross:${parentId}:${childId}`,
        kind: "cross",
        d: `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`,
        personIds: [parentId, childId],
      });
    }
  }

  // When spouses' primary cards sit in different households (wife natal tree vs
  // husband household), connect those primaries with a dashed cross link. The
  // in-household union line beside the husband still draws separately.
  const seenSpouse = new Set<string>();
  for (const [personId, spouseIds] of graph.spouses) {
    for (const spouseId of spouseIds) {
      const pairKey = personId < spouseId ? `${personId}:${spouseId}` : `${spouseId}:${personId}`;
      if (seenSpouse.has(pairKey)) continue;
      seenSpouse.add(pairKey);
      const aKey = primaryCardByPerson.get(personId);
      const bKey = primaryCardByPerson.get(spouseId);
      if (!aKey || !bKey) continue;
      const a = cardByKey.get(aKey)!;
      const b = cardByKey.get(bKey)!;
      if (a.householdId === b.householdId && a.familyId === b.familyId) continue;
      const x1 = a.x + a.w / 2;
      const y1 = a.y + a.h / 2;
      const x2 = b.x + b.w / 2;
      const y2 = b.y + b.h / 2;
      const lift = Math.min(220, Math.abs(x2 - x1) * 0.22 + 70);
      edges.push({
        key: `cross-spouse:${pairKey}`,
        kind: "cross",
        d: `M ${x1} ${y1} C ${x1} ${y1 - lift}, ${x2} ${y2 - lift}, ${x2} ${y2}`,
        personIds: [personId, spouseId],
      });
    }
  }

  const bounds = frames.length
    ? {
        x: Math.min(...frames.map((f) => f.x)),
        y: Math.min(...frames.map((f) => f.y)),
        w: 0,
        h: 0,
      }
    : { x: 0, y: 0, w: 0, h: 0 };
  if (frames.length) {
    bounds.w = Math.max(...frames.map((f) => f.x + f.w)) - bounds.x;
    bounds.h = Math.max(...frames.map((f) => f.y + f.h)) - bounds.y;
  }

  return { cards, edges, frames, bounds, cardByKey, primaryCardByPerson, graph };
}

/* ------------------------------------------------------------------ */
/* Family ordering: keep intermarried families next to each other      */
/* ------------------------------------------------------------------ */

function orderFamilies(families: Family[], graph: KinGraph): Family[] {
  if (families.length < 3) return families;
  const familyOf = (id: string) => graph.people.get(id)?.family_id ?? null;
  const links = new Map<string, number>();
  const bump = (a: string | null, b: string | null) => {
    if (!a || !b || a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    links.set(key, (links.get(key) ?? 0) + 1);
  };
  for (const [person, spouses] of graph.spouses) {
    for (const spouse of spouses) bump(familyOf(person), familyOf(spouse));
  }
  for (const [child, parents] of graph.parents) {
    for (const parent of parents) bump(familyOf(child), familyOf(parent));
  }
  const strength = (a: string, b: string) => links.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? 0;

  const remaining = [...families].sort(
    (a, b) => (b.people_count ?? 0) - (a.people_count ?? 0) || a.name.localeCompare(b.name, "tr"),
  );
  const ordered: Family[] = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1]!;
    let bestIndex = 0;
    let best = -1;
    remaining.forEach((family, index) => {
      const s = strength(last.id, family.id);
      if (s > best) {
        best = s;
        bestIndex = index;
      }
    });
    ordered.push(remaining.splice(bestIndex, 1)[0]!);
  }
  return ordered;
}

/* ------------------------------------------------------------------ */
/* Single family tree                                                  */
/* ------------------------------------------------------------------ */

type FamilyResult = {
  cards: LayoutCard[];
  edges: LayoutEdge[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  placeholder: { x: number; y: number } | null;
};

function layoutFamily(
  family: Family,
  graph: KinGraph,
  familyIds: Set<string>,
  visited: Set<string>,
  drawnParentLinks: Set<string>,
): FamilyResult {
  const F = family.id;
  const familyPeople = [...graph.people.values()]
    .filter((person) => person.family_id === F)
    .sort(comparePeople);

  const belongsHere = (id: string) => {
    const fam = graph.people.get(id)?.family_id;
    return fam === F || (fam != null && !familyIds.has(fam));
  };

  /** Climb to the highest ancestor that still belongs to this tree. */
  const climb = (start: string) => {
    let current = start;
    const seen = new Set([start]);
    for (;;) {
      const next = parentsOf(graph, current).find(
        (p) => !seen.has(p) && !visited.has(p) && belongsHere(p),
      );
      if (!next) return current;
      seen.add(next);
      current = next;
    }
  };

  const rootIds: string[] = [];
  const founderId = family.founder_person_id && graph.people.has(family.founder_person_id)
    ? family.founder_person_id
    : null;
  if (founderId && !visited.has(founderId)) rootIds.push(climb(founderId));

  const roots: Household[] = [];
  const buildRoot = (id: string) => {
    if (visited.has(id)) return;
    roots.push(buildHousehold(id, F, graph, familyIds, visited));
  };
  for (const id of rootIds) buildRoot(id);
  for (const person of familyPeople) {
    if (visited.has(person.id)) continue;
    buildRoot(climb(person.id));
  }

  const cards: LayoutCard[] = [];
  const edges: LayoutEdge[] = [];
  let cursorX = 0;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  if (roots.length === 0) {
    // Empty family: reserve a slot for the founder placeholder at row 1.
    const y = ROW_H;
    return {
      cards,
      edges,
      minX: 0,
      maxX: CARD_W,
      minY: y,
      maxY: y + CARD_H,
      placeholder: { x: 0, y },
    };
  }

  for (const root of roots) {
    const placed = placeTree(root);
    // Align generations: founder sits on row 1. Detached roots use the manual
    // generation value of their anchor when present.
    const founderPlacement = founderId
      ? placed.find((p) => p.household.members.some((m) => m.personId === founderId))
      : undefined;
    const anchorGeneration = graph.people.get(root.anchorId)?.generation ?? null;
    const rowOffset = founderPlacement
      ? 1 - founderPlacement.depth
      : anchorGeneration != null && anchorGeneration >= 1
        ? anchorGeneration
        : 1;

    const minLocalX = Math.min(...placed.map((p) => p.cx - p.household.width / 2));
    const shift = cursorX - minLocalX;
    let maxLocalX = Number.NEGATIVE_INFINITY;

    for (const p of placed) {
      const row = p.depth + rowOffset;
      const top = row * ROW_H;
      const left = p.cx - p.household.width / 2 + shift;
      maxLocalX = Math.max(maxLocalX, left + p.household.width);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, top + CARD_H);

      const memberX = new Map<string, number>();
      p.household.members.forEach((member, index) => {
        const x = left + index * (CARD_W + SPOUSE_GAP);
        memberX.set(member.personId, x);
        cards.push({
          key: member.ghost ? `${member.personId}@${p.household.anchorId}` : member.personId,
          personId: member.personId,
          familyId: F,
          householdId: p.household.anchorId,
          x,
          y: top,
          w: CARD_W,
          h: CARD_H,
          ghost: member.ghost,
          isAnchor: member.personId === p.household.anchorId,
          generation: row,
          isFounder: member.personId === founderId,
        });
      });

      const anchorIndex = p.household.members.findIndex((m) => m.personId === p.household.anchorId);
      const anchorX = memberX.get(p.household.anchorId)! + CARD_W / 2;

      // Marriage lines.
      let bracketRank = 0;
      p.household.members.forEach((member, index) => {
        if (member.personId === p.household.anchorId) return;
        const partnerX = memberX.get(member.personId)! + CARD_W / 2;
        const adjacent = Math.abs(index - anchorIndex) === 1;
        const midY = top + CARD_H * 0.42;
        let d: string;
        if (adjacent) {
          const [a, b] = anchorX < partnerX
            ? [anchorX + CARD_W / 2, partnerX - CARD_W / 2]
            : [partnerX + CARD_W / 2, anchorX - CARD_W / 2];
          d = `M ${a} ${midY} H ${b}`;
        } else {
          bracketRank += 1;
          const dropY = top + CARD_H + 10 + bracketRank * 10;
          d = `M ${anchorX} ${top + CARD_H} V ${dropY} H ${partnerX} V ${top + CARD_H}`;
        }
        edges.push({
          key: `union:${p.household.anchorId}:${member.personId}`,
          kind: member.informal ? "union-informal" : "union",
          d,
          personIds: [p.household.anchorId, member.personId],
        });
      });

      // Descent buses: one per union with children.
      const childTop = (row + 1) * ROW_H;
      const childPlacements = new Map(
        p.household.children.map((child) => [child.anchorId, child] as const),
      );
      p.household.unions.forEach((union, unionIndex) => {
        const childCenters = union.childIds
          .filter((id) => childPlacements.has(id))
          .map((id) => {
            const cp = placed.find((q) => q.household.anchorId === id)!;
            const left = cp.cx - cp.household.width / 2 + shift;
            const idx = cp.household.members.findIndex((m) => m.personId === id);
            return left + idx * (CARD_W + SPOUSE_GAP) + CARD_W / 2;
          });
        if (childCenters.length === 0) return;

        let dropX = anchorX;
        let startY = top + CARD_H;
        if (union.partnerId) {
          const partnerIndex = p.household.members.findIndex((m) => m.personId === union.partnerId);
          const partnerX = memberX.get(union.partnerId)! + CARD_W / 2;
          if (Math.abs(partnerIndex - anchorIndex) === 1) {
            dropX = (anchorX + partnerX) / 2;
            startY = top + CARD_H * 0.42;
          } else {
            dropX = (anchorX + partnerX) / 2;
            startY = top + CARD_H + 20;
          }
        }
        const busY = childTop - 52 + unionIndex * 14;
        const minX = Math.min(dropX, ...childCenters);
        const maxX = Math.max(dropX, ...childCenters);
        let d = `M ${dropX} ${startY} V ${busY} M ${minX} ${busY} H ${maxX}`;
        for (const cx of childCenters) d += ` M ${cx} ${busY} V ${childTop}`;
        const personIds = [p.household.anchorId];
        if (union.partnerId) personIds.push(union.partnerId);
        for (const childId of union.childIds) {
          if (!childPlacements.has(childId)) continue;
          personIds.push(childId);
          drawnParentLinks.add(`${childId}:${p.household.anchorId}`);
          if (union.partnerId) drawnParentLinks.add(`${childId}:${union.partnerId}`);
        }
        edges.push({
          key: `descent:${p.household.anchorId}:${union.partnerId ?? "solo"}`,
          kind: "descent",
          d,
          personIds,
        });
      });
    }

    cursorX = maxLocalX + COUSIN_GAP;
  }

  const minX = Math.min(...cards.map((c) => c.x));
  const maxX = Math.max(...cards.map((c) => c.x + c.w));
  return { cards, edges, minX, maxX, minY, maxY, placeholder: null };
}

/* ------------------------------------------------------------------ */
/* Household construction                                              */
/* ------------------------------------------------------------------ */

function isMalePerson(person: Person | undefined): boolean {
  return person?.gender === "male";
}

function isFemalePerson(person: Person | undefined): boolean {
  return person?.gender === "female";
}

/**
 * Patrilineal couple layout:
 * - Beside a male blood person, draw his wife (ghost if she has her own tree).
 * - Beside a female blood person, do NOT draw a husband who already has (or will
 *   have) his own family tree — she sits next to him there instead. Only keep a
 *   husband here when he would otherwise disappear (no other village family).
 * - Members are always ordered men → women so the wife sits to the husband's right.
 */
function buildHousehold(
  anchorId: string,
  F: string,
  graph: KinGraph,
  familyIds: Set<string>,
  visited: Set<string>,
): Household {
  visited.add(anchorId);
  const anchor = graph.people.get(anchorId)!;
  const spouseIds = spousesOf(graph, anchorId);
  const anchorIsFemale = isFemalePerson(anchor);

  const partnerMembers: Member[] = [];
  for (const partnerId of partnersOf(graph, anchorId)) {
    const partner = graph.people.get(partnerId)!;
    const hasOwnTree = partner.family_id !== F && familyIds.has(partner.family_id);
    const partnerIsMale = isMalePerson(partner);

    // Wife stays in her natal tree alone; she appears beside her husband in his tree.
    if (anchorIsFemale && partnerIsMale && hasOwnTree) continue;

    const ghost = visited.has(partnerId) || hasOwnTree;
    if (!ghost) visited.add(partnerId);
    partnerMembers.push({
      personId: partnerId,
      ghost,
      informal: !spouseIds.includes(partnerId),
    });
  }

  const self: Member = { personId: anchorId, ghost: false, informal: false };
  const all = [...partnerMembers, self];
  const males = all.filter((member) => isMalePerson(graph.people.get(member.personId)));
  const females = all.filter((member) => !isMalePerson(graph.people.get(member.personId)));
  const members: Member[] = [...males, ...females];

  // Group children by the other parent (union).
  const unionByPartner = new Map<string | null, Union>();
  const unionOrder: Array<string | null> = [
    ...partnerMembers.map((m) => m.personId),
    null,
  ];
  for (const key of unionOrder) unionByPartner.set(key, { partnerId: key, childIds: [] });

  for (const childId of childrenOf(graph, anchorId)) {
    const child = graph.people.get(childId)!;
    if (visited.has(childId)) continue;
    if (child.family_id !== F && familyIds.has(child.family_id)) continue;
    const other = parentsOf(graph, childId).find((p) => p !== anchorId) ?? null;
    const key = other && unionByPartner.has(other) ? other : null;
    unionByPartner.get(key)!.childIds.push(childId);
  }

  const unions = [...unionByPartner.values()].filter((u) => u.childIds.length > 0);
  const children: Household[] = [];
  for (const union of unions) {
    for (const childId of union.childIds) {
      if (visited.has(childId)) continue; // claimed as a partner meanwhile
      children.push(buildHousehold(childId, F, graph, familyIds, visited));
    }
  }
  // Drop children that ended up elsewhere so bus geometry matches placements.
  for (const union of unions) {
    union.childIds = union.childIds.filter((id) => children.some((c) => c.anchorId === id));
  }

  return {
    anchorId,
    familyId: F,
    members,
    unions: unions.filter((u) => u.childIds.length > 0),
    children,
    width: members.length * CARD_W + (members.length - 1) * SPOUSE_GAP,
  };
}

/* ------------------------------------------------------------------ */
/* Tidy tree (Reingold–Tilford / Buchheim–Walker via d3-hierarchy)     */
/* ------------------------------------------------------------------ */

function placeTree(root: Household): PlacedHousehold[] {
  const h = hierarchy(root, (d) => d.children);
  tree<Household>()
    .nodeSize([1, ROW_H])
    .separation((a, b) => {
      const gap = a.parent === b.parent ? SIBLING_GAP : COUSIN_GAP;
      return (a.data.width + b.data.width) / 2 + gap;
    })(h);
  return h.descendants().map((node) => ({
    household: node.data,
    cx: node.x ?? 0,
    depth: node.depth,
    node: { x: node.x ?? 0, y: node.y ?? 0 },
  }));
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function shiftPath(d: string, dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return d;
  // Paths only use M/H/V/C with absolute coordinates.
  const tokens = d.split(/\s+/);
  const out: string[] = [];
  let cmd = "";
  let pairIndex = 0;
  for (const token of tokens) {
    if (/^[MHVC]$/.test(token)) {
      cmd = token;
      pairIndex = 0;
      out.push(token);
      continue;
    }
    const value = Number(token.replace(",", ""));
    const hadComma = token.endsWith(",");
    let shifted = value;
    if (cmd === "H") shifted = value + dx;
    else if (cmd === "V") shifted = value + dy;
    else shifted = pairIndex % 2 === 0 ? value + dx : value + dy;
    pairIndex += 1;
    out.push(hadComma ? `${shifted},` : `${shifted}`);
  }
  return out.join(" ");
}
