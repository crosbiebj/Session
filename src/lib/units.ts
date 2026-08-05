// Weight is stored unit-agnostic in grams (CLAUDE.md §3, Catch logging).
// Display defaults to lb/oz per UK carp scene convention.
const GRAMS_PER_OUNCE = 28.3495231;

export function formatWeightLbOz(grams: number): string {
  const totalOunces = grams / GRAMS_PER_OUNCE;
  let lb = Math.floor(totalOunces / 16);
  let oz = Math.round(totalOunces - lb * 16);
  if (oz === 16) {
    lb += 1;
    oz = 0;
  }
  return `${lb}lb ${oz}oz`;
}
