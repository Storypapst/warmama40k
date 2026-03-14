import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { PlayerService, LocalOwnedUnit } from './player.service';

describe('PlayerService', () => {
  let service: PlayerService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [PlayerService],
    });
    service = TestBed.inject(PlayerService);
    await service.clearAll();
  });

  afterEach(async () => {
    await service.clearAll();
  });

  describe('hasPlayers', () => {
    it('should return false with no players', () => {
      expect(service.hasPlayers()).toBe(false);
    });

    it('should return true with 1 player', async () => {
      await service.createPlayer('Player 1');
      expect(service.hasPlayers()).toBe(true);
    });

    it('should return true with 3+ players', async () => {
      await service.createPlayer('Player 1');
      await service.createPlayer('Player 2');
      await service.createPlayer('Player 3');
      expect(service.hasPlayers()).toBe(true);
      expect(service.getPlayerCount()).toBe(3);
    });
  });

  describe('multi-player CRUD', () => {
    it('should create multiple players', async () => {
      await service.createPlayer('Alice');
      await service.createPlayer('Bob');
      await service.createPlayer('Charlie');

      expect(service.players().length).toBe(3);
      expect(service.players().map((p) => p.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should delete a specific player', async () => {
      await service.createPlayer('Alice');
      const p2 = await service.createPlayer('Bob');
      await service.createPlayer('Charlie');

      await service.deletePlayer(p2.id);
      expect(service.players().length).toBe(2);
      expect(service.players().map((p) => p.name)).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('unit quantity (multiple copies)', () => {
    it('should allow adding same unit multiple times', async () => {
      const player = await service.createPlayer('Test');
      const unit: LocalOwnedUnit = {
        id: crypto.randomUUID(),
        unitId: 'titan-1',
        unitName: 'Warlord Titan',
        faction: 'Adeptus Titanicus',
        selectedModelCount: 1,
        selectedWeapons: [],
        points: 3500,
      };

      await service.addUnit(player.id, { ...unit, id: crypto.randomUUID() });
      await service.addUnit(player.id, { ...unit, id: crypto.randomUUID() });
      await service.addUnit(player.id, { ...unit, id: crypto.randomUUID() });

      const updated = await service.getPlayer(player.id);
      expect(updated!.ownedUnits.length).toBe(3);
      expect(updated!.ownedUnits.every((u) => u.unitId === 'titan-1')).toBe(true);
    });

    it('should remove only one copy when removing a unit', async () => {
      const player = await service.createPlayer('Test');
      const baseUnit = {
        unitId: 'titan-1',
        unitName: 'Warlord Titan',
        faction: 'Adeptus Titanicus',
        selectedModelCount: 1,
        selectedWeapons: [] as string[],
        points: 3500,
      };

      const id1 = crypto.randomUUID();
      const id2 = crypto.randomUUID();
      await service.addUnit(player.id, { ...baseUnit, id: id1 });
      await service.addUnit(player.id, { ...baseUnit, id: id2 });

      await service.removeUnit(player.id, id1);

      const updated = await service.getPlayer(player.id);
      expect(updated!.ownedUnits.length).toBe(1);
      expect(updated!.ownedUnits[0].id).toBe(id2);
    });
  });

  describe('faction breakdown', () => {
    it('should group units by faction', async () => {
      const player = await service.createPlayer('Test');
      await service.addUnit(player.id, {
        id: crypto.randomUUID(),
        unitId: 'ork-1',
        unitName: 'Ork Boyz',
        faction: 'Orks',
        selectedModelCount: 10,
        selectedWeapons: [],
        points: 90,
      });
      await service.addUnit(player.id, {
        id: crypto.randomUUID(),
        unitId: 'ork-1',
        unitName: 'Ork Boyz',
        faction: 'Orks',
        selectedModelCount: 10,
        selectedWeapons: [],
        points: 90,
      });
      await service.addUnit(player.id, {
        id: crypto.randomUUID(),
        unitId: 'sister-1',
        unitName: 'Battle Sisters',
        faction: 'Adepta Sororitas',
        selectedModelCount: 10,
        selectedWeapons: [],
        points: 110,
      });

      const breakdown = service.getFactionBreakdown(player.id);
      expect(breakdown.length).toBe(2);

      const orks = breakdown.find((b) => b.faction === 'Orks');
      expect(orks!.count).toBe(2);
      expect(orks!.points).toBe(180);

      const sisters = breakdown.find((b) => b.faction === 'Adepta Sororitas');
      expect(sisters!.count).toBe(1);
      expect(sisters!.points).toBe(110);
    });
  });
});
