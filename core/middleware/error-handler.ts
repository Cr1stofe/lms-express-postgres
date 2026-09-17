import type { Request, Response, NextFunction } from 'express';
import { RouteError } from '../utils/route-error.ts';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof RouteError) {
    console.error(`${err.status} ${err.message} | ${req.method} ${req.originalUrl || req.url}`);
    res.status(err.status);
    res.setHeader('content-type', 'application/problem+json');
    return res.json({
      status: err.status,
      title: err.message,
    });
  }

  console.error('Unhandled Error:', err);
  res.status(500);
  res.setHeader('content-type', 'application/problem+json');
  return res.json({
    status: 500,
    title: 'error',
  });
}
