import { RouteError } from './route-error.ts';

function string(x: unknown) {
  if (typeof x !== 'string') return undefined;
  const s = x.trim();
  if (s.length === 0) return undefined;
  return s;
}

function number(x: unknown) {
  if (typeof x === 'number') {
    return Number.isFinite(x) ? x : undefined;
  }
  if (typeof x === 'string' && x.trim().length !== 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function boolean(x: unknown) {
  if (x === true || x === 'true' || x === 1 || x === '1' || x === 'on')
    return true;
  if (x === false || x === 'false' || x === 0 || x === '0' || x === 'off')
    return false;
  return undefined;
}

function object(x: unknown): Record<string, unknown> | undefined {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : undefined;
}

const email_re = /^[^@]+@[^@]+\.[^@]+$/;

function email(x: unknown) {
  const s = string(x)?.toLowerCase();
  if (s === undefined) return undefined;
  return email_re.test(s) ? s : undefined;
}

const password_re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

function password(x: unknown) {
  if (typeof x !== 'string') return undefined;
  if (x.length < 10 || x.length > 256) return undefined;
  return password_re.test(x) ? x : undefined;
}

const file_re = /^(?!\.)[A-Za-z0-9._-]+$/;

function file(x: unknown) {
  if (typeof x !== 'string') return undefined;
  return file_re.test(x) ? x : undefined;
}

type Parse<Value> = (x: unknown) => Value | undefined;

function required<Value>(fn: Parse<Value>, error: string) {
  return (x: unknown) => {
    const value = fn(x);
    if (value === undefined) throw new RouteError(422, error);
    return value;
  };
}

export const v = {
  string: required(string, 'string esperada'),
  number: required(number, 'número esperado'),
  boolean: required(boolean, 'boolean esperada'),
  object: required(object, 'objeto esperado'),
  email: required(email, 'email inválido'),
  password: required(password, 'password inválido'),
  file: required(file, 'nome de arquivo inválido'),
  o: {
    string,
    number,
    boolean,
    object,
    email,
    password,
    file,
  },
};
