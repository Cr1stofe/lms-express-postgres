# 🎓 LMS Backend Node Vanilla & Plataforma de Cursos

Plataforma LMS (Learning Management System) moderna, minimalista e de alta performance desenvolvida em **Node.js 24** com execução nativa de **TypeScript**, sem dependência de frameworks web pesados (como Express ou Fastify).

O projeto conta com arquitetura própria orientada a serviços, banco de dados SQLite nativo de alta velocidade, proxy reverso com **Caddy**, upload de arquivos em stream com processamento de imagens via **libvips**, autenticação segura com sessões em cookies e geração dinâmica de certificados em PDF.

---

## 🚀 Tecnologias & Destaques de Arquitetura

- **Node.js 24+ & TypeScript Nativo:** Execução direta de arquivos `.ts` sem necessidade de transpiladores (build step) em desenvolvimento.
- **Servidor HTTP & Roteador Próprio:** Construído sobre `node:http` com roteador customizado, suporte a parâmetros de rota (`:slug`, `:id`), middlewares assíncronos e tratamento padronizado de erros (`RFC 7807 Problem Details`).
- **Banco de Dados SQLite Embutido (`node:sqlite`):** Uso do `DatabaseSync` com modo `WAL` (Write-Ahead Logging), chaves estrangeiras ativadas, cache em memória e queries preparadas para máxima performance.
- **Autenticação & Criptografia Avançada:**
  - Hashing de senhas com `scrypt` + `HMAC-SHA256` utilizando **Pepper** e Salt criptográfico seguro.
  - Sessões baseadas em cookies (`HttpOnly`, `SameSite=Lax`), com invalidação e limpeza periódica.
  - Proteção por funções e permissões (`user` e `admin`).
- **Upload & Streaming de Arquivos:**
  - Upload via fluxo binário (`application/octet-stream`) com limitação de tamanho por `Transform Stream` (`LimitBytes`).
  - Redimensionamento e corte automático de imagens com `vips-tools` (`vipsthumbnail`).
  - Entrega de arquivos públicos com validação de cache HTTP (`ETag`, `If-None-Match`, `304 Not Modified`).
  - Proteção de arquivos privados delegada ao Caddy via `X-Accel-Redirect`.
- **Geração de Certificados em PDF:** Geração dinâmica de certificados em PDF com [`jspdf`](https://github.com/parallax/jsPDF) após conclusão de 100% das aulas de um curso.
- **E-mails Transacionais:** Envio de e-mails para recuperação de senha integrado à API do [Resend](https://resend.com).
- **Infraestrutura com Docker & Caddy 2:**
  - Dockerfile multi-stage com imagens Alpine leves.
  - Caddy atuando como proxy reverso, terminador SSL/TLS automático (Let's Encrypt/ZeroSSL), servidor de arquivos estáticos e aplicação de cabeçalhos de segurança (CSP, HSTS, CORS, COOP, CORP).

---

## 📁 Estrutura de Diretórios

```text
.
├── api/                    # Módulos de negócio da aplicação
│   ├── auth/               # Autenticação, gestão de usuários, sessões e recuperação de senha
│   ├── files/              # Upload, redimensionamento e streaming de arquivos (públicos/privados)
│   └── lms/                # Cursos, aulas, progresso e emissão de certificados
├── core/                   # Framework central e utilitários compartilhados
│   ├── http/               # Wrappers para IncomingMessage e ServerResponse
│   ├── mail/               # Cliente de envio de e-mails (Resend)
│   ├── middleware/         # Middlewares (logger, rate-limit, body-json)
│   ├── utils/              # Classes abstratas, validações e classes de erro
│   ├── core.ts             # Inicialização do servidor HTTP e injeção de dependências
│   ├── database.ts         # Wrapper do SQLite com otimizações de performance
│   └── router.ts           # Roteador HTTP customizado
├── front/                  # Frontend estático / SPA vanilla (HTML, CSS, JS)
├── secrets/                # Segredos locais para Docker Secrets (pepper, chaves de API)
├── seed/                   # Banco de dados e arquivos de exemplo/inicialização
├── Caddyfile               # Configuração do proxy reverso, SSL e headers de segurança
├── compose.yaml            # Orquestração dos containers (Node + Caddy)
├── Dockerfile              # Imagem Docker multi-stage (Alpine + vips-tools + sqlite)
├── env.ts                  # Carregamento e validação de variáveis de ambiente
├── index.ts                # Ponto de entrada (Entrypoint) da aplicação
└── package.json            # Metadados e dependências do projeto
```

---

## ⚙️ Pré-requisitos

### Para rodar com Docker (Recomendado):

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/)

### Para rodar localmente sem Docker:

- **Node.js 24+** (com suporte nativo a TypeScript)
- **SQLite 3**
- **libvips** (`vips-tools` / `vipsthumbnail`) instalado no sistema operacional:
  - **macOS (Homebrew):** `brew install vips sqlite`
  - **Ubuntu/Debian:** `sudo apt-get install libvips-tools sqlite3`

---

## 🔑 Configuração de Variáveis de Ambiente e Segredos

### 1. Criar o diretório de segredos

Crie a pasta `secrets/` na raiz do projeto e crie os arquivos de texto necessários:

```bash
mkdir -p secrets
echo "seu-pepper-secreto-aqui" > secrets/pepper.txt
echo "re_sua_chave_resend_aqui" > secrets/email_key.txt
```

> **Nota:** Certifique-se de não versionar arquivos com chaves reais em repositórios públicos.

### 2. Criar o arquivo `.env`

Crie um arquivo `.env` na raiz do projeto com base no modelo abaixo:

```env
# Configurações do Servidor e Domínio
SERVER_NAME=localhost
ACME_EMAIL=seu-email@exemplo.com

# E-mail remetente para recuperação de senha
FROM_EMAIL=noreply@seudominio.com

# Caminhos dentro do ambiente de execução (Docker)
DB_PATH=/db/db.sqlite
FILES_PATH=/files
```

---

## 🖥️ Como Executar o Projeto

### Opção 1: Executando via Docker Compose (Completo com Caddy e SSL)

1. Certifique-se de que os arquivos `.env` e a pasta `secrets/` foram criados.
2. Inicie os containers com o Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. Acesse a aplicação no seu navegador:
   - **Interface Web / Frontend:** `http://localhost` (ou `https://localhost` se configurado)
   - **API Backend:** `http://localhost/api`

Para visualizar os logs dos containers:

```bash
docker compose logs -f
```

Para parar a aplicação:

```bash
docker compose down
```

---

### Opção 2: Executando Localmente para Desenvolvimento

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie diretórios para arquivos e banco de dados local:

   ```bash
   mkdir -p ./files/public ./files/private ./db
   ```

3. Defina as variáveis de ambiente necessárias e inicie o servidor com hot-reload nativo:

   ```bash
   export DB_PATH="./db/lms.sqlite"
   export FILES_PATH="./files"
   export EMAIL_KEY_FILE="./secrets/email_key.txt"
   export PEPPER_FILE="./secrets/pepper.txt"
   export FROM_EMAIL="noreply@exemplo.com"
   export SERVER_NAME="localhost"

   # Iniciar o servidor Node.js com hot-reload automático
   npm run dev
   # ou: node --watch index.ts
   ```

4. O servidor estará rodando em: `http://localhost:3000`

---

## 🧪 Popular Dados e Testar Endpoints

O projeto inclui um script utilitário [`client.js`](file:///Volumes/D/Projetos/backend/lms/client.js) para criar cursos, aulas e usuários de teste.

Para executar o script de seed / testes:

```bash
node client.js
```

Para testar o hashing de senha de forma isolada:

```bash
node crypto.ts
```

---

## 📡 Visão Geral dos Principais Endpoints

### 🔐 Autenticação (`/api/auth`)

| Método   | Endpoint                                | Descrição                                          | Permissão                |
| :------- | :-------------------------------------- | :------------------------------------------------- | :----------------------- |
| `POST`   | `/api/auth/user`                        | Cadastra um novo usuário                           | Pública (com rate limit) |
| `POST`   | `/api/auth/login`                       | Realiza login e gera cookie de sessão              | Pública (com rate limit) |
| `DELETE` | `/api/auth/logout`                      | Invalida a sessão atual e limpa o cookie           | Pública                  |
| `POST`   | `/api/auth/password/forgot`             | Solicita e-mail de recuperação de senha            | Pública (com rate limit) |
| `POST`   | `/api/auth/password/reset`              | Redefine a senha utilizando o token de recuperação | Pública                  |
| `PUT`    | `/api/auth/password/update`             | Altera a senha do usuário autenticado              | Usuário autenticado      |
| `GET`    | `/api/auth/session`                     | Retorna o status e a role da sessão atual          | Usuário autenticado      |
| `GET`    | `/api/auth/users/search?s=termo&page=1` | Busca paginada de usuários                         | Administrador            |

### 📚 LMS - Cursos, Aulas e Certificados (`/api/lms`)

| Método   | Endpoint                                  | Descrição                                             | Permissão           |
| :------- | :---------------------------------------- | :---------------------------------------------------- | :------------------ |
| `GET`    | `/api/lms/courses`                        | Lista todos os cursos disponíveis                     | Pública             |
| `GET`    | `/api/lms/course/:slug`                   | Retorna detalhes do curso, aulas e progresso do aluno | Opcional            |
| `GET`    | `/api/lms/lesson/:courseSlug/:lessonSlug` | Retorna dados da aula e links anterior/próxima        | Opcional            |
| `POST`   | `/api/lms/course`                         | Cadastra um novo curso                                | Administrador       |
| `POST`   | `/api/lms/lesson`                         | Cadastra uma nova aula vinculada a um curso           | Administrador       |
| `GET`    | `/api/lms/lessons`                        | Lista todas as aulas do sistema                       | Administrador       |
| `POST`   | `/api/lms/lesson/complete`                | Marca aula como concluída (emite certificado se 100%) | Usuário autenticado |
| `DELETE` | `/api/lms/course/reset`                   | Reseta o progresso e certificados do aluno no curso   | Usuário autenticado |
| `GET`    | `/api/lms/certificates`                   | Lista todos os certificados emitidos do usuário       | Usuário autenticado |
| `GET`    | `/api/lms/certificate/:id`                | Faz o download do certificado em formato PDF          | Pública             |

### 📁 Arquivos (`/api/files`)

| Método | Endpoint               | Descrição                                           | Permissão           |
| :----- | :--------------------- | :-------------------------------------------------- | :------------------ |
| `GET`  | `/files/public/:name`  | Serve arquivos públicos (suporte a `ETag` e cache)  | Pública             |
| `GET`  | `/files/private/:name` | Acessa arquivos restritos (via `X-Accel-Redirect`)  | Usuário autenticado |
| `POST` | `/api/files/upload`    | Upload binário (`octet-stream`) com corte de imagem | Administrador       |

---

## 🛡️ Segurança e Boas Práticas Implementadas

- **Rate Limiting:** Proteção contra força bruta e DoS em endpoints sensíveis (login, criação de usuários, recuperação de senha).
- **Defesa em Profundidade:** Uso de cookies com `HttpOnly`, `SameSite=Lax`, expiração automática de sessões e sanitização/validação rigorosa de inputs (`core/utils/validate.ts`).
- **Headers HTTP Seguros:** Caddy configurado com CSP restritivo, HSTS, isolamento de janelas cross-origin (COOP, CORP) e remoção de banners de servidor.
- **Graceful Shutdown:** Encerramento seguro de conexões ativas e fechamento ordenado do banco de dados SQLite ao receber sinais `SIGINT` e `SIGTERM`.
