import type { ReactNode } from 'react';

import { AppShell } from '@components/shared/AppShell';
import { AuthGuard } from '@components/shared/AuthGuard';
import { PermissionsProvider } from '@providers/PermissionsProvider';
import { WsProvider } from '@providers/WsProvider';

export default function HmsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <WsProvider>
        <PermissionsProvider>
          <AppShell>{children}</AppShell>
        </PermissionsProvider>
      </WsProvider>
    </AuthGuard>
  );
}
