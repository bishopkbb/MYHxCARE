'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@lib/utils';
import { useRevokeAllSessionsMutation, useSessionsQuery } from '@features/auth/hooks/useSessions';
import { SessionCard } from './SessionCard';

function SessionCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-start gap-4">
        <div className="bg-muted size-10 shrink-0 animate-pulse rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="bg-muted h-4 w-48 animate-pulse rounded" />
          <div className="bg-muted h-3 w-32 animate-pulse rounded" />
          <div className="bg-muted h-3 w-40 animate-pulse rounded" />
        </div>
      </div>
    </div>
  );
}

export function ActiveSessionsList() {
  const { data: sessions, isLoading, isError, refetch } = useSessionsQuery();
  const { mutate: revokeAll, isPending: isRevokingAll } = useRevokeAllSessionsMutation();
  const [confirmingAll, setConfirmingAll] = useState(false);

  const otherSessionCount = sessions?.filter((s) => !s.isCurrent).length ?? 0;

  function handleRevokeAll() {
    if (!confirmingAll) {
      setConfirmingAll(true);
      return;
    }
    revokeAll(undefined, {
      onSettled: () => setConfirmingAll(false),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight">Active Sessions</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage where you&apos;re signed in to MYHxCare HMS.
          </p>
        </div>

        {otherSessionCount > 0 && (
          <div className="flex items-center gap-2">
            {confirmingAll && !isRevokingAll && (
              <button
                type="button"
                onClick={() => setConfirmingAll(false)}
                className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 transition-colors duration-150 hover:underline"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleRevokeAll}
              disabled={isRevokingAll}
              className={cn(
                'focus-visible:ring-ring flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                confirmingAll
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'text-muted-foreground hover:border-destructive hover:text-destructive border',
              )}
            >
              <LogOut className="size-4" />
              {isRevokingAll
                ? 'Signing out…'
                : confirmingAll
                  ? 'Yes, sign out all'
                  : 'Sign out all other devices'}
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          <SessionCardSkeleton />
          <SessionCardSkeleton />
          <SessionCardSkeleton />
        </div>
      )}

      {isError && (
        <div className="bg-card rounded-lg border p-6 text-center">
          <p className="text-muted-foreground text-sm">Unable to load sessions.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-primary mt-2 text-sm underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {sessions && (
        <div className="animate-in fade-in space-y-3 duration-200">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
