import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      session?: {
        user_id: number;
        role: 'admin' | 'editor' | 'user';
        expires_ms: number;
      };
      baseurl?: string;
    }
  }
}

export {};
