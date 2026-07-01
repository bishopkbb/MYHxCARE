'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="text-destructive size-12" />
      <div>
        <h2 className="text-foreground text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          An unexpected error occurred. Your work has been saved where possible.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground mt-2 font-mono text-xs">Reference: {error.digest}</p>
        ) : null}
      </div>
      <button
        onClick={reset}
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Try again
      </button>
    </div>
  );
}
