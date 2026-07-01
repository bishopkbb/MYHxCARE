'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@hooks/useAuth';
import { SessionExpiredOverlay } from './SessionExpiredOverlay';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isSessionExpired } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isSessionExpired) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, isSessionExpired, router]);

  if (isLoading) return <AuthLoadingSkeleton />;

  if (isSessionExpired) {
    return (
      <>
        <div className="pointer-events-none opacity-30 select-none">{children}</div>
        <SessionExpiredOverlay />
      </>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

function AuthLoadingSkeleton() {
  return (
    <div className="bg-background flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
        <p className="text-muted-foreground text-sm">Loading MYHxCare…</p>
      </div>
    </div>
  );
}
