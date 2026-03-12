import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../core/services/game.service';
import { CampaignService } from '../../core/services/campaign.service';

@Component({
  selector: 'app-game-summary',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    FormsModule,
  ],
  template: `
    @if (!game()) {
      <div class="no-game">
        <mat-icon>sports_esports</mat-icon>
        <h2>Kein Spiel zum Auswerten</h2>
        <button mat-raised-button color="primary" routerLink="/">
          Zurueck zur Startseite
        </button>
      </div>
    } @else {
      <div class="summary-container">
        <h1 class="page-title">
          <mat-icon>emoji_events</mat-icon>
          Spielende
        </h1>

        <!-- Score Entry -->
        <mat-card class="score-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>scoreboard</mat-icon>
            <mat-card-title>Ergebnis eintragen</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="score-inputs">
              <div class="player-score">
                <label class="player-label">{{ game()!.player1.playerName }}</label>
                <mat-form-field appearance="outline">
                  <mat-label>Siegpunkte</mat-label>
                  <input matInput type="number" [(ngModel)]="player1Score" min="0" />
                </mat-form-field>
              </div>
              <div class="score-vs">vs</div>
              <div class="player-score">
                <label class="player-label">{{ game()!.player2.playerName }}</label>
                <mat-form-field appearance="outline">
                  <mat-label>Siegpunkte</mat-label>
                  <input matInput type="number" [(ngModel)]="player2Score" min="0" />
                </mat-form-field>
              </div>
            </div>

            <!-- Winner Selection -->
            <h3 class="section-label">
              <mat-icon>emoji_events</mat-icon>
              Wer hat gewonnen?
            </h3>
            <mat-radio-group [(ngModel)]="winnerName" class="winner-radio">
              <mat-radio-button [value]="game()!.player1.playerName">
                {{ game()!.player1.playerName }}
              </mat-radio-button>
              <mat-radio-button [value]="game()!.player2.playerName">
                {{ game()!.player2.playerName }}
              </mat-radio-button>
              <mat-radio-button value="Unentschieden">
                Unentschieden
              </mat-radio-button>
            </mat-radio-group>

            <!-- Mission Name (for campaign) -->
            @if (hasCampaign()) {
              <mat-form-field appearance="outline" class="full-width mission-field">
                <mat-label>Missionsname (optional)</mat-label>
                <input matInput [(ngModel)]="missionName" placeholder="z.B. Kampf um die Bruecke" />
                <mat-hint>Fuer die Kampagnen-Chronik</mat-hint>
              </mat-form-field>
            }
          </mat-card-content>
        </mat-card>

        <!-- Game Stats -->
        <mat-card class="stats-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>bar_chart</mat-icon>
            <mat-card-title>Spielstatistik</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stats-grid">
              <div class="stat-row">
                <span class="stat-label">Runden gespielt</span>
                <span class="stat-value">{{ game()!.currentTurn }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">{{ game()!.player1.playerName }} - Einheiten uebrig</span>
                <span class="stat-value">{{ p1UnitsAlive() }} / {{ game()!.player1.units.length }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">{{ game()!.player2.playerName }} - Einheiten uebrig</span>
                <span class="stat-value">{{ p2UnitsAlive() }} / {{ game()!.player2.units.length }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Campaign Info -->
        @if (hasCampaign()) {
          <div class="campaign-notice">
            <mat-icon>auto_stories</mat-icon>
            <span>Ergebnis wird in der Kampagne <strong>{{ campaignService.activeCampaign()!.name }}</strong> gespeichert!</span>
          </div>
        }

        <!-- Actions -->
        <div class="actions">
          <button
            mat-raised-button
            color="primary"
            (click)="confirmEnd()"
            [disabled]="!winnerName || isSaving()"
            class="confirm-btn"
          >
            <mat-icon>check</mat-icon>
            {{ isSaving() ? 'Speichere...' : 'Spiel abschliessen' }}
          </button>
          <button mat-button (click)="cancelEnd()">
            <mat-icon>arrow_back</mat-icon>
            Zurueck zum Spiel
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

    .summary-container { max-width: 600px; margin: 0 auto; }
    .page-title {
      display: flex; align-items: center; gap: 8px;
      color: #c9a84c; margin-bottom: 16px;
    }
    .page-title mat-icon { font-size: 28px; width: 28px; height: 28px; }

    mat-icon[mat-card-avatar] {
      color: #c9a84c; font-size: 28px; width: 36px; height: 36px;
    }

    .score-card { margin-bottom: 16px; }
    .score-inputs {
      display: flex; align-items: center; gap: 16px;
      justify-content: center; margin: 16px 0;
    }
    .player-score {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .player-label { font-weight: 600; color: #c9a84c; font-size: 1.1em; }
    .player-score mat-form-field { width: 120px; text-align: center; }
    .score-vs {
      font-size: 1.5em; font-weight: 700; color: #555;
      padding-top: 24px;
    }

    .section-label {
      display: flex; align-items: center; gap: 6px;
      color: #c9a84c; font-size: 0.95em; margin: 16px 0 8px;
    }
    .section-label mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .winner-radio {
      display: flex; flex-direction: column; gap: 8px;
      margin-bottom: 16px;
    }

    .full-width { width: 100%; }
    .mission-field { margin-top: 8px; }

    .stats-card { margin-bottom: 16px; }
    .stats-grid {
      display: flex; flex-direction: column; gap: 8px; padding: 8px 0;
    }
    .stat-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 0;
    }
    .stat-label { color: #aaa; }
    .stat-value { font-weight: 600; color: #c9a84c; }

    .campaign-notice {
      display: flex; align-items: center; gap: 8px;
      padding: 12px; margin-bottom: 16px;
      background: rgba(201, 168, 76, 0.08);
      border: 1px solid rgba(201, 168, 76, 0.2);
      border-radius: 8px; color: #c9a84c;
      font-size: 0.9em;
    }
    .campaign-notice mat-icon { flex-shrink: 0; }

    .actions {
      display: flex; flex-direction: column; gap: 8px;
      align-items: center; padding: 16px 0 32px;
    }
    .confirm-btn { min-width: 200px; }
  `,
})
export class GameSummaryComponent implements OnInit {
  private readonly gameService = inject(GameService);
  readonly campaignService = inject(CampaignService);
  private readonly router = inject(Router);

  readonly game = computed(() => this.gameService.currentGame());
  readonly hasCampaign = computed(() => !!this.campaignService.activeCampaign());

  readonly p1UnitsAlive = computed(() => {
    const g = this.game();
    if (!g) return 0;
    return g.player1.units.filter((u) => !u.isDestroyed).length;
  });

  readonly p2UnitsAlive = computed(() => {
    const g = this.game();
    if (!g) return 0;
    return g.player2.units.filter((u) => !u.isDestroyed).length;
  });

  player1Score = 0;
  player2Score = 0;
  winnerName = '';
  missionName = '';
  isSaving = signal(false);

  ngOnInit(): void {
    const g = this.game();
    if (!g) {
      this.router.navigate(['/']);
      return;
    }
    // Auto-select winner based on VP
    this.player1Score = g.player1.victoryPoints;
    this.player2Score = g.player2.victoryPoints;
  }

  async confirmEnd(): Promise<void> {
    const g = this.game();
    if (!g || !this.winnerName) return;

    this.isSaving.set(true);

    try {
      // Record to campaign if active
      if (this.hasCampaign()) {
        const mission = this.missionName || `Schlacht ${this.campaignService.activeCampaign()!.battles.length + 1}`;
        await this.campaignService.addBattleResult(
          mission,
          this.winnerName === 'Unentschieden' ? '' : this.winnerName,
          this.player1Score,
          this.player2Score,
        );
      }

      // End the game
      await this.gameService.endGame();

      // Navigate
      if (this.hasCampaign()) {
        this.router.navigate(['/campaign']);
      } else {
        this.router.navigate(['/']);
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  cancelEnd(): void {
    this.router.navigate(['/game']);
  }
}
