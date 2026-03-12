import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../database';

const uploadDir = path.join(process.cwd(), 'data', 'photos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

const router = Router();

// POST /api/v1/players/:playerId/units/:unitId/photo - Upload unit photo
router.post(
  '/players/:playerId/units/:unitId/photo',
  upload.single('photo'),
  (req, res) => {
    const db = getDb();

    if (!req.file) {
      res.status(400).json({ error: 'No photo file provided' });
      return;
    }

    const existing = db
      .prepare('SELECT id FROM owned_units WHERE id = ? AND player_id = ?')
      .get(req.params.unitId, req.params.playerId);

    if (!existing) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      res.status(404).json({ error: 'Owned unit not found' });
      return;
    }

    const photoUrl = `/photos/${req.file.filename}`;
    db.prepare('UPDATE owned_units SET photo_url = ? WHERE id = ?').run(
      photoUrl,
      req.params.unitId
    );

    res.json({ photoUrl });
  }
);

// Serve photos statically
router.get('/photos/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Photo not found' });
    return;
  }
  res.sendFile(filePath);
});

export default router;
