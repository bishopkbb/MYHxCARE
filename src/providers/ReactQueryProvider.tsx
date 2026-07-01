'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Clinical data can change at any moment — keep stale window short.
        staleTime: 30_000,
        // Keep inactive queries in cache for 5 min so navigating back is instant.
        gcTime: 5 * 60_000,
        retry: 2,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
        // Re-fetch when a clinician returns to the tab — ensures fresh data
        // after stepping away from the workstation.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Never auto-retry mutations — clinical writes must be deliberate.
        // A duplicate prescription or dispense caused by a retry is a patient
        // safety issue.
        retry: 0,
      },
    },
  });
}

const isDev = process.env['NODE_ENV'] === 'development';

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  // useState ensures each SSR request gets its own QueryClient instance,
  // preventing data leaking between requests on the server.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isDev && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
