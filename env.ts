import { readFileSync } from 'fs';

export const DB_PATH = process.env.DB_PATH || '/db/lms.sqlite';
export const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@lms.lobo.api.br';
export const SERVER_NAME = process.env.SERVER_NAME || 'localhost';
export const FILES_PATH = process.env.FILES_PATH || '/files';

if (process.env.EMAIL_KEY_FILE === undefined) {
  throw new Error('EMAIL_KEY_FILE undefined');
}
export const EMAIL_KEY = readFileSync(process.env.EMAIL_KEY_FILE, 'utf-8');
if (process.env.PEPPER_FILE === undefined) {
  throw new Error('PEPPER_FILE undefined');
}
export const PEPPER = readFileSync(process.env.PEPPER_FILE, 'utf-8');
