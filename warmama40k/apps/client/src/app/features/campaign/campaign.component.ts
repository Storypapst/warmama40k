import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { CampaignService, Campaign } from '../../core/services/campaign.service';
import { PlayerService } from '../../core/services/player.service';

@Component({
  selector: 'app-campaign',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  template: `
    <div class="campaign-container">
      <h1 class="page-title">
        <mat-icon>auto_stories</mat-icon>
        Kampagne
      </h1>

      <!-- Active Campaign -->
      @if (campaignService.activeCampaign()) {
        @let campaign = campaignService.activeCampaign()!;
        <mat-card class="campaign-card active">
          <mat-card-header>
            <mat-icon mat-card-avatar>flag</mat-icon>
            <mat-card-title>{{ campaign.name }}</mat-card-title>
            <mat-card-subtitle>
              {{ campaign.player1Name }} vs {{ campaign.player2Name }}
              &middot; {{ campaign.battles.length }} Schlachten
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <!-- Score Bar -->
            <div class="score-bar">
              <div class="score-player">
                <span class="score-name">{{ campaign.player1Name }}</span>
                <span class="score-value gold">{{ campaignService.campaignScore().player1 }}</span>
              </div>
              <div class="score-divider">:</div>
              <div class="score-player right">
                <span class="score-value gold">{{ campaignService.campaignScore().player2 }}</span>
                <span class="score-name">{{ campaign.player2Name }}</span>
              </div>
            </div>

            @if (campaignService.campaignLeader() && campaignService.campaignLeader() !== 'Gleichstand') {
              <p class="leader-text">
                <mat-icon>emoji_events</mat-icon>
                {{ campaignService.campaignLeader() }} fuehrt!
              </p>
            } @else if (campaign.battles.length > 0) {
              <p class="leader-text tied">
                <mat-icon>balance</mat-icon>
                Gleichstand!
              </p>
            }

            <!-- Battle Timeline -->
            @if (campaign.battles.length > 0) {
              <h3 class="section-label">Schlachten-Chronik</h3>
              <div class="timeline">
                @for (battle of campaign.battles; track battle.id; let i = $index) {
                  <div class="timeline-entry" (click)="toggleBattleDetail(battle.id)">
                    <div class="timeline-marker">
                      <span class="battle-num">{{ i + 1 }}</span>
                    </div>
                    <div class="timeline-content">
                      <div class="battle-header">
                        <strong>{{ battle.missionName }}</strong>
                        <span class="battle-winner">
                          <mat-icon>emoji_events</mat-icon>
                          {{ battle.winner }}
                        </span>
                      </div>
                      <div class="battle-score-line">
                        {{ battle.player1Name }} {{ battle.player1Score }} : {{ battle.player2Score }} {{ battle.player2Name }}
                      </div>

                      @if (expandedBattleId() === battle.id) {
                        <div class="battle-story">
                          @if (battle.storyIntro) {
                            <p class="story-text intro">
                              <mat-icon>menu_book</mat-icon>
                              {{ battle.storyIntro }}
                            </p>
                          }
                          @if (battle.storyOutro) {
                            <p class="story-text outro">
                              <mat-icon>auto_stories</mat-icon>
                              {{ battle.storyOutro }}
                            </p>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="empty-text">Noch keine Schlachten gespielt. Startet ein Spiel!</p>
            }
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" routerLink="/army-builder">
              <mat-icon>swords</mat-icon>
              Naechste Schlacht
            </button>
            <button mat-button color="warn" (click)="endCampaign()">
              <mat-icon>stop</mat-icon>
              Kampagne beenden
            </button>
          </mat-card-actions>
        </mat-card>
      } @else {
        <!-- No Active Campaign: Create New -->
        <mat-card class="create-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>add_circle</mat-icon>
            <mat-card-title>Neue Kampagne starten</mat-card-title>
            <mat-card-subtitle>Verfolgt eure Siege ueber mehrere Spiele!</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p class="info-text">
              Eine Kampagne verbindet mehrere Schlachten zu einer epischen Geschichte.
              Nach jedem Spiel wird das Ergebnis aufgezeichnet!
            </p>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Kampagnen-Name (optional)</mat-label>
              <input matInput [(ngModel)]="campaignName" placeholder="Ein epischer Name..."/>
              <mat-hint>Leer lassen fuer einen zufaelligen Namen</mat-hint>
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              (click)="createCampaign()"
              [disabled]="!hasPlayers()"
              class="create-btn"
            >
              <mat-icon>auto_stories</mat-icon>
              Kampagne starten!
            </button>

            @if (!hasPlayers()) {
              <p class="warn-text">
                <mat-icon>warning</mat-icon>
                Bitte zuerst Spieler anlegen (Startseite)
              </p>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Past Campaigns -->
      @if (pastCampaigns().length > 0) {
        <h3 class="past-title">Vergangene Kampagnen</h3>
        @for (c of pastCampaigns(); track c.id) {
          <mat-card class="past-card" (click)="viewCampaign(c)">
            <div class="past-info">
              <div>
                <strong>{{ c.name }}</strong>
                <span class="past-detail">
                  {{ c.battles.length }} Schlachten &middot;
                  {{ c.player1Name }} vs {{ c.player2Name }}
                </span>
              </div>
              <mat-icon>chevron_right</mat-icon>
            </div>
          </mat-card>
        }
      }
    </div>
  `,
  styles: `
    .campaign-container { max-width: 700px; margin: 0 auto; }
    .page-title {
      display: flex; align-items: center; gap: 8px;
      color: var(--mat-sys-primary); margin-bottom: 16px;
    }
    .page-title mat-icon { font-size: 28px; width: 28px; height: 28px; }

    mat-icon[mat-card-avatar] {
      color: var(--mat-sys-primary); font-size: 28px; width: 36px; height: 36px;
    }

    /* Score Bar */
    .score-bar {
      display: flex; align-items: center; justify-content: center;
      gap: 16px; padding: 16px 0; margin: 8px 0 12px;
    }
    .score-player {
      display: flex; align-items: center; gap: 8px;
    }
    .score-player.right { flex-direction: row-reverse; text-align: right; }
    .score-player.right .score-name { text-align: right; }
    .score-name { font-size: 1em; color: #ddd; }
    .score-value { font-size: 2em; font-weight: 900; }
    .score-value.gold { color: var(--mat-sys-primary); }
    .score-divider {
      font-size: 2em; font-weight: 900; color: #555;
    }

    .leader-text {
      display: flex; align-items: center; justify-content: center;
      gap: 6px; color: var(--mat-sys-primary); font-weight: 600; margin: 0;
    }
    .leader-text mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .leader-text.tied { color: var(--mat-sys-on-surface-variant, #aaa); }

    /* Timeline */
    .section-label {
      color: var(--mat-sys-primary); margin: 16px 0 8px; font-size: 0.95em;
    }
    .timeline {
      display: flex; flex-direction: column; gap: 4px;
      padding-left: 8px;
    }
    .timeline-entry {
      display: flex; gap: 12px; cursor: pointer;
      padding: 8px; border-radius: 8px;
      transition: background 0.2s;
    }
    .timeline-entry:hover { background: color-mix(in srgb, var(--mat-sys-primary) 5%, transparent); }
    .timeline-marker {
      display: flex; flex-direction: column; align-items: center;
    }
    .battle-num {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: color-mix(in srgb, var(--mat-sys-primary) 15%, transparent); color: var(--mat-sys-primary);
      font-weight: 700; font-size: 0.85em;
    }
    .timeline-content { flex: 1; }
    .battle-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 2px;
    }
    .battle-winner {
      display: flex; align-items: center; gap: 4px;
      color: var(--mat-sys-primary); font-size: 0.85em;
    }
    .battle-winner mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .battle-score-line { font-size: 0.85em; color: var(--mat-sys-on-surface-variant, #aaa); }

    /* Story Detail */
    .battle-story {
      margin-top: 8px; padding: 8px;
      background: color-mix(in srgb, var(--mat-sys-primary) 5%, transparent);
      border-radius: 8px;
    }
    .story-text {
      display: flex; gap: 8px; font-size: 0.85em;
      line-height: 1.4; margin: 4px 0;
      font-style: italic; color: #ccc;
    }
    .story-text mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--mat-sys-primary); flex-shrink: 0; margin-top: 2px; }
    .story-text.outro { color: var(--mat-sys-on-surface-variant, #aaa); }

    .empty-text { color: var(--mat-sys-outline, #777); font-style: italic; text-align: center; padding: 16px; }

    mat-card-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    /* Create Card */
    .create-card { margin-bottom: 16px; }
    .info-text { color: var(--mat-sys-on-surface-variant, #aaa); font-size: 0.9em; margin-bottom: 16px; }
    .full-width { width: 100%; }
    .create-btn { margin-top: 8px; }
    .warn-text {
      display: flex; align-items: center; gap: 6px;
      color: #ff9800; font-size: 0.85em; margin-top: 8px;
    }
    .warn-text mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Past Campaigns */
    .past-title { color: var(--mat-sys-on-surface-variant, #aaa); margin: 24px 0 8px; }
    .past-card { padding: 12px; margin-bottom: 6px; cursor: pointer; }
    .past-card:hover { border-color: var(--mat-sys-primary); }
    .past-info {
      display: flex; justify-content: space-between; align-items: center;
    }
    .past-info mat-icon { color: #555; }
    .past-detail { display: block; color: var(--mat-sys-on-surface-variant, #aaa); font-size: 0.8em; }
  `,
})
export class CampaignComponent implements OnInit {
  readonly campaignService = inject(CampaignService);
  private readonly playerService = inject(PlayerService);

  campaignName = '';
  expandedBattleId = signal<string | null>(null);

  ngOnInit(): void {
    this.playerService.ensureLoaded();
  }

  readonly hasPlayers = computed(() => this.playerService.players().length >= 2);
  readonly pastCampaigns = computed(() =>
    this.campaignService.allCampaigns().filter((c) => c.status === 'completed'),
  );

  async createCampaign(): Promise<void> {
    const players = this.playerService.players();
    if (players.length < 2) return;
    await this.campaignService.createCampaign(
      players[0].name,
      players[1].name,
      this.campaignName || undefined,
    );
    this.campaignName = '';
  }

  toggleBattleDetail(battleId: string): void {
    if (this.expandedBattleId() === battleId) {
      this.expandedBattleId.set(null);
    } else {
      this.expandedBattleId.set(battleId);
    }
  }

  async endCampaign(): Promise<void> {
    await this.campaignService.endCampaign();
    // pastCampaigns is a computed signal — auto-updates from allCampaigns
  }

  async viewCampaign(campaign: Campaign): Promise<void> {
    await this.campaignService.loadCampaign(campaign.id);
  }
}
