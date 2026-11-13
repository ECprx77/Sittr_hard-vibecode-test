import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, isProd } from './config.js';
import { getDb, migrate } from './db/index.js';
import { SqliteSessionStore } from './db/session-store.js';
import { authRouter } from './routes/auth.js';
import { profilesRouter } from './routes/profiles.js';
import { availabilitiesRouter } from './routes/availabilities.js';
import { searchRouter } from './routes/search.js';
import { favoritesRouter } from './routes/favorites.js';
import { requestsRouter } from './routes/requests.js';
import { adminRouter } from './routes/admin.js';
import { configRouter } from './routes/config.js';

export function createApp() {
  migrate();
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

  const app = express();
  const db = getDb();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      // Même domaine Vercel (Services) : refléter l’origine ; sinon FRONTEND_ORIGIN.
      origin: process.env.VERCEL ? true : config.frontendOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new SqliteSessionStore(db),
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/uploads', express.static(config.uploadsDir));
  app.use('/api/config', configRouter);
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/profiles', profilesRouter);
  app.use('/api/availabilities', availabilitiesRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/admin', adminRouter);

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: 'Erreur serveur' });
    },
  );

  return app;
}
