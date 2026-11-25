import type { Metadata } from 'next';
import Link from 'next/link';
import { translate } from '../lib/i18n.ts';
import { BrandMark } from './brand-mark.tsx';
import { Icon } from './ui-icon.tsx';
import { LanguageSwitch } from './language.tsx';
import { requestLanguage } from './request-language.ts';
import './landing.css';

const plannerDescription = 'Planifica tus entrenamientos, registra tus hábitos diarios y revisa cómo te fue en la semana.';
const features = [
  {
    glyph: 'calendar',
    title: 'Agenda de entrenamientos',
    description: 'Elige qué días entrenar y prepara tus sesiones con ejercicios, series y descansos.',
  },
  {
    glyph: 'habits',
    title: 'Registro de hábitos',
    description: 'Define tus metas diarias y marca lo que hiciste o cuánto avanzaste.',
  },
  {
    glyph: 'chart',
    title: 'Progreso semanal',
    description: 'Consulta tus sesiones y hábitos completados, y los días en los que tuviste actividad.',
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestLanguage();
  return {
    title: translate(locale, 'Entrenamientos y hábitos en tu agenda'),
    description: translate(locale, plannerDescription),
  };
}

export default async function Landing() {
  const locale = await requestLanguage();
  const t = (message: string) => translate(locale, message);

  return <div className="landing" id="inicio">
    <header className="landing-header">
      <div className="landing-container landing-header-inner">
        <Link href="/" className="brand landing-brand"><BrandMark size={36} /><span>Qualy</span></Link>
        <div className="landing-header-actions">
          <LanguageSwitch />
          <div className="landing-account-links">
            <Link href="/cuenta" className="landing-nav-link">{t('Iniciar sesión')}</Link>
            <Link href="/cuenta?modo=registro" className="button landing-button-outline landing-header-signup">{t('Crear cuenta')}</Link>
          </div>
        </div>
      </div>
    </header>
    <main id="contenido" className="landing-container" tabIndex={-1}>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-intro">
          <h1 id="landing-title">{t('Dale ritmo')}<br />{' '}{t('a tu semana.')}</h1>
          <p>{t(plannerDescription)}</p>
          <div className="landing-hero-actions">
            <Link href="/hoy" className="button landing-button-primary">{t('Probar la demo')} <Icon name="arrow" /></Link>
            <Link href="/cuenta?modo=registro" className="button landing-button-outline">{t('Crear cuenta')}</Link>
          </div>
        </div>
        <figure className="landing-figure">
          <img className="landing-photo" src="/assets/qualy-ritmo.webp" alt={t('Una persona se ata los cordones en una pista de entrenamiento.')}
            width="1280" height="960" fetchPriority="high" />
          <figcaption className="landing-example">
            <strong className="landing-example-title">{t('Hoy en la demo')}</strong>
            <div className="landing-example-row">
              <span className="landing-example-icon"><Icon name="strength" /></span>
              <span>{t('Sesión de fuerza')}</span>
              <Icon name="check" className="landing-example-complete" /><span className="sr-only">{t('Completada')}</span>
            </div>
            <div className="landing-example-row">
              <span className="landing-example-icon"><Icon name="water" /></span>
              <span>{t('Hidratación')}</span><span className="landing-example-count">{t('3 de 5 vasos')}</span>
              <span className="landing-example-progress" aria-hidden="true" />
            </div>
          </figcaption>
        </figure>
      </section>
      <section className="landing-features" id="como-funciona" aria-labelledby="landing-features-title">
        <h2 id="landing-features-title">{t('Una agenda para tu rutina.')}</h2>
        <ul className="landing-feature-list">
          {features.map(({ glyph, title, description }) => <li key={glyph}>
            <span className="landing-feature-icon"><Icon name={glyph} /></span>
            <h3>{t(title)}</h3><p>{t(description)}</p>
          </li>)}
        </ul>
      </section>
      <section className="landing-closing" aria-labelledby="landing-closing-title">
        <div className="landing-closing-copy">
          <h2 id="landing-closing-title">{t('Arma tu próxima semana.')}</h2>
          <p>{t('Crea una cuenta para guardar tu agenda y continuar con tu rutina.')}</p>
          <Link href="/cuenta?modo=registro" className="button landing-button-lime">{t('Crear cuenta')} <Icon name="arrow" /></Link>
        </div>
      </section>
    </main>
    <footer className="landing-container landing-footer">
      <Link href="/" className="brand landing-brand"><BrandMark size={28} /><span>Qualy</span></Link>
      <a href="#inicio" className="landing-nav-link">{t('Volver arriba')}</a>
    </footer>
  </div>;
}
