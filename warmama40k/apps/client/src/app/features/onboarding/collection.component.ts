import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import {
  PlayerService,
  LocalPlayer,
  LocalOwnedUnit,
} from '../../core/services/player.service';
import {
  UnitDataService,
  FactionSummary,
} from '../../core/services/unit-data.service';
import type { Unit } from '@warmama40k/shared';

type ViewMode = 'factions' | 'units' | 'summary';

@Component({
  selector: 'app-collection',
  imports: [
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTabsModule,
  ],
  template: `
    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="48" />
      </div>
    } @else if (player()) {
      <div class="collection-container">
        <!-- Player Header -->
        <div class="player-header">
          <div class="player-tabs">
            @for (p of allPlayers(); track p.id) {
              <button
                mat-raised-button
                [color]="p.id === player()!.id ? 'primary' : undefined"
                (click)="switchPlayer(p.id)"
              >
                <mat-icon>person</mat-icon>
                {{ p.name }}
                <span class="unit-count">({{ p.ownedUnits.length }})</span>
              </button>
            }
          </div>
          <div class="player-stats">
            <span class="stat">{{ player()!.ownedUnits.length }} Einheiten</span>
            <span class="stat">{{ totalPoints() }} Punkte</span>
          </div>
        </div>

        <!-- Tabs: Browse / My Collection -->
        <mat-tab-group
          [(selectedIndex)]="tabIndex"
          class="collection-tabs"
          mat-stretch-tabs="false"
        >
          <!-- Tab 1: Add Units -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>add_circle</mat-icon>
              <span class="tab-label">Einheiten hinzufuegen</span>
            </ng-template>

            @if (viewMode() === 'factions') {
              <!-- Faction picker -->
              <div class="section-header">
                <h2>Fraktion waehlen</h2>
                <mat-form-field appearance="outline" class="search-field">
                  <mat-label>Suchen...</mat-label>
                  <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearch($event)" />
                  <mat-icon matPrefix>search</mat-icon>
                </mat-form-field>
              </div>

              @if (searchResults().length > 0) {
                <div class="unit-list">
                  @for (unit of searchResults(); track unit.id) {
                    <mat-card class="unit-card" (click)="addUnit(unit)">
                      <div class="unit-row">
                        <div class="unit-info">
                          <span class="unit-name">{{ unit.name }}</span>
                          <span class="unit-faction">{{ unit.faction }}</span>
                        </div>
                        <div class="unit-meta">
                          <span class="unit-points">{{ unit.points || 0 }} Pkt</span>
                          <mat-icon class="add-icon">add_circle</mat-icon>
                        </div>
                      </div>
                    </mat-card>
                  }
                </div>
              } @else {
                <div class="faction-grid">
                  @for (faction of factions(); track faction.faction) {
                    <mat-card class="faction-card" (click)="selectFaction(faction.faction)">
                      <div class="faction-row">
                        <mat-icon>shield</mat-icon>
                        <div class="faction-info">
                          <span class="faction-name">{{ faction.faction }}</span>
                          <span class="faction-count">{{ faction.unitCount }} Einheiten</span>
                        </div>
                        @if (factionOwnedCount(faction.faction) > 0) {
                          <span class="owned-badge">
                            {{ factionOwnedCount(faction.faction) }} gewaehlt
                          </span>
                        }
                        <mat-icon class="chevron">chevron_right</mat-icon>
                      </div>
                    </mat-card>
                  }
                </div>
              }
            } @else if (viewMode() === 'units') {
              <!-- Unit list for selected faction -->
              <div class="section-header">
                <button mat-icon-button (click)="backToFactions()">
                  <mat-icon>arrow_back</mat-icon>
                </button>
                <h2>{{ selectedFaction() }}</h2>
              </div>

              <div class="unit-list">
                @for (unit of factionUnits(); track unit.id) {
                  <mat-card
                    class="unit-card"
                    [class.owned]="isOwned(unit.id)"
                    (click)="toggleUnit(unit)"
                  >
                    <div class="unit-row">
                      <mat-icon class="check-icon" [class.active]="isOwned(unit.id)">
                        {{ isOwned(unit.id) ? 'check_circle' : 'radio_button_unchecked' }}
                      </mat-icon>
                      <div class="unit-info">
                        <span class="unit-name">{{ unit.name }}</span>
                        <span class="unit-stats">
                          T{{ unit.stats.toughness }}
                          W{{ unit.stats.wounds }}
                          Sv{{ unit.stats.armourSave }}+
                          @if (unit.stats.invulnerableSave) {
                            Inv{{ unit.stats.invulnerableSave }}+
                          }
                        </span>
                      </div>
                      <div class="unit-meta">
                        <span class="unit-points">{{ unit.points || 0 }} Pkt</span>
                      </div>
                    </div>
                  </mat-card>
                }
              </div>
            }
          </mat-tab>

          <!-- Tab 2: My Collection -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>inventory_2</mat-icon>
              <span class="tab-label">Meine Sammlung ({{ player()!.ownedUnits.length }})</span>
            </ng-template>

            @if (player()!.ownedUnits.length === 0) {
              <div class="empty-state">
                <mat-icon>inventory_2</mat-icon>
                <h3>Noch keine Einheiten</h3>
                <p>Wechsle zum Tab "Einheiten hinzufuegen" und waehle deine Miniaturen aus!</p>
              </div>
            } @else {
              <div class="owned-list">
                @for (group of factionBreakdown(); track group.faction) {
                  <div class="faction-group">
                    <h3 class="faction-group-header">
                      <mat-icon>shield</mat-icon>
                      {{ group.faction }}
                      <span class="faction-group-meta">
                        {{ group.count }} Einheiten / {{ group.points }} Pkt
                      </span>
                    </h3>
                    @for (owned of getOwnedByFaction(group.faction); track owned.id) {
                      <mat-card class="owned-card">
                        <div class="owned-row">
                          <div class="owned-info">
                            <span class="unit-name">{{ owned.unitName }}</span>
                            <span class="owned-meta">{{ owned.points }} Pkt</span>
                          </div>
                          <button mat-icon-button color="warn" (click)="removeUnit(owned.id); $event.stopPropagation()">
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </mat-card>
                    }
                  </div>
                }
              </div>
            }
          </mat-tab>
        </mat-tab-group>

        <!-- Bottom action bar -->
        <div class="action-bar">
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Zurueck
          </button>
          @if (isLastPlayer()) {
            <button
              mat-raised-button
              color="primary"
              (click)="proceed()"
              [disabled]="!canProceed()"
            >
              <mat-icon>check</mat-icon>
              Fertig!
            </button>
          } @else {
            <button
              mat-raised-button
              color="primary"
              (click)="proceed()"
              [disabled]="!canProceed()"
            >
              <mat-icon>navigate_next</mat-icon>
              Naechster Spieler
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .loading { display: flex; justify-content: center; padding: 48px; }
    .collection-container {
      max-width: 700px;
      margin: 0 auto;
    }
    .player-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    .player-tabs {
      display: flex;
      gap: 8px;
    }
    .unit-count { margin-left: 4px; opacity: 0.7; }
    .player-stats {
      display: flex;
      gap: 16px;
    }
    .stat {
      color: #c9a84c;
      font-weight: 600;
      font-size: 0.9em;
    }
    .collection-tabs { margin-bottom: 72px; }
    .tab-label { margin-left: 8px; }
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 16px 0 12px;
    }
    .section-header h2 {
      margin: 0;
      color: #c9a84c;
      flex: 1;
    }
    .search-field { min-width: 200px; }
    .faction-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .faction-card {
      cursor: pointer;
      transition: background 0.15s;
    }
    .faction-card:hover { background: rgba(201, 168, 76, 0.08); }
    .faction-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;
    }
    .faction-row > mat-icon:first-child { color: #c9a84c; }
    .faction-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .faction-name { font-weight: 600; }
    .faction-count { font-size: 0.85em; color: #aaa; }
    .owned-badge {
      background: rgba(201, 168, 76, 0.2);
      color: #c9a84c;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 600;
    }
    .chevron { color: #666; }
    .unit-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .unit-card {
      cursor: pointer;
      transition: background 0.15s;
    }
    .unit-card:hover { background: rgba(201, 168, 76, 0.08); }
    .unit-card.owned { border-left: 3px solid #c9a84c; }
    .unit-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .check-icon { color: #666; transition: color 0.15s; }
    .check-icon.active { color: #c9a84c; }
    .add-icon { color: #4caf50; }
    .unit-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .unit-name { font-weight: 600; }
    .unit-faction, .unit-stats { font-size: 0.85em; color: #aaa; }
    .unit-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .unit-points {
      color: #c9a84c;
      font-weight: 600;
      white-space: nowrap;
    }
    .empty-state {
      text-align: center;
      padding: 48px 16px;
    }
    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #666;
    }
    .empty-state h3 { color: #aaa; }
    .empty-state p { color: #777; }
    .owned-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }
    .faction-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #c9a84c;
      margin: 0 0 8px;
      font-size: 1rem;
    }
    .faction-group-header mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .faction-group-meta {
      font-size: 0.8em;
      color: #aaa;
      font-weight: 400;
      margin-left: auto;
    }
    .owned-card {
      margin-left: 28px;
    }
    .owned-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .owned-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .owned-meta { font-size: 0.85em; color: #aaa; }
    .action-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      background: #1a1a2e;
      border-top: 1px solid rgba(201, 168, 76, 0.3);
      z-index: 100;
    }
  `,
})
export class CollectionComponent implements OnInit {
  loading = signal(true);
  player = signal<LocalPlayer | null>(null);
  allPlayers = computed(() => this.playerService.players());
  factions = signal<FactionSummary[]>([]);
  factionUnits = signal<Unit[]>([]);
  searchResults = signal<Unit[]>([]);
  viewMode = signal<ViewMode>('factions');
  selectedFaction = signal('');
  tabIndex = 0;
  searchQuery = '';

  totalPoints = computed(() => {
    const p = this.player();
    if (!p) return 0;
    return p.ownedUnits.reduce((sum, u) => sum + u.points, 0);
  });

  factionBreakdown = computed(() => {
    const p = this.player();
    if (!p) return [];
    return this.playerService.getFactionBreakdown(p.id);
  });

  constructor(
    public playerService: PlayerService,
    private unitData: UnitDataService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.playerService.ensureLoaded();
    const playerId = this.route.snapshot.paramMap.get('playerId');
    if (!playerId) {
      this.router.navigate(['/']);
      return;
    }

    const player = await this.playerService.getPlayer(playerId);
    if (!player) {
      this.router.navigate(['/']);
      return;
    }

    this.player.set(player);
    const factions = await this.unitData.getFactions();
    this.factions.set(factions);
    this.loading.set(false);
  }

  switchPlayer(playerId: string) {
    this.router.navigate(['/collection', playerId]);
    // Reload
    this.loading.set(true);
    this.viewMode.set('factions');
    this.searchQuery = '';
    this.searchResults.set([]);
    this.playerService.getPlayer(playerId).then((p) => {
      if (p) {
        this.player.set(p);
        this.loading.set(false);
      }
    });
  }

  async selectFaction(faction: string) {
    this.selectedFaction.set(faction);
    const units = await this.unitData.getUnitsByFaction(faction);
    this.factionUnits.set(units);
    this.viewMode.set('units');
  }

  backToFactions() {
    this.viewMode.set('factions');
    this.selectedFaction.set('');
    this.factionUnits.set([]);
  }

  async onSearch(query: string) {
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }
    const results = await this.unitData.searchUnits(query);
    this.searchResults.set(results);
  }

  isOwned(unitId: string): boolean {
    const p = this.player();
    if (!p) return false;
    return p.ownedUnits.some((u) => u.unitId === unitId);
  }

  factionOwnedCount(faction: string): number {
    const p = this.player();
    if (!p) return 0;
    return p.ownedUnits.filter((u) => u.faction === faction).length;
  }

  async toggleUnit(unit: Unit) {
    const p = this.player();
    if (!p) return;

    if (this.isOwned(unit.id)) {
      const owned = p.ownedUnits.find((u) => u.unitId === unit.id);
      if (owned) {
        await this.playerService.removeUnit(p.id, owned.id);
      }
    } else {
      await this.addUnit(unit);
    }
    // Refresh player state
    const updated = await this.playerService.getPlayer(p.id);
    if (updated) this.player.set(updated);
  }

  async addUnit(unit: Unit) {
    const p = this.player();
    if (!p) return;

    const owned: LocalOwnedUnit = {
      id: crypto.randomUUID(),
      unitId: unit.id,
      unitName: unit.name,
      faction: unit.faction,
      selectedModelCount: unit.stats.modelCount || 1,
      selectedWeapons: [],
      points: unit.points || 0,
    };
    await this.playerService.addUnit(p.id, owned);
    const updated = await this.playerService.getPlayer(p.id);
    if (updated) this.player.set(updated);
  }

  async removeUnit(ownedUnitId: string) {
    const p = this.player();
    if (!p) return;
    await this.playerService.removeUnit(p.id, ownedUnitId);
    const updated = await this.playerService.getPlayer(p.id);
    if (updated) this.player.set(updated);
  }

  getOwnedByFaction(faction: string): LocalOwnedUnit[] {
    const p = this.player();
    if (!p) return [];
    return p.ownedUnits.filter((u) => u.faction === faction);
  }

  canProceed(): boolean {
    const p = this.player();
    return !!p && p.ownedUnits.length > 0;
  }

  isLastPlayer(): boolean {
    const players = this.allPlayers();
    const current = this.player();
    if (!current || players.length < 2) return true;
    return players[players.length - 1].id === current.id;
  }

  proceed() {
    const players = this.allPlayers();
    const current = this.player();
    if (!current) return;

    const currentIdx = players.findIndex((p) => p.id === current.id);
    if (currentIdx < players.length - 1) {
      // Switch to next player
      this.switchPlayer(players[currentIdx + 1].id);
    } else {
      // All done - go to overview
      this.router.navigate(['/overview']);
    }
  }

  goBack() {
    const players = this.allPlayers();
    const current = this.player();
    if (!current) {
      this.router.navigate(['/']);
      return;
    }

    const currentIdx = players.findIndex((p) => p.id === current.id);
    if (currentIdx > 0) {
      this.switchPlayer(players[currentIdx - 1].id);
    } else {
      this.router.navigate(['/']);
    }
  }
}
