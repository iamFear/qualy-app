import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

try {
  process.loadEnvFile('.env.local');
} catch (error) {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
}

const { DATABASE_URL: url, QUALY_LOCAL_PG_DATA: data, QUALY_LOCAL_PG_CTL: binary = 'pg_ctl' } = process.env;
if (data && url && new URL(url).hostname === '127.0.0.1') {
  const directory = resolve(data);
  const status = () => spawnSync(binary, ['-D', directory, 'status'], { stdio: 'ignore' });
  const current = status();
  if (current.error) throw current.error;
  if (current.status !== 0) {
    const started = spawnSync(binary, ['-D', directory, '-l', join(directory, 'server.log'), '-w', 'start'], { stdio: 'inherit' });
    if (started.error) throw started.error;
    if (started.status !== 0 && status().status !== 0) process.exitCode = 1;
  }
}
