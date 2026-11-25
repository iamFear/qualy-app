import postgres from 'postgres';

export function connectDatabase(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is missing.');

  const connection = new URL(url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(connection.hostname);
  const ca = process.env.DATABASE_SSL_CA;
  return postgres(url, {
    prepare: false,
    max_pipeline: 1,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: local ? undefined : {
      rejectUnauthorized: true,
      ...(ca ? { ca: ca.replace(/\\n/g, '\n') } : {}),
    },
  });
}

export function databaseErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') return error.code;
}
