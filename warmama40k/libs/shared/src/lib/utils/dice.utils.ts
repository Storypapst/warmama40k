export interface DiceExpression {
  type: 'fixed' | 'dice';
  fixed?: number;
  count?: number;
  sides?: number;
  modifier?: number;
}

const DICE_REGEX = /^(\d*)D(\d+)([+-]\d+)?$/i;

export function parseDiceNotation(notation: string): DiceExpression {
  const trimmed = notation.trim();

  const plainNumber = parseInt(trimmed, 10);
  if (!isNaN(plainNumber) && String(plainNumber) === trimmed) {
    return { type: 'fixed', fixed: plainNumber };
  }

  const match = trimmed.match(DICE_REGEX);
  if (match) {
    const count = match[1] ? parseInt(match[1], 10) : 1;
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    return { type: 'dice', count, sides, modifier };
  }

  return { type: 'fixed', fixed: 0 };
}

export function averageDiceValue(expr: DiceExpression): number {
  if (expr.type === 'fixed') return expr.fixed ?? 0;
  const avgPerDie = ((expr.sides ?? 6) + 1) / 2;
  return (expr.count ?? 1) * avgPerDie + (expr.modifier ?? 0);
}

export function maxDiceValue(expr: DiceExpression): number {
  if (expr.type === 'fixed') return expr.fixed ?? 0;
  return (expr.count ?? 1) * (expr.sides ?? 6) + (expr.modifier ?? 0);
}

export function minDiceValue(expr: DiceExpression): number {
  if (expr.type === 'fixed') return expr.fixed ?? 0;
  return (expr.count ?? 1) + (expr.modifier ?? 0);
}
