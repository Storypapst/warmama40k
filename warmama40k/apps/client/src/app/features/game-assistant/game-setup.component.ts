import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlayerService, LocalPlayer } from '../../core/services/player.service';
import { GameService } from '../../core/services/game.service';
import { ArmyStateService } from '../../core/services/army-state.service';
import { AssistanceLevel } from '@warmama40k/shared';
import type { OwnedUnitRef } from '@warmama40k/shared';

@Component({
  selector: 'app-game-setup',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="48" /></div>
    } @else if (error()) {
      <div class="error-msg">
        <mat-icon>error</mat-icon>
        <p>{{ error() }}</p>
        <button mat-raised-button routerLink="/army-builder">Zurueck zum Army Builder</button>
      </div>
    } @else {
      <div class="setup-container">
        <h1>Spiel vorbereiten</h1>
        <p class="subtitle">Armeen pruefen und Assistenz-Level waehlen</p>

        <!-- Assistance Level -->
        <mat-card class="level-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>support_agent</mat-icon>
            <mat-card-title>Assistenz-Level</mat-card-title>
            <mat-card-subtitle>Wie viel Hilfe wollt ihr?</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="level-options">
              @for (level of assistanceLevels; track level.value) {
                <button
                  mat-stroked-button
                  [class.selected]="selectedLevel() === level.value"
                  (click)="selectedLevel.set(level.value)"
                >
                  <mat-icon>{{ level.icon }}</mat-icon>
                  <div class="level-info">
                    <strong>{{ level.label }}</strong>
                    <small>{{ level.desc }}</small>
                  </div>
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Army Summary -->
        <div class="armies-preview">
          @for (player of players(); track player.id; let i = $index) {
            <mat-card class="army-preview-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>shield</mat-icon>
                <mat-card-title>{{ player.name }}</mat-card-title>
                <mat-card-subtitle>
                  {{ getArmyUnits(i).length }} Einheiten /
                  {{ getArmyPoints(i) }} Punkte
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @for (unit of getArmyUnits(i); track unit.unitId) {
                  <div class="unit-row">
                    <span class="unit-name">{{ unit.unitName }}</span>
                    <span class="unit-faction">{{ unit.faction }}</span>
                    <span class="unit-pts">{{ unit.points }}</span>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- Start Button -->
        <div class="start-row">
          <button mat-raised-button routerLink="/army-builder">
            <mat-icon>arrow_back</mat-icon>
            Armeen aendern
          </button>
          <button
            mat-raised-button
            color="primary"
            (click)="startGame()"
            class="start-btn"
          >
            <mat-icon>sports_esports</mat-icon>
            Spiel starten!
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 48px; }
    .error-msg { text-align: center; padding: 48px; }
    .error-msg mat-icon { font-size: 48px; width: 48px; height: 48px; color: #f44336; }
    .setup-container { max-width: 800px; margin: 0 auto; }
    h1 { color: var(--mat-sys-primary); margin-bottom: 4px; }
    .subtitle { color: var(--mat-sys-on-surface-variant, #aaa); margin-top: 0; }
    mat-icon[mat-card-avatar] {
      color: var(--mat-sys-primary); font-size: 32px; width: 40px; height: 40px;
    }
    .level-card { margin-bottom: 16px; }
    .level-options {
      display: flex; flex-direction: column; gap: 8px; padding: 8px 0;
    }
    .level-options button {
      display: flex; align-items: center; gap: 12px;
      text-align: left; padding: 12px 16px; height: auto;
      white-space: normal;
      color: #888; border-color: #555;
    }
    .level-options button mat-icon { color: #888; }
    .level-options button.selected {
      border-color: var(--mat-sys-primary);
      background: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);
      color: var(--mat-sys-primary);
    }
    .level-options button.selected mat-icon { color: var(--mat-sys-primary); }
    .level-info { display: flex; flex-direction: column; }
    .level-info strong { font-size: 1em; }
    .level-info small { color: #888; font-size: 0.85em; }
    .level-options button.selected .level-info small { color: var(--mat-sys-on-surface-variant, #aaa); }
    .armies-preview {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }
    .unit-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 0; font-size: 0.9em;
    }
    .unit-name { flex: 1; }
    .unit-faction { color: var(--mat-sys-on-surface-variant, #aaa); font-size: 0.85em; margin: 0 8px; }
    .unit-pts { color: var(--mat-sys-primary); font-weight: 600; }
    .start-row {
      display: flex; justify-content: center; gap: 16px;
      padding: 16px 0 32px;
    }
    .start-btn { font-size: 1.1em; padding: 8px 32px; }
  `,
})
export class GameSetupComponent implements OnInit {
  loading = signal(true);
  error = signal<string | null>(null);
  players = signal<LocalPlayer[]>([]);
  selectedLevel = signal<AssistanceLevel>(AssistanceLevel.HIGH);

  assistanceLevels = [
    {
      value: AssistanceLevel.HIGH,
      label: 'Viel Hilfe',
      desc: 'Erklaert jeden Schritt ausfuehrlich mit Taktik-Tipps',
      icon: 'school',
    },
    {
      value: AssistanceLevel.MEDIUM,
      label: 'Normal',
      desc: 'Sagt was zu wuerfeln ist, ohne lange Erklaerungen',
      icon: 'help_outline',
    },
    {
      value: AssistanceLevel.LOW,
      label: 'Nur Zahlen',
      desc: 'Zeigt nur die noetigsten Infos und Wuerfel-Ergebnisse',
      icon: 'speed',
    },
  ];

  private army1Units: OwnedUnitRef[] = [];
  private army2Units: OwnedUnitRef[] = [];

  constructor(
    private playerService: PlayerService,
    private gameService: GameService,
    private armyState: ArmyStateService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.playerService.ensureLoaded();
    const all = this.playerService.players();
    if (all.length < 2) {
      this.error.set('Es werden mindestens 2 Spieler benoetigt.');
      this.loading.set(false);
      return;
    }

    this.players.set(all);

    // Get armies from the army state service (set by Army Builder)
    const result = this.armyState.currentResult();
    if (!result) {
      this.error.set('Keine Armeen ausgewaehlt. Bitte zuerst Armeen zusammenstellen.');
      this.loading.set(false);
      return;
    }

    this.army1Units = result.army1.units;
    this.army2Units = result.army2.units;
    this.loading.set(false);
  }

  getArmyUnits(playerIdx: number): OwnedUnitRef[] {
    return playerIdx === 0 ? this.army1Units : this.army2Units;
  }

  getArmyPoints(playerIdx: number): number {
    const units = this.getArmyUnits(playerIdx);
    return units.reduce((s, u) => s + u.points, 0);
  }

  async startGame() {
    const [p1, p2] = this.players();

    await this.gameService.createGame(
      p1.name,
      p2.name,
      this.army1Units,
      this.army2Units,
      this.selectedLevel()
    );

    this.router.navigate(['/game']);
  }
}
