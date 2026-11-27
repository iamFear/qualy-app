import postgres from 'postgres';
import { isIP } from 'node:net';

function isLoopback(host: string) {
  const name = host.toLowerCase().replace(/^\[|\]$|\.$/g, '');
  return /^(?:[a-z0-9-]+\.)*localhost$/.test(name) ||
    (isIP(name) === 4 && (name.startsWith('127.') || name === '0.0.0.0')) ||
    (isIP(name) === 6 && (name === '::1' || name === '::' || /^::ffff:(?:7f[0-9a-f]{2}:|127\.)/.test(name)));
}

export function connectDatabase(url = process.env.DATABASE_URL, { quiet = false } = {}) {
  if (!url) throw new Error('DATABASE_URL is missing.');

  const connection = new URL(url);
  if (!['postgres:', 'postgresql:'].includes(connection.protocol)) throw new Error('DATABASE_URL must use PostgreSQL.');
  connection.hash = '';
  const host = connection.searchParams.getAll('host').at(-1) || connection.hostname;
  const local = isLoopback(host);
  const ca = process.env.DATABASE_SSL_CA;
  return postgres(connection.href, {
    prepare: false,
    max_pipeline: 1,
    max: process.env.VERCEL === '1' ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ...(quiet ? { onnotice: () => {}, debug: false } : {}),
    ssl: local ? undefined : {
      rejectUnauthorized: true,
      ...(ca ? { ca: ca.replace(/\\n/g, '\n') } : {}),
    },
  });
}

export function isHostedDatabase({ host, path }: ReturnType<typeof connectDatabase>['options']) {
  return !path && host.length > 0 && host.every((name) => {
    try {
      // Normalize alternate spellings of IP addresses before checking for loopback.
      const address = isIP(name) === 6 ? `[${name}]` : name;
      const url = new URL(`http://${address}`);
      return !isLoopback(url.hostname);
    } catch {
      return false;
    }
  });
}

export function databaseErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') return error.code;
}
