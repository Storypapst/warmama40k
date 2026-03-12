# WarMama40K

Ein iPad-optimierter **Warhammer 40.000 Spielassistent** fuer zwei Kinder mit ca. 4000 Punkten an gemischten Fraktions-Miniaturen. Komplett auf Deutsch.

## Was ist das?

WarMama40K hilft zwei jungen Spielern dabei, faire Warhammer 40K Spiele zu spielen - ohne dass ein Erwachsener staendig die Regeln erklaeren muss. Die App:

- **Verwaltet die Miniaturensammlung** beider Spieler (1129 Einheiten aus 38 Fraktionen)
- **Baut faire Armeen** mit einem Balance-Algorithmus (Greedy + Hill-Climbing)
- **Fuehrt durch jede Spielphase** mit anpassbarem Hilfe-Level (Anfaenger bis Profi)
- **Berechnet Kampfergebnisse** Schritt fuer Schritt (Trefferwurf, Verwundung, Rettungswurf, Schaden)
- **Verfolgt Kampagnen** ueber mehrere Spiele mit Punktestand und Geschichte
- **Generiert Missionen** mit vorgefertigten oder KI-generierten Szenarien
- **Funktioniert offline** als installierbare PWA auf dem iPad

## Tech-Stack

| Technologie | Version | Zweck |
|---|---|---|
| **Angular** | 21.1 | Frontend-Framework (Standalone Components, Signals, neue Control-Flow-Syntax) |
| **Angular Material** | 21.2 | UI-Komponenten (Cards, Buttons, Forms, Toolbar) |
| **Nx** | 22.5 | Monorepo-Build-System |
| **Dexie.js** | 4.3 | IndexedDB-Wrapper fuer Client-seitige Datenhaltung |
| **Angular Service Worker** | 21.2 | PWA Offline-Support |
| **TypeScript** | 5.8 | Typsicherheit |
| **Vite** | - | Dev-Server und Bundler (via @angular/build) |
| **better-sqlite3** | 12.6 | Server-seitige Datenbank (nur fuer Daten-Import) |

### Warum diese Entscheidungen?

- **Kein Backend noetig im Betrieb**: Alle Spieldaten liegen im Browser (IndexedDB via Dexie.js). Der Server wird nur zum initialen Daten-Import gebraucht.
- **Angular Signals statt RxJS**: Einfacherer, synchroner State-Flow - ideal fuer ein Spiel, das reaktiv auf Zustandsaenderungen reagieren muss.
- **Standalone Components**: Kein NgModule-Overhead. Jede Komponente ist selbstenthalten.
- **better-sqlite3 statt TypeORM**: esbuild unterstuetzt kein `emitDecoratorMetadata`, das TypeORM braucht.

## Projektstruktur

```
warmama40k/
├── apps/
│   ├── client/                        # Angular PWA (Hauptanwendung)
│   │   ├── public/
│   │   │   ├── icons/                 # PWA-Icons (72px - 512px)
│   │   │   └── manifest.webmanifest
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── core/services/     # 8 Services (State, Game-Logik, LLM)
│   │   │   │   ├── features/
│   │   │   │   │   ├── army-builder/          # Armee-Zusammenstellung
│   │   │   │   │   ├── campaign/              # Kampagnen-Tracking
│   │   │   │   │   ├── game-assistant/        # Spielassistent + Kampf
│   │   │   │   │   ├── onboarding/            # Willkommen + Sammlung
│   │   │   │   │   ├── settings/              # KI-Einstellungen + Missionen
│   │   │   │   │   └── unit-browser/          # Einheiten-Datenbank
│   │   │   │   ├── app.ts                     # App-Shell mit Toolbar
│   │   │   │   ├── app.routes.ts              # 12 Routen (lazy-loaded)
│   │   │   │   └── app.config.ts              # Provider-Setup
│   │   │   ├── assets/data/                   # 1129 Einheiten als JSON
│   │   │   └── styles.scss                    # Dark-Gold-Theme + iPad CSS
│   │   └── ngsw-config.json                   # Service-Worker-Config
│   │
│   └── server/                        # Node.js Server (nur Daten-Import)
│       └── src/
│           ├── database.ts            # SQLite-Setup
│           └── routes/                # REST-API Endpunkte
│
├── libs/
│   └── shared/                        # Geteilte Bibliothek
│       └── src/lib/
│           ├── constants/             # Spielphasen, Verwundungstabelle
│           ├── enums/                 # GamePhase, AssistanceLevel
│           ├── interfaces/            # Unit, Weapon, Player, Army, Combat
│           └── utils/                 # Balance, Combat, Dice, Points
│
├── tools/
│   └── data-importer/                 # Wahapedia-Daten-Import
│
└── data/                              # SQLite-DB (gitignored)
```

## Services (Client)

| Service | Aufgabe |
|---|---|
| **UnitDataService** | Laedt 1129 Einheiten aus JSON, Suche & Filter |
| **PlayerService** | Spielerprofile + Sammlungen (Dexie.js/IndexedDB) |
| **ArmyStateService** | Armee-Zusammenstellung mit Balance-Algorithmus |
| **GameService** | Spielzustand: Phasen, Zuege, Verwundungen |
| **CampaignService** | Kampagnen, Battle-History, Story-Generierung |
| **SettingsService** | API-Key-Verwaltung fuer KI-Anbieter |
| **LLMService** | Provider-agnostische LLM-Aufrufe (OpenAI + Anthropic) |
| **TacticsService** | Spielphasen-spezifische Taktik-Tipps |

## Features im Detail

### 1. Einheiten-Datenbank (1129 Einheiten, 38 Fraktionen)

Durchsuchbare Datenbank aller Warhammer 40K Einheiten mit vollstaendigen Stats: Punkte, Wunden, Modelle, Rettungswurf, Waffen, Spezialregeln. Daten stammen aus Wahapedia und wurden mit dem Import-Script aufbereitet.

### 2. Spieler & Sammlung

Zwei Spieler anlegen und deren echte Miniaturensammlung erfassen. Der Armee-Bauer verwendet ausschliesslich Einheiten, die die Spieler tatsaechlich besitzen.

### 3. Armee-Bauer mit Balance-Algorithmus

- **Punkte-Slider** (500 - 4000 Punkte)
- **Greedy-Zuweisung**: Verteilt Einheiten abwechselnd an beide Spieler
- **Hill-Climbing-Optimierung**: Tauscht Einheiten zwischen Armeen, bis die Punktedifferenz unter 5% liegt
- **Must-Include**: Lieblingseinheiten koennen erzwungen werden

### 4. Spielassistent mit Phasen-Tracker

Fuehrt durch alle **5 Spielphasen** (Kommando, Bewegung, Schiessen, Angriff, Nahkampf):
- Visuelle Phasen-Leiste mit Fortschrittsanzeige
- Einheiten-Karten mit kontextabhaengigen Aktions-Buttons
- Verwundungs- und Modell-Tracker pro Einheit
- Kommandopunkte-Zaehler
- Automatischer Spieler-Wechsel

### 5. Kampf-Resolver (Schritt fuer Schritt)

Berechnet Kampfergebnisse in 4 Schritten:
1. **Trefferwurf** (Ballistic/Weapon Skill des Angreifers)
2. **Verwundungswurf** (Strength vs. Toughness nach offizieller Tabelle)
3. **Rettungswurf** (Save - AP-Modifikator der Waffe)
4. **Schadensberechnung** (Damage * durchgegangene Treffer)

Zeigt fuer jeden Schritt den Zielwert an ("Wuerfle! Du brauchst 3+"). Unmoegliche Wuerfe (7+) werden automatisch erkannt und rot markiert.

### 6. Dreistufiges Hilfe-System

| Stufe | Deutsch | Beschreibung |
|---|---|---|
| **Hoch** | Ausfuehrlich | Detaillierte Erklaerungen, alle Modifikatoren, Spezialregeln sichtbar |
| **Mittel** | Standard | Kurze Beschreibungen, wichtigste Regeln |
| **Niedrig** | Kompakt | Nur Kurzhinweise und Zielwerte - fuer erfahrene Spieler |

### 7. KI-Integration (optional)

Unterstuetzt **OpenAI** (GPT-4o-mini) und **Anthropic** (Claude Sonnet):
- **Taktik-Tipps** waehrend des Spiels (phasenspezifisch, spielstandabhaengig)
- **Missions-Generator** mit KI-generierten Szenarien
- **Story-Texte** fuer Kampagnen (Einleitungen + dramatische Enden)

Komplett optional - ohne API-Key gibt es **vorgefertigte deutsche Inhalte** als Fallback:
- 5 Missionen mit Zielen und Sonderregeln
- Phasenspezifische Taktik-Tipps (je 5 pro Phase + 5 allgemeine)
- 8 Story-Einleitungen + 7 Story-Enden fuer Kampagnen

### 8. Kampagnen-System

- Mehrere Spiele zu einer Kampagne verbinden
- Grosser Score-Balken (z.B. "Leo **3** : **2** Max")
- Schlachten-Chronik mit aufklappbaren Story-Texten
- Spielende-Screen mit Sieger-Auswahl und VP-Eingabe
- Ergebnisse werden automatisch in die aktive Kampagne eingetragen

### 9. Missions-Generator

5 vorgefertigte deutsche Missionen:
- **Kampf um die Bruecke** - Gebietshoheit ueber ein Terrain-Stueck
- **Rettungsmission** - VIPs vom Schlachtfeld evakuieren
- **Letzte Bastion** - Verteidiger vs. Angreifer-Szenario
- **Schatzsuche im Niemandsland** - 3 Objektive einsammeln
- **Ueberlebenskampf** - Beide Seiten erhalten Verstaerkung

### 10. PWA + iPad-Optimierung

- **Service Worker** (Angular ngsw) fuer vollstaendigen Offline-Betrieb
- **Web App Manifest** mit 8 Icon-Groessen (72px - 512px)
- **Apple-Meta-Tags** (apple-mobile-web-app-capable, Status-Bar-Style)
- **Safe-Area-Insets** fuer iPad-Notch und Home-Indicator
- **48px Touch-Targets** (Apple Human Interface Guidelines)
- **Pull-to-Refresh deaktiviert** (overscroll-behavior: none)
- **Responsive Layouts** fuer iPad Portrait (768x1024) und Landscape (1024x768)
- **Touch-Feedback**: Buttons schrumpfen leicht beim Antippen (scale 0.97)

## Installation & Entwicklung

### Voraussetzungen

- **Node.js** >= 20 (getestet mit v22.16)
- **npm** >= 10

### Setup

```bash
# Repository klonen
git clone https://github.com/Storypapst/warmama40k.git
cd warmama40k/warmama40k

# Abhaengigkeiten installieren
npm install
```

### Dev-Server starten

```bash
NX_IGNORE_UNSUPPORTED_TS_SETUP=true npx nx serve client
```

Die App laeuft dann unter **http://localhost:4200**.

> **Hinweis**: Das `NX_IGNORE_UNSUPPORTED_TS_SETUP=true` Prefix ist noetig wegen einer Kompatibilitaets-Warnung zwischen Nx und TypeScript 5.8.

### Production Build

```bash
NX_IGNORE_UNSUPPORTED_TS_SETUP=true npx nx build client
```

Build-Ausgabe: `dist/apps/client/browser/` (ca. 477 KB initial, 107 KB gzipped)

Die Build-Ausgabe kann mit jedem statischen Webserver ausgeliefert werden:

```bash
npx serve dist/apps/client/browser -s
```

### Auf dem iPad installieren

1. App auf einem Webserver deployen (oder lokal: `nx serve client`)
2. Auf dem iPad in **Safari** oeffnen
3. **Teilen-Button** > **Zum Home-Bildschirm**
4. App laeuft als Standalone-PWA mit eigenem Icon und Splash-Screen

## KI-Integration einrichten (optional)

Die App funktioniert komplett ohne KI. Fuer erweiterte Features:

1. In der App: **Zahnrad-Icon** (Einstellungen)
2. **KI-Anbieter** waehlen: OpenAI oder Anthropic
3. **API-Key** eingeben
4. **Verbindung testen** klicken

Die API-Aufrufe gehen direkt vom Browser an die Provider-API (kein Backend dazwischen). API-Keys werden ausschliesslich lokal in IndexedDB gespeichert.

| Feature | Ohne KI | Mit KI |
|---|---|---|
| Taktik-Tipps | Vorgefertigte deutsche Tipps | Personalisiert nach Spielstand |
| Missionen | 5 statische Missionen | Unbegrenzt generierte Missionen |
| Kampagnen-Stories | 8 statische Texte | Einzigartige Geschichten pro Schlacht |

## Routen

| Route | Komponente | Beschreibung |
|---|---|---|
| `/` | WelcomeComponent | Startseite mit Spieleruebersicht |
| `/collection` | CollectionComponent | Miniaturensammlung verwalten |
| `/overview` | OverviewComponent | Spieleruebersicht mit Stats |
| `/units` | UnitBrowserComponent | Einheiten-Datenbank durchsuchen |
| `/units/:faction` | FactionUnitsComponent | Einheiten einer Fraktion |
| `/units/:faction/:id` | UnitDetailComponent | Einheit-Detailansicht |
| `/army-builder` | ArmyBuilderComponent | Armee zusammenstellen |
| `/game-setup` | GameSetupComponent | Neues Spiel konfigurieren |
| `/game` | GameAssistantComponent | Aktives Spiel (Phasen-Tracker) |
| `/combat` | CombatResolverComponent | Kampf-Resolver |
| `/game-summary` | GameSummaryComponent | Spielende + Ergebnis eintragen |
| `/campaign` | CampaignComponent | Kampagnen-Verwaltung |
| `/missions` | MissionGeneratorComponent | Missions-Generator |
| `/settings` | SettingsComponent | KI-Einstellungen |

## Daten

Die Einheitendaten stammen aus Wahapedia und liegen als JSON unter `apps/client/src/assets/data/`:

- `all-units.json` - Alle 1129 Einheiten (128.000 Zeilen)
- `faction-index.json` - 38 Fraktionen mit Metadaten
- `factions/*.json` - Einheiten pro Fraktion

### Enthaltene Fraktionen

Space Marines, Blood Angels, Dark Angels, Space Wolves, Black Templars, Ultramarines, Imperial Fists, Iron Hands, Raven Guard, Salamanders, White Scars, Deathwatch, Adepta Sororitas, Adeptus Custodes, Adeptus Mechanicus, Astra Militarum, Grey Knights, Imperial Knights, Agents of the Imperium, Chaos Space Marines, Death Guard, Thousand Sons, World Eaters, Emperor's Children, Chaos Daemons, Chaos Knights, Necrons, Orks, T'au Empire, Tyranids, Craftworlds, Drukhari, Ynnari, Genestealer Cults, Leagues of Votann, Adeptus Titanicus, Titanicus Traitoris, Titans.

## Lizenz

Privates Projekt. Warhammer 40.000 ist ein eingetragenes Warenzeichen von Games Workshop Ltd. Die Einheitendaten dienen ausschliesslich dem persoenlichen Gebrauch.

---

Gebaut mit [Claude Code](https://claude.ai/code) (Anthropic) in 3 Sessions.
