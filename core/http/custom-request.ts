import type { IncomingMessage } from 'node:http';
import { parseCookies } from '../utils/parse-cookies.ts';
import type { UserRole } from '../../api/auth/query.ts';
import { SERVER_NAME } from '../../env.ts';

export interface CustomRequest extends IncomingMessage {
  query: URLSearchParams;
  pathname: string;
  body: Record<string, unknown>;
  params: Record<string, string>;
  cookies: Record<string, string | undefined>;
  session: { user_id: number; role: UserRole; expires_ms: number } | null;
  ip: string;
  baseurl: string;
}

function getIp(ip: string | string[] | undefined) {
  if (ip === undefined) return '';
  if (typeof ip === 'string') return ip.split(',')[0].trim();
  if (Array.isArray(ip) && typeof ip[0] === 'string') return ip[0];
  return '';
}

export function customRequest(request: IncomingMessage) {
  const req = request as CustomRequest;
  req.baseurl = `https://${SERVER_NAME}`;
  const url = new URL(req.url || '', req.baseurl);
  req.query = url.searchParams;
  req.pathname = url.pathname;
  req.params = {};
  req.body = {};
  req.cookies = parseCookies(req.headers.cookie);
  req.ip = getIp(req.headers['x-forwarded-for']);
  req.session = null;

  return req;
}
