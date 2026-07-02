'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  passwordResetRequestSchema,
  type PasswordResetRequestValues,
} from '@features/auth/schemas/passwordResetRequestSchema';
import { authService, AuthError } from '@lib/auth/authService';
import { cn } from '@lib/utils';

type FormState = 'idle' | 'success';

function getErrorMessage(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  return 'Unable to send reset link. Please try again.';
}

export function PasswordResetRequestForm() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { identifier: '' },
  });

  async function onSubmit(values: PasswordResetRequestValues) {
    setServerError(null);
    try {
      await authService.passwordResetRequest(values.identifier);
      setFormState('success');
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">MYHxCare HMS</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Nnamdi Azikiwe University Medical Centre
        </p>
      </div>

      {formState === 'success' ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card rounded-lg border p-6 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary size-6" />
            </div>
            <h2 className="text-foreground text-base font-semibold">Check your email</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              We&apos;ve sent password reset instructions to your registered email address. The link
              expires in 30 minutes.
            </p>
            <p className="text-muted-foreground mt-3 text-xs">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => setFormState('idle')}
                className="text-primary underline-offset-4 hover:underline"
              >
                try again
              </button>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-200">
          <div className="mb-6">
            <h2 className="text-foreground text-base font-semibold">Reset your password</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Enter your staff ID or registered email address.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {serverError && (
              <div
                role="alert"
                className="bg-destructive/10 text-destructive animate-in fade-in rounded-md px-4 py-3 text-sm duration-200"
              >
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="identifier" className="text-foreground text-sm font-medium">
                Staff ID or Email
              </label>
              <div className="relative">
                <UserRound className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  disabled={isSubmitting}
                  placeholder="e.g. ADM-001 or dr.adaeze@unizik.edu.ng"
                  {...register('identifier')}
                  className={cn(
                    'bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none disabled:opacity-50',
                    errors.identifier && 'border-destructive focus:ring-destructive',
                  )}
                />
              </div>
              {errors.identifier && (
                <p className="text-destructive text-xs">{errors.identifier.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-2 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </div>
      )}

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
