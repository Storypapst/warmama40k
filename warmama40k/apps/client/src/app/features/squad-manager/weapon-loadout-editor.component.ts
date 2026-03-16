import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import type { Unit } from '@warmama40k/shared';
import { SquadModel } from '../../core/services/player.service';
import { SquadService } from '../../core/services/squad.service';

@Component({
  selector: 'app-weapon-loadout-editor',
  imports: [MatButtonModule, MatIconModule, MatChipsModule, MatSelectModule, FormsModule],
  template: `
    <div class="loadout-editor">
      <h4>Waffenkonfiguration</h4>

      @if (availableWeapons().length === 0) {
        <p class="no-weapons">Keine Waffen verfuegbar</p>
      } @else if (modelCount <= 1) {
        <!-- Single model: simple weapon list -->
        <div class="single-model">
          @for (weapon of availableWeapons(); track weapon.name) {
            <mat-chip-option
              [selected]="isWeaponSelected(0, weapon.name)"
              (selectionChange)="toggleWeapon(0, weapon.name)"
            >
              {{ weapon.name }}
              <span class="weapon-type">{{ weapon.type === 'ranged' ? '🔫' : '⚔️' }}</span>
            </mat-chip-option>
          }
        </div>
      } @else if (modelCount <= 15) {
        <!-- Grid: per-model weapon assignment -->
        <div class="model-grid">
          @for (model of models(); track model.modelIndex) {
            <div class="model-row">
              <span class="model-label">
                {{ model.customLabel || ('Modell ' + (model.modelIndex + 1)) }}
              </span>
              <select
                class="weapon-select"
                [ngModel]="getMainWeapon(model)"
                (ngModelChange)="setMainWeapon(model.modelIndex, $event)"
              >
                @for (weapon of availableWeapons(); track weapon.name) {
                  <option [value]="weapon.name">
                    {{ weapon.name }} ({{ weapon.type === 'ranged' ? 'Fernkampf' : 'Nahkampf' }})
                  </option>
                }
              </select>
            </div>
          }
        </div>
      } @else {
        <!-- Group-based input for large squads -->
        <div class="group-editor">
          @for (group of weaponGroups(); track $index) {
            <div class="group-row">
              <span class="group-count">{{ group.modelIndices.length }}x</span>
              <select
                class="weapon-select"
                [ngModel]="group.weaponLoadout[0] || ''"
                (ngModelChange)="changeGroupWeapon($index, $event)"
              >
                @for (weapon of availableWeapons(); track weapon.name) {
                  <option [value]="weapon.name">{{ weapon.name }}</option>
                }
              </select>
              @if (weaponGroups().length > 1) {
                <button mat-icon-button (click)="mergeGroup($index)">
                  <mat-icon>merge</mat-icon>
                </button>
              }
            </div>
          }
          <button mat-stroked-button (click)="splitGroup()">
            <mat-icon>call_split</mat-icon>
            Gruppe teilen
          </button>
        </div>
      }

      <!-- Weapon group summary -->
      @if (models().length > 0) {
        <div class="group-summary">
          <mat-icon>summarize</mat-icon>
          <span>{{ groupSummary() }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .loadout-editor { display: flex; flex-direction: column; gap: 12px; }
    h4 { margin: 0; color: var(--mat-sys-primary); }
    .no-weapons { color: var(--mat-sys-on-surface-variant, #888); font-style: italic; }
    .single-model { display: flex; flex-wrap: wrap; gap: 8px; }
    .weapon-type { margin-left: 4px; font-size: 0.85em; }
    .model-grid { display: flex; flex-direction: column; gap: 6px; }
    .model-row {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 8px; border-radius: 8px;
      background: color-mix(in srgb, var(--mat-sys-primary) 5%, transparent);
    }
    .model-label {
      min-width: 80px; font-size: 0.85em; font-weight: 600;
      color: var(--mat-sys-on-surface-variant, #888);
    }
    .weapon-select {
      flex: 1; padding: 6px 8px; border-radius: 8px;
      border: 1px solid var(--mat-sys-outline-variant, #666);
      background: transparent; color: inherit; font: inherit;
    }
    .group-editor { display: flex; flex-direction: column; gap: 8px; }
    .group-row { display: flex; align-items: center; gap: 8px; }
    .group-count {
      min-width: 32px; font-weight: 700; font-size: 1.1em;
      color: var(--mat-sys-primary);
    }
    .group-summary {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 8px;
      background: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent);
      font-size: 0.9em; font-weight: 600;
    }
    .group-summary mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--mat-sys-primary); }
  `,
})
export class WeaponLoadoutEditorComponent implements OnInit, OnChanges {
  @Input() unitData!: Unit;
  @Input() initialModels: SquadModel[] = [];
  @Input() modelCount = 1;
  @Output() modelsChanged = new EventEmitter<SquadModel[]>();

  private squadService = inject(SquadService);
  /** Prevents emitting during initialization to avoid re-render loops */
  private initialized = false;

  models = signal<SquadModel[]>([]);

  availableWeapons = computed(() => {
    if (!this.unitData) return [];
    return [
      ...this.unitData.rangedWeapons.map((w) => ({ ...w, type: 'ranged' as const })),
      ...this.unitData.meleeWeapons.map((w) => ({ ...w, type: 'melee' as const })),
    ];
  });

  weaponGroups = computed(() => this.squadService.computeWeaponGroups(this.models()));

  groupSummary = computed(() =>
    this.squadService.getWeaponGroupSummary(this.weaponGroups())
  );

  ngOnInit() {
    this.initModels();
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    // Re-init if inputs change after first init (e.g. parent updates initialModels)
    if (this.initialized && (changes['initialModels'] || changes['modelCount'])) {
      this.initModels();
    }
  }

  private initModels() {
    if (this.initialModels.length > 0) {
      this.models.set([...this.initialModels]);
    } else {
      const defaults = this.squadService.buildDefaultSquadModels(this.unitData, this.modelCount);
      this.models.set(defaults);
      // Emit defaults only once so parent can persist, but use setTimeout
      // to avoid triggering change detection in the same cycle
      if (!this.initialized) {
        setTimeout(() => this.modelsChanged.emit(defaults), 0);
      }
    }
  }

  isWeaponSelected(modelIndex: number, weaponName: string): boolean {
    const model = this.models().find((m) => m.modelIndex === modelIndex);
    return model?.weaponLoadout.includes(weaponName) ?? false;
  }

  toggleWeapon(modelIndex: number, weaponName: string) {
    this.models.update((all) =>
      all.map((m) => {
        if (m.modelIndex !== modelIndex) return m;
        const has = m.weaponLoadout.includes(weaponName);
        return {
          ...m,
          weaponLoadout: has
            ? m.weaponLoadout.filter((w) => w !== weaponName)
            : [...m.weaponLoadout, weaponName],
        };
      })
    );
    this.modelsChanged.emit(this.models());
  }

  getMainWeapon(model: SquadModel): string {
    return model.weaponLoadout[0] ?? '';
  }

  setMainWeapon(modelIndex: number, weaponName: string) {
    this.models.update((all) =>
      all.map((m) => {
        if (m.modelIndex !== modelIndex) return m;
        // Keep other weapons, replace the first one
        const others = m.weaponLoadout.slice(1);
        return { ...m, weaponLoadout: [weaponName, ...others] };
      })
    );
    this.modelsChanged.emit(this.models());
  }

  changeGroupWeapon(groupIndex: number, weaponName: string) {
    const group = this.weaponGroups()[groupIndex];
    if (!group) return;
    const indices = new Set(group.modelIndices);
    this.models.update((all) =>
      all.map((m) => {
        if (!indices.has(m.modelIndex)) return m;
        return { ...m, weaponLoadout: [weaponName] };
      })
    );
    this.modelsChanged.emit(this.models());
  }

  splitGroup() {
    const groups = this.weaponGroups();
    const largest = groups[0];
    if (!largest || largest.modelIndices.length <= 1) return;

    // Split the largest group: first model gets separated
    const splitIndex = largest.modelIndices[largest.modelIndices.length - 1];
    const firstWeapon = this.availableWeapons()[0]?.name ?? '';
    this.models.update((all) =>
      all.map((m) => {
        if (m.modelIndex !== splitIndex) return m;
        return { ...m, weaponLoadout: [firstWeapon] };
      })
    );
    this.modelsChanged.emit(this.models());
  }

  mergeGroup(groupIndex: number) {
    const groups = this.weaponGroups();
    if (groupIndex >= groups.length) return;
    const targetWeapon = groups[0].weaponLoadout;
    const indices = new Set(groups[groupIndex].modelIndices);
    this.models.update((all) =>
      all.map((m) => {
        if (!indices.has(m.modelIndex)) return m;
        return { ...m, weaponLoadout: [...targetWeapon] };
      })
    );
    this.modelsChanged.emit(this.models());
  }
}
