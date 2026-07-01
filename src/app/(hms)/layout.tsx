import type { ReactNode } from 'react';

import { AppShell } from '@components/shared/AppShell';
import { AuthGuard } from '@components/shared/AuthGuard';

export default function HmsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
