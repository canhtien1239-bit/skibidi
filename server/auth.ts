import crypto from 'node:crypto';
import type { Request, Response } from 'express';

export const SESSION_COOKIE_NAME = 'worklinks_sid';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): boolean {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function createSessionToken(): {
  rawToken: string;
  tokenHash: string;
  expiresAt: string;
} {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_SECONDS * 1000
  ).toISOString();
  return { rawToken, tokenHash, expiresAt };
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function setSessionCookie(res: Response, rawToken: string): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(
      rawToken
    )}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${SESSION_TTL_SECONDS}`
  );
}

export function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`
  );
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex).trim();
    if (key === SESSION_COOKIE_NAME) {
      const value = pair.slice(eqIndex + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

export function isTrustedMutationRequest(req: Request): boolean {
  const requestedWith = req.headers['x-requested-with'];
  if (requestedWith !== 'WorkLinksApp') {
    return false;
  }

  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.length > 0) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      const forwardedHost = req.headers['x-forwarded-host'];
      const hostHeader =
        typeof forwardedHost === 'string' && forwardedHost.length > 0
          ? forwardedHost.split(',')[0].trim().toLowerCase()
          : (req.headers.host ?? '').toLowerCase();
      if (!hostHeader || originHost !== hostHeader) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}
