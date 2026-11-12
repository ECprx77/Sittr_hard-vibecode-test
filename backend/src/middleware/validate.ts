import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodType, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Données invalides',
        details: parsed.error.flatten(),
      });
      return;
    }
    (req as Request & { validated: unknown }).validated = parsed.data;
    if (source === 'body') req.body = parsed.data;
    if (source === 'query') {
      Object.assign(req.query, parsed.data as object);
    }
    if (source === 'params') {
      Object.assign(req.params, parsed.data as object);
    }
    next();
  };
}
