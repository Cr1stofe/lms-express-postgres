import { Router } from 'express';
import { AuthMiddleware } from '../auth/middleware/auth.ts';
import { LmsController } from './controllers/lms.controller.ts';

export const lmsRouter = Router();

const auth = new AuthMiddleware();
const lmsController = new LmsController();

lmsRouter.post('/course', auth.guard('admin'), lmsController.createCourse);
lmsRouter.get('/courses', lmsController.listCourses);
lmsRouter.get('/course/:slug', auth.optional, lmsController.getCourse);

lmsRouter.post('/lesson', auth.guard('admin'), lmsController.createLesson);
lmsRouter.get('/lessons', auth.guard('admin'), lmsController.listLessons);
lmsRouter.get('/lesson/:courseSlug/:lessonSlug', auth.optional, lmsController.getLesson);

lmsRouter.post('/lesson/complete', auth.guard('user'), lmsController.completeLesson);
lmsRouter.delete('/course/reset', auth.guard('user'), lmsController.resetCourse);

lmsRouter.get('/certificates', auth.guard('user'), lmsController.listCertificates);
lmsRouter.get('/certificate/:id', lmsController.getCertificatePdf);
