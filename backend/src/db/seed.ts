import bcrypt from 'bcrypt';
import { config } from '../config.js';
import { getDb, migrate } from './index.js';
import { nowIso } from '../utils/time.js';

migrate();
const db = getDb();

const existing = db
  .prepare(`SELECT id FROM users WHERE email = ? COLLATE NOCASE`)
  .get(config.adminEmail);

if (existing) {
  console.log('Admin déjà présent:', config.adminEmail);
  process.exit(0);
}

const hash = bcrypt.hashSync(config.adminPassword, 10);
const createdAt = nowIso();
const result = db
  .prepare(
    `INSERT INTO users (email, password_hash, role, created_at)
     VALUES (?, ?, 'admin', ?)`,
  )
  .run(config.adminEmail.toLowerCase(), hash, createdAt);

db.prepare(
  `INSERT INTO profiles (user_id, first_name, updated_at) VALUES (?, 'Admin', ?)`,
).run(Number(result.lastInsertRowid), createdAt);

console.log('Admin créé:', config.adminEmail);
