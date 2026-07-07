'use client';

import { useCallback, useState, type ReactNode } from 'react';

import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7FAFC]">
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopbar onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
