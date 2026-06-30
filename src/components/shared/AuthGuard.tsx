'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@hooks/useAuth';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <AuthLoadingSkeleton />;
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
