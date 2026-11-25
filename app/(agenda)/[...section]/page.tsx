import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isSection, titles } from '../../../lib/sections.ts';
import { translate } from '../../../lib/i18n.ts';
import { requestLanguage } from '../../request-language.ts';
import { PlannerUnavailable, QualyPage } from '../../qualy.tsx';
import { requestAccount } from '../../session-server.ts';

type PlannerPage = PageProps<'/[...section]'>;

async function getRoute(params: PlannerPage['params']) {
  const { section } = await params;
  const route = '/' + section.join('/');
  if (!isSection(route) || route === '/cuenta') notFound();
  return route;
}

export async function generateMetadata({ params }: Pick<PlannerPage, 'params'>): Promise<Metadata> {
  const [route, locale] = await Promise.all([getRoute(params), requestLanguage()]);
  return { title: translate(locale, titles[route]) };
}

export default async function Page({ params }: PlannerPage) {
  const route = await getRoute(params);
  let account;
  try {
    account = await requestAccount();
  } catch {
    return <PlannerUnavailable />;
  }
  if (!account) redirect('/cuenta');
  return <QualyPage route={route} />;
}
