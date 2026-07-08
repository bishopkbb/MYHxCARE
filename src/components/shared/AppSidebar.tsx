'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
          'flex shrink-0 flex-col overflow-hidden transition-[width] duration-[250ms] ease-in-out',
          collapsed ? 'w-18' : 'w-70',
          // Mobile: fixed viewport-height overlay drawer with its own scroll
          'fixed inset-y-0 left-0 z-50 h-screen transition-transform duration-[250ms] ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: in document flow, grows with page content
          'lg:static lg:z-auto lg:h-auto lg:min-h-screen lg:translate-x-0',
        )}
        style={{ background: '#25464D', borderRight: '1px solid rgba(255,255,255,0.071)' }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div
          className={cn('shrink-0', collapsed ? 'px-[11px] py-4' : 'p-4')}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.078)' }}
        >
          {/* Logo + brand + toggle */}
          <div className={cn('flex items-center gap-2.5', collapsed && 'flex-col')}>
            {/* Logo */}
            <div
              className="flex size-12.5 shrink-0 items-center justify-center overflow-hidden rounded-[12px]"
              style={{ background: '#25464D' }}
            >
              <Image
                src="/logo.png"
                alt="MYHxCare"
                width={50}
                height={50}
                className="size-12.5 object-contain"
              />
            </div>

            {/* Brand text — hidden when collapsed */}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-[20px] leading-7 font-semibold text-white">
                  MyHxCare HMS
                </p>
                <p className="truncate text-sm leading-5.5" style={{ color: '#0098CC' }}>
                  UNIZIK Medical Centre
                </p>
              </div>
            )}

            {/* Toggle container — own separate container beside the brand name */}
            <div className={cn('shrink-0', !collapsed && 'ml-auto')}>
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="flex size-8 items-center justify-center rounded-[8px] transition-colors hover:bg-white/20"
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

          {/* Doctor info card — hidden when collapsed */}
          {!collapsed && (
            <div className="pt-4">
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
                  <p className="truncate text-xs leading-4.5" style={{ color: '#0098CC' }}>
                    {user?.role ?? ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-x-hidden overflow-y-auto py-3 lg:overflow-y-visible"
        >
          {sections.map((section, idx) => (
            <div key={section.label ?? idx} className="mb-3 px-2">
              {section.label && !collapsed && (
                <p
                  className="px-3 text-xs leading-4.5 font-bold uppercase"
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
                'flex w-full items-center rounded-[8px] transition-colors hover:bg-white/5',
                collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-3 py-2',
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
              {!collapsed && (
                <span className="text-sm leading-5.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Sign Out
                </span>
              )}
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
          'flex items-center rounded-[8px] transition-colors',
          collapsed ? 'justify-center px-2 py-2' : 'gap-2.5 px-3 py-2',
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

        {/* Label + badge/arrow — hidden when collapsed */}
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-base leading-6">{item.label}</span>

            {item.badge !== undefined && (
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full leading-none font-black text-white"
                style={{ background: '#FB2C36', fontSize: 11 }}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    </li>
  );
}
