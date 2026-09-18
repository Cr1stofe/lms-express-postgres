import { prisma } from '../../../core/prisma.ts';
import { RouteError } from '../../../core/utils/route-error.ts';
import { generateCertificate } from '../utils/certificate.ts';

export interface CreateCourseInput {
  slug: string;
  title: string;
  description: string;
  lessons: number;
  hours: number;
}

export interface CreateLessonInput {
  courseSlug: string;
  slug: string;
  title: string;
  seconds: number;
  video: string;
  description: string;
  order: number;
  free: number;
}

export class LmsService {
  async upsertCourse(data: CreateCourseInput) {
    const course = await prisma.course.upsert({
      where: { slug: data.slug },
      update: {
        title: data.title,
        description: data.description,
        lessons: data.lessons,
        hours: data.hours,
      },
      create: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        lessons: data.lessons,
        hours: data.hours,
      },
    });

    return {
      id: course.id,
      changes: 1,
      title: 'curso criado',
    };
  }

  async listCourses() {
    const courses = await prisma.course.findMany({
      orderBy: { created: 'asc' },
      take: 100,
    });

    if (courses.length === 0) {
      throw new RouteError(404, 'nenhum curso encontrado');
    }

    return courses.map((c) => ({
      ...c,
      created: c.created.toISOString().replace('T', ' ').substring(0, 19),
    }));
  }

  async getCourseBySlug(slug: string, userId?: number) {
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

    if (userId) {
      const completedRecords = await prisma.lessonCompleted.findMany({
        where: {
          userId,
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

    return {
      course: formattedCourse,
      lessons: formattedLessons,
      completed,
    };
  }

  async upsertLesson(data: CreateLessonInput) {
    const course = await prisma.course.findUnique({
      where: { slug: data.courseSlug },
    });

    if (!course) {
      throw new RouteError(404, 'curso não encontrado');
    }

    const lesson = await prisma.lesson.upsert({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: data.slug,
        },
      },
      update: {
        title: data.title,
        seconds: data.seconds,
        video: data.video,
        description: data.description,
        order: data.order,
        free: data.free === 1,
      },
      create: {
        courseId: course.id,
        slug: data.slug,
        title: data.title,
        seconds: data.seconds,
        video: data.video,
        description: data.description,
        order: data.order,
        free: data.free === 1,
      },
    });

    return {
      id: lesson.id,
      changes: 1,
      title: 'aula criada',
    };
  }

  async listAllLessons() {
    const lessons = await prisma.lesson.findMany({
      include: {
        course: { select: { slug: true } },
      },
      orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
      take: 200,
    });

    if (lessons.length === 0) {
      throw new RouteError(404, 'nenhuma aula encontrada');
    }

    return lessons.map((l) => ({
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
    }));
  }

  async getLessonWithNavigation(courseSlug: string, lessonSlug: string, userId?: number) {
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
    if (userId) {
      const completedRecord = await prisma.lessonCompleted.findUnique({
        where: {
          userId_courseId_lessonId: {
            userId,
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

    return {
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
    };
  }

  async completeLesson(courseId: number, lessonId: number, userId: number) {
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

      return {
        certificate: certificate.id,
        title: 'aula concluída',
      };
    }

    return {
      certificate: null,
      title: 'aula concluída',
    };
  }

  async resetCourseProgress(courseId: number, userId: number) {
    await Promise.all([
      prisma.lessonCompleted.deleteMany({
        where: { userId, courseId },
      }),
      prisma.certificate.deleteMany({
        where: { userId, courseId },
      }),
    ]);

    return {
      title: 'curso resetado',
    };
  }

  async listUserCertificates(userId: number) {
    const certificates = await prisma.certificate.findMany({
      where: { userId },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true, hours: true, lessons: true } },
      },
      orderBy: { completed: 'desc' },
    });

    return certificates.map((cert) => ({
      id: cert.id,
      user_id: cert.userId,
      name: cert.user.name,
      course_id: cert.courseId,
      title: cert.course.title,
      hours: cert.course.hours,
      lessons: cert.course.lessons,
      completed: cert.completed.toISOString().replace('T', ' ').substring(0, 19),
    }));
  }

  async getCertificatePdf(id: string) {
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

    return generateCertificate({
      id: cert.id,
      name: cert.user.name,
      title: cert.course.title,
      hours: cert.course.hours,
      lessons: cert.course.lessons,
      completed: cert.completed.toISOString().replace('T', ' ').substring(0, 19),
    });
  }
}
