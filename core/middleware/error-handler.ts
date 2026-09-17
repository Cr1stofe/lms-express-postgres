import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { RouteError } from '../utils/route-error.ts';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const field = firstIssue?.path?.join('.');
    const title = field
      ? `${field}: ${firstIssue.message}`
      : firstIssue?.message || 'dados inválidos';

    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || '_form';
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }

    console.error(`422 ${title} | ${req.method} ${req.originalUrl || req.url}`);
    res.status(422);
    res.setHeader('content-type', 'application/problem+json');
    return res.json({
      status: 422,
      title,
      errors: fieldErrors,
    });
  }

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
