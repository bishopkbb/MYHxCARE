'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
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
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
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
          'flex h-screen w-[242px] shrink-0 flex-col',
          // Mobile: overlay drawer
          'fixed inset-y-0 left-0 z-50 transition-transform duration-[250ms] ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static in layout flow
          'lg:static lg:z-auto lg:translate-x-0',
        )}
        style={{ background: '#25464D', borderRight: '1px solid rgba(255,255,255,0.071)' }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="shrink-0 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.078)' }}>
          {/* Logo + brand name */}
          <div className="flex items-center gap-2.5">
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
            <div className="min-w-0">
              <p className="font-display truncate text-base leading-6 font-semibold text-white">
                MyHxCare HMS
              </p>
              <p className="truncate text-xs leading-4.5" style={{ color: '#0098CC' }}>
                UNIZIK Medical Centre
              </p>
            </div>
          </div>

          {/* Doctor info card */}
          <div className="pt-4">
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
        </div>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav aria-label="Main navigation" className="flex-1 overflow-x-hidden overflow-y-auto py-3">
          {sections.map((section, idx) => (
            <div key={section.label ?? idx} className="mb-3 px-2">
              {section.label && (
                <p
                  className="mb-1.5 px-3 text-[11px] leading-4.5 font-normal uppercase"
                  style={{ color: '#0098CC' }}
                >
                  {section.label}
                </p>
              )}
              <ul role="list" className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <SidebarNavItem
                      key={`${item.href}-${item.label}`}
                      item={item}
                      active={active}
                    />
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* ── Sign Out ─────────────────────────────────────────────────── */}
        <div className="shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.071)' }}>
          <div className="px-2 py-2">
            <button
              type="button"
              onClick={() => {
                void logout();
              }}
              aria-label="Sign out"
              className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors hover:bg-white/5"
            >
              <Image
                src="/icons/signout.png"
                alt=""
                width={14}
                height={14}
                aria-hidden
                className="shrink-0"
              />
              <span className="text-sm leading-5.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
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
}

function SidebarNavItem({ item, active }: SidebarNavItemProps) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors',
          active ? 'text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
        )}
        style={active ? { background: '#1F3D43' } : undefined}
      >
        {/* Icon */}
        {item.iconSrc ? (
          <Image
            src={item.iconSrc}
            alt=""
            width={14}
            height={14}
            aria-hidden
            className="shrink-0"
          />
        ) : (
          <Icon className="size-3.5 shrink-0" />
        )}

        {/* Label */}
        <span className="flex-1 truncate text-sm leading-5.5">{item.label}</span>

        {/* Badge or arrow */}
        {item.badge !== undefined ? (
          <span
            className="flex size-4 shrink-0 items-center justify-center rounded-full font-black text-white"
            style={{ background: '#FB2C36', fontSize: 9, lineHeight: '13.5px' }}
          >
            {item.badge}
          </span>
        ) : (
          <ChevronRight
            className="shrink-0 text-white/30"
            style={{ width: 11, height: 11 }}
            strokeWidth={2}
          />
        )}
      </Link>
    </li>
  );
}
