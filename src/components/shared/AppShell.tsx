'use client';

import { useState, type ReactNode } from 'react';

import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <AppSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
