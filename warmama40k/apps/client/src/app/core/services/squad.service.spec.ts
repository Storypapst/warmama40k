import { SquadService } from './squad.service';
import type { SquadModel } from './player.service';
import type { GameUnitState } from './game.service';
import type { Unit } from '@warmama40k/shared';

describe('SquadService', () => {
  let service: SquadService;

  beforeEach(() => {
    service = new SquadService();
  });

  describe('computeWeaponGroups', () => {
    it('should group models with identical loadouts', () => {
      const models: SquadModel[] = [
        { modelIndex: 0, weaponLoadout: ['Bolter'] },
        { modelIndex: 1, weaponLoadout: ['Bolter'] },
        { modelIndex: 2, weaponLoadout: ['Raketenwerfer'] },
        { modelIndex: 3, weaponLoadout: ['Bolter'] },
        { modelIndex: 4, weaponLoadout: ['Raketenwerfer'] },
      ];
      const groups = service.computeWeaponGroups(models);
      expect(groups).toHaveLength(2);
      expect(groups[0].modelIndices).toEqual([0, 1, 3]); // Bolter (3 models, largest first)
      expect(groups[1].modelIndices).toEqual([2, 4]); // Raketenwerfer (2 models)
    });

    it('should handle a single model', () => {
      const models: SquadModel[] = [
        { modelIndex: 0, weaponLoadout: ['Power Sword', 'Bolt Pistol'] },
      ];
      const groups = service.computeWeaponGroups(models);
      expect(groups).toHaveLength(1);
      expect(groups[0].modelIndices).toEqual([0]);
      expect(groups[0].weaponLoadout).toEqual(['Bolt Pistol', 'Power Sword']); // sorted
    });

    it('should treat all models with same weapon as one group', () => {
      const models: SquadModel[] = [
        { modelIndex: 0, weaponLoadout: ['Slugga'] },
        { modelIndex: 1, weaponLoadout: ['Slugga'] },
        { modelIndex: 2, weaponLoadout: ['Slugga'] },
      ];
      const groups = service.computeWeaponGroups(models);
      expect(groups).toHaveLength(1);
      expect(groups[0].modelIndices).toEqual([0, 1, 2]);
    });

    it('should create separate groups for all different weapons', () => {
      const models: SquadModel[] = [
        { modelIndex: 0, weaponLoadout: ['Bolter'] },
        { modelIndex: 1, weaponLoadout: ['Flamer'] },
        { modelIndex: 2, weaponLoadout: ['Melta'] },
      ];
      const groups = service.computeWeaponGroups(models);
      expect(groups).toHaveLength(3);
    });

    it('should handle empty models array', () => {
      const groups = service.computeWeaponGroups([]);
      expect(groups).toEqual([]);
    });

    it('should normalize weapon order when grouping', () => {
      const models: SquadModel[] = [
        { modelIndex: 0, weaponLoadout: ['Sword', 'Pistol'] },
        { modelIndex: 1, weaponLoadout: ['Pistol', 'Sword'] }, // same weapons, different order
      ];
      const groups = service.computeWeaponGroups(models);
      expect(groups).toHaveLength(1); // should be grouped together
      expect(groups[0].modelIndices).toEqual([0, 1]);
    });
  });

  describe('buildDefaultSquadModels', () => {
    it('should assign first ranged + melee weapon to all models', () => {
      const unit = {
        rangedWeapons: [{ name: 'Bolter' }, { name: 'Melta' }],
        meleeWeapons: [{ name: 'Chainsword' }, { name: 'Power Fist' }],
      } as unknown as Unit;

      const models = service.buildDefaultSquadModels(unit, 5);
      expect(models).toHaveLength(5);
      expect(models[0].modelIndex).toBe(0);
      expect(models[0].weaponLoadout).toEqual(['Bolter', 'Chainsword']);
      expect(models[4].modelIndex).toBe(4);
      expect(models[4].weaponLoadout).toEqual(['Bolter', 'Chainsword']);
    });

    it('should handle unit with no weapons', () => {
      const unit = {
        rangedWeapons: [],
        meleeWeapons: [],
      } as unknown as Unit;

      const models = service.buildDefaultSquadModels(unit, 3);
      expect(models).toHaveLength(3);
      expect(models[0].weaponLoadout).toEqual([]);
    });

    it('should handle unit with only ranged weapons', () => {
      const unit = {
        rangedWeapons: [{ name: 'Big Shoota' }],
        meleeWeapons: [],
      } as unknown as Unit;

      const models = service.buildDefaultSquadModels(unit, 2);
      expect(models[0].weaponLoadout).toEqual(['Big Shoota']);
    });

    it('should handle single model unit', () => {
      const unit = {
        rangedWeapons: [{ name: 'Storm Bolter' }],
        meleeWeapons: [{ name: 'Guardian Spear' }],
      } as unknown as Unit;

      const models = service.buildDefaultSquadModels(unit, 1);
      expect(models).toHaveLength(1);
      expect(models[0].modelIndex).toBe(0);
    });
  });

  describe('getWeaponGroupSummary', () => {
    it('should format multi-group summary', () => {
      const groups = [
        { weaponLoadout: ['Bolter'], modelIndices: [0, 1, 2] },
        { weaponLoadout: ['Raketenwerfer'], modelIndices: [3, 4] },
      ];
      expect(service.getWeaponGroupSummary(groups)).toBe(
        '3x Bolter, 2x Raketenwerfer'
      );
    });

    it('should format single group without count prefix', () => {
      const groups = [
        { weaponLoadout: ['Bolter'], modelIndices: [0] },
      ];
      expect(service.getWeaponGroupSummary(groups)).toBe('Bolter');
    });

    it('should join multi-weapon loadouts with +', () => {
      const groups = [
        { weaponLoadout: ['Bolt Pistol', 'Power Sword'], modelIndices: [0, 1] },
      ];
      expect(service.getWeaponGroupSummary(groups)).toBe(
        '2x Bolt Pistol + Power Sword'
      );
    });

    it('should return "Keine Waffen" for empty groups', () => {
      expect(service.getWeaponGroupSummary([])).toBe('Keine Waffen');
    });
  });

  describe('getLiveModels / getDeadModels', () => {
    const baseState: GameUnitState = {
      unitId: 'u1',
      unitName: 'Boyz',
      faction: 'Orks',
      points: 80,
      currentWounds: 1,
      maxWounds: 1,
      modelsRemaining: 3,
      maxModels: 5,
      isDestroyed: false,
      hasMoved: false,
      hasShot: false,
      hasCharged: false,
      hasFought: false,
      hasAdvanced: false,
      hasFallenBack: false,
      deadModelIndices: [1, 3],
    };

    it('should return correct live model indices', () => {
      expect(service.getLiveModels(baseState)).toEqual([0, 2, 4]);
    });

    it('should return correct dead model indices', () => {
      expect(service.getDeadModels(baseState)).toEqual([1, 3]);
    });

    it('should handle no dead models', () => {
      const state = { ...baseState, deadModelIndices: [] };
      expect(service.getLiveModels(state)).toEqual([0, 1, 2, 3, 4]);
      expect(service.getDeadModels(state)).toEqual([]);
    });

    it('should handle undefined deadModelIndices (backward compat)', () => {
      const state = { ...baseState, deadModelIndices: undefined };
      expect(service.getLiveModels(state)).toEqual([0, 1, 2, 3, 4]);
      expect(service.getDeadModels(state)).toEqual([]);
    });

    it('should handle all models dead', () => {
      const state = {
        ...baseState,
        deadModelIndices: [0, 1, 2, 3, 4],
        isDestroyed: true,
        modelsRemaining: 0,
      };
      expect(service.getLiveModels(state)).toEqual([]);
      expect(service.getDeadModels(state)).toEqual([0, 1, 2, 3, 4]);
    });
  });
});
