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
  onCollapsedChange: (value: boolean) => void;
}

export function AppSidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onCollapsedChange,
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
          'flex w-[242px] shrink-0 flex-col',
          // Width transition on desktop only
          'lg:transition-[width] lg:duration-200 lg:ease-in-out',
          collapsed && 'lg:w-[72px]',
          // Mobile: fixed viewport-height overlay drawer with its own scroll
          'fixed inset-y-0 left-0 z-50 h-screen transition-transform duration-[250ms] ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: in document flow, grows with page content
          'lg:static lg:z-auto lg:h-auto lg:min-h-screen lg:translate-x-0',
        )}
        style={{ background: '#25464D', borderRight: '1px solid rgba(255,255,255,0.071)' }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="shrink-0 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.078)' }}>
          {/* Logo + brand row — no toggle button here so text has full width */}
          <div className={cn('flex items-center gap-2.5', collapsed && 'lg:justify-center')}>
            <div
              className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px]"
              style={{ background: '#25464D' }}
            >
              <Image
                src="/logo.png"
                alt="MYHxCare"
                width={40}
                height={40}
                className="size-10 object-contain"
              />
            </div>

            {/* Brand text — hidden on desktop when collapsed */}
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="font-display truncate text-base leading-6 font-semibold text-white">
                MyHxCare HMS
              </p>
              <p className="truncate text-xs leading-4.5" style={{ color: '#0098CC' }}>
                UNIZIK Medical Centre
              </p>
            </div>
          </div>

          {/* Doctor info card — full, hidden on desktop when collapsed */}
          <div className={cn('pt-4', collapsed && 'lg:hidden')}>
            <div
              className="flex items-center gap-2.5 rounded-[12px] p-2.5"
              style={{ background: 'rgba(255,255,255,0.059)' }}
            >
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: '#00B4D8' }}
              >
                {getInitials(user?.name ?? '')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm leading-5.5 text-white">{user?.name ?? '—'}</p>
                <p className="truncate text-xs leading-4.5" style={{ color: '#0098CC' }}>
                  {user?.role ?? ''}
                </p>
              </div>
            </div>
          </div>

          {/* Avatar only — desktop only, shown when collapsed */}
          <div className={cn('hidden justify-center pt-3', collapsed && 'lg:flex')}>
            <div
              className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: '#00B4D8' }}
            >
              {getInitials(user?.name ?? '')}
            </div>
          </div>

          {/* Collapse/Expand toggle — desktop only, below doctor container */}
          <div
            className={cn('hidden pt-2.5 lg:flex', collapsed ? 'justify-center' : 'justify-end')}
          >
            <button
              type="button"
              onClick={() => onCollapsedChange(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-[#0098CC]/20"
              style={{ background: 'rgba(0, 152, 204, 0.07)', border: '0.92px solid #0098CC' }}
            >
              {collapsed ? (
                <ChevronRight
                  className="text-[#0098CC]"
                  style={{ width: 16, height: 16 }}
                  strokeWidth={2}
                />
              ) : (
                <ChevronLeft
                  className="text-[#0098CC]"
                  style={{ width: 16, height: 16 }}
                  strokeWidth={2}
                />
              )}
            </button>
          </div>
        </div>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-x-hidden overflow-y-auto py-3 lg:overflow-y-visible"
        >
          {sections.map((section, idx) => (
            <div key={section.label ?? idx} className={cn('mb-3 px-2', collapsed && 'lg:mb-1')}>
              {section.label && (
                <p
                  className={cn(
                    'px-3 text-[11px] leading-4.5 font-normal uppercase',
                    collapsed && 'lg:hidden',
                  )}
                  style={{ color: '#0098CC' }}
                >
                  {section.label}
                </p>
              )}
              <ul role="list" className={cn('space-y-0.5 pt-1.5', collapsed && 'lg:pt-0')}>
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
          <div className={cn('px-2 pt-[9px] pb-2', collapsed && 'lg:px-0')}>
            <button
              type="button"
              onClick={() => {
                void logout();
              }}
              aria-label="Sign out"
              className={cn(
                'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors hover:bg-white/5',
                collapsed && 'lg:justify-center lg:px-0',
              )}
            >
              <Image
                src="/icons/signout.png"
                alt=""
                width={14}
                height={14}
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
          'flex items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors',
          collapsed && 'lg:justify-center lg:gap-0 lg:px-2',
          active ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
        )}
        style={active ? { background: '#1F3D43' } : undefined}
      >
        {/* Icon with dot badge indicator in collapsed mode */}
        <div className="relative shrink-0">
          {item.iconSrc ? (
            <Image src={item.iconSrc} alt="" width={14} height={14} aria-hidden />
          ) : (
            <Icon className="size-3.5" />
          )}
          {item.badge !== undefined && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 hidden size-1.5 rounded-full',
                collapsed && 'lg:block',
              )}
              style={{ background: '#FB2C36' }}
            />
          )}
        </div>

        {/* Label — hidden on desktop when collapsed */}
        <span className={cn('flex-1 truncate text-sm leading-5.5', collapsed && 'lg:hidden')}>
          {item.label}
        </span>

        {/* Badge or arrow — hidden on desktop when collapsed */}
        {item.badge !== undefined ? (
          <span
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded-full leading-none font-black text-white',
              collapsed && 'lg:hidden',
            )}
            style={{ background: '#FB2C36', fontSize: 9 }}
          >
            {item.badge}
          </span>
        ) : (
          <ChevronRight
            className={cn(
              'shrink-0',
              active ? 'text-white' : 'text-white/30',
              collapsed && 'lg:hidden',
            )}
            style={{ width: 11, height: 11 }}
            strokeWidth={2}
          />
        )}
      </Link>
    </li>
  );
}
