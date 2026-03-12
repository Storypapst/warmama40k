import fs from 'fs';
import path from 'path';
import { getDb } from '../database';

export function seedUnitsFromJson(jsonPath: string): {
  inserted: number;
  skipped: number;
} {
  const db = getDb();

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Unit data file not found: ${jsonPath}`);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const units = JSON.parse(rawData) as {
    id: string;
    name: string;
    faction: string;
    points: number;
  }[];

  const existing = db
    .prepare('SELECT COUNT(*) as count FROM units')
    .get() as { count: number };
  if (existing.count > 0) {
    return { inserted: 0, skipped: existing.count };
  }

  const insert = db.prepare(
    'INSERT INTO units (id, name, faction, points, data) VALUES (?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction(
    (
      items: {
        id: string;
        name: string;
        faction: string;
        points: number | null;
      }[]
    ) => {
      for (const unit of items) {
        insert.run(
          unit.id,
          unit.name,
          unit.faction,
          unit.points ?? 0,
          JSON.stringify(unit)
        );
      }
      return items.length;
    }
  );

  const count = insertMany(units);
  return { inserted: count, skipped: 0 };
}

export function getUnitDataPath(): string {
  // Check multiple locations for the data file
  const candidates = [
    path.join(process.cwd(), 'apps', 'client', 'src', 'assets', 'data', 'all-units.json'),
    path.join(process.cwd(), '..', 'apps', 'client', 'src', 'assets', 'data', 'all-units.json'),
    path.join(__dirname, '..', '..', '..', '..', 'apps', 'client', 'src', 'assets', 'data', 'all-units.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0]; // Return first candidate even if not found, so error message is clear
}
