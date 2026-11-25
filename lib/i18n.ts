import dictionary from './en.json' with { type: 'json' };

const english: Record<string, string> = dictionary;
export type Locale = 'es' | 'en';
export type TranslationValues = Record<string, string | number>;
export type Translate = (message: string, values?: TranslationValues) => string;

export const localeCookie = 'qualy_locale';
export function isLocale(locale: unknown): locale is Locale {
  return locale === 'es' || locale === 'en';
}

export function normalizeLocale(locale: unknown): Locale {
  return isLocale(locale) ? locale : 'es';
}

export function localeFromCookie(header: string | null) {
  const value = header?.match(/(?:^|;\s*)qualy_locale=([^;]*)/)?.[1];
  return normalizeLocale(value);
}

export function translate(locale: Locale, message: string, values?: TranslationValues) {
  const text = locale === 'en' && Object.hasOwn(english, message) ? english[message] : message;
  return values ? text.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(values, key)
    ? String(values[key]) : match) : text;
}
