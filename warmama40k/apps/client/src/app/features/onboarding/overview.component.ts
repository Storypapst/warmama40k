import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  PlayerService,
  LocalPlayer,
} from '../../core/services/player.service';

@Component({
  selector: 'app-overview',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="48" />
      </div>
    } @else {
      <div class="overview-container">
        <h1>Eure Sammlungen</h1>
        <p class="subtitle">Alle Miniaturen sind erfasst. Bereit fuer den Kampf!</p>

        <div class="players-grid">
          @for (player of players(); track player.id) {
            <mat-card class="player-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>person</mat-icon>
                <mat-card-title>{{ player.name }}</mat-card-title>
                <mat-card-subtitle>
                  {{ player.ownedUnits.length }} Einheiten /
                  {{ getTotalPoints(player) }} Punkte
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @for (group of getFactionBreakdown(player); track group.faction) {
                  <div class="faction-row">
                    <mat-icon class="faction-icon">shield</mat-icon>
                    <span class="faction-name">{{ group.faction }}</span>
                    <span class="faction-meta">
                      {{ group.count }}x / {{ group.points }} Pkt
                    </span>
                  </div>
                }
              </mat-card-content>
              <mat-card-actions>
                <button mat-button [routerLink]="['/collection', player.id]">
                  <mat-icon>edit</mat-icon>
                  Bearbeiten
                </button>
              </mat-card-actions>
            </mat-card>
          }
        </div>

        <mat-divider />

        <div class="actions">
          <button mat-raised-button color="primary" routerLink="/army-builder">
            <mat-icon>balance</mat-icon>
            Armeen zusammenstellen
          </button>
          <button mat-button routerLink="/units">
            <mat-icon>menu_book</mat-icon>
            Einheiten-Browser
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 48px; }
    .overview-container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { color: #c9a84c; margin-bottom: 4px; }
    .subtitle { color: #aaa; margin-top: 0; margin-bottom: 24px; }
    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .player-card {
      min-height: 200px;
    }
    mat-icon[mat-card-avatar] {
      color: #c9a84c;
      font-size: 32px;
      width: 40px;
      height: 40px;
    }
    .faction-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
    }
    .faction-icon {
      color: #c9a84c;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .faction-name {
      flex: 1;
      font-size: 0.9em;
    }
    .faction-meta {
      color: #aaa;
      font-size: 0.85em;
    }
    mat-divider { margin: 24px 0; }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
      padding: 16px 0;
    }
  `,
})
export class OverviewComponent implements OnInit {
  loading = signal(true);
  players = signal<LocalPlayer[]>([]);

  constructor(
    private playerService: PlayerService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.playerService.ensureLoaded();
    const all = this.playerService.players();
    if (all.length < 2) {
      this.router.navigate(['/']);
      return;
    }
    this.players.set(all);
    this.loading.set(false);
  }

  getTotalPoints(player: LocalPlayer): number {
    return player.ownedUnits.reduce((sum, u) => sum + u.points, 0);
  }

  getFactionBreakdown(
    player: LocalPlayer
  ): { faction: string; count: number; points: number }[] {
    return this.playerService.getFactionBreakdown(player.id);
  }
}
