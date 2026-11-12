import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { nowIso } from '../utils/time.js';
import {
  toPublicAvailability,
  toPublicProfile,
  type AvailabilityRow,
  type ProfileRow,
} from '../utils/profile.js';

export const profilesRouter = Router();

fs.mkdirSync(config.uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Fichier image requis'));
      return;
    }
    cb(null, true);
  },
});

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  age: z.number().int().min(16).max(99).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  experience: z.string().trim().max(2000).nullable().optional(),
  hourlyRate: z.number().min(0).max(500).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  phonePublic: z.boolean().optional(),
});

function getProfile(userId: number): ProfileRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM profiles WHERE user_id = ?`)
    .get(userId) as ProfileRow | undefined;
}

function getAvailabilities(userId: number) {
  return (
    getDb()
      .prepare(
        `SELECT id, day_of_week, start_time, end_time FROM availabilities
         WHERE user_id = ? ORDER BY day_of_week, start_time`,
      )
      .all(userId) as AvailabilityRow[]
  ).map(toPublicAvailability);
}

profilesRouter.patch('/me', requireAuth, validate(updateSchema), (req, res) => {
  const body = req.body as z.infer<typeof updateSchema>;
  const userId = req.session.userId!;
  const current = getProfile(userId);
  if (!current) {
    res.status(404).json({ error: 'Profil introuvable' });
    return;
  }

  getDb()
    .prepare(
      `UPDATE profiles SET
        first_name = ?,
        age = ?,
        city = ?,
        postal_code = ?,
        bio = ?,
        experience = ?,
        hourly_rate = ?,
        phone = ?,
        phone_public = ?,
        updated_at = ?
       WHERE user_id = ?`,
    )
    .run(
      body.firstName ?? current.first_name,
      body.age !== undefined ? body.age : current.age,
      body.city !== undefined ? body.city : current.city,
      body.postalCode !== undefined ? body.postalCode : current.postal_code,
      body.bio !== undefined ? body.bio : current.bio,
      body.experience !== undefined ? body.experience : current.experience,
      body.hourlyRate !== undefined ? body.hourlyRate : current.hourly_rate,
      body.phone !== undefined ? body.phone : current.phone,
      body.phonePublic !== undefined
        ? body.phonePublic
          ? 1
          : 0
        : current.phone_public,
      nowIso(),
      userId,
    );

  const updated = getProfile(userId)!;
  res.json({
    profile: toPublicProfile(updated, {
      viewerId: userId,
      viewerRole: req.session.role,
      includeAvailabilities: getAvailabilities(userId),
    }),
  });
});

profilesRouter.post(
  '/me/photo',
  requireAuth,
  (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Upload invalide' });
        return;
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier manquant' });
      return;
    }
    const userId = req.session.userId!;
    const current = getProfile(userId);
    if (current?.photo_path) {
      const old = path.join(config.uploadsDir, current.photo_path);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    getDb()
      .prepare(
        `UPDATE profiles SET photo_path = ?, updated_at = ? WHERE user_id = ?`,
      )
      .run(req.file.filename, nowIso(), userId);

    const updated = getProfile(userId)!;
    res.json({
      profile: toPublicProfile(updated, {
        viewerId: userId,
        viewerRole: req.session.role,
      }),
    });
  },
);

profilesRouter.post(
  '/me/verification-request',
  requireAuth,
  requireRole('babysitter'),
  (req, res) => {
    const userId = req.session.userId!;
    const profile = getProfile(userId);
    if (!profile) {
      res.status(404).json({ error: 'Profil introuvable' });
      return;
    }
    if (profile.verification_status === 'verified') {
      res.status(400).json({ error: 'Profil déjà vérifié' });
      return;
    }
    getDb()
      .prepare(
        `UPDATE profiles SET verification_status = 'pending', updated_at = ?
         WHERE user_id = ?`,
      )
      .run(nowIso(), userId);
    const updated = getProfile(userId)!;
    res.json({
      profile: toPublicProfile(updated, {
        viewerId: userId,
        viewerRole: req.session.role,
      }),
    });
  },
);

profilesRouter.get('/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) {
    res.status(400).json({ error: 'Identifiant invalide' });
    return;
  }

  const db = getDb();
  const user = db
    .prepare(
      `SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL`,
    )
    .get(userId) as { id: number; role: string } | undefined;
  if (!user) {
    res.status(404).json({ error: 'Profil introuvable' });
    return;
  }

  const profile = getProfile(userId);
  if (!profile) {
    res.status(404).json({ error: 'Profil introuvable' });
    return;
  }

  res.json({
    profile: toPublicProfile(profile, {
      viewerId: req.session.userId ?? null,
      viewerRole: req.session.role ?? null,
      includeAvailabilities: getAvailabilities(userId),
    }),
  });
});
