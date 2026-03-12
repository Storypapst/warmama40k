import { GamePhase, AssistanceLevel } from '../enums';
import { ArmyList } from './army.interface';

export interface GameState {
  id: string;
  player1: GamePlayer;
  player2: GamePlayer;
  currentTurn: number;
  currentPhase: GamePhase;
  activePlayerId: string;
  turnHistory: TurnRecord[];
  assistanceLevel: AssistanceLevel;
  missionId?: string;
  startedAt: string;
  status: 'setup' | 'active' | 'paused' | 'completed';
}

export interface GamePlayer {
  playerId: string;
  playerName: string;
  army: ArmyList;
  unitStates: Record<string, UnitState>;
  commandPoints: number;
  victoryPoints: number;
}

export interface UnitState {
  unitId: string;
  currentWounds: number;
  modelsRemaining: number;
  isDestroyed: boolean;
  hasShot: boolean;
  hasCharged: boolean;
  hasFought: boolean;
  hasMoved: boolean;
}

export interface TurnRecord {
  turn: number;
  phase: GamePhase;
  activePlayerId: string;
  events: GameEvent[];
}

export interface GameEvent {
  type: 'combat' | 'phase_change' | 'unit_destroyed' | 'objective';
  description: string;
  timestamp: string;
  data?: Record<string, unknown>;
}
