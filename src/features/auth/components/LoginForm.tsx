'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { loginSchema, type LoginFormValues } from '@features/auth/schemas/loginSchema';
import { getWorkspaceHomeRoute } from '@/config/workspaces';
import { useAuth } from '@hooks/useAuth';
import { AuthError } from '@lib/auth/authService';
import { cn } from '@lib/utils';

function getLoginErrorMessage(err: unknown): string {
  if (err instanceof AuthError) {
    switch (err.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid staff ID/email or password.';
      case 'ACCOUNT_LOCKED':
        return 'Your account has been locked. Contact IT support to unlock it.';
      case 'CONCURRENT_SESSION':
        return 'Another active session exists for this account. Sign out there first or contact IT.';
      default:
        return err.message;
    }
  }
  return 'Unable to sign in. Please try again.';
}

export function LoginForm() {
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(getWorkspaceHomeRoute(user.workspaceRole));
    }
  }, [isLoading, isAuthenticated, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', rememberMe: false },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const { rememberMe, ...credentials } = values;
      await login(credentials, rememberMe ?? false);
    } catch (err) {
      setServerError(getLoginErrorMessage(err));
    }
  }

  const inputClass = cn(
    'w-full h-12.5 rounded-[12px] border px-4 text-sm leading-5.5',
    'bg-[#0E2D3A]/4 border-[#006482]/18',
    'text-[#0D2630] placeholder:text-[#0D2630]/50',
    'focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/40 focus:border-[#00B4D8]',
    'disabled:opacity-50 transition-colors',
  );

  return (
    <div className="w-full">
      {/* Heading */}
      <h1 className="font-display text-center text-3xl leading-9.5 font-semibold text-[#0D2630]">
        Sign in
      </h1>
      <p className="mt-1.5 text-center text-sm leading-5.5 text-[#8A98A3]">
        Use your hospital-issued credentials. Unauthorized access is monitored and prosecuted.
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

        {/* Employee ID / Email */}
        <div>
          <label
            htmlFor="identifier"
            className="block text-sm leading-5.5 font-medium text-[#0D2630]"
          >
            Employee ID / Email
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
            <p className="mt-1 text-xs text-red-500">{errors.identifier.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm leading-5.5 font-medium text-[#0D2630]">
              Password
            </label>
            <Link
              href="/password-reset"
              tabIndex={-1}
              className="text-xs leading-4.5 text-[#00B4D8] underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              placeholder="Enter your secure password"
              {...register('password')}
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
            <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Keep me signed in */}
        <div className="mt-5 flex items-center gap-3">
          <input
            type="checkbox"
            id="rememberMe"
            {...register('rememberMe')}
            style={{ accentColor: '#00B4D8' }}
            className="size-4.5 cursor-pointer rounded border border-[#006482]/22 bg-[#0E2D3A]/4"
          />
          <label
            htmlFor="rememberMe"
            className="cursor-pointer text-sm leading-5.5 text-[#8A98A3] select-none"
          >
            Keep me signed in on this device
          </label>
        </div>

        {/* Sign In button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 flex h-13 w-full items-center justify-center gap-2.5 rounded-[12px] text-sm leading-5.5 font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #00B4D8 0%, #0077A8 100%)',
            boxShadow: '0px 4px 20px 0px rgba(0, 180, 216, 0.30)',
          }}
        >
          {isSubmitting ? (
            'Signing in…'
          ) : (
            <>
              Sign In
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      {/* Security Notice */}
      <div
        className="mt-6 flex items-start gap-3 rounded-[12px] border p-4"
        style={{ background: 'rgba(0, 119, 168, 0.05)', borderColor: 'rgba(0, 100, 130, 0.12)' }}
      >
        <ShieldCheck className="mt-px size-4 shrink-0 text-[#00B4D8]" aria-hidden />
        <p className="text-xs leading-4.5 text-[#8A98A3]">
          <span className="font-medium text-[#0D2630]">Security Notice:</span> This system is for
          authorized personnel only. All sessions are logged and audited. Suspicious activity
          triggers automatic account lockout after 3 failed attempts.
        </p>
      </div>

      {/* Compliance badges */}
      <div className="mt-5 flex items-center justify-center gap-4">
        {(['HIPAA', 'ISO 27001', 'NDPR'] as const).map((badge) => (
          <span
            key={badge}
            className="rounded-lg px-2.5 py-1 font-mono text-[11px] leading-4 tracking-[0.04em] text-[#8A98A3]"
            style={{ background: 'rgba(14, 45, 58, 0.06)' }}
          >
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}
