import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),

  // Public — inlined into client bundles by Next.js at build time.
  // These must be read with literal bracket keys here so the bundler can
  // statically analyse which NEXT_PUBLIC_* values to inline. Spreading
  // process.env defeats that analysis.
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url(),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']),
});

const result = schema.safeParse({
  NODE_ENV: process.env['NODE_ENV'],
  NEXT_PUBLIC_API_BASE_URL: process.env['NEXT_PUBLIC_API_BASE_URL'],
  NEXT_PUBLIC_WS_URL: process.env['NEXT_PUBLIC_WS_URL'],
  NEXT_PUBLIC_APP_ENV: process.env['NEXT_PUBLIC_APP_ENV'],
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
