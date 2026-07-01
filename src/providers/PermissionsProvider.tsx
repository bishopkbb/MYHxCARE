'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useAuth } from '@hooks/useAuth';

export type PermissionsContextValue = {
  permissions: ReadonlySet<string>;
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
  canAll: (...permissions: string[]) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within <PermissionsProvider>');
  return ctx;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const value = useMemo<PermissionsContextValue>(() => {
    const set = new Set<string>(user?.permissions ?? []);
    return {
      permissions: set,
      can: (permission: string) => set.has(permission),
      canAny: (...perms: string[]) => perms.some((p) => set.has(p)),
      canAll: (...perms: string[]) => perms.every((p) => set.has(p)),
    };
  }, [user]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}
