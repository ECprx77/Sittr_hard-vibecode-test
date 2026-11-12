import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { closeDb, resetDbForTests } from '../db/index.js';
import { config } from '../config.js';

export function setupTestApp() {
  let dbPath = '';
  let uploadsDir = '';

  beforeEach(() => {
    dbPath = path.join(
      os.tmpdir(),
      `sittr-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`,
    );
    uploadsDir = path.join(
      os.tmpdir(),
      `sittr-uploads-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    config.databasePath = dbPath;
    config.uploadsDir = uploadsDir;
    config.sessionSecret = 'test-secret';
    config.frontendOrigin = 'http://localhost:5173';
    resetDbForTests(dbPath);
  });

  afterEach(() => {
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    for (const suffix of ['-wal', '-shm']) {
      const p = dbPath + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    if (uploadsDir && fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    }
  });

  return {
    app: () => createApp(),
    agent: () => request.agent(createApp()),
  };
}

export async function register(
  agent: request.SuperAgentTest,
  data: {
    email: string;
    password?: string;
    role: 'parent' | 'babysitter';
    firstName: string;
  },
) {
  return agent.post('/api/auth/register').send({
    email: data.email,
    password: data.password ?? 'password123',
    role: data.role,
    firstName: data.firstName,
  });
}
