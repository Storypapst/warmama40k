import { Component, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { LLMService } from '../../core/services/llm.service';
import { SettingsService } from '../../core/services/settings.service';
import { PlayerService } from '../../core/services/player.service';

export interface Mission {
  name: string;
  description: string;
  objectives: string[];
  specialRules: string[];
  rounds: number;
  source: 'llm' | 'static';
}

/** Pre-built missions for offline / no-API-key mode */
const STATIC_MISSIONS: Mission[] = [
  {
    name: 'Kampf um die Bruecke',
    description: 'Eine wichtige Bruecke verbindet zwei Gebiete. Beide Armeen wollen sie kontrollieren! Stellt ein Gelaendestueck in die Mitte als Bruecke.',
    objectives: [
      'Wer am Ende die Bruecke (Mitte) kontrolliert, bekommt 5 Siegpunkte.',
      'Fuer jede zerstoerte feindliche Einheit gibt es 2 Siegpunkte.',
      'Wer am Ende mehr Siegpunkte hat, gewinnt!',
    ],
    specialRules: [
      'Die Bruecke ist schweres Gelaende (-2" Bewegung).',
      'Einheiten auf der Bruecke haben Deckung (+1 auf Rettungswurf).',
    ],
    rounds: 4,
    source: 'static',
  },
  {
    name: 'Rettungsmission',
    description: 'Ein verletzter Held liegt in der Mitte des Schlachtfelds! Beide Seiten wollen ihn retten (oder gefangen nehmen). Legt einen Marker in die Feldmitte.',
    objectives: [
      'Bewegt eine Einheit zum Marker in der Mitte um den Helden aufzunehmen.',
      'Bringt den Helden in eure Aufstellungszone fuer 10 Siegpunkte.',
      'Fuer jede zerstoerte feindliche Einheit gibt es 1 Siegpunkt.',
    ],
    specialRules: [
      'Die Einheit die den Helden traegt bewegt sich 2" langsamer.',
      'Der Held kann in der Schiessphase an eine andere eigene Einheit uebergeben werden (3" Reichweite).',
    ],
    rounds: 5,
    source: 'static',
  },
  {
    name: 'Letzte Bastion',
    description: 'Spieler 1 verteidigt eine Festung, Spieler 2 greift an! Stellt ein grosses Gelaendestueck auf einer Seite auf als Festung.',
    objectives: [
      'Angreifer: Bringt mindestens 2 Einheiten in die Festung = Sieg!',
      'Verteidiger: Haltet die Festung 5 Runden lang = Sieg!',
      'Bonus: Wer den gegnerischen Anführer zerstoert bekommt 3 extra Punkte.',
    ],
    specialRules: [
      'Der Verteidiger setzt zuerst auf (in/nahe der Festung).',
      'Einheiten in der Festung haben schwere Deckung (+2 auf Rettungswurf).',
      'Der Angreifer darf in Runde 1 eine zusaetzliche Einheit vorruecken lassen.',
    ],
    rounds: 5,
    source: 'static',
  },
  {
    name: 'Schatzsuche',
    description: 'Vier Schaetze sind auf dem Schlachtfeld verteilt! Markiert 4 Punkte gleichmaessig verteilt.',
    objectives: [
      'Kontrolliert einen Schatz am Ende einer Runde = 2 Siegpunkte.',
      'Kontrolliert 3 oder mehr Schaetze gleichzeitig = 3 Bonus-Punkte.',
      'Nach 4 Runden gewinnt wer mehr Siegpunkte hat.',
    ],
    specialRules: [
      'Ein Schatz wird kontrolliert wenn eine eigene Einheit (und keine feindliche) innerhalb von 3" steht.',
      'Einheiten unter Kampfschock koennen keine Schaetze kontrollieren.',
    ],
    rounds: 4,
    source: 'static',
  },
  {
    name: 'Ueberlebenskampf',
    description: 'Ein einfaches Ziel: Zerstoert so viele feindliche Einheiten wie moeglich! Keine Ziele noetig.',
    objectives: [
      'Jede zerstoerte feindliche Einheit = ihre Punkte-Kosten als Siegpunkte.',
      'Wer den feindlichen teuersten Einheit zerstoert bekommt 5 Bonus-Punkte.',
      'Nach 4 Runden gewinnt wer mehr Siegpunkte hat.',
    ],
    specialRules: [
      'Keine besonderen Regeln - einfach kaempfen!',
      'Tipp: Schuetzt eure wertvollsten Einheiten.',
    ],
    rounds: 4,
    source: 'static',
  },
];

@Component({
  selector: 'app-mission-generator',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="mission-container">
      <h1 class="page-title">
        <mat-icon>flag</mat-icon>
        Missions-Generator
      </h1>
      <p class="subtitle">Generiert spannende Missionen fuer euer Spiel!</p>

      <div class="gen-actions">
        <button
          mat-raised-button
          color="primary"
          (click)="generateMission()"
          [disabled]="isGenerating()"
        >
          @if (isGenerating()) {
            <mat-progress-spinner diameter="20" mode="indeterminate" />
          } @else {
            <mat-icon>auto_awesome</mat-icon>
          }
          {{ isGenerating() ? 'Generiere...' : 'Neue Mission!' }}
        </button>

        @if (!settingsService.hasApiKey()) {
          <span class="mode-badge static-badge">
            <mat-icon>auto_awesome</mat-icon>
            Vorgefertigte Missionen
          </span>
        } @else {
          <span class="mode-badge ai-badge">
            <mat-icon>smart_toy</mat-icon>
            KI-generiert
          </span>
        }
      </div>

      @if (currentMission()) {
        <mat-card class="mission-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>flag</mat-icon>
            <mat-card-title>{{ currentMission()!.name }}</mat-card-title>
            <mat-card-subtitle>{{ currentMission()!.rounds }} Runden</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p class="mission-desc">{{ currentMission()!.description }}</p>

            <h4 class="section-label">
              <mat-icon>emoji_events</mat-icon> Ziele
            </h4>
            <ul class="objective-list">
              @for (obj of currentMission()!.objectives; track obj) {
                <li>{{ obj }}</li>
              }
            </ul>

            @if (currentMission()!.specialRules.length > 0) {
              <h4 class="section-label">
                <mat-icon>auto_fix_high</mat-icon> Sonderregeln
              </h4>
              <ul class="rules-list">
                @for (rule of currentMission()!.specialRules; track rule) {
                  <li>{{ rule }}</li>
                }
              </ul>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Mission History -->
      @if (missionHistory().length > 1) {
        <h3 class="history-title">Vorherige Missionen</h3>
        @for (mission of previousMissions(); track $index) {
          <mat-card
            class="history-card"
            (click)="currentMission.set(mission)"
          >
            <div class="history-info">
              <strong>{{ mission.name }}</strong>
              <span class="history-rounds">{{ mission.rounds }} Runden</span>
            </div>
          </mat-card>
        }
      }
    </div>
  `,
  styles: `
    .mission-container { max-width: 700px; margin: 0 auto; }
    .page-title {
      display: flex; align-items: center; gap: 8px;
      color: var(--mat-sys-primary); margin-bottom: 4px;
    }
    .page-title mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .subtitle { color: var(--mat-sys-on-surface-variant, #aaa); margin-bottom: 16px; }

    .gen-actions {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 16px; flex-wrap: wrap;
    }
    .mode-badge {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 16px;
      font-size: 0.8em;
    }
    .mode-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .static-badge { background: rgba(156, 39, 176, 0.15); color: #ce93d8; }
    .ai-badge { background: rgba(76, 175, 80, 0.15); color: #4caf50; }

    .mission-card { margin-bottom: 16px; }
    mat-icon[mat-card-avatar] {
      color: var(--mat-sys-primary); font-size: 28px; width: 36px; height: 36px;
    }
    .mission-desc { font-size: 1em; line-height: 1.5; margin-bottom: 16px; }

    .section-label {
      display: flex; align-items: center; gap: 6px;
      color: var(--mat-sys-primary); font-size: 0.95em; margin: 12px 0 6px;
    }
    .section-label mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .objective-list, .rules-list {
      margin: 0; padding-left: 20px;
    }
    .objective-list li, .rules-list li {
      margin-bottom: 4px; line-height: 1.4;
    }
    .rules-list li { color: #ce93d8; }

    .history-title { color: var(--mat-sys-on-surface-variant, #aaa); margin: 24px 0 8px; }
    .history-card {
      padding: 12px; margin-bottom: 6px; cursor: pointer;
      transition: border-color 0.2s;
    }
    .history-card:hover { border-color: var(--mat-sys-primary); }
    .history-info {
      display: flex; justify-content: space-between; align-items: center;
    }
    .history-rounds { color: var(--mat-sys-on-surface-variant, #aaa); font-size: 0.85em; }

    mat-progress-spinner { display: inline-block; }
  `,
})
export class MissionGeneratorComponent {
  isGenerating = signal(false);
  currentMission = signal<Mission | null>(null);
  missionHistory = signal<Mission[]>([]);

  previousMissions = computed(() => {
    const all = this.missionHistory();
    const current = this.currentMission();
    return all.filter((m) => m !== current);
  });

  private staticIndex = 0;

  constructor(
    private llmService: LLMService,
    public settingsService: SettingsService,
    private playerService: PlayerService,
  ) {}

  async generateMission(): Promise<void> {
    if (!this.settingsService.hasApiKey()) {
      this.generateStaticMission();
      return;
    }

    this.isGenerating.set(true);
    try {
      const players = this.playerService.players();
      const playerNames = players.map((p) => p.name).join(' und ');

      const response = await this.llmService.chat(
        [
          {
            role: 'system',
            content: `Du bist ein kreativer Warhammer 40.000 Missions-Designer fuer Kinder (ca. 10-12 Jahre). Erstelle eine einfache, spassige Mission auf Deutsch. Antworte EXAKT in diesem JSON-Format (keine Markdown, kein Code-Block):
{"name":"Missionsname","description":"Kurze Beschreibung (2-3 Saetze)","objectives":["Ziel 1","Ziel 2","Ziel 3"],"specialRules":["Regel 1","Regel 2"],"rounds":4}`,
          },
          {
            role: 'user',
            content: `Erstelle eine spannende Mission fuer ${playerNames}. Die Mission soll einfach zu verstehen sein, fair fuer beide Seiten, und Spass machen! Thema: ${this.getRandomTheme()}`,
          },
        ],
        500,
      );

      if (response.error || !response.text) {
        this.generateStaticMission();
        return;
      }

      try {
        const parsed = JSON.parse(response.text.trim());
        const mission: Mission = {
          name: parsed.name ?? 'KI-Mission',
          description: parsed.description ?? '',
          objectives: parsed.objectives ?? [],
          specialRules: parsed.specialRules ?? [],
          rounds: parsed.rounds ?? 4,
          source: 'llm',
        };
        this.setMission(mission);
      } catch {
        // JSON parse failed, use static
        this.generateStaticMission();
      }
    } catch {
      this.generateStaticMission();
    } finally {
      this.isGenerating.set(false);
    }
  }

  private generateStaticMission(): void {
    const mission = STATIC_MISSIONS[this.staticIndex % STATIC_MISSIONS.length];
    this.staticIndex++;
    this.setMission(mission);
  }

  private setMission(mission: Mission): void {
    this.currentMission.set(mission);
    this.missionHistory.update((h) => [mission, ...h].slice(0, 10));
  }

  private getRandomTheme(): string {
    const themes = [
      'Kampf um eine verlorene Reliquie',
      'Verteidigung einer Festung',
      'Rettung eines verwundeten Helden',
      'Wettrennen zu einem Absturzpunkt',
      'Geheime Daten muessen gesichert werden',
      'Ein Monster bedroht beide Armeen',
      'Kontrolle ueber Energiequellen',
      'Flucht durch feindliches Gebiet',
    ];
    return themes[Math.floor(Math.random() * themes.length)];
  }
}
