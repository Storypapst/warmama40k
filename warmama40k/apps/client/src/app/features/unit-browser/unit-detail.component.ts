import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { UnitDataService } from '../../core/services/unit-data.service';
import type { Unit, Weapon } from '@warmama40k/shared';

@Component({
  selector: 'app-unit-detail',
  imports: [
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="48" /></div>
    } @else if (unit(); as u) {
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1>{{ u.name }}</h1>
          <p class="subtitle">{{ u.faction }} - {{ u.points }} Punkte</p>
        </div>
      </div>

      <!-- Stats Block -->
      <mat-card class="stats-card">
        <mat-card-header>
          <mat-card-title>Profil</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="stats-grid">
            <div class="stat-box">
              <span class="stat-label">M</span>
              <span class="stat-value">{{ u.stats.movement }}"</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">T</span>
              <span class="stat-value">{{ u.stats.toughness }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">W</span>
              <span class="stat-value">{{ u.stats.wounds }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Ld</span>
              <span class="stat-value">{{ u.stats.leadership }}+</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">OC</span>
              <span class="stat-value">{{ u.stats.objectiveControl }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Sv</span>
              <span class="stat-value">{{ u.stats.armourSave }}+</span>
            </div>
            @if (u.stats.invulnerableSave) {
              <div class="stat-box invuln">
                <span class="stat-label">Inv</span>
                <span class="stat-value">{{ u.stats.invulnerableSave }}++</span>
              </div>
            }
          </div>
          <div class="model-info">
            <span>Modelle: {{ u.stats.modelCount }}</span>
            @if (u.composition.compositionOptions.length > 1) {
              <span class="comp-options">
                (Optionen:
                @for (opt of u.composition.compositionOptions; track opt.modelCount; let last = $last) {
                  {{ opt.modelCount }} Modelle = {{ opt.points }} Pkt{{ last ? '' : ', ' }}
                }
                )
              </span>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Ranged Weapons -->
      @if (u.rangedWeapons.length > 0) {
        <mat-card class="weapons-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>gps_fixed</mat-icon>
            <mat-card-title>Fernkampfwaffen</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (w of u.rangedWeapons; track w.name) {
              <div class="weapon-row">
                <div class="weapon-name">{{ w.name }}</div>
                <div class="weapon-stats">
                  <span class="ws">{{ w.range }}"</span>
                  <span class="ws">BS{{ w.ballisticSkill }}+</span>
                  <span class="ws">S{{ w.strength }}</span>
                  <span class="ws">AP-{{ w.armourPenetration }}</span>
                  <span class="ws">D{{ w.damage }}</span>
                  <span class="ws">A{{ w.attacks }}</span>
                </div>
                @if (getWeaponAbilityText(w); as abText) {
                  <div class="weapon-abilities">{{ abText }}</div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Melee Weapons -->
      @if (u.meleeWeapons.length > 0) {
        <mat-card class="weapons-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>swords</mat-icon>
            <mat-card-title>Nahkampfwaffen</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (w of u.meleeWeapons; track w.name) {
              <div class="weapon-row">
                <div class="weapon-name">{{ w.name }}</div>
                <div class="weapon-stats">
                  <span class="ws">WS{{ w.ballisticSkill }}+</span>
                  <span class="ws">S{{ w.strength }}</span>
                  <span class="ws">AP-{{ w.armourPenetration }}</span>
                  <span class="ws">D{{ w.damage }}</span>
                  <span class="ws">A{{ w.attacks }}</span>
                </div>
                @if (getWeaponAbilityText(w); as abText) {
                  <div class="weapon-abilities">{{ abText }}</div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Tags -->
      @if (u.tags.length > 0) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>Keywords</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-chip-set>
              @for (tag of u.tags; track tag) {
                <mat-chip>{{ tag }}</mat-chip>
              }
            </mat-chip-set>
          </mat-card-content>
        </mat-card>
      }

      <!-- Modifiers -->
      @if (u.globalModifiers || u.defenderGlobalModifiers) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>Spezialregeln</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (u.globalModifiers; as gm) {
              <div class="modifiers">
                @if (gm.plusOneToHit) { <span class="mod">+1 to Hit</span> }
                @if (gm.plusOneToWound) { <span class="mod">+1 to Wound</span> }
                @if (gm.rerollHits) { <span class="mod">Reroll Hits</span> }
                @if (gm.rerollOnesHits) { <span class="mod">Reroll 1s (Hit)</span> }
                @if (gm.rerollWounds) { <span class="mod">Reroll Wounds</span> }
                @if (gm.rerollOnesWounds) { <span class="mod">Reroll 1s (Wound)</span> }
              </div>
            }
            @if (u.defenderGlobalModifiers; as dm) {
              <div class="modifiers">
                @if (dm.feelNoPain) { <span class="mod defend">Feel No Pain {{ dm.feelNoPain }}+</span> }
                @if (dm.stealth) { <span class="mod defend">Stealth</span> }
                @if (dm.minusOneDamage) { <span class="mod defend">-1 Damage</span> }
                @if (dm.halfDamage) { <span class="mod defend">Half Damage</span> }
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: `
    .header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
    h1 { margin: 0; color: var(--mat-sys-primary); }
    .subtitle { margin: 4px 0 0; color: #888; }
    .loading { display: flex; justify-content: center; padding: 48px; }

    mat-card { margin-bottom: 12px; }

    .stats-grid {
      display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;
    }
    .stat-box {
      display: flex; flex-direction: column; align-items: center;
      background: #2a2a4e; border-radius: 8px; padding: 8px 14px; min-width: 55px;
    }
    .stat-label { font-size: 11px; color: #888; text-transform: uppercase; }
    .stat-value { font-size: 20px; font-weight: 700; font-family: monospace; }
    .invuln { border: 2px solid var(--mat-sys-primary); }
    .invuln .stat-value { color: var(--mat-sys-primary); }
    .model-info { color: var(--mat-sys-on-surface-variant, #aaa); font-size: 13px; }
    .comp-options { color: #888; }

    .weapon-row {
      padding: 8px 0; border-bottom: 1px solid #333;
    }
    .weapon-row:last-child { border-bottom: none; }
    .weapon-name { font-weight: 500; margin-bottom: 4px; }
    .weapon-stats { display: flex; gap: 6px; flex-wrap: wrap; }
    .ws {
      background: #2a2a4e; padding: 2px 6px; border-radius: 4px;
      font-family: monospace; font-size: 12px;
    }
    .weapon-abilities {
      margin-top: 4px; color: var(--mat-sys-primary); font-size: 12px; font-style: italic;
    }

    .modifiers { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .mod {
      background: #2a4a2a; padding: 4px 10px; border-radius: 12px;
      font-size: 12px; color: #8f8;
    }
    .defend {
      background: #4a2a2a; color: #f88;
    }

    mat-icon[mat-card-avatar] { color: var(--mat-sys-primary); }
  `,
})
export class UnitDetailComponent implements OnInit {
  unit = signal<Unit | undefined>(undefined);
  loading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private unitData: UnitDataService,
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    const unit = await this.unitData.getUnit(id);
    this.unit.set(unit);
    this.loading.set(false);
  }

  goBack() {
    const u = this.unit();
    if (u) {
      window.history.back();
    }
  }

  getWeaponAbilityText(weapon: Weapon): string {
    const ab = weapon.abilities;
    const parts: string[] = [];

    if (ab.lethalHits) parts.push('Lethal Hits');
    if (ab.sustainedHits !== undefined)
      parts.push(`Sustained Hits ${ab.sustainedHits}`);
    if (ab.devastatingWounds) parts.push('Devastating Wounds');
    if (ab.twinLinked) parts.push('Twin-linked');
    if (ab.blast) parts.push('Blast');
    if (ab.rapidFire) parts.push(`Rapid Fire ${ab.rapidFire}`);
    if (ab.melta) parts.push(`Melta ${ab.melta}`);
    if (ab.autoHit) parts.push('Torrent');
    if (ab.ignoresCover) parts.push('Ignores Cover');
    if (ab.indirectFire) parts.push('Indirect Fire');
    if (ab.oneShot) parts.push('One Shot');
    if (ab.anti) parts.push(`Anti-${ab.anti.targetType} ${ab.anti.rollNeeded}+`);
    if (ab.plusOneToWound) parts.push('+1 to Wound');

    return parts.join(', ');
  }
}
