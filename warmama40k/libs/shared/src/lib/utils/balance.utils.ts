import { Unit } from '../interfaces/unit.interface';
import { calculateUnitPowerRating } from './combat.utils';

export interface OwnedUnitRef {
  unitId: string;
  unitName: string;
  faction: string;
  points: number;
  playerId: string;
}

export interface BalanceInput {
  player1Units: OwnedUnitRef[];
  player2Units: OwnedUnitRef[];
  targetPoints: number;
  mustInclude1: string[]; // unitIds for player 1
  mustInclude2: string[]; // unitIds for player 2
  unitLookup: Map<string, Unit>;
}

export interface ArmyResult {
  units: OwnedUnitRef[];
  totalPoints: number;
  factions: { faction: string; count: number; points: number }[];
  powerRating: number;
  factionCoherenceScore: number;
}

export interface BalanceResult {
  army1: ArmyResult;
  army2: ArmyResult;
  balanceScore: number; // 0-100, 100 = perfectly balanced
  pointsDiff: number;
  powerDiff: number;
  reasoning: string;
}

/**
 * Build balanced armies from two players' unit pools.
 * Uses greedy bin-packing with faction coherence bonus,
 * then hill-climbing to minimize power difference.
 */
export function buildBalancedArmies(input: BalanceInput): BalanceResult {
  const { player1Units, player2Units, targetPoints, mustInclude1, mustInclude2, unitLookup } = input;

  // Start with must-include units
  let army1 = player1Units.filter((u) => mustInclude1.includes(u.unitId));
  let army2 = player2Units.filter((u) => mustInclude2.includes(u.unitId));
  let pts1 = army1.reduce((s, u) => s + u.points, 0);
  let pts2 = army2.reduce((s, u) => s + u.points, 0);

  // Available pools (excluding must-include)
  const available1 = player1Units
    .filter((u) => !mustInclude1.includes(u.unitId))
    .sort((a, b) => b.points - a.points);
  const available2 = player2Units
    .filter((u) => !mustInclude2.includes(u.unitId))
    .sort((a, b) => b.points - a.points);

  // Greedy fill: add units sorted by faction coherence, then points
  army1 = greedyFill(army1, available1, targetPoints, pts1);
  pts1 = army1.reduce((s, u) => s + u.points, 0);

  army2 = greedyFill(army2, available2, targetPoints, pts2);
  pts2 = army2.reduce((s, u) => s + u.points, 0);

  // Hill-climbing: try swaps to improve balance
  const result = hillClimbBalance(
    army1,
    army2,
    available1.filter((u) => !army1.some((a) => a.unitId === u.unitId)),
    available2.filter((u) => !army2.some((a) => a.unitId === u.unitId)),
    targetPoints,
    unitLookup,
    mustInclude1,
    mustInclude2
  );

  return formatResult(result.army1, result.army2, targetPoints, unitLookup);
}

function greedyFill(
  army: OwnedUnitRef[],
  available: OwnedUnitRef[],
  targetPoints: number,
  currentPoints: number
): OwnedUnitRef[] {
  const result = [...army];
  let pts = currentPoints;

  // Get existing factions for coherence bonus
  const armyFactions = new Set(result.map((u) => u.faction));

  // Sort by: same faction first (coherence), then by points descending
  const sorted = [...available].sort((a, b) => {
    const aCoherence = armyFactions.has(a.faction) ? 1 : 0;
    const bCoherence = armyFactions.has(b.faction) ? 1 : 0;
    if (bCoherence !== aCoherence) return bCoherence - aCoherence;
    return b.points - a.points;
  });

  for (const unit of sorted) {
    if (pts + unit.points <= targetPoints) {
      result.push(unit);
      pts += unit.points;
      armyFactions.add(unit.faction);
    }
  }

  return result;
}

function hillClimbBalance(
  army1: OwnedUnitRef[],
  army2: OwnedUnitRef[],
  pool1: OwnedUnitRef[],
  pool2: OwnedUnitRef[],
  targetPoints: number,
  unitLookup: Map<string, Unit>,
  mustInclude1: string[],
  mustInclude2: string[]
): { army1: OwnedUnitRef[]; army2: OwnedUnitRef[] } {
  let best1 = [...army1];
  let best2 = [...army2];
  let bestScore = evaluateBalance(best1, best2, targetPoints, unitLookup);
  let improved = true;
  let iterations = 0;
  const maxIterations = 200;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Try swapping a unit in army1 with one from pool1
    for (const armyUnit of best1) {
      if (mustInclude1.includes(armyUnit.unitId)) continue;

      for (const poolUnit of pool1) {
        const newArmy1 = best1.map((u) =>
          u.unitId === armyUnit.unitId ? poolUnit : u
        );
        const newPts = newArmy1.reduce((s, u) => s + u.points, 0);
        if (newPts > targetPoints) continue;

        const score = evaluateBalance(newArmy1, best2, targetPoints, unitLookup);
        if (score > bestScore) {
          best1 = newArmy1;
          bestScore = score;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }

    // Try swapping a unit in army2 with one from pool2
    for (const armyUnit of best2) {
      if (mustInclude2.includes(armyUnit.unitId)) continue;

      for (const poolUnit of pool2) {
        const newArmy2 = best2.map((u) =>
          u.unitId === armyUnit.unitId ? poolUnit : u
        );
        const newPts = newArmy2.reduce((s, u) => s + u.points, 0);
        if (newPts > targetPoints) continue;

        const score = evaluateBalance(best1, newArmy2, targetPoints, unitLookup);
        if (score > bestScore) {
          best2 = newArmy2;
          bestScore = score;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return { army1: best1, army2: best2 };
}

function evaluateBalance(
  army1: OwnedUnitRef[],
  army2: OwnedUnitRef[],
  targetPoints: number,
  unitLookup: Map<string, Unit>
): number {
  const pts1 = army1.reduce((s, u) => s + u.points, 0);
  const pts2 = army2.reduce((s, u) => s + u.points, 0);

  // Penalty for being far from target points
  const ptsScore = 100 - (Math.abs(pts1 - pts2) / targetPoints) * 100;

  // Power rating balance
  const power1 = army1.reduce((s, u) => {
    const unit = unitLookup.get(u.unitId);
    return s + (unit ? calculateUnitPowerRating(unit) : 0);
  }, 0);
  const power2 = army2.reduce((s, u) => {
    const unit = unitLookup.get(u.unitId);
    return s + (unit ? calculateUnitPowerRating(unit) : 0);
  }, 0);
  const maxPower = Math.max(power1, power2, 1);
  const powerScore = 100 - (Math.abs(power1 - power2) / maxPower) * 100;

  // Faction coherence bonus: fewer factions = better
  const factions1 = new Set(army1.map((u) => u.faction)).size;
  const factions2 = new Set(army2.map((u) => u.faction)).size;
  const coherenceScore = 100 - (factions1 + factions2) * 5;

  // Points utilization: closer to target = better
  const util1 = pts1 / targetPoints;
  const util2 = pts2 / targetPoints;
  const utilizationScore = ((util1 + util2) / 2) * 100;

  return ptsScore * 0.3 + powerScore * 0.4 + coherenceScore * 0.1 + utilizationScore * 0.2;
}

function formatResult(
  army1: OwnedUnitRef[],
  army2: OwnedUnitRef[],
  targetPoints: number,
  unitLookup: Map<string, Unit>
): BalanceResult {
  const buildArmyResult = (units: OwnedUnitRef[]): ArmyResult => {
    const totalPoints = units.reduce((s, u) => s + u.points, 0);
    const factionMap = new Map<string, { count: number; points: number }>();
    for (const u of units) {
      const f = factionMap.get(u.faction) ?? { count: 0, points: 0 };
      f.count++;
      f.points += u.points;
      factionMap.set(u.faction, f);
    }
    const factions = Array.from(factionMap.entries())
      .map(([faction, data]) => ({ faction, ...data }))
      .sort((a, b) => b.points - a.points);

    const powerRating = units.reduce((s, u) => {
      const unit = unitLookup.get(u.unitId);
      return s + (unit ? calculateUnitPowerRating(unit) : 0);
    }, 0);

    const factionCoherenceScore =
      factions.length <= 1 ? 100 : Math.max(0, 100 - (factions.length - 1) * 20);

    return { units, totalPoints, factions, powerRating, factionCoherenceScore };
  };

  const a1 = buildArmyResult(army1);
  const a2 = buildArmyResult(army2);

  const pointsDiff = Math.abs(a1.totalPoints - a2.totalPoints);
  const maxPower = Math.max(a1.powerRating, a2.powerRating, 1);
  const powerDiff = Math.abs(a1.powerRating - a2.powerRating);
  const balanceScore = Math.round(
    Math.max(0, 100 - (pointsDiff / targetPoints) * 50 - (powerDiff / maxPower) * 50)
  );

  const reasons: string[] = [];
  if (pointsDiff <= 10) reasons.push('Punkte fast identisch');
  else if (pointsDiff <= 50) reasons.push(`${pointsDiff} Punkte Unterschied - akzeptabel`);
  else reasons.push(`${pointsDiff} Punkte Unterschied - etwas ungleich`);

  if (powerDiff / maxPower < 0.1) reasons.push('Kampfkraft sehr ausgeglichen');
  else if (powerDiff / maxPower < 0.25) reasons.push('Kampfkraft leicht unterschiedlich');
  else reasons.push('Kampfkraft deutlich unterschiedlich');

  return {
    army1: a1,
    army2: a2,
    balanceScore,
    pointsDiff,
    powerDiff,
    reasoning: reasons.join('. ') + '.',
  };
}
