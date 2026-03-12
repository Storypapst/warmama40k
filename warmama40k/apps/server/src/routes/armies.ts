import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database';

const router = Router();

// GET /api/v1/armies - All army lists (optionally filter by player)
router.get('/', (req, res) => {
  const db = getDb();
  const playerId = req.query.playerId as string;

  let query = 'SELECT * FROM army_lists';
  const params: unknown[] = [];

  if (playerId) {
    query += ' WHERE player_id = ?';
    params.push(playerId);
  }
  query += ' ORDER BY updated_at DESC';

  const rows = db.prepare(query).all(...params) as {
    id: string;
    name: string;
    player_id: string;
    target_points: number;
    actual_points: number;
    faction_groups: string;
    created_at: string;
    updated_at: string;
  }[];

  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      playerId: r.player_id,
      targetPoints: r.target_points,
      actualPoints: r.actual_points,
      factionGroups: JSON.parse(r.faction_groups),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  );
});

// POST /api/v1/armies - Create army list
router.post('/', (req, res) => {
  const db = getDb();
  const { name, playerId, targetPoints, actualPoints, factionGroups } =
    req.body;

  if (!name || !playerId) {
    res.status(400).json({ error: 'name and playerId are required' });
    return;
  }

  const player = db
    .prepare('SELECT id FROM players WHERE id = ?')
    .get(playerId);
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO army_lists (id, name, player_id, target_points, actual_points, faction_groups)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name,
    playerId,
    targetPoints || 1000,
    actualPoints || 0,
    JSON.stringify(factionGroups || [])
  );

  res.status(201).json({
    id,
    name,
    playerId,
    targetPoints: targetPoints || 1000,
    actualPoints: actualPoints || 0,
    factionGroups: factionGroups || [],
  });
});

// GET /api/v1/armies/:id - Single army list
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM army_lists WHERE id = ?')
    .get(req.params.id) as
    | {
        id: string;
        name: string;
        player_id: string;
        target_points: number;
        actual_points: number;
        faction_groups: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'Army list not found' });
    return;
  }

  res.json({
    id: row.id,
    name: row.name,
    playerId: row.player_id,
    targetPoints: row.target_points,
    actualPoints: row.actual_points,
    factionGroups: JSON.parse(row.faction_groups),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
});

// PUT /api/v1/armies/:id - Update army list
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, targetPoints, actualPoints, factionGroups } = req.body;

  const existing = db
    .prepare('SELECT id FROM army_lists WHERE id = ?')
    .get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Army list not found' });
    return;
  }

  const updates: string[] = ["updated_at = datetime('now')"];
  const params: unknown[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (targetPoints !== undefined) {
    updates.push('target_points = ?');
    params.push(targetPoints);
  }
  if (actualPoints !== undefined) {
    updates.push('actual_points = ?');
    params.push(actualPoints);
  }
  if (factionGroups !== undefined) {
    updates.push('faction_groups = ?');
    params.push(JSON.stringify(factionGroups));
  }

  params.push(req.params.id);
  db.prepare(
    `UPDATE army_lists SET ${updates.join(', ')} WHERE id = ?`
  ).run(...params);

  res.json({ success: true });
});

// DELETE /api/v1/armies/:id - Delete army list
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM army_lists WHERE id = ?')
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Army list not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
