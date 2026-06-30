import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">{children}</div>
  );
}
