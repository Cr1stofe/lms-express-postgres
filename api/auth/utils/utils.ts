import { createHash, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

export const randomBytesAsync = promisify(randomBytes);

export function sha256(msg: string) {
  return createHash('sha256').update(msg).digest();
}
