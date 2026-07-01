import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ServiceWorkerRegistrar } from '@lib/pwa/ServiceWorkerRegistrar';
import { AuthProvider } from '@providers/AuthProvider';
import { FeatureFlagsProvider } from '@providers/FeatureFlagsProvider';

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
        <FeatureFlagsProvider>
          <AuthProvider>{children}</AuthProvider>
        </FeatureFlagsProvider>
      </body>
    </html>
  );
}
