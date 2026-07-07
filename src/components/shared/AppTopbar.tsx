'use client';

import { Bell, Clock, Menu, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '@hooks/useAuth';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDateTime(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} — ${timePart}`;
}

function LiveClock() {
  const [label, setLabel] = useState(() => formatDateTime(new Date()));

  useEffect(() => {
    const tick = () => setLabel(formatDateTime(new Date()));
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-1.5" suppressHydrationWarning>
      <Clock className="shrink-0 text-[#25464D]" style={{ width: 12, height: 12 }} />
      <span className="text-sm leading-[22px] text-[#25464D]" suppressHydrationWarning>
        {label}
      </span>
    </div>
  );
}

interface AppTopbarProps {
  onMenuToggle: () => void;
}

export function AppTopbar({ onMenuToggle }: AppTopbarProps) {
  const { user } = useAuth();

  return (
    <header
      className="flex h-[72px] shrink-0 items-center bg-white"
      style={{ borderBottom: '1px solid rgba(37, 70, 77, 0.08)' }}
    >
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label="Open navigation menu"
        className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-md text-[#25464D]/60 transition-colors hover:bg-[#25464D]/5 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Search bar — 48px from topbar left edge, desktop only */}
      <div className="ml-12 hidden lg:block">
        <div className="relative">
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[#25464D]/40"
            style={{ width: 12, height: 12 }}
          />
          <input
            type="search"
            placeholder="Search patients, records, results…"
            aria-label="Search patients, records and results"
            className="h-9 w-96 rounded-[10px] pr-4 pl-9 text-xs leading-[18px] text-[#25464D] outline-none placeholder:text-[#25464D]/40 focus:ring-2 focus:ring-[#0098CC]/30"
            style={{ background: '#E6F8FD' }}
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right group */}
      <div className="mr-16 flex items-center gap-5">
        {/* Live date + time */}
        <LiveClock />

        {/* Separator */}
        <div className="h-[14px] w-px bg-[#25464D]/15" />

        {/* Refresh */}
        <button
          type="button"
          aria-label="Refresh"
          className="flex items-center justify-center text-[#25464D]/50 transition-colors hover:text-[#25464D]"
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
        </button>

        {/* Notification bell + red dot */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex items-center justify-center text-[#25464D]/50 transition-colors hover:text-[#25464D]"
        >
          <Bell style={{ width: 14, height: 14 }} />
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 size-2 rounded-full"
            style={{ background: '#FB2C36' }}
          />
        </button>

        {/* User avatar */}
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: '#00B4D8' }}
        >
          {getInitials(user?.name ?? '')}
        </div>
      </div>
    </header>
  );
}
