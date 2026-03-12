import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../database';

const router = Router();

// POST /api/v1/games - Create new game session
router.post('/', (req, res) => {
  const db = getDb();
  const { player1Id, player2Id, assistanceLevel } = req.body;

  if (!player1Id || !player2Id) {
    res.status(400).json({ error: 'player1Id and player2Id are required' });
    return;
  }

  const p1 = db
    .prepare('SELECT id, name FROM players WHERE id = ?')
    .get(player1Id) as { id: string; name: string } | undefined;
  const p2 = db
    .prepare('SELECT id, name FROM players WHERE id = ?')
    .get(player2Id) as { id: string; name: string } | undefined;

  if (!p1 || !p2) {
    res.status(404).json({ error: 'One or both players not found' });
    return;
  }

  const id = randomUUID();
  const initialState = {
    id,
    player1: {
      playerId: p1.id,
      playerName: p1.name,
      army: null,
      unitStates: {},
      commandPoints: 0,
      victoryPoints: 0,
    },
    player2: {
      playerId: p2.id,
      playerName: p2.name,
      army: null,
      unitStates: {},
      commandPoints: 0,
      victoryPoints: 0,
    },
    currentTurn: 0,
    currentPhase: 'COMMAND',
    activePlayerId: p1.id,
    turnHistory: [],
    assistanceLevel: assistanceLevel || 'HIGH',
    startedAt: new Date().toISOString(),
    status: 'setup',
  };

  db.prepare(
    `INSERT INTO game_sessions (id, player1_id, player2_id, state, status, assistance_level)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    player1Id,
    player2Id,
    JSON.stringify(initialState),
    'setup',
    assistanceLevel || 'HIGH'
  );

  res.status(201).json(initialState);
});

// GET /api/v1/games - List game sessions
router.get('/', (req, res) => {
  const db = getDb();
  const status = req.query.status as string;

  let query =
    'SELECT id, player1_id, player2_id, status, assistance_level, started_at, updated_at FROM game_sessions';
  const params: unknown[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY updated_at DESC';

  const rows = db.prepare(query).all(...params) as {
    id: string;
    player1_id: string;
    player2_id: string;
    status: string;
    assistance_level: string;
    started_at: string;
    updated_at: string;
  }[];

  res.json(
    rows.map((r) => ({
      id: r.id,
      player1Id: r.player1_id,
      player2Id: r.player2_id,
      status: r.status,
      assistanceLevel: r.assistance_level,
      startedAt: r.started_at,
      updatedAt: r.updated_at,
    }))
  );
});

// GET /api/v1/games/:id - Get game state
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db
    .prepare('SELECT state FROM game_sessions WHERE id = ?')
    .get(req.params.id) as { state: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  res.json(JSON.parse(row.state));
});

// PUT /api/v1/games/:id - Update game state
router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM game_sessions WHERE id = ?')
    .get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const state = req.body;
  db.prepare(
    `UPDATE game_sessions SET state = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(JSON.stringify(state), state.status || 'active', req.params.id);

  res.json({ success: true });
});

// PUT /api/v1/games/:id/phase - Advance to next phase
router.put('/:id/phase', (req, res) => {
  const db = getDb();
  const row = db
    .prepare('SELECT state FROM game_sessions WHERE id = ?')
    .get(req.params.id) as { state: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  const state = JSON.parse(row.state);
  const phases = ['COMMAND', 'MOVEMENT', 'SHOOTING', 'CHARGE', 'FIGHT'];
  const currentIdx = phases.indexOf(state.currentPhase);

  if (currentIdx === phases.length - 1) {
    // End of turn - switch active player or advance turn
    if (state.activePlayerId === state.player1.playerId) {
      state.activePlayerId = state.player2.playerId;
      state.currentPhase = 'COMMAND';
    } else {
      state.activePlayerId = state.player1.playerId;
      state.currentTurn += 1;
      state.currentPhase = 'COMMAND';
      // Reset unit states for new turn
      for (const unitState of Object.values(state.player1.unitStates) as {
        hasShot: boolean;
        hasCharged: boolean;
        hasFought: boolean;
        hasMoved: boolean;
      }[]) {
        unitState.hasShot = false;
        unitState.hasCharged = false;
        unitState.hasFought = false;
        unitState.hasMoved = false;
      }
      for (const unitState of Object.values(state.player2.unitStates) as {
        hasShot: boolean;
        hasCharged: boolean;
        hasFought: boolean;
        hasMoved: boolean;
      }[]) {
        unitState.hasShot = false;
        unitState.hasCharged = false;
        unitState.hasFought = false;
        unitState.hasMoved = false;
      }
    }
  } else {
    state.currentPhase = phases[currentIdx + 1];
  }

  state.turnHistory.push({
    turn: state.currentTurn,
    phase: state.currentPhase,
    activePlayerId: state.activePlayerId,
    events: [],
  });

  db.prepare(
    `UPDATE game_sessions SET state = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(JSON.stringify(state), req.params.id);

  res.json(state);
});

// DELETE /api/v1/games/:id - Delete game session
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM game_sessions WHERE id = ?')
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
