import type { Metadata } from 'next';
import { translate } from '../../lib/i18n.ts';
import { AccessForm } from '../access-form.tsx';
import { QualyPage, QualyProvider } from '../qualy.tsx';
import { requestLanguage } from '../request-language.ts';
import { requestAccount } from '../session-server.ts';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translate(await requestLanguage(), 'Mi cuenta') };
}

export default async function AccountPage({ searchParams }: PageProps<'/cuenta'>) {
  const account = await requestAccount().catch(() => undefined);
  if (account) {
    return <QualyProvider><QualyPage route="/cuenta" /></QualyProvider>;
  }
  const register = (await searchParams).modo === 'registro';
  return <AccessForm key={String(register)} register={register} />;
}
