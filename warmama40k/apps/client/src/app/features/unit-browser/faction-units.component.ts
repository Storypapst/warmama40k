import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UnitDataService } from '../../core/services/unit-data.service';
import type { Unit } from '@warmama40k/shared';

@Component({
  selector: 'app-faction-units',
  imports: [
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="header">
      <button mat-icon-button routerLink="/units">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h1>{{ factionName() }}</h1>
      <span class="unit-count">{{ units().length }} Einheiten</span>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="48" />
      </div>
    } @else {
      <div class="unit-grid">
        @for (unit of units(); track unit.id) {
          <mat-card class="unit-card" [routerLink]="['/unit', unit.id]">
            <mat-card-header>
              <mat-card-title>{{ unit.name }}</mat-card-title>
              <mat-card-subtitle>{{ unit.points }} Punkte</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="stat-row">
                <span class="stat">M{{ unit.stats.movement }}"</span>
                <span class="stat">T{{ unit.stats.toughness }}</span>
                <span class="stat">W{{ unit.stats.wounds }}</span>
                <span class="stat">Sv{{ unit.stats.armourSave }}+</span>
                @if (unit.stats.invulnerableSave) {
                  <span class="stat invuln">{{ unit.stats.invulnerableSave }}++</span>
                }
                <span class="stat">OC{{ unit.stats.objectiveControl }}</span>
              </div>
              <mat-chip-set class="tags">
                @for (tag of unit.tags.slice(0, 4); track tag) {
                  <mat-chip>{{ tag }}</mat-chip>
                }
              </mat-chip-set>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    h1 { margin: 0; color: var(--mat-sys-primary); flex: 1; }
    .unit-count { color: #888; }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .unit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
    }
    .unit-card {
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .unit-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
    }
    .stat-row {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    .stat {
      background: #2a2a4e;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      color: #e0e0e0;
    }
    .invuln {
      color: var(--mat-sys-primary);
      border: 1px solid var(--mat-sys-primary);
    }
    .tags { margin-top: 8px; }
  `,
})
export class FactionUnitsComponent implements OnInit {
  factionName = signal('');
  units = signal<Unit[]>([]);
  loading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private unitData: UnitDataService,
  ) {}

  async ngOnInit() {
    const faction = this.route.snapshot.paramMap.get('faction') || '';
    this.factionName.set(faction);
    const units = await this.unitData.getUnitsByFaction(faction);
    this.units.set(units);
    this.loading.set(false);
  }
}
