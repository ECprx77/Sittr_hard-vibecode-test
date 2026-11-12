import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { isValidTime } from '../utils/time.js';
import {
  toPublicAvailability,
  toPublicProfile,
  type AvailabilityRow,
  type ProfileRow,
} from '../utils/profile.js';

export const searchRouter = Router();

const querySchema = z.object({
  city: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  maxRate: z.coerce.number().min(0).max(500).optional(),
  day: z.coerce.number().int().min(0).max(6).optional(),
  after: z.string().refine((v) => !v || isValidTime(v), 'HH:MM').optional(),
  before: z.string().refine((v) => !v || isValidTime(v), 'HH:MM').optional(),
});

searchRouter.get('/', validate(querySchema, 'query'), (req, res) => {
  const q = req.query as unknown as z.infer<typeof querySchema>;
  const db = getDb();

  const where: string[] = [
    `u.role = 'babysitter'`,
    `u.deleted_at IS NULL`,
  ];
  const params: unknown[] = [];

  if (q.city) {
    where.push(`LOWER(p.city) = LOWER(?)`);
    params.push(q.city);
  }
  if (q.postalCode) {
    where.push(`p.postal_code = ?`);
    params.push(q.postalCode);
  }
  if (q.maxRate !== undefined) {
    where.push(`(p.hourly_rate IS NULL OR p.hourly_rate <= ?)`);
    params.push(q.maxRate);
  }

  if (q.day !== undefined) {
    where.push(`EXISTS (
      SELECT 1 FROM availabilities a
      WHERE a.user_id = u.id AND a.day_of_week = ?
      ${q.after ? 'AND a.end_time > ?' : ''}
      ${q.before ? 'AND a.start_time < ?' : ''}
    )`);
    params.push(q.day);
    if (q.after) params.push(q.after);
    if (q.before) params.push(q.before);
  }

  const rows = db
    .prepare(
      `SELECT p.* FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY p.verification_status = 'verified' DESC, p.first_name ASC
       LIMIT 100`,
    )
    .all(...params) as ProfileRow[];

  const results = rows.map((row) => {
    const avail = db
      .prepare(
        `SELECT id, day_of_week, start_time, end_time FROM availabilities
         WHERE user_id = ? ORDER BY day_of_week, start_time`,
      )
      .all(row.user_id) as AvailabilityRow[];
    return toPublicProfile(row, {
      viewerId: req.session.userId ?? null,
      viewerRole: req.session.role ?? null,
      includeAvailabilities: avail.map(toPublicAvailability),
    });
  });

  res.json({ results });
});
