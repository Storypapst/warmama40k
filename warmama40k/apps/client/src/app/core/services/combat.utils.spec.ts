import { buildCombatSteps, calculateUnitPowerRating } from '@warmama40k/shared';
import type { Unit, Weapon } from '@warmama40k/shared';

function makeWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return {
    name: 'Bolt Rifle',
    range: 24,
    type: 'ranged',
    ballisticSkill: 3,
    strength: 4,
    armourPenetration: 1,
    attacks: '2',
    damage: '1',
    abilities: { attacksMultiplier: 1 },
    ...overrides,
  };
}

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'test-unit',
    name: 'Test Unit',
    faction: 'Space Marines',
    points: 100,
    unitType: 'unit',
    stats: {
      toughness: 4,
      wounds: 2,
      movement: 6,
      leadership: 6,
      objectiveControl: 1,
      armourSave: 3,
      invulnerableSave: null,
      modelCount: 5,
    },
    composition: {
      defaultModelCount: 5,
      minModelCount: 5,
      maxModelCount: 10,
      compositionOptions: [{ modelCount: 5, points: 100 }],
    },
    globalModifiers: null,
    defenderGlobalModifiers: null,
    tags: [],
    rangedWeapons: [makeWeapon()],
    meleeWeapons: [],
    ...overrides,
  };
}

describe('buildCombatSteps', () => {
  it('should return steps with German descriptions', () => {
    const attacker = makeUnit();
    const weapon = makeWeapon();
    const defender = makeUnit({ id: 'def' });

    const steps = buildCombatSteps(attacker, weapon, defender, 5);

    expect(steps.length).toBeGreaterThanOrEqual(4);
    // All descriptions should be in German (no English keywords)
    for (const step of steps) {
      expect(step.description).not.toMatch(/\bRoll\b/i);
      expect(step.description).not.toMatch(/\bYou need\b/i);
      expect(step.description).not.toMatch(/\bDefender rolls\b/i);
      expect(step.description).not.toMatch(/\beach failed save\b/i);
    }
  });

  it('should produce hit, wound, save, damage phases', () => {
    const steps = buildCombatSteps(makeUnit(), makeWeapon(), makeUnit(), 1);
    const phases = steps.map((s) => s.phase);
    expect(phases).toEqual(['hit', 'wound', 'save', 'damage']);
  });

  it('should calculate correct total attacks for fixed attacks', () => {
    const weapon = makeWeapon({ attacks: '3' });
    const steps = buildCombatSteps(makeUnit(), weapon, makeUnit(), 4);
    const hitStep = steps.find((s) => s.phase === 'hit')!;
    // 3 attacks × 4 models × 1 multiplier = 12
    expect(hitStep.description).toContain('12');
  });

  it('should show dice notation for variable attacks', () => {
    const weapon = makeWeapon({ attacks: 'D6' });
    const steps = buildCombatSteps(makeUnit(), weapon, makeUnit(), 3);
    const hitStep = steps.find((s) => s.phase === 'hit')!;
    expect(hitStep.description).toContain('3x D6');
  });

  it('should handle auto-hit (Torrent) weapons', () => {
    const weapon = makeWeapon({
      attacks: '6',
      abilities: { attacksMultiplier: 1, autoHit: true },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, makeUnit(), 1);
    const hitStep = steps.find((s) => s.phase === 'hit')!;
    expect(hitStep.description).toContain('automatisch');
    expect(hitStep.modifiers).toContain('Auto-Treffer (Torrent)');
  });

  it('should show blast bonus for large target units', () => {
    const weapon = makeWeapon({
      attacks: '3',
      abilities: { attacksMultiplier: 1, blast: true },
    });
    const defender = makeUnit({
      stats: {
        toughness: 4, wounds: 1, movement: 6, leadership: 6,
        objectiveControl: 1, armourSave: 5, invulnerableSave: null,
        modelCount: 11,
      },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, defender, 1);
    const hitStep = steps.find((s) => s.phase === 'hit')!;
    // 11/5 = 2 blast bonus
    expect(hitStep.description).toContain('Blast');
    expect(hitStep.description).toContain('+2');
  });

  it('should include lethal hits special rule in German', () => {
    const weapon = makeWeapon({
      abilities: { attacksMultiplier: 1, lethalHits: true },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, makeUnit(), 1);
    const hitStep = steps.find((s) => s.phase === 'hit')!;
    expect(hitStep.specialRules.some((r) => r.includes('Lethal Hits'))).toBe(true);
    expect(hitStep.specialRules.some((r) => r.includes('automatisch'))).toBe(true);
  });

  it('should include sustained hits special rule', () => {
    const weapon = makeWeapon({
      abilities: { attacksMultiplier: 1, sustainedHits: 2 },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, makeUnit(), 1);
    const hitStep = steps.find((s) => s.phase === 'hit')!;
    expect(hitStep.specialRules.some((r) => r.includes('Sustained Hits 2'))).toBe(true);
  });

  it('should calculate wound target correctly (S=T → 4+)', () => {
    const weapon = makeWeapon({ strength: 4 });
    const defender = makeUnit({
      stats: {
        toughness: 4, wounds: 2, movement: 6, leadership: 6,
        objectiveControl: 1, armourSave: 3, invulnerableSave: null,
        modelCount: 5,
      },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, defender, 1);
    const woundStep = steps.find((s) => s.phase === 'wound')!;
    expect(woundStep.targetNumber).toBe(4);
    expect(woundStep.description).toContain('4+');
  });

  it('should calculate wound target correctly (S>T → 3+)', () => {
    const weapon = makeWeapon({ strength: 6 });
    const defender = makeUnit({
      stats: {
        toughness: 4, wounds: 2, movement: 6, leadership: 6,
        objectiveControl: 1, armourSave: 3, invulnerableSave: null,
        modelCount: 5,
      },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, defender, 1);
    const woundStep = steps.find((s) => s.phase === 'wound')!;
    expect(woundStep.targetNumber).toBe(3);
  });

  it('should calculate wound target correctly (S>=2*T → 2+)', () => {
    const weapon = makeWeapon({ strength: 8 });
    const defender = makeUnit({
      stats: {
        toughness: 4, wounds: 2, movement: 6, leadership: 6,
        objectiveControl: 1, armourSave: 3, invulnerableSave: null,
        modelCount: 5,
      },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, defender, 1);
    const woundStep = steps.find((s) => s.phase === 'wound')!;
    expect(woundStep.targetNumber).toBe(2);
  });

  it('should use invulnerable save when better than modified armour', () => {
    const weapon = makeWeapon({ armourPenetration: 3 }); // AP-3
    const defender = makeUnit({
      stats: {
        toughness: 4, wounds: 3, movement: 6, leadership: 6,
        objectiveControl: 1, armourSave: 3, invulnerableSave: 4,
        modelCount: 1,
      },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, defender, 1);
    const saveStep = steps.find((s) => s.phase === 'save')!;
    // Armour 3+ with AP-3 = 6+, invuln 4+ is better
    expect(saveStep.targetNumber).toBe(4);
    expect(saveStep.description).toContain('Unverwundbarkeitswurf');
  });

  it('should show no save possible when modified save > 6', () => {
    const weapon = makeWeapon({ armourPenetration: 4 }); // AP-4
    const defender = makeUnit({
      stats: {
        toughness: 4, wounds: 1, movement: 6, leadership: 6,
        objectiveControl: 1, armourSave: 5, invulnerableSave: null,
        modelCount: 10,
      },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, defender, 1);
    const saveStep = steps.find((s) => s.phase === 'save')!;
    expect(saveStep.description).toContain('Kein Rettungswurf moeglich');
  });

  it('should show damage step with German text', () => {
    const weapon = makeWeapon({ damage: '2' });
    const defender = makeUnit({
      stats: {
        toughness: 4, wounds: 3, movement: 6, leadership: 6,
        objectiveControl: 1, armourSave: 3, invulnerableSave: null,
        modelCount: 5,
      },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, defender, 1);
    const dmgStep = steps.find((s) => s.phase === 'damage')!;
    expect(dmgStep.description).toContain('Schaden');
    expect(dmgStep.description).toContain('Lebenspunkt');
  });

  it('should include feel-no-pain step when defender has FNP', () => {
    const defender = makeUnit({
      defenderGlobalModifiers: { feelNoPain: 5 },
    });
    const steps = buildCombatSteps(makeUnit(), makeWeapon(), defender, 1);
    const fnpStep = steps.find((s) => s.phase === 'feel-no-pain');
    expect(fnpStep).toBeDefined();
    expect(fnpStep!.targetNumber).toBe(5);
    expect(fnpStep!.description).toContain('Schmerzresistenz');
  });

  it('should not include feel-no-pain step when defender has no FNP', () => {
    const steps = buildCombatSteps(makeUnit(), makeWeapon(), makeUnit(), 1);
    const fnpStep = steps.find((s) => s.phase === 'feel-no-pain');
    expect(fnpStep).toBeUndefined();
  });

  it('should handle devastating wounds special rule', () => {
    const weapon = makeWeapon({
      abilities: { attacksMultiplier: 1, devastatingWounds: true },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, makeUnit(), 1);
    const woundStep = steps.find((s) => s.phase === 'wound')!;
    expect(woundStep.specialRules.some((r) => r.includes('Devastating Wounds'))).toBe(true);
    expect(woundStep.specialRules.some((r) => r.includes('Todenwunden'))).toBe(true);
  });

  it('should apply +1 to hit modifier', () => {
    const attacker = makeUnit({
      globalModifiers: { plusOneToHit: true },
    });
    const weapon = makeWeapon({ ballisticSkill: 3 });
    const steps = buildCombatSteps(attacker, weapon, makeUnit(), 1);
    const hitStep = steps.find((s) => s.phase === 'hit')!;
    expect(hitStep.targetNumber).toBe(2); // 3 - 1 = 2
    expect(hitStep.modifiers).toContain('+1 auf Treffer');
  });

  it('should include melta modifier in damage step', () => {
    const weapon = makeWeapon({
      abilities: { attacksMultiplier: 1, melta: 2 },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, makeUnit(), 1);
    const dmgStep = steps.find((s) => s.phase === 'damage')!;
    expect(dmgStep.modifiers.some((m) => m.includes('Melta'))).toBe(true);
  });

  it('should include twin-linked in wound step', () => {
    const weapon = makeWeapon({
      abilities: { attacksMultiplier: 1, twinLinked: true },
    });
    const steps = buildCombatSteps(makeUnit(), weapon, makeUnit(), 1);
    const woundStep = steps.find((s) => s.phase === 'wound')!;
    expect(woundStep.specialRules.some((r) => r.includes('Twin-linked'))).toBe(true);
  });

  it('should include stealth modifier in save step', () => {
    const defender = makeUnit({
      defenderGlobalModifiers: { stealth: true },
    });
    const steps = buildCombatSteps(makeUnit(), makeWeapon(), defender, 1);
    const saveStep = steps.find((s) => s.phase === 'save')!;
    expect(saveStep.modifiers.some((m) => m.includes('Tarnung'))).toBe(true);
  });

  it('should include defender damage reduction modifiers', () => {
    const defender = makeUnit({
      defenderGlobalModifiers: { minusOneDamage: true, halfDamage: true },
    });
    const steps = buildCombatSteps(makeUnit(), makeWeapon(), defender, 1);
    const dmgStep = steps.find((s) => s.phase === 'damage')!;
    expect(dmgStep.modifiers.some((m) => m.includes('reduziert'))).toBe(true);
    expect(dmgStep.modifiers.some((m) => m.includes('halbiert'))).toBe(true);
  });
});

describe('calculateUnitPowerRating', () => {
  it('should return a positive number for a unit with weapons', () => {
    const unit = makeUnit();
    const rating = calculateUnitPowerRating(unit);
    expect(rating).toBeGreaterThan(0);
  });

  it('should rate a stronger unit higher', () => {
    const weak = makeUnit({
      rangedWeapons: [makeWeapon({ strength: 3, attacks: '1', damage: '1' })],
      stats: {
        toughness: 3, wounds: 1, movement: 6, leadership: 6,
        objectiveControl: 1, armourSave: 5, invulnerableSave: null,
        modelCount: 5,
      },
    });
    const strong = makeUnit({
      rangedWeapons: [makeWeapon({ strength: 8, attacks: '4', damage: '3' })],
      stats: {
        toughness: 8, wounds: 12, movement: 10, leadership: 6,
        objectiveControl: 3, armourSave: 2, invulnerableSave: 4,
        modelCount: 1,
      },
    });
    expect(calculateUnitPowerRating(strong)).toBeGreaterThan(calculateUnitPowerRating(weak));
  });

  it('should handle auto-hit weapons (BS=0)', () => {
    const unit = makeUnit({
      rangedWeapons: [makeWeapon({ ballisticSkill: 0, attacks: '6' })],
    });
    const rating = calculateUnitPowerRating(unit);
    expect(rating).toBeGreaterThan(0);
  });
});
