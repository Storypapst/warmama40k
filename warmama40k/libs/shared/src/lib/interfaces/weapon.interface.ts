export interface AntiTarget {
  targetType: string;
  rollNeeded: number;
}

export interface WeaponAbilities {
  attacksMultiplier: number;
  rapidFire?: number;
  blast?: boolean;
  twinLinked?: boolean;
  autoHit?: boolean;
  ignoresCover?: boolean;
  indirectFire?: boolean;
  oneShot?: boolean;
  melta?: number;
  lethalHits?: boolean;
  sustainedHits?: number | 'D3';
  devastatingWounds?: boolean;
  anti?: AntiTarget;
  plusOneToWound?: boolean;
}

export interface Weapon {
  name: string;
  range: number | null;
  type: 'ranged' | 'melee';
  ballisticSkill: number;
  strength: number;
  armourPenetration: number;
  attacks: string;
  damage: string;
  abilities: WeaponAbilities;
}
