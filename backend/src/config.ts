import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

export const config = {
  port: Number(process.env.PORT ?? 3001),
  databasePath:
    process.env.DATABASE_PATH ?? path.join(backendRoot, 'data', 'sittr.sqlite'),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-only-secret',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  supportPhone: process.env.SUPPORT_PHONE ?? '+33123456789',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  uploadsDir: path.join(backendRoot, 'uploads'),
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@sittr.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'AdminChangeMe123!',
  appName: 'Sittr',
};

export const isProd = config.nodeEnv === 'production';
