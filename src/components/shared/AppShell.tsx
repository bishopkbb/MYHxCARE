'use client';

import { useCallback, useState, type ReactNode } from 'react';

import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { HelpBeacon } from './HelpBeacon';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);
  const handleToggleCollapse = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <div className="flex min-h-screen bg-[#F7FAFC]">
      <AppSidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>
      <HelpBeacon />
    </div>
  );
}
