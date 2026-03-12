import { CompositionOption } from '../interfaces/unit.interface';

export function getPointsForModelCount(
  compositionOptions: CompositionOption[],
  modelCount: number,
): number | null {
  const option = compositionOptions.find((o) => o.modelCount === modelCount);
  return option?.points ?? null;
}

export function getClosestCompositionOption(
  compositionOptions: CompositionOption[],
  desiredModelCount: number,
): CompositionOption | null {
  if (compositionOptions.length === 0) return null;

  return compositionOptions.reduce((closest, current) => {
    const closestDiff = Math.abs(closest.modelCount - desiredModelCount);
    const currentDiff = Math.abs(current.modelCount - desiredModelCount);
    return currentDiff < closestDiff ? current : closest;
  });
}
