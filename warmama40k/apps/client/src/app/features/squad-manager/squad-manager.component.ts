import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import {
  PlayerService,
  LocalPlayer,
  LocalOwnedUnit,
  SquadModel,
} from '../../core/services/player.service';
import { UnitDataService } from '../../core/services/unit-data.service';
import { SquadService } from '../../core/services/squad.service';
import type { Unit } from '@warmama40k/shared';
import { SquadPhotoPickerComponent } from './squad-photo-picker.component';
import { WeaponLoadoutEditorComponent } from './weapon-loadout-editor.component';

@Component({
  selector: 'app-squad-manager',
  imports: [
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatChipsModule,
    SquadPhotoPickerComponent,
    WeaponLoadoutEditorComponent,
  ],
  template: `
    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="48" />
      </div>
    } @else if (player()) {
      <div class="squad-container">
        <h1 class="page-title">
          <mat-icon>groups</mat-icon>
          Trupps konfigurieren
        </h1>

        <!-- Player tabs -->
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

        <!-- Squad cards -->
        <div class="squad-list">
          @for (group of groupedUnits(); track group.unitId) {
            <mat-card class="squad-card" [class.expanded]="selectedUnitId() === group.units[0].id">
              <!-- Squad header (always visible) -->
              <div class="squad-header" (click)="toggleExpand(group.units[0].id)">
                @if (group.units[0].photoUrl) {
                  <img [src]="group.units[0].photoUrl" alt="" class="squad-thumb" />
                } @else {
                  <div class="squad-thumb-placeholder">
                    <mat-icon>{{ getUnitTypeIcon(group.unitId) }}</mat-icon>
                  </div>
                }
                <div class="squad-info">
                  <span class="squad-nickname">
                    {{ group.units[0].nickname || group.units[0].unitName }}
                  </span>
                  @if (group.units[0].nickname) {
                    <span class="original-name">{{ group.units[0].unitName }}</span>
                  }
                  <span class="squad-meta">
                    @if (group.count > 1) {
                      {{ group.count }}x ·
                    }
                    {{ group.totalPoints }} Pkt · {{ group.units[0].selectedModelCount }} Modelle
                  </span>
                  @if (getWeaponSummary(group.units[0])) {
                    <span class="squad-weapons">{{ getWeaponSummary(group.units[0]) }}</span>
                  }
                </div>
                <mat-icon class="expand-icon">
                  {{ selectedUnitId() === group.units[0].id ? 'expand_less' : 'expand_more' }}
                </mat-icon>
              </div>

              <!-- Expanded editor -->
              @if (selectedUnitId() === group.units[0].id) {
                <mat-divider />
                <div class="squad-editor">
                  <!-- Nickname -->
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Trupp-Spitzname</mat-label>
                    <input
                      matInput
                      [ngModel]="group.units[0].nickname ?? ''"
                      (ngModelChange)="saveNickname(group.units[0].id, $event)"
                      [placeholder]="group.units[0].unitName"
                    />
                    <mat-icon matPrefix>edit</mat-icon>
                  </mat-form-field>

                  <!-- Photo -->
                  <app-squad-photo-picker
                    [currentPhoto]="group.units[0].photoUrl"
                    (photoChanged)="savePhoto(group.units[0].id, $event)"
                    (photoRemoved)="removePhoto(group.units[0].id)"
                  />

                  <!-- Weapon Loadout -->
                  @if (unitDataMap().get(group.unitId); as unitData) {
                    <app-weapon-loadout-editor
                      [unitData]="unitData"
                      [initialModels]="group.units[0].squadModels ?? []"
                      [modelCount]="group.units[0].selectedModelCount"
                      (modelsChanged)="saveWeapons(group.units[0].id, $event)"
                    />
                  }
                </div>
              }
            </mat-card>
          }
        </div>

        <!-- Bottom action bar -->
        <div class="action-bar">
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Zurueck
          </button>
          <div class="action-bar-stats">
            <span class="action-bar-count">{{ player()!.ownedUnits.length }} Einheiten</span>
            <span class="action-bar-points">{{ totalPoints() }} Pkt</span>
          </div>
          @if (isLastPlayer()) {
            <button mat-raised-button color="primary" (click)="proceed()">
              <mat-icon>play_arrow</mat-icon>
              Weiter zur Uebersicht
            </button>
          } @else {
            <button mat-raised-button color="primary" (click)="proceed()">
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
    .squad-container { max-width: 700px; margin: 0 auto; padding-bottom: 80px; }
    .page-title {
      display: flex; align-items: center; gap: 8px;
      color: var(--mat-sys-primary); margin-bottom: 16px;
    }
    .page-title mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .player-tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .unit-count { margin-left: 4px; opacity: 0.7; }
    .squad-list { display: flex; flex-direction: column; gap: 8px; }
    .squad-card { cursor: pointer; transition: all 0.2s; }
    .squad-card.expanded { border-left: 3px solid var(--mat-sys-primary); }
    .squad-header {
      display: flex; align-items: center; gap: 12px; padding: 8px;
    }
    .squad-thumb {
      width: 56px; height: 56px; border-radius: 10px; object-fit: cover;
      border: 1px solid var(--mat-sys-outline-variant, #666);
    }
    .squad-thumb-placeholder {
      width: 56px; height: 56px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--mat-sys-primary) 8%, transparent);
    }
    .squad-thumb-placeholder mat-icon {
      color: var(--mat-sys-on-surface-variant, #888);
    }
    .squad-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .squad-nickname { font-weight: 600; }
    .original-name { display: block; font-weight: 400; font-size: 0.8em; color: var(--mat-sys-on-surface-variant, #aaa); }
    .squad-meta { font-size: 0.85em; color: var(--mat-sys-on-surface-variant, #aaa); }
    .squad-weapons { font-size: 0.8em; color: var(--mat-sys-primary); }
    .expand-icon { color: var(--mat-sys-on-surface-variant, #888); }
    .squad-editor { padding: 16px 8px; display: flex; flex-direction: column; gap: 16px; }
    .full-width { width: 100%; }
    .action-bar {
      position: fixed; bottom: 0; left: 0; right: 0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px;
      background: var(--mat-sys-surface, #0a0a0a);
      border-top: 1px solid color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
      z-index: 100;
    }
    .action-bar-stats { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .action-bar-count { font-weight: 600; font-size: 0.95em; color: var(--mat-sys-primary); }
    .action-bar-points { font-size: 0.8em; color: var(--mat-sys-on-surface-variant, #aaa); }
  `,
})
export class SquadManagerComponent implements OnInit {
  private playerService = inject(PlayerService);
  private unitData = inject(UnitDataService);
  private squadService = inject(SquadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(true);
  player = signal<LocalPlayer | null>(null);
  allPlayers = computed(() => this.playerService.players());
  unitDataMap = signal<Map<string, Unit>>(new Map());
  selectedUnitId = signal<string | null>(null);

  totalPoints = computed(() => {
    const p = this.player();
    if (!p) return 0;
    return p.ownedUnits.reduce((sum, u) => sum + u.points, 0);
  });

  /** Group owned units by unitId (multiple copies grouped) */
  groupedUnits = computed(() => {
    const p = this.player();
    if (!p) return [];
    const map = new Map<string, {
      unitId: string;
      units: LocalOwnedUnit[];
      count: number;
      totalPoints: number;
    }>();
    for (const u of p.ownedUnits) {
      const existing = map.get(u.unitId);
      if (existing) {
        existing.units.push(u);
        existing.count++;
        existing.totalPoints += u.points;
      } else {
        map.set(u.unitId, {
          unitId: u.unitId,
          units: [u],
          count: 1,
          totalPoints: u.points,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => a.units[0].unitName.localeCompare(b.units[0].unitName)
    );
  });

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

    // Load unit data for weapon info
    await this.unitData.ensureLoaded();
    const lookup = new Map<string, Unit>();
    for (const u of player.ownedUnits) {
      if (!lookup.has(u.unitId)) {
        const data = await this.unitData.getUnit(u.unitId);
        if (data) lookup.set(u.unitId, data);
      }
    }
    this.unitDataMap.set(lookup);
    this.loading.set(false);
  }

  switchPlayer(playerId: string) {
    // Reset UI state synchronously BEFORE any async work
    this.selectedUnitId.set(null);
    this.loading.set(true);
    this.router.navigate(['/squad-setup', playerId]);
    this.playerService.getPlayer(playerId).then(async (p) => {
      if (p) {
        this.player.set(p);
        const lookup = new Map<string, Unit>();
        for (const u of p.ownedUnits) {
          if (!lookup.has(u.unitId)) {
            const data = await this.unitData.getUnit(u.unitId);
            if (data) lookup.set(u.unitId, data);
          }
        }
        this.unitDataMap.set(lookup);
        this.loading.set(false);
      }
    });
  }

  toggleExpand(unitId: string) {
    this.selectedUnitId.update((current) =>
      current === unitId ? null : unitId
    );
  }

  /** Update local player state without full reload (prevents re-render loops) */
  private updateUnitLocally(ownedUnitId: string, changes: Partial<LocalOwnedUnit>) {
    const p = this.player();
    if (!p) return;
    const updated: LocalPlayer = {
      ...p,
      ownedUnits: p.ownedUnits.map((u) =>
        u.id === ownedUnitId ? { ...u, ...changes } : u
      ),
    };
    this.player.set(updated);
  }

  private nicknameTimer: ReturnType<typeof setTimeout> | null = null;

  saveNickname(ownedUnitId: string, nickname: string) {
    const p = this.player();
    if (!p) return;
    this.updateUnitLocally(ownedUnitId, { nickname });
    // Debounce persistence to avoid hammering IndexedDB on every keystroke
    if (this.nicknameTimer) clearTimeout(this.nicknameTimer);
    this.nicknameTimer = setTimeout(() => {
      this.playerService.updateSquadNickname(p.id, ownedUnitId, nickname);
    }, 400);
  }

  savePhoto(ownedUnitId: string, base64: string) {
    const p = this.player();
    if (!p) return;
    this.updateUnitLocally(ownedUnitId, { photoUrl: base64 });
    this.playerService.updateSquadPhoto(p.id, ownedUnitId, base64);
  }

  removePhoto(ownedUnitId: string) {
    const p = this.player();
    if (!p) return;
    this.updateUnitLocally(ownedUnitId, { photoUrl: undefined });
    this.playerService.updateUnit(p.id, ownedUnitId, { photoUrl: undefined });
  }

  saveWeapons(ownedUnitId: string, models: SquadModel[]) {
    const p = this.player();
    if (!p) return;
    this.updateUnitLocally(ownedUnitId, { squadModels: models });
    this.playerService.updateSquadModels(p.id, ownedUnitId, models);
  }

  getWeaponSummary(unit: LocalOwnedUnit): string {
    if (!unit.squadModels || unit.squadModels.length === 0) return '';
    const groups = this.squadService.computeWeaponGroups(unit.squadModels);
    return this.squadService.getWeaponGroupSummary(groups);
  }

  getUnitTypeIcon(unitId: string): string {
    const data = this.unitDataMap().get(unitId);
    if (!data) return 'shield';
    const tags = data.tags?.map((t) => t.toLowerCase()) ?? [];
    if (tags.includes('aircraft')) return 'flight';
    if (tags.includes('vehicle') && tags.includes('walker')) return 'smart_toy';
    if (tags.includes('vehicle')) return 'local_shipping';
    if (tags.includes('monster')) return 'pest_control';
    if (tags.includes('character') || tags.includes('epic hero')) return 'stars';
    return 'directions_walk';
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
    const idx = players.findIndex((p) => p.id === current.id);
    if (idx < players.length - 1) {
      this.switchPlayer(players[idx + 1].id);
    } else {
      this.router.navigate(['/overview']);
    }
  }

  goBack() {
    const current = this.player();
    if (current) {
      this.router.navigate(['/collection', current.id]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
