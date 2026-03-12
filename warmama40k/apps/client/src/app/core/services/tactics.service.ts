import { Injectable, signal } from '@angular/core';
import { LLMService, LLMMessage } from './llm.service';
import { SettingsService } from './settings.service';
import { GameService, GameUnitState, LocalGameState } from './game.service';
import { GamePhase } from '@warmama40k/shared';

export interface TacticsTip {
  text: string;
  source: 'llm' | 'static';
  phase?: string;
}

/** Static fallback tips per phase (German) */
const STATIC_TIPS: Record<string, string[]> = {
  [GamePhase.COMMAND]: [
    'Denkt daran: Einheiten mit weniger als der Haelfte ihrer Modelle muessen Moral testen!',
    'Spart Kommandopunkte fuer wichtige Stratageme in der Schiess- oder Nahkampfphase.',
    'Prueft ob beschaedigte Einheiten noch Ziele halten koennen.',
  ],
  [GamePhase.MOVEMENT]: [
    'Bewegt Einheiten hinter Deckung, wenn sie nicht schiessen muessen.',
    'Vorruecken gibt extra Bewegung, aber ihr koennt dann nicht schiessen oder chargen!',
    'Positioniert eure Einheiten so, dass sie naechste Runde gute Schusswinkel haben.',
    'Haltet Abstand zu feindlichen Nahkampf-Einheiten, wenn ihr nicht kaempfen wollt.',
  ],
  [GamePhase.SHOOTING]: [
    'Nutzt Waffen mit hohem AP gegen gut geruestete Ziele.',
    'Blast-Waffen sind besonders gut gegen grosse Einheiten mit vielen Modellen.',
    'Konzentriert euer Feuer auf eine Einheit, statt den Schaden zu verteilen.',
    'Achtet auf die Reichweite - naeher dran heisst oft bessere Waffen!',
  ],
  [GamePhase.CHARGE]: [
    'Wuerfelt 2W6 fuer die Charge-Distanz. Ihr braucht genug um in 1" Reichweite zu kommen.',
    'Chargt nur wenn ihr eine gute Chance habt, die Distanz zu schaffen!',
    'Einheiten die gechargt haben kaempfen ZUERST in der Nahkampfphase.',
  ],
  [GamePhase.FIGHT]: [
    'Einheiten die diesen Zug gechargt haben, kaempfen zuerst!',
    'Waehlt eure Nahkampfziele weise - manchmal ist es besser, eine schwache Einheit zu zerstoeren.',
    'Vergesst nicht: beide Spieler kaempfen abwechselnd mit ihren Einheiten.',
  ],
};

const GENERAL_TIPS: string[] = [
  'Teamwork ist wichtig! Besprecht eure Strategie zusammen.',
  'Vergesst nicht auf Sonderregeln eurer Einheiten zu achten.',
  'Ziele halten bringt Siegpunkte - vergessen nicht eure Modelle auf Ziele zu stellen!',
  'Habt Spass! Es ist ein Spiel fuer euch beide.',
];

@Injectable({ providedIn: 'root' })
export class TacticsService {
  readonly currentTip = signal<TacticsTip | null>(null);
  readonly isLoading = signal(false);

  constructor(
    private llm: LLMService,
    private settingsService: SettingsService,
    private gameService: GameService,
  ) {}

  /** Get a tip for the current game state */
  async getTip(): Promise<TacticsTip> {
    const game = this.gameService.currentGame();

    // If no API key or no game, use static tips
    if (!this.settingsService.hasApiKey() || !game) {
      const tip = this.getStaticTip(game);
      this.currentTip.set(tip);
      return tip;
    }

    // Try LLM, fall back to static
    this.isLoading.set(true);
    try {
      const messages = this.buildTacticsPrompt(game);
      const response = await this.llm.chat(messages, 200);

      if (response.error) {
        const tip = this.getStaticTip(game);
        this.currentTip.set(tip);
        return tip;
      }

      const tip: TacticsTip = {
        text: response.text,
        source: 'llm',
        phase: game.currentPhase,
      };
      this.currentTip.set(tip);
      return tip;
    } catch {
      const tip = this.getStaticTip(game);
      this.currentTip.set(tip);
      return tip;
    } finally {
      this.isLoading.set(false);
    }
  }

  getStaticTip(game: LocalGameState | null): TacticsTip {
    const phase = game?.currentPhase ?? GamePhase.COMMAND;
    const phaseTips = STATIC_TIPS[phase] ?? GENERAL_TIPS;
    const allTips = [...phaseTips, ...GENERAL_TIPS];
    const text = allTips[Math.floor(Math.random() * allTips.length)];
    return { text, source: 'static', phase };
  }

  private buildTacticsPrompt(game: LocalGameState): LLMMessage[] {
    const active = game.activePlayerIndex === 0 ? game.player1 : game.player2;
    const enemy = game.activePlayerIndex === 0 ? game.player2 : game.player1;

    const activeUnits = this.describeUnits(active.units);
    const enemyUnits = this.describeUnits(enemy.units);

    return [
      {
        role: 'system',
        content: `Du bist ein freundlicher Warhammer 40.000 Taktik-Berater fuer zwei Kinder (ca. 10-12 Jahre alt). Antworte auf Deutsch, kurz und einfach (2-3 Saetze maximal). Gib einen konkreten, hilfreichen Tipp fuer die aktuelle Spielsituation. Keine komplizierten Fachbegriffe. Sei ermutigend!`,
      },
      {
        role: 'user',
        content: `Aktuelle Situation:
- Spieler: ${active.playerName} (${active.commandPoints} CP)
- Phase: ${this.getPhaseName(game.currentPhase)}
- Runde: ${game.currentTurn}
- Eigene Einheiten: ${activeUnits}
- Gegner (${enemy.playerName}): ${enemyUnits}

Was ist der beste Tipp fuer ${active.playerName} in dieser Situation?`,
      },
    ];
  }

  private describeUnits(units: GameUnitState[]): string {
    return units
      .filter((u) => !u.isDestroyed)
      .map((u) => {
        const health =
          u.maxModels > 1
            ? `${u.modelsRemaining}/${u.maxModels} Modelle`
            : `${u.currentWounds}/${u.maxWounds} W`;
        return `${u.unitName} (${u.faction}, ${health})`;
      })
      .join(', ');
  }

  private getPhaseName(phase: GamePhase): string {
    switch (phase) {
      case GamePhase.COMMAND: return 'Kommandophase';
      case GamePhase.MOVEMENT: return 'Bewegungsphase';
      case GamePhase.SHOOTING: return 'Schiessphase';
      case GamePhase.CHARGE: return 'Angriffphase';
      case GamePhase.FIGHT: return 'Nahkampfphase';
      default: return phase;
    }
  }
}
