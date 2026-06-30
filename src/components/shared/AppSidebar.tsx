'use client';

import type { LucideIcon } from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BedDouble,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Pill,
  Receipt,
  Settings,
  Settings2,
  Siren,
  Stethoscope,
  Users,
} from 'lucide-react';

import { cn } from '@lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Clinical',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Patients', href: '/patients', icon: Users },
      { label: 'Clinicals', href: '/encounters', icon: Stethoscope },
      { label: 'Pharmacy', href: '/pharmacy', icon: Pill },
      { label: 'Laboratory', href: '/lab', icon: FlaskConical },
      { label: 'Billing', href: '/billing', icon: Receipt },
      { label: 'Emergency', href: '/emergency', icon: Siren },
      { label: 'Wards', href: '/wards', icon: BedDouble },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Duty Roster', href: '/duty-roster', icon: CalendarDays },
      { label: 'Administration', href: '/admin', icon: Settings2 },
    ],
  },
];

const BOTTOM_NAV: NavItem[] = [
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Collaboration', href: '/collaboration', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: Settings },
];

// TODO(Task 2): Replace with real auth context
const MOCK_USER = {
  name: 'Dr. Adaeze Okonkwo',
  role: 'Consultant Physician',
  initials: 'AO',
} as const;

export interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
}

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Application sidebar"
      className={cn(
        'bg-card text-card-foreground flex shrink-0 flex-col border-r transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header: logo + collapse toggle */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b px-3',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <span className="text-foreground text-sm font-semibold tracking-tight select-none">
            MYHxCare HMS
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            onCollapsedChange(!collapsed);
          }}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* Navigation sections */}
      <nav
        aria-label="Main navigation"
        className="flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto py-4"
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="px-2">
            {!collapsed && (
              <p className="text-muted-foreground mb-1 px-2 text-xs font-medium tracking-wider uppercase">
                {section.label}
              </p>
            )}
            <ul role="list" className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <NavLink key={item.href} item={item} active={active} collapsed={collapsed} />
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: utility nav + user card + sign-out */}
      <div className="shrink-0 border-t px-2 py-3">
        <ul role="list" className="space-y-0.5">
          {BOTTOM_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return <NavLink key={item.href} item={item} active={active} collapsed={collapsed} />;
          })}
        </ul>

        <div
          className={cn(
            'mt-3 flex items-center gap-3 rounded-md px-2 py-1.5',
            collapsed && 'justify-center',
          )}
        >
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {MOCK_USER.initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-foreground truncate text-sm leading-none font-medium">
                {MOCK_USER.name}
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">{MOCK_USER.role}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          className={cn(
            'text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring mt-1 flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none',
            collapsed && 'justify-center',
          )}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

function NavLink({ item, active, collapsed }: NavLinkProps) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          'focus-visible:ring-ring flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none',
          collapsed && 'justify-center',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    </li>
  );
}
