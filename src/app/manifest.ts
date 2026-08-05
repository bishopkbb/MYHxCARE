import type { MetadataRoute } from 'next';

import { TENANT_CONFIG } from '@/constants/tenant';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MYHxCare HMS',
    short_name: 'MYHxCare',
    description: `Hospital Management System — ${TENANT_CONFIG.name}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    // Placeholder — design team provides final brand colour in Phase 5
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
