/** Short clan title: strip trailing "Ailesi" / noise, keep human casing. */
export function normalizeFamilyName(raw: string): string {
  let name = raw.trim().replace(/\s+/g, " ");
  name = name.replace(/\s+ailesi\.?$/iu, "");
  name = name.replace(/\s+family\.?$/iu, "");
  return name.trim();
}
