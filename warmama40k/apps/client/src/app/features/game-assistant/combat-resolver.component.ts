import { Component, OnInit, signal, computed } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { GameService, GameUnitState } from '../../core/services/game.service';
import { AssistanceLevel } from '@warmama40k/shared';
import type { Unit, Weapon, CombatStep } from '@warmama40k/shared';
import { buildCombatSteps } from '@warmama40k/shared';

type CombatStage = 'select-attacker' | 'select-weapon' | 'select-target' | 'resolve' | 'done';

@Component({
  selector: 'app-combat-resolver',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
  ],
  template: `
    <div class="combat-container">
      <div class="combat-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2>Kampf aufloesen</h2>
        <span class="phase-badge">
          <mat-icon>{{ phase() === 'shooting' ? 'gps_fixed' : 'swords' }}</mat-icon>
          {{ phase() === 'shooting' ? 'Schiessen' : 'Nahkampf' }}
        </span>
      </div>

      <!-- Step 1: Select Attacker -->
      @if (stage() === 'select-attacker') {
        <h3 class="step-title">
          <span class="step-num">1</span> Angreifer waehlen
        </h3>
        <div class="unit-select-grid">
          @for (unit of availableAttackers(); track unit.unitId) {
            <button
              mat-stroked-button
              class="unit-select-btn"
              (click)="selectAttacker(unit)"
            >
              @if (unit.photoUrl) {
                <img [src]="unit.photoUrl" class="unit-thumb" alt="" />
              }
              <div class="unit-select-info">
                <strong>{{ unit.nickname || unit.unitName }}</strong>
                <small>{{ unit.nickname ? unit.unitName + ' · ' : '' }}{{ unit.faction }} | {{ unit.modelsRemaining }} Modelle</small>
              </div>
            </button>
          }
          @if (availableAttackers().length === 0) {
            <p class="empty-msg">Keine verfuegbaren Einheiten</p>
          }
        </div>
      }

      <!-- Step 2: Select Weapon -->
      @if (stage() === 'select-weapon') {
        <div class="selected-info">
          <mat-icon>shield</mat-icon>
          <strong>{{ selectedAttackerState()?.unitName }}</strong>
        </div>

        <h3 class="step-title">
          <span class="step-num">2</span> Waffe waehlen
        </h3>
        <div class="weapon-grid">
          @for (weapon of availableWeapons(); track weapon.name) {
            <mat-card
              class="weapon-card"
              (click)="selectWeapon(weapon)"
            >
              <div class="weapon-name">
                {{ weapon.name }}
                @if (weapon.type === 'ranged' && assistanceLevel() !== 'low') {
                  <span class="weapon-range">{{ weapon.range }}"</span>
                }
              </div>
              <div class="weapon-stats">
                <span class="ws-label">
                  {{ weapon.type === 'ranged' ? 'Trefferwert' : 'Nahkampf' }} {{ weapon.ballisticSkill }}+
                </span>
                <span>Staerke {{ weapon.strength }}</span>
                <span>AP -{{ weapon.armourPenetration }}</span>
                <span>Schaden {{ weapon.damage }}</span>
                <span>Attacken {{ weapon.attacks }}</span>
              </div>
              @if (assistanceLevel() !== 'low' && hasAbilities(weapon)) {
                <div class="weapon-abilities">
                  @for (ability of getAbilityLabels(weapon); track ability) {
                    <span class="ability-chip">{{ ability }}</span>
                  }
                </div>
              }
            </mat-card>
          }
        </div>
        <button mat-button (click)="stage.set('select-attacker')">
          <mat-icon>arrow_back</mat-icon> Zurueck
        </button>
      }

      <!-- Step 3: Select Target -->
      @if (stage() === 'select-target') {
        <div class="selected-info">
          <mat-icon>shield</mat-icon>
          <strong>{{ selectedAttackerState()?.unitName }}</strong>
          <mat-icon>arrow_forward</mat-icon>
          <strong>{{ selectedWeapon()?.name }}</strong>
        </div>

        <h3 class="step-title">
          <span class="step-num">3</span> Ziel waehlen
        </h3>
        <div class="unit-select-grid">
          @for (unit of enemyUnits(); track unit.unitId) {
            <button
              mat-stroked-button
              class="unit-select-btn enemy"
              (click)="selectTarget(unit)"
            >
              @if (unit.photoUrl) {
                <img [src]="unit.photoUrl" class="unit-thumb" alt="" />
              }
              <div class="unit-select-info">
                <strong>{{ unit.nickname || unit.unitName }}</strong>
                <small>
                  {{ unit.nickname ? unit.unitName + ' · ' : '' }}{{ unit.faction }} |
                  {{ unit.modelsRemaining }}/{{ unit.maxModels }} Modelle |
                  W{{ unit.maxWounds }}
                </small>
              </div>
            </button>
          }
        </div>
        <button mat-button (click)="stage.set('select-weapon')">
          <mat-icon>arrow_back</mat-icon> Zurueck
        </button>
      }

      <!-- Step 4: Resolve Combat -->
      @if (stage() === 'resolve') {
        <div class="selected-info">
          <strong>{{ selectedAttackerState()?.unitName }}</strong>
          <mat-icon>arrow_forward</mat-icon>
          <em>{{ selectedWeapon()?.name }}</em>
          <mat-icon>arrow_forward</mat-icon>
          <strong class="enemy-name">{{ selectedTargetState()?.unitName }}</strong>
        </div>

        <div class="steps-container">
          @for (step of combatSteps(); track step.phase; let i = $index) {
            <mat-card
              class="step-card"
              [class.current]="currentStep() === i"
              [class.future]="currentStep() < i"
              [class.compact]="assistanceLevel() === 'low'"
            >
              <div class="step-card-header">
                <span class="step-num">{{ i + 1 }}</span>
                <mat-icon>{{ getStepIcon(step.phase) }}</mat-icon>
                <span class="step-phase-name">{{ getStepPhaseName(step.phase) }}</span>
              </div>

              <!-- HIGH + MEDIUM: full description -->
              @if (assistanceLevel() !== 'low') {
                <p class="step-description">{{ step.description }}</p>
              }

              <!-- HIGH only: detailed explanation -->
              @if (assistanceLevel() === 'high' && step.detailedExplanation) {
                <p class="step-detail">{{ step.detailedExplanation }}</p>
              }

              <!-- HIGH + MEDIUM: modifiers shown as chips -->
              @if (assistanceLevel() !== 'low' && step.modifiers.length > 0) {
                <div class="step-mods">
                  @for (mod of step.modifiers; track mod) {
                    <span class="mod-chip">{{ mod }}</span>
                  }
                </div>
              }

              <!-- All levels: special rules (but compact for LOW) -->
              @if (step.specialRules.length > 0) {
                <div class="step-specials">
                  @for (rule of step.specialRules; track rule) {
                    <span class="special-chip">{{ rule }}</span>
                  }
                </div>
              }

              <!-- Dice prompt: only show when roll is actually possible (target <= 6) -->
              @if (step.targetNumber > 0 && step.targetNumber <= 6 && currentStep() === i) {
                <div class="dice-prompt">
                  <mat-icon>casino</mat-icon>
                  <span class="dice-target">
                    @if (assistanceLevel() === 'low') {
                      {{ step.targetNumber }}+
                    } @else {
                      Wuerfle! Du brauchst {{ step.targetNumber }}+
                    }
                  </span>
                </div>
              }
              @if (step.targetNumber > 6 && currentStep() === i) {
                <div class="dice-prompt impossible">
                  <mat-icon>block</mat-icon>
                  <span class="dice-target">Kein Wurf noetig - automatisch fehlgeschlagen!</span>
                </div>
              }
            </mat-card>
          }
        </div>

        <!-- Navigation through steps -->
        <div class="step-nav">
          @if (currentStep() > 0) {
            <button mat-button (click)="prevStep()">
              <mat-icon>arrow_back</mat-icon> Vorheriger Schritt
            </button>
          }
          @if (currentStep() < combatSteps().length - 1) {
            <button mat-raised-button color="primary" (click)="nextStep()">
              Naechster Schritt <mat-icon>arrow_forward</mat-icon>
            </button>
          } @else {
            <button mat-raised-button color="accent" (click)="applyResult()">
              <mat-icon>check</mat-icon> Schaden eintragen
            </button>
          }
        </div>
      }

      <!-- Step 5: Apply Damage -->
      @if (stage() === 'done') {
        <mat-card class="done-card">
          <div class="done-icon">
            <mat-icon>check_circle</mat-icon>
          </div>
          <h3>Kampf abgeschlossen</h3>
          <p>Tragt den Schaden manuell ein oder geht zurueck zum Spiel.</p>

          <div class="damage-input">
            <div class="damage-row">
              <span>Getoetete Modelle:</span>
              <div class="counter">
                <button mat-icon-button (click)="decrementKills()">
                  <mat-icon>remove</mat-icon>
                </button>
                <span class="counter-value">{{ modelsKilled() }}</span>
                <button mat-icon-button (click)="incrementKills()">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
            </div>
            <div class="damage-row">
              <span>Restliche Wunden am letzten Modell:</span>
              <div class="counter">
                <button mat-icon-button (click)="decrementWounds()">
                  <mat-icon>remove</mat-icon>
                </button>
                <span class="counter-value">{{ woundsOnSurvivor() }}</span>
                <button mat-icon-button (click)="incrementWounds()">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
            </div>
          </div>

          <div class="done-actions">
            <button mat-raised-button color="primary" (click)="confirmDamage()">
              <mat-icon>save</mat-icon> Schaden uebernehmen
            </button>
            <button mat-button (click)="goBack()">
              Ohne Speichern zurueck
            </button>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: `
    .combat-container { max-width: 800px; margin: 0 auto; }
    .combat-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
    }
    .combat-header h2 { flex: 1; color: var(--mat-sys-primary); margin: 0; }
    .phase-badge {
      display: flex; align-items: center; gap: 4px;
      background: color-mix(in srgb, var(--mat-sys-primary) 15%, transparent);
      padding: 4px 12px; border-radius: 16px;
      font-size: 0.9em; color: var(--mat-sys-primary);
    }
    .phase-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .selected-info {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; background: #1a1a1a; border-radius: 8px;
      margin-bottom: 12px; flex-wrap: wrap;
    }
    .selected-info mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--mat-sys-primary); }
    .enemy-name { color: #f44336; }

    .step-title {
      display: flex; align-items: center; gap: 8px;
      color: #ddd; margin: 16px 0 8px;
    }
    .step-num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--mat-sys-primary); color: #000; font-weight: 700; font-size: 0.9em;
    }

    /* Unit select */
    .unit-select-grid {
      display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;
    }
    .unit-select-btn {
      text-align: left; padding: 12px 16px; height: auto;
      white-space: normal;
    }
    .unit-select-btn.enemy { border-color: #f44336; }
    .unit-select-info { display: flex; flex-direction: column; }
    .unit-select-info strong { font-size: 1em; }
    .unit-select-info small { color: var(--mat-sys-on-surface-variant, #aaa); }
    .unit-thumb {
      width: 40px; height: 40px; border-radius: 50%; object-fit: cover;
      flex-shrink: 0;
    }
    .empty-msg { color: var(--mat-sys-outline, #777); font-style: italic; padding: 16px; text-align: center; }

    /* Weapons */
    .weapon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 8px; margin-bottom: 12px;
    }
    .weapon-card {
      padding: 12px; cursor: pointer;
      transition: border-color 0.2s;
    }
    .weapon-card:hover { border-color: var(--mat-sys-primary); }
    .weapon-name {
      font-weight: 600; margin-bottom: 4px; display: flex;
      justify-content: space-between;
    }
    .weapon-range { color: var(--mat-sys-on-surface-variant, #aaa); font-weight: 400; font-size: 0.85em; }
    .weapon-stats {
      display: flex; gap: 8px; font-size: 0.85em; color: var(--mat-sys-primary);
      font-family: monospace; margin-bottom: 4px;
    }
    .ws-label { color: #ddd; }
    .weapon-abilities { display: flex; flex-wrap: wrap; gap: 4px; }
    .ability-chip {
      font-size: 0.75em; padding: 2px 6px;
      background: color-mix(in srgb, var(--mat-sys-primary) 15%, transparent); border-radius: 8px;
      color: var(--mat-sys-primary);
    }

    /* Combat Steps */
    .steps-container {
      display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;
    }
    .step-card {
      padding: 12px;
      border-left: 3px solid var(--mat-sys-primary);
      transition: opacity 0.3s, transform 0.3s;
    }
    .step-card.future { opacity: 0.4; }
    .step-card.compact { padding: 8px; }
    .step-card.current {
      border-left-color: #4caf50;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.2);
    }
    .step-card-header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
    }
    .step-card-header mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--mat-sys-primary); }
    .step-phase-name { font-weight: 600; text-transform: uppercase; font-size: 0.8em; letter-spacing: 1px; }
    .step-description { font-size: 1em; margin: 4px 0; }
    .step-detail { font-size: 0.85em; color: var(--mat-sys-on-surface-variant, #aaa); margin: 4px 0; }
    .step-mods, .step-specials {
      display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;
    }
    .mod-chip {
      font-size: 0.75em; padding: 2px 8px; border-radius: 8px;
      background: rgba(33, 150, 243, 0.15); color: #2196f3;
    }
    .special-chip {
      font-size: 0.75em; padding: 2px 8px; border-radius: 8px;
      background: rgba(156, 39, 176, 0.15); color: #ce93d8;
    }
    .dice-prompt {
      display: flex; align-items: center; gap: 8px;
      background: rgba(76, 175, 80, 0.1); border-radius: 8px;
      padding: 8px 12px; margin-top: 8px;
    }
    .dice-prompt mat-icon { color: #4caf50; }
    .dice-prompt.impossible { background: rgba(244, 67, 54, 0.1); }
    .dice-prompt.impossible mat-icon { color: #f44336; }
    .dice-prompt.impossible .dice-target { color: #f44336; }
    .dice-target {
      font-size: 1.1em; font-weight: 700; color: #4caf50;
    }

    .step-nav {
      display: flex; justify-content: center; gap: 12px;
      margin-bottom: 16px;
    }

    /* Done card */
    .done-card { padding: 24px; text-align: center; }
    .done-icon mat-icon {
      font-size: 48px; width: 48px; height: 48px; color: #4caf50;
    }
    .damage-input { margin: 16px auto; max-width: 350px; }
    .damage-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0;
    }
    .counter {
      display: flex; align-items: center; gap: 4px;
    }
    .counter-value {
      font-size: 1.3em; font-weight: 700; color: var(--mat-sys-primary);
      min-width: 40px; text-align: center;
    }
    .done-actions {
      display: flex; justify-content: center; gap: 12px; margin-top: 16px;
    }
  `,
})
export class CombatResolverComponent implements OnInit {
  stage = signal<CombatStage>('select-attacker');
  currentStep = signal(0);

  selectedAttackerState = signal<GameUnitState | null>(null);
  selectedAttackerData = signal<Unit | null>(null);
  selectedWeapon = signal<Weapon | null>(null);
  selectedTargetState = signal<GameUnitState | null>(null);
  selectedTargetData = signal<Unit | null>(null);
  combatSteps = signal<CombatStep[]>([]);

  modelsKilled = signal(0);
  woundsOnSurvivor = signal(0);

  phase = signal<string>('shooting');

  assistanceLevel = computed(
    () => this.gameService.currentGame()?.assistanceLevel ?? AssistanceLevel.HIGH
  );

  availableAttackers = computed(() => {
    const units = this.gameService.activeUnits();
    const p = this.phase();
    return units.filter((u) => {
      if (p === 'shooting') return !u.hasShot && !u.hasAdvanced;
      if (p === 'fight') return !u.hasFought;
      return true;
    });
  });

  enemyUnits = computed(() => this.gameService.enemyUnits());

  availableWeapons = computed(() => {
    const data = this.selectedAttackerData();
    if (!data) return [];
    const p = this.phase();
    let weapons: Weapon[];
    if (p === 'shooting') weapons = data.rangedWeapons;
    else if (p === 'fight') weapons = data.meleeWeapons;
    else weapons = [...data.rangedWeapons, ...data.meleeWeapons];

    // Filter to only weapons assigned in Squad Manager (if available)
    const assigned = this.selectedAttackerState()?.assignedWeapons;
    if (assigned && assigned.length > 0) {
      const filtered = weapons.filter(w => assigned.includes(w.name));
      if (filtered.length > 0) return filtered;
    }
    return weapons;
  });

  constructor(
    private gameService: GameService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    if (params['phase']) this.phase.set(params['phase']);

    if (params['attackerId']) {
      const units = this.gameService.activeUnits();
      const unit = units.find((u) => u.unitId === params['attackerId']);
      if (unit) this.selectAttacker(unit);
    }
  }

  selectAttacker(unit: GameUnitState): void {
    this.selectedAttackerState.set(unit);
    const data = this.gameService.getUnitData(unit.unitId);
    this.selectedAttackerData.set(data ?? null);
    this.stage.set('select-weapon');
  }

  selectWeapon(weapon: Weapon): void {
    this.selectedWeapon.set(weapon);
    this.stage.set('select-target');
  }

  selectTarget(unit: GameUnitState): void {
    this.selectedTargetState.set(unit);
    const data = this.gameService.getUnitData(unit.unitId);
    this.selectedTargetData.set(data ?? null);

    // Build combat steps
    const attacker = this.selectedAttackerData();
    const weapon = this.selectedWeapon();
    const defender = data;
    const attackerState = this.selectedAttackerState();

    if (attacker && weapon && defender && attackerState) {
      const steps = buildCombatSteps(
        attacker,
        weapon,
        defender,
        attackerState.modelsRemaining
      );
      this.combatSteps.set(steps);
    }

    this.currentStep.set(0);
    this.stage.set('resolve');
  }

  nextStep(): void {
    if (this.currentStep() < this.combatSteps().length - 1) {
      this.currentStep.update((s) => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((s) => s - 1);
    }
  }

  applyResult(): void {
    this.modelsKilled.set(0);
    this.woundsOnSurvivor.set(0);
    this.stage.set('done');
  }

  incrementKills(): void {
    const target = this.selectedTargetState();
    if (target && this.modelsKilled() < target.modelsRemaining) {
      this.modelsKilled.update((k) => k + 1);
    }
  }

  decrementKills(): void {
    if (this.modelsKilled() > 0) {
      this.modelsKilled.update((k) => k - 1);
    }
  }

  incrementWounds(): void {
    const target = this.selectedTargetState();
    if (target && this.woundsOnSurvivor() < target.maxWounds) {
      this.woundsOnSurvivor.update((w) => w + 1);
    }
  }

  decrementWounds(): void {
    if (this.woundsOnSurvivor() > 0) {
      this.woundsOnSurvivor.update((w) => w - 1);
    }
  }

  async confirmDamage(): Promise<void> {
    const game = this.gameService.currentGame();
    const target = this.selectedTargetState();
    const attacker = this.selectedAttackerState();
    if (!game || !target || !attacker) return;

    // Apply damage to target (enemy = inactive player)
    const enemyIdx = game.activePlayerIndex === 0 ? 1 : 0;
    await this.gameService.applyDamage(
      enemyIdx,
      target.unitId,
      this.woundsOnSurvivor(),
      this.modelsKilled()
    );

    // Mark attacker as having acted
    const action = this.phase() === 'shooting' ? 'shot' : 'fought';
    await this.gameService.markUnitAction(
      game.activePlayerIndex,
      attacker.unitId,
      action
    );

    this.goBack();
  }

  hasAbilities(weapon: Weapon): boolean {
    const a = weapon.abilities;
    return !!(
      a.blast || a.twinLinked || a.autoHit || a.lethalHits ||
      a.sustainedHits !== undefined || a.devastatingWounds || a.anti ||
      a.melta || a.rapidFire || a.ignoresCover || a.indirectFire
    );
  }

  getAbilityLabels(weapon: Weapon): string[] {
    const labels: string[] = [];
    const a = weapon.abilities;
    if (a.autoHit) labels.push('Torrent');
    if (a.blast) labels.push('Blast');
    if (a.twinLinked) labels.push('Twin-linked');
    if (a.lethalHits) labels.push('Lethal Hits');
    if (a.sustainedHits !== undefined) labels.push(`Sustained Hits ${a.sustainedHits}`);
    if (a.devastatingWounds) labels.push('Devastating Wounds');
    if (a.anti) labels.push(`Anti-${a.anti.targetType} ${a.anti.rollNeeded}+`);
    if (a.melta) labels.push(`Melta ${a.melta}`);
    if (a.rapidFire) labels.push(`Rapid Fire ${a.rapidFire}`);
    if (a.ignoresCover) labels.push('Ignores Cover');
    if (a.indirectFire) labels.push('Indirect Fire');
    return labels;
  }

  getStepIcon(phase: string): string {
    switch (phase) {
      case 'hit': return 'gps_fixed';
      case 'wound': return 'healing';
      case 'save': return 'shield';
      case 'damage': return 'dangerous';
      case 'feel-no-pain': return 'favorite';
      default: return 'casino';
    }
  }

  getStepPhaseName(phase: string): string {
    switch (phase) {
      case 'hit': return 'Trefferwurf';
      case 'wound': return 'Verwundungswurf';
      case 'save': return 'Rettungswurf';
      case 'damage': return 'Schaden';
      case 'feel-no-pain': return 'Schmerzresistenz';
      default: return phase;
    }
  }

  goBack(): void {
    this.router.navigate(['/game']);
  }
}
