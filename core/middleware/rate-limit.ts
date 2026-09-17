import type { Request, Response, NextFunction } from 'express';
import { RouteError } from '../utils/route-error.ts';

type RateLimitRecord = {
  hits: number;
  reset: number;
};

export const rateLimit = (timeMs: number, max: number) => {
  const requests = new Map<string, RateLimitRecord>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, item] of requests) {
      if (now >= item.reset) requests.delete(key);
    }
  }, 30 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let record = requests.get(key);

    if (record === undefined || now >= record.reset) {
      record = {
        hits: 0,
        reset: now + timeMs,
      };
      requests.set(key, record);
    }

    record.hits += 1;

    const sLeft = Math.ceil((record.reset - now) / 1000);
    const rLeft = Math.max(0, max - record.hits);
    const sTime = Math.ceil(timeMs / 1000);
    res.setHeader('RateLimit', `"default";r=${rLeft};t=${sLeft}`);
    res.setHeader('RateLimit-Policy', `"default";q=${max};w=${sTime}`);

    if (record.hits > max) {
      res.setHeader('Retry-After', `${sLeft}`);
      return next(new RouteError(429, 'rate-limit'));
    }

    next();
  };
};
