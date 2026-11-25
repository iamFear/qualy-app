import Link from 'next/link';
import { translate } from '../lib/i18n.ts';
import { LanguageSwitch } from './language.tsx';
import { requestLanguage } from './request-language.ts';

export default async function NotFound() {
  const locale = await requestLanguage();
  return <>
    <header className="standalone-topbar"><LanguageSwitch /></header>
    <main className="loading" id="contenido">
      <strong>qualy.</strong>
      <p>{translate(locale, 'No encontramos esta página.')}</p>
      <Link className="button primary" href="/">{translate(locale, 'Volver a Hoy')}</Link>
    </main>
  </>;
}
