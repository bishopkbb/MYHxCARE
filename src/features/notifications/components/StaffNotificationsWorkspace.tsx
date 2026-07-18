'use client';

import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  CalendarRange,
  Check,
  Eye,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useAuth } from '@hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { ROUTES } from '@/constants/routes';
import { resolveWorkspace } from '@/types/auth.types';
import { formatTime } from '@/utils/datetime';
import {
  CATEGORY_CFG,
  DEPARTMENT_CFG,
  NOTIFICATION_CATEGORIES,
  PRIORITY_OPTIONS,
  STAFF_NOTIFICATIONS,
  type StaffNotification,
} from '@/features/notifications/__mocks__/staffNotificationFixtures';

/** Where "Open related record" lands, per workspace this shared component is
 * mounted in — Registration doesn't have Medical Records' record-lookup
 * tools (and vice versa), so the destination has to match whichever
 * dashboard the user is actually on. */
function recordsEntryPointFor(workspaceId: string): string {
  return workspaceId === 'records' ? ROUTES.medicalRecords : ROUTES.registrationDirectory;
}

const ROWS_PER_PAGE = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function isSameWatDay(a: Date, b: Date): string | null {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' });
  return fmt.format(a) === fmt.format(b) ? fmt.format(a) : null;
}

export function StaffNotificationsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const workspaceId = user ? resolveWorkspace(user.workspaceRole) : 'clinical';
  const [notifications, setNotifications] = useState<StaffNotification[]>(STAFF_NOTIFICATIONS);
  const [priority, setPriority] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const nowDate = new Date(now);
    const unread = notifications.filter((n) => !n.read).length;
    const today = notifications.filter((n) => isSameWatDay(new Date(n.timestamp), nowDate)).length;
    const thisWeek = notifications.filter(
      (n) => now - new Date(n.timestamp).getTime() < 7 * DAY_MS,
    ).length;
    const critical = notifications.filter((n) => n.priority === 'Critical').length;
    return { unread, today, thisWeek, critical };
  }, [notifications, now]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications.forEach((n) => {
      counts[n.category] = (counts[n.category] ?? 0) + 1;
    });
    return counts;
  }, [notifications]);

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(notifications.map((n) => n.department))).map((d) => ({
        value: d,
        label: d,
      })),
    [notifications],
  );

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (priority && n.priority !== priority) return false;
      if (department && n.department !== department) return false;
      if (category && n.category !== category) return false;
      const day = n.timestamp.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [notifications, priority, department, category, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);

  function selectCategory(next: string) {
    setCategory((prev) => (prev === next ? '' : next));
    setCurrentPage(1);
  }

  function handleReset() {
    setPriority('');
    setDateFrom('');
    setDateTo('');
    setDepartment('');
    setCategory('');
    setCurrentPage(1);
    toast.info('Filters cleared', 'Showing every notification.');
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} notification${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All caught up', 'Every notification has been marked as read.');
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function handleView(n: StaffNotification) {
    markRead(n.id);
    toast.info(n.title, n.body);
  }

  function handleOpenRecord(n: StaffNotification) {
    markRead(n.id);
    if (!n.patientName) {
      toast.info('No related record', 'This notification has no linked patient record.');
      return;
    }
    toast.info('Opening record', `Search for ${n.patientName} (${n.mrn}) to view their record.`);
    router.push(recordsEntryPointFor(workspaceId));
  }

  function handleDelete(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notification removed', 'It has been deleted from your list.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Notifications
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Stay updated with real-time alerts and important updates.
              </p>
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
            >
              <Check style={{ width: 15, height: 15 }} />
              Mark All as Read
            </button>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Unread',
                sub: 'Unread notifications',
                value: stats.unread,
                icon: Bell,
                color: '#00B4D8',
                bg: 'rgba(0,180,216,0.12)',
              },
              {
                label: 'Today',
                sub: 'Notifications today',
                value: stats.today,
                icon: CalendarCheck,
                color: '#22C55E',
                bg: 'rgba(34,197,94,0.12)',
              },
              {
                label: 'This Week',
                sub: 'Notifications this week',
                value: stats.thisWeek,
                icon: CalendarRange,
                color: '#8B5CF6',
                bg: 'rgba(139,92,246,0.12)',
              },
              {
                label: 'Critical Alerts',
                sub: 'Require immediate attention',
                value: stats.critical,
                icon: AlertTriangle,
                color: '#EF4444',
                bg: 'rgba(239,68,68,0.12)',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="overflow-hidden rounded-[12px]"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-3 p-4">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full"
                    style={{ background: s.bg }}
                  >
                    <s.icon style={{ width: 18, height: 18, color: s.color }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</p>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 24, color: '#0D2630' }}
                    >
                      {s.value}
                    </p>
                    <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {s.sub}
                    </p>
                  </div>
                </div>
                <div style={{ height: 3, background: s.color, opacity: 0.85 }} />
              </div>
            ))}
          </div>

          {/* ── Filters ────────────────────────────────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Priority
                </label>
                <FormSelect
                  id="notif-priority"
                  value={priority}
                  onChange={setPriority}
                  options={PRIORITY_OPTIONS}
                  placeholder="All Priorities"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Date
                </label>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <FormDateInput
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      aria-label="From date"
                    />
                  </div>
                  <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                    –
                  </span>
                  <div className="min-w-0 flex-1">
                    <FormDateInput
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      aria-label="To date"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Department
                </label>
                <FormSelect
                  id="notif-department"
                  value={department}
                  onChange={setDepartment}
                  options={departmentOptions}
                  placeholder="All Departments"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Notification Type
                </label>
                <FormSelect
                  id="notif-type"
                  value={category}
                  onChange={(v) => selectCategory(v)}
                  options={NOTIFICATION_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  placeholder="All Types"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleReset}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                Filter
              </button>
            </div>
          </div>

          {/* ── Categories + list ──────────────────────────────────────── */}
          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div
              className="w-full shrink-0 rounded-[12px] p-4 xl:w-[280px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Notification Categories
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                {NOTIFICATION_CATEGORIES.map((c) => {
                  const cfg = CATEGORY_CFG[c];
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => selectCategory(c)}
                      className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ background: active ? '#E6F8FD' : 'transparent' }}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className="flex size-7 shrink-0 items-center justify-center rounded-full"
                          style={{ background: cfg.bg }}
                        >
                          <cfg.icon style={{ width: 14, height: 14, color: cfg.color }} />
                        </div>
                        <span
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: active ? '#00B4D8' : '#0D2630' }}
                        >
                          {c}
                        </span>
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 font-sans font-semibold"
                        style={{
                          fontSize: 14,
                          color: active ? '#00B4D8' : '#4A7080',
                          background: active ? 'rgba(0,180,216,0.12)' : 'rgba(138,152,163,0.12)',
                        }}
                      >
                        {categoryCounts[c] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="overflow-x-auto scroll-smooth">
                  <div className="min-w-[900px]">
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="min-w-0 flex-1 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Notification
                        </span>
                      </div>
                      <div className="w-24 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Time
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Related Patient
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Department
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-3 text-right">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                    </div>

                    {pageRows.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div
                          className="flex size-14 items-center justify-center rounded-full"
                          style={{ background: 'rgba(226,237,241,0.6)' }}
                        >
                          <Bell style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No notifications match your filters
                        </p>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}

                    {pageRows.map((n) => {
                      const cfg = CATEGORY_CFG[n.category];
                      const deptCfg = DEPARTMENT_CFG[n.department] ?? {
                        color: '#4A7080',
                        border: 'rgba(74,112,128,0.30)',
                        bg: 'transparent',
                      };
                      return (
                        <div
                          key={n.id}
                          className="flex items-center"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-2.5 py-3 pr-2 pl-3">
                            {!n.read && (
                              <span
                                className="mt-1.5 size-2 shrink-0 rounded-full"
                                style={{ background: '#00B4D8' }}
                                aria-label="Unread"
                              />
                            )}
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full"
                              style={{ background: cfg.bg }}
                            >
                              <cfg.icon style={{ width: 16, height: 16, color: cfg.color }} />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="truncate font-sans font-semibold"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {n.title}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {n.body}
                              </p>
                            </div>
                          </div>
                          <div className="w-24 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {formatTime(n.timestamp)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {relativeTime(n.timestamp)}
                            </p>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2">
                            {n.patientName ? (
                              <>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {n.patientName}
                                </p>
                                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {n.mrn}
                                </p>
                              </>
                            ) : (
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>—</p>
                            )}
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: deptCfg.color,
                                border: `1px solid ${deptCfg.border}`,
                                background: deptCfg.bg,
                              }}
                            >
                              {n.department}
                            </span>
                          </div>
                          <div className="flex w-28 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => handleView(n)}
                              aria-label={`View ${n.title}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRecord(n)}
                              aria-label={`Open related record for ${n.title}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <FolderOpen style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(n.id)}
                              aria-label={`Delete ${n.title}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Trash2 style={{ width: 15, height: 15, color: '#EF4444' }} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {filtered.length > 0 && (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Showing {pageStart + 1} to{' '}
                      {Math.min(pageStart + ROWS_PER_PAGE, filtered.length)} of {filtered.length}{' '}
                      notifications
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                        .reduce<(number | 'ellipsis')[]>((acc, p) => {
                          if (acc.length > 0 && typeof acc[acc.length - 1] === 'number') {
                            const prev = acc[acc.length - 1] as number;
                            if (p - prev > 1) acc.push('ellipsis');
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === 'ellipsis' ? (
                            <span
                              key={`e-${i}`}
                              style={{ fontSize: 14, color: '#8A98A3' }}
                              className="px-1"
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className="flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{
                                fontSize: 14,
                                border: `1px solid ${p === safePage ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                                color: p === safePage ? '#00B4D8' : '#4A7080',
                                background: p === safePage ? '#E6F8FD' : 'transparent',
                              }}
                            >
                              {p}
                            </button>
                          ),
                        )}
                      <button
                        type="button"
                        disabled={safePage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                      <select
                        value={ROWS_PER_PAGE}
                        disabled
                        className="h-9 rounded-[8px] px-2 font-sans outline-none"
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      >
                        <option value={ROWS_PER_PAGE}>{ROWS_PER_PAGE}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
