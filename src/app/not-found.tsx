import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground/40 font-mono text-8xl font-bold tracking-tight select-none">
        404
      </p>
      <div>
        <h1 className="text-foreground text-xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link href="/dashboard" className="text-primary text-sm underline-offset-4 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
