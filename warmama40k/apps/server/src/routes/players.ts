import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database';

const router = Router();

// GET /api/v1/players - All players
router.get('/', (_req, res) => {
  const db = getDb();
  const players = db.prepare('SELECT * FROM players ORDER BY name').all() as {
    id: string;
    name: string;
    avatar_url: string | null;
  }[];

  res.json(
    players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatar_url,
    }))
  );
});

// POST /api/v1/players - Create player
router.post('/', (req, res) => {
  const db = getDb();
  const { name, avatarUrl } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const id = randomUUID();
  db.prepare(
    'INSERT INTO players (id, name, avatar_url) VALUES (?, ?, ?)'
  ).run(id, name.trim(), avatarUrl || null);

  res.status(201).json({ id, name: name.trim(), avatarUrl: avatarUrl || null });
});

// GET /api/v1/players/:id - Single player with owned units
router.get('/:id', (req, res) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id) as
    | { id: string; name: string; avatar_url: string | null }
    | undefined;

  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  const ownedUnits = db
    .prepare('SELECT * FROM owned_units WHERE player_id = ?')
    .all(req.params.id) as {
    id: string;
    unit_id: string;
    selected_model_count: number;
    selected_weapons: string;
    photo_url: string | null;
    nickname: string | null;
  }[];

  res.json({
    id: player.id,
    name: player.name,
    avatarUrl: player.avatar_url,
    ownedUnits: ownedUnits.map((u) => ({
      id: u.id,
      unitId: u.unit_id,
      selectedModelCount: u.selected_model_count,
      selectedWeapons: JSON.parse(u.selected_weapons),
      photoUrl: u.photo_url,
      nickname: u.nickname,
    })),
  });
});

// PUT /api/v1/players/:id - Update player
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, avatarUrl } = req.body;

  const existing = db
    .prepare('SELECT id FROM players WHERE id = ?')
    .get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  if (name !== undefined) {
    db.prepare(
      "UPDATE players SET name = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(name.trim(), req.params.id);
  }
  if (avatarUrl !== undefined) {
    db.prepare(
      "UPDATE players SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(avatarUrl, req.params.id);
  }

  res.json({ success: true });
});

// DELETE /api/v1/players/:id - Delete player
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM players WHERE id = ?')
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  res.json({ success: true });
});

// --- Owned Units ---

// POST /api/v1/players/:id/units - Add owned unit
router.post('/:id/units', (req, res) => {
  const db = getDb();
  const { unitId, selectedModelCount, selectedWeapons, photoUrl, nickname } =
    req.body;

  const player = db
    .prepare('SELECT id FROM players WHERE id = ?')
    .get(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  if (!unitId) {
    res.status(400).json({ error: 'unitId is required' });
    return;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO owned_units (id, player_id, unit_id, selected_model_count, selected_weapons, photo_url, nickname)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.params.id,
    unitId,
    selectedModelCount || 1,
    JSON.stringify(selectedWeapons || []),
    photoUrl || null,
    nickname || null
  );

  res.status(201).json({
    id,
    unitId,
    selectedModelCount: selectedModelCount || 1,
    selectedWeapons: selectedWeapons || [],
    photoUrl: photoUrl || null,
    nickname: nickname || null,
  });
});

// GET /api/v1/players/:id/units - Get owned units
router.get('/:id/units', (req, res) => {
  const db = getDb();
  const units = db
    .prepare('SELECT * FROM owned_units WHERE player_id = ? ORDER BY created_at')
    .all(req.params.id) as {
    id: string;
    unit_id: string;
    selected_model_count: number;
    selected_weapons: string;
    photo_url: string | null;
    nickname: string | null;
  }[];

  res.json(
    units.map((u) => ({
      id: u.id,
      unitId: u.unit_id,
      selectedModelCount: u.selected_model_count,
      selectedWeapons: JSON.parse(u.selected_weapons),
      photoUrl: u.photo_url,
      nickname: u.nickname,
    }))
  );
});

// PUT /api/v1/players/:playerId/units/:unitId - Update owned unit
router.put('/:playerId/units/:unitId', (req, res) => {
  const db = getDb();
  const { selectedModelCount, selectedWeapons, photoUrl, nickname } = req.body;

  const existing = db
    .prepare('SELECT id FROM owned_units WHERE id = ? AND player_id = ?')
    .get(req.params.unitId, req.params.playerId);
  if (!existing) {
    res.status(404).json({ error: 'Owned unit not found' });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (selectedModelCount !== undefined) {
    updates.push('selected_model_count = ?');
    params.push(selectedModelCount);
  }
  if (selectedWeapons !== undefined) {
    updates.push('selected_weapons = ?');
    params.push(JSON.stringify(selectedWeapons));
  }
  if (photoUrl !== undefined) {
    updates.push('photo_url = ?');
    params.push(photoUrl);
  }
  if (nickname !== undefined) {
    updates.push('nickname = ?');
    params.push(nickname);
  }

  if (updates.length > 0) {
    params.push(req.params.unitId);
    db.prepare(
      `UPDATE owned_units SET ${updates.join(', ')} WHERE id = ?`
    ).run(...params);
  }

  res.json({ success: true });
});

// DELETE /api/v1/players/:playerId/units/:unitId - Remove owned unit
router.delete('/:playerId/units/:unitId', (req, res) => {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM owned_units WHERE id = ? AND player_id = ?')
    .run(req.params.unitId, req.params.playerId);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Owned unit not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
