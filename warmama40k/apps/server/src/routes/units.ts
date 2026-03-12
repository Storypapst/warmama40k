import { Router } from 'express';
import { getDb } from '../database';

const router = Router();

// GET /api/v1/units - All units (paginated, filterable)
router.get('/', (req, res) => {
  const db = getDb();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const search = (req.query.search as string) || '';
  const faction = (req.query.faction as string) || '';

  let query = 'SELECT data FROM units WHERE 1=1';
  const params: unknown[] = [];

  if (faction) {
    query += ' AND faction = ?';
    params.push(faction);
  }
  if (search) {
    query += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }

  const countQuery = query.replace('SELECT data', 'SELECT COUNT(*) as total');
  const totalRow = db.prepare(countQuery).get(...params) as {
    total: number;
  };

  query += ' ORDER BY faction, name LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params) as { data: string }[];
  const units = rows.map((r) => JSON.parse(r.data));

  res.json({
    units,
    pagination: {
      page,
      limit,
      total: totalRow.total,
      totalPages: Math.ceil(totalRow.total / limit),
    },
  });
});

// GET /api/v1/units/factions - Faction list with counts
router.get('/factions', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT faction, COUNT(*) as unit_count, SUM(points) as total_points
       FROM units GROUP BY faction ORDER BY faction`
    )
    .all() as { faction: string; unit_count: number; total_points: number }[];

  res.json(
    rows.map((r) => ({
      faction: r.faction,
      unitCount: r.unit_count,
      totalPoints: r.total_points,
    }))
  );
});

// GET /api/v1/units/faction/:name - Units by faction
router.get('/faction/:name', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare('SELECT data FROM units WHERE faction = ? ORDER BY name')
    .all(req.params.name) as { data: string }[];

  if (rows.length === 0) {
    res.status(404).json({ error: 'Faction not found' });
    return;
  }

  res.json(rows.map((r) => JSON.parse(r.data)));
});

// GET /api/v1/units/:id - Single unit by ID
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT data FROM units WHERE id = ?').get(req.params.id) as
    | { data: string }
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'Unit not found' });
    return;
  }

  res.json(JSON.parse(row.data));
});

// GET /api/v1/units/search/:query - Search units by name
router.get('/search/:query', (req, res) => {
  const db = getDb();
  const rows = db
    .prepare('SELECT data FROM units WHERE name LIKE ? ORDER BY name LIMIT 50')
    .all(`%${req.params.query}%`) as { data: string }[];

  res.json(rows.map((r) => JSON.parse(r.data)));
});

export default router;
