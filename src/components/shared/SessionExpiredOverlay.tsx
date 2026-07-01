'use client';

import { EyeIcon, EyeOffIcon, LockKeyhole } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@hooks/useAuth';

export function SessionExpiredOverlay() {
  const { user, resumeSession } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firstName = user?.name.split(' ')[0] ?? 'there';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await resumeSession(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resume session. Try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-background mx-4 w-full max-w-sm rounded-xl border p-6 shadow-lg">
        <div className="mb-6 text-center">
          <div className="bg-primary/10 mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
            <LockKeyhole className="text-primary size-6" />
          </div>
          <h2 className="text-foreground text-lg font-semibold">Session expired</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back, {firstName}. Enter your password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="resume-password" className="text-foreground text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <LockKeyhole className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                id="resume-password"
                type={showPassword ? 'text' : 'password'}
                autoFocus
                autoComplete="current-password"
                disabled={isSubmitting}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                placeholder="Enter your password"
                className="bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border py-2 pr-10 pl-9 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => {
                  setShowPassword((v) => !v);
                }}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !password}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring w-full rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Resuming…' : 'Continue session'}
          </button>
        </form>

        <p className="text-muted-foreground mt-4 text-center text-xs">
          Not you?{' '}
          <a href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in as someone else
          </a>
        </p>
      </div>
    </div>
  );
}
