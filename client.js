console.clear();
const base = 'http://localhost:3000';

const users = [
  { name: 'Henrique Barros', email: 'henrique.barros@exemplo.com' },
  { name: 'Carlos Souza', email: 'carlos_souza@exemplo.com' },
  { name: 'Márcia Martins', email: 'marcia_martins73@exemplo.com' },
  { name: 'Maria Júlia Franco', email: 'mariajulia_franco23@exemplo.com' },
  { name: 'Maitê Reis', email: 'maite.reis@exemplo.com' },
  { name: 'Maria Franco', email: 'maria_franco@exemplo.com' },
  { name: 'Alexandre Batista', email: 'alexandre.batista36@exemplo.com' },
  { name: 'Eduarda Carvalho', email: 'eduarda.carvalho52@exemplo.com' },
  { name: 'Ricardo Carvalho', email: 'ricardo.carvalho78@exemplo.com' },
  { name: 'Ana Júlia Reis', email: 'anajulia_reis81@exemplo.com' },
  { name: 'Rebeca Martins', email: 'rebeca.martins29@exemplo.com' },
  { name: 'Maria Helena Martins', email: 'mariahelena_martins@exemplo.com' },
  { name: 'Mércia Pereira', email: 'mercia_pereira@exemplo.com' },
  { name: 'João Pedro Barros', email: 'joaopedro.barros38@exemplo.com' },
  { name: 'Deneval Reis', email: 'deneval.reis@exemplo.com' },
  { name: 'Pablo Xavier', email: 'pablo.xavier@exemplo.com' },
  { name: 'Nataniel Silva', email: 'nataniel_silva@exemplo.com' },
  { name: 'Yango Xavier', email: 'yango.xavier37@exemplo.com' },
  { name: 'Eduardo Batista', email: 'eduardo.batista91@exemplo.com' },
  { name: 'Emanuel Santos', email: 'emanuel.santos66@exemplo.com' },
];

const courses = {
  html: {
    slug: 'html-e-css',
    title: 'HTML e CSS',
    description: 'Curso de HTML e CSS para Iniciantes',
    lessons: 40,
    hours: 10,
  },
  javascript: {
    slug: 'javascript-completo',
    title: 'JavaScript Completo',
    description: 'Curso completo de JavaScript',
    lessons: 80,
    hours: 20,
  },
};

const lessons = [
  {
    courseSlug: 'html-e-css',
    slug: 'tags-basicas',
    title: 'Tags Básicas',
    seconds: 200,
    video: '/html/tags-basicas.mp4',
    description: 'Aula sobre as Tags Básicas',
    order: 1,
    free: 1,
  },
  {
    courseSlug: 'html-e-css',
    slug: 'estrutura-do-documento',
    title: 'Estrutura do Documento',
    seconds: 420,
    video: '/html/estrutura-do-documento.mp4',
    description: 'Estrutura básica: <!DOCTYPE>, <html>, <head> e <body>.',
    order: 2,
    free: 1,
  },
  {
    courseSlug: 'html-e-css',
    slug: 'links-e-imagens',
    title: 'Links e Imagens',
    seconds: 540,
    video: '/html/links-e-imagens.mp4',
    description: 'Como usar <a> e <img>, caminhos relativos e absolutos.',
    order: 3,
    free: 0,
  },
  {
    courseSlug: 'html-e-css',
    slug: 'listas-e-tabelas',
    title: 'Listas e Tabelas',
    seconds: 600,
    video: '/html/listas-e-tabelas.mp4',
    description:
      'Listas ordenadas/não ordenadas e estrutura básica de tabelas.',
    order: 4,
    free: 0,
  },
  {
    courseSlug: 'html-e-css',
    slug: 'formularios-basicos',
    title: 'Formulários Básicos',
    seconds: 780,
    video: '/html/formularios-basicos.mp4',
    description: 'Inputs, labels, selects e boas práticas de acessibilidade.',
    order: 5,
    free: 0,
  },
  {
    courseSlug: 'html-e-css',
    slug: 'semantica-e-acessibilidade',
    title: 'Semântica e Acessibilidade',
    seconds: 660,
    video: '/html/semantica-e-acessibilidade.mp4',
    description: 'Tags semânticas e acessibilidade para iniciantes.',
    order: 6,
    free: 0,
  },

  // JavaScript
  {
    courseSlug: 'javascript-completo',
    slug: 'introducao-e-variaveis',
    title: 'Introdução e Variáveis',
    seconds: 480,
    video: '/javascript/introducao-e-variaveis.mp4',
    description: 'Como o JS funciona, let/const e escopo.',
    order: 1,
    free: 1,
  },
  {
    courseSlug: 'javascript-completo',
    slug: 'tipos-e-operadores',
    title: 'Tipos e Operadores',
    seconds: 540,
    video: '/javascript/tipos-e-operadores.mp4',
    description: 'Tipos primitivos, objetos e operadores comuns.',
    order: 2,
    free: 1,
  },
  {
    courseSlug: 'javascript-completo',
    slug: 'funcoes-basico',
    title: 'Funções (Básico)',
    seconds: 600,
    video: '/javascript/funcoes-basico.mp4',
    description: 'Declaração, expressão, parâmetros e retorno.',
    order: 3,
    free: 0,
  },
  {
    courseSlug: 'javascript-completo',
    slug: 'manipulando-o-dom',
    title: 'Manipulando o DOM',
    seconds: 660,
    video: '/javascript/manipulando-o-dom.mp4',
    description: 'Selecionar, criar e alterar elementos com JS.',
    order: 4,
    free: 0,
  },
  {
    courseSlug: 'javascript-completo',
    slug: 'eventos-no-navegador',
    title: 'Eventos no Navegador',
    seconds: 600,
    video: '/javascript/eventos-no-navegador.mp4',
    description: 'addEventListener, propagação e preventDefault.',
    order: 5,
    free: 0,
  },
  {
    courseSlug: 'javascript-completo',
    slug: 'fetch-e-async-await',
    title: 'Fetch e Async/Await',
    seconds: 720,
    video: '/javascript/fetch-e-async-await.mp4',
    description: 'Requisições HTTP, Promises e fluxo assíncrono.',
    order: 6,
    free: 0,
  },
];

const functions = {
  async postCourse() {
    const response = await fetch(base + '/lms/course', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courses.javascript),
    });
    const body = await response.json();
    console.table(body);
  },

  async postLesson(lesson) {
    const response = await fetch(base + '/lms/lesson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lesson),
    });
    const body = await response.json();
    console.table(body);
  },

  async getCourses() {
    const response = await fetch(base + '/lms/courses');
    const body = await response.json();
    console.log(body);
  },

  async getCourse() {
    const response = await fetch(base + '/lms/course/html-e-css');
    const body = await response.json();
    console.log(body);
  },

  async getLesson() {
    const response = await fetch(
      base + '/lms/lesson/html-e-css/estrutura-do-documento',
    );
    const body = await response.json();
    console.log(body);
  },

  async postUser(user) {
    const response = await fetch(base + '/auth/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });
    const body = await response.json();
    console.table(body);
  },

  async completeLesson() {
    const response = await fetch(base + '/lms/lesson/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courseId: process.argv[3],
        lessonId: process.argv[4],
      }),
    });
    const body = await response.json();
    console.log(body);
  },

  async resetCourse() {
    const response = await fetch(base + '/lms/course/reset', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        courseId: 1,
      }),
    });
    const body = await response.json();
    console.table(body);
  },

  async getCertificates() {
    const response = await fetch(base + '/lms/certificates');
    const body = await response.json();
    console.log(body);
  },

  async getCertificate() {
    const response = await fetch(base + '/lms/certificate/' + process.argv[3]);
    const body = await response.json();
    console.log(body);
  },

  async postBig() {
    const response = await fetch(base + '/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        big: 'a'.repeat(6_000_000),
      },
      body: JSON.stringify('a'.repeat(6_000_000)),
    });
    const body = await response.json('');
    console.log(body);
  },

  async ataque() {
    for (let i = 0; i < 10; i++) {
      fetch(base + '/limite');
    }
  },
};

// for (const lesson of lessons) {
//   await functions.postLesson(lesson);
// }

for (const user of users) {
  const obj = {
    name: user.name,
    username: user.email,
    email: user.email,
    password: user.email + 'A1',
  };
  await functions.postUser(obj);
  await new Promise((r) => setTimeout(r, 1000));
}

if (process.argv[2]) {
  functions[process.argv[2]]();
}
