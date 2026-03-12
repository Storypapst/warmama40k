/**
 * WH40K 10th Edition wound roll table.
 * Compare attacking weapon Strength vs defending unit Toughness.
 * Returns the D6 roll needed to wound.
 */
export function getWoundRollNeeded(strength: number, toughness: number): number {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 <= toughness) return 6;
  return 5;
}
