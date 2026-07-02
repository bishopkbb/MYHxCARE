'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, EyeIcon, EyeOffIcon, LockKeyhole, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  passwordResetSetSchema,
  type PasswordResetSetValues,
} from '@features/auth/schemas/passwordResetSetSchema';
import { authService, AuthError } from '@lib/auth/authService';
import { cn } from '@lib/utils';

type FormState = 'idle' | 'success' | 'invalid-token';

function getErrorMessage(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  return 'Unable to update your password. Please try again.';
}

interface PasswordResetSetFormProps {
  token: string;
}

export function PasswordResetSetForm({ token }: PasswordResetSetFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Redirect to login 2s after success so the user can read the confirmation
  useEffect(() => {
    if (formState !== 'success') return;
    const timer = setTimeout(() => router.replace('/login'), 2000);
    return () => clearTimeout(timer);
  }, [formState, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetSetValues>({
    resolver: zodResolver(passwordResetSetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: PasswordResetSetValues) {
    setServerError(null);
    try {
      await authService.resetPassword(token, values.password);
      setFormState('success');
    } catch (err) {
      if (err instanceof AuthError && err.code === 'INVALID_TOKEN') {
        setFormState('invalid-token');
      } else {
        setServerError(getErrorMessage(err));
      }
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

      {formState === 'success' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card rounded-lg border p-6 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary size-6" />
            </div>
            <h2 className="text-foreground text-base font-semibold">Password updated</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Your password has been changed successfully. Redirecting you to sign in…
            </p>
          </div>
        </div>
      )}

      {formState === 'invalid-token' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card rounded-lg border p-6 text-center">
            <div className="bg-destructive/10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
              <XCircle className="text-destructive size-6" />
            </div>
            <h2 className="text-foreground text-base font-semibold">Link expired</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              This password reset link is invalid or has expired. Reset links are valid for 30
              minutes.
            </p>
            <Link
              href="/password-reset"
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-4 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
            >
              Request a new link
            </Link>
          </div>
        </div>
      )}

      {formState === 'idle' && (
        <div className="animate-in fade-in duration-200">
          <div className="mb-6">
            <h2 className="text-foreground text-base font-semibold">Set a new password</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose a strong password of at least 8 characters.
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
              <label htmlFor="password" className="text-foreground text-sm font-medium">
                New password
              </label>
              <div className="relative">
                <LockKeyhole className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  disabled={isSubmitting}
                  placeholder="At least 8 characters"
                  {...register('password')}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={cn(
                    'bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border py-2 pr-10 pl-9 text-sm focus:ring-2 focus:outline-none disabled:opacity-50',
                    errors.password && 'border-destructive focus:ring-destructive',
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors duration-150"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-destructive text-xs">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-foreground text-sm font-medium">
                Confirm new password
              </label>
              <div className="relative">
                <LockKeyhole className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  placeholder="Re-enter your new password"
                  {...register('confirmPassword')}
                  aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                  className={cn(
                    'bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border py-2 pr-10 pl-9 text-sm focus:ring-2 focus:outline-none disabled:opacity-50',
                    errors.confirmPassword && 'border-destructive focus:ring-destructive',
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors duration-150"
                >
                  {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirm-error" className="text-destructive text-xs">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-2 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Updating password…' : 'Set new password'}
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
