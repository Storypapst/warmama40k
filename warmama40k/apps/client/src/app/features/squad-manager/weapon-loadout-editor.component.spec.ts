import { Injector, runInInjectionContext, EventEmitter } from '@angular/core';
import { WeaponLoadoutEditorComponent } from './weapon-loadout-editor.component';
import { SquadService } from '../../core/services/squad.service';
import type { Unit } from '@warmama40k/shared';
import type { SquadModel } from '../../core/services/player.service';

/**
 * Unit tests for WeaponLoadoutEditorComponent logic.
 * Uses runInInjectionContext to satisfy inject() calls.
 */
describe('WeaponLoadoutEditorComponent', () => {
  let component: WeaponLoadoutEditorComponent;
  let emittedValues: SquadModel[][];
  let injector: Injector;

  const mockUnit: Unit = {
    rangedWeapons: [
      { name: 'Bolter' },
      { name: 'Flamer' },
    ],
    meleeWeapons: [
      { name: 'Chainsword' },
    ],
  } as unknown as Unit;

  const mockUnitNoWeapons: Unit = {
    rangedWeapons: [],
    meleeWeapons: [],
  } as unknown as Unit;

  beforeEach(() => {
    injector = Injector.create({
      providers: [
        { provide: SquadService, useFactory: () => new SquadService() },
      ],
    });

    component = runInInjectionContext(injector, () => new WeaponLoadoutEditorComponent());
    component.modelsChanged = new EventEmitter<SquadModel[]>();
    emittedValues = [];
    component.modelsChanged.subscribe((v: SquadModel[]) => emittedValues.push(v));
  });

  describe('initialization', () => {
    it('should use initialModels when provided', () => {
      const initial: SquadModel[] = [
        { modelIndex: 0, weaponLoadout: ['Flamer'] },
        { modelIndex: 1, weaponLoadout: ['Bolter'] },
      ];
      component.unitData = mockUnit;
      component.initialModels = initial;
      component.modelCount = 2;

      component.ngOnInit();

      expect(component.models()).toHaveLength(2);
      expect(component.models()[0].weaponLoadout).toEqual(['Flamer']);
      expect(component.models()[1].weaponLoadout).toEqual(['Bolter']);
      expect(emittedValues).toHaveLength(0);
    });

    it('should build defaults when no initialModels provided', () => {
      component.unitData = mockUnit;
      component.initialModels = [];
      component.modelCount = 3;

      component.ngOnInit();

      expect(component.models()).toHaveLength(3);
      for (const m of component.models()) {
        expect(m.weaponLoadout).toEqual(['Bolter', 'Chainsword']);
      }
    });

    it('should NOT emit synchronously during ngOnInit (prevents re-render loop)', () => {
      component.unitData = mockUnit;
      component.initialModels = [];
      component.modelCount = 2;

      component.ngOnInit();

      expect(emittedValues).toHaveLength(0);
    });

    it('should handle unit with no weapons', () => {
      component.unitData = mockUnitNoWeapons;
      component.initialModels = [];
      component.modelCount = 2;

      component.ngOnInit();

      expect(component.models()).toHaveLength(2);
      expect(component.models()[0].weaponLoadout).toEqual([]);
    });
  });

  describe('weapon operations', () => {
    beforeEach(() => {
      component.unitData = mockUnit;
      component.initialModels = [
        { modelIndex: 0, weaponLoadout: ['Bolter'] },
        { modelIndex: 1, weaponLoadout: ['Bolter'] },
      ];
      component.modelCount = 2;
      component.ngOnInit();
      emittedValues = [];
    });

    it('toggleWeapon should add a weapon', () => {
      component.toggleWeapon(0, 'Chainsword');

      expect(component.models()[0].weaponLoadout).toContain('Chainsword');
      expect(component.models()[0].weaponLoadout).toContain('Bolter');
      expect(emittedValues).toHaveLength(1);
    });

    it('toggleWeapon should remove a weapon', () => {
      component.toggleWeapon(0, 'Bolter');

      expect(component.models()[0].weaponLoadout).not.toContain('Bolter');
      expect(emittedValues).toHaveLength(1);
    });

    it('toggleWeapon should not affect other models', () => {
      component.toggleWeapon(0, 'Chainsword');

      expect(component.models()[1].weaponLoadout).toEqual(['Bolter']);
    });

    it('setMainWeapon should replace first weapon', () => {
      component.setMainWeapon(0, 'Flamer');

      expect(component.models()[0].weaponLoadout[0]).toBe('Flamer');
      expect(emittedValues).toHaveLength(1);
    });

    it('setMainWeapon should keep secondary weapons', () => {
      component.toggleWeapon(0, 'Chainsword');
      emittedValues = [];

      component.setMainWeapon(0, 'Flamer');

      expect(component.models()[0].weaponLoadout).toEqual(['Flamer', 'Chainsword']);
    });

    it('getMainWeapon should return first weapon', () => {
      const model = component.models()[0];
      expect(component.getMainWeapon(model)).toBe('Bolter');
    });

    it('getMainWeapon should return empty string for empty loadout', () => {
      expect(component.getMainWeapon({ modelIndex: 0, weaponLoadout: [] })).toBe('');
    });
  });

  describe('isWeaponSelected', () => {
    beforeEach(() => {
      component.unitData = mockUnit;
      component.initialModels = [
        { modelIndex: 0, weaponLoadout: ['Bolter', 'Chainsword'] },
      ];
      component.modelCount = 1;
      component.ngOnInit();
    });

    it('should return true for equipped weapon', () => {
      expect(component.isWeaponSelected(0, 'Bolter')).toBe(true);
      expect(component.isWeaponSelected(0, 'Chainsword')).toBe(true);
    });

    it('should return false for unequipped weapon', () => {
      expect(component.isWeaponSelected(0, 'Flamer')).toBe(false);
    });

    it('should return false for non-existent model', () => {
      expect(component.isWeaponSelected(99, 'Bolter')).toBe(false);
    });
  });

  describe('group operations (large squads)', () => {
    beforeEach(() => {
      component.unitData = mockUnit;
      component.initialModels = Array.from({ length: 20 }, (_, i) => ({
        modelIndex: i,
        weaponLoadout: ['Bolter'],
      }));
      component.modelCount = 20;
      component.ngOnInit();
      emittedValues = [];
    });

    it('changeGroupWeapon should update all models in the group', () => {
      component.changeGroupWeapon(0, 'Flamer');

      for (const m of component.models()) {
        expect(m.weaponLoadout).toEqual(['Flamer']);
      }
      expect(emittedValues).toHaveLength(1);
    });

    it('splitGroup should separate one model from the largest group', () => {
      // splitGroup assigns the first available weapon (Bolter) which is same as group weapon.
      // So we need the group to have a different weapon first.
      component.changeGroupWeapon(0, 'Flamer');
      emittedValues = [];

      component.splitGroup();

      const groups = component.weaponGroups();
      // Split model gets first available weapon (Bolter), rest keep Flamer
      expect(groups.length).toBe(2);
      expect(groups[0].modelIndices).toHaveLength(19);
      expect(groups[1].modelIndices).toHaveLength(1);
    });

    it('mergeGroup should merge into the largest group weapon', () => {
      component.splitGroup();
      emittedValues = [];

      component.mergeGroup(1);

      const groups = component.weaponGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].modelIndices).toHaveLength(20);
    });

    it('mergeGroup should handle invalid index gracefully', () => {
      component.mergeGroup(99);
      expect(emittedValues).toHaveLength(0);
    });
  });

  describe('computed signals', () => {
    it('availableWeapons should combine ranged and melee weapons', () => {
      component.unitData = mockUnit;
      component.modelCount = 1;
      component.initialModels = [];
      component.ngOnInit();

      const weapons = component.availableWeapons();
      expect(weapons).toHaveLength(3);
      expect(weapons[0]).toEqual(expect.objectContaining({ name: 'Bolter', type: 'ranged' }));
      expect(weapons[2]).toEqual(expect.objectContaining({ name: 'Chainsword', type: 'melee' }));
    });

    it('availableWeapons should return empty for null unitData', () => {
      component.unitData = null as any;
      expect(component.availableWeapons()).toEqual([]);
    });

    it('groupSummary should reflect current model state', () => {
      component.unitData = mockUnit;
      component.initialModels = [
        { modelIndex: 0, weaponLoadout: ['Bolter'] },
        { modelIndex: 1, weaponLoadout: ['Bolter'] },
        { modelIndex: 2, weaponLoadout: ['Flamer'] },
      ];
      component.modelCount = 3;
      component.ngOnInit();

      expect(component.groupSummary()).toBe('2x Bolter, Flamer');
    });
  });

  describe('ngOnChanges', () => {
    it('should re-init when initialModels change after initialization', () => {
      component.unitData = mockUnit;
      component.initialModels = [
        { modelIndex: 0, weaponLoadout: ['Bolter'] },
      ];
      component.modelCount = 1;
      component.ngOnInit();

      component.initialModels = [
        { modelIndex: 0, weaponLoadout: ['Flamer'] },
      ];
      component.ngOnChanges({
        initialModels: {
          currentValue: component.initialModels,
          previousValue: [{ modelIndex: 0, weaponLoadout: ['Bolter'] }],
          firstChange: false,
          isFirstChange: () => false,
        },
      });

      expect(component.models()[0].weaponLoadout).toEqual(['Flamer']);
    });

    it('should not re-init on changes before ngOnInit', () => {
      component.unitData = mockUnit;
      component.initialModels = [
        { modelIndex: 0, weaponLoadout: ['Bolter'] },
      ];
      component.modelCount = 1;

      component.ngOnChanges({
        initialModels: {
          currentValue: component.initialModels,
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      expect(component.models()).toEqual([]);
    });
  });
});
