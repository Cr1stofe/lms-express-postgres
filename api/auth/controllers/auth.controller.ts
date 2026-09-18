import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.ts';
import {
  registerUserSchema,
  loginSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../../core/utils/validate.ts';
import {
  COOKIE_SID_KEY,
  SessionService,
  setSessionCookie,
  clearSessionCookie,
} from '../services/session.ts';

export class AuthController {
  private service: AuthService;
  private sessionService: SessionService;

  constructor(service = new AuthService(), sessionService = new SessionService()) {
    this.service = service;
    this.sessionService = sessionService;
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = registerUserSchema.parse(req.body);
      const result = await this.service.register(data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '';
      const ua = req.headers['user-agent'] ?? '';

      const { sid, maxAgeSec, title } = await this.service.login({
        email,
        password,
        ip,
        ua,
      });

      setSessionCookie(res, sid, maxAgeSec);
      res.status(200).json({ title });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sid = req.cookies?.[COOKIE_SID_KEY];
      await this.sessionService.invalidate(sid);
      clearSessionCookie(res);
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Vary', 'Cookie');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  getSession = (req: Request, res: Response) => {
    res.status(200).json({
      title: 'valida',
      role: req.session!.role,
    });
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password, new_password } = updatePasswordSchema.parse(req.body);
      const userId = req.session!.user_id;
      const ip = req.ip || req.socket.remoteAddress || '';
      const ua = req.headers['user-agent'] ?? '';

      const { sid, maxAgeSec, title } = await this.service.updatePassword(
        userId,
        password,
        new_password,
        ip,
        ua,
      );

      setSessionCookie(res, sid, maxAgeSec);
      res.status(200).json({ title });
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '';
      const ua = req.headers['user-agent'] ?? '';
      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const result = await this.service.forgotPassword(email, ip, ua, baseUrl);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, new_password } = resetPasswordSchema.parse(req.body);
      const result = await this.service.resetPassword(token, new_password);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const search = (req.query.s as string)?.trim() || '';
      const page = Math.max(1, Number(req.query.page) || 1);

      const { users, total } = await this.service.searchUsers(search, page);

      res.setHeader('X-Total-Count', String(total));
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  };
}
