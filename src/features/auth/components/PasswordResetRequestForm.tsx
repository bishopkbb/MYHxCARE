'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
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
        <h2 className="font-display text-2xl font-semibold text-[#0D2630]">Check your email</h2>
        <p className="mt-2 text-sm leading-5.5 text-[#8A98A3]">
          We&apos;ve sent password reset instructions to your registered email. The link expires in
          30 minutes.
        </p>
        <p className="mt-3 text-sm leading-5 text-[#8A98A3]">
          Didn&apos;t receive it? Check your spam folder or{' '}
          <button
            type="button"
            onClick={() => setFormState('idle')}
            className="text-[#00B4D8] underline-offset-4 hover:underline"
          >
            try again
          </button>
          .
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm leading-5 text-[#00B4D8] underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in w-full duration-200">
      <h1 className="font-display text-center text-3xl leading-9.5 font-semibold text-[#0D2630]">
        Reset password
      </h1>
      <p className="mt-1.5 text-center text-sm leading-5.5 text-[#8A98A3]">
        Enter your staff ID or registered email and we&apos;ll send you reset instructions.
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

        <div>
          <label
            htmlFor="identifier"
            className="block text-sm leading-5.5 font-medium text-[#0D2630]"
          >
            Staff ID or Email
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            autoFocus
            disabled={isSubmitting}
            placeholder="e.g. EMP-00142 or dr.obi@nauth.gov.ng"
            {...register('identifier')}
            className={cn(inputClass, 'mt-1.5')}
          />
          {errors.identifier && (
            <p className="mt-1 text-sm text-red-500">{errors.identifier.message}</p>
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
            'Sending…'
          ) : (
            <>
              Send reset link
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm leading-5 text-[#00B4D8] underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
