import { Unit } from './unit.interface';
import { Weapon } from './weapon.interface';

export type CombatStepPhase = 'hit' | 'wound' | 'save' | 'damage' | 'feel-no-pain';

export interface CombatResolution {
  attackingUnit: Unit;
  attackingWeapon: Weapon;
  defendingUnit: Unit;
  steps: CombatStep[];
}

export interface CombatStep {
  phase: CombatStepPhase;
  description: string;
  detailedExplanation: string;
  targetNumber: number;
  numberOfDice: number | string;
  modifiers: string[];
  specialRules: string[];
  result?: CombatStepResult;
}

export interface CombatStepResult {
  successes: number;
  failures: number;
  criticals: number;
  bonusEffects: string[];
}

export interface DamageAllocation {
  totalDamage: number;
  modelsKilled: number;
  woundsOnSurvivor: number;
  mortalWounds: number;
  feelNoPainSaved: number;
}
