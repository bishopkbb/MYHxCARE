'use client';

import { ShieldX } from 'lucide-react';
import Link from 'next/link';

export function Forbidden() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <ShieldX className="text-muted-foreground size-12" />
      <div>
        <h1 className="text-foreground text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          You don&apos;t have permission to view this page. Contact your administrator if you think
          this is an error.
        </p>
      </div>
      <Link href="/dashboard" className="text-primary text-sm underline-offset-4 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
