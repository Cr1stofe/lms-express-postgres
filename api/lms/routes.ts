import { Router, type Request, type Response } from 'express';
import { prisma } from '../../core/prisma.ts';
import { RouteError } from '../../core/utils/route-error.ts';
import {
  courseUpsertSchema,
  lessonUpsertSchema,
  completeLessonSchema,
  resetCourseSchema,
  slugSchema,
} from '../../core/utils/validate.ts';
import { AuthMiddleware } from '../auth/middleware/auth.ts';
import { generateCertificate } from './utils/certificate.ts';

export const lmsRouter = Router();

const auth = new AuthMiddleware();

// POST /lms/course - Criar/Atualizar Curso (Admin)
lmsRouter.post(
  '/course',
  auth.guard('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { slug, title, description, lessons, hours } = courseUpsertSchema.parse(req.body);

      const course = await prisma.course.upsert({
        where: { slug },
        update: {
          title,
          description,
          lessons,
          hours,
        },
        create: {
          slug,
          title,
          description,
          lessons,
          hours,
        },
      });

      res.status(201).json({
        id: course.id,
        changes: 1,
        title: 'curso criado',
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /lms/lesson - Criar/Atualizar Aula (Admin)
lmsRouter.post(
  '/lesson',
  auth.guard('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const {
        courseSlug,
        slug,
        title,
        seconds,
        video,
        description,
        order,
        free,
      } = lessonUpsertSchema.parse(req.body);

      const course = await prisma.course.findUnique({
        where: { slug: courseSlug },
      });

      if (!course) {
        throw new RouteError(404, 'curso não encontrado');
      }

      const lesson = await prisma.lesson.upsert({
        where: {
          courseId_slug: {
            courseId: course.id,
            slug,
          },
        },
        update: {
          title,
          seconds,
          video,
          description,
          order,
          free: free === 1,
        },
        create: {
          courseId: course.id,
          slug,
          title,
          seconds,
          video,
          description,
          order,
          free: free === 1,
        },
      });

      res.status(201).json({
        id: lesson.id,
        changes: 1,
        title: 'aula criada',
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /lms/courses - Listar Cursos
lmsRouter.get('/courses', async (_req: Request, res: Response, next) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { created: 'asc' },
      take: 100,
    });

    if (courses.length === 0) {
      throw new RouteError(404, 'nenhum curso encontrado');
    }

    res.status(200).json(
      courses.map((c) => ({
        ...c,
        created: c.created.toISOString().replace('T', ' ').substring(0, 19),
      })),
    );
  } catch (err) {
    next(err);
  }
});

// GET /lms/lessons - Listar Todas as Aulas (Admin)
lmsRouter.get(
  '/lessons',
  auth.guard('admin'),
  async (_req: Request, res: Response, next) => {
    try {
      const lessons = await prisma.lesson.findMany({
        include: {
          course: {
            select: { slug: true },
          },
        },
        orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
        take: 200,
      });

      if (lessons.length === 0) {
        throw new RouteError(404, 'nenhuma aula encontrada');
      }

      res.status(200).json(
        lessons.map((l) => ({
          id: l.id,
          course_id: l.courseId,
          slug: l.slug,
          title: l.title,
          seconds: l.seconds,
          video: l.video,
          description: l.description,
          order: l.order,
          free: l.free ? 1 : 0,
          created: l.created.toISOString().replace('T', ' ').substring(0, 19),
          courseSlug: l.course.slug,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// GET /lms/course/:slug - Obter Curso e Aulas (+ progresso do aluno)
lmsRouter.get(
  '/course/:slug',
  auth.optional,
  async (req: Request, res: Response, next) => {
    try {
      const slug = slugSchema.parse(req.params.slug);

      const course = await prisma.course.findUnique({
        where: { slug },
        include: {
          lessonsList: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!course) {
        throw new RouteError(404, 'curso não encontrado');
      }

      let completed: { lesson_id: number; completed: string }[] = [];

      if (req.session) {
        const completedRecords = await prisma.lessonCompleted.findMany({
          where: {
            userId: req.session.user_id,
            courseId: course.id,
          },
          select: {
            lessonId: true,
            completed: true,
          },
        });

        completed = completedRecords.map((r) => ({
          lesson_id: r.lessonId,
          completed: r.completed.toISOString().replace('T', ' ').substring(0, 19),
        }));
      }

      const formattedCourse = {
        id: course.id,
        slug: course.slug,
        title: course.title,
        description: course.description,
        lessons: course.lessons,
        hours: course.hours,
        created: course.created.toISOString().replace('T', ' ').substring(0, 19),
      };

      const formattedLessons = (course.lessonsList || []).map((l) => ({
        id: l.id,
        course_id: l.courseId,
        slug: l.slug,
        title: l.title,
        seconds: l.seconds,
        video: l.video,
        description: l.description,
        order: l.order,
        free: l.free ? 1 : 0,
        created: l.created.toISOString().replace('T', ' ').substring(0, 19),
      }));

      res.status(200).json({
        course: formattedCourse,
        lessons: formattedLessons,
        completed,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /lms/lesson/:courseSlug/:lessonSlug - Obter Aula e Navegação
lmsRouter.get(
  '/lesson/:courseSlug/:lessonSlug',
  auth.optional,
  async (req: Request, res: Response, next) => {
    try {
      const courseSlug = slugSchema.parse(req.params.courseSlug);
      const lessonSlug = slugSchema.parse(req.params.lessonSlug);

      const course = await prisma.course.findUnique({
        where: { slug: courseSlug },
      });

      if (!course) {
        throw new RouteError(404, 'curso não encontrado');
      }

      const allLessons = await prisma.lesson.findMany({
        where: { courseId: course.id },
        orderBy: { order: 'asc' },
      });

      const lessonIndex = allLessons.findIndex((l) => l.slug === lessonSlug);
      if (lessonIndex === -1) {
        throw new RouteError(404, 'aula não encontrada');
      }

      const currentLesson = allLessons[lessonIndex];
      const prev = lessonIndex === 0 ? null : allLessons[lessonIndex - 1]?.slug ?? null;
      const nextSlug = lessonIndex === allLessons.length - 1 ? null : allLessons[lessonIndex + 1]?.slug ?? null;

      let completed = '';
      if (req.session) {
        const completedRecord = await prisma.lessonCompleted.findUnique({
          where: {
            userId_courseId_lessonId: {
              userId: req.session.user_id,
              courseId: course.id,
              lessonId: currentLesson.id,
            },
          },
          select: { completed: true },
        });

        if (completedRecord) {
          completed = completedRecord.completed
            .toISOString()
            .replace('T', ' ')
            .substring(0, 19);
        }
      }

      res.status(200).json({
        id: currentLesson.id,
        course_id: currentLesson.courseId,
        slug: currentLesson.slug,
        title: currentLesson.title,
        seconds: currentLesson.seconds,
        video: currentLesson.video,
        description: currentLesson.description,
        order: currentLesson.order,
        free: currentLesson.free ? 1 : 0,
        created: currentLesson.created.toISOString().replace('T', ' ').substring(0, 19),
        prev,
        next: nextSlug,
        completed,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /lms/lesson/complete - Concluir Aula (+ Emissão de Certificado)
lmsRouter.post(
  '/lesson/complete',
  auth.guard('user'),
  async (req: Request, res: Response, next) => {
    try {
      const { courseId, lessonId } = completeLessonSchema.parse(req.body);

      const userId = req.session!.user_id;

      const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, courseId },
      });

      if (!lesson) {
        throw new RouteError(404, 'aula ou curso não encontrado');
      }

      await prisma.lessonCompleted.upsert({
        where: {
          userId_courseId_lessonId: {
            userId,
            courseId,
            lessonId,
          },
        },
        update: {},
        create: {
          userId,
          courseId,
          lessonId,
        },
      });

      const totalLessons = await prisma.lesson.count({
        where: { courseId },
      });

      const completedCount = await prisma.lessonCompleted.count({
        where: {
          userId,
          courseId,
        },
      });

      if (totalLessons > 0 && completedCount >= totalLessons) {
        const certificate = await prisma.certificate.upsert({
          where: {
            userId_courseId: {
              userId,
              courseId,
            },
          },
          update: {},
          create: {
            userId,
            courseId,
          },
        });

        return res.status(201).json({
          certificate: certificate.id,
          title: 'aula concluída',
        });
      }

      res.status(201).json({
        certificate: null,
        title: 'aula concluída',
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /lms/course/reset - Resetar Progresso do Curso
lmsRouter.delete(
  '/course/reset',
  auth.guard('user'),
  async (req: Request, res: Response, next) => {
    try {
      const { courseId } = resetCourseSchema.parse(req.body);

      const userId = req.session!.user_id;

      await Promise.all([
        prisma.lessonCompleted.deleteMany({
          where: { userId, courseId },
        }),
        prisma.certificate.deleteMany({
          where: { userId, courseId },
        }),
      ]);

      res.status(200).json({
        title: 'curso resetado',
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /lms/certificates - Listar Certificados do Aluno
lmsRouter.get(
  '/certificates',
  auth.guard('user'),
  async (req: Request, res: Response, next) => {
    try {
      const certificates = await prisma.certificate.findMany({
        where: { userId: req.session!.user_id },
        include: {
          user: { select: { name: true } },
          course: { select: { title: true, hours: true, lessons: true } },
        },
        orderBy: { completed: 'desc' },
      });

      res.status(200).json(
        certificates.map((cert) => ({
          id: cert.id,
          user_id: cert.userId,
          name: cert.user.name,
          course_id: cert.courseId,
          title: cert.course.title,
          hours: cert.course.hours,
          lessons: cert.course.lessons,
          completed: cert.completed.toISOString().replace('T', ' ').substring(0, 19),
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// GET /lms/certificate/:id - Baixar PDF do Certificado
lmsRouter.get('/certificate/:id', async (req: Request, res: Response, next) => {
  try {
    const id = String(req.params.id);

    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true, hours: true, lessons: true } },
      },
    });

    if (!cert || !cert.user || !cert.course) {
      throw new RouteError(400, 'certificado não encontrado');
    }

    const pdfBuffer = generateCertificate({
      id: cert.id,
      name: cert.user.name,
      title: cert.course.title,
      hours: cert.course.hours,
      lessons: cert.course.lessons,
      completed: cert.completed.toISOString().replace('T', ' ').substring(0, 19),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.status(200).end(pdfBuffer);
  } catch (err) {
    next(err);
  }
});
