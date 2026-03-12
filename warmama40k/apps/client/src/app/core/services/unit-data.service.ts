import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { Unit } from '@warmama40k/shared';

export interface FactionSummary {
  faction: string;
  unitCount: number;
  totalPoints: number;
}

@Injectable({ providedIn: 'root' })
export class UnitDataService {
  private allUnits: Unit[] = [];
  private factionIndex: FactionSummary[] = [];
  private loaded = false;

  constructor(private http: HttpClient) {}

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    const [units, factions] = await Promise.all([
      firstValueFrom(this.http.get<Unit[]>('/assets/data/all-units.json')),
      firstValueFrom(
        this.http.get<FactionSummary[]>('/assets/data/faction-index.json'),
      ),
    ]);

    this.allUnits = units;
    this.factionIndex = factions;
    this.loaded = true;
  }

  async getFactions(): Promise<FactionSummary[]> {
    await this.ensureLoaded();
    return this.factionIndex.sort((a, b) => a.faction.localeCompare(b.faction));
  }

  async getUnitsByFaction(faction: string): Promise<Unit[]> {
    await this.ensureLoaded();
    return this.allUnits
      .filter((u) => u.faction === faction)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getUnit(id: string): Promise<Unit | undefined> {
    await this.ensureLoaded();
    return this.allUnits.find((u) => u.id === id);
  }

  async searchUnits(query: string): Promise<Unit[]> {
    await this.ensureLoaded();
    const q = query.toLowerCase();
    return this.allUnits
      .filter((u) => u.name.toLowerCase().includes(q))
      .slice(0, 50);
  }

  async getAllUnits(): Promise<Unit[]> {
    await this.ensureLoaded();
    return this.allUnits;
  }
}
