import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { nowIso } from '../utils/time.js';
import type { RequestStatus, Role } from '../shared/types.js';

export const requestsRouter = Router();

const createSchema = z.object({
  babysitterId: z.number().int().positive(),
  message: z.string().trim().max(1000).optional(),
});

const statusSchema = z.object({
  status: z.enum(['seen', 'accepted', 'declined', 'cancelled']),
});

interface RequestRow {
  id: number;
  parent_id: number;
  babysitter_id: number;
  message: string | null;
  status: RequestStatus;
  created_at: string;
}

function mapRequest(row: RequestRow) {
  return {
    id: row.id,
    parentId: row.parent_id,
    babysitterId: row.babysitter_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

requestsRouter.get('/sent', requireAuth, requireRole('parent'), (req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT * FROM requests WHERE parent_id = ? ORDER BY created_at DESC`,
    )
    .all(req.session.userId!) as RequestRow[];
  res.json({ requests: rows.map(mapRequest) });
});

requestsRouter.get(
  '/received',
  requireAuth,
  requireRole('babysitter'),
  (req, res) => {
    const rows = getDb()
      .prepare(
        `SELECT * FROM requests WHERE babysitter_id = ? ORDER BY created_at DESC`,
      )
      .all(req.session.userId!) as RequestRow[];
    res.json({ requests: rows.map(mapRequest) });
  },
);

requestsRouter.post(
  '/',
  requireAuth,
  requireRole('parent'),
  validate(createSchema),
  (req, res) => {
    const body = req.body as z.infer<typeof createSchema>;
    const db = getDb();
    const sitter = db
      .prepare(
        `SELECT id FROM users WHERE id = ? AND role = 'babysitter' AND deleted_at IS NULL`,
      )
      .get(body.babysitterId);
    if (!sitter) {
      res.status(404).json({ error: 'Baby-sitter introuvable' });
      return;
    }
    const result = db
      .prepare(
        `INSERT INTO requests (parent_id, babysitter_id, message, status, created_at)
         VALUES (?, ?, ?, 'sent', ?)`,
      )
      .run(
        req.session.userId!,
        body.babysitterId,
        body.message ?? null,
        nowIso(),
      );
    const row = db
      .prepare(`SELECT * FROM requests WHERE id = ?`)
      .get(result.lastInsertRowid) as RequestRow;
    res.status(201).json({ request: mapRequest(row) });
  },
);

requestsRouter.patch(
  '/:id',
  requireAuth,
  validate(statusSchema),
  (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body as z.infer<typeof statusSchema>;
    const role = req.session.role as Role;
    const userId = req.session.userId!;
    const db = getDb();
    const row = db
      .prepare(`SELECT * FROM requests WHERE id = ?`)
      .get(id) as RequestRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Demande introuvable' });
      return;
    }

    if (role === 'parent') {
      if (row.parent_id !== userId || status !== 'cancelled') {
        res.status(403).json({ error: 'Transition non autorisée' });
        return;
      }
    } else if (role === 'babysitter') {
      if (
        row.babysitter_id !== userId ||
        !['seen', 'accepted', 'declined'].includes(status)
      ) {
        res.status(403).json({ error: 'Transition non autorisée' });
        return;
      }
    } else {
      res.status(403).json({ error: 'Permission refusée' });
      return;
    }

    db.prepare(`UPDATE requests SET status = ? WHERE id = ?`).run(status, id);
    const updated = db
      .prepare(`SELECT * FROM requests WHERE id = ?`)
      .get(id) as RequestRow;
    res.json({ request: mapRequest(updated) });
  },
);
