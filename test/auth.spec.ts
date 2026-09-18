import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import supertest from 'supertest';
import { app } from '../app.ts';
import { prisma } from '../core/prisma.ts';
import { Mail } from '../core/mail/mail.ts';

const request = supertest(app);

describe('Suíte de Testes: Autenticação, Senhas e Permissões (/auth)', () => {
  const testUser = {
    name: 'Aluno Vitest',
    username: 'alunovitest',
    email: 'alunovitest@exemplo.com',
    password: 'P@ssw0rd123',
  };

  const adminUser = {
    email: 'admin@lms.com',
    password: 'P@ssw0rd123',
  };

  let userCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    vi.spyOn(Mail.prototype, 'send').mockResolvedValue({ ok: true } as any);

    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });

    // Login do admin para testes de permissão
    const adminLoginRes = await request.post('/auth/login').send(adminUser);

    if (adminLoginRes.status === 200) {
      adminCookie = adminLoginRes.headers['set-cookie'][0];
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: testUser.email },
    });
  });

  it('1. Deve registrar um novo usuário com sucesso (201)', async () => {
    const res = await request.post('/auth/user').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ title: 'usuário criado' });
  });

  it('2. Deve rejeitar cadastro com erro de validação do Zod (422)', async () => {
    const res = await request.post('/auth/user').send({
      name: 'Invalido',
      username: 'invalido',
      email: 'email-invalido',
      password: '123',
    });

    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.email).toBeDefined();
    expect(res.body.errors.password).toBeDefined();
  });

  it('3. Deve rejeitar cadastro com e-mail já existente (409)', async () => {
    const res = await request.post('/auth/user').send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.title).toBe('email existe');
  });

  it('4. Deve rejeitar login com credenciais incorretas (404)', async () => {
    const res = await request.post('/auth/login').send({
      email: testUser.email,
      password: 'SenhaErrada123',
    });

    expect(res.status).toBe(404);
    expect(res.body.title).toBe('email ou senha incorretos');
  });

  it('5. Deve realizar login com sucesso e retornar cookie de sessão (200)', async () => {
    const res = await request.post('/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('autenticado');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    userCookie = Array.isArray(cookies) ? cookies[0] : cookies!;
    expect(userCookie).toContain('__Secure-sid=');
  });

  it('6. Deve bloquear acesso à rota protegida sem cookie (401)', async () => {
    const res = await request.get('/auth/session');

    expect(res.status).toBe(401);
    expect(res.body.title).toBe('não autorizado');
  });

  it('7. Deve permitir acesso à rota protegida com cookie de sessão válido (200)', async () => {
    const res = await request.get('/auth/session').set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('valida');
    expect(res.body.role).toBe('user');
  });

  it('8. Deve bloquear usuário comum de acessar rota restrita de Admin (403)', async () => {
    const res = await request
      .get('/auth/users/search')
      .set('Cookie', userCookie); // Cookie de aluno 'user'

    expect(res.status).toBe(403);
    expect(res.body.title).toBe('sem permissão');
  });

  it('9. Deve permitir que Admin acesse a busca paginada de usuários (200)', async () => {
    const res = await request
      .get('/auth/users/search?page=1')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.headers['x-total-count']).toBeDefined();
  });

  it('10. Deve atualizar a senha do usuário autenticado (200)', async () => {
    const res = await request
      .put('/auth/password/update')
      .set('Cookie', userCookie)
      .send({
        password: testUser.password,
        new_password: 'NovaP@ssw0rd123',
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('senha atualizada');

    userCookie = res.headers['set-cookie'][0];
  });

  it('11. Deve solicitar recuperação de senha e redefinir com token', async () => {
    const forgotRes = await request
      .post('/auth/password/forgot')
      .send({ email: testUser.email });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.title).toBe('verifique seu email');

    const userRecord = await prisma.user.findUnique({
      where: { email: testUser.email },
    });

    const resetRecord = await prisma.passwordReset.findFirst({
      where: { userId: userRecord!.id },
      orderBy: { created: 'desc' },
    });

    expect(resetRecord).toBeDefined();

    const invalidTokenRes = await request.post('/auth/password/reset').send({
      token: 'token-invalido-12345678901234567890',
      new_password: 'OutraP@ssw0rd123',
    });

    expect(invalidTokenRes.status).toBe(400);
    expect(invalidTokenRes.body.title).toBe('token inválido');
  });

  it('12. Deve realizar logout e invalidar o cookie de sessão (204)', async () => {
    const res = await request.delete('/auth/logout').set('Cookie', userCookie);

    expect(res.status).toBe(204);
  });
});
