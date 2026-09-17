import type { Request, Response, NextFunction } from 'express';
import { RouteError } from '../../../core/utils/route-error.ts';
import {
  COOKIE_SID_KEY,
  SessionService,
  setSessionCookie,
  type UserRole,
} from '../services/session.ts';

function roleCheck(requiredRole: UserRole, userRole: UserRole): boolean {
  switch (userRole) {
    case 'admin':
      return true;
    case 'editor':
      return requiredRole === 'editor' || requiredRole === 'user';
    case 'user':
      return requiredRole === 'user';
    default:
      return false;
  }
}

export class AuthMiddleware {
  private sessionService = new SessionService();

  guard = (role: UserRole) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('Vary', 'Cookie');

        const sid = req.cookies?.[COOKIE_SID_KEY];
        if (!sid) {
          throw new RouteError(401, 'não autorizado');
        }

        const result = await this.sessionService.validate(sid);

        if (!result.valid || !result.session) {
          throw new RouteError(401, 'não autorizado');
        }

        setSessionCookie(res, result.sid, result.maxAgeSec);

        if (!roleCheck(role, result.session.role)) {
          throw new RouteError(403, 'sem permissão');
        }

        req.session = result.session;
        next();
      } catch (err) {
        next(err);
      }
    };
  };

  optional = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sid = req.cookies?.[COOKIE_SID_KEY];
      if (!sid) {
        return next();
      }

      const result = await this.sessionService.validate(sid);

      if (result.valid && result.session) {
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('Vary', 'Cookie');
        setSessionCookie(res, result.sid, result.maxAgeSec);
        req.session = result.session;
      }

      next();
    } catch (err) {
      next();
    }
  };
}
