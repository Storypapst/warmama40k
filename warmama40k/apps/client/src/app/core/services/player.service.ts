import { Injectable, signal } from '@angular/core';
import Dexie from 'dexie';

export interface LocalPlayer {
  id: string;
  name: string;
  avatarUrl?: string;
  ownedUnits: LocalOwnedUnit[];
}

export interface LocalOwnedUnit {
  id: string;
  unitId: string;
  unitName: string;
  faction: string;
  selectedModelCount: number;
  selectedWeapons: string[];
  photoUrl?: string;
  nickname?: string;
  points: number;
}

class WarmamaDb extends Dexie {
  players!: Dexie.Table<LocalPlayer, string>;

  constructor() {
    super('warmama40k');
    this.version(1).stores({
      players: 'id, name',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private db = new WarmamaDb();
  readonly players = signal<LocalPlayer[]>([]);
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const all = await this.db.players.toArray();
    this.players.set(all);
    this.loaded = true;
  }

  async createPlayer(name: string): Promise<LocalPlayer> {
    const player: LocalPlayer = {
      id: crypto.randomUUID(),
      name,
      ownedUnits: [],
    };
    await this.db.players.add(player);
    this.players.update((p) => [...p, player]);
    return player;
  }

  async updatePlayer(player: LocalPlayer): Promise<void> {
    await this.db.players.put(player);
    this.players.update((all) =>
      all.map((p) => (p.id === player.id ? player : p))
    );
  }

  async getPlayer(id: string): Promise<LocalPlayer | undefined> {
    await this.ensureLoaded();
    const player = this.players().find((p) => p.id === id);
    if (!player) return undefined;
    return { ...player, ownedUnits: [...player.ownedUnits] };
  }

  async addUnit(playerId: string, unit: LocalOwnedUnit): Promise<void> {
    const player = await this.getPlayer(playerId);
    if (!player) return;
    const updated = {
      ...player,
      ownedUnits: [...player.ownedUnits, unit],
    };
    await this.updatePlayer(updated);
  }

  async removeUnit(playerId: string, ownedUnitId: string): Promise<void> {
    const player = await this.getPlayer(playerId);
    if (!player) return;
    const updated = {
      ...player,
      ownedUnits: player.ownedUnits.filter((u) => u.id !== ownedUnitId),
    };
    await this.updatePlayer(updated);
  }

  async updateUnit(
    playerId: string,
    ownedUnitId: string,
    changes: Partial<LocalOwnedUnit>
  ): Promise<void> {
    const player = await this.getPlayer(playerId);
    if (!player) return;
    const updated = {
      ...player,
      ownedUnits: player.ownedUnits.map((u) =>
        u.id === ownedUnitId ? { ...u, ...changes } : u
      ),
    };
    await this.updatePlayer(updated);
  }

  async deletePlayer(id: string): Promise<void> {
    await this.db.players.delete(id);
    this.players.update((all) => all.filter((p) => p.id !== id));
  }

  async clearAll(): Promise<void> {
    await this.db.players.clear();
    this.players.set([]);
    this.loaded = false;
  }

  hasPlayers(): boolean {
    return this.players().length >= 2;
  }

  getPlayerCount(): number {
    return this.players().length;
  }

  getTotalPoints(playerId: string): number {
    const player = this.players().find((p) => p.id === playerId);
    if (!player) return 0;
    return player.ownedUnits.reduce((sum, u) => sum + u.points, 0);
  }

  getFactionBreakdown(
    playerId: string
  ): { faction: string; count: number; points: number }[] {
    const player = this.players().find((p) => p.id === playerId);
    if (!player) return [];
    const map = new Map<string, { count: number; points: number }>();
    for (const u of player.ownedUnits) {
      const existing = map.get(u.faction) ?? { count: 0, points: 0 };
      existing.count++;
      existing.points += u.points;
      map.set(u.faction, existing);
    }
    return Array.from(map.entries())
      .map(([faction, data]) => ({ faction, ...data }))
      .sort((a, b) => b.points - a.points);
  }
}
