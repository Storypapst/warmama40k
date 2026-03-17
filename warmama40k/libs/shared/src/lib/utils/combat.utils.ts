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
      blastNote = ` (+${blastBonus} durch Blast gegen ${defender.stats.modelCount} Modelle)`;
    }
  }

  // Step 1: Hit Roll
  const hitModifiers: string[] = [];
  const hitSpecial: string[] = [];
  let hitTarget = weapon.ballisticSkill;

  if (abilities.autoHit) {
    steps.push({
      phase: 'hit',
      description: `Diese Waffe trifft automatisch! Alle ${totalAttacksDesc}${blastNote} Attacken treffen.`,
      detailedExplanation: 'Torrent-Waffen treffen immer - kein Wuerfelwurf noetig!',
      targetNumber: 0,
      numberOfDice: 0,
      modifiers: ['Auto-Treffer (Torrent)'],
      specialRules: [],
    });
  } else {
    if (attacker.globalModifiers?.plusOneToHit) {
      hitTarget = Math.max(2, hitTarget - 1);
      hitModifiers.push('+1 auf Treffer');
    }
    if (attacker.globalModifiers?.rerollHits) {
      hitSpecial.push('Alle fehlgeschlagenen Treffer neu wuerfeln');
    }
    if (attacker.globalModifiers?.rerollOnesHits) {
      hitSpecial.push('Trefferwuerfe von 1 neu wuerfeln');
    }
    if (abilities.lethalHits) {
      hitSpecial.push('Lethal Hits: Natuerliche 6en verwunden automatisch (beiseite legen)');
    }
    if (abilities.sustainedHits !== undefined) {
      const sh = abilities.sustainedHits;
      hitSpecial.push(`Sustained Hits ${sh}: Natuerliche 6en erzeugen ${sh} extra Treffer`);
    }

    steps.push({
      phase: 'hit',
      description: `Wuerfle ${totalAttacksDesc}${blastNote} Wuerfel. Du brauchst ${hitTarget}+ zum Treffen.`,
      detailedExplanation: `Jede Attacke bekommt einen W6. Ein Ergebnis von ${hitTarget} oder hoeher ist ein Treffer. Natuerliche 1en verfehlen immer, natuerliche 6en sind kritische Treffer.`,
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
    woundModifiers.push('+1 auf Verwundung');
  }
  if (abilities.twinLinked) {
    woundSpecial.push('Twin-linked: Alle fehlgeschlagenen Verwundungswuerfe neu wuerfeln');
  }
  if (attacker.globalModifiers?.rerollWounds) {
    woundSpecial.push('Alle fehlgeschlagenen Verwundungen neu wuerfeln');
  }
  if (attacker.globalModifiers?.rerollOnesWounds) {
    woundSpecial.push('Verwundungswuerfe von 1 neu wuerfeln');
  }
  if (abilities.anti) {
    const defenderHasTag = defender.tags.some(
      (t) => t.toLowerCase() === abilities.anti!.targetType.toLowerCase(),
    );
    if (defenderHasTag) {
      woundSpecial.push(
        `Anti-${abilities.anti.targetType} ${abilities.anti.rollNeeded}+: Kritische Verwundungen ab ${abilities.anti.rollNeeded}+`,
      );
    }
  }
  if (abilities.devastatingWounds) {
    woundSpecial.push('Devastating Wounds: Kritische Verwundungen werden zu Todenwunden');
  }

  steps.push({
    phase: 'wound',
    description: `Staerke ${weapon.strength} gegen Zaehigkeit ${defender.stats.toughness} = du brauchst ${woundTarget}+ zum Verwunden.`,
    detailedExplanation: `Vergleiche die Staerke der Waffe (${weapon.strength}) mit der Zaehigkeit des Ziels (${defender.stats.toughness}). Die Verwundungstabelle bestimmt den benoetigten Wurf.`,
    targetNumber: woundTarget,
    numberOfDice: 'Treffer',
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
    saveDesc = `Unverwundbarkeitswurf ${invuln}+ (besser als modifizierte Ruestung ${modifiedSave}+)`;
    saveModifiers.push(`AP-${ap} wird durch Unverwundbarkeitswurf ignoriert`);
  } else {
    effectiveSave = modifiedSave;
    saveDesc = `Ruestungswurf ${baseSave}+ mit AP-${ap} = braucht ${modifiedSave}+`;
  }

  if (effectiveSave > 6) {
    saveDesc = 'Kein Rettungswurf moeglich!';
    saveSpecial.push('Alle Verwundungen gehen durch - keine Ruestung schuetzt dagegen');
  }

  if (defender.defenderGlobalModifiers?.stealth) {
    saveModifiers.push('Tarnung: +1 auf Rettungswuerfe gegen Fernkampfattacken');
  }

  steps.push({
    phase: 'save',
    description: `Verteidiger wuerfelt Rettungswuerfe. ${saveDesc}`,
    detailedExplanation: `Der verteidigende Spieler wuerfelt einen W6 pro Verwundung. Er muss den Rettungswert erreichen oder uebertreffen. AP reduziert den Ruestungswurf. Unverwundbarkeitswuerfe werden NICHT durch AP beeinflusst.`,
    targetNumber: Math.min(effectiveSave, 7),
    numberOfDice: 'Verwundungen',
    modifiers: saveModifiers,
    specialRules: saveSpecial,
  });

  // Step 4: Damage
  const dmg = parseDiceNotation(weapon.damage);
  const avgDmg = averageDiceValue(dmg);
  const damageModifiers: string[] = [];

  if (abilities.melta) {
    damageModifiers.push(`Melta: +${abilities.melta} Schaden auf halbe Reichweite`);
  }
  if (defender.defenderGlobalModifiers?.minusOneDamage) {
    damageModifiers.push('Verteidiger reduziert Schaden um 1 (mindestens 1)');
  }
  if (defender.defenderGlobalModifiers?.halfDamage) {
    damageModifiers.push('Verteidiger halbiert Schaden (aufrunden)');
  }

  steps.push({
    phase: 'damage',
    description: `Jeder fehlgeschlagene Rettungswurf = ${weapon.damage} Schaden (Durchschnitt ${avgDmg.toFixed(1)}). Ziel hat ${defender.stats.wounds} Lebenspunkt(e) pro Modell.`,
    detailedExplanation: `Multipliziere fehlgeschlagene Rettungswuerfe mit dem Waffenschaden. Verteile den Schaden auf Modelle nacheinander. Wenn ein Modell 0 Lebenspunkte erreicht, wird es entfernt.`,
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
      description: `Verteidiger wuerfelt Schmerzresistenz ${fnp}+ fuer jeden erlittenen Schadenspunkt.`,
      detailedExplanation: `Wuerfle einen W6 pro Schadenspunkt (inklusive Todenwunden). Bei ${fnp}+ wird der Schaden ignoriert. Dies wird NACH Rettungswuerfen gewuerfelt.`,
      targetNumber: fnp,
      numberOfDice: 'Gesamtschaden',
      modifiers: [],
      specialRules: [`Schmerzresistenz ${fnp}+`],
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
