import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { nowIso } from '../utils/time.js';
import {
  toPublicProfile,
  type ProfileRow,
} from '../utils/profile.js';
import type { Role } from '../shared/types.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(['parent', 'babysitter']),
  firstName: z.string().trim().min(1).max(80),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

function loadAuthUser(userId: number) {
  const db = getDb();
  const user = db
    .prepare(
      `SELECT id, email, role FROM users WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(userId) as { id: number; email: string; role: Role } | undefined;
  if (!user) return null;

  const profile = db
    .prepare(`SELECT * FROM profiles WHERE user_id = ?`)
    .get(userId) as ProfileRow | undefined;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    profile: profile
      ? toPublicProfile(profile, { viewerId: userId, viewerRole: user.role })
      : null,
  };
}

authRouter.post('/register', validate(registerSchema), (req, res) => {
  const { email, password, role, firstName } = req.body as z.infer<
    typeof registerSchema
  >;
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM users WHERE email = ? COLLATE NOCASE`)
    .get(email);
  if (existing) {
    res.status(409).json({ error: 'Email déjà utilisé' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = nowIso();

  const tx = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO users (email, password_hash, role, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(email.toLowerCase(), passwordHash, role, createdAt);
    const userId = Number(result.lastInsertRowid);
    db.prepare(
      `INSERT INTO profiles (user_id, first_name, updated_at)
       VALUES (?, ?, ?)`,
    ).run(userId, firstName, createdAt);
    return userId;
  });

  const userId = tx();
  req.session.userId = userId;
  req.session.role = role;
  res.status(201).json({ user: loadAuthUser(userId) });
});

authRouter.post('/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const db = getDb();
  const user = db
    .prepare(
      `SELECT id, password_hash, role FROM users
       WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL`,
    )
    .get(email) as
    | { id: number; password_hash: string; role: Role }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Identifiants invalides' });
    return;
  }

  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ user: loadAuthUser(user.id) });
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Déconnexion impossible' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = loadAuthUser(req.session.userId!);
  if (!user) {
    res.status(401).json({ error: 'Session invalide' });
    return;
  }
  res.json({ user });
});

authRouter.delete('/me', requireAuth, (req, res) => {
  const userId = req.session.userId!;
  const db = getDb();
  const deletedAt = nowIso();

  db.transaction(() => {
    db.prepare(
      `UPDATE users SET deleted_at = ?, email = ?, password_hash = ?
       WHERE id = ?`,
    ).run(deletedAt, `deleted+${userId}@sittr.invalid`, 'x', userId);
    db.prepare(
      `UPDATE profiles SET
         first_name = 'Supprimé',
         age = NULL,
         city = NULL,
         postal_code = NULL,
         bio = NULL,
         experience = NULL,
         hourly_rate = NULL,
         phone = NULL,
         phone_public = 0,
         photo_path = NULL,
         verification_status = 'unverified',
         updated_at = ?
       WHERE user_id = ?`,
    ).run(deletedAt, userId);
    db.prepare(`DELETE FROM availabilities WHERE user_id = ?`).run(userId);
    db.prepare(
      `DELETE FROM favorites WHERE parent_id = ? OR babysitter_id = ?`,
    ).run(userId, userId);
    db.prepare(
      `DELETE FROM requests WHERE parent_id = ? OR babysitter_id = ?`,
    ).run(userId, userId);
  })();

  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});
