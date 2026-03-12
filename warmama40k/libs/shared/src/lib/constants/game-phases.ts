import { GamePhase } from '../enums';

export interface PhaseInfo {
  phase: GamePhase;
  name: string;
  /** SHORT: Just the phase name (LOW assistance) */
  shortHint: string;
  /** MEDIUM: Brief 1-sentence reminder */
  description: string;
  /** HIGH: Full explanation with rules details */
  detailedDescription: string;
  icon: string;
}

export const GAME_PHASES: PhaseInfo[] = [
  {
    phase: GamePhase.COMMAND,
    name: 'Kommandophase',
    shortHint: '+1 CP',
    description: 'Erhalte 1 Kommandopunkt. Pruefe Moral bei beschaedigten Einheiten.',
    detailedDescription:
      'Du erhaeltst 1 Kommandopunkt. Pruefe ob Einheiten, die die Haelfte oder mehr ihrer Modelle verloren haben, unter Kampfschock stehen (wuerfle 2W6 gegen Moral). Einheiten unter Kampfschock koennen keine Ziele halten oder Stratageme nutzen.',
    icon: 'military_tech',
  },
  {
    phase: GamePhase.MOVEMENT,
    name: 'Bewegungsphase',
    shortHint: 'Einheiten bewegen',
    description: 'Bewege deine Einheiten. Vorruecken = +W6" aber kein Schiessen/Charge.',
    detailedDescription:
      'Bewege jede Einheit bis zu ihrem Bewegungswert in Zoll. Einheiten koennen auch Vorruecken (Advance: +W6", aber kein Schiessen oder Charge in dieser Runde) oder aus dem Nahkampf Zurueckweichen (Fall Back: kein Schiessen/Charge ohne Sonderregeln).',
    icon: 'directions_run',
  },
  {
    phase: GamePhase.SHOOTING,
    name: 'Schiessphase',
    shortHint: 'Fernkampf',
    description: 'Waehle Einheiten zum Schiessen. Ziel muss in Reichweite und Sichtlinie sein.',
    detailedDescription:
      'Waehle eine Einheit die nicht vorgerueckt ist. Waehle ein Ziel in Reichweite und Sichtlinie. Loesung: Trefferwurf, Verwundungswurf, Rettungswurf, dann Schaden zuweisen. Tipp: Nutze starke Waffen gegen gepanzerte Ziele!',
    icon: 'gps_fixed',
  },
  {
    phase: GamePhase.CHARGE,
    name: 'Angriffphase',
    shortHint: '2W6 Charge',
    description: 'Deklariere Charges. Wuerfle 2W6" - du musst in 1" Reichweite kommen.',
    detailedDescription:
      'Erklaere welche Einheiten angreifen wollen. Wuerfle 2W6" fuer die Charge-Distanz. Du musst innerhalb der Engagement Range (1") des Ziels enden. Einheiten die vorgerueckt sind oder zurueckgewichen sind koennen nicht chargen.',
    icon: 'bolt',
  },
  {
    phase: GamePhase.FIGHT,
    name: 'Nahkampfphase',
    shortHint: 'Nahkampf',
    description: 'Einheiten die diesen Zug gechargt haben kaempfen zuerst. Dann abwechselnd.',
    detailedDescription:
      'Einheiten die diesen Zug gechargt haben kaempfen zuerst! Dann waehlen die Spieler abwechselnd Einheiten in Engagement Range zum Kaempfen. Nahkampf: Trefferwurf (WS), Verwundungswurf, Rettungswurf, Schaden zuweisen.',
    icon: 'swords',
  },
];

export function getNextPhase(current: GamePhase): GamePhase | null {
  const order = [
    GamePhase.COMMAND,
    GamePhase.MOVEMENT,
    GamePhase.SHOOTING,
    GamePhase.CHARGE,
    GamePhase.FIGHT,
  ];
  const idx = order.indexOf(current);
  if (idx === order.length - 1) return null; // Turn ends
  return order[idx + 1];
}
