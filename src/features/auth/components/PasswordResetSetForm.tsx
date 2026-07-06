'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2, Eye, EyeOff, XCircle } from 'lucide-react';
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

  const inputClass = cn(
    'w-full h-12.5 rounded-[12px] border px-4 text-sm leading-5.5',
    'bg-[#0E2D3A]/4 border-[#006482]/18',
    'text-[#0D2630] placeholder:text-[#0D2630]/50',
    'focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/40 focus:border-[#00B4D8]',
    'disabled:opacity-50 transition-colors',
  );

  if (formState === 'success') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 w-full py-6 text-center duration-300">
        <div
          className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full"
          style={{ background: 'rgba(0, 180, 216, 0.12)' }}
        >
          <CheckCircle2 className="size-7 text-[#00B4D8]" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-[#0D2630]">Password updated</h2>
        <p className="mt-2 text-sm leading-5.5 text-[#8A98A3]">
          Your password has been changed successfully. Redirecting you to sign in…
        </p>
      </div>
    );
  }

  if (formState === 'invalid-token') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 w-full py-6 text-center duration-300">
        <div
          className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full"
          style={{ background: 'rgba(239, 68, 68, 0.10)' }}
        >
          <XCircle className="size-7 text-red-500" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-[#0D2630]">Link expired</h2>
        <p className="mt-2 text-sm leading-5.5 text-[#8A98A3]">
          This password reset link is invalid or has expired. Reset links are valid for 30 minutes.
        </p>
        <Link
          href="/password-reset"
          className="mt-6 flex h-13 items-center justify-center gap-2.5 rounded-[12px] text-sm font-medium text-white transition-opacity"
          style={{
            background: 'linear-gradient(135deg, #00B4D8 0%, #0077A8 100%)',
            boxShadow: '0px 4px 20px 0px rgba(0, 180, 216, 0.30)',
          }}
        >
          Request a new link
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in w-full duration-200">
      <h1 className="font-display text-center text-3xl leading-9.5 font-semibold text-[#0D2630]">
        Set new password
      </h1>
      <p className="mt-1.5 text-center text-sm leading-5.5 text-[#8A98A3]">
        Choose a strong password of at least 8 characters.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8">
        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {serverError}
          </div>
        )}

        {/* New password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm leading-5.5 font-medium text-[#0D2630]"
          >
            New password
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              disabled={isSubmitting}
              placeholder="At least 8 characters"
              {...register('password')}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={cn(inputClass, 'pr-12')}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-[#8A98A3] transition-colors hover:text-[#0D2630]"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="mt-4">
          <label
            htmlFor="confirmPassword"
            className="block text-sm leading-5.5 font-medium text-[#0D2630]"
          >
            Confirm new password
          </label>
          <div className="relative mt-1.5">
            <input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isSubmitting}
              placeholder="Re-enter your new password"
              {...register('confirmPassword')}
              aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
              className={cn(inputClass, 'pr-12')}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-[#8A98A3] transition-colors hover:text-[#0D2630]"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirm-error" className="mt-1 text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 flex h-13 w-full items-center justify-center gap-2.5 rounded-[12px] text-sm leading-5.5 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #00B4D8 0%, #0077A8 100%)',
            boxShadow: '0px 4px 20px 0px rgba(0, 180, 216, 0.30)',
          }}
        >
          {isSubmitting ? (
            'Updating…'
          ) : (
            <>
              Update password
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-xs leading-4.5 text-[#00B4D8] underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
