import { Router } from 'express';
import { AuthMiddleware } from '../auth/middleware/auth.ts';
import { FilesController } from './controllers/files.controller.ts';

export const filesRouter = Router();

const auth = new AuthMiddleware();
const filesController = new FilesController();

filesRouter.get('/public/:name', filesController.servePublic);
filesRouter.get('/private/:name', auth.guard('user'), filesController.servePrivate);
filesRouter.post('/upload', auth.guard('admin'), filesController.upload);
