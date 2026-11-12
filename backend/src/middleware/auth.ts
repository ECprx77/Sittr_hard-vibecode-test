import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../../../shared/types.js';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    role?: Role;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId || !req.session.role) {
    res.status(401).json({ error: 'Authentification requise' });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.userId || !req.session.role) {
      res.status(401).json({ error: 'Authentification requise' });
      return;
    }
    if (!roles.includes(req.session.role)) {
      res.status(403).json({ error: 'Permission refusée' });
      return;
    }
    next();
  };
}
