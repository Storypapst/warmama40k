import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import { seedUnitsFromJson, getUnitDataPath } from './data/seed-units';
import unitsRouter from './routes/units';
import playersRouter from './routes/players';
import armiesRouter from './routes/armies';
import gamesRouter from './routes/games';
import photosRouter from './routes/photos';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize database
console.log('Initializing database...');
initDatabase();

// Seed unit data if empty
try {
  const dataPath = getUnitDataPath();
  const result = seedUnitsFromJson(dataPath);
  if (result.inserted > 0) {
    console.log(`Seeded ${result.inserted} units into database`);
  } else {
    console.log(`Database already contains ${result.skipped} units`);
  }
} catch (err) {
  console.warn('Could not seed unit data:', (err as Error).message);
  console.warn('Run the data importer first: npx tsx tools/data-importer/import.ts');
}

// API Routes
app.use('/api/v1/units', unitsRouter);
app.use('/api/v1/players', playersRouter);
app.use('/api/v1/armies', armiesRouter);
app.use('/api/v1/games', gamesRouter);
app.use('/api/v1', photosRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
  console.log('API endpoints:');
  console.log('  GET  /api/v1/units          - List units (paginated)');
  console.log('  GET  /api/v1/units/factions  - List factions');
  console.log('  GET  /api/v1/units/faction/:name - Units by faction');
  console.log('  POST /api/v1/players        - Create player');
  console.log('  POST /api/v1/armies         - Create army list');
  console.log('  POST /api/v1/games          - Create game session');
});
