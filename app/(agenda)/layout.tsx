import type { ReactNode } from 'react';
import { QualyProvider } from '../qualy.tsx';
import { requestAccount } from '../session-server.ts';

export default async function PlannerLayout({ children }: { children: ReactNode }) {
  const account = await requestAccount().catch(() => undefined);
  if (!account) return children;
  return <QualyProvider>{children}</QualyProvider>;
}
