import { Router, type Request, type Response } from 'express';
import { prisma } from '../../core/prisma.ts';
import { RouteError } from '../../core/utils/route-error.ts';
import {
  registerUserSchema,
  loginSchema,
  updatePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../core/utils/validate.ts';
import { Password } from './utils/password.ts';
import { PEPPER, EMAIL_KEY } from '../../env.ts';
import { Mail } from '../../core/mail/mail.ts';
import {
  COOKIE_SID_KEY,
  SessionService,
  setSessionCookie,
  clearSessionCookie,
} from './services/session.ts';
import { AuthMiddleware } from './middleware/auth.ts';
import { rateLimit } from '../../core/middleware/rate-limit.ts';

export const authRouter = Router();

const pass = new Password(PEPPER);
const sessionService = new SessionService();
const authMiddleware = new AuthMiddleware();
const mail = new Mail(EMAIL_KEY);

const authLimiter = rateLimit(60 * 1000, 10);
const forgotLimiter = rateLimit(15 * 60 * 1000, 5);

// POST /auth/user - Cadastro de Usuário (com Rate Limit)
authRouter.post('/user', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { name, username, email, password } = registerUserSchema.parse(req.body);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { username: { equals: username, mode: 'insensitive' } },
        ],
      },
      select: { email: true, username: true },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === email.toLowerCase()) {
        throw new RouteError(409, 'email existe');
      }
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        throw new RouteError(409, 'username existe');
      }
    }

    const passwordHash = await pass.hash(password);

    await prisma.user.create({
      data: {
        name,
        username,
        email,
        passwordHash,
        role: 'USER',
      },
    });

    res.status(201).json({ title: 'usuário criado' });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login - Login (com Rate Limit)
authRouter.post('/login', authLimiter, async (req: Request, res: Response, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      throw new RouteError(404, 'email ou senha incorretos');
    }

    const validPassword = await pass.verify(password, user.passwordHash);
    if (!validPassword) {
      throw new RouteError(404, 'email ou senha incorretos');
    }

    const ip = req.ip || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] ?? '';

    const { sid, maxAgeSec } = await sessionService.create({
      userId: user.id,
      ip,
      ua,
    });

    setSessionCookie(res, sid, maxAgeSec);
    res.status(200).json({ title: 'autenticado' });
  } catch (err) {
    next(err);
  }
});

// DELETE /auth/logout - Logout
authRouter.delete('/logout', async (req: Request, res: Response, next) => {
  try {
    const sid = req.cookies?.[COOKIE_SID_KEY];
    await sessionService.invalidate(sid);
    clearSessionCookie(res);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Cookie');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /auth/session - Verificar Sessão Atual
authRouter.get(
  '/session',
  authMiddleware.guard('user'),
  (req: Request, res: Response) => {
    res.status(200).json({
      title: 'valida',
      role: req.session!.role,
    });
  },
);

// PUT /auth/password/update - Atualizar Senha (Logado)
authRouter.put(
  '/password/update',
  authMiddleware.guard('user'),
  async (req: Request, res: Response, next) => {
    try {
      const { password, new_password } = updatePasswordSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: req.session!.user_id },
      });

      if (!user) {
        throw new RouteError(404, 'usuário não encontrado');
      }

      const validPassword = await pass.verify(password, user.passwordHash);
      if (!validPassword) {
        throw new RouteError(400, 'senha atual incorreta');
      }

      const newPasswordHash = await pass.hash(new_password);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      await sessionService.invalidateAll(user.id);

      const ip = req.ip || req.socket.remoteAddress || '';
      const ua = req.headers['user-agent'] ?? '';

      const { sid, maxAgeSec } = await sessionService.create({
        userId: user.id,
        ip,
        ua,
      });

      setSessionCookie(res, sid, maxAgeSec);
      res.status(200).json({ title: 'senha atualizada' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/password/forgot - Esqueci minha Senha (com Rate Limit)
authRouter.post(
  '/password/forgot',
  forgotLimiter,
  async (req: Request, res: Response, next) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });

      if (!user) {
        return res.status(200).json({ title: 'verifique seu email' });
      }

      const ip = req.ip || req.socket.remoteAddress || '';
      const ua = req.headers['user-agent'] ?? '';

      const { token } = await sessionService.resetToken({
        userId: user.id,
        ip,
        ua,
      });

      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      const resetLink = `${baseUrl}/#/resetar/?token=${token}`;

      const mailContent = {
        to: user.email,
        subject: 'Resetar Senha',
        body: /*html*/ `
      <h1 style="font-size: 1.25rem; font-family: sans-serif;">
        Olá, ${user.name || user.email}
      </h1>
      <p style="font-size: 1rem; font-family: sans-serif;">
        você solicitou a redefinição da sua senha:
      </p>
      <a style="padding: .5rem 1rem; background: black; color: white; text-decoration: none; border-radius: 4px; font-family: sans-serif;" href="${resetLink}">
        Resetar Senha
      </a>
      <p style="color: #555; margin-top: 2rem; font-family: sans-serif;">
        Se você não solicitou a redefinição, ignore este e-mail.
      </p>`,
      };

      const { ok } = await mail.send(mailContent);
      if (!ok) {
        throw new RouteError(400, 'erro ao enviar email');
      }

      res.status(200).json({ title: 'verifique seu email' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/password/reset - Redefinir Senha com Token
authRouter.post('/password/reset', async (req: Request, res: Response, next) => {
  try {
    const { token, new_password } = resetPasswordSchema.parse(req.body);

    const reset = await sessionService.validateToken(token);
    if (!reset) {
      throw new RouteError(400, 'token inválido');
    }

    const newPasswordHash = await pass.hash(new_password);

    await prisma.user.update({
      where: { id: reset.user_id },
      data: { passwordHash: newPasswordHash },
    });

    res.status(200).json({ title: 'senha atualizada' });
  } catch (err) {
    next(err);
  }
});

// GET /auth/users/search - Buscar Usuários (Apenas Admin)
authRouter.get(
  '/users/search',
  authMiddleware.guard('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const search = (req.query.s as string)?.trim() || '';
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 5;
      const offset = (page - 1) * limit;

      const whereClause = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            email: true,
            created: true,
          },
          orderBy: { created: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where: whereClause }),
      ]);

      res.setHeader('X-Total-Count', String(total));
      res.status(200).json(
        users.map((u) => ({
          ...u,
          created: u.created.toISOString().replace('T', ' ').substring(0, 19),
          total,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);
