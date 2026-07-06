import type { Metadata } from 'next';
import Image from 'next/image';

import { LoginForm } from '@features/auth/components/LoginForm';

export const metadata: Metadata = { title: { absolute: 'MYHxCare HMS' } };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-[#F7FAFC]">
      {/* ── Left brand panel ─────────────────────────────────────────── */}
      <aside
        className="hidden min-h-screen w-[41.5%] shrink-0 flex-col px-12.5 pt-64.75 lg:flex"
        style={{ background: '#25464D' }}
      >
        {/* "SECURE CLINICAL PLATFORM" badge */}
        <div
          className="inline-flex w-fit items-center rounded-lg border px-5.5 py-2"
          style={{ background: '#1F3D43', borderColor: 'rgba(255,255,255,0.20)' }}
        >
          <span className="font-sans text-base font-medium tracking-wide text-[#00B4D8] uppercase">
            Secure Clinical Platform
          </span>
        </div>

        <h1 className="font-display mt-3 text-5xl leading-14 font-bold text-white">
          Unified Care.
        </h1>
        <h2 className="font-display text-[40px] leading-12 font-bold text-[#00B4D8]">
          One Platform.
        </h2>

        <p className="mt-5 max-w-95 text-base leading-6.5 text-white/60">
          MYHxCare HMS connects every clinical role from bedside to boardroom with real-time patient
          data, seamless workflows, and enterprise-grade security.
        </p>
      </aside>

      {/* ── Right content panel ───────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center px-4 pt-15.75 pb-5">
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="MYHxCare"
          width={100}
          height={100}
          priority
          className="size-25 object-contain"
        />

        {/* Form card */}
        <div
          className="mt-15 w-full max-w-130 rounded-lg border"
          style={{
            background: '#F7FAFC',
            borderColor: '#00B4D8',
            padding: '19px 50px 37px',
          }}
        >
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-auto pt-6 text-xs leading-4.5 text-[#8A98A3]">
          © 2026 MYHxCare Technologies. All rights reserved.
        </p>
      </main>
    </div>
  );
}
