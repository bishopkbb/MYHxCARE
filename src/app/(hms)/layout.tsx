import type { ReactNode } from 'react';

import { AppShell } from '@components/shared/AppShell';

export default function HmsLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
