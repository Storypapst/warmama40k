import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlayerService } from '../../core/services/player.service';

@Component({
  selector: 'app-welcome',
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="welcome-container">
      <div class="welcome-header">
        <mat-icon class="hero-icon">shield</mat-icon>
        <h1>WarMama40K</h1>
        <p class="subtitle">Euer Warhammer 40.000 Spielassistent</p>
      </div>

      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="48" />
        </div>
      } @else if (hasExistingPlayers()) {
        <mat-card class="existing-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>people</mat-icon>
            <mat-card-title>Willkommen zurueck!</mat-card-title>
            <mat-card-subtitle>Eure Spieler sind noch da</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="player-list">
              @for (player of playerService.players(); track player.id) {
                <div class="player-item">
                  <mat-icon>person</mat-icon>
                  <span class="player-name">{{ player.name }}</span>
                  <span class="player-units">{{ player.ownedUnits.length }} Einheiten</span>
                </div>
              }
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="continueWithExisting()">
              <mat-icon>play_arrow</mat-icon>
              Weiter
            </button>
            <button mat-button color="warn" (click)="startFresh()">
              Neu anfangen
            </button>
          </mat-card-actions>
        </mat-card>
      } @else {
        <mat-card class="setup-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>people</mat-icon>
            <mat-card-title>Spieler einrichten</mat-card-title>
            <mat-card-subtitle>Wer spielt heute?</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="player-inputs">
              <mat-form-field appearance="outline" class="player-field">
                <mat-label>Spieler 1</mat-label>
                <input matInput [(ngModel)]="player1Name" placeholder="Name eingeben..." />
                <mat-icon matPrefix>person</mat-icon>
              </mat-form-field>

              <div class="vs-divider">
                <span>VS</span>
              </div>

              <mat-form-field appearance="outline" class="player-field">
                <mat-label>Spieler 2</mat-label>
                <input matInput [(ngModel)]="player2Name" placeholder="Name eingeben..." />
                <mat-icon matPrefix>person</mat-icon>
              </mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button
              mat-raised-button
              color="primary"
              [disabled]="!canStart()"
              (click)="startSetup()"
            >
              <mat-icon>rocket_launch</mat-icon>
              Los geht's!
            </button>
          </mat-card-actions>
        </mat-card>
      }

      <div class="info-cards">
        <mat-card class="info-card">
          <mat-icon>inventory_2</mat-icon>
          <h3>1. Sammlung erfassen</h3>
          <p>Waehlt eure Einheiten aus allen Fraktionen</p>
        </mat-card>
        <mat-card class="info-card">
          <mat-icon>balance</mat-icon>
          <h3>2. Faire Armeen</h3>
          <p>Wir stellen ausbalancierte Teams zusammen</p>
        </mat-card>
        <mat-card class="info-card">
          <mat-icon>sports_esports</mat-icon>
          <h3>3. Spielen!</h3>
          <p>Schritt fuer Schritt durch jede Runde</p>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    .welcome-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 16px;
    }
    .welcome-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .hero-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #c9a84c;
    }
    h1 {
      color: #c9a84c;
      font-size: 2rem;
      margin: 8px 0 4px;
      letter-spacing: 2px;
    }
    .subtitle {
      color: #aaa;
      font-size: 1rem;
      margin: 0;
    }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .setup-card, .existing-card {
      margin-bottom: 24px;
    }
    mat-icon[mat-card-avatar] {
      color: #c9a84c;
      font-size: 32px;
      width: 40px;
      height: 40px;
    }
    .player-inputs {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 0;
    }
    .player-field {
      width: 100%;
    }
    .vs-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%;
    }
    .vs-divider span {
      color: #c9a84c;
      font-weight: 700;
      font-size: 1.5rem;
      letter-spacing: 4px;
    }
    mat-card-actions {
      display: flex;
      gap: 8px;
      padding: 16px !important;
    }
    .player-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 0;
    }
    .player-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(201, 168, 76, 0.1);
    }
    .player-item mat-icon { color: #c9a84c; }
    .player-name {
      font-weight: 600;
      flex: 1;
    }
    .player-units {
      color: #aaa;
      font-size: 0.9em;
    }
    .info-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 24px;
    }
    .info-card {
      text-align: center;
      padding: 16px;
    }
    .info-card mat-icon {
      color: #c9a84c;
      font-size: 36px;
      width: 36px;
      height: 36px;
    }
    .info-card h3 {
      margin: 8px 0 4px;
      font-size: 0.9rem;
      color: #c9a84c;
    }
    .info-card p {
      margin: 0;
      font-size: 0.8rem;
      color: #aaa;
    }
    @media (max-width: 600px) {
      .info-cards {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class WelcomeComponent implements OnInit {
  player1Name = '';
  player2Name = '';
  loading = signal(true);

  constructor(
    public playerService: PlayerService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.playerService.ensureLoaded();
    this.loading.set(false);
  }

  hasExistingPlayers(): boolean {
    return this.playerService.hasPlayers();
  }

  canStart(): boolean {
    return this.player1Name.trim().length > 0 && this.player2Name.trim().length > 0;
  }

  async startSetup() {
    if (!this.canStart()) return;
    const p1 = await this.playerService.createPlayer(this.player1Name.trim());
    await this.playerService.createPlayer(this.player2Name.trim());
    this.router.navigate(['/collection', p1.id]);
  }

  continueWithExisting() {
    const players = this.playerService.players();
    if (players.length > 0) {
      this.router.navigate(['/collection', players[0].id]);
    }
  }

  async startFresh() {
    await this.playerService.clearAll();
    this.loading.set(false);
  }
}
