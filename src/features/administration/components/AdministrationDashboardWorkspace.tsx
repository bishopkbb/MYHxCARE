'use client';

import {
  AlertCircle,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  History,
  Megaphone,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Settings,
  TrendingUp,
  UserCog,
  Users,
  UserPlus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { PermissionGate } from '@components/shared/PermissionGate';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { useAuth } from '@hooks/useAuth';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { TENANT_CONFIG } from '@/constants/tenant';
import { formatCurrencyCompact, formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate, isToday } from '@/utils/datetime';
import { useStaffShifts } from '@/features/workforce/store/staffShiftStore';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import { useScheduledAppointments } from '@/features/registration/store/appointmentStore';
import {
  computeWorkforceStats,
  type AdministrationShift,
} from '@/features/administration/__mocks__/administrationWorkforceFixtures';
import {
  buildRevenueTrendMonth,
  REVENUE_TREND_TODAY,
  type TrendPoint,
} from '@/features/billing/__mocks__/billingDashboardFixtures';
import {
  ACTIVE_USERS,
  ACTIVE_USERS_DELTA,
  ADMINISTRATIVE_ALERTS,
  DEPARTMENT_STATUS,
  OUTSTANDING_TASKS,
  RECENT_ACTIVITY,
  SYSTEM_ALERTS_COUNT,
  TOTAL_STAFF,
  TOTAL_STAFF_DELTA,
} from '@/features/administration/__mocks__/administrationDashboardFixtures';

type PageState = 'loading' | 'loaded' | 'error';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function getWATGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const TITLE_PREFIXES = ['Dr.', 'Nurse', 'Mr.', 'Mrs.', 'Ms.', 'Prof.'];

function parseName(fullName: string): { title: string; lastName: string } {
  const parts = fullName.split(' ').filter(Boolean);
  if (parts.length === 0) return { title: '', lastName: 'Administrator' };
  const hasTitle = TITLE_PREFIXES.includes(parts[0]!);
  const title = hasTitle ? parts[0]! : '';
  const lastName = parts[parts.length - 1] ?? (hasTitle ? parts[1] : parts[0]) ?? 'Administrator';
  return { title, lastName };
}

// ── Skeletons ────────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-3">
        <div className="size-11 shrink-0 animate-pulse rounded-[12px] bg-slate-200" />
        <div className="min-w-0 flex-1">
          <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-6 w-20 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-3.5 w-full max-w-[200px] animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-16 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

// ── Panel shell ──────────────────────────────────────────────────────────

function Panel({
  title,
  viewAllHref,
  className,
  children,
}: {
  title: string;
  viewAllHref?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div
      className={`flex h-full flex-col rounded-[12px] p-4 sm:p-5 ${className ?? ''}`}
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          {title}
        </h2>
        {viewAllHref && (
          <button
            type="button"
            onClick={() => router.push(viewAllHref)}
            className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            View All
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Quick Action tile ────────────────────────────────────────────────────

function QuickActionTile({
  icon: Icon,
  label,
  color,
  bg,
  onClick,
}: {
  icon: typeof UserPlus;
  label: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-[10px] p-3.5 text-center transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: bg }}
      >
        <Icon style={{ width: 18, height: 18, color }} />
      </div>
      <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {label}
      </p>
    </button>
  );
}

// ── Revenue area chart (single series, gradient fill), adapted from
// BillingDashboardWorkspace.tsx's own RevenueAreaChart (function-local
// there, not exported), simplified to a single "This Month" view. ─────────

function RevenueAreaChart({ data }: { data: TrendPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...data.map((d) => d.value), 1);
  const niceMax = Math.ceil(max / 100_000) * 100_000 || 100_000;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.value / niceMax) * H,
  }));
  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD = `${lineD} L ${points[points.length - 1]?.x ?? 0} ${H} L ${points[0]?.x ?? 0} ${H} Z`;

  const labelStep = data.length > 8 ? Math.ceil(data.length / 8) : 1;
  const xLabelIdx = Array.from({ length: data.length }, (_, i) => i).filter(
    (i) => i % labelStep === 0,
  );

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX / stepX)));
    setHoverIdx(idx);
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredPoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="mt-2 flex gap-3" style={{ height: 260 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 52 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t === 0 ? '₦0' : formatCurrencyCompact(t)}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          ))}
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 cursor-crosshair"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="admin-revenue-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#00B4D8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#admin-revenue-area-fill)" stroke="none" />
          <path
            d={lineD}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={0}
              x2={hoveredPoint.x}
              y2={H}
              stroke="rgba(0,100,130,0.25)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#2563EB"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {hovered && hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
            style={{
              left: `${(hoveredPoint.x / W) * 100}%`,
              top: Math.max(0, (hoveredPoint.y / H) * (260 - 24) - 56),
              transform: 'translateX(-50%)',
              background: '#0D2630',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{hovered.label}</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
              {formatCurrencyWhole(hovered.value)}
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
          {xLabelIdx.map((i) => (
            <span key={i} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {data[i]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function AdministrationDashboardWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [now, setNow] = useState(() => new Date());

  const adminRoster = useStaffShifts().filter(
    (s) => s.homeModule === 'administration',
  ) as unknown as AdministrationShift[];
  const workforceStats = computeWorkforceStats(adminRoster);

  // Real cross-workflow counts, not fixtures: the same queue Registration's
  // Check-In writes into and the same calendar Appointment Scheduling books
  // into, filtered to today.
  const patientsToday = useQueueEntries().filter((e) => isToday(e.arrivalTime)).length;
  const appointmentsToday = useScheduledAppointments().filter((a) => isToday(a.dateTime)).length;

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const { title, lastName } = parseName(user?.name ?? '');

  const revenueTrend = buildRevenueTrendMonth(now.getTime());
  const revenueTotal = revenueTrend.reduce((sum, p) => sum + p.value, 0);
  const todayTotal = REVENUE_TREND_TODAY[REVENUE_TREND_TODAY.length - 1]?.value ?? 0;
  const weekTotal = revenueTrend.slice(-7).reduce((sum, p) => sum + p.value, 0);
  const yearTotal = revenueTotal * 8;

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load the Dashboard
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RotateCcw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              {getWATGreeting(now.getHours())}, {title} {lastName}
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Here&apos;s what&apos;s happening at {TENANT_CONFIG.name} today.
            </p>
          </div>
          <div
            className="flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-4"
            style={{ border: '1px solid rgba(0,100,130,0.2)' }}
          >
            <CalendarDays style={{ width: 15, height: 15, color: '#4A7080' }} />
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {formatHumanDate(now)}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          {pageState === 'loading' ? (
            Array.from({ length: 7 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={Users}
                label="Total Staff"
                value={TOTAL_STAFF}
                info={TOTAL_STAFF_DELTA}
                accent="#2563EB"
                iconBg="rgba(37,99,235,0.1)"
                onClick={() => router.push(ROUTES.adminStaffAccounts)}
              />
              <StatCard
                icon={UserCog}
                label="Active Users"
                value={ACTIVE_USERS}
                info={ACTIVE_USERS_DELTA}
                accent="#16A34A"
                iconBg="rgba(22,163,74,0.1)"
                onClick={() => router.push(ROUTES.adminStaffAccounts)}
              />
              <StatCard
                icon={UserPlus}
                label="Patients Today"
                value={patientsToday}
                info="Across every department"
                accent="#7C3AED"
                iconBg="rgba(124,58,237,0.1)"
                onClick={() => router.push(ROUTES.adminDepartmentMonitoring)}
              />
              <StatCard
                icon={CalendarDays}
                label="Appointments Today"
                value={appointmentsToday}
                info="Scheduled hospital-wide"
                accent="#D97706"
                iconBg="rgba(217,119,6,0.1)"
                onClick={() => router.push(ROUTES.adminDepartmentMonitoring)}
              />
              <StatCard
                icon={ClipboardList}
                label="Outstanding Tasks"
                value={OUTSTANDING_TASKS}
                info="View all tasks"
                accent="#DC2626"
                iconBg="rgba(220,38,38,0.1)"
                onClick={() => router.push(ROUTES.adminShiftHandover)}
              />
              <StatCard
                icon={ShieldAlert}
                label="System Alerts"
                value={SYSTEM_ALERTS_COUNT}
                info="View alerts"
                accent="#EF4444"
                iconBg="rgba(239,68,68,0.1)"
                onClick={() => router.push(ROUTES.adminAuditLog)}
              />
              <StatCard
                icon={Users}
                label="Staff on Duty"
                value={workforceStats.onDuty}
                info={`${workforceStats.onCall} on-call · View Workforce`}
                accent="#00B4D8"
                iconBg="rgba(0,180,216,0.1)"
                onClick={() => router.push(ROUTES.adminWorkforceManagement)}
              />
            </>
          )}
        </div>

        {/* Revenue Overview + Department Status */}
        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_400px] 2xl:items-start">
          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Revenue Overview
              </h2>
              <span style={{ fontSize: 14, color: '#8A98A3' }}>This Month</span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="font-display font-bold" style={{ fontSize: 28, color: '#0D2630' }}>
                {formatCurrencyWhole(revenueTotal)}
              </span>
              <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Revenue (This Month)</span>
            </div>

            {pageState === 'loading' ? (
              <div className="mt-2 h-64 animate-pulse rounded-[10px] bg-slate-100" />
            ) : (
              <RevenueAreaChart data={revenueTrend} />
            )}

            <div
              className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4"
              style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 12 }}
            >
              {[
                { label: 'Today', value: todayTotal },
                { label: 'This Week', value: weekTotal },
                { label: 'This Month', value: revenueTotal },
                { label: 'This Year', value: yearTotal },
              ].map((p) => (
                <div key={p.label}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{p.label}</p>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {formatCurrencyWhole(p.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Department Status
              </h2>
              <button
                type="button"
                onClick={() => router.push(ROUTES.adminDepartmentMonitoring)}
                className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                View All
              </button>
            </div>
            <div className="mt-3 flex flex-col">
              {pageState === 'loading'
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : DEPARTMENT_STATUS.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2.5 py-2.5"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: d.iconBg }}
                      >
                        <d.icon style={{ width: 15, height: 15, color: d.iconColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {d.department}
                          </p>
                          <span
                            className="shrink-0 rounded-full"
                            style={{
                              width: 6,
                              height: 6,
                              background: d.status === 'Busy' ? '#D97706' : '#16A34A',
                            }}
                          />
                        </div>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {d.keyMetricAmount !== undefined
                            ? formatCurrencyWhole(d.keyMetricAmount)
                            : d.keyMetric}{' '}
                          · {d.metricLabel}
                        </p>
                      </div>
                      <TrendingUp
                        style={{
                          width: 16,
                          height: 16,
                          color: d.status === 'Busy' ? '#D97706' : '#16A34A',
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Administrative Alerts + Quick Actions */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Administrative Alerts" viewAllHref={ROUTES.adminAuditLog}>
            <div className="mt-3 flex flex-col">
              {pageState === 'loading'
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                : ADMINISTRATIVE_ALERTS.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-2.5 py-2.5"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: a.iconBg }}
                      >
                        <a.icon style={{ width: 15, height: 15, color: a.iconColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.title}
                        </p>
                        <Tooltip content={a.detail}>
                          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {a.detail}
                          </p>
                        </Tooltip>
                      </div>
                      <span
                        className="shrink-0 whitespace-nowrap"
                        style={{ fontSize: 14, color: '#8A98A3' }}
                      >
                        {a.timeLabel}
                      </span>
                    </div>
                  ))}
            </div>
          </Panel>

          <Panel title="Quick Actions">
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <QuickActionTile
                  icon={UserPlus}
                  label="Add Staff"
                  color="#2563EB"
                  bg="rgba(37,99,235,0.1)"
                  onClick={() => router.push(ROUTES.adminStaffAccounts)}
                />
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <QuickActionTile
                  icon={ShieldCheck}
                  label="Assign Role"
                  color="#7C3AED"
                  bg="rgba(124,58,237,0.1)"
                  onClick={() => router.push(ROUTES.adminRolesPermissions)}
                />
              </PermissionGate>
              <QuickActionTile
                icon={Building2}
                label="Departments"
                color="#16A34A"
                bg="rgba(22,163,74,0.1)"
                onClick={() => router.push(ROUTES.adminDepartments)}
              />
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <QuickActionTile
                  icon={TrendingUp}
                  label="Manage Pricing"
                  color="#D97706"
                  bg="rgba(217,119,6,0.1)"
                  onClick={() => router.push(ROUTES.adminServicePricing)}
                />
              </PermissionGate>
              <QuickActionTile
                icon={FileBarChart}
                label="Department Monitoring"
                color="#00B4D8"
                bg="rgba(0,180,216,0.1)"
                onClick={() => router.push(ROUTES.adminDepartmentMonitoring)}
              />
              <QuickActionTile
                icon={ClipboardList}
                label="View Reports"
                color="#2563EB"
                bg="rgba(37,99,235,0.1)"
                onClick={() => router.push(ROUTES.adminReports)}
              />
              <QuickActionTile
                icon={History}
                label="Audit Logs"
                color="#4A7080"
                bg="rgba(74,112,128,0.1)"
                onClick={() => router.push(ROUTES.adminAuditLog)}
              />
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <QuickActionTile
                  icon={Settings}
                  label="System Settings"
                  color="#DC2626"
                  bg="rgba(220,38,38,0.1)"
                  onClick={() => router.push(ROUTES.adminSystemSettings)}
                />
              </PermissionGate>
              <QuickActionTile
                icon={Megaphone}
                label="Send Notification"
                color="#22C55E"
                bg="rgba(34,197,94,0.1)"
                onClick={() => router.push(ROUTES.announcements)}
              />
              <QuickActionTile
                icon={Users}
                label="Manage Workforce"
                color="#00B4D8"
                bg="rgba(0,180,216,0.1)"
                onClick={() => router.push(ROUTES.adminWorkforceManagement)}
              />
            </div>
          </Panel>
        </div>

        {/* Recent Activities */}
        <div className="mt-4">
          <Panel title="Recent Activities">
            <div className="mt-3 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {pageState === 'loading'
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                : RECENT_ACTIVITY.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-2.5 py-2.5"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: a.iconBg }}
                      >
                        <a.icon style={{ width: 15, height: 15, color: a.iconColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.title}
                        </p>
                        <Tooltip content={a.detail}>
                          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {a.detail}
                          </p>
                        </Tooltip>
                      </div>
                      <span
                        className="shrink-0 whitespace-nowrap"
                        style={{ fontSize: 14, color: '#8A98A3' }}
                      >
                        {a.timeLabel}
                      </span>
                    </div>
                  ))}
            </div>
          </Panel>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
