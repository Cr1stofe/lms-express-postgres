const BASE = '/api';

const esc = (v) =>
  String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const secToMin = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
};

const routes = document.querySelectorAll('section[data-role]');

const navs = document.querySelectorAll('nav[data-role]');
function handleUserNav(user) {
  for (const nav of navs) {
    if (nav.dataset.role === user) {
      nav.classList.add('ativo');
    } else {
      nav.classList.remove('ativo');
    }
  }
}

let user;
async function getUser() {
  user = 'public';
  try {
    const response = await fetch(BASE + '/auth/session');
    const body = await response.json();
    if (!response.ok) throw new Error();
    user = body.role;
    return user;
  } catch (error) {
    return user;
  } finally {
    handleUserNav(user);
  }
}

async function router() {
  if (user === undefined) user = await getUser();
  const r = location.hash.replace('#', '').split('/').filter(Boolean).shift();
  const route = document.getElementById(r);
  routes.forEach((item) => item.classList.remove('ativo'));
  if (route) {
    if (user !== route.dataset.role) location.hash = '/login';
    route.classList.add('ativo');
    if (typeof data[r] === 'function') data[r](route);
  } else {
    if (typeof data[r] === 'function') data[r]();
  }
}
window.addEventListener('DOMContentLoaded', router);
window.addEventListener('hashchange', router);

async function getData(url, callback) {
  const response = await fetch(BASE + url);
  const body = await response.json();
  callback(body, response);
}

function renderResetCourseButton(courseId) {
  setTimeout(() => {
    sendForm('DELETE', '/lms/course/reset', 'resetar-curso', () => {
      location.reload();
    });
  }, 50);

  return /*html*/ `
          <div id="resetar-curso">
            <form>
              <input name="courseId" type="hidden" value="${esc(courseId)}">
              <button>Resetar</button>
            </form>
          </div>
        `;
}

function renderCompleteButton(courseId, lessonId) {
  setTimeout(() => {
    sendForm('POST', '/lms/lesson/complete', 'completar', () => {
      document.getElementById('completar').innerHTML = '<span></span>';
    });
  }, 50);

  return /*html*/ `
          <div id="completar">
            <form>
              <input name="courseId" type="hidden" value="${esc(courseId)}">
              <input name="lessonId" type="hidden" value="${esc(lessonId)}">
              <button>Completar</button>
            </form>
          </div>
        `;
}

const data = {
  cursos: (route) => {
    getData('/lms/courses', (courses) => {
      const render = route.querySelector('.render');
      render.innerHTML = '';
      let html = '';
      for (const course of courses) {
        html += /*html*/ `
                <div class="curso-item">
                  <h2>${esc(course.title)}</h2>
                  <p>${esc(course.description)}</p>
                  <span>Aulas: ${esc(course.lessons)}</span>
                  <span>Horas: ${esc(course.hours)}</span>
                  <a class="btn" href="#/curso/${esc(course.slug)}">
                    ${esc(course.title)}
                  </a>
                </div>
              `;
      }
      render.innerHTML = html;
    });
  },
  curso: (route) => {
    const [_, curso] = location.hash
      .replace('#', '')
      .split('/')
      .filter(Boolean);
    if (!curso) return;

    getData(`/lms/course/${curso}`, (data) => {
      const { course, lessons, completed } = data;
      const render = route.querySelector('.render');
      render.innerHTML = '';
      let html = /*html*/ `
            <div class="curso-item">
              <h2>${esc(course.title)}</h2>
              <p>${esc(course.description)}</p>
              <span>Aulas: ${esc(course.lessons)}</span>
              <span>Horas: ${esc(course.hours)}</span>
            </div>`;

      html += '<ul class="curso-aulas">';

      for (const lesson of lessons) {
        const isCompleted = completed.some((x) => x.lesson_id == lesson.id);

        html += /*html*/ `
              <li>
                <a href="#/aula/${esc(course.slug)}/${esc(lesson.slug)}">
                  ${esc(lesson.title)}
                  <span>
                    <span>${secToMin(lesson.seconds)}</span>
                    <span class="status ${
                      isCompleted ? 'completa' : ''
                    }"></span>
                  </span>
                </a>
              </li>
              `;
      }
      html += `</ul>
              ${completed.length > 0 ? renderResetCourseButton(course.id) : ''}
            `;
      render.innerHTML = html;
    });
  },
  aula: (route) => {
    const [_, curso, aula] = location.hash
      .replace('#', '')
      .split('/')
      .filter(Boolean);

    if (!curso || !aula) return;
    getData(`/lms/lesson/${curso}/${aula}`, (lesson) => {
      const render = route.querySelector('.render');
      render.innerHTML = '';
      let html = /*html*/ `
              <div>
                <h2>${esc(lesson.title)}</h2>
                <div id="breadcrumb">
                  <a href="#/cursos">cursos</a> >
                  <a href="#/curso/${curso}">${curso}</a>  
                </div>
                <div id="video">
                  <video poster=""preload="metadata" src="${
                    lesson.video
                  }" controls></video> 
                </div>
                <nav id="aula-nav">
                  ${
                    lesson.prev
                      ? `<a class="btn" href="${esc(
                          `#/aula/${curso}/${lesson.prev}`,
                        )}">Anterior</a>`
                      : `<span></span>`
                  }
                  ${
                    lesson.completed
                      ? `<span></span>`
                      : renderCompleteButton(lesson.course_id, lesson.id)
                  }
                  ${
                    lesson.next
                      ? `<a class="btn" href="${esc(
                          `#/aula/${curso}/${lesson.next}`,
                        )}">Próxima</a>`
                      : `<span></span>`
                  }
                </nav>
              </div>
            `;
      render.innerHTML = html;
    });
  },
  certificados: (route) => {
    getData('/lms/certificates', (certicates) => {
      if (!Array.isArray(certicates)) return;
      const render = route.querySelector('.render');
      render.innerHTML = '';
      let html = '<ul>';
      for (const certificate of certicates) {
        html += /*html*/ `
              <li>
                <a class="btn" target="_blank" href="/api/lms/certificate/${
                  certificate.id
                }">${esc(certificate.title)}
                <span>${certificate.completed
                  .slice(0, 10)
                  .split('-')
                  .reverse()
                  .join('/')}</span>
                </a>
              </li>
              `;
      }
      html += '</ul>';
      render.innerHTML = html;
    });
  },
  sair: async () => {
    await fetch(BASE + '/auth/logout', {
      method: 'DELETE',
    });
    user = 'public';
    location.hash = '/login';
    handleUserNav(user);
  },
  resetar: () => {
    const query = location.hash.split('=');
    if (query[1]) {
      const token = document.querySelector('input[name="token"]');
      if (token) token.value = query[1];
    }
  },
  ['criar-curso']: async (route) => {
    getData('/lms/courses', (courses) => {
      const render = route.querySelector('.render');
      const form = route.querySelector('form');
      render.innerHTML = '';
      const select = document.createElement('select');
      select.name = 'courses-select';
      select.add(new Option('Selecionar Curso', null));
      let i = 0;
      for (const course of courses) {
        select.add(new Option(course.slug, i));
        i++;
      }
      select.addEventListener('change', (e) => {
        e.preventDefault();
        const course = courses[select.value];
        for (const key in course) {
          const input = form.querySelector(`[name="${key}"]`);
          if (input) input.value = course[key];
        }
      });
      render.append(select);
    });
  },
  ['criar-aula']: (route) => {
    getData('/lms/lessons', (lessons) => {
      const render = route.querySelector('.render');
      const form = route.querySelector('form');
      render.innerHTML = '';
      const select = document.createElement('select');
      select.name = 'lessons-select';
      let i = 0;
      select.add(new Option('Selecionar Aula', null));
      for (const lesson of lessons) {
        select.add(new Option(`${lesson.courseSlug} - ${lesson.slug}`, i));
        i++;
      }
      select.addEventListener('change', (e) => {
        e.preventDefault();
        const lesson = lessons[select.value];
        for (const key in lesson) {
          const input = form.querySelector(`[name="${key}"]`);
          if (input) input.value = lesson[key];
        }
      });
      render.append(select);
    });
  },

  usuarios: (route) => {
    const render = route.querySelector('.render');
    getData('/auth/users/search', (users, response) => {
      const total = Number(response.headers.get('x-total-count'));
      renderUsers(users, total, render);
    });
    const form = document.querySelector('#usuarios form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      getData(
        `/auth/users/search?s=${data.get('s')}&page=${data.get('page')}`,
        (users, response) => {
          const total = Number(response.headers.get('x-total-count'));
          renderUsers(users, total, render);
        },
      );
    });
  },
};

function renderUsers(users, total, render) {
  render.innerHTML = '';
  let html = '<ul>';
  const pages = document.createElement('nav');
  const totalPages = Math.ceil(total / 5);
  pages.id = 'pages';
  const form = document.querySelector('#usuarios form');
  const page = document.getElementById('page');

  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      const button = document.createElement('button');
      button.innerText = i;
      button.addEventListener('click', (e) => {
        page.value = i;
        form.requestSubmit();
      });
      pages.append(button);
    }
  }
  for (const user of users) {
    html += /*html*/ `
            <li>
              <span>${esc(user.name)}</span>
              <span>${esc(user.email)}</span>
            </li>
          `;
  }
  html += '</ul>';
  render.innerHTML = html;
  render.append(pages);
}

// FORMULÁRIOS
async function sendForm(method, url, id, callback) {
  const form = document.querySelector('#' + id + ' form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    let response;
    let body = {};
    const badge = document.createElement('div');
    try {
      response = await fetch(BASE + url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      body = await response.json();
      if (!response.ok) throw new Error();
      if (typeof callback === 'function') callback(response, body);
      badge.innerText = `${response.status}`;
      badge.classList.add('ok');
    } catch (error) {
      badge.innerText = `${response.status} - ${body?.title}`;
      badge.classList.add('fail');
    } finally {
      form.append(badge);
      setTimeout(() => {
        badge?.remove();
      }, 1500);
    }
  });
}

sendForm('POST', '/auth/login', 'login', async () => {
  user = await getUser();
  if (user === 'user') location.hash = '/cursos';
  if (user === 'admin') location.hash = '/criar-curso';
});
sendForm('POST', '/auth/user', 'criar-conta', () => {
  location.hash = '/login';
});
sendForm('POST', '/auth/password/forgot', 'perdeu');
sendForm('POST', '/auth/password/reset', 'resetar');

sendForm('POST', '/lms/course', 'criar-curso');

// UPLOAD ARQUIVO
const lessonsForm = document.querySelector('#criar-aula form');
lessonsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = new FormData(lessonsForm);

    const input = lessonsForm.querySelector('input[type="file"]');
    if (input && input.files && input.files.length !== 0) {
      const files = input.files;
      const responseFile = await fetch(BASE + '/files/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-filename': files[0].name,
          'x-visibility': data.get('free') === '1' ? 'public' : 'private',
        },
        body: files[0],
      });
      if (!responseFile.ok) throw new Error();
      const upload = await responseFile.json();
      data.set('video', upload.path);
    }

    const responseLesson = await fetch(BASE + '/lms/lesson', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(Object.fromEntries(data)),
    });
    if (responseLesson.ok) location.reload();
  } catch (error) {
    console.log(error);
  }
});
