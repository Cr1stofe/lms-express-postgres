# 🎓 LMS Backend - Plataforma de Cursos Online (Fase 2)

API REST moderna, robusta e escalável desenvolvida em **Node.js 24**, **Express.js**, **PostgreSQL 18** e **Prisma ORM 7+**, construída sob os princípios da **Arquitetura em Camadas (Layered Architecture / Clean Architecture)**, validações declarativas em tempo de execução com **Zod v4**, proxy reverso com **Caddy**, infraestrutura conteinerizada via **Docker Compose** e **Suíte de Testes Automatizados de Integração com Vitest**.

---

## 🚀 Tecnologias & Destaques de Arquitetura

- **Node.js 24+ & TypeScript Nativo:** Execução e tipagem estrita de ponta a ponta sem etapa de build transpilada intermediária.
- **Express.js & Arquitetura em Camadas:**
  - Separação estrita de responsabilidades: **Rotas (`routes.ts`) ➔ Controladores (`controllers/`) ➔ Serviços de Domínio (`services/`)**.
  - Injeção de dependências desacoplada, facilitando manutenção e testes unitários/integração.
  - Middlewares dedicados: `logger` de requisições, `error-handler` compatível com **RFC 7807 (Problem Details)** e `rate-limiter` anti-bruteforce.
- **PostgreSQL 18 & Prisma ORM 7+:**
  - Banco de dados relacional rodando em container Docker dedicado com healthcheck ativo.
  - Modelagem relacional tipada (`User`, `Session`, `Course`, `Lesson`, `Certificate`) e controle de migrations automatizado (`prisma migrate`).
  - Driver de alta performance via `@prisma/adapter-pg` com pool de conexões do `pg`.
  - Seed autônomo e idempotente (`prisma/seed.ts`) com `prisma.upsert`.
- **Validação com Zod v4:**
  - Validação estrita de esquemas em runtime para payloads JSON, parâmetros de rota (`slug`, `id`, `page`), arquivos e variáveis de ambiente (`env.ts`).
  - Retorno automático de erros padronizados no formato HTTP 422 Unprocessable Content.
- **Autenticação, Criptografia & RBAC:**
  - Hashing de senhas seguro com algoritmo `scrypt` + `HMAC-SHA256` combinado com **Pepper** e Salt criptográfico.
  - Controle de Sessões em cookies seguros (`__Secure-sid`, `HttpOnly`, `SameSite=Lax`), com rotação e expiração periódica.
  - Controle de acesso granular baseado em papéis (**RBAC**): `ADMIN`, `EDITOR` e `USER`.
  - Fluxo de recuperação de senha com tokens criptografados e envio de e-mails transacionais (Resend API).
- **Upload & Streaming de Arquivos:**
  - Upload via fluxo binário em stream (`application/octet-stream`) com limitação de tamanho por `Transform Stream` (`LimitBytes`).
  - Redimensionamento e corte automático de imagens com `libvips` (`vipsthumbnail`).
  - Entrega de arquivos públicos com validação de cache HTTP (`ETag`, `If-None-Match`, `304 Not Modified`).
  - Proteção de arquivos privados delegada ao Caddy via cabeçalho `X-Accel-Redirect`.
- **Geração de Certificados em PDF:** Geração dinâmica de certificados vetoriais em PDF com `PDFKit` após a conclusão de 100% das aulas de um curso.
- **Suíte de Testes Automatizados (Vitest + Supertest):** 30 testes de integração cobrindo 100% dos fluxos de Auth, LMS, Files, RBAC, Tokens e Certificados com cobertura superior a 75%~80%.
- **Infraestrutura com Docker Compose & Caddy 2:**
  - Orquestração de 3 serviços interligados: `postgres:18-alpine`, `node:24-alpine` e `caddy:2-alpine`.
  - Caddy atuando como proxy reverso, terminador SSL/TLS automático, entrega de estáticos e headers de segurança (CSP, HSTS, CORS, COOP, CORP).

---

## 📁 Estrutura de Diretórios

```text
.
├── api/                        # Módulos de negócio da aplicação
│   ├── auth/                   # Autenticação, Usuários, Sessões e Recuperação de Senha
│   │   ├── controllers/        # Controladores HTTP de Auth
│   │   ├── middleware/         # Middleware de validação de Sessão e RBAC
│   │   ├── services/           # Regras de negócio de usuários, hash e sessões
│   │   ├── utils/              # Funções auxiliares (scrypt, tokens)
│   │   └── routes.ts           # Definição e mapeamento de rotas de Auth
│   ├── files/                  # Upload, redimensionamento e streaming de arquivos
│   │   ├── controllers/        # Controladores HTTP de Arquivos
│   │   ├── services/           # Processamento de streams e libvips
│   │   ├── utils.ts            # Tratamento de ETag, mimetype e buffers
│   │   └── routes.ts           # Definição e mapeamento de rotas de Arquivos
│   └── lms/                    # Cursos, Aulas, Progresso e Certificados
│       ├── controllers/        # Controladores HTTP de LMS
│       ├── services/           # Regras de conclusão de aulas e certificados
│       ├── utils/              # Gerador de PDF vetorial (PDFKit)
│       └── routes.ts           # Definição e mapeamento de rotas de LMS
├── core/                       # Núcleo da aplicação e utilitários compartilhados
│   ├── mail/                   # Cliente de e-mails transacionais (Resend)
│   ├── middleware/             # Middlewares globais (logger, error-handler, rate-limit)
│   ├── utils/                  # Schemas de validação Zod e classe RouteError
│   └── prisma.ts               # Conexão e pool de conexões do Prisma Client
├── prisma/                     # Configurações do Banco de Dados
│   ├── migrations/             # Histórico de migrações SQL versionadas
│   ├── schema.prisma           # Modelagem de dados e schemas relacionais
│   └── seed.ts                 # Script autônomo e idempotente para semear dados iniciais
├── test/                       # Suíte de Testes Automatizados (Vitest + Supertest)
│   ├── auth.spec.ts            # Testes de cadastro, login, RBAC, senha e sessão (12 testes)
│   ├── files.spec.ts           # Testes de healthcheck, proteção privada e upload (7 testes)
│   └── lms.spec.ts             # Testes de cursos, aulas, certificados e PDF (11 testes)
├── front/                      # Interface Web estática / SPA (HTML, CSS, JS)
├── secrets/                    # Segredos locais para Docker Secrets (pepper, chaves)
├── Caddyfile                   # Configuração do proxy reverso, SSL e headers HTTP
├── compose.yaml                # Orquestração dos containers (PostgreSQL + Node + Caddy)
├── Dockerfile                  # Imagem Docker multi-stage (Node 24 Alpine + Prisma)
├── env.ts                      # Validação de variáveis de ambiente com Zod
├── index.ts                    # Ponto de entrada (Entrypoint) do servidor Express
├── vitest.config.ts            # Configuração do executor de testes Vitest
└── package.json                # Metadados, scripts e dependências do projeto
```

---

## ⚙️ Pré-requisitos

### Para rodar com Docker (Recomendado):
- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/)

### Para rodar localmente sem Docker:
- **Node.js 24+** (com suporte nativo a TypeScript)
- **PostgreSQL 18** (ou PostgreSQL 15+ em execução)
- **libvips** (`vips-tools` / `vipsthumbnail`) instalado no sistema operacional:
  - **macOS (Homebrew):** `brew install vips`
  - **Ubuntu/Debian:** `sudo apt-get install libvips-tools`

---

## 🔑 Variáveis de Ambiente e Segredos

### 1. Criar o diretório de segredos

Crie a pasta `secrets/` na raiz do projeto com os arquivos necessários:

```bash
mkdir -p secrets
echo "seu-pepper-secreto-aqui-muito-seguro" > secrets/pepper.txt
echo "re_sua_chave_resend_aqui" > secrets/email_key.txt
```

### 2. Configurar o arquivo `.env`

Crie um arquivo `.env` na raiz do projeto:

```env
# Servidor & Domínio
SERVER_NAME=localhost
NODE_ENV=development
PORT=3000

# E-mail Remetente
FROM_EMAIL=noreply@seudominio.com

# Armazenamento de Arquivos
# No Docker Compose (volume nomeado montado em /files):
FILES_PATH=/files

# Para desenvolvimento LOCAL na máquina host (fora do Docker):
# FILES_PATH=./files

# Banco de Dados (PostgreSQL)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=lms
POSTGRES_PORT=5432
POSTGRES_HOST=localhost

# URL de conexão do Prisma (Host local):
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lms?schema=public"
```

---

## 🖥️ Como Executar a Aplicação

### Opção 1: Ambiente Completo com Docker Compose (Recomendado)

1. Suba todo o ambiente integrado (PostgreSQL 18 + Node.js 24 + Caddy 2):
   ```bash
   docker compose up -d --build
   ```

2. Acesse no navegador:
   - **Frontend Web:** `http://localhost` (ou `https://localhost`)
   - **API Backend:** `http://localhost/api`
   - **Healthcheck:** `http://localhost/api/health`

3. Visualizar logs dos containers:
   ```bash
   docker compose logs -f
   ```

4. Parar os containers:
   ```bash
   docker compose down
   ```

---

### Opção 2: Desenvolvimento Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o container do PostgreSQL em background:
   ```bash
   docker compose up -d postgres
   ```

3. Aplique as migrations e popule o banco de dados inicial (Seed):
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

4. Inicie o servidor Express com hot-reload automático:
   ```bash
   npm run dev
   ```
   > O servidor estará rodando em: `http://localhost:3000`

---

## 🧪 Suíte de Testes Automatizados

O projeto conta com uma suíte completa de **30 testes de integração** construída com **Vitest** e **Supertest**, testando as rotas da API diretamente contra o banco de dados PostgreSQL real.

```bash
# Executar todos os 30 testes automatizados:
npm test

# Executar os testes em modo contínuo (Watch):
npm run test:watch

# Gerar relatório detalhado de cobertura de código:
npx vitest run --coverage
```

### Credenciais Padrão Criadas pelo Seed

| Papel (Role) | E-mail | Senha Padrão |
| :--- | :--- | :--- |
| **Administrador (`ADMIN`)** | `admin@lms.com` | `P@ssw0rd123` |
| **Editor (`EDITOR`)** | `editor@lms.com` | `P@ssw0rd123` |
| **Aluno (`USER`)** | `henrique.barros@exemplo.com` | `P@ssw0rd123` |

---

## 📡 Visão Geral dos Principais Endpoints

### 🔐 Autenticação & Gestão de Usuários (`/auth`)

| Método | Endpoint | Descrição | Permissão |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/user` | Cadastra um novo aluno no sistema | Pública (Rate Limited) |
| `POST` | `/auth/login` | Autentica e gera cookie de sessão `__Secure-sid` | Pública (Rate Limited) |
| `DELETE` | `/auth/logout` | Invalida a sessão ativa e limpa o cookie | Usuário autenticado |
| `POST` | `/auth/password/forgot` | Solicita envio de token de recuperação de senha | Pública (Rate Limited) |
| `POST` | `/auth/password/reset` | Redefine a senha utilizando o token de recuperação | Pública |
| `PUT` | `/auth/password/update` | Altera a senha do usuário autenticado | Usuário autenticado |
| `GET` | `/auth/session` | Retorna o status e a role da sessão atual | Usuário autenticado |
| `GET` | `/auth/users/search?page=1` | Busca paginada de usuários | Administrador (`ADMIN`) |

### 📚 LMS - Cursos, Aulas e Certificados (`/lms`)

| Método | Endpoint | Descrição | Permissão |
| :--- | :--- | :--- | :--- |
| `GET` | `/lms/courses` | Lista todos os cursos disponíveis | Pública |
| `GET` | `/lms/course/:slug` | Retorna detalhes do curso, aulas e progresso | Opcional |
| `GET` | `/lms/lesson/:courseSlug/:lessonSlug` | Retorna dados da aula e navegação (`prev`/`next`) | Opcional |
| `POST` | `/lms/course` | Cadastra ou atualiza um curso | Administrador (`ADMIN`) |
| `POST` | `/lms/lesson` | Cadastra ou atualiza uma aula | Administrador (`ADMIN`) |
| `GET` | `/lms/lessons` | Lista todas as aulas do sistema no painel | Administrador (`ADMIN`) |
| `POST` | `/lms/lesson/complete` | Conclui aula e emite certificado se 100% | Aluno autenticado |
| `DELETE` | `/lms/course/reset` | Reseta o progresso do aluno no curso | Aluno autenticado |
| `GET` | `/lms/certificates` | Lista os certificados emitidos do aluno | Aluno autenticado |
| `GET` | `/lms/certificate/:id` | Faz o download do PDF vetorial do certificado | Pública |

### 📁 Arquivos & Healthcheck (`/files` e `/health`)

| Método | Endpoint | Descrição | Permissão |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Healthcheck de integridade da API | Pública |
| `GET` | `/files/public/:name` | Serve arquivos estáticos públicos (cache ETag) | Pública |
| `GET` | `/files/private/:name` | Acessa arquivos restritos (`X-Accel-Redirect`) | Aluno autenticado |
| `POST` | `/files/upload` | Upload binário (`octet-stream`) com corte `libvips` | Administrador (`ADMIN`) |

---

## 🛠️ Comandos Úteis do Dia a Dia

| Comando | O que faz? |
| :--- | :--- |
| `npm test` | Executa os 30 testes automatizados de integração |
| `npx vitest run --coverage` | Gera a tabela de cobertura detalhada por arquivo/módulo |
| `npx prisma studio` | Abre a interface visual de administração do banco (`http://localhost:5555`) |
| `npx prisma migrate dev` | Gera e aplica uma nova migration no banco de dados local |
| `npx prisma db seed` | Semeia dados iniciais de cursos, aulas e usuários |
| `docker compose ps` | Verifica a saúde e o status de todos os containers |
| `npm run dev` | Inicia o servidor Express em modo desenvolvimento |
