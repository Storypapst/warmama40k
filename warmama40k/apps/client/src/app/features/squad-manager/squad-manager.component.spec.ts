import { Injector, runInInjectionContext, signal } from '@angular/core';
import { SquadManagerComponent } from './squad-manager.component';
import { PlayerService, LocalPlayer, LocalOwnedUnit, SquadModel } from '../../core/services/player.service';
import { SquadService } from '../../core/services/squad.service';
import { UnitDataService } from '../../core/services/unit-data.service';
import { ActivatedRoute, Router } from '@angular/router';

/**
 * Unit tests for SquadManagerComponent logic.
 * Focus: local state updates without full reload, player switching, navigation.
 */
describe('SquadManagerComponent', () => {
  let component: SquadManagerComponent;
  let persistCalls: { method: string; args: any[] }[];
  let navigateCalls: any[][];
  let injector: Injector;

  const makeUnit = (overrides: Partial<LocalOwnedUnit> = {}): LocalOwnedUnit => ({
    id: 'ou-1',
    unitId: 'unit-orks-boyz',
    unitName: 'Boyz',
    faction: 'Orks',
    selectedModelCount: 10,
    selectedWeapons: ['Slugga'],
    points: 80,
    ...overrides,
  });

  const makePlayer = (overrides: Partial<LocalPlayer> = {}): LocalPlayer => ({
    id: 'p1',
    name: 'Lorenz',
    ownedUnits: [makeUnit()],
    ...overrides,
  });

  beforeEach(() => {
    persistCalls = [];
    navigateCalls = [];

    const playersSignal = signal<LocalPlayer[]>([makePlayer()]);

    const mockPlayerService = {
      ensureLoaded: () => Promise.resolve(),
      getPlayer: (id: string) => Promise.resolve(makePlayer({ id })),
      updateSquadNickname: (...args: any[]) => { persistCalls.push({ method: 'updateSquadNickname', args }); return Promise.resolve(); },
      updateSquadPhoto: (...args: any[]) => { persistCalls.push({ method: 'updateSquadPhoto', args }); return Promise.resolve(); },
      updateSquadModels: (...args: any[]) => { persistCalls.push({ method: 'updateSquadModels', args }); return Promise.resolve(); },
      updateUnit: (...args: any[]) => { persistCalls.push({ method: 'updateUnit', args }); return Promise.resolve(); },
      players: playersSignal,
    };

    const mockRouter = {
      navigate: (...args: any[]) => { navigateCalls.push(args); },
    };

    const mockRoute = {
      snapshot: { paramMap: { get: () => 'p1' } },
    };

    const mockUnitDataService = {
      ensureLoaded: () => Promise.resolve(),
      getUnit: () => Promise.resolve(null),
    };

    injector = Injector.create({
      providers: [
        { provide: PlayerService, useValue: mockPlayerService },
        { provide: SquadService, useFactory: () => new SquadService() },
        { provide: UnitDataService, useValue: mockUnitDataService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
      ],
    });

    component = runInInjectionContext(injector, () => new SquadManagerComponent());
  });

  describe('local state updates (no full reload)', () => {
    beforeEach(() => {
      component.player.set(makePlayer());
    });

    it('saveNickname should update local state immediately', () => {
      component.saveNickname('ou-1', 'Killa Boyz');

      const unit = component.player()!.ownedUnits[0];
      expect(unit.nickname).toBe('Killa Boyz');
    });

    it('savePhoto should update local state without reload', () => {
      component.savePhoto('ou-1', 'data:image/jpeg;base64,abc123');

      const unit = component.player()!.ownedUnits[0];
      expect(unit.photoUrl).toBe('data:image/jpeg;base64,abc123');
    });

    it('savePhoto should persist to service', () => {
      component.savePhoto('ou-1', 'data:image/jpeg;base64,abc123');

      expect(persistCalls).toHaveLength(1);
      expect(persistCalls[0].method).toBe('updateSquadPhoto');
      expect(persistCalls[0].args).toEqual(['p1', 'ou-1', 'data:image/jpeg;base64,abc123']);
    });

    it('removePhoto should clear photo locally', () => {
      const playerWithPhoto = makePlayer({
        ownedUnits: [makeUnit({ photoUrl: 'data:image/jpeg;base64,abc' })],
      });
      component.player.set(playerWithPhoto);

      component.removePhoto('ou-1');

      const unit = component.player()!.ownedUnits[0];
      expect(unit.photoUrl).toBeUndefined();
    });

    it('saveWeapons should update local state without reload', () => {
      const models: SquadModel[] = [
        { modelIndex: 0, weaponLoadout: ['Flamer'] },
        { modelIndex: 1, weaponLoadout: ['Bolter'] },
      ];

      component.saveWeapons('ou-1', models);

      const unit = component.player()!.ownedUnits[0];
      expect(unit.squadModels).toEqual(models);
      expect(persistCalls).toHaveLength(1);
      expect(persistCalls[0].method).toBe('updateSquadModels');
    });

    it('should not update state if player is null', () => {
      component.player.set(null);

      component.savePhoto('ou-1', 'data:abc');
      component.removePhoto('ou-1');
      component.saveWeapons('ou-1', []);

      expect(persistCalls).toHaveLength(0);
    });

    it('should only update the matching unit, not others', () => {
      const player = makePlayer({
        ownedUnits: [
          makeUnit({ id: 'ou-1', nickname: 'Alpha' }),
          makeUnit({ id: 'ou-2', nickname: 'Beta' }),
        ],
      });
      component.player.set(player);

      component.saveNickname('ou-1', 'Gamma');

      const units = component.player()!.ownedUnits;
      expect(units[0].nickname).toBe('Gamma');
      expect(units[1].nickname).toBe('Beta');
    });
  });

  describe('player switching', () => {
    it('should reset selectedUnitId when switching players', () => {
      component.selectedUnitId.set('some-unit-id');

      component.switchPlayer('p2');

      expect(component.selectedUnitId()).toBeNull();
    });

    it('should set loading state when switching', () => {
      component.loading.set(false);

      component.switchPlayer('p2');

      expect(component.loading()).toBe(true);
    });

    it('should navigate to the new player route', () => {
      component.switchPlayer('p2');

      expect(navigateCalls.length).toBeGreaterThan(0);
      expect(navigateCalls[0][0]).toEqual(['/squad-setup', 'p2']);
    });
  });

  describe('toggleExpand', () => {
    it('should expand a unit card', () => {
      expect(component.selectedUnitId()).toBeNull();
      component.toggleExpand('ou-1');
      expect(component.selectedUnitId()).toBe('ou-1');
    });

    it('should collapse an already expanded unit', () => {
      component.selectedUnitId.set('ou-1');
      component.toggleExpand('ou-1');
      expect(component.selectedUnitId()).toBeNull();
    });

    it('should switch to a different unit when another is expanded', () => {
      component.selectedUnitId.set('ou-1');
      component.toggleExpand('ou-2');
      expect(component.selectedUnitId()).toBe('ou-2');
    });
  });

  describe('groupedUnits', () => {
    it('should group units by unitId', () => {
      const player = makePlayer({
        ownedUnits: [
          makeUnit({ id: 'ou-1', unitId: 'boyz', unitName: 'Boyz', points: 80 }),
          makeUnit({ id: 'ou-2', unitId: 'boyz', unitName: 'Boyz', points: 80 }),
          makeUnit({ id: 'ou-3', unitId: 'warboss', unitName: 'Warboss', points: 70 }),
        ],
      });
      component.player.set(player);

      const groups = component.groupedUnits();
      expect(groups).toHaveLength(2);

      const boyzGroup = groups.find((g) => g.unitId === 'boyz');
      expect(boyzGroup!.count).toBe(2);
      expect(boyzGroup!.totalPoints).toBe(160);
    });

    it('should sort groups alphabetically by unit name', () => {
      const player = makePlayer({
        ownedUnits: [
          makeUnit({ id: 'ou-1', unitId: 'z', unitName: 'Zerstoerer' }),
          makeUnit({ id: 'ou-2', unitId: 'a', unitName: 'Artillerie' }),
        ],
      });
      component.player.set(player);

      const groups = component.groupedUnits();
      expect(groups[0].units[0].unitName).toBe('Artillerie');
      expect(groups[1].units[0].unitName).toBe('Zerstoerer');
    });

    it('should return empty array when no player', () => {
      component.player.set(null);
      expect(component.groupedUnits()).toEqual([]);
    });
  });

  describe('totalPoints', () => {
    it('should sum all unit points', () => {
      const player = makePlayer({
        ownedUnits: [
          makeUnit({ points: 80 }),
          makeUnit({ id: 'ou-2', points: 120 }),
        ],
      });
      component.player.set(player);

      expect(component.totalPoints()).toBe(200);
    });

    it('should return 0 when no player', () => {
      component.player.set(null);
      expect(component.totalPoints()).toBe(0);
    });
  });

  describe('getWeaponSummary', () => {
    it('should return summary for unit with squad models', () => {
      const unit = makeUnit({
        squadModels: [
          { modelIndex: 0, weaponLoadout: ['Bolter'] },
          { modelIndex: 1, weaponLoadout: ['Bolter'] },
          { modelIndex: 2, weaponLoadout: ['Flamer'] },
        ],
      });
      expect(component.getWeaponSummary(unit)).toBe('2x Bolter, Flamer');
    });

    it('should return empty string for unit without squad models', () => {
      expect(component.getWeaponSummary(makeUnit({ squadModels: undefined }))).toBe('');
    });

    it('should return empty string for empty squad models', () => {
      expect(component.getWeaponSummary(makeUnit({ squadModels: [] }))).toBe('');
    });
  });

  describe('navigation', () => {
    it('goBack should navigate to collection for current player', () => {
      component.player.set(makePlayer({ id: 'p1' }));
      component.goBack();
      expect(navigateCalls[0][0]).toEqual(['/collection', 'p1']);
    });

    it('goBack should navigate to root when no player', () => {
      component.player.set(null);
      component.goBack();
      expect(navigateCalls[0][0]).toEqual(['/']);
    });
  });

  describe('getUnitTypeIcon', () => {
    it('should return flight for aircraft', () => {
      component.unitDataMap.set(new Map([['u1', { tags: ['Aircraft'] } as any]]));
      expect(component.getUnitTypeIcon('u1')).toBe('flight');
    });

    it('should return smart_toy for walker vehicles', () => {
      component.unitDataMap.set(new Map([['u1', { tags: ['Vehicle', 'Walker'] } as any]]));
      expect(component.getUnitTypeIcon('u1')).toBe('smart_toy');
    });

    it('should return local_shipping for vehicles', () => {
      component.unitDataMap.set(new Map([['u1', { tags: ['Vehicle'] } as any]]));
      expect(component.getUnitTypeIcon('u1')).toBe('local_shipping');
    });

    it('should return pest_control for monsters', () => {
      component.unitDataMap.set(new Map([['u1', { tags: ['Monster'] } as any]]));
      expect(component.getUnitTypeIcon('u1')).toBe('pest_control');
    });

    it('should return stars for characters', () => {
      component.unitDataMap.set(new Map([['u1', { tags: ['Character'] } as any]]));
      expect(component.getUnitTypeIcon('u1')).toBe('stars');
    });

    it('should return directions_walk for infantry', () => {
      component.unitDataMap.set(new Map([['u1', { tags: ['Infantry'] } as any]]));
      expect(component.getUnitTypeIcon('u1')).toBe('directions_walk');
    });

    it('should return shield when unit data not found', () => {
      component.unitDataMap.set(new Map());
      expect(component.getUnitTypeIcon('unknown')).toBe('shield');
    });
  });
});
