'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react';

import { resolveWorkspace } from '@/types/auth.types';
import { UNIVERSAL_BOTTOM_NAV, WORKSPACE_NAV } from '@/config/workspaces';
import type { NavItem } from '@/config/workspaces';
import { useAuth } from '@hooks/useAuth';
import { cn } from '@lib/utils';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (value: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const workspaceId = user ? resolveWorkspace(user.workspaceRole) : 'clinical';
  const { workspaceLabel, sections } = WORKSPACE_NAV[workspaceId];

  // Close drawer on route change (user tapped a nav link)
  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

  // Escape key closes the mobile drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen, onMobileClose]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Backdrop — mobile only, fades in/out with the drawer */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        aria-label="Application sidebar"
        className={cn(
          'bg-card text-card-foreground flex shrink-0 flex-col border-r',
          // Mobile: fixed overlay drawer, slides in/out via transform
          'fixed inset-y-0 left-0 z-50 w-64',
          'transition-transform duration-[250ms] ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: back in layout flow, collapses via width
          'lg:static lg:z-auto lg:translate-x-0',
          'lg:transition-[width] lg:duration-200 lg:ease-in-out',
          collapsed ? 'lg:w-16' : 'lg:w-64',
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex h-14 shrink-0 items-center justify-between border-b px-3',
            collapsed && 'lg:justify-center',
          )}
        >
          {/* Logo + workspace label: always visible on mobile; hidden on desktop when collapsed */}
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <span className="text-foreground block text-sm font-semibold tracking-tight select-none">
              MYHxCare HMS
            </span>
            <span className="text-muted-foreground block truncate text-xs">{workspaceLabel}</span>
          </div>

          {/* Mobile: X close button */}
          <button
            type="button"
            onClick={onMobileClose}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="size-4" />
          </button>

          {/* Desktop: collapse/expand toggle */}
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring hidden size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        {/* Workspace navigation */}
        <nav
          aria-label="Main navigation"
          className="flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto py-4"
        >
          {sections.map((section, idx) => (
            <div key={section.label ?? idx} className="px-2">
              {section.label && (
                <p
                  className={cn(
                    'text-muted-foreground mb-1 px-2 text-xs font-medium tracking-wider uppercase',
                    collapsed && 'lg:hidden',
                  )}
                >
                  {section.label}
                </p>
              )}
              <ul role="list" className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <NavLink
                      key={`${item.href}-${item.label}`}
                      item={item}
                      active={active}
                      collapsed={collapsed}
                    />
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: universal nav + user card + sign-out */}
        <div className="shrink-0 border-t px-2 py-3">
          <ul role="list" className="space-y-0.5">
            {UNIVERSAL_BOTTOM_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return <NavLink key={item.href} item={item} active={active} collapsed={collapsed} />;
            })}
          </ul>

          <div
            className={cn(
              'mt-3 flex items-center gap-3 rounded-md px-2 py-1.5',
              collapsed && 'lg:justify-center',
            )}
          >
            <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {getInitials(user?.name ?? '')}
            </div>
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="text-foreground truncate text-sm leading-none font-medium">
                {user?.name ?? '—'}
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">{user?.role ?? ''}</p>
            </div>
          </div>

          <button
            type="button"
            className={cn(
              'text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-ring mt-1 flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none',
              collapsed && 'lg:justify-center',
            )}
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              void logout();
            }}
          >
            <LogOut className="size-4 shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
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
          'focus-visible:ring-ring flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none',
          collapsed && 'lg:justify-center',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
      </Link>
    </li>
  );
}
