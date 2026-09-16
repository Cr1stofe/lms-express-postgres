import { Api } from '../../core/utils/abstract.ts';
import { RouteError } from '../../core/utils/route-error.ts';
import { v } from '../../core/utils/validate.ts';
import { AuthMiddleware } from '../auth/middleware/auth.ts';
import { LmsQuery } from './query.ts';
import { lmsTables } from './tables.ts';
import { generateCertificate } from './utils/certificate.ts';

export class LmsApi extends Api {
  query = new LmsQuery(this.db);
  auth = new AuthMiddleware(this.core);

  handlers = {
    postCourse: (req, res) => {
      if (!req.session) {
        throw new RouteError(401, 'não autorizado');
      }
      const { slug, title, description, lessons, hours } = {
        slug: v.string(req.body.slug),
        title: v.string(req.body.title),
        description: v.string(req.body.description),
        lessons: v.number(req.body.lessons),
        hours: v.number(req.body.hours),
      };

      const writeResult = this.query.insertCourse({
        slug,
        title,
        description,
        lessons,
        hours,
      });
      if (writeResult.changes === 0) {
        throw new RouteError(400, 'erro ao criar curso');
      }
      res.status(201).json({
        id: writeResult.lastInsertRowid,
        changes: writeResult.changes,
        title: 'curso criado',
      });
    },

    postLesson: (req, res) => {
      if (!req.session) {
        throw new RouteError(401, 'não autorizado');
      }
      const {
        courseSlug,
        slug,
        title,
        seconds,
        video,
        description,
        order,
        free,
      } = {
        courseSlug: v.string(req.body.courseSlug),
        slug: v.string(req.body.slug),
        title: v.string(req.body.title),
        description: v.string(req.body.description),
        video: v.string(req.body.video),
        seconds: v.number(req.body.seconds),
        order: v.number(req.body.order),
        free: v.number(req.body.free),
      };

      const writeResult = this.query.insertLesson({
        courseSlug,
        slug,
        title,
        seconds,
        video,
        description,
        order,
        free,
      });
      if (writeResult.changes === 0) {
        throw new RouteError(400, 'erro ao criar aula');
      }
      res.status(201).json({
        id: writeResult.lastInsertRowid,
        changes: writeResult.changes,
        title: 'aula criada',
      });
    },

    getCourses: (req, res) => {
      const courses = this.query.selectCourses();
      if (courses.length === 0) {
        throw new RouteError(404, 'nenhum curso encontrado');
      }
      res.status(200).json(courses);
    },

    getLessons: (req, res) => {
      const lessons = this.query.selectAllLessons();
      if (lessons.length === 0) {
        throw new RouteError(404, 'nenhuma aula encontrada');
      }
      res.status(200).json(lessons);
    },

    getCourse: (req, res) => {
      const { slug } = req.params;
      const course = this.query.selectCourse(slug);
      const lessons = this.query.selectLessons(slug);
      if (!course) {
        throw new RouteError(404, 'curso não encontrado');
      }
      let completed: {
        lesson_id: number;
        completed: string;
      }[] = [];
      if (req.session) {
        completed = this.query.selectLessonsCompleted(
          req.session.user_id,
          course.id,
        );
      }
      res.status(200).json({ course, lessons, completed });
    },

    getLesson: (req, res) => {
      const { courseSlug, lessonSlug } = req.params;
      const lesson = this.query.selectLesson(courseSlug, lessonSlug);
      const nav = this.query.selectLessonNav(courseSlug, lessonSlug);
      if (!lesson) {
        throw new RouteError(404, 'aula não encontrada');
      }
      const i = nav.findIndex((l) => l.slug === lesson.slug);
      const prev = i === 0 ? null : nav.at(i - 1)?.slug;
      const next = nav.at(i + 1)?.slug ?? null;

      let completed = '';
      if (req.session) {
        const lessonCompleted = this.query.selectLessonCompleted(
          req.session.user_id,
          lesson.id,
        );
        if (lessonCompleted) completed = lessonCompleted.completed;
      }

      res.status(200).json({ ...lesson, prev, next, completed });
    },

    completeLesson: (req, res) => {
      if (!req.session) {
        throw new RouteError(401, 'não autorizado');
      }
      const { courseId, lessonId } = {
        courseId: v.number(req.body.courseId),
        lessonId: v.number(req.body.lessonId),
      };
      const writeResult = this.query.insertLessonCompleted(
        req.session.user_id,
        courseId,
        lessonId,
      );
      if (writeResult.changes === 0) {
        throw new RouteError(400, 'erro ao completar aula');
      }

      const progress = this.query.selectProgress(req.session.user_id, courseId);
      const incompleteLessons = progress.filter((item) => !item.completed);
      if (progress.length > 0 && incompleteLessons.length === 0) {
        const certificate = this.query.insertCertificate(
          req.session.user_id,
          courseId,
        );
        if (!certificate) {
          throw new RouteError(400, 'erro ao gerar certificado');
        }

        res.status(201).json({
          certificate: certificate.id,
          title: 'aula concluída',
        });
        return;
      }

      res.status(201).json({
        certificate: null,
        title: 'aula concluída',
      });
    },

    resetCourse: (req, res) => {
      if (!req.session) {
        throw new RouteError(401, 'não autorizado');
      }
      const { courseId } = {
        courseId: v.number(req.body.courseId),
      };
      const writeResultLessons = this.query.deleteLessonsCompleted(
        req.session.user_id,
        courseId,
      );
      if (writeResultLessons.changes === 0) {
        throw new RouteError(400, 'erro ao resetar curso');
      }
      const writeResultCertificate = this.query.deleteCertificate(
        req.session.user_id,
        courseId,
      );
      if (writeResultCertificate.changes === 0) {
        throw new RouteError(400, 'erro ao deletar certificado');
      }
      res.status(200).json({
        title: 'curso resetado',
      });
    },

    getCertificates: (req, res) => {
      if (!req.session) {
        throw new RouteError(401, 'não autorizado');
      }
      const certificates = this.query.selectCertificates(req.session.user_id);
      res.status(200).json(certificates);
    },

    getCertificate: (req, res) => {
      const { id } = req.params;
      const certificate = this.query.selectCertificate(id);
      if (!certificate) {
        throw new RouteError(400, 'certificado não encontrado');
      }
      const pdf = generateCertificate(certificate);
      res.setHeader('Content-Type', 'application/pdf');
      res.status(200).end(pdf);
    },
  } satisfies Api['handlers'];
  tables(): void {
    this.db.exec(lmsTables);
  }
  routes(): void {
    this.router.post('/lms/course', this.handlers.postCourse, [
      this.auth.guard('admin'),
    ]);
    this.router.post('/lms/lesson', this.handlers.postLesson, [
      this.auth.guard('admin'),
    ]);
    this.router.get('/lms/courses', this.handlers.getCourses);
    this.router.get('/lms/lessons', this.handlers.getLessons, [
      this.auth.guard('admin'),
    ]);
    this.router.get('/lms/course/:slug', this.handlers.getCourse, [
      this.auth.optional,
    ]);
    this.router.get(
      '/lms/lesson/:courseSlug/:lessonSlug',
      this.handlers.getLesson,
      [this.auth.optional],
    );
    this.router.post('/lms/lesson/complete', this.handlers.completeLesson, [
      this.auth.guard('user'),
    ]);
    this.router.delete('/lms/course/reset', this.handlers.resetCourse, [
      this.auth.guard('user'),
    ]);
    this.router.get('/lms/certificates', this.handlers.getCertificates, [
      this.auth.guard('user'),
    ]);
    this.router.get('/lms/certificate/:id', this.handlers.getCertificate);
  }
}
