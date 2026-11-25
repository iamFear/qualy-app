'use client';

import { createContext, useContext, useTransition } from 'react';
import type { ReactNode } from 'react';
import type { Locale, Translate } from '../lib/i18n.ts';
import { translate } from '../lib/i18n.ts';
import { changeLanguage } from './language-server.ts';

const Languages: Record<Locale, { locale: Locale; t: Translate }> = {
  es: { locale: 'es', t: (message, values) => translate('es', message, values) },
  en: { locale: 'en', t: (message, values) => translate('en', message, values) },
};
const LanguageContext = createContext(Languages.es);

export function LanguageProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LanguageContext.Provider value={Languages[locale]}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitch() {
  const { locale, t } = useLanguage();
  const [pending, startTransition] = useTransition();
  return <div className="language-switch" role="group" aria-label={t('Idioma')} aria-busy={pending}>
    <button type="button" lang="es" aria-label="Español" title="Español" aria-pressed={locale === 'es'}
      aria-disabled={pending} onClick={() => { if (!pending && locale !== 'es') startTransition(() => changeLanguage('es')); }}>ES</button>
    <button type="button" lang="en" aria-label="English" title="English" aria-pressed={locale === 'en'}
      aria-disabled={pending} onClick={() => { if (!pending && locale !== 'en') startTransition(() => changeLanguage('en')); }}>EN</button>
  </div>;
}
