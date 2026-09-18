import { prisma } from '../../../core/prisma.ts';
import { RouteError } from '../../../core/utils/route-error.ts';
import { Password } from '../utils/password.ts';
import { PEPPER, EMAIL_KEY } from '../../../env.ts';
import { Mail } from '../../../core/mail/mail.ts';
import { SessionService } from './session.ts';

export interface RegisterUserInput {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  ip: string;
  ua: string;
}

export class AuthService {
  private pass: Password;
  private sessionService: SessionService;
  private mail: Mail;

  constructor(
    pass = new Password(PEPPER),
    sessionService = new SessionService(),
    mail = new Mail(EMAIL_KEY),
  ) {
    this.pass = pass;
    this.sessionService = sessionService;
    this.mail = mail;
  }

  async register(data: RegisterUserInput) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: data.email, mode: 'insensitive' } },
          { username: { equals: data.username, mode: 'insensitive' } },
        ],
      },
      select: { email: true, username: true },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === data.email.toLowerCase()) {
        throw new RouteError(409, 'email existe');
      }
      if (existingUser.username.toLowerCase() === data.username.toLowerCase()) {
        throw new RouteError(409, 'username existe');
      }
    }

    const passwordHash = await this.pass.hash(data.password);

    await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        passwordHash,
        role: 'USER',
      },
    });

    return { title: 'usuário criado' };
  }

  async login({ email, password, ip, ua }: LoginInput) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      throw new RouteError(404, 'email ou senha incorretos');
    }

    const validPassword = await this.pass.verify(password, user.passwordHash);
    if (!validPassword) {
      throw new RouteError(404, 'email ou senha incorretos');
    }

    const { sid, maxAgeSec } = await this.sessionService.create({
      userId: user.id,
      ip,
      ua,
    });

    return { sid, maxAgeSec, title: 'autenticado' };
  }

  async updatePassword(userId: number, currentPass: string, newPass: string, ip: string, ua: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RouteError(404, 'usuário não encontrado');
    }

    const validPassword = await this.pass.verify(currentPass, user.passwordHash);
    if (!validPassword) {
      throw new RouteError(400, 'senha atual incorreta');
    }

    const newPasswordHash = await this.pass.hash(newPass);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    await this.sessionService.invalidateAll(user.id);

    const { sid, maxAgeSec } = await this.sessionService.create({
      userId: user.id,
      ip,
      ua,
    });

    return { sid, maxAgeSec, title: 'senha atualizada' };
  }

  async forgotPassword(email: string, ip: string, ua: string, baseUrl: string) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      return { title: 'verifique seu email' };
    }

    const { token } = await this.sessionService.resetToken({
      userId: user.id,
      ip,
      ua,
    });

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

    const { ok } = await this.mail.send(mailContent);
    if (!ok) {
      throw new RouteError(400, 'erro ao enviar email');
    }

    return { title: 'verifique seu email' };
  }

  async resetPassword(token: string, newPass: string) {
    const reset = await this.sessionService.validateToken(token);
    if (!reset) {
      throw new RouteError(400, 'token inválido');
    }

    const newPasswordHash = await this.pass.hash(newPass);

    await prisma.user.update({
      where: { id: reset.user_id },
      data: { passwordHash: newPasswordHash },
    });

    return { title: 'senha atualizada' };
  }

  async searchUsers(search: string, page: number) {
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

    return {
      users: users.map((u) => ({
        ...u,
        created: u.created.toISOString().replace('T', ' ').substring(0, 19),
        total,
      })),
      total,
    };
  }
}
