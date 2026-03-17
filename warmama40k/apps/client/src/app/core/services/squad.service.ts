import { Injectable } from '@angular/core';
import type { Unit } from '@warmama40k/shared';
import type { SquadModel, WeaponGroup } from './player.service';
import type { GameUnitState } from './game.service';

@Injectable({ providedIn: 'root' })
export class SquadService {
  /**
   * Groups models by identical sorted weapon loadout.
   * Returns groups sorted by number of models (largest first).
   */
  computeWeaponGroups(models: SquadModel[]): WeaponGroup[] {
    const map = new Map<string, WeaponGroup>();
    for (const m of models) {
      const key = [...m.weaponLoadout].sort().join('||');
      const existing = map.get(key);
      if (existing) {
        existing.modelIndices.push(m.modelIndex);
      } else {
        map.set(key, {
          weaponLoadout: [...m.weaponLoadout].sort(),
          modelIndices: [m.modelIndex],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.modelIndices.length - a.modelIndices.length
    );
  }

  /**
   * Creates default SquadModel[] where all models get the first available
   * ranged + melee weapon as default loadout.
   */
  buildDefaultSquadModels(unit: Unit, modelCount: number): SquadModel[] {
    const defaultWeapons: string[] = [];
    if (unit.rangedWeapons.length > 0) {
      defaultWeapons.push(unit.rangedWeapons[0].name);
    }
    if (unit.meleeWeapons.length > 0) {
      defaultWeapons.push(unit.meleeWeapons[0].name);
    }

    return Array.from({ length: modelCount }, (_, i) => ({
      modelIndex: i,
      weaponLoadout: [...defaultWeapons],
    }));
  }

  /**
   * Returns a German summary string like "3x Bolter, 2x Raketenwerfer".
   */
  getWeaponGroupSummary(groups: WeaponGroup[]): string {
    if (groups.length === 0) return 'Keine Waffen';

    return groups
      .map((g) => {
        const count = g.modelIndices.length;
        const weapons = g.weaponLoadout.join(' + ');
        return count > 1 ? `${count}x ${weapons}` : weapons;
      })
      .join(', ');
  }

  /** Returns model indices that are alive */
  getLiveModels(state: GameUnitState): number[] {
    const dead = new Set(state.deadModelIndices ?? []);
    return Array.from({ length: state.maxModels }, (_, i) => i).filter(
      (i) => !dead.has(i)
    );
  }

  /** Returns model indices that are dead */
  getDeadModels(state: GameUnitState): number[] {
    return [...(state.deadModelIndices ?? [])];
  }
}
