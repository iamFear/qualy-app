import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { HttpError } from './validation.ts';

const params = { N: 65536, r: 8, p: 2, maxmem: 96 * 1024 * 1024 };
function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, params, (error, key) => error ? reject(error) : resolve(key));
  });
}

const cookieName = 'qualy_session';
const idleSalt = Buffer.alloc(16);
const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export const hashSession = (cookie: string | null) => {
  const token = cookie?.match(/(?:^|;\s*)qualy_session=([\w-]{43})(?:;|$)/)?.[1];
  return token ? digest(token) : undefined;
};

export function issueSession(days: number) {
  const token = randomBytes(32).toString('base64url');
  const seconds = days * 86400;
  return { token, hash: digest(token), seconds, expires: Date.now() + seconds * 1000 };
}

export const sessionCookie = (session: ReturnType<typeof issueSession> | null, secure: boolean) =>
  `${cookieName}=${session?.token ?? ''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${session?.seconds ?? 0}${secure ? '; Secure' : ''}`;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function matchesPassword(password: string, hash?: string | null) {
  const [salt, expected] = hash?.split(':') ?? [];
  const key = await derive(password, salt ? Buffer.from(salt, 'hex') : idleSalt);
  return Boolean(expected && timingSafeEqual(key, Buffer.from(expected, 'hex')));
}

export function makeLimiter() {
  const windowMs = 15 * 60 * 1000;
  const attempts = new Map<string, { expires: number; count: number }>();
  let sweepAt = 0;
  let active = 0;
  return async <T>(key: string, limit: number, action: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    if (now >= sweepAt) {
      for (const [id, stats] of attempts) if (stats.expires <= now) attempts.delete(id);
      sweepAt = now + 60_000;
    }
    const previous = attempts.get(key);
    const stats = previous && previous.expires > now ? previous : { count: 0, expires: now + windowMs };
    if (stats.count >= limit || active >= 4 || (attempts.size >= 4096 && !previous)) {
      throw new HttpError(429, 'Demasiados intentos. Intenta de nuevo en unos minutos.');
    }
    stats.count++;
    attempts.set(key, stats);
    active++;
    try {
      return await action();
    } finally {
      active--;
    }
  };
}
