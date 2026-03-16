import { Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import {
  UnitDataService,
  FactionSummary,
} from '../../core/services/unit-data.service';
import type { Unit } from '@warmama40k/shared';

@Component({
  selector: 'app-unit-browser',
  imports: [
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  template: `
    <div class="browser-header">
      <h1>Fraktionen</h1>
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Einheit suchen...</mat-label>
        <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearch($event)" />
        <mat-icon matPrefix>search</mat-icon>
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="48" />
      </div>
    } @else if (searchResults().length > 0) {
      <div class="search-results">
        <h2>Suchergebnisse ({{ searchResults().length }})</h2>
        <div class="unit-grid">
          @for (unit of searchResults(); track unit.id) {
            <mat-card class="unit-card" [routerLink]="['/unit', unit.id]">
              <mat-card-header>
                <mat-icon mat-card-avatar>person</mat-icon>
                <mat-card-title>{{ unit.name }}</mat-card-title>
                <mat-card-subtitle>{{ unit.faction }} - {{ unit.points }} Pkt</mat-card-subtitle>
              </mat-card-header>
            </mat-card>
          }
        </div>
      </div>
    } @else {
      <div class="faction-grid">
        @for (faction of factions(); track faction.faction) {
          <mat-card class="faction-card" [routerLink]="['/units', faction.faction]">
            <mat-card-header>
              <mat-icon mat-card-avatar>shield</mat-icon>
              <mat-card-title>{{ faction.faction }}</mat-card-title>
              <mat-card-subtitle>{{ faction.unitCount }} Einheiten</mat-card-subtitle>
            </mat-card-header>
          </mat-card>
        }
      </div>
    }
  `,
  styles: `
    .browser-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
    }
    h1 { margin: 0; color: var(--mat-sys-primary); }
    .search-field { min-width: 250px; }
    .loading { display: flex; justify-content: center; padding: 48px; }
    .faction-grid, .unit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .faction-card, .unit-card {
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .faction-card:hover, .unit-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
    }
    mat-icon[mat-card-avatar] {
      color: var(--mat-sys-primary);
      font-size: 32px;
      width: 40px;
      height: 40px;
    }
    h2 { color: var(--mat-sys-primary); }
  `,
})
export class UnitBrowserComponent implements OnInit {
  factions = signal<FactionSummary[]>([]);
  searchResults = signal<Unit[]>([]);
  loading = signal(true);
  searchQuery = '';

  constructor(private unitData: UnitDataService) {}

  async ngOnInit() {
    const factions = await this.unitData.getFactions();
    this.factions.set(factions);
    this.loading.set(false);
  }

  async onSearch(query: string) {
    if (query.length < 2) {
      this.searchResults.set([]);
      return;
    }
    const results = await this.unitData.searchUnits(query);
    this.searchResults.set(results);
  }
}
