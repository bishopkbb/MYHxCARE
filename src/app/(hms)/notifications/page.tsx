'use client';

import { AlertCircle, Bell, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ROUTES } from '@/constants/routes';
import { resolveWorkspace, type WorkspaceId } from '@/types/auth.types';
import { findWorkspaceRoute } from '@/config/workspaces';
import { useAuth } from '@hooks/useAuth';
import { toRelativeTime } from '@/utils/datetime';
import {
  MOCK_NOTIFICATIONS,
  NOTIFICATION_TYPE_CONFIG,
  type Notification,
} from '@/features/notifications/__mocks__/notificationFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

function resolveHref(notification: Notification, workspaceId: WorkspaceId): string {
  const t = notification.target;
  switch (t.kind) {
    case 'patient':
      return ROUTES.patientProfile(t.patientId);
    case 'referrals':
      return ROUTES.referrals;
    case 'my-schedule':
      return ROUTES.mySchedule;
    case 'emergency':
      return ROUTES.emergency;
    case 'collaboration':
      return findWorkspaceRoute(workspaceId, 'Messages') ?? ROUTES.messages;
  }
}

function SkeletonNotificationCard() {
  return (
    <div
      className="flex items-start gap-4 p-4"
      style={{ borderRadius: 12, border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
    >
      <div className="size-10 shrink-0 animate-pulse rounded-[10px] bg-slate-100" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
        <div className="h-3.5 w-full max-w-md animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const workspaceId = user ? resolveWorkspace(user.workspaceRole) : 'clinical';
  const [pageState, setPageState] = useState<PageState>('loading');
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function openNotification(notification: Notification) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );
    router.push(resolveHref(notification, workspaceId));
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Notifications
              </h1>
              {pageState === 'loaded' && (
                <p
                  className="mt-0.5 font-sans"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  {unreadCount === 0
                    ? "You're all caught up"
                    : `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>
            {pageState === 'loaded' && unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className={`font-sans font-semibold transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* ── Notification list ─────────────────────────────────────────── */}
          <div className="mt-6 flex flex-col gap-4">
            {pageState === 'loading' &&
              Array.from({ length: 6 }).map((_, i) => <SkeletonNotificationCard key={i} />)}

            {pageState === 'error' && (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-10 text-center">
                <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  Failed to load notifications
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className={`flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                  style={{
                    height: 40,
                    borderRadius: 12,
                    padding: '0 20px',
                    background: '#00B4D8',
                    fontSize: 14,
                  }}
                >
                  <RefreshCw style={{ width: 16, height: 16 }} />
                  Retry
                </button>
              </div>
            )}

            {pageState === 'loaded' && notifications.length === 0 && (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-10 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Bell style={{ width: 24, height: 24, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                  No notifications yet
                </p>
                <p className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                  You&apos;ll see alerts, assignments, and messages here.
                </p>
              </div>
            )}

            {pageState === 'loaded' &&
              notifications.map((n) => {
                const cfg = NOTIFICATION_TYPE_CONFIG[n.type];
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`flex items-start gap-4 p-4 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(0,180,216,0.25)',
                      background: '#FFFFFF',
                    }}
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center"
                      style={{ borderRadius: 10, background: cfg.bg }}
                    >
                      <Icon style={{ width: 20, height: 20, color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <span
                            className="shrink-0 rounded-full"
                            style={{ width: 8, height: 8, background: '#00B4D8' }}
                          />
                        )}
                      </div>
                      <p
                        className="mt-0.5 font-sans"
                        style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                      >
                        {n.body}
                      </p>
                      <p
                        className="mt-1 font-sans"
                        style={{ fontSize: 14, lineHeight: '20px', color: '#8A98A3' }}
                      >
                        {toRelativeTime(n.timestamp)}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="h-6" />
        </div>
      </main>
    </div>
  );
}
