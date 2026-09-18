import type { Request, Response, NextFunction } from 'express';
import { LmsService } from '../services/lms.service.ts';
import {
  courseUpsertSchema,
  lessonUpsertSchema,
  completeLessonSchema,
  resetCourseSchema,
  slugSchema,
} from '../../../core/utils/validate.ts';

export class LmsController {
  private service: LmsService;

  constructor(service = new LmsService()) {
    this.service = service;
  }

  createCourse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = courseUpsertSchema.parse(req.body);
      const result = await this.service.upsertCourse(data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  listCourses = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await this.service.listCourses();
      res.status(200).json(courses);
    } catch (err) {
      next(err);
    }
  };

  getCourse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = slugSchema.parse(req.params.slug);
      const userId = req.session?.user_id;
      const result = await this.service.getCourseBySlug(slug, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  createLesson = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = lessonUpsertSchema.parse(req.body);
      const result = await this.service.upsertLesson(data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  listLessons = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const lessons = await this.service.listAllLessons();
      res.status(200).json(lessons);
    } catch (err) {
      next(err);
    }
  };

  getLesson = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseSlug = slugSchema.parse(req.params.courseSlug);
      const lessonSlug = slugSchema.parse(req.params.lessonSlug);
      const userId = req.session?.user_id;

      const result = await this.service.getLessonWithNavigation(courseSlug, lessonSlug, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  completeLesson = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, lessonId } = completeLessonSchema.parse(req.body);
      const userId = req.session!.user_id;

      const result = await this.service.completeLesson(courseId, lessonId, userId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  resetCourse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = resetCourseSchema.parse(req.body);
      const userId = req.session!.user_id;

      const result = await this.service.resetCourseProgress(courseId, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  listCertificates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session!.user_id;
      const certificates = await this.service.listUserCertificates(userId);
      res.status(200).json(certificates);
    } catch (err) {
      next(err);
    }
  };

  getCertificatePdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const pdfBuffer = await this.service.getCertificatePdf(id);

      res.setHeader('Content-Type', 'application/pdf');
      res.status(200).end(pdfBuffer);
    } catch (err) {
      next(err);
    }
  };
}
