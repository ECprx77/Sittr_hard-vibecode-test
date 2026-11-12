import { Router } from 'express';
import { config } from '../config.js';

export const configRouter = Router();

configRouter.get('/', (_req, res) => {
  res.json({
    supportPhone: config.supportPhone,
    appName: config.appName,
  });
});
