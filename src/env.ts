import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),

  // Public — inlined into client bundles by Next.js at build time.
  // These must be read with literal bracket keys here so the bundler can
  // statically analyse which NEXT_PUBLIC_* values to inline. Spreading
  // process.env defeats that analysis.
  //
  // API_BASE_URL and WS_URL are optional in development/demo mode because
  // those environments use mock data and never call the real backend.
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_WS_URL: z.string().url().optional(),
  // Default to 'demo' when the var is absent so preview/hobby deployments
  // that omit this var don't crash the client bundle — IS_MOCK will be true.
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'demo', 'staging', 'production']).default('demo'),
});

const result = schema.safeParse({
  NODE_ENV: process.env['NODE_ENV'],
  // Convert empty string → undefined so .optional() accepts it cleanly.
  NEXT_PUBLIC_API_BASE_URL: process.env['NEXT_PUBLIC_API_BASE_URL'] || undefined,
  NEXT_PUBLIC_WS_URL: process.env['NEXT_PUBLIC_WS_URL'] || undefined,
  NEXT_PUBLIC_APP_ENV: process.env['NEXT_PUBLIC_APP_ENV'] || undefined,
});

if (!result.success) {
  const lines = result.error.issues
    .map((issue) => `  ${String(issue.path.join('.'))}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `Missing or invalid environment variables — MYHxCare cannot start.\n` +
      `Copy .env.example to .env.local and set the required values.\n\n` +
      `Invalid vars:\n${lines}`,
  );
}

export const env = result.data;

export type Env = z.infer<typeof schema>;

// Single source of truth for mock mode — true in development and demo deployments.
// When true, all services return mock data and no real API calls are made.
export const IS_MOCK =
  env.NEXT_PUBLIC_APP_ENV === 'development' || env.NEXT_PUBLIC_APP_ENV === 'demo';
