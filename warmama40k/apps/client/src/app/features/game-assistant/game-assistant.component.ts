import { Component, OnInit, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { GameService, GameUnitState } from '../../core/services/game.service';
import { TacticsService } from '../../core/services/tactics.service';
import { GamePhase, AssistanceLevel } from '@warmama40k/shared';
import { GAME_PHASES } from '@warmama40k/shared';

@Component({
  selector: 'app-game-assistant',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatBadgeModule,
  ],
  template: `
    @if (!game()) {
      <div class="no-game">
        <mat-icon>sports_esports</mat-icon>
        <h2>Kein aktives Spiel</h2>
        <button mat-raised-button color="primary" routerLink="/game-setup">
          Neues Spiel starten
        </button>
      </div>
    } @else {
      <div class="game-container">
        <!-- Turn & Player Header -->
        <div class="turn-header">
          <div class="turn-info">
            <span class="turn-number">Runde {{ game()!.currentTurn }}</span>
            <span class="player-turn">{{ activePlayerName() }} ist dran</span>
          </div>
          <div class="cp-display">
            <mat-icon>stars</mat-icon>
            <span>{{ activePlayerCP() }} CP</span>
          </div>
        </div>

        <!-- Phase Bar -->
        <div class="phase-bar">
          @for (phase of phases; track phase.phase) {
            <div
              class="phase-step"
              [class.active]="game()!.currentPhase === phase.phase"
              [class.done]="isPhaseComplete(phase.phase)"
            >
              <mat-icon>{{ phase.icon }}</mat-icon>
              <span class="phase-name">{{ phase.name }}</span>
            </div>
          }
        </div>

        <!-- Phase Description -->
        <mat-card class="phase-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>{{ currentPhaseInfo()?.icon }}</mat-icon>
            <mat-card-title>{{ currentPhaseInfo()?.name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (assistanceLevel() === 'high') {
              <p>{{ currentPhaseInfo()?.detailedDescription }}</p>
            } @else if (assistanceLevel() === 'medium') {
              <p>{{ currentPhaseInfo()?.description }}</p>
            } @else {
              <p class="short-hint">{{ currentPhaseInfo()?.shortHint }}</p>
            }
          </mat-card-content>
          <mat-card-actions>
            @if (isCombatPhase()) {
              <button
                mat-raised-button
                color="accent"
                (click)="openCombat()"
              >
                <mat-icon>{{ game()!.currentPhase === 'shooting' ? 'gps_fixed' : 'swords' }}</mat-icon>
                Kampf ausloesen
              </button>
            }
            <button
              mat-raised-button
              color="primary"
              (click)="nextPhase()"
            >
              <mat-icon>skip_next</mat-icon>
              Naechste Phase
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Tactics Tip -->
        @if (tacticsService.currentTip()) {
          <div class="tip-card">
            <mat-icon class="tip-icon">lightbulb</mat-icon>
            <div class="tip-content">
              <span class="tip-text">{{ tacticsService.currentTip()!.text }}</span>
              @if (tacticsService.currentTip()!.source === 'llm') {
                <span class="tip-badge ai">KI</span>
              }
            </div>
            <button mat-icon-button class="tip-refresh" (click)="refreshTip()">
              <mat-icon>{{ tacticsService.isLoading() ? 'hourglass_empty' : 'refresh' }}</mat-icon>
            </button>
          </div>
        }

        <!-- Active Player Units -->
        <h3 class="section-title">
          <mat-icon>shield</mat-icon>
          {{ activePlayerName() }} - Einheiten
        </h3>
        <div class="units-grid">
          @for (unit of gameService.activeUnits(); track unit.unitId) {
            <mat-card
              class="unit-card"
              [class.activated]="isUnitActivated(unit)"
              [class.damaged]="unit.currentWounds < unit.maxWounds || unit.modelsRemaining < unit.maxModels"
            >
              <div class="unit-card-header">
                <span class="unit-card-name">{{ unit.unitName }}</span>
                <span class="unit-card-faction">{{ unit.faction }}</span>
              </div>
              <div class="unit-card-stats">
                <div class="stat-wounds">
                  <mat-icon>favorite</mat-icon>
                  <span>{{ unit.currentWounds }}/{{ unit.maxWounds }}</span>
                </div>
                <div class="stat-models">
                  <mat-icon>people</mat-icon>
                  <span>{{ unit.modelsRemaining }}/{{ unit.maxModels }}</span>
                </div>
              </div>
              <div class="unit-card-actions">
                @if (game()!.currentPhase === 'movement' && !unit.hasMoved) {
                  <button mat-button (click)="markAction(unit, 'moved')">
                    <mat-icon>directions_run</mat-icon> Bewegt
                  </button>
                  <button mat-button (click)="markAction(unit, 'advanced')">
                    <mat-icon>fast_forward</mat-icon> Vorgerueckt
                  </button>
                }
                @if (game()!.currentPhase === 'shooting' && !unit.hasShot && !unit.hasAdvanced) {
                  <button mat-button (click)="selectAttacker(unit)">
                    <mat-icon>gps_fixed</mat-icon> Schiessen
                  </button>
                }
                @if (game()!.currentPhase === 'charge' && !unit.hasCharged && !unit.hasAdvanced && !unit.hasFallenBack) {
                  <button mat-button (click)="markAction(unit, 'charged')">
                    <mat-icon>bolt</mat-icon> Charge
                  </button>
                }
                @if (game()!.currentPhase === 'fight' && !unit.hasFought) {
                  <button mat-button (click)="selectAttacker(unit)">
                    <mat-icon>swords</mat-icon> Kaempfen
                  </button>
                }
                @if (isUnitActivated(unit)) {
                  <span class="done-badge">
                    <mat-icon>check_circle</mat-icon>
                  </span>
                }
              </div>
            </mat-card>
          }
        </div>

        <mat-divider />

        <!-- Enemy Units -->
        <h3 class="section-title enemy-title">
          <mat-icon>shield</mat-icon>
          {{ inactivePlayerName() }} - Gegner
        </h3>
        <div class="units-grid">
          @for (unit of gameService.enemyUnits(); track unit.unitId) {
            <mat-card
              class="unit-card enemy-unit"
              [class.damaged]="unit.currentWounds < unit.maxWounds || unit.modelsRemaining < unit.maxModels"
            >
              <div class="unit-card-header">
                <span class="unit-card-name">{{ unit.unitName }}</span>
                <span class="unit-card-faction">{{ unit.faction }}</span>
              </div>
              <div class="unit-card-stats">
                <div class="stat-wounds">
                  <mat-icon>favorite</mat-icon>
                  <span>{{ unit.currentWounds }}/{{ unit.maxWounds }}</span>
                </div>
                <div class="stat-models">
                  <mat-icon>people</mat-icon>
                  <span>{{ unit.modelsRemaining }}/{{ unit.maxModels }}</span>
                </div>
              </div>
            </mat-card>
          }
        </div>

        <!-- Game Actions Footer -->
        <div class="game-footer">
          <button mat-button (click)="endGame()">
            <mat-icon>stop</mat-icon>
            Spiel beenden
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .no-game {
      text-align: center; padding: 64px 16px;
    }
    .no-game mat-icon {
      font-size: 64px; width: 64px; height: 64px; color: #c9a84c;
    }
    .game-container { max-width: 900px; margin: 0 auto; }
    .turn-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px;
    }
    .turn-number {
      font-size: 1.3rem; font-weight: 700; color: #c9a84c;
    }
    .player-turn {
      margin-left: 12px; font-size: 1.1rem; color: #ddd;
    }
    .cp-display {
      display: flex; align-items: center; gap: 4px;
      background: rgba(201, 168, 76, 0.15);
      padding: 6px 12px; border-radius: 20px;
      color: #c9a84c; font-weight: 600;
    }
    .cp-display mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Phase Bar */
    .phase-bar {
      display: flex; gap: 2px; margin-bottom: 16px;
      background: #1a1a1a; border-radius: 8px; overflow: hidden;
    }
    .phase-step {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 8px 4px; gap: 2px;
      color: #666; font-size: 0.7em;
      transition: all 0.3s ease;
    }
    .phase-step mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .phase-step.active {
      background: rgba(201, 168, 76, 0.2);
      color: #c9a84c; font-weight: 600;
    }
    .phase-step.done { color: #4caf50; }
    .phase-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

    /* Phase Card */
    .phase-card { margin-bottom: 16px; }
    .short-hint { font-size: 0.9em; color: #aaa; margin: 0; }
    mat-icon[mat-card-avatar] {
      color: #c9a84c; font-size: 32px; width: 40px; height: 40px;
    }
    mat-card-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    /* Tactics Tip */
    .tip-card {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 12px; margin-bottom: 12px;
      background: rgba(201, 168, 76, 0.08);
      border: 1px solid rgba(201, 168, 76, 0.2);
      border-radius: 8px;
    }
    .tip-icon { color: #c9a84c; font-size: 20px; width: 20px; height: 20px; margin-top: 2px; }
    .tip-content { flex: 1; }
    .tip-text { font-size: 0.9em; line-height: 1.4; }
    .tip-badge {
      display: inline-block; font-size: 0.65em; padding: 1px 6px;
      border-radius: 8px; margin-left: 6px; vertical-align: middle;
    }
    .tip-badge.ai { background: rgba(76, 175, 80, 0.15); color: #4caf50; }
    .tip-refresh { flex-shrink: 0; }
    .tip-refresh mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Section Titles */
    .section-title {
      display: flex; align-items: center; gap: 8px;
      color: #c9a84c; margin: 16px 0 8px;
    }
    .enemy-title { color: #f44336; }
    .enemy-title mat-icon { color: #f44336; }
    mat-divider { margin: 16px 0; }

    /* Unit Grid */
    .units-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 8px; margin-bottom: 8px;
    }
    .unit-card {
      padding: 12px; cursor: default;
      border-left: 3px solid transparent;
    }
    .unit-card.activated { opacity: 0.5; border-left-color: #4caf50; }
    .unit-card.damaged { border-left-color: #ff9800; }
    .unit-card.enemy-unit { border-left-color: #f44336; }
    .unit-card-header {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 6px;
    }
    .unit-card-name { font-weight: 600; font-size: 0.9em; }
    .unit-card-faction { color: #aaa; font-size: 0.75em; }
    .unit-card-stats {
      display: flex; gap: 12px; margin-bottom: 6px;
    }
    .stat-wounds, .stat-models {
      display: flex; align-items: center; gap: 4px; font-size: 0.85em;
    }
    .stat-wounds mat-icon { font-size: 14px; width: 14px; height: 14px; color: #f44336; }
    .stat-models mat-icon { font-size: 14px; width: 14px; height: 14px; color: #2196f3; }
    .unit-card-actions {
      display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
    }
    .unit-card-actions button { font-size: 0.8em; min-width: 0; padding: 0 8px; }
    .unit-card-actions mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .done-badge { color: #4caf50; display: flex; align-items: center; }
    .done-badge mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* Footer */
    .game-footer {
      display: flex; justify-content: center; padding: 24px 0 32px;
    }
  `,
})
export class GameAssistantComponent implements OnInit {
  phases = GAME_PHASES;

  game = computed(() => this.gameService.currentGame());
  assistanceLevel = computed(() => this.game()?.assistanceLevel ?? AssistanceLevel.HIGH);
  currentPhaseInfo = computed(() => this.gameService.currentPhaseInfo());

  activePlayerName = computed(() => this.gameService.activePlayer()?.playerName ?? '');
  inactivePlayerName = computed(() => this.gameService.inactivePlayer()?.playerName ?? '');
  activePlayerCP = computed(() => this.gameService.activePlayer()?.commandPoints ?? 0);

  constructor(
    public gameService: GameService,
    public tacticsService: TacticsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.game()) {
      this.router.navigate(['/game-setup']);
      return;
    }
    // Load initial tip
    this.tacticsService.getTip();
  }

  async refreshTip(): Promise<void> {
    await this.tacticsService.getTip();
  }

  isPhaseComplete(phase: GamePhase): boolean {
    const game = this.game();
    if (!game) return false;
    const order = [
      GamePhase.COMMAND,
      GamePhase.MOVEMENT,
      GamePhase.SHOOTING,
      GamePhase.CHARGE,
      GamePhase.FIGHT,
    ];
    const currentIdx = order.indexOf(game.currentPhase);
    const phaseIdx = order.indexOf(phase);
    return phaseIdx < currentIdx;
  }

  isCombatPhase(): boolean {
    const game = this.game();
    if (!game) return false;
    return game.currentPhase === GamePhase.SHOOTING || game.currentPhase === GamePhase.FIGHT;
  }

  isUnitActivated(unit: GameUnitState): boolean {
    const game = this.game();
    if (!game) return false;
    switch (game.currentPhase) {
      case GamePhase.MOVEMENT:
        return unit.hasMoved || unit.hasAdvanced || unit.hasFallenBack;
      case GamePhase.SHOOTING:
        return unit.hasShot;
      case GamePhase.CHARGE:
        return unit.hasCharged;
      case GamePhase.FIGHT:
        return unit.hasFought;
      default:
        return false;
    }
  }

  async markAction(unit: GameUnitState, action: 'moved' | 'advanced' | 'charged' | 'fought' | 'fallenBack') {
    const game = this.game();
    if (!game) return;
    await this.gameService.markUnitAction(game.activePlayerIndex, unit.unitId, action);
  }

  selectAttacker(unit: GameUnitState) {
    // Navigate to combat resolver
    this.router.navigate(['/combat'], {
      queryParams: {
        attackerId: unit.unitId,
        phase: this.game()?.currentPhase,
      },
    });
  }

  openCombat() {
    this.router.navigate(['/combat'], {
      queryParams: { phase: this.game()?.currentPhase },
    });
  }

  async nextPhase() {
    await this.gameService.advancePhase();
    // New phase = new tip
    this.tacticsService.getTip();
  }

  async endGame() {
    this.router.navigate(['/game-summary']);
  }
}
