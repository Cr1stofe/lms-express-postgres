import { Role } from '@prisma/client';
import { prisma } from '../core/prisma.ts';
import { Password } from '../api/auth/utils/password.ts';
import { PEPPER } from '../env.ts';

const pass = new Password(PEPPER);
const DEFAULT_PASSWORD = 'P@ssw0rd123';
const DEFAULT_PASSWORD_HASH = await pass.hash(DEFAULT_PASSWORD);

const coursesData = [
  {
    title: 'HTML e CSS para Iniciantes',
    slug: 'html-e-css-para-iniciantes',
    description: 'Aprenda os fundamentos da web: marcação semântica, estilização moderna e acessibilidade.',
    hours: 8,
    lessonsCount: 6,
    lessons: [
      {
        title: 'Tags Básicas',
        slug: 'tags-basicas',
        description: 'Conheça as principais tags para estruturar parágrafos, cabeçalhos e seções.',
        seconds: 220,
        video: '/files/public/video-1760145284621.mp4',
        order: 1,
        free: true,
      },
      {
        title: 'Estrutura do Documento',
        slug: 'estrutura-do-documento',
        description: 'Entenda a anatomia de um documento: <!DOCTYPE>, <html>, <head> e <body>.',
        seconds: 420,
        video: '/files/private/video-1760145331254.mp4',
        order: 2,
        free: false,
      },
      {
        title: 'Links e Imagens',
        slug: 'links-e-imagens',
        description: 'Como usar as tags <a> e <img>, caminhos relativos e absolutos.',
        seconds: 540,
        video: '/html/links-e-imagens.mp4',
        order: 3,
        free: false,
      },
      {
        title: 'Listas e Tabelas',
        slug: 'listas-e-tabelas',
        description: 'Criação de listas ordenadas/não ordenadas e estrutura básica de tabelas.',
        seconds: 600,
        video: '/html/listas-e-tabelas.mp4',
        order: 4,
        free: false,
      },
      {
        title: 'Formulários Básicos',
        slug: 'formularios-basicos',
        description: 'Inputs, labels, selects, botões e boas práticas de acessibilidade.',
        seconds: 780,
        video: '/html/formularios-basicos.mp4',
        order: 5,
        free: false,
      },
      {
        title: 'Semântica e Acessibilidade',
        slug: 'semantica-e-acessibilidade',
        description: 'Uso de tags semânticas (<main>, <article>, <aside>) e acessibilidade web.',
        seconds: 660,
        video: '/html/semantica-e-acessibilidade.mp4',
        order: 6,
        free: false,
      },
    ],
  },
  {
    title: 'JavaScript para Iniciantes',
    slug: 'javascript-para-iniciantes',
    description: 'Domine a linguagem de programação da web: variáveis, funções, DOM e requisições assíncronas.',
    hours: 12,
    lessonsCount: 6,
    lessons: [
      {
        title: 'Introdução e Variáveis',
        slug: 'introducao-e-variaveis',
        description: 'Como o JavaScript funciona, declaração com let/const e escopo.',
        seconds: 480,
        video: '/javascript/introducao-e-variaveis.mp4',
        order: 1,
        free: true,
      },
      {
        title: 'Tipos e Operadores',
        slug: 'tipos-e-operadores',
        description: 'Tipos primitivos, objetos, arrays e operadores lógicos/aritméticos.',
        seconds: 540,
        video: '/javascript/tipos-e-operadores.mp4',
        order: 2,
        free: true,
      },
      {
        title: 'Funções (Básico)',
        slug: 'funcoes-basico',
        description: 'Declaração, arrow functions, parâmetros, argumentos e retorno.',
        seconds: 600,
        video: '/javascript/funcoes-basico.mp4',
        order: 3,
        free: false,
      },
      {
        title: 'Manipulando o DOM',
        slug: 'manipulando-o-dom',
        description: 'Como selecionar, criar, alterar e remover elementos HTML via JavaScript.',
        seconds: 660,
        video: '/javascript/manipulando-o-dom.mp4',
        order: 4,
        free: false,
      },
      {
        title: 'Eventos no Navegador',
        slug: 'eventos-no-navegador',
        description: 'Trabalhando com addEventListener, propagação e preventDefault.',
        seconds: 600,
        video: '/javascript/eventos-no-navegador.mp4',
        order: 5,
        free: false,
      },
      {
        title: 'Fetch e Async/Await',
        slug: 'fetch-e-async-await',
        description: 'Consumindo APIs REST, tratamento de Promises e fluxo assíncrono.',
        seconds: 720,
        video: '/javascript/fetch-e-async-await.mp4',
        order: 6,
        free: false,
      },
    ],
  },
  {
    title: 'PostgreSQL & Banco de Dados',
    slug: 'postgresql-banco-de-dados',
    description: 'Modelagem relacional, índices, relacionamentos, constraints e Prisma ORM.',
    hours: 10,
    lessonsCount: 4,
    lessons: [
      {
        title: 'Introdução ao PostgreSQL e Docker',
        slug: 'introducao-postgres-docker',
        description: 'Conceitos de banco cliente-servidor, imagens Docker e volumes.',
        seconds: 500,
        video: '/postgres/introducao.mp4',
        order: 1,
        free: true,
      },
      {
        title: 'Modelagem com Prisma ORM',
        slug: 'modelagem-prisma-orm',
        description: 'Definição de models, enums, atributos @id, @map e @@index.',
        seconds: 650,
        video: '/postgres/modelagem.mp4',
        order: 2,
        free: false,
      },
      {
        title: 'Relacionamentos e Foreign Keys',
        slug: 'relacionamentos-foreign-keys',
        description: 'Relações 1:N, N:M, onDelete Cascade e integridade referencial.',
        seconds: 700,
        video: '/postgres/relacionamentos.mp4',
        order: 3,
        free: false,
      },
      {
        title: 'Migrations e Queries Tipadas',
        slug: 'migrations-queries-tipadas',
        description: 'Ciclo de vida de migrations e operações de CRUD no Prisma Client.',
        seconds: 800,
        video: '/postgres/migrations.mp4',
        order: 4,
        free: false,
      },
    ],
  },
];

const usersData = [
  {
    name: 'Super Administrador',
    username: 'admin',
    email: 'admin@lms.com',
    role: Role.ADMIN,
  },
  {
    name: 'Editor de Conteúdo',
    username: 'editor',
    email: 'editor@lms.com',
    role: Role.EDITOR,
  },
  {
    name: 'Henrique Barros',
    username: 'henrique.barros@exemplo.com',
    email: 'henrique.barros@exemplo.com',
    role: Role.USER,
  },
  {
    name: 'Carlos Souza',
    username: 'carlos_souza@exemplo.com',
    email: 'carlos_souza@exemplo.com',
    role: Role.USER,
  },
  {
    name: 'Márcia Martins',
    username: 'marcia_martins73@exemplo.com',
    email: 'marcia_martins73@exemplo.com',
    role: Role.USER,
  },
  {
    name: 'Maria Júlia Franco',
    username: 'mariajulia_franco23@exemplo.com',
    email: 'mariajulia_franco23@exemplo.com',
    role: Role.USER,
  },
];

async function main() {
  console.log('🌱 Iniciando Seed autônomo no PostgreSQL...');

  // 1. Criando ou atualizando Cursos e suas Aulas
  console.log(`📚 Semeando ${coursesData.length} cursos e suas respectivas aulas...`);
  for (const courseItem of coursesData) {
    const { lessons, lessonsCount, ...courseFields } = courseItem;

    const course = await prisma.course.upsert({
      where: { slug: courseFields.slug },
      update: {
        title: courseFields.title,
        description: courseFields.description,
        hours: courseFields.hours,
        lessons: lessonsCount,
      },
      create: {
        title: courseFields.title,
        slug: courseFields.slug,
        description: courseFields.description,
        hours: courseFields.hours,
        lessons: lessonsCount,
      },
    });

    for (const lessonItem of lessons) {
      await prisma.lesson.upsert({
        where: {
          courseId_slug: {
            courseId: course.id,
            slug: lessonItem.slug,
          },
        },
        update: {
          title: lessonItem.title,
          seconds: lessonItem.seconds,
          video: lessonItem.video,
          description: lessonItem.description,
          order: lessonItem.order,
          free: lessonItem.free,
        },
        create: {
          courseId: course.id,
          title: lessonItem.title,
          slug: lessonItem.slug,
          description: lessonItem.description,
          seconds: lessonItem.seconds,
          video: lessonItem.video,
          order: lessonItem.order,
          free: lessonItem.free,
        },
      });
    }
  }

  // 2. Criando Usuários
  console.log(`👤 Semeando ${usersData.length} usuários (Admin, Editor e Alunos)...`);
  for (const userItem of usersData) {
    await prisma.user.upsert({
      where: { email: userItem.email },
      update: {
        name: userItem.name,
        username: userItem.username,
        role: userItem.role,
        passwordHash: DEFAULT_PASSWORD_HASH,
      },
      create: {
        name: userItem.name,
        username: userItem.username,
        email: userItem.email,
        role: userItem.role,
        passwordHash: DEFAULT_PASSWORD_HASH,
      },
    });
  }

  console.log('✅ Seed autônomo executado com sucesso!');
  console.log('🔑 Credenciais padrão criadas (senha: "P@ssw0rd"):');
  console.log('   - Admin: admin@lms.com');
  console.log('   - Editor: editor@lms.com');
  console.log('   - Aluno: henrique.barros@exemplo.com');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
