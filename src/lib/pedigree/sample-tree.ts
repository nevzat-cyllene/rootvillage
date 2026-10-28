import type { WriteClient } from "@/lib/pedigree/mutations";
import type { Family, Person, PersonRelation } from "@/lib/types";

/**
 * Demo pedigree shown when a village has no people yet. Ids are prefixed with
 * `sample:` so the canvas can keep these cards read-only.
 *
 * A family: founders Ali + Ayşe → Bekir, Cemile, Davut, Fatma.
 *   Bekir + Belgin → Burak
 *   Cemile marries Kemal from the K family → Kerem, Kader (K family)
 *   Davut single
 *   Fatma + Ferhat → Feride, Fidan; Feride + Fuat → Figen (4th generation)
 * K family: founders Kadir + Kadriye → Kemal.
 */
export const SAMPLE_PREFIX = "sample:";
export const isSampleId = (id: string) => id.startsWith(SAMPLE_PREFIX);

type SeedPerson = {
  key: string;
  family: "A" | "K";
  name: string;
  gender: Person["gender"];
  birth?: number;
  death?: number;
  note?: string;
};

const SEED_PEOPLE: SeedPerson[] = [
  { key: "ali", family: "A", name: "Ali A", gender: "male", birth: 1930, death: 2005, note: "Ocağın kurucusu." },
  { key: "ayse", family: "A", name: "Ayşe A", gender: "female", birth: 1934, death: 2012 },
  { key: "bekir", family: "A", name: "Bekir A", gender: "male", birth: 1955 },
  { key: "belgin", family: "A", name: "Belgin A", gender: "female", birth: 1958 },
  { key: "burak", family: "A", name: "Burak A", gender: "male", birth: 1982 },
  { key: "cemile", family: "A", name: "Cemile K", gender: "female", birth: 1958 },
  { key: "davut", family: "A", name: "Davut A", gender: "male", birth: 1961 },
  { key: "fatma", family: "A", name: "Fatma F", gender: "female", birth: 1964 },
  { key: "ferhat", family: "A", name: "Ferhat F", gender: "male", birth: 1960 },
  { key: "feride", family: "A", name: "Feride F", gender: "female", birth: 1986 },
  { key: "fidan", family: "A", name: "Fidan F", gender: "female", birth: 1989 },
  { key: "fuat", family: "A", name: "Fuat Y", gender: "male", birth: 1984 },
  { key: "figen", family: "A", name: "Figen Y", gender: "female", birth: 2012 },
  { key: "kadir", family: "K", name: "Kadir K", gender: "male", birth: 1925, death: 1990 },
  { key: "kadriye", family: "K", name: "Kadriye K", gender: "female", birth: 1929, death: 2001 },
  { key: "kemal", family: "K", name: "Kemal K", gender: "male", birth: 1954 },
  { key: "kerem", family: "K", name: "Kerem K", gender: "male", birth: 1980 },
  { key: "kader", family: "K", name: "Kader K", gender: "female", birth: 1984 },
];

/** [child, parent] pairs */
const SEED_PARENTS: Array<[string, string]> = [
  ["bekir", "ali"], ["bekir", "ayse"],
  ["cemile", "ali"], ["cemile", "ayse"],
  ["davut", "ali"], ["davut", "ayse"],
  ["fatma", "ali"], ["fatma", "ayse"],
  ["burak", "bekir"], ["burak", "belgin"],
  ["feride", "fatma"], ["feride", "ferhat"],
  ["fidan", "fatma"], ["fidan", "ferhat"],
  ["figen", "feride"], ["figen", "fuat"],
  ["kemal", "kadir"], ["kemal", "kadriye"],
  ["kerem", "kemal"], ["kerem", "cemile"],
  ["kader", "kemal"], ["kader", "cemile"],
];

const SEED_SPOUSES: Array<[string, string]> = [
  ["ali", "ayse"],
  ["bekir", "belgin"],
  ["cemile", "kemal"],
  ["fatma", "ferhat"],
  ["feride", "fuat"],
  ["kadir", "kadriye"],
];

const SEED_FAMILIES: Array<{ key: "A" | "K"; name: string; aka: string; founder: string }> = [
  { key: "A", name: "A", aka: "Örnek ocak", founder: "ali" },
  { key: "K", name: "K", aka: "Örnek komşu ocak", founder: "kadir" },
];

export type SampleTree = {
  families: Family[];
  people: Person[];
  relations: PersonRelation[];
};

export function buildSampleTree(villageId: string): SampleTree {
  const now = new Date(0).toISOString();
  const familyId = (key: string) => `${SAMPLE_PREFIX}family:${key}`;
  const personId = (key: string) => `${SAMPLE_PREFIX}${key}`;

  const families: Family[] = SEED_FAMILIES.map((f) => ({
    id: familyId(f.key),
    village_id: villageId,
    name: f.name,
    aka: f.aka,
    notes: null,
    is_incomplete: false,
    disputed: false,
    founder_person_id: personId(f.founder),
    created_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    people_count: SEED_PEOPLE.filter((p) => p.family === f.key).length,
  }));

  const people: Person[] = SEED_PEOPLE.map((p) => ({
    id: personId(p.key),
    family_id: familyId(p.family),
    full_name: p.name,
    birth_year: p.birth ?? null,
    death_year: p.death ?? null,
    gender: p.gender,
    notes: p.note ?? null,
    avatar_url: null,
    generation: null,
    disputed: false,
    created_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }));

  const relations: PersonRelation[] = [
    ...SEED_PARENTS.map(([child, parent]) => ({
      id: `${SAMPLE_PREFIX}rel:${child}:${parent}`,
      person_id: personId(child),
      related_person_id: personId(parent),
      relation_type: "parent" as const,
    })),
    ...SEED_SPOUSES.map(([a, b]) => ({
      id: `${SAMPLE_PREFIX}rel:${a}:${b}:spouse`,
      person_id: personId(a),
      related_person_id: personId(b),
      relation_type: "spouse" as const,
    })),
  ];

  return { families, people, relations };
}

/** Writes the demo pedigree into the village as real rows. */
export async function insertSampleTree(
  supabase: WriteClient,
  villageId: string,
  userId: string,
): Promise<{ error: string | null }> {
  const { data: familyRows, error: familyError } = await supabase
    .from("families")
    .insert(SEED_FAMILIES.map((f) => ({
      village_id: villageId,
      name: f.name,
      aka: f.aka,
      notes: "Örnek ağaçtan yüklendi; dilediğin gibi düzenle.",
      is_incomplete: false,
      created_by: userId,
    })))
    .select("id, name");
  if (familyError || !familyRows) return { error: familyError?.message ?? "Aileler eklenemedi" };
  const familyIdByKey = new Map<string, string>();
  for (const f of SEED_FAMILIES) {
    const row = familyRows.find((r) => r.name === f.name);
    if (!row) return { error: "Aile kimliği eşleşmedi" };
    familyIdByKey.set(f.key, row.id as string);
  }

  const { data: peopleRows, error: peopleError } = await supabase
    .from("people")
    .insert(SEED_PEOPLE.map((p) => ({
      family_id: familyIdByKey.get(p.family)!,
      full_name: p.name,
      birth_year: p.birth ?? null,
      death_year: p.death ?? null,
      gender: p.gender,
      notes: p.note ?? null,
      created_by: userId,
    })))
    .select("id, full_name");
  if (peopleError || !peopleRows) return { error: peopleError?.message ?? "Kişiler eklenemedi" };
  const personIdByKey = new Map<string, string>();
  for (const p of SEED_PEOPLE) {
    const row = peopleRows.find((r) => r.full_name === p.name);
    if (!row) return { error: "Kişi kimliği eşleşmedi" };
    personIdByKey.set(p.key, row.id as string);
  }

  const { error: relationError } = await supabase
    .from("person_relations")
    .insert([
      ...SEED_PARENTS.map(([child, parent]) => ({
        person_id: personIdByKey.get(child)!,
        related_person_id: personIdByKey.get(parent)!,
        relation_type: "parent",
        created_by: userId,
      })),
      ...SEED_SPOUSES.map(([a, b]) => ({
        person_id: personIdByKey.get(a)!,
        related_person_id: personIdByKey.get(b)!,
        relation_type: "spouse",
        created_by: userId,
      })),
    ])
    .select("id");
  if (relationError) return { error: relationError.message };

  for (const f of SEED_FAMILIES) {
    const { error } = await supabase
      .from("families")
      .update({ founder_person_id: personIdByKey.get(f.founder)! })
      .eq("id", familyIdByKey.get(f.key)!);
    if (error) return { error: error.message };
  }
  return { error: null };
}
