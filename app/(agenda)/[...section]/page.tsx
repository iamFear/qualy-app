import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isSection, titles } from '../../../lib/sections.ts';
import { translate } from '../../../lib/i18n.ts';
import { requestLanguage } from '../../request-language.ts';
import { QualyPage } from '../../qualy.tsx';

type PlannerPage = PageProps<'/[...section]'>;

async function getRoute(params: PlannerPage['params']) {
  const { section } = await params;
  const route = '/' + section.join('/');
  if (!isSection(route)) notFound();
  return route;
}

export async function generateMetadata({ params }: Pick<PlannerPage, 'params'>): Promise<Metadata> {
  const [route, locale] = await Promise.all([getRoute(params), requestLanguage()]);
  return { title: translate(locale, titles[route]) };
}

export default async function Page({ params, searchParams }: PlannerPage) {
  const route = await getRoute(params);
  const register = route === '/cuenta' && (await searchParams).modo === 'registro';
  return <QualyPage route={route} register={register} />;
}
