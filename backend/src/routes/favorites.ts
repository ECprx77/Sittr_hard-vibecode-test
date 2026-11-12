import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { nowIso } from '../utils/time.js';
import {
  toPublicProfile,
  type ProfileRow,
} from '../utils/profile.js';

export const favoritesRouter = Router();

favoritesRouter.get('/', requireAuth, requireRole('parent'), (req, res) => {
  const parentId = req.session.userId!;
  const rows = getDb()
    .prepare(
      `SELECT p.* FROM favorites f
       JOIN profiles p ON p.user_id = f.babysitter_id
       JOIN users u ON u.id = f.babysitter_id
       WHERE f.parent_id = ? AND u.deleted_at IS NULL
       ORDER BY f.created_at DESC`,
    )
    .all(parentId) as ProfileRow[];

  res.json({
    favorites: rows.map((row) =>
      toPublicProfile(row, {
        viewerId: parentId,
        viewerRole: 'parent',
      }),
    ),
  });
});

favoritesRouter.post(
  '/:babysitterId',
  requireAuth,
  requireRole('parent'),
  (req, res) => {
    const parentId = req.session.userId!;
    const babysitterId = Number(req.params.babysitterId);
    const db = getDb();
    const sitter = db
      .prepare(
        `SELECT id FROM users WHERE id = ? AND role = 'babysitter' AND deleted_at IS NULL`,
      )
      .get(babysitterId);
    if (!sitter) {
      res.status(404).json({ error: 'Baby-sitter introuvable' });
      return;
    }
    db.prepare(
      `INSERT OR IGNORE INTO favorites (parent_id, babysitter_id, created_at)
       VALUES (?, ?, ?)`,
    ).run(parentId, babysitterId, nowIso());
    res.status(201).json({ ok: true });
  },
);

favoritesRouter.delete(
  '/:babysitterId',
  requireAuth,
  requireRole('parent'),
  (req, res) => {
    const parentId = req.session.userId!;
    const babysitterId = Number(req.params.babysitterId);
    getDb()
      .prepare(
        `DELETE FROM favorites WHERE parent_id = ? AND babysitter_id = ?`,
      )
      .run(parentId, babysitterId);
    res.json({ ok: true });
  },
);
