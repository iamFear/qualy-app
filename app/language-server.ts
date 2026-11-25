'use server';

import { cookies } from 'next/headers';
import { isLocale, localeCookie } from '../lib/i18n.ts';
import { isHttpsDeployment } from '../lib/deployment.ts';

export async function changeLanguage(locale: unknown) {
  if (!isLocale(locale)) return;
  const jar = await cookies();
  jar.set(localeCookie, locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsDeployment(process.env.QUALY_ORIGIN),
  });
}
