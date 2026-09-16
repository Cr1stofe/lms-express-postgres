import {
  type BinaryLike,
  type ScryptOptions,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';

import { promisify } from 'node:util';

const randomBytesAsync = promisify(randomBytes);

const scryptAsync: (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options?: ScryptOptions,
) => Promise<Buffer> = promisify(scrypt);

const PEPPER = 'segredo';

const SCRYPT_OPTIONS: ScryptOptions = {
  N: 2 ** 14,
  r: 8,
  p: 1,
};

const NORM = 'NFC';

async function hashPassword(password: string) {
  const password_normalized = password.normalize(NORM);
  const password_hmac = createHmac('sha256', PEPPER)
    .update(password_normalized)
    .digest();

  const salt = await randomBytesAsync(16);

  const dk = await scryptAsync(password_hmac, salt, 32, SCRYPT_OPTIONS);

  return (
    `scrypt$v=1$norm=${NORM}$N=${SCRYPT_OPTIONS.N},r=${SCRYPT_OPTIONS.r},p=${SCRYPT_OPTIONS.p}` +
    `$${salt.toString('hex')}$${dk.toString('hex')}`
  );
}

function parsePasswordHash(password_hash: string) {
  const [id, v, norm, options, stored_salt_hex, stored_dk_hex] =
    password_hash.split('$');
  const stored_dk = Buffer.from(stored_dk_hex, 'hex');
  const stored_salt = Buffer.from(stored_salt_hex, 'hex');
  const stored_norm = norm.replace('norm=', '');
  const stored_options = options.split(',').reduce((acc, kv) => {
    const [k, v] = kv.split('=');
    acc[k] = Number(v);
    return acc;
  }, {});
  return {
    stored_options,
    stored_norm,
    stored_dk,
    stored_salt,
  };
}

async function verifyPassword(password: string, password_hash: string) {
  const { stored_options, stored_norm, stored_dk, stored_salt } =
    parsePasswordHash(password_hash);

  const password_normalized = password.normalize(stored_norm);
  const password_hmac = createHmac('sha256', PEPPER)
    .update(password_normalized)
    .digest();

  const dk = await scryptAsync(password_hmac, stored_salt, 32, stored_options);

  if (dk.length !== stored_dk.length) return false;

  return timingSafeEqual(dk, stored_dk);
}

const password = 'P@ssw0rd';
const password_hash = await hashPassword(password);

const isTrue = await verifyPassword(password, password_hash);
const isFalse = await verifyPassword('12345678', password_hash);

console.log({ isTrue, isFalse });
