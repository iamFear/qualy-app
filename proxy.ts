import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isHttpsDeployment } from './lib/deployment.ts';

export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64');
  const dev = process.env.NODE_ENV === 'development';
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'" + (dev ? " 'unsafe-eval'" : ''),
    "style-src 'self' " + (dev ? "'unsafe-inline'" : "'nonce-" + nonce + "'"),
    "connect-src 'self'" + (dev ? ' ws: wss:' : ''),
    "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
    'frame-src https://www.youtube-nocookie.com https://player.vimeo.com',
    "media-src 'self' https:", "img-src 'self' data:",
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  if (isHttpsDeployment(process.env.QUALY_ORIGIN)) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/|assets/).*)'],
};
