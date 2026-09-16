import { Api } from '../../core/utils/abstract.ts';
import { RouteError } from '../../core/utils/route-error.ts';
import { AuthQuery } from './query.ts';
import { COOKIE_SID_KEY, SessionService } from './services/session.ts';
import { authTables } from './tables.ts';
import { AuthMiddleware } from './middleware/auth.ts';
import { Password } from './utils/password.ts';
import { v } from '../../core/utils/validate.ts';
import { rateLimit } from '../../core/middleware/rate-limit.ts';
import { PEPPER } from '../../env.ts';

export class AuthApi extends Api {
  query = new AuthQuery(this.db);
  session = new SessionService(this.core);
  auth = new AuthMiddleware(this.core);
  pass = new Password(PEPPER);
  handlers = {
    postUser: async (req, res) => {
      const { name, username, email, password } = {
        name: v.string(req.body.name),
        username: v.string(req.body.username),
        email: v.email(req.body.email),
        password: v.password(req.body.password),
      };

      const emailExists = this.query.selectUser('email', email);
      if (emailExists) {
        throw new RouteError(409, 'email existe');
      }

      const usernameExists = this.query.selectUser('username', username);
      if (usernameExists) {
        throw new RouteError(409, 'username existe');
      }

      const password_hash = await this.pass.hash(password);
      const writeResult = this.query.insertUser({
        name,
        username,
        email,
        role: 'user',
        password_hash,
      });
      if (writeResult.changes === 0) {
        throw new RouteError(400, 'erro ao criar usuário');
      }
      res.status(201).json({ title: 'usuário criado' });
    },

    postLogin: async (req, res) => {
      const { email, password } = {
        email: v.email(req.body.email),
        password: v.password(req.body.password),
      };
      const user = this.query.selectUser('email', email);
      if (!user) {
        throw new RouteError(404, 'email ou senha incorretos');
      }

      const validPassword = await this.pass.verify(
        password,
        user.password_hash,
      );
      if (!validPassword) {
        throw new RouteError(404, 'email ou senha incorretos');
      }

      const { cookie } = await this.session.create({
        userId: user.id,
        ip: req.ip,
        ua: req.headers['user-agent'] ?? '',
      });

      res.setCookie(cookie);
      res.status(200).json({ title: 'autenticado' });
    },

    passwordUpdate: async (req, res) => {
      const { password, new_password } = {
        password: v.password(req.body.password),
        new_password: v.password(req.body.new_password),
      };
      if (!req.session) {
        throw new RouteError(401, 'não autorizado');
      }
      const user = this.query.selectUser('id', req.session.user_id);
      if (!user) {
        throw new RouteError(404, 'usuário não encontrado');
      }
      const validPassword = await this.pass.verify(
        password,
        user.password_hash,
      );
      if (!validPassword) {
        throw new RouteError(400, 'senha atual incorreta');
      }
      const new_password_hash = await this.pass.hash(new_password);
      const updateResult = this.query.updateUser(
        user.id,
        'password_hash',
        new_password_hash,
      );
      if (updateResult.changes === 0) {
        throw new RouteError(400, 'erro ao atualizar senha');
      }
      this.session.invalidateAll(user.id);
      const { cookie } = await this.session.create({
        userId: user.id,
        ip: req.ip,
        ua: req.headers['user-agent'] || '',
      });
      res.setCookie(cookie);
      res.status(200).json({ title: 'senha atualizada' });
    },

    passwordForgot: async (req, res) => {
      const { email } = {
        email: v.email(req.body.email),
      };
      const user = this.query.selectUser('email', email);
      if (!user) {
        return res.status(200).json({ title: 'verifique seu email' });
      }
      const { token } = await this.session.resetToken({
        userId: user.id,
        ip: req.ip,
        ua: req.headers['user-agent'] || '',
      });

      const resetLink = `${req.baseurl}/#/resetar/?token=${token}`;

      const mailContent = {
        to: user.email,
        subject: 'Resetar Senha',
        body: /*html*/ `
        <h1 style="font-size: 1.25rem; font-family: sans-serif;">
          Olá, ${user.email}
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

      const { ok } = await this.mail.send(mailContent);
      if (!ok) {
        throw new RouteError(400, 'erro ao enviar email');
      }

      res.status(200).json({ title: 'verifique seu email' });
    },

    passwordReset: async (req, res) => {
      const { token, new_password } = {
        token: v.string(req.body.token),
        new_password: v.password(req.body.new_password),
      };
      const reset = this.session.validateToken(token);
      if (!reset) {
        throw new RouteError(400, 'token inválido');
      }
      const new_password_hash = await this.pass.hash(new_password);
      const updateResult = this.query.updateUser(
        reset.user_id,
        'password_hash',
        new_password_hash,
      );
      if (updateResult.changes === 0) {
        throw new RouteError(400, 'erro ao atualizar senha');
      }
      res.status(200).json({ title: 'senha atualizada' });
    },

    getSession: (req, res) => {
      if (!req.session) {
        throw new RouteError(401, 'não autorizado');
      }
      res.status(200).json({ title: 'valida', role: req.session.role });
    },

    deleteSession: (req, res) => {
      const sid = req.cookies[COOKIE_SID_KEY];
      const { cookie } = this.session.invalidate(sid);
      res.setCookie(cookie);
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Vary', 'Cookie');
      res.status(204).json({ title: 'logout' });
    },

    searchUsers: (req, res) => {
      const { s, page } = {
        s: v.o.string(req.query.get('s')),
        page: v.o.number(req.query.get('page')),
      };
      const result = this.query.selectUsers(s, 5, page);
      if (result.length === 0) {
        res.setHeader('X-Total-Count', '0');
        res.status(200).json([]);
        return;
      }
      const total = result[0].total;
      res.setHeader('X-Total-Count', String(total));
      res.status(200).json(result);
    },
  } satisfies Api['handlers'];
  tables(): void {
    this.db.exec(authTables);
    this.query.clearSessions();
    setInterval(() => {
      this.query.clearSessions();
    }, 1000 * 60 * 60 * 6).unref();
  }
  routes(): void {
    this.router.post('/auth/user', this.handlers.postUser, [
      rateLimit(30_000, 50),
    ]);
    this.router.post('/auth/login', this.handlers.postLogin, [
      rateLimit(30_000, 5),
    ]);
    this.router.delete('/auth/logout', this.handlers.deleteSession);
    this.router.post('/auth/password/forgot', this.handlers.passwordForgot, [
      rateLimit(30_000, 5),
    ]);
    this.router.post('/auth/password/reset', this.handlers.passwordReset, [
      rateLimit(30_000, 5),
    ]);
    this.router.put('/auth/password/update', this.handlers.passwordUpdate, [
      this.auth.guard('user'),
    ]);
    this.router.get('/auth/session', this.handlers.getSession, [
      this.auth.guard('user'),
    ]);
    this.router.get('/auth/users/search', this.handlers.searchUsers, [
      this.auth.guard('admin'),
    ]);
  }
}
