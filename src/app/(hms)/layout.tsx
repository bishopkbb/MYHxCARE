import type { ReactNode } from 'react';

import { AuthGuard } from '@components/shared/AuthGuard';
import { AppShell } from '@components/shared/AppShell';

export default function HmsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
