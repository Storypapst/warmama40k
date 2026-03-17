import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { GameService } from './game.service';
import { UnitDataService } from './unit-data.service';
import { PlayerService, LocalPlayer } from './player.service';
import type { Unit, OwnedUnitRef } from '@warmama40k/shared';

const mockUnit: Unit = {
  id: 'u1',
  name: 'Intercessors',
  faction: 'Space Marines',
  points: 100,
  unitType: 'unit',
  stats: {
    toughness: 4, wounds: 2, movement: 6, leadership: 6,
    objectiveControl: 2, armourSave: 3, invulnerableSave: null,
    modelCount: 5,
  },
  composition: {
    defaultModelCount: 5, minModelCount: 5, maxModelCount: 10,
    compositionOptions: [{ modelCount: 5, points: 100 }],
  },
  globalModifiers: null,
  defenderGlobalModifiers: null,
  tags: ['Infantry'],
  rangedWeapons: [],
  meleeWeapons: [],
} as Unit;

describe('GameService', () => {
  let service: GameService;
  let mockUnitData: { ensureLoaded: () => Promise<void>; getAllUnits: () => Promise<Unit[]> };
  let mockPlayerService: {
    ensureLoaded: () => Promise<void>;
    players: () => LocalPlayer[];
  };

  const playersWithSquads: LocalPlayer[] = [
    {
      id: 'p1',
      name: 'Alice',
      ownedUnits: [{
        id: 'owned-1',
        unitId: 'u1',
        unitName: 'Intercessors',
        faction: 'Space Marines',
        selectedModelCount: 5,
        selectedWeapons: [],
        points: 100,
        nickname: 'Alpha Squad',
        photoUrl: 'data:image/png;base64,abc',
        squadModels: [
          { modelIndex: 0, weaponLoadout: ['Bolt Rifle', 'Bolt Pistol'] },
          { modelIndex: 1, weaponLoadout: ['Bolt Rifle'] },
        ],
      }],
    },
    {
      id: 'p2',
      name: 'Bob',
      ownedUnits: [{
        id: 'owned-2',
        unitId: 'u1',
        unitName: 'Intercessors',
        faction: 'Space Marines',
        selectedModelCount: 5,
        selectedWeapons: [],
        points: 100,
      }],
    },
  ];

  beforeEach(() => {
    mockUnitData = {
      ensureLoaded: vi.fn().mockResolvedValue(undefined),
      getAllUnits: vi.fn().mockResolvedValue([mockUnit]),
    };
    mockPlayerService = {
      ensureLoaded: vi.fn().mockResolvedValue(undefined),
      players: vi.fn().mockReturnValue(playersWithSquads),
    };

    TestBed.configureTestingModule({
      providers: [
        GameService,
        { provide: UnitDataService, useValue: mockUnitData },
        { provide: PlayerService, useValue: mockPlayerService },
      ],
    });
    service = TestBed.inject(GameService);
  });

  describe('createGame', () => {
    const army1: OwnedUnitRef[] = [{
      unitId: 'u1', unitName: 'Intercessors', faction: 'Space Marines',
      points: 100, ownedUnitId: 'owned-1', playerId: 'p1',
    }];
    const army2: OwnedUnitRef[] = [{
      unitId: 'u1', unitName: 'Intercessors', faction: 'Space Marines',
      points: 100, ownedUnitId: 'owned-2', playerId: 'p2',
    }];

    it('should create a game with two players', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      expect(game.player1.playerName).toBe('Alice');
      expect(game.player2.playerName).toBe('Bob');
      expect(game.status).toBe('active');
    });

    it('should populate nickname from owned unit', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      const unit1 = game.player1.units[0];
      expect(unit1.nickname).toBe('Alpha Squad');
    });

    it('should populate photoUrl from owned unit', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      const unit1 = game.player1.units[0];
      expect(unit1.photoUrl).toBe('data:image/png;base64,abc');
    });

    it('should populate assignedWeapons from squad models', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      const unit1 = game.player1.units[0];
      expect(unit1.assignedWeapons).toBeDefined();
      expect(unit1.assignedWeapons).toContain('Bolt Rifle');
      expect(unit1.assignedWeapons).toContain('Bolt Pistol');
      // Should be deduplicated
      expect(unit1.assignedWeapons!.filter(w => w === 'Bolt Rifle').length).toBe(1);
    });

    it('should leave nickname/photo undefined when owned unit has none', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      const unit2 = game.player2.units[0];
      expect(unit2.nickname).toBeUndefined();
      expect(unit2.photoUrl).toBeUndefined();
    });

    it('should leave assignedWeapons undefined when no squad models', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      const unit2 = game.player2.units[0];
      expect(unit2.assignedWeapons).toBeUndefined();
    });

    it('should set unit wounds from unit data', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      const unit1 = game.player1.units[0];
      expect(unit1.maxWounds).toBe(2);
      expect(unit1.currentWounds).toBe(2);
    });

    it('should set model count from unit data', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      const unit1 = game.player1.units[0];
      expect(unit1.maxModels).toBe(5);
      expect(unit1.modelsRemaining).toBe(5);
    });

    it('should initialize kill tracking arrays', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      const unit1 = game.player1.units[0];
      expect(unit1.modelKillLog).toEqual([]);
      expect(unit1.deadModelIndices).toEqual([]);
    });

    it('should store ownedUnitId for lookup', async () => {
      const game = await service.createGame('Alice', 'Bob', army1, army2);
      expect(game.player1.units[0].ownedUnitId).toBe('owned-1');
      expect(game.player2.units[0].ownedUnitId).toBe('owned-2');
    });
  });
});
