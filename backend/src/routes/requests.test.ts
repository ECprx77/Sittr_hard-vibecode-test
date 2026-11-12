import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';
import { getDb } from '../db/index.js';
import { nowIso } from '../utils/time.js';
import { register, setupTestApp } from '../test/helpers.js';

const ctx = setupTestApp();

describe('favorites requests admin config', () => {
  it('supports favorites, requests, admin verification and config', async () => {
    const sitter = ctx.agent();
    const parent = ctx.agent();
    const admin = ctx.agent();

    const sitterReg = await register(sitter, {
      email: 'bob@example.com',
      role: 'babysitter',
      firstName: 'Bob',
    });
    const sitterId = sitterReg.body.user.id as number;

    await register(parent, {
      email: 'alice@example.com',
      role: 'parent',
      firstName: 'Alice',
    });

    const fav = await parent.post(`/api/favorites/${sitterId}`);
    expect(fav.status).toBe(201);
    const favs = await parent.get('/api/favorites');
    expect(favs.body.favorites).toHaveLength(1);

    const reqCreate = await parent.post('/api/requests').send({
      babysitterId: sitterId,
      message: 'Dispo vendredi ?',
    });
    expect(reqCreate.status).toBe(201);
    const requestId = reqCreate.body.request.id as number;

    const accept = await sitter
      .patch(`/api/requests/${requestId}`)
      .send({ status: 'accepted' });
    expect(accept.status).toBe(200);
    expect(accept.body.request.status).toBe('accepted');

    const db = getDb();
    const hash = bcrypt.hashSync('AdminChangeMe123!', 10);
    const createdAt = nowIso();
    const adminInsert = db
      .prepare(
        `INSERT INTO users (email, password_hash, role, created_at)
         VALUES (?, ?, 'admin', ?)`,
      )
      .run('admin@sittr.local', hash, createdAt);
    const adminId = Number(adminInsert.lastInsertRowid);
    db.prepare(
      `INSERT INTO profiles (user_id, first_name, updated_at) VALUES (?, 'Admin', ?)`,
    ).run(adminId, createdAt);

    const login = await admin.post('/api/auth/login').send({
      email: 'admin@sittr.local',
      password: 'AdminChangeMe123!',
    });
    expect(login.status).toBe(200);

    await sitter.post('/api/profiles/me/verification-request');
    const verify = await admin
      .patch(`/api/admin/users/${sitterId}/verification`)
      .send({ status: 'verified' });
    expect(verify.status).toBe(200);
    expect(verify.body.profile.verified).toBe(true);

    const conf = await parent.get('/api/config');
    expect(conf.status).toBe(200);
    expect(conf.body.supportPhone).toBeTruthy();
  });
});
