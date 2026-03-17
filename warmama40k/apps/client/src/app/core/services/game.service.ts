import { Injectable, signal, computed } from '@angular/core';
import Dexie from 'dexie';
import type { Unit } from '@warmama40k/shared';
import { GamePhase, AssistanceLevel } from '@warmama40k/shared';
import { getNextPhase, GAME_PHASES } from '@warmama40k/shared';
import type { OwnedUnitRef } from '@warmama40k/shared';
import { UnitDataService } from './unit-data.service';
import { PlayerService } from './player.service';

export interface ModelKillEvent {
  modelIndex: number;
  killedAt: string;
  killedByPlayerName?: string;
}

export interface GameUnitState {
  unitId: string;
  unitName: string;
  faction: string;
  points: number;
  currentWounds: number;
  maxWounds: number;
  modelsRemaining: number;
  maxModels: number;
  isDestroyed: boolean;
  hasMoved: boolean;
  hasShot: boolean;
  hasCharged: boolean;
  hasFought: boolean;
  hasAdvanced: boolean;
  hasFallenBack: boolean;
  /** LocalOwnedUnit.id for squad photo/nickname lookup */
  ownedUnitId?: string;
  /** Custom squad nickname for identification */
  nickname?: string;
  /** Squad photo (Base64) for visual identification */
  photoUrl?: string;
  /** Weapons assigned in Squad Manager (filter combat weapons to these) */
  assignedWeapons?: string[];
  /** Per-model kill tracking (append-only) */
  modelKillLog?: ModelKillEvent[];
  /** Model indices that are dead (for O(1) template lookup) */
  deadModelIndices?: number[];
}

export interface GamePlayerState {
  playerId: string;
  playerName: string;
  units: GameUnitState[];
  commandPoints: number;
  victoryPoints: number;
}

export interface LocalGameState {
  id: string;
  player1: GamePlayerState;
  player2: GamePlayerState;
  currentTurn: number;
  currentPhase: GamePhase;
  activePlayerIndex: number; // 0 or 1
  assistanceLevel: AssistanceLevel;
  status: 'active' | 'paused' | 'completed';
  startedAt: string;
}

class GameDb extends Dexie {
  games!: Dexie.Table<LocalGameState, string>;

  constructor() {
    super('warmama40k-games');
    this.version(1).stores({
      games: 'id, status, startedAt',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private db = new GameDb();
  readonly currentGame = signal<LocalGameState | null>(null);
  readonly unitLookup = signal<Map<string, Unit>>(new Map());

  readonly activePlayer = computed(() => {
    const game = this.currentGame();
    if (!game) return null;
    return game.activePlayerIndex === 0 ? game.player1 : game.player2;
  });

  readonly inactivePlayer = computed(() => {
    const game = this.currentGame();
    if (!game) return null;
    return game.activePlayerIndex === 0 ? game.player2 : game.player1;
  });

  readonly currentPhaseInfo = computed(() => {
    const game = this.currentGame();
    if (!game) return null;
    return GAME_PHASES.find((p) => p.phase === game.currentPhase) ?? null;
  });

  readonly activeUnits = computed(() => {
    const player = this.activePlayer();
    if (!player) return [];
    return player.units.filter((u) => !u.isDestroyed);
  });

  readonly enemyUnits = computed(() => {
    const player = this.inactivePlayer();
    if (!player) return [];
    return player.units.filter((u) => !u.isDestroyed);
  });

  constructor(private unitData: UnitDataService, private playerService: PlayerService) {}

  async createGame(
    player1Name: string,
    player2Name: string,
    army1Units: OwnedUnitRef[],
    army2Units: OwnedUnitRef[],
    assistanceLevel: AssistanceLevel = AssistanceLevel.HIGH
  ): Promise<LocalGameState> {
    // Load unit data for wound/model info
    await this.unitData.ensureLoaded();
    const allUnits = await this.unitData.getAllUnits();
    const lookup = new Map<string, Unit>();
    for (const u of allUnits) lookup.set(u.id, u);
    this.unitLookup.set(lookup);

    // Build a lookup of ownedUnitId → LocalOwnedUnit for nickname/photo/weapon data
    await this.playerService.ensureLoaded();
    const allPlayers = this.playerService.players();
    const ownedUnitLookup = new Map<string, import('./player.service').LocalOwnedUnit>();
    for (const player of allPlayers) {
      for (const owned of player.ownedUnits) {
        ownedUnitLookup.set(owned.id, owned);
      }
    }

    const buildPlayerState = (
      playerName: string,
      units: OwnedUnitRef[]
    ): GamePlayerState => ({
      playerId: crypto.randomUUID(),
      playerName,
      units: units.map((ref) => {
        const unitData = lookup.get(ref.unitId);
        const ownedUnit = ref.ownedUnitId ? ownedUnitLookup.get(ref.ownedUnitId) : undefined;
        // Collect all assigned weapons from squad models
        const assignedWeapons = ownedUnit?.squadModels
          ? [...new Set(ownedUnit.squadModels.flatMap(m => m.weaponLoadout))]
          : undefined;
        return {
          unitId: ref.unitId,
          unitName: ref.unitName,
          faction: ref.faction,
          points: ref.points,
          currentWounds: unitData?.stats.wounds ?? 1,
          maxWounds: unitData?.stats.wounds ?? 1,
          modelsRemaining: unitData?.stats.modelCount ?? 1,
          maxModels: unitData?.stats.modelCount ?? 1,
          isDestroyed: false,
          hasMoved: false,
          hasShot: false,
          hasCharged: false,
          hasFought: false,
          hasAdvanced: false,
          hasFallenBack: false,
          ownedUnitId: ref.ownedUnitId,
          nickname: ownedUnit?.nickname,
          photoUrl: ownedUnit?.photoUrl,
          assignedWeapons,
          modelKillLog: [],
          deadModelIndices: [],
        };
      }),
      commandPoints: 0,
      victoryPoints: 0,
    });

    const game: LocalGameState = {
      id: crypto.randomUUID(),
      player1: buildPlayerState(player1Name, army1Units),
      player2: buildPlayerState(player2Name, army2Units),
      currentTurn: 1,
      currentPhase: GamePhase.COMMAND,
      activePlayerIndex: 0,
      assistanceLevel,
      status: 'active',
      startedAt: new Date().toISOString(),
    };

    await this.db.games.add(game);
    this.currentGame.set(game);
    return game;
  }

  async loadGame(id: string): Promise<LocalGameState | null> {
    const game = await this.db.games.get(id);
    if (game) {
      this.currentGame.set(game);
      // Load unit lookup
      await this.unitData.ensureLoaded();
      const allUnits = await this.unitData.getAllUnits();
      const lookup = new Map<string, Unit>();
      for (const u of allUnits) lookup.set(u.id, u);
      this.unitLookup.set(lookup);
    }
    return game ?? null;
  }

  async advancePhase(): Promise<void> {
    const game = this.currentGame();
    if (!game) return;

    const nextPhase = getNextPhase(game.currentPhase);
    let updated: LocalGameState;

    if (nextPhase === null) {
      // Turn ends for this player
      if (game.activePlayerIndex === 0) {
        // Player 2's turn
        updated = {
          ...game,
          activePlayerIndex: 1,
          currentPhase: GamePhase.COMMAND,
          player2: this.resetPlayerTurnFlags(game.player2),
        };
      } else {
        // Both players done - next turn
        updated = {
          ...game,
          currentTurn: game.currentTurn + 1,
          activePlayerIndex: 0,
          currentPhase: GamePhase.COMMAND,
          player1: this.resetPlayerTurnFlags(game.player1),
        };
      }
    } else {
      updated = { ...game, currentPhase: nextPhase };
    }

    // Command phase: gain 1 CP
    if (updated.currentPhase === GamePhase.COMMAND) {
      if (updated.activePlayerIndex === 0) {
        updated = {
          ...updated,
          player1: {
            ...updated.player1,
            commandPoints: updated.player1.commandPoints + 1,
          },
        };
      } else {
        updated = {
          ...updated,
          player2: {
            ...updated.player2,
            commandPoints: updated.player2.commandPoints + 1,
          },
        };
      }
    }

    await this.saveGame(updated);
  }

  private resetPlayerTurnFlags(player: GamePlayerState): GamePlayerState {
    return {
      ...player,
      units: player.units.map((u) => ({
        ...u,
        hasMoved: false,
        hasShot: false,
        hasCharged: false,
        hasFought: false,
        hasAdvanced: false,
        hasFallenBack: false,
      })),
    };
  }

  async markUnitAction(
    playerIndex: number,
    unitId: string,
    action: 'moved' | 'shot' | 'charged' | 'fought' | 'advanced' | 'fallenBack'
  ): Promise<void> {
    const game = this.currentGame();
    if (!game) return;

    const playerKey = playerIndex === 0 ? 'player1' : 'player2';
    const updated = {
      ...game,
      [playerKey]: {
        ...game[playerKey],
        units: game[playerKey].units.map((u) => {
          if (u.unitId !== unitId) return u;
          const flagMap: Record<string, keyof GameUnitState> = {
            moved: 'hasMoved',
            shot: 'hasShot',
            charged: 'hasCharged',
            fought: 'hasFought',
            advanced: 'hasAdvanced',
            fallenBack: 'hasFallenBack',
          };
          return { ...u, [flagMap[action]]: true };
        }),
      },
    };

    await this.saveGame(updated);
  }

  async applyDamage(
    playerIndex: number,
    unitId: string,
    woundsDealt: number,
    modelsKilled: number
  ): Promise<void> {
    const game = this.currentGame();
    if (!game) return;

    const playerKey = playerIndex === 0 ? 'player1' : 'player2';
    const updated = {
      ...game,
      [playerKey]: {
        ...game[playerKey],
        units: game[playerKey].units.map((u) => {
          if (u.unitId !== unitId) return u;
          const newModels = Math.max(0, u.modelsRemaining - modelsKilled);
          const newWounds = newModels === 0 ? 0 : Math.max(0, u.currentWounds - woundsDealt);
          return {
            ...u,
            modelsRemaining: newModels,
            currentWounds: newModels === 0 ? 0 : newWounds,
            isDestroyed: newModels === 0,
          };
        }),
      },
    };

    await this.saveGame(updated);
  }

  async healUnit(
    playerIndex: number,
    unitId: string,
    woundsHealed: number
  ): Promise<void> {
    const game = this.currentGame();
    if (!game) return;

    const playerKey = playerIndex === 0 ? 'player1' : 'player2';
    const updated = {
      ...game,
      [playerKey]: {
        ...game[playerKey],
        units: game[playerKey].units.map((u) => {
          if (u.unitId !== unitId) return u;
          return {
            ...u,
            currentWounds: Math.min(u.maxWounds, u.currentWounds + woundsHealed),
          };
        }),
      },
    };

    await this.saveGame(updated);
  }

  async killModel(
    playerIndex: number,
    unitId: string,
    modelIndex: number,
    killedByPlayerName?: string
  ): Promise<void> {
    const game = this.currentGame();
    if (!game) return;

    const playerKey = playerIndex === 0 ? 'player1' : 'player2';
    const updated = {
      ...game,
      [playerKey]: {
        ...game[playerKey],
        units: game[playerKey].units.map((u) => {
          if (u.unitId !== unitId) return u;
          const deadIndices = [...(u.deadModelIndices ?? [])];
          if (deadIndices.includes(modelIndex)) return u; // already dead
          deadIndices.push(modelIndex);
          const killLog = [...(u.modelKillLog ?? []), {
            modelIndex,
            killedAt: new Date().toISOString(),
            killedByPlayerName,
          }];
          const newModels = Math.max(0, u.modelsRemaining - 1);
          return {
            ...u,
            modelsRemaining: newModels,
            isDestroyed: newModels === 0,
            currentWounds: newModels === 0 ? 0 : u.currentWounds,
            deadModelIndices: deadIndices,
            modelKillLog: killLog,
          };
        }),
      },
    };

    await this.saveGame(updated);
  }

  async reviveModel(
    playerIndex: number,
    unitId: string,
    modelIndex: number
  ): Promise<void> {
    const game = this.currentGame();
    if (!game) return;

    const playerKey = playerIndex === 0 ? 'player1' : 'player2';
    const updated = {
      ...game,
      [playerKey]: {
        ...game[playerKey],
        units: game[playerKey].units.map((u) => {
          if (u.unitId !== unitId) return u;
          const deadIndices = (u.deadModelIndices ?? []).filter(
            (i) => i !== modelIndex
          );
          const wasDestroyed = u.isDestroyed;
          return {
            ...u,
            modelsRemaining: u.modelsRemaining + (wasDestroyed || deadIndices.length < (u.deadModelIndices?.length ?? 0) ? 1 : 0),
            isDestroyed: false,
            currentWounds: wasDestroyed ? u.maxWounds : u.currentWounds,
            deadModelIndices: deadIndices,
            // NOTE: modelKillLog is append-only — kill history preserved
          };
        }),
      },
    };

    await this.saveGame(updated);
  }

  async endGame(): Promise<void> {
    const game = this.currentGame();
    if (!game) return;

    const updated = { ...game, status: 'completed' as const };
    await this.saveGame(updated);
  }

  private async saveGame(game: LocalGameState): Promise<void> {
    await this.db.games.put(game);
    this.currentGame.set(game);
  }

  getUnitData(unitId: string): Unit | undefined {
    return this.unitLookup().get(unitId);
  }
}
