'use client';

import { Bell, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@hooks/useAuth';
import { cn } from '@lib/utils';

// Maps URL path segments to human-readable labels.
// Dynamic segments (IDs like pat_001, enc_abc) are not in this map and are
// silently skipped — the breadcrumb shows only named structural segments.
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  patients: 'Patients',
  folder: 'Medical Folder',
  timeline: 'Timeline',
  encounters: 'OPD Queue',
  notes: 'Clinical Notes',
  prescriptions: 'Prescriptions',
  orders: 'Lab Orders',
  pharmacy: 'Pharmacy',
  dispense: 'Dispensing Queue',
  inventory: 'Drug Inventory',
  transfers: 'Transfers',
  lab: 'Laboratory',
  samples: 'Sample Tracking',
  results: 'Result Entry',
  'blood-bank': 'Blood Bank',
  billing: 'Finance',
  charges: 'Billing & Charges',
  payments: 'Payments',
  emergency: 'Emergency',
  wards: 'Wards',
  beds: 'Bed Management',
  occupancy: 'Occupancy',
  'duty-roster': 'Duty Roster',
  roster: 'Duty Roster Calendar',
  templates: 'Shift Templates',
  assignments: 'Staff Assignment',
  'on-call': 'On-Call Schedule',
  analytics: 'Workforce Analytics',
  admin: 'Administration',
  notifications: 'Notifications',
  collaboration: 'Collaboration',
  settings: 'Settings',
  sessions: 'Active Sessions',
  devices: 'Trusted Devices',
};

type Breadcrumb = { label: string; href: string };

function buildBreadcrumbs(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Breadcrumb[] = [];
  let path = '';

  for (const segment of segments) {
    path += `/${segment}`;
    const label = SEGMENT_LABELS[segment];
    if (label) crumbs.push({ label, href: path });
  }

  return crumbs;
}

interface NotificationBellProps {
  unreadCount?: number;
}

function NotificationBell({ unreadCount = 0 }: NotificationBellProps) {
  return (
    <Link
      href="/notifications"
      aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : 'Notifications'}
      className={cn(
        'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        'focus-visible:ring-ring relative flex size-8 items-center justify-center',
        'rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none',
      )}
    >
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-semibold"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

interface AppTopbarProps {
  onMenuToggle: () => void;
}

export function AppTopbar({ onMenuToggle }: AppTopbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4">
      {/* Hamburger — mobile only, opens the sidebar drawer */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Breadcrumb / page title */}
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        {breadcrumbs.length <= 1 ? (
          <h1 className="text-foreground truncate text-sm font-semibold">
            {breadcrumbs[0]?.label ?? 'MYHxCare HMS'}
          </h1>
        ) : (
          <ol className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <li key={crumb.href} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <span className="text-muted-foreground select-none" aria-hidden="true">
                      /
                    </span>
                  )}
                  {isLast ? (
                    <span
                      aria-current="page"
                      className="text-foreground max-w-[200px] truncate font-semibold"
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground max-w-[150px] truncate transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </nav>

      {/* Right side: department context + notification bell */}
      <div className="flex shrink-0 items-center gap-3">
        {user?.department && (
          <span className="text-muted-foreground hidden text-xs sm:block">{user.department}</span>
        )}

        {/* unreadCount wired to real value when notifications module is built */}
        <NotificationBell unreadCount={0} />
      </div>
    </header>
  );
}
