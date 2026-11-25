import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { translate } from '../lib/i18n.ts';
import { QualyProvider } from './qualy.tsx';
import { LanguageProvider } from './language.tsx';
import { requestLanguage } from './request-language.ts';
import './styles.css';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLanguage();
  return {
    title: { default: translate(locale, 'Qualy · Tu espacio personal'), template: '%s · Qualy' },
    description: translate(locale, 'Qualy es tu agenda privada de entrenamiento y hábitos diarios.'),
    icons: { icon: '/assets/favicon.svg' },
  };
}

export const viewport: Viewport = { themeColor: '#f7f8f4' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await requestLanguage();
  return <html lang={locale}>
    <head><link rel="preload" href="/assets/outfit.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /></head>
    <body>
      <a href="#contenido" className="skip">{translate(locale, 'Ir al contenido')}</a>
      <LanguageProvider locale={locale}><QualyProvider>{children}</QualyProvider></LanguageProvider>
      <noscript>{translate(locale, 'Activa JavaScript en tu navegador para usar Qualy.')}</noscript>
    </body>
  </html>;
}
