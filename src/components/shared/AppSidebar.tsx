'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect } from 'react';

import { resolveWorkspace } from '@/types/auth.types';
import { WORKSPACE_NAV } from '@/config/workspaces';
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
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const workspaceId = user ? resolveWorkspace(user.workspaceRole) : 'clinical';
  const { sections } = WORKSPACE_NAV[workspaceId];

  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen, onMobileClose]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile backdrop */}
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
          'flex shrink-0 flex-col overflow-hidden',
          // Mobile: always full width; desktop: collapses to icon rail
          'w-70',
          collapsed && 'lg:w-18',
          // Mobile: fixed overlay drawer, slides in from left
          // h-dvh = dynamic viewport height: excludes browser chrome (address bar,
          // bottom nav strip) on iOS/Android, so the sign-out button stays visible.
          'fixed inset-y-0 left-0 z-50 h-dvh',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: in document flow, no transform needed
          'lg:static lg:z-auto lg:h-auto lg:min-h-dvh lg:translate-x-0',
        )}
        // Inline style handles both transitions correctly without Tailwind class-order conflicts
        style={{
          background: '#25464D',
          borderRight: '1px solid rgba(255,255,255,0.071)',
          transition: 'width 250ms ease-in-out, transform 250ms ease-in-out',
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div
          className={cn(
            'shrink-0',
            // Mobile: always expanded padding; desktop respects collapsed
            collapsed ? 'p-4 lg:px-[11px] lg:py-4' : 'p-4',
          )}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.078)' }}
        >
          {/* Logo + brand + controls */}
          <div className={cn('flex items-center gap-2.5', collapsed && 'lg:flex-col')}>
            {/* Logo */}
            <Link
              href="/dashboard"
              aria-label="Go to home dashboard"
              className="group flex size-12.5 shrink-0 items-center justify-center overflow-hidden rounded-[12px] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,180,216,0.55)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#25464D] focus-visible:outline-none"
              style={{ background: '#25464D' }}
            >
              <Image
                src="/logo.png"
                alt="MYHxCare"
                width={50}
                height={50}
                className="size-12.5 object-contain transition-[filter] duration-200 group-hover:brightness-110"
              />
            </Link>

            {/* Brand text — always visible on mobile; hidden on desktop when collapsed */}
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="font-display truncate text-[20px] leading-7 font-semibold text-white">
                MyHxCare HMS
              </p>
              <p className="truncate text-sm leading-5.5" style={{ color: '#0098CC' }}>
                UNIZIK Medical Centre
              </p>
            </div>

            {/* Mobile: X close button — hidden on desktop */}
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close navigation menu"
              className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#25464D] focus-visible:outline-none lg:hidden"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <X style={{ width: 16, height: 16, color: '#FFFFFF' }} />
            </button>

            {/* Desktop: collapse toggle — hidden on mobile */}
            <div className={cn('hidden shrink-0 lg:block', !collapsed && 'lg:ml-auto')}>
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#25464D] focus-visible:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                {collapsed ? (
                  <ChevronRight style={{ width: 16, height: 16, color: '#FFFFFF' }} />
                ) : (
                  <ChevronLeft style={{ width: 16, height: 16, color: '#FFFFFF' }} />
                )}
              </button>
            </div>
          </div>

          {/* Doctor info card — always visible on mobile; hidden on desktop when collapsed */}
          <div className={cn('pt-4', collapsed && 'lg:hidden')}>
            <div
              className="flex items-center gap-2.5 rounded-[12px] p-2.5"
              style={{ background: 'rgba(255,255,255,0.059)' }}
            >
              <div
                className="flex size-12.5 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: '#00B4D8' }}
              >
                {getInitials(user?.name ?? '')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base leading-6 text-white">{user?.name ?? '—'}</p>
                <p className="truncate text-sm leading-5" style={{ color: '#0098CC' }}>
                  {user?.role ?? ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth py-3"
        >
          {sections.map((section, idx) => (
            <div key={section.label ?? idx} className="mb-3 px-2">
              {section.label && (
                <p
                  className={cn(
                    'px-3 text-sm leading-5 font-bold uppercase',
                    collapsed && 'lg:hidden',
                  )}
                  style={{ color: '#0098CC' }}
                >
                  {section.label}
                </p>
              )}
              <ul role="list" className="space-y-1 pt-1.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <SidebarNavItem
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

        {/* ── Sign Out ─────────────────────────────────────────────────── */}
        <div className="shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.071)' }}>
          <div className="px-2 pt-[9px] pb-2">
            <button
              type="button"
              onClick={() => {
                void logout();
              }}
              aria-label="Sign out"
              title={collapsed ? 'Sign out' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors duration-150 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#25464D] focus-visible:outline-none',
                collapsed && 'lg:justify-center lg:gap-0 lg:px-2 lg:py-2',
              )}
            >
              <Image
                src="/icons/signout.png"
                alt=""
                width={18}
                height={18}
                aria-hidden
                className="shrink-0"
              />
              <span
                className={cn('text-sm leading-5.5', collapsed && 'lg:hidden')}
                style={{ color: 'rgba(255,255,255,0.38)' }}
              >
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

interface SidebarNavItemProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

function SidebarNavItem({ item, active, collapsed }: SidebarNavItemProps) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#25464D] focus-visible:outline-none',
          collapsed && 'lg:justify-center lg:gap-0 lg:px-2 lg:py-2',
          active ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
        )}
        style={active ? { background: '#1F3D43' } : undefined}
      >
        {/* Icon */}
        {item.iconSrc ? (
          <Image
            src={item.iconSrc}
            alt=""
            width={18}
            height={18}
            aria-hidden
            className="shrink-0"
            style={
              active
                ? {
                    filter:
                      'brightness(0) saturate(100%) invert(39%) sepia(96%) saturate(780%) hue-rotate(163deg) brightness(102%)',
                  }
                : undefined
            }
          />
        ) : (
          <Icon className="size-4.5 shrink-0" style={active ? { color: '#0098CC' } : undefined} />
        )}

        {/* Label — always visible on mobile; hidden on desktop when collapsed */}
        <span className={cn('flex-1 truncate text-base leading-6', collapsed && 'lg:hidden')}>
          {item.label}
        </span>

        {/* Badge — always visible on mobile; hidden on desktop when collapsed */}
        {item.badge !== undefined && (
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full leading-none font-black text-white',
              collapsed && 'lg:hidden',
            )}
            style={{ background: '#FB2C36', fontSize: 14 }}
          >
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
