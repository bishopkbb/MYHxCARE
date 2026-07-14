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
  const datePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
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
      <Clock className="shrink-0 text-[#25464D]" style={{ width: 18, height: 18 }} />
      <span className="text-sm leading-5.5 text-[#25464D]" suppressHydrationWarning>
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
      className="flex h-18 shrink-0 items-center bg-white"
      style={{ borderBottom: '1px solid rgba(37, 70, 77, 0.08)' }}
    >
      {/* Hamburger — mobile only */}
      <button
        type="button"
        onClick={onMenuToggle}
        aria-label="Open navigation menu"
        className="ml-4 flex size-11 shrink-0 items-center justify-center rounded-md text-[#25464D]/60 transition-colors duration-150 hover:bg-[#25464D]/5 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Search bar — desktop only; width scales with breakpoint so the topbar
          never overflows at lg with the expanded sidebar */}
      <div className="ml-6 hidden lg:block xl:ml-12">
        <div className="relative">
          <Search
            className="absolute top-1/2 left-[9px] -translate-y-1/2 text-[#25464D]/40"
            style={{ width: 18, height: 18 }}
          />
          <input
            type="search"
            placeholder="Search patients, records, results…"
            aria-label="Search patients, records and results"
            className="h-9 w-56 rounded-[10px] pr-4 pl-9 text-sm leading-5 text-[#25464D] outline-none placeholder:text-[#25464D] focus:ring-2 focus:ring-[#0098CC]/30 xl:w-96"
            style={{ background: '#E6F8FD' }}
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right group */}
      <div className="mr-4 flex items-center gap-4 lg:mr-6 xl:mr-16 xl:gap-5">
        {/* Clock + separator + refresh — desktop only */}
        <div className="hidden items-center gap-5 lg:flex">
          <LiveClock />
          <div className="h-3.5 w-px bg-[#25464D]/15" />
          <button
            type="button"
            aria-label="Refresh"
            className="flex items-center justify-center text-[#25464D]/50 transition-colors duration-150 hover:text-[#25464D] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <RefreshCw style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Notification bell + red dot */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex items-center justify-center text-[#25464D]/50 transition-colors duration-150 hover:text-[#25464D] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
        >
          <Bell style={{ width: 18, height: 18 }} />
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 size-2 rounded-full"
            style={{ background: '#FB2C36' }}
          />
        </button>

        {/* User avatar */}
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white lg:size-12.5"
          style={{ background: '#00B4D8' }}
        >
          {getInitials(user?.name ?? '')}
        </div>
      </div>
    </header>
  );
}
