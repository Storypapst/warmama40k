export interface ArmyList {
  id: string;
  name: string;
  playerId: string;
  targetPoints: number;
  actualPoints: number;
  factionGroups: FactionGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface FactionGroup {
  faction: string;
  units: ArmyUnit[];
  totalPoints: number;
}

export interface ArmyUnit {
  unitId: string;
  selectedModelCount: number;
  selectedWeapons: string[];
  points: number;
}

export interface BalanceSuggestion {
  player1Army: ArmyList;
  player2Army: ArmyList;
  balanceScore: number;
  reasoning: string;
  swapSuggestions: SwapSuggestion[];
}

export interface SwapSuggestion {
  fromPlayer: string;
  toPlayer: string;
  unit: string;
  reason: string;
  impactOnBalance: number;
}
