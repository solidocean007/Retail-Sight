import stringSimilarity from "string-similarity";

/**
 * Tuned brand matcher for beverage displays.
 */
export function getBrandMatches(rawCandidates: string[], companyBrands: string[]) {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Words to ignore from Vision text
  const blacklist = new Set([
    "beer", "label", "advertising", "packaging", "company",
    "retail", "logo", "brand", "brew", "brewing", "alcohol"
  ]);

  const normalizedCandidates = rawCandidates
    .map(normalize)
    .filter(c => c.length > 3 && !blacklist.has(c));

  const normalizedBrands = companyBrands.map(normalize);
  const matches: {brand: string; score: number}[] = [];

  normalizedBrands.forEach((brand, i) => {
    const brandTokens = brand.split(" ").filter(t => t.length > 2);
    for (const [rank, candidate] of normalizedCandidates.entries()) {
      const candidateTokens = candidate.split(" ").filter(t => t.length > 2);

      // token overlap requirement
      const tokenHit = brandTokens.some(bt => candidateTokens.includes(bt));
      if (!tokenHit) continue;

      // fuzzy ratio for near-matches like "lite" ↔ "miller lite"
      const ratio = stringSimilarity.compareTwoStrings(candidate, brand);

      // compute weighted score (Vision rank + ratio)
      const score = ratio * 0.7 + (1 - rank / rawCandidates.length) * 0.3;

      if (ratio > 0.45 || tokenHit) {
        matches.push({ brand: companyBrands[i], score });
      }
    }
  });

  // Sort and dedupe by best score
  const unique = new Map<string, number>();
  for (const { brand, score } of matches) {
    if (!unique.has(brand) || unique.get(brand)! < score) unique.set(brand, score);
  }

  // keep top 8 with score ≥ 0.5
  return Array.from(unique.entries())
    .filter(([_, score]) => score >= 0.75)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([brand]) => brand);
}
