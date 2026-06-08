// Shared helpers for reconciling Fish Rules naming with our species model.

// "Amberjack, Greater" -> "greater amberjack"; "Black Sea Bass" -> "black sea
// bass". Leaves comma-free names lowercased.
export function normalizeCommonName(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const comma = trimmed.indexOf(",");
  if (comma === -1) return trimmed;
  const head = trimmed.slice(0, comma).trim();
  const tail = trimmed.slice(comma + 1).trim();
  return `${tail} ${head}`.trim();
}

// Fish Rules lists the scientific name among free-text synonyms. Pick the first
// entry that looks like a binomial ("Genus species"), e.g. "Seriola dumerili".
const BINOMIAL = /^[A-Z][a-z]+ [a-z][a-z-]+$/;

export function scientificFromSynonyms(
  synonyms: string[] | undefined
): string | null {
  for (const synonym of synonyms ?? []) {
    if (BINOMIAL.test(synonym.trim())) return synonym.trim();
  }
  return null;
}
