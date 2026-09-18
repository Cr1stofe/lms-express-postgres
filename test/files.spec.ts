import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../app.ts';

const request = supertest(app);

describe('Suíte de Testes: Arquivos e Healthcheck (/files e /health)', () => {
  let adminCookie: string;
  let userCookie: string;

  beforeAll(async () => {
    const adminRes = await request
      .post('/auth/login')
      .send({ email: 'admin@lms.com', password: 'P@ssw0rd123' });

    if (adminRes.headers['set-cookie']) {
      adminCookie = adminRes.headers['set-cookie'][0];
    }

    const userRes = await request
      .post('/auth/login')
      .send({ email: 'henrique.barros@exemplo.com', password: 'P@ssw0rd123' });

    if (userRes.headers['set-cookie']) {
      userCookie = userRes.headers['set-cookie'][0];
    }
  });

  it('1. Deve responder o healthcheck da API com status 200', async () => {
    const res = await request.get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('2. Deve retornar 404 para rota inexistente', async () => {
    const res = await request.get('/rota-que-nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.title).toBe('nao encontrada');
  });

  it('3. Deve proteger arquivo privado contra acesso anônimo (401)', async () => {
    const res = await request.get('/files/private/documento-secreto.pdf');

    expect(res.status).toBe(401);
    expect(res.body.title).toBe('não autorizado');
  });

  it('4. Deve permitir acesso ao arquivo privado para usuário autenticado (200 com X-Accel-Redirect)', async () => {
    const res = await request
      .get('/files/private/documento-secreto.pdf')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.headers['x-accel-redirect']).toBe('documento-secreto.pdf');
  });

  it('5. Deve rejeitar upload sem cabeçalho application/octet-stream (415)', async () => {
    const res = await request
      .post('/files/upload')
      .set('Cookie', adminCookie)
      .send({ data: 'invalido' });

    expect(res.status).toBe(415);
    expect(res.body.title).toBe('use octet-stream');
  });

  it('6. Deve rejeitar upload feito por usuário sem permissão de Admin (403)', async () => {
    const res = await request
      .post('/files/upload')
      .set('Cookie', userCookie)
      .set('Content-Type', 'application/octet-stream')
      .set('X-Filename', 'teste.png')
      .send(Buffer.from('conteudo teste'));

    expect(res.status).toBe(403);
    expect(res.body.title).toBe('sem permissão');
  });

  it('7. Deve rejeitar arquivo público inexistente com 404', async () => {
    const res = await request.get('/files/public/nao-existe.png');

    expect(res.status).toBe(404);
    expect(res.body.title).toBe('arquivo não encontrado');
  });
});
