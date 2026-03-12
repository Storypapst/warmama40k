import { Component, OnInit, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  PlayerService,
  LocalPlayer,
} from '../../core/services/player.service';
import { UnitDataService } from '../../core/services/unit-data.service';
import { ArmyStateService } from '../../core/services/army-state.service';
import type { Unit, BalanceResult, OwnedUnitRef, BalanceInput } from '@warmama40k/shared';
import { buildBalancedArmies } from '@warmama40k/shared';

@Component({
  selector: 'app-army-builder',
  imports: [
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatCheckboxModule,
  ],
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="48" /></div>
    } @else {
      <div class="builder-container">
        <h1>Armeen zusammenstellen</h1>
        <p class="subtitle">Waehlt Ziel-Punkte und lasst faire Teams erstellen</p>

        <!-- Points slider -->
        <mat-card class="config-card">
          <div class="slider-row">
            <mat-icon>tune</mat-icon>
            <span class="slider-label">Ziel-Punkte:</span>
            <span class="points-value">{{ targetPoints() }}</span>
          </div>
          <mat-slider
            min="250"
            max="2000"
            step="50"
            [discrete]="true"
            showTickMarks
          >
            <input matSliderThumb [ngModel]="targetPoints()" (ngModelChange)="targetPoints.set($event)" />
          </mat-slider>

          <div class="points-presets">
            @for (preset of pointPresets; track preset) {
              <button
                mat-stroked-button
                [color]="targetPoints() === preset ? 'primary' : undefined"
                (click)="targetPoints.set(preset)"
              >
                {{ preset }}
              </button>
            }
          </div>
        </mat-card>

        <!-- Must-include toggles -->
        <div class="must-include-section">
          @for (player of players(); track player.id; let i = $index) {
            <mat-card class="must-include-card">
              <mat-card-header>
                <mat-icon mat-card-avatar>person</mat-icon>
                <mat-card-title>{{ player.name }}</mat-card-title>
                <mat-card-subtitle>Muss dabei sein:</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (player.ownedUnits.length === 0) {
                  <p class="no-units">Keine Einheiten</p>
                } @else {
                  <div class="must-include-list">
                    @for (unit of player.ownedUnits; track unit.id) {
                      <label class="must-item">
                        <mat-checkbox
                          [checked]="isMustInclude(i, unit.unitId)"
                          (change)="toggleMustInclude(i, unit.unitId)"
                        />
                        <span class="must-name">{{ unit.unitName }}</span>
                        <span class="must-pts">{{ unit.points }} Pkt</span>
                      </label>
                    }
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>

        <!-- Generate button -->
        <div class="generate-row">
          <button
            mat-raised-button
            color="primary"
            (click)="generateArmies()"
            [disabled]="generating()"
          >
            @if (generating()) {
              <mat-spinner diameter="20" />
            } @else {
              <mat-icon>balance</mat-icon>
            }
            Armeen generieren!
          </button>
          @if (result()) {
            <button mat-button (click)="generateArmies()">
              <mat-icon>refresh</mat-icon>
              Neu wuerfeln
            </button>
          }
        </div>

        <!-- Results -->
        @if (result()) {
          <mat-divider />

          <!-- Balance Score -->
          <div class="balance-header">
            <div class="balance-score" [class]="balanceClass()">
              <span class="score-number">{{ result()!.balanceScore }}</span>
              <span class="score-label">Balance</span>
            </div>
            <p class="balance-reasoning">{{ result()!.reasoning }}</p>
          </div>

          <!-- Side-by-side armies -->
          <div class="armies-grid">
            @for (player of players(); track player.id; let i = $index) {
              <mat-card class="army-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>shield</mat-icon>
                  <mat-card-title>{{ player.name }}</mat-card-title>
                  <mat-card-subtitle>
                    {{ getArmy(i).totalPoints }} / {{ targetPoints() }} Punkte
                  </mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <!-- Faction groups -->
                  @for (group of getArmy(i).factions; track group.faction) {
                    <div class="army-faction-header">
                      <mat-icon>shield</mat-icon>
                      {{ group.faction }}
                      <span class="army-faction-meta">{{ group.count }}x / {{ group.points }} Pkt</span>
                    </div>
                    @for (unit of getArmyUnitsByFaction(i, group.faction); track unit.unitId) {
                      <div class="army-unit-row">
                        <span class="army-unit-name">{{ unit.unitName }}</span>
                        <span class="army-unit-pts">{{ unit.points }}</span>
                      </div>
                    }
                  }
                </mat-card-content>
              </mat-card>
            }
          </div>

          <!-- Action -->
          <div class="final-actions">
            <button mat-raised-button color="primary" (click)="startGame()">
              <mat-icon>sports_esports</mat-icon>
              Spiel starten!
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 48px; }
    .builder-container { max-width: 800px; margin: 0 auto; }
    h1 { color: #c9a84c; margin-bottom: 4px; }
    .subtitle { color: #aaa; margin-top: 0; }
    .config-card { margin-bottom: 16px; }
    .slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .slider-row mat-icon { color: #c9a84c; }
    .slider-label { font-weight: 600; }
    .points-value { color: #c9a84c; font-size: 1.5rem; font-weight: 700; margin-left: auto; }
    mat-slider { width: 100%; }
    .points-presets {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .must-include-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    mat-icon[mat-card-avatar] {
      color: #c9a84c;
      font-size: 32px;
      width: 40px;
      height: 40px;
    }
    .must-include-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 0;
      max-height: 200px;
      overflow-y: auto;
    }
    .must-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .must-name { flex: 1; font-size: 0.9em; }
    .must-pts { color: #c9a84c; font-size: 0.85em; }
    .no-units { color: #777; font-style: italic; }
    .generate-row {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
      margin: 24px 0;
    }
    mat-divider { margin: 24px 0; }
    .balance-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .balance-score {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      justify-content: center;
      border: 3px solid;
      margin-bottom: 8px;
    }
    .balance-score.good { border-color: #4caf50; color: #4caf50; }
    .balance-score.ok { border-color: #ff9800; color: #ff9800; }
    .balance-score.bad { border-color: #f44336; color: #f44336; }
    .score-number { font-size: 1.8rem; font-weight: 700; line-height: 1; }
    .score-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; }
    .balance-reasoning { color: #aaa; font-size: 0.9em; }
    .armies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .army-card { min-height: 200px; }
    .army-faction-header {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #c9a84c;
      font-weight: 600;
      font-size: 0.9em;
      margin: 12px 0 4px;
    }
    .army-faction-header mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #c9a84c;
    }
    .army-faction-meta {
      margin-left: auto;
      color: #aaa;
      font-weight: 400;
      font-size: 0.85em;
    }
    .army-unit-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0 4px 22px;
      font-size: 0.9em;
    }
    .army-unit-pts { color: #c9a84c; }
    .final-actions {
      display: flex;
      justify-content: center;
      padding: 16px 0 32px;
    }
  `,
})
export class ArmyBuilderComponent implements OnInit {
  loading = signal(true);
  generating = signal(false);
  players = signal<LocalPlayer[]>([]);
  targetPoints = signal(500);
  mustInclude1 = signal<string[]>([]);
  mustInclude2 = signal<string[]>([]);
  result = signal<BalanceResult | null>(null);
  unitLookup = new Map<string, Unit>();

  pointPresets = [250, 500, 750, 1000, 1500, 2000];

  balanceClass = computed(() => {
    const r = this.result();
    if (!r) return '';
    if (r.balanceScore >= 70) return 'good';
    if (r.balanceScore >= 40) return 'ok';
    return 'bad';
  });

  constructor(
    private playerService: PlayerService,
    private unitData: UnitDataService,
    private armyState: ArmyStateService,
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

    // Build unit lookup from all units
    const allUnits = await this.unitData.getAllUnits();
    for (const u of allUnits) {
      this.unitLookup.set(u.id, u);
    }

    this.loading.set(false);
  }

  isMustInclude(playerIdx: number, unitId: string): boolean {
    const list = playerIdx === 0 ? this.mustInclude1() : this.mustInclude2();
    return list.includes(unitId);
  }

  toggleMustInclude(playerIdx: number, unitId: string) {
    const sig = playerIdx === 0 ? this.mustInclude1 : this.mustInclude2;
    const current = sig();
    if (current.includes(unitId)) {
      sig.set(current.filter((id) => id !== unitId));
    } else {
      sig.set([...current, unitId]);
    }
  }

  async generateArmies() {
    this.generating.set(true);
    this.result.set(null);

    // Small delay to show spinner
    await new Promise((r) => setTimeout(r, 100));

    const [p1, p2] = this.players();

    const toRef = (u: { unitId: string; unitName: string; faction: string; points: number }, playerId: string): OwnedUnitRef => ({
      unitId: u.unitId,
      unitName: u.unitName,
      faction: u.faction,
      points: u.points,
      playerId,
    });

    const input: BalanceInput = {
      player1Units: p1.ownedUnits.map((u) => toRef(u, p1.id)),
      player2Units: p2.ownedUnits.map((u) => toRef(u, p2.id)),
      targetPoints: this.targetPoints(),
      mustInclude1: this.mustInclude1(),
      mustInclude2: this.mustInclude2(),
      unitLookup: this.unitLookup,
    };

    const result = buildBalancedArmies(input);
    this.result.set(result);
    this.generating.set(false);
  }

  getArmy(playerIdx: number) {
    const r = this.result();
    if (!r) return { units: [], totalPoints: 0, factions: [], powerRating: 0, factionCoherenceScore: 0 };
    return playerIdx === 0 ? r.army1 : r.army2;
  }

  getArmyUnitsByFaction(playerIdx: number, faction: string): OwnedUnitRef[] {
    const army = this.getArmy(playerIdx);
    return army.units.filter((u) => u.faction === faction);
  }

  startGame() {
    const r = this.result();
    if (r) {
      this.armyState.setResult(r, this.targetPoints());
    }
    this.router.navigate(['/game-setup']);
  }
}
