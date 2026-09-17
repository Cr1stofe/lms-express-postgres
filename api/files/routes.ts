import { Router, type Request, type Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { rename, rm, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { filenameSchema } from '../../core/utils/validate.ts';
import { RouteError } from '../../core/utils/route-error.ts';
import { AuthMiddleware } from '../auth/middleware/auth.ts';
import { FILES_PATH } from '../../env.ts';
import { checkETag, cropImage, LimitBytes, mimeType } from './utils.ts';

export const filesRouter = Router();

const auth = new AuthMiddleware();
const MAX_BYTES = 150 * 1024 * 1024; // 150MB

// GET /files/public/:name - Servir Arquivo Público com ETag & Streaming
filesRouter.get('/public/:name', async (req: Request, res: Response, next) => {
  try {
    const name = filenameSchema.parse(req.params.name);
    const filePath = path.join(FILES_PATH, 'public', name);
    const ext = path.extname(name);

    let st;
    try {
      st = await stat(filePath);
    } catch {
      throw new RouteError(404, 'arquivo não encontrado');
    }

    const etag = `W/${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}`;

    res.setHeader('ETag', etag);
    res.setHeader('Content-Length', st.size);
    res.setHeader('Last-Modified', st.mtime.toUTCString());
    res.setHeader('Content-Type', mimeType[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

    if (checkETag(req.headers['if-none-match'], etag)) {
      res.status(304).end();
      return;
    }

    res.status(200);
    const fileStream = createReadStream(filePath);
    await pipeline(fileStream, res);
  } catch (err) {
    next(err);
  }
});

// GET /files/private/:name - Servir Arquivo Protegido via X-Accel-Redirect
filesRouter.get(
  '/private/:name',
  auth.guard('user'),
  (req: Request, res: Response, next) => {
    try {
      const name = filenameSchema.parse(req.params.name);
      res.setHeader('X-Accel-Redirect', name);
      res.status(200).end();
    } catch (err) {
      next(err);
    }
  },
);

// POST /files/upload - Upload com Streaming e Processamento de Imagens (Admin)
filesRouter.post(
  '/upload',
  auth.guard('admin'),
  async (req: Request, res: Response, next) => {
    const contentType = req.headers['content-type'];
    if (contentType !== 'application/octet-stream') {
      return next(new RouteError(415, 'use octet-stream'));
    }

    const contentLength = Number(req.headers['content-length']);
    if (!Number.isInteger(contentLength)) {
      return next(new RouteError(400, 'content-length inválido'));
    }

    if (contentLength > MAX_BYTES) {
      return next(new RouteError(413, 'corpo grande'));
    }

    try {
      const rawFilename = req.headers['x-filename'] as string;
      const name = filenameSchema.parse(rawFilename);
      const visibility =
        req.headers['x-visibility'] === 'public' ? 'public' : 'private';

      const now = Date.now();
      const ext = path.extname(name);
      const finalName = `${name.replace(ext, '')}-${now}${ext}`;
      const tempPath = path.join(FILES_PATH, visibility, `${randomUUID()}.temp`);
      const writePath = path.join(FILES_PATH, visibility, finalName);
      const writeStream = createWriteStream(tempPath, { flags: 'wx' });

      try {
        await pipeline(req, LimitBytes(MAX_BYTES), writeStream);
        await rename(tempPath, writePath);

        if (ext === '.jpg' || ext === '.jpeg') {
          try {
            await cropImage(writePath, 320, 200);
          } catch (cropErr) {
            console.warn('Aviso: cropImage falhou ou libvips não disponível:', cropErr);
          }
        }

        res.status(201).json({ path: writePath, name: finalName });
      } catch (err) {
        if (err instanceof RouteError) {
          next(err);
        } else {
          next(new RouteError(500, 'erro ao processar upload'));
        }
      } finally {
        await rm(tempPath, { force: true }).catch(() => {});
      }
    } catch (err) {
      next(err);
    }
  },
);
