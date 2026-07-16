import type { Metadata } from 'next';
import { DM_Mono, DM_Sans, Outfit } from 'next/font/google';

import { ServiceWorkerRegistrar } from '@lib/pwa/ServiceWorkerRegistrar';
import { OfflineBanner } from '@components/shared/OfflineBanner';
import { Toaster } from '@components/shared/Toaster';
import { AuthProvider } from '@providers/AuthProvider';
import { AvatarProvider } from '@providers/AvatarProvider';
import { FeatureFlagsProvider } from '@providers/FeatureFlagsProvider';
import { ReactQueryProvider } from '@providers/ReactQueryProvider';
import { ToastProvider } from '@providers/ToastProvider';

import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '900'],
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['600', '700'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: {
    default: 'MYHxCare HMS',
    template: '%s — MYHxCare HMS',
  },
  description: 'Hospital Management System — Nnamdi Azikiwe University Medical Centre (UniZik)',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${outfit.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ServiceWorkerRegistrar />
        <OfflineBanner />
        <ReactQueryProvider>
          <FeatureFlagsProvider>
            <AuthProvider>
              <AvatarProvider>
                <ToastProvider>
                  {children}
                  <Toaster />
                </ToastProvider>
              </AvatarProvider>
            </AuthProvider>
          </FeatureFlagsProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
