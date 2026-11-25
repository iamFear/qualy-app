import type { ReactNode } from 'react';
import { QualyProvider } from '../qualy.tsx';

export default function PlannerLayout({ children }: { children: ReactNode }) {
  return <QualyProvider>{children}</QualyProvider>;
}
