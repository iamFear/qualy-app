export function isHttpsDeployment(origin?: string): boolean {
  if (origin) return new URL(origin).protocol === 'https:';
  return process.env.VERCEL === '1' && process.env.VERCEL_ENV !== 'development';
}
