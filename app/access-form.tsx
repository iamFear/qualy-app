'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { maxPasswordLength, minPasswordLength, registrationPasswordHelp } from '../lib/credentials.ts';
import type { Locale } from '../lib/i18n.ts';
import { errorMessage, request } from './api-request.ts';
import { BrandMark } from './brand-mark.tsx';
import { LanguageSwitch, useLanguage } from './language.tsx';
import { Icon } from './ui-icon.tsx';

export function AccessForm({ register }: { register: boolean }) {
  const { locale, t } = useLanguage();
  const [error, setError] = useState<{ locale: Locale; wording: string } | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const displayedError = error?.locale === locale ? t(error.wording) : '';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (typeof data.email === 'string') data.email = data.email.trim();
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await request(register ? '/api/register' : '/api/login', 'POST', data);
      window.location.replace('/hoy');
    } catch (failure) {
      setError({ locale, wording: errorMessage(failure) });
      setPending(false);
      busy.current = false;
    }
  }

  return <>
    <header className="standalone-topbar"><LanguageSwitch /></header>
    <main id="contenido" className="content" tabIndex={-1}>
      <section className="auth-layout"><div className="panel auth-panel">
        <BrandMark size={43} />
        <h1>{t(register ? 'Crea tu cuenta' : 'Inicia sesión')}</h1>
        <p>{t(register ? 'Empieza tu propia agenda de entrenamientos y hábitos.' : 'Entra para consultar tu entrenamiento y tus hábitos.')}</p>
        <div className="auth-tabs" aria-label={t('Acceso a Qualy')}>
          <Link href="/cuenta" aria-current={!register ? 'page' : undefined}>{t('Iniciar sesión')}</Link>
          <Link href="/cuenta?modo=registro" aria-current={register ? 'page' : undefined}>{t('Crear cuenta')}</Link>
        </div>
        <form id="auth-form" method="post" onSubmit={onSubmit} aria-busy={pending}>
          {register && <label>{t('Nombre')}<input name="name" autoComplete="name" maxLength={70} placeholder={t('Tu nombre')} required /></label>}
          <label>{t('Correo electrónico')}<input name="email" type="email" autoComplete="username" maxLength={254} placeholder={t('tu@correo.com')} required /></label>
          <div className="field"><label>{t('Contraseña')}<input name="password" type="password" minLength={register ? minPasswordLength : undefined} maxLength={maxPasswordLength}
            autoComplete={register ? 'new-password' : 'current-password'} aria-describedby={register ? 'password-help' : undefined} required /></label>
            {register && <small id="password-help">{t(registrationPasswordHelp)}</small>}
          </div>
          <p className="form-error" role="alert" hidden={!displayedError}>{displayedError}</p>
          <button className="button primary" type="submit" disabled={pending}>{t(register ? 'Crear cuenta' : 'Iniciar sesión')} <Icon name="arrow" /></button>
        </form>
        <Link href="/" className="text-link auth-back">{t('Volver al inicio')}<Icon name="left" /></Link>
      </div></section>
    </main>
  </>;
}
