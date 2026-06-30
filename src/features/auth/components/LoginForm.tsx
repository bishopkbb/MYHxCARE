'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeOffIcon, LockKeyhole, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { loginSchema, type LoginFormValues } from '@features/auth/schemas/loginSchema';
import { useAuth } from '@hooks/useAuth';

export function LoginForm() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login(values);
      router.replace('/dashboard');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
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

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && (
          <div
            role="alert"
            className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm"
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
              className="bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-md border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none disabled:opacity-50"
            />
          </div>
          {errors.identifier && (
            <p className="text-destructive text-xs">{errors.identifier.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-foreground text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <LockKeyhole className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              placeholder="Enter your password"
              {...register('password')}
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
          {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring mt-2 w-full rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link href="/password-reset" className="text-primary underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </div>
  );
}
