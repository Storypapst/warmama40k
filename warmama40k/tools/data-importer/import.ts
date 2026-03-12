/**
 * Data Importer: Fetches WH40K unit data from the listforger GitHub repository,
 * transforms it into our normalized Unit interface format, and writes JSON files
 * to the Angular client's assets directory.
 *
 * Usage: npx tsx tools/data-importer/import.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL =
  'https://raw.githubusercontent.com/listforger/warhammer-40k-10th-edition/main';
const ASSETS_DIR = path.resolve(__dirname, '../../apps/client/src/assets/data');
const FACTIONS_DIR = path.resolve(ASSETS_DIR, 'factions');

interface RawWeapon {
  name: string;
  range?: number | string;
  weapon_types?: string;
  ballistic_skill: number;
  strength: number;
  armour_penetration: number;
  attacks: string;
  damage: string;
  parsed_weapon_types?: Record<string, unknown>;
}

interface RawUnit {
  unit_name: string;
  unit_type: string;
  points: number;
  toughness: number | string;
  wounds: number | string;
  movement: number | string;
  leadership: number | string;
  oc: number | string;
  armour_save: number | string;
  invunerable_save?: number | string;
  modelCount: number;
  unit_composition?: Array<{ modelCount: number; points: number }>;
  global_modifiers?: Record<string, unknown>;
  defenderGlobalModifiers?: Record<string, unknown>;
  tags?: string[];
  ranged_weapons?: RawWeapon[];
  melee_weapons?: RawWeapon[];
}

interface TransformedUnit {
  id: string;
  name: string;
  faction: string;
  points: number;
  unitType: 'model' | 'unit';
  stats: {
    toughness: number;
    wounds: number;
    movement: number;
    leadership: number;
    objectiveControl: number;
    armourSave: number;
    invulnerableSave: number | null;
    modelCount: number;
  };
  composition: {
    defaultModelCount: number;
    minModelCount: number;
    maxModelCount: number;
    compositionOptions: Array<{ modelCount: number; points: number }>;
  };
  globalModifiers: Record<string, unknown> | null;
  defenderGlobalModifiers: Record<string, unknown> | null;
  tags: string[];
  rangedWeapons: TransformedWeapon[];
  meleeWeapons: TransformedWeapon[];
}

interface TransformedWeapon {
  name: string;
  range: number | null;
  type: 'ranged' | 'melee';
  ballisticSkill: number;
  strength: number;
  armourPenetration: number;
  attacks: string;
  damage: string;
  abilities: Record<string, unknown>;
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toNum(val: number | string): number {
  if (typeof val === 'number') return val;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

function transformWeaponAbilities(
  parsed: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!parsed) return { attacksMultiplier: 1 };

  const abilities: Record<string, unknown> = {
    attacksMultiplier: (parsed['attacksMultiplier'] as number) || 1,
  };

  if (parsed['rapidFire']) abilities['rapidFire'] = parsed['rapidFire'];
  if (parsed['blast']) abilities['blast'] = true;
  if (parsed['twinLinked']) abilities['twinLinked'] = true;
  if (parsed['autoHit']) abilities['autoHit'] = true;
  if (parsed['ignoresCover']) abilities['ignoresCover'] = true;
  if (parsed['indirectFire']) abilities['indirectFire'] = true;
  if (parsed['oneShot']) abilities['oneShot'] = true;
  if (parsed['plusOneToWound']) abilities['plusOneToWound'] = true;

  if (parsed['lethalHits'] || parsed['lethalHitsOn6s']) {
    abilities['lethalHits'] = true;
  }
  if (parsed['devWounds'] || parsed['devWoundsOn6s']) {
    abilities['devastatingWounds'] = true;
  }

  // Melta
  if (parsed['melta']) {
    abilities['melta'] = parsed['melta2']
      ? 2
      : parsed['melta4']
        ? 4
        : parsed['melta6']
          ? 6
          : 2;
  }

  // Sustained Hits
  if (parsed['sustainedHits'] || parsed['sustainedHitsOn6s']) {
    if (parsed['sustainedHitsD3']) abilities['sustainedHits'] = 'D3';
    else if (parsed['sustainedHits2']) abilities['sustainedHits'] = 2;
    else abilities['sustainedHits'] = 1;
  }

  // Anti
  if (parsed['anti']) {
    const rollNeeded = parsed['anti2']
      ? 2
      : parsed['anti3']
        ? 3
        : parsed['anti4']
          ? 4
          : parsed['anti5']
            ? 5
            : 4;

    const targetType = parsed['antiTypeInfantry']
      ? 'Infantry'
      : parsed['antiTypeVehicle']
        ? 'Vehicle'
        : parsed['antiTypeMonster']
          ? 'Monster'
          : parsed['antiTypeFly']
            ? 'Fly'
            : parsed['antiTypePsyker']
              ? 'Psyker'
              : parsed['antiTypeChaos']
                ? 'Chaos'
                : parsed['antiTypeTitanic']
                  ? 'Titanic'
                  : parsed['antiTypeVehicleOrMonster']
                    ? 'Vehicle/Monster'
                    : 'Unknown';

    abilities['anti'] = { targetType, rollNeeded };
  }

  return abilities;
}

function transformWeapon(raw: RawWeapon, type: 'ranged' | 'melee'): TransformedWeapon {
  return {
    name: raw.name,
    range: raw.range ? toNum(raw.range as number | string) : null,
    type,
    ballisticSkill: toNum(raw.ballistic_skill),
    strength: toNum(raw.strength),
    armourPenetration: toNum(raw.armour_penetration),
    attacks: String(raw.attacks),
    damage: String(raw.damage),
    abilities: transformWeaponAbilities(
      raw.parsed_weapon_types as Record<string, unknown> | undefined,
    ),
  };
}

function transformUnit(raw: RawUnit, faction: string): TransformedUnit {
  // unit_composition is an object with composition_options array
  const comp = raw.unit_composition as unknown as {
    count?: number;
    default_model_count?: number;
    min_model_count?: number;
    max_model_count?: number;
    composition_options?: Array<{ model_count: number; points: number }>;
  } | undefined;

  const compOptions = comp?.composition_options || [
    { model_count: raw.modelCount, points: raw.points },
  ];

  return {
    id: toKebabCase(`${raw.unit_name}-${faction}`),
    name: raw.unit_name,
    faction,
    points: raw.points,
    unitType: raw.unit_type === 'model' ? 'model' : 'unit',
    stats: {
      toughness: toNum(raw.toughness),
      wounds: toNum(raw.wounds),
      movement: toNum(raw.movement),
      leadership: toNum(raw.leadership),
      objectiveControl: toNum(raw.oc),
      armourSave: toNum(raw.armour_save),
      invulnerableSave: raw.invunerable_save ? toNum(raw.invunerable_save) : null,
      modelCount: raw.modelCount,
    },
    composition: {
      defaultModelCount: comp?.default_model_count ?? raw.modelCount,
      minModelCount: comp?.min_model_count ?? raw.modelCount,
      maxModelCount: comp?.max_model_count ?? raw.modelCount,
      compositionOptions: compOptions.map((c) => ({
        modelCount: c.model_count,
        points: c.points,
      })),
    },
    globalModifiers: raw.global_modifiers || null,
    defenderGlobalModifiers: raw.defenderGlobalModifiers || null,
    tags: raw.tags || [],
    rangedWeapons: (raw.ranged_weapons || []).map((w) => transformWeapon(w, 'ranged')),
    meleeWeapons: (raw.melee_weapons || []).map((w) => transformWeapon(w, 'melee')),
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
}

async function main() {
  console.log('Fetching faction list...');
  const listData = (await fetchJson(`${BASE_URL}/List.json`)) as Record<string, unknown>;
  const factionNames = Object.keys(listData);

  console.log(`Found ${factionNames.length} factions`);

  // Ensure output directories exist
  fs.mkdirSync(FACTIONS_DIR, { recursive: true });

  const allUnits: TransformedUnit[] = [];
  const factionSummary: Array<{ faction: string; unitCount: number; totalPoints: number }> = [];

  for (const faction of factionNames) {
    const encodedFaction = encodeURIComponent(faction);
    const url = `${BASE_URL}/${encodedFaction}.json`;

    try {
      console.log(`  Fetching ${faction}...`);
      const rawUnits = (await fetchJson(url)) as RawUnit[];
      const transformed = rawUnits.map((u) => transformUnit(u, faction));

      allUnits.push(...transformed);

      // Write per-faction file
      const factionFile = path.join(FACTIONS_DIR, `${toKebabCase(faction)}.json`);
      fs.writeFileSync(factionFile, JSON.stringify(transformed, null, 2));

      factionSummary.push({
        faction,
        unitCount: transformed.length,
        totalPoints: transformed.reduce((sum, u) => sum + u.points, 0),
      });

      console.log(`    -> ${transformed.length} units`);
    } catch (err) {
      console.error(`  FAILED: ${faction} - ${err}`);
    }
  }

  // Write all units file
  const allFile = path.join(ASSETS_DIR, 'all-units.json');
  fs.writeFileSync(allFile, JSON.stringify(allUnits, null, 2));
  console.log(`\nWrote ${allUnits.length} total units to all-units.json`);

  // Write faction index
  const indexFile = path.join(ASSETS_DIR, 'faction-index.json');
  fs.writeFileSync(indexFile, JSON.stringify(factionSummary, null, 2));
  console.log(`Wrote faction index with ${factionSummary.length} factions`);

  // Stats
  const totalWeapons = allUnits.reduce(
    (sum, u) => sum + u.rangedWeapons.length + u.meleeWeapons.length,
    0,
  );
  console.log(`\nData import complete:`);
  console.log(`  Factions: ${factionSummary.length}`);
  console.log(`  Units: ${allUnits.length}`);
  console.log(`  Weapons: ${totalWeapons}`);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
