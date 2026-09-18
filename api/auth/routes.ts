import { Router } from 'express';
import { AuthMiddleware } from './middleware/auth.ts';
import { AuthController } from './controllers/auth.controller.ts';
import { rateLimit } from '../../core/middleware/rate-limit.ts';

export const authRouter = Router();

const authMiddleware = new AuthMiddleware();
const authController = new AuthController();

const authLimiter = rateLimit(60 * 1000, 10);
const forgotLimiter = rateLimit(15 * 60 * 1000, 5);

authRouter.post('/user', authLimiter, authController.register);
authRouter.post('/login', authLimiter, authController.login);
authRouter.delete('/logout', authController.logout);

authRouter.get('/session', authMiddleware.guard('user'), authController.getSession);
authRouter.put('/password/update', authMiddleware.guard('user'), authController.updatePassword);
authRouter.post('/password/forgot', forgotLimiter, authController.forgotPassword);
authRouter.post('/password/reset', authController.resetPassword);

authRouter.get('/users/search', authMiddleware.guard('admin'), authController.searchUsers);
