import { cookies } from 'next/headers';
import { localeCookie, normalizeLocale } from '../lib/i18n.ts';

export async function requestLanguage() {
  const jar = await cookies();
  return normalizeLocale(jar.get(localeCookie)?.value);
}
