import { createReadStream, createWriteStream } from 'node:fs';
import { rename, rm, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Response, Request } from 'express';
import { RouteError } from '../../../core/utils/route-error.ts';
import { FILES_PATH } from '../../../env.ts';
import { checkETag, cropImage, LimitBytes, mimeType } from '../utils.ts';

const MAX_BYTES = 150 * 1024 * 1024; // 150MB

export class FilesService {
  async servePublicFile(name: string, reqIfNoneMatch: string | undefined, res: Response) {
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

    if (checkETag(reqIfNoneMatch, etag)) {
      res.status(304).end();
      return;
    }

    res.status(200);
    const fileStream = createReadStream(filePath);
    await pipeline(fileStream, res);
  }

  async processUpload(req: Request, rawFilename: string, visibilityHeader?: string) {
    const visibility = visibilityHeader === 'public' ? 'public' : 'private';
    const now = Date.now();
    const ext = path.extname(rawFilename);
    const finalName = `${rawFilename.replace(ext, '')}-${now}${ext}`;
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

      return { path: writePath, name: finalName };
    } catch (err) {
      if (err instanceof RouteError) {
        throw err;
      }
      throw new RouteError(500, 'erro ao processar upload');
    } finally {
      await rm(tempPath, { force: true }).catch(() => {});
    }
  }
}
