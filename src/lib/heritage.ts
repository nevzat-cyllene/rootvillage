import type { HeritageEntryType } from "@/lib/types";

export const heritageTypeMeta: Record<
  HeritageEntryType,
  { label: string; group: "Yer" | "Hafıza" | "Kültür" }
> = {
  region: { label: "Bölge", group: "Yer" },
  city: { label: "Şehir", group: "Yer" },
  district: { label: "İlçe", group: "Yer" },
  village: { label: "Köy", group: "Yer" },
  hamlet: { label: "Mezra", group: "Yer" },
  monument: { label: "Yapı / anıt", group: "Yer" },
  historic_site: { label: "Tarihî mekân", group: "Yer" },
  event: { label: "Tarihî olay", group: "Hafıza" },
  story: { label: "Hikâye / tanıklık", group: "Hafıza" },
  quote: { label: "Alıntı", group: "Hafıza" },
  cultural_practice: { label: "Kültürel öğe", group: "Kültür" },
  person: { label: "Tarihî kişi", group: "Hafıza" },
};

export function heritageLabel(type: HeritageEntryType): string {
  return heritageTypeMeta[type].label;
}
