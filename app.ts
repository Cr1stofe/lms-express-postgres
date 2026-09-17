import express, { type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { authRouter } from './api/auth/routes.ts';
import { lmsRouter } from './api/lms/routes.ts';
import { filesRouter } from './api/files/routes.ts';
import { errorHandler } from './core/middleware/error-handler.ts';
import { RouteError } from './core/utils/route-error.ts';

export const app = express();

// Middlewares essenciais
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Logger simples de requisições
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Suporte a rotas com e sem prefixo /api (para compatibilidade com front e Caddy)
app.use('/auth', authRouter);
app.use('/lms', lmsRouter);
app.use('/files', filesRouter);

app.use('/api/auth', authRouter);
app.use('/api/lms', lmsRouter);
app.use('/api/files', filesRouter);

// Rota de Healthcheck do Servidor
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tratamento de rota não encontrada (404)
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new RouteError(404, 'nao encontrada'));
});

// Middleware global de tratamento de erros
app.use(errorHandler);

export default app;
