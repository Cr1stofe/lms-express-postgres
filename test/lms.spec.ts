import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../app.ts';
import { prisma } from '../core/prisma.ts';

const request = supertest(app);

describe('Suíte de Testes: Cursos, Aulas, Admin e Certificados (/lms)', () => {
  const studentUser = {
    name: 'Aluno LMS Vitest',
    username: 'alunolmsvitest',
    email: 'alunolmsvitest@exemplo.com',
    password: 'P@ssw0rd123',
  };

  const adminUser = {
    email: 'admin@lms.com',
    password: 'P@ssw0rd123',
  };

  let studentCookie: string;
  let adminCookie: string;
  let testCourseSlug: string;
  let testCourseId: number;
  let testLessonId: number;
  let testLessonSlug: string;
  let createdCertificateId: string;

  beforeAll(async () => {
    const firstCourse = await prisma.course.findFirst({
      include: { lessonsList: { orderBy: { order: 'asc' } } },
    });

    if (firstCourse && firstCourse.lessonsList.length > 0) {
      testCourseSlug = firstCourse.slug;
      testCourseId = firstCourse.id;
      testLessonId = firstCourse.lessonsList[0].id;
      testLessonSlug = firstCourse.lessonsList[0].slug;
    }

    const adminLoginRes = await request.post('/auth/login').send(adminUser);
    adminCookie = adminLoginRes.headers['set-cookie'][0];

    await prisma.user.deleteMany({ where: { email: studentUser.email } });
    await request.post('/auth/user').send(studentUser);

    const loginRes = await request.post('/auth/login').send({
      email: studentUser.email,
      password: studentUser.password,
    });

    studentCookie = loginRes.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: studentUser.email } });
  });

  it('1. Deve listar todos os cursos disponíveis (200)', async () => {
    const res = await request.get('/lms/courses');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('slug');
    expect(res.body[0]).toHaveProperty('title');
  });

  it('2. Deve obter os detalhes de um curso específico pelo slug (200)', async () => {
    const res = await request.get(`/lms/course/${testCourseSlug}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('course');
    expect(res.body).toHaveProperty('lessons');
    expect(res.body.course.slug).toBe(testCourseSlug);
    expect(Array.isArray(res.body.lessons)).toBe(true);
  });

  it('3. Deve retornar 404 para curso inexistente', async () => {
    const res = await request.get('/lms/course/slug-que-nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.title).toBe('curso não encontrado');
  });

  it('4. Deve obter uma aula com navegação e status (200)', async () => {
    const res = await request.get(
      `/lms/lesson/${testCourseSlug}/${testLessonSlug}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(testLessonSlug);
    expect(res.body).toHaveProperty('video');
    expect(res.body).toHaveProperty('seconds');
  });

  it('5. Deve permitir que o Admin crie/atualize um curso (201)', async () => {
    const res = await request
      .post('/lms/course')
      .set('Cookie', adminCookie)
      .send({
        slug: 'curso-teste-admin',
        title: 'Curso Teste Admin',
        description: 'Descrição do curso de teste automatizado',
        lessons: 1,
        hours: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('curso criado');
  });

  it('6. Deve permitir que o Admin crie uma aula no novo curso (201)', async () => {
    const res = await request
      .post('/lms/lesson')
      .set('Cookie', adminCookie)
      .send({
        courseSlug: 'curso-teste-admin',
        slug: 'aula-unica-admin',
        title: 'Aula Única do Curso',
        seconds: 300,
        video: '/videos/aula.mp4',
        description: 'Descrição da aula',
        order: 1,
        free: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('aula criada');
  });

  it('7. Deve listar todas as aulas do sistema no painel do Admin (200)', async () => {
    const res = await request.get('/lms/lessons').set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('8. Deve concluir aula e emitir certificado automaticamente ao finalizar o curso (201)', async () => {
    const newCourse = await prisma.course.findUnique({
      where: { slug: 'curso-teste-admin' },
      include: { lessonsList: true },
    });

    const res = await request
      .post('/lms/lesson/complete')
      .set('Cookie', studentCookie)
      .send({
        courseId: newCourse!.id,
        lessonId: newCourse!.lessonsList[0].id,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('aula concluída');
    expect(res.body.certificate).toBeDefined();

    createdCertificateId = res.body.certificate;
  });

  it('9. Deve listar os certificados do aluno autenticado (200)', async () => {
    const res = await request
      .get('/lms/certificates')
      .set('Cookie', studentCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('title');
  });

  it('10. Deve fazer o download do PDF do certificado emitido (200)', async () => {
    const res = await request.get(`/lms/certificate/${createdCertificateId}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body).toBeDefined();
  });

  it('11. Deve resetar o progresso do aluno no curso (200)', async () => {
    const res = await request
      .delete('/lms/course/reset')
      .set('Cookie', studentCookie)
      .send({
        courseId: testCourseId,
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('curso resetado');
  });
});
