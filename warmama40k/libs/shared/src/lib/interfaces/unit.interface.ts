import { Weapon } from './weapon.interface';

export interface UnitStats {
  toughness: number;
  wounds: number;
  movement: number;
  leadership: number;
  objectiveControl: number;
  armourSave: number;
  invulnerableSave: number | null;
  modelCount: number;
}

export interface GlobalModifiers {
  plusOneToHit?: boolean;
  plusOneToWound?: boolean;
  rerollHits?: boolean;
  rerollOnesHits?: boolean;
  rerollWounds?: boolean;
  rerollOnesWounds?: boolean;
}

export interface DefenderGlobalModifiers {
  feelNoPain?: number;
  stealth?: boolean;
  minusOneDamage?: boolean;
  halfDamage?: boolean;
  heal?: boolean;
  healD3Wounds?: boolean;
  healOneModel?: boolean;
}

export interface CompositionOption {
  modelCount: number;
  points: number;
}

export interface UnitComposition {
  defaultModelCount: number;
  minModelCount: number;
  maxModelCount: number;
  compositionOptions: CompositionOption[];
}

export interface Unit {
  id: string;
  name: string;
  faction: string;
  points: number;
  unitType: 'model' | 'unit';
  stats: UnitStats;
  composition: UnitComposition;
  globalModifiers: GlobalModifiers | null;
  defenderGlobalModifiers: DefenderGlobalModifiers | null;
  tags: string[];
  rangedWeapons: Weapon[];
  meleeWeapons: Weapon[];
  photoUrl?: string;
}
