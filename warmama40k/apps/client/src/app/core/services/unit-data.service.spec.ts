import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UnitDataService } from './unit-data.service';
import type { Unit } from '@warmama40k/shared';

const mockUnits: Unit[] = [
  {
    id: '1',
    name: 'Ork Boyz',
    faction: 'Orks',
    points: 90,
    stats: { toughness: 4, wounds: 1, armourSave: 6, modelCount: 10 },
    weapons: [],
    keywords: [],
    abilities: [],
  } as unknown as Unit,
  {
    id: '2',
    name: 'Warboss',
    faction: 'Orks',
    points: 70,
    stats: { toughness: 5, wounds: 6, armourSave: 4, modelCount: 1 },
    weapons: [],
    keywords: [],
    abilities: [],
  } as unknown as Unit,
  {
    id: '3',
    name: 'Battle Sisters',
    faction: 'Adepta Sororitas',
    points: 110,
    stats: { toughness: 3, wounds: 1, armourSave: 3, modelCount: 10 },
    weapons: [],
    keywords: [],
    abilities: [],
  } as unknown as Unit,
  {
    id: '4',
    name: 'Warlord Titan',
    faction: 'Adeptus Titanicus',
    points: 3500,
    stats: { toughness: 16, wounds: 100, armourSave: 2, invulnerableSave: 5, modelCount: 1 },
    weapons: [],
    keywords: [],
    abilities: [],
  } as unknown as Unit,
];

const mockFactions = [
  { faction: 'Orks', unitCount: 2, totalPoints: 160 },
  { faction: 'Adepta Sororitas', unitCount: 1, totalPoints: 110 },
  { faction: 'Adeptus Titanicus', unitCount: 1, totalPoints: 3500 },
];

describe('UnitDataService', () => {
  let service: UnitDataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UnitDataService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(UnitDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialLoad() {
    httpMock.expectOne('/assets/data/all-units.json').flush(mockUnits);
    httpMock.expectOne('/assets/data/faction-index.json').flush(mockFactions);
  }

  describe('searchUnits', () => {
    it('should find units by unit name', async () => {
      const promise = service.searchUnits('Boyz');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Ork Boyz');
    });

    it('should find units by faction name', async () => {
      const promise = service.searchUnits('Orks');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(2);
      expect(results.map((u) => u.faction)).toEqual(['Orks', 'Orks']);
    });

    it('should be case insensitive', async () => {
      const promise = service.searchUnits('orks');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(2);
    });

    it('should find units by partial match', async () => {
      const promise = service.searchUnits('Titan');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Warlord Titan');
    });
  });

  describe('searchFactions', () => {
    it('should find factions by name', async () => {
      const promise = service.searchFactions('Orks');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(1);
      expect(results[0].faction).toBe('Orks');
    });

    it('should find factions by partial name', async () => {
      const promise = service.searchFactions('Adept');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(2);
    });

    it('should be case insensitive', async () => {
      const promise = service.searchFactions('orks');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(1);
    });

    it('should return empty for no match', async () => {
      const promise = service.searchFactions('Necrons');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(0);
    });
  });

  describe('getFactions', () => {
    it('should return factions sorted alphabetically', async () => {
      const promise = service.getFactions();
      flushInitialLoad();
      const results = await promise;
      expect(results.map((f) => f.faction)).toEqual([
        'Adepta Sororitas',
        'Adeptus Titanicus',
        'Orks',
      ]);
    });
  });

  describe('getUnitsByFaction', () => {
    it('should return units for a specific faction', async () => {
      const promise = service.getUnitsByFaction('Orks');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(2);
      expect(results.every((u) => u.faction === 'Orks')).toBe(true);
    });

    it('should return empty for unknown faction', async () => {
      const promise = service.getUnitsByFaction('Unknown');
      flushInitialLoad();
      const results = await promise;
      expect(results.length).toBe(0);
    });
  });
});
