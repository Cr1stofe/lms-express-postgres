import { prisma } from '../../../core/prisma.ts';
import { randomBytesAsync, sha256 } from '../utils/utils.ts';
import type { Response } from 'express';

const ttlSec = 60 * 60 * 24 * 15; // 15 dias
const ttlSec5days = 60 * 60 * 24 * 5; // 5 dias

export const COOKIE_SID_KEY = '__Secure-sid';

export type UserRole = 'admin' | 'editor' | 'user';

export function setSessionCookie(res: Response, sid: string, maxAgeSec: number) {
  res.cookie(COOKIE_SID_KEY, sid, {
    maxAge: maxAgeSec * 1000,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_SID_KEY, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
}

export class SessionService {
  async create({ userId, ip, ua }: { userId: number; ip: string; ua: string }) {
    const sid = (await randomBytesAsync(32)).toString('base64url');
    const sid_hash = sha256(sid);
    const expiresDate = new Date(Date.now() + ttlSec * 1000);

    await prisma.session.create({
      data: {
        sidHash: sid_hash,
        userId,
        expires: expiresDate,
        ip,
        ua,
      },
    });

    return { sid, maxAgeSec: ttlSec };
  }

  async validate(sid: string) {
    const now = new Date();
    const sid_hash = sha256(sid);

    const session = await prisma.session.findUnique({
      where: { sidHash: sid_hash },
      include: {
        user: {
          select: { role: true },
        },
      },
    });

    if (!session || session.revoked) {
      return { valid: false as const };
    }

    let expiresDate = session.expires;

    if (now >= expiresDate) {
      await prisma.session.update({
        where: { sidHash: sid_hash },
        data: { revoked: true },
      });
      return { valid: false as const };
    }

    // Se faltar menos de 5 dias para expirar, estende por mais 15 dias
    if (now.getTime() >= expiresDate.getTime() - ttlSec5days * 1000) {
      const newExpires = new Date(Date.now() + ttlSec * 1000);
      await prisma.session.update({
        where: { sidHash: sid_hash },
        data: { expires: newExpires },
      });
      expiresDate = newExpires;
    }

    if (!session.user) {
      await prisma.session.update({
        where: { sidHash: sid_hash },
        data: { revoked: true },
      });
      return { valid: false as const };
    }

    const role = session.user.role.toLowerCase() as UserRole;

    return {
      valid: true as const,
      sid,
      maxAgeSec: Math.floor((expiresDate.getTime() - now.getTime()) / 1000),
      session: {
        user_id: session.userId,
        role,
        expires_ms: expiresDate.getTime(),
      },
    };
  }

  async invalidate(sid: string | undefined) {
    if (sid) {
      try {
        const sid_hash = sha256(sid);
        await prisma.session.update({
          where: { sidHash: sid_hash },
          data: { revoked: true },
        });
      } catch {}
    }
  }

  async invalidateAll(userId: number) {
    await prisma.session.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }

  async resetToken({
    userId,
    ip,
    ua,
  }: {
    userId: number;
    ip: string;
    ua: string;
  }) {
    const token = (await randomBytesAsync(32)).toString('base64url');
    const token_hash = sha256(token);
    const expiresDate = new Date(Date.now() + 1000 * 60 * 30); // 30 minutos

    await prisma.passwordReset.create({
      data: {
        tokenHash: token_hash,
        userId,
        expires: expiresDate,
        ip,
        ua,
      },
    });

    return { token };
  }

  async validateToken(token: string) {
    const now = new Date();
    const token_hash = sha256(token);

    const reset = await prisma.passwordReset.findUnique({
      where: { tokenHash: token_hash },
    });

    if (!reset || now > reset.expires) {
      return null;
    }

    await this.invalidateAll(reset.userId);
    await prisma.passwordReset.delete({
      where: { tokenHash: token_hash },
    });

    return { user_id: reset.userId };
  }
}
