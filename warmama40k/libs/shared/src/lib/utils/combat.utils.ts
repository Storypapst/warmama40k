import { Unit } from '../interfaces/unit.interface';
import { Weapon } from '../interfaces/weapon.interface';
import { CombatStep } from '../interfaces/combat.interface';
import { getWoundRollNeeded } from '../constants/wound-table';
import { parseDiceNotation, averageDiceValue } from './dice.utils';

export function buildCombatSteps(
  attacker: Unit,
  weapon: Weapon,
  defender: Unit,
  attackingModelCount: number,
): CombatStep[] {
  const steps: CombatStep[] = [];
  const abilities = weapon.abilities;

  // Calculate total attacks
  const baseAttacks = parseDiceNotation(weapon.attacks);
  let totalAttacksDesc: string;
  if (baseAttacks.type === 'fixed') {
    const total = (baseAttacks.fixed ?? 0) * attackingModelCount * abilities.attacksMultiplier;
    totalAttacksDesc = String(total);
  } else {
    totalAttacksDesc = `${attackingModelCount}x ${weapon.attacks}`;
  }

  // Blast bonus
  let blastNote = '';
  if (abilities.blast) {
    const blastBonus = Math.floor(defender.stats.modelCount / 5);
    if (blastBonus > 0) {
      blastNote = ` (+${blastBonus} from Blast vs ${defender.stats.modelCount} models)`;
    }
  }

  // Step 1: Hit Roll
  const hitModifiers: string[] = [];
  const hitSpecial: string[] = [];
  let hitTarget = weapon.ballisticSkill;

  if (abilities.autoHit) {
    steps.push({
      phase: 'hit',
      description: `This weapon auto-hits! All ${totalAttacksDesc}${blastNote} attacks hit automatically.`,
      detailedExplanation: 'Torrent weapons always hit - no dice roll needed!',
      targetNumber: 0,
      numberOfDice: 0,
      modifiers: ['Auto-hit (Torrent)'],
      specialRules: [],
    });
  } else {
    if (attacker.globalModifiers?.plusOneToHit) {
      hitTarget = Math.max(2, hitTarget - 1);
      hitModifiers.push('+1 to Hit');
    }
    if (attacker.globalModifiers?.rerollHits) {
      hitSpecial.push('Reroll all failed hits');
    }
    if (attacker.globalModifiers?.rerollOnesHits) {
      hitSpecial.push('Reroll hit rolls of 1');
    }
    if (abilities.lethalHits) {
      hitSpecial.push('Lethal Hits: natural 6s auto-wound (set aside)');
    }
    if (abilities.sustainedHits !== undefined) {
      const sh = abilities.sustainedHits;
      hitSpecial.push(`Sustained Hits ${sh}: natural 6s generate ${sh} extra hit(s)`);
    }

    steps.push({
      phase: 'hit',
      description: `Roll ${totalAttacksDesc}${blastNote} dice. You need ${hitTarget}+ to hit.`,
      detailedExplanation: `Each attack gets one D6. A result of ${hitTarget} or higher is a hit. Natural 1s always miss, natural 6s are critical hits.`,
      targetNumber: hitTarget,
      numberOfDice: totalAttacksDesc,
      modifiers: hitModifiers,
      specialRules: hitSpecial,
    });
  }

  // Step 2: Wound Roll
  const woundTarget = getWoundRollNeeded(weapon.strength, defender.stats.toughness);
  const woundModifiers: string[] = [];
  const woundSpecial: string[] = [];

  if (attacker.globalModifiers?.plusOneToWound || abilities.plusOneToWound) {
    woundModifiers.push('+1 to Wound');
  }
  if (abilities.twinLinked) {
    woundSpecial.push('Twin-linked: reroll all failed wound rolls');
  }
  if (attacker.globalModifiers?.rerollWounds) {
    woundSpecial.push('Reroll all failed wounds');
  }
  if (attacker.globalModifiers?.rerollOnesWounds) {
    woundSpecial.push('Reroll wound rolls of 1');
  }
  if (abilities.anti) {
    const defenderHasTag = defender.tags.some(
      (t) => t.toLowerCase() === abilities.anti!.targetType.toLowerCase(),
    );
    if (defenderHasTag) {
      woundSpecial.push(
        `Anti-${abilities.anti.targetType} ${abilities.anti.rollNeeded}+: critical wounds on ${abilities.anti.rollNeeded}+`,
      );
    }
  }
  if (abilities.devastatingWounds) {
    woundSpecial.push('Devastating Wounds: critical wounds become Mortal Wounds');
  }

  steps.push({
    phase: 'wound',
    description: `S${weapon.strength} vs T${defender.stats.toughness} = you need ${woundTarget}+ to wound.`,
    detailedExplanation: `Compare the weapon's Strength (${weapon.strength}) against the target's Toughness (${defender.stats.toughness}). The wound table determines the roll needed.`,
    targetNumber: woundTarget,
    numberOfDice: 'hits',
    modifiers: woundModifiers,
    specialRules: woundSpecial,
  });

  // Step 3: Saving Throws
  const ap = weapon.armourPenetration;
  const baseSave = defender.stats.armourSave;
  const modifiedSave = baseSave + ap;
  const invuln = defender.stats.invulnerableSave;
  const saveModifiers: string[] = [];
  const saveSpecial: string[] = [];

  let effectiveSave: number;
  let saveDesc: string;

  if (invuln !== null && invuln < modifiedSave) {
    effectiveSave = invuln;
    saveDesc = `Invulnerable Save ${invuln}+ (better than modified armour ${modifiedSave}+)`;
    saveModifiers.push(`AP-${ap} ignored by Invulnerable Save`);
  } else {
    effectiveSave = modifiedSave;
    saveDesc = `Armour Save ${baseSave}+ with AP-${ap} = needs ${modifiedSave}+`;
  }

  if (effectiveSave > 6) {
    saveDesc = 'Kein Rettungswurf moeglich!';
    saveSpecial.push('Alle Verwundungen gehen durch - keine Ruestung schuetzt dagegen');
  }

  if (defender.defenderGlobalModifiers?.stealth) {
    saveModifiers.push('Stealth: +1 to saving throw against ranged attacks');
  }

  steps.push({
    phase: 'save',
    description: `Defender rolls saves. ${saveDesc}`,
    detailedExplanation: `The defending player rolls D6 for each wound. They need to meet or beat the save value. AP reduces the armour save. Invulnerable saves are NOT affected by AP.`,
    targetNumber: Math.min(effectiveSave, 7),
    numberOfDice: 'wounds',
    modifiers: saveModifiers,
    specialRules: saveSpecial,
  });

  // Step 4: Damage
  const dmg = parseDiceNotation(weapon.damage);
  const avgDmg = averageDiceValue(dmg);
  const damageModifiers: string[] = [];

  if (abilities.melta) {
    damageModifiers.push(`Melta: +${abilities.melta} damage at half range`);
  }
  if (defender.defenderGlobalModifiers?.minusOneDamage) {
    damageModifiers.push('Defender reduces damage by 1 (minimum 1)');
  }
  if (defender.defenderGlobalModifiers?.halfDamage) {
    damageModifiers.push('Defender halves damage (round up)');
  }

  steps.push({
    phase: 'damage',
    description: `Each failed save = ${weapon.damage} damage (avg ${avgDmg.toFixed(1)}). Target has ${defender.stats.wounds} wound(s) per model.`,
    detailedExplanation: `Multiply failed saves by weapon damage. Allocate damage to models one at a time. When a model reaches 0 wounds, it is removed.`,
    targetNumber: 0,
    numberOfDice: 0,
    modifiers: damageModifiers,
    specialRules: [],
  });

  // Step 5: Feel No Pain (if applicable)
  const fnp = defender.defenderGlobalModifiers?.feelNoPain;
  if (fnp) {
    steps.push({
      phase: 'feel-no-pain',
      description: `Defender rolls Feel No Pain ${fnp}+ for each wound taken.`,
      detailedExplanation: `Roll a D6 for each point of damage (including Mortal Wounds). On a ${fnp}+, that wound is ignored. This is rolled AFTER saving throws.`,
      targetNumber: fnp,
      numberOfDice: 'total damage',
      modifiers: [],
      specialRules: [`Feel No Pain ${fnp}+`],
    });
  }

  return steps;
}

/**
 * Calculate a simple power rating for balance comparison.
 */
export function calculateUnitPowerRating(unit: Unit): number {
  let offensivePower = 0;

  const allWeapons = [...unit.rangedWeapons, ...unit.meleeWeapons];
  for (const weapon of allWeapons) {
    const attacks = averageDiceValue(parseDiceNotation(weapon.attacks));
    const damage = averageDiceValue(parseDiceNotation(weapon.damage));
    const hitProb = weapon.ballisticSkill === 0 ? 1 : (7 - weapon.ballisticSkill) / 6;
    const woundProb = 3 / 6; // approximate average
    offensivePower += attacks * damage * hitProb * woundProb * unit.stats.modelCount;
  }

  const saveFactor = (7 - unit.stats.armourSave) / 6;
  const defensivePower =
    unit.stats.wounds * unit.stats.modelCount * unit.stats.toughness * saveFactor;

  return offensivePower + defensivePower;
}
