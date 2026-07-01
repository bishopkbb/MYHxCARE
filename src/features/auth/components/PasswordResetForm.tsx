'use client';

import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { authService } from '@lib/auth/authService';

type FormState = 'idle' | 'submitting' | 'success';

export function PasswordResetForm() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError(null);
    setFormState('submitting');
    try {
      await authService.passwordResetRequest(identifier.trim());
      setFormState('success');
    } catch {
      setError('Something went wrong. Please try again.');
      setFormState('idle');
    }
  }

  if (formState === 'success') {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-6">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            If that account exists, password reset instructions have been sent. Check your inbox and
            spam folder.
          </p>
        </div>
        <Link href="/login" className="text-primary text-sm underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Enter your staff ID or email address and we&apos;ll send reset instructions.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && (
          <div
            role="alert"
            className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm"
          >
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="reset-identifier" className="text-foreground text-sm font-medium">
            Staff ID or Email
          </label>
          <div className="relative">
            <UserRound className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              id="reset-identifier"
              type="text"
              autoComplete="username"
              autoFocus
              disabled={formState === 'submitting'}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
              }}
              placeholder="e.g. ADM-001 or dr.adaeze@unizik.edu.ng"
              className="bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={formState === 'submitting' || !identifier.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-2 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {formState === 'submitting' ? 'Sending…' : 'Send reset instructions'}
        </button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
