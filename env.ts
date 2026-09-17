import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL é obrigatória')
    .default('postgresql://postgres:postgres@localhost:5432/lms?schema=public'),
  FROM_EMAIL: z.string().default('noreply@lms.lobo.api.br'),
  SERVER_NAME: z.string().default('localhost'),
  FILES_PATH: z.string().optional(),
  EMAIL_KEY_FILE: z.string().optional(),
  PEPPER_FILE: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Erro de validação nas variáveis de ambiente:');
  for (const issue of parsedEnv.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsedEnv.data;

export const NODE_ENV = env.NODE_ENV;
export const PORT = env.PORT;
export const DATABASE_URL = env.DATABASE_URL;
export const FROM_EMAIL = env.FROM_EMAIL;
export const SERVER_NAME = env.SERVER_NAME;

export const FILES_PATH =
  env.FILES_PATH && existsSync(env.FILES_PATH)
    ? env.FILES_PATH
    : existsSync(resolve(process.cwd(), 'seed/files'))
    ? resolve(process.cwd(), 'seed/files')
    : '/files';

const emailKeyPath =
  env.EMAIL_KEY_FILE || resolve(process.cwd(), 'secrets/email_key.txt');
export const EMAIL_KEY = existsSync(emailKeyPath)
  ? readFileSync(emailKeyPath, 'utf-8').trim()
  : 'dummy_key';

const pepperPath =
  env.PEPPER_FILE || resolve(process.cwd(), 'secrets/pepper.txt');
export const PEPPER = existsSync(pepperPath)
  ? readFileSync(pepperPath, 'utf-8').trim()
  : 'segredo';
