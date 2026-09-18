import type { Request, Response, NextFunction } from 'express';
import { FilesService } from '../services/files.service.ts';
import { filenameSchema } from '../../../core/utils/validate.ts';
import { RouteError } from '../../../core/utils/route-error.ts';

const MAX_BYTES = 150 * 1024 * 1024; // 150MB

export class FilesController {
  private service: FilesService;

  constructor(service = new FilesService()) {
    this.service = service;
  }

  servePublic = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const name = filenameSchema.parse(req.params.name);
      await this.service.servePublicFile(name, req.headers['if-none-match'], res);
    } catch (err) {
      next(err);
    }
  };

  servePrivate = (req: Request, res: Response, next: NextFunction) => {
    try {
      const name = filenameSchema.parse(req.params.name);
      res.setHeader('X-Accel-Redirect', name);
      res.status(200).end();
    } catch (err) {
      next(err);
    }
  };

  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
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

      const rawFilename = req.headers['x-filename'] as string;
      const name = filenameSchema.parse(rawFilename);
      const visibility = req.headers['x-visibility'] as string | undefined;

      const result = await this.service.processUpload(req, name, visibility);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };
}
