import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ServiceWorkerRegistrar } from '@lib/pwa/ServiceWorkerRegistrar';
import { OfflineBanner } from '@components/shared/OfflineBanner';
import { AuthProvider } from '@providers/AuthProvider';
import { FeatureFlagsProvider } from '@providers/FeatureFlagsProvider';
import { ReactQueryProvider } from '@providers/ReactQueryProvider';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ServiceWorkerRegistrar />
        <OfflineBanner />
        <ReactQueryProvider>
          <FeatureFlagsProvider>
            <AuthProvider>{children}</AuthProvider>
          </FeatureFlagsProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
