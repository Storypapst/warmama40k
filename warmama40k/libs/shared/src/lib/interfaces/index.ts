export type {
  Unit,
  UnitStats,
  GlobalModifiers,
  DefenderGlobalModifiers,
  CompositionOption,
  UnitComposition,
} from './unit.interface';

export type {
  Weapon,
  WeaponAbilities,
  AntiTarget,
} from './weapon.interface';

export type {
  Player,
  OwnedUnit,
} from './player.interface';

export type {
  ArmyList,
  FactionGroup,
  ArmyUnit,
  BalanceSuggestion,
  SwapSuggestion,
} from './army.interface';

export type {
  GameState,
  GamePlayer,
  UnitState,
  TurnRecord,
  GameEvent,
} from './game-state.interface';

export type {
  CombatResolution,
  CombatStep,
  CombatStepPhase,
  CombatStepResult,
  DamageAllocation,
} from './combat.interface';
