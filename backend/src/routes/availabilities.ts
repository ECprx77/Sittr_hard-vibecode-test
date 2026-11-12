import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { isValidTime, timeToMinutes } from '../utils/time.js';
import {
  toPublicAvailability,
  type AvailabilityRow,
} from '../utils/profile.js';

export const availabilitiesRouter = Router();

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().refine(isValidTime, 'HH:MM requis'),
  endTime: z.string().refine(isValidTime, 'HH:MM requis'),
}).refine((v) => timeToMinutes(v.startTime) < timeToMinutes(v.endTime), {
  message: 'startTime doit être avant endTime',
});

function listForUser(userId: number) {
  return (
    getDb()
      .prepare(
        `SELECT id, day_of_week, start_time, end_time FROM availabilities
         WHERE user_id = ? ORDER BY day_of_week, start_time`,
      )
      .all(userId) as AvailabilityRow[]
  ).map(toPublicAvailability);
}

availabilitiesRouter.get('/me', requireAuth, requireRole('babysitter'), (req, res) => {
  res.json({ availabilities: listForUser(req.session.userId!) });
});

availabilitiesRouter.get('/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) {
    res.status(400).json({ error: 'Identifiant invalide' });
    return;
  }
  const user = getDb()
    .prepare(
      `SELECT id FROM users WHERE id = ? AND role = 'babysitter' AND deleted_at IS NULL`,
    )
    .get(userId);
  if (!user) {
    res.status(404).json({ error: 'Baby-sitter introuvable' });
    return;
  }
  res.json({ availabilities: listForUser(userId) });
});

availabilitiesRouter.post(
  '/',
  requireAuth,
  requireRole('babysitter'),
  validate(slotSchema),
  (req, res) => {
    const body = req.body as z.infer<typeof slotSchema>;
    const userId = req.session.userId!;
    try {
      const result = getDb()
        .prepare(
          `INSERT INTO availabilities (user_id, day_of_week, start_time, end_time)
           VALUES (?, ?, ?, ?)`,
        )
        .run(userId, body.dayOfWeek, body.startTime, body.endTime);
      const row = getDb()
        .prepare(
          `SELECT id, day_of_week, start_time, end_time FROM availabilities WHERE id = ?`,
        )
        .get(result.lastInsertRowid) as AvailabilityRow;
      res.status(201).json({ availability: toPublicAvailability(row) });
    } catch {
      res.status(409).json({ error: 'Créneau déjà existant' });
    }
  },
);

availabilitiesRouter.patch(
  '/:id',
  requireAuth,
  requireRole('babysitter'),
  validate(slotSchema),
  (req, res) => {
    const id = Number(req.params.id);
    const body = req.body as z.infer<typeof slotSchema>;
    const db = getDb();
    const existing = db
      .prepare(`SELECT id, user_id FROM availabilities WHERE id = ?`)
      .get(id) as { id: number; user_id: number } | undefined;
    if (!existing || existing.user_id !== req.session.userId) {
      res.status(404).json({ error: 'Créneau introuvable' });
      return;
    }
    try {
      db.prepare(
        `UPDATE availabilities SET day_of_week = ?, start_time = ?, end_time = ?
         WHERE id = ?`,
      ).run(body.dayOfWeek, body.startTime, body.endTime, id);
      const row = db
        .prepare(
          `SELECT id, day_of_week, start_time, end_time FROM availabilities WHERE id = ?`,
        )
        .get(id) as AvailabilityRow;
      res.json({ availability: toPublicAvailability(row) });
    } catch {
      res.status(409).json({ error: 'Créneau déjà existant' });
    }
  },
);

availabilitiesRouter.delete(
  '/:id',
  requireAuth,
  requireRole('babysitter'),
  (req, res) => {
    const id = Number(req.params.id);
    const db = getDb();
    const existing = db
      .prepare(`SELECT id, user_id FROM availabilities WHERE id = ?`)
      .get(id) as { id: number; user_id: number } | undefined;
    if (!existing || existing.user_id !== req.session.userId) {
      res.status(404).json({ error: 'Créneau introuvable' });
      return;
    }
    db.prepare(`DELETE FROM availabilities WHERE id = ?`).run(id);
    res.json({ ok: true });
  },
);
