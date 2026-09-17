import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@lms.lobo.api.br';
export const SERVER_NAME = process.env.SERVER_NAME || 'localhost';
export const FILES_PATH =
  process.env.FILES_PATH && existsSync(process.env.FILES_PATH)
    ? process.env.FILES_PATH
    : existsSync(resolve(process.cwd(), 'seed/files'))
    ? resolve(process.cwd(), 'seed/files')
    : '/files';

const emailKeyPath =
  process.env.EMAIL_KEY_FILE || resolve(process.cwd(), 'secrets/email_key.txt');
export const EMAIL_KEY = existsSync(emailKeyPath)
  ? readFileSync(emailKeyPath, 'utf-8').trim()
  : 'dummy_key';

const pepperPath =
  process.env.PEPPER_FILE || resolve(process.cwd(), 'secrets/pepper.txt');
export const PEPPER = existsSync(pepperPath)
  ? readFileSync(pepperPath, 'utf-8').trim()
  : 'segredo';
