import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MYHxCare HMS',
    short_name: 'MYHxCare',
    description: 'Hospital Management System — Nnamdi Azikiwe University Medical Centre (UniZik)',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    // Placeholder — design team provides final brand colour in Phase 5
    theme_color: '#ffffff',
    icons: [
      {
        // Temporary favicon fallback — replace with 192×192 and 512×512 PNGs in Phase 5
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
