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

              @if (filteredFactions().length > 0 || searchResults().length > 0) {
                <!-- Matching factions -->
                @if (filteredFactions().length > 0) {
                  <h3 class="search-section-title">Fraktionen</h3>
                  <div class="faction-grid">
                    @for (faction of filteredFactions(); track faction.faction) {
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
                <!-- Matching units -->
                @if (searchResults().length > 0) {
                  <h3 class="search-section-title">Einheiten</h3>
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
                }
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
                  >
                    <div class="unit-row">
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
                        <div class="qty-controls">
                          <button
                            mat-icon-button
                            (click)="decreaseQuantity(unit); $event.stopPropagation()"
                            [disabled]="getOwnedCount(unit.id) === 0"
                          >
                            <mat-icon>remove_circle_outline</mat-icon>
                          </button>
                          <span class="qty-count" [class.has-qty]="getOwnedCount(unit.id) > 0">
                            {{ getOwnedCount(unit.id) }}
                          </span>
                          <button
                            mat-icon-button
                            (click)="addUnit(unit); $event.stopPropagation()"
                          >
                            <mat-icon>add_circle_outline</mat-icon>
                          </button>
                        </div>
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
                    @for (group2 of getGroupedOwnedByFaction(group.faction); track group2.unitId) {
                      <mat-card class="owned-card">
                        <div class="owned-row">
                          <div class="owned-info">
                            <span class="unit-name">
                              @if (group2.count > 1) {
                                {{ group2.count }}x
                              }
                              {{ group2.unitName }}
                            </span>
                            <span class="owned-meta">{{ group2.totalPoints }} Pkt</span>
                          </div>
                          <div class="qty-controls">
                            <button mat-icon-button (click)="removeOneOfUnit(group2.unitId); $event.stopPropagation()">
                              <mat-icon>remove_circle_outline</mat-icon>
                            </button>
                            <span class="qty-count has-qty">{{ group2.count }}</span>
                            <button mat-icon-button (click)="addUnitById(group2.unitId); $event.stopPropagation()">
                              <mat-icon>add_circle_outline</mat-icon>
                            </button>
                          </div>
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
      color: var(--mat-sys-primary);
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
      color: var(--mat-sys-primary);
      flex: 1;
    }
    .search-field { min-width: 200px; }
    .search-section-title {
      color: var(--mat-sys-primary, var(--mat-sys-primary));
      font-size: 0.9rem;
      margin: 12px 0 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .faction-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .faction-card {
      cursor: pointer;
      transition: background 0.15s;
    }
    .faction-card:hover { background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent); }
    .faction-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;
    }
    .faction-row > mat-icon:first-child { color: var(--mat-sys-primary); }
    .faction-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .faction-name { font-weight: 600; }
    .faction-count { font-size: 0.85em; color: var(--mat-sys-on-surface-variant, #aaa); }
    .owned-badge {
      background: color-mix(in srgb, var(--mat-sys-primary) 20%, transparent);
      color: var(--mat-sys-primary);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8em;
      font-weight: 600;
    }
    .chevron { color: var(--mat-sys-outline-variant, #666); }
    .unit-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .unit-card {
      cursor: pointer;
      transition: background 0.15s;
    }
    .unit-card:hover { background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent); }
    .unit-card.owned { border-left: 3px solid var(--mat-sys-primary); }
    .unit-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .check-icon { color: var(--mat-sys-outline-variant, #666); transition: color 0.15s; }
    .check-icon.active { color: var(--mat-sys-primary); }
    .add-icon { color: #4caf50; }
    .unit-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .unit-name { font-weight: 600; }
    .unit-faction, .unit-stats { font-size: 0.85em; color: var(--mat-sys-on-surface-variant, #aaa); }
    .unit-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .unit-points {
      color: var(--mat-sys-primary, var(--mat-sys-primary));
      font-weight: 600;
      white-space: nowrap;
    }
    .qty-controls {
      display: flex;
      align-items: center;
      gap: 0;
    }
    .qty-count {
      min-width: 24px;
      text-align: center;
      font-weight: 600;
      font-size: 1.1em;
      color: var(--mat-sys-on-surface-variant, #888);
    }
    .qty-count.has-qty {
      color: var(--mat-sys-primary, var(--mat-sys-primary));
    }
    .empty-state {
      text-align: center;
      padding: 48px 16px;
    }
    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--mat-sys-outline-variant, #666);
    }
    .empty-state h3 { color: var(--mat-sys-on-surface-variant, #aaa); }
    .empty-state p { color: var(--mat-sys-outline, #777); }
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
      color: var(--mat-sys-primary);
      margin: 0 0 8px;
      font-size: 1rem;
    }
    .faction-group-header mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .faction-group-meta {
      font-size: 0.8em;
      color: var(--mat-sys-on-surface-variant, #aaa);
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
    .owned-meta { font-size: 0.85em; color: var(--mat-sys-on-surface-variant, #aaa); }
    .action-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--mat-sys-surface, #0a0a0a);
      border-top: 1px solid color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
      z-index: 100;
    }
  `,
})
export class CollectionComponent implements OnInit {
  loading = signal(true);
  player = signal<LocalPlayer | null>(null);
  allPlayers = computed(() => this.playerService.players());
  factions = signal<FactionSummary[]>([]);
  filteredFactions = signal<FactionSummary[]>([]);
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
      this.filteredFactions.set([]);
      return;
    }
    const [units, factions] = await Promise.all([
      this.unitData.searchUnits(query),
      this.unitData.searchFactions(query),
    ]);
    this.searchResults.set(units);
    this.filteredFactions.set(factions);
  }

  isOwned(unitId: string): boolean {
    const p = this.player();
    if (!p) return false;
    return p.ownedUnits.some((u) => u.unitId === unitId);
  }

  getOwnedCount(unitId: string): number {
    const p = this.player();
    if (!p) return 0;
    return p.ownedUnits.filter((u) => u.unitId === unitId).length;
  }

  factionOwnedCount(faction: string): number {
    const p = this.player();
    if (!p) return 0;
    return p.ownedUnits.filter((u) => u.faction === faction).length;
  }

  async decreaseQuantity(unit: Unit) {
    const p = this.player();
    if (!p) return;
    // Remove last added copy of this unit
    const ownedCopies = p.ownedUnits.filter((u) => u.unitId === unit.id);
    if (ownedCopies.length > 0) {
      const lastCopy = ownedCopies[ownedCopies.length - 1];
      await this.playerService.removeUnit(p.id, lastCopy.id);
      const updated = await this.playerService.getPlayer(p.id);
      if (updated) this.player.set(updated);
    }
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

  getGroupedOwnedByFaction(faction: string): { unitId: string; unitName: string; count: number; totalPoints: number }[] {
    const owned = this.getOwnedByFaction(faction);
    const map = new Map<string, { unitId: string; unitName: string; count: number; totalPoints: number }>();
    for (const u of owned) {
      const existing = map.get(u.unitId);
      if (existing) {
        existing.count++;
        existing.totalPoints += u.points;
      } else {
        map.set(u.unitId, { unitId: u.unitId, unitName: u.unitName, count: 1, totalPoints: u.points });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.unitName.localeCompare(b.unitName));
  }

  async removeOneOfUnit(unitId: string) {
    const p = this.player();
    if (!p) return;
    const copies = p.ownedUnits.filter((u) => u.unitId === unitId);
    if (copies.length > 0) {
      await this.playerService.removeUnit(p.id, copies[copies.length - 1].id);
      const updated = await this.playerService.getPlayer(p.id);
      if (updated) this.player.set(updated);
    }
  }

  async addUnitById(unitId: string) {
    const p = this.player();
    if (!p) return;
    const unit = await this.unitData.getUnit(unitId);
    if (unit) {
      await this.addUnit(unit);
    }
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
