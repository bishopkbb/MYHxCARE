import type { ReactNode } from 'react';

import { AppShell } from '@components/shared/AppShell';
import { AuthGuard } from '@components/shared/AuthGuard';
import { ErrorBoundary } from '@components/shared/ErrorBoundary';
import { PermissionsProvider } from '@providers/PermissionsProvider';
import { WsProvider } from '@providers/WsProvider';

export default function HmsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <WsProvider>
        <PermissionsProvider>
          <AppShell>
            <ErrorBoundary>{children}</ErrorBoundary>
          </AppShell>
        </PermissionsProvider>
      </WsProvider>
    </AuthGuard>
  );
}
