'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { resolveWorkspace } from '@/types/auth.types';
import { WORKSPACE_NAV } from '@/config/workspaces';
import type { NavItem } from '@/config/workspaces';
import { UserAvatar } from '@components/shared/UserAvatar';
import { useAuth } from '@hooks/useAuth';
import { cn, getInitials } from '@lib/utils';

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
  const asideRef = useRef<HTMLElement>(null);

  const workspaceId = user ? resolveWorkspace(user.workspaceRole) : 'clinical';
  const { sections, homeRoute } = WORKSPACE_NAV[workspaceId];

  // Desktop sidebar behaviour — two cooperating mechanisms:
  //
  // 1. Scroll-then-stick: position:sticky with
  //    top: min(0px, 100dvh - ownHeight) — the sidebar flows with the page
  //    until Sign Out reaches the viewport bottom, then stays pinned. Only
  //    the height is measured; 100dvh stays live CSS.
  //
  // 2. Independent wheel scroll: wheeling while the pointer is over the
  //    sidebar moves the SIDEBAR alone (via translateY within its legal
  //    range: natural top ↔ Sign Out visible) and freezes the page. No
  //    scroll container is involved, so no scrollbar can ever appear. When
  //    the sidebar hits either end, wheel events pass through to the page
  //    again, and subsequent page scrolling re-clamps the manual offset so
  //    the sticky engine smoothly takes back control.
  useEffect(() => {
    const el = asideRef.current;
    if (!el) return;

    const lgQuery = window.matchMedia('(min-width: 64rem)');
    let wheelOffset = 0;

    // Most-negative allowed viewport top: sidebar bottom == viewport bottom
    const stickMin = () => Math.min(0, window.innerHeight - el.offsetHeight);

    const setStickVar = () => {
      el.style.setProperty('--sidebar-stick-top', `min(0px, calc(100dvh - ${el.offsetHeight}px))`);
    };

    // The width/slide transition must not apply to the wheel translateY on
    // desktop, or every wheel step would animate and feel rubbery.
    const setTransition = () => {
      el.style.transition = lgQuery.matches
        ? 'width 250ms ease-in-out'
        : 'width 250ms ease-in-out, transform 250ms ease-in-out, translate 250ms ease-in-out';
    };

    const applyWheelOffset = (next: number) => {
      wheelOffset = next;
      el.style.transform = next === 0 ? '' : `translateY(${next}px)`;
    };

    const onWheel = (e: WheelEvent) => {
      if (!lgQuery.matches) return;
      const min = stickMin();
      if (min >= 0) return; // fits the viewport — nothing to scroll
      const top = el.getBoundingClientRect().top;
      const target = Math.min(0, Math.max(min, top - e.deltaY));
      const delta = target - top;
      if (delta !== 0) {
        e.preventDefault(); // consume the wheel: page stays frozen
        applyWheelOffset(wheelOffset + delta);
      }
    };

    // Page scroll re-clamps the manual offset so sticky + offset never
    // push the sidebar past its bounds (no gap above the header or below
    // Sign Out); the offset decays naturally back to the sticky position.
    const onScroll = () => {
      if (!lgQuery.matches || wheelOffset === 0) return;
      const min = stickMin();
      const top = el.getBoundingClientRect().top;
      if (top < min) applyWheelOffset(wheelOffset + (min - top));
      else if (top > 0) applyWheelOffset(wheelOffset - top);
    };

    const onBreakpointChange = () => {
      setTransition();
      if (!lgQuery.matches) applyWheelOffset(0); // mobile drawer: clean slate
    };

    setStickVar();
    setTransition();
    const ro = new ResizeObserver(setStickVar);
    ro.observe(el);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    lgQuery.addEventListener('change', onBreakpointChange);
    return () => {
      ro.disconnect();
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      lgQuery.removeEventListener('change', onBreakpointChange);
    };
  }, []);

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
        ref={asideRef}
        aria-label="Application sidebar"
        className={cn(
          // overflow visible on desktop so the edge-floating collapse toggle
          // can straddle the sidebar border without being clipped
          'flex shrink-0 flex-col overflow-hidden lg:overflow-visible',
          // Mobile: wide enough for the brand lockup to read without
          // truncating; desktop: fixed width, collapses to icon rail
          'w-[86%] max-w-[300px] lg:w-70',
          collapsed && 'lg:w-18',
          // Mobile: fixed overlay drawer, slides in from left
          // h-dvh = dynamic viewport height: excludes browser chrome (address bar,
          // bottom nav strip) on iOS/Android, so the sign-out button stays visible.
          'fixed inset-y-0 left-0 z-50 h-dvh',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: scroll-then-stick. h-auto releases the mobile h-dvh lock so
          // the sidebar takes its NATURAL content height (min one viewport) and
          // never scrolls internally; self-start stops flex-stretch. The measured
          // --sidebar-stick-top lets it flow with the page until Sign Out is
          // visible, then stay pinned. bottom-auto neutralises the mobile
          // inset-y-0. z-10 keeps the edge toggle above the content column.
          'lg:sticky lg:top-[var(--sidebar-stick-top,0px)] lg:bottom-auto lg:z-10 lg:h-auto lg:min-h-dvh lg:translate-x-0 lg:self-start',
        )}
        // transition is owned by the behaviour effect above (breakpoint-aware:
        // wheel translateY must not animate on desktop)
        style={{
          background: '#25464D',
          borderRight: '1px solid rgba(255,255,255,0.071)',
        }}
      >
        {/* ── Desktop collapse toggle ──────────────────────────────────────
             Floats on the sidebar's right edge, centered on the border and
             aligned with the logo, so it never crowds the brand text.
             Hit area is 44×44 (touch-target rule); the visible circle inside
             is 28px so it reads light. Chevron flips with state; hover fills
             brand cyan and scales to signal interactivity. */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="group absolute top-4.75 -right-5.5 z-10 hidden size-11 items-center justify-center focus-visible:outline-none lg:flex"
        >
          <span
            className="flex size-7 items-center justify-center rounded-full bg-white transition-[background-color,transform,box-shadow] duration-150 group-hover:scale-110 group-hover:bg-[#00B4D8] group-focus-visible:ring-2 group-focus-visible:ring-[#00B4D8]/60 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white"
            style={{
              border: '1px solid rgba(0,100,130,0.2)',
              boxShadow: '0 1px 4px rgba(13,38,48,0.25)',
            }}
          >
            <ChevronLeft
              className={cn(
                'size-4 text-[#25464D] transition-[transform,color] duration-200 group-hover:text-white',
                collapsed && 'rotate-180',
              )}
            />
          </span>
        </button>

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
          <div className={cn('flex items-center gap-2 lg:gap-2.5', collapsed && 'lg:flex-col')}>
            {/* Logo */}
            <Link
              href={homeRoute}
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
              <p className="font-display truncate text-[17px] leading-6 font-semibold text-white lg:text-[20px] lg:leading-7">
                MyHxCare HMS
              </p>
              <p
                className="text-sm leading-5 lg:truncate lg:leading-5.5"
                style={{ color: '#0098CC' }}
              >
                UNIZIK Medical Centre
              </p>
            </div>

            {/* Mobile: X close button — hidden on desktop */}
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close navigation menu"
              className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#25464D] focus-visible:outline-none lg:hidden"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <X style={{ width: 16, height: 16, color: '#FFFFFF' }} />
            </button>
          </div>

          {/* Doctor info card — always visible on mobile; hidden on desktop when collapsed */}
          <div className={cn('pt-4', collapsed && 'lg:hidden')}>
            <div
              className="flex items-center gap-2.5 rounded-[12px] p-2.5"
              style={{ background: 'rgba(255,255,255,0.059)' }}
            >
              <UserAvatar initials={getInitials(user?.name ?? '')} size={50} />
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
