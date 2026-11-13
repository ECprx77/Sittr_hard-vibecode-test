import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { nowIso } from '../utils/time.js';
import {
  toPublicProfile,
  type ProfileRow,
} from '../utils/profile.js';
import type { Role, VerificationStatus } from '../shared/types.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/users', (_req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.email, u.role, u.created_at, u.deleted_at, p.*
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT 200`,
    )
    .all() as Array<
    ProfileRow & {
      id: number;
      email: string;
      role: Role;
      created_at: string;
      deleted_at: string | null;
    }
  >;

  res.json({
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
      profile: row.user_id
        ? toPublicProfile(row, { viewerRole: 'admin', viewerId: row.id })
        : null,
    })),
  });
});

const verificationSchema = z.object({
  status: z.enum(['unverified', 'pending', 'verified']),
});

adminRouter.patch(
  '/users/:id/verification',
  validate(verificationSchema),
  (req, res) => {
    const userId = Number(req.params.id);
    const { status } = req.body as { status: VerificationStatus };
    const db = getDb();
    const user = db
      .prepare(
        `SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL`,
      )
      .get(userId) as { id: number; role: Role } | undefined;
    if (!user || user.role !== 'babysitter') {
      res.status(404).json({ error: 'Baby-sitter introuvable' });
      return;
    }
    db.prepare(
      `UPDATE profiles SET verification_status = ?, updated_at = ? WHERE user_id = ?`,
    ).run(status, nowIso(), userId);
    const profile = db
      .prepare(`SELECT * FROM profiles WHERE user_id = ?`)
      .get(userId) as ProfileRow;
    res.json({
      profile: toPublicProfile(profile, {
        viewerRole: 'admin',
        viewerId: userId,
      }),
    });
  },
);
