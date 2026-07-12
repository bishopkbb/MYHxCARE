import type { NextConfig } from 'next';

const isDev = process.env['NODE_ENV'] !== 'production';

function extractOrigin(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl).origin;
  } catch {
    return '';
  }
}

const apiOrigin = extractOrigin(process.env['NEXT_PUBLIC_API_BASE_URL']);
const wsOrigin = extractOrigin(process.env['NEXT_PUBLIC_WS_URL']);
const connectSrc = ["'self'", apiOrigin, wsOrigin].filter(Boolean).join(' ');

const csp = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for hydration scripts and ShadCN/Tailwind
  // needs it for style-src. Replace both with per-request nonces via proxy.ts
  // in Phase 3 once the auth layer is in place.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(!isDev ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // HSTS only in production — dev runs on HTTP and HSTS would break it
  ...(!isDev
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)',
  },
  // 0 = disable the legacy XSS auditor (deprecated, exploitable). CSP handles XSS.
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  // Standalone output for Docker/DigitalOcean. Vercel manages its own
  // deployment pipeline and does not need (and can conflict with) standalone mode.
  ...(process.env['VERCEL'] !== '1' ? { output: 'standalone' as const } : {}),
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Service worker must never be served from cache — browsers need to
        // see the latest version on every page load to detect SW updates.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
