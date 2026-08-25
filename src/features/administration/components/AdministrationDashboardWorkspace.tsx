'use client';

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileClock,
  KeyRound,
  RotateCcw,
  ShieldAlert,
  UserCog,
  Users,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PermissionGate } from '@components/shared/PermissionGate';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { useAuth } from '@hooks/useAuth';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { formatDateTime } from '@/utils/datetime';
import { useStaffShifts } from '@/features/workforce/store/staffShiftStore';
import {
  computeWorkforceStats,
  type AdministrationShift,
} from '@/features/administration/__mocks__/administrationWorkforceFixtures';
import {
  ALERT_SEVERITY_CFG,
  DEPARTMENT_COUNT,
  FACILITY_ISSUES_REPORTED,
  OPEN_SYSTEM_TICKETS,
  PENDING_STAFF_REQUESTS,
  RECENT_ACTIVITY,
  SYSTEM_ALERTS,
  TOTAL_STAFF_ACCOUNTS,
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

// ── Quick Action row list ─────────────────────────────────────────────────

function QuickActionRow({
  icon: Icon,
  label,
  description,
  color,
  bg,
  onClick,
}: {
  icon: typeof UserPlus;
  label: string;
  description: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: bg }}
      >
        <Icon style={{ width: 20, height: 20, color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
          {label}
        </p>
        <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
          {description}
        </p>
      </div>
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function AdministrationDashboardWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [now, setNow] = useState(() => new Date());

  // Live from the shared staffShiftStore, not a static fixture; the same
  // roster Workforce Management reads/writes. Creating, cancelling, or
  // acknowledging a shift there moves these cards immediately.
  const adminRoster = useStaffShifts().filter(
    (s) => s.homeModule === 'administration',
  ) as unknown as AdministrationShift[];
  const workforceStats = computeWorkforceStats(adminRoster);

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
              Administration Overview · {formatDateTime(now)}
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-4">
          {pageState === 'loading' ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={Users}
                label="Total Staff Accounts"
                value={TOTAL_STAFF_ACCOUNTS}
                info="Across every workspace"
                accent="#2563EB"
                iconBg="rgba(37,99,235,0.1)"
                onClick={() => router.push(ROUTES.adminStaffAccounts)}
              />
              <StatCard
                icon={UserCog}
                label="Pending Staff Requests"
                value={PENDING_STAFF_REQUESTS}
                info="Awaiting account approval"
                accent="#D97706"
                iconBg="rgba(217,119,6,0.1)"
                onClick={() => router.push(ROUTES.adminStaffAccounts)}
              />
              <StatCard
                icon={ShieldAlert}
                label="Open System Tickets"
                value={OPEN_SYSTEM_TICKETS}
                info="Reported issues in progress"
                accent="#DC2626"
                iconBg="rgba(220,38,38,0.1)"
                onClick={() => router.push(ROUTES.adminSystemSettings)}
              />
              <StatCard
                icon={Wrench}
                label="Facility Issues Reported"
                value={FACILITY_ISSUES_REPORTED}
                info="Across all UNIZIK campuses"
                accent="#7C3AED"
                iconBg="rgba(124,58,237,0.1)"
                onClick={() => router.push(ROUTES.adminFacilities)}
              />
              <StatCard
                icon={Building2}
                label="Departments"
                value={DEPARTMENT_COUNT}
                info="Configured hospital-wide"
                accent="#16A34A"
                iconBg="rgba(22,163,74,0.1)"
                onClick={() => router.push(ROUTES.adminDepartments)}
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

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_340px] 2xl:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <Panel title="System Alerts">
              <div className="mt-3 flex flex-col gap-2.5">
                {pageState === 'loading' ? (
                  Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                ) : SYSTEM_ALERTS.length === 0 ? (
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>No active alerts.</p>
                ) : (
                  SYSTEM_ALERTS.map((a) => {
                    const cfg = ALERT_SEVERITY_CFG[a.severity];
                    return (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 rounded-[10px] p-3"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        <cfg.icon
                          style={{ width: 18, height: 18, color: cfg.color, flexShrink: 0 }}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {a.title}
                          </p>
                          <Tooltip content={a.detail}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
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
                    );
                  })
                )}
              </div>
            </Panel>

            <Panel title="Recent Activity">
              <div className="mt-3 flex flex-col">
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

          {/* Right column: Quick Actions */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <Panel title="Quick Actions">
              <div className="mt-3 flex flex-col gap-2">
                <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                  <QuickActionRow
                    icon={UserPlus}
                    label="Manage Staff Accounts"
                    description="Create, edit, or deactivate accounts"
                    color="#2563EB"
                    bg="rgba(37,99,235,0.1)"
                    onClick={() => router.push(ROUTES.adminStaffAccounts)}
                  />
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                  <QuickActionRow
                    icon={KeyRound}
                    label="Roles & Permissions"
                    description="Configure role-based access"
                    color="#7C3AED"
                    bg="rgba(124,58,237,0.1)"
                    onClick={() => router.push(ROUTES.adminRolesPermissions)}
                  />
                </PermissionGate>
                <QuickActionRow
                  icon={Building2}
                  label="Department Management"
                  description="View and edit hospital departments"
                  color="#16A34A"
                  bg="rgba(22,163,74,0.1)"
                  onClick={() => router.push(ROUTES.adminDepartments)}
                />
                <QuickActionRow
                  icon={Wrench}
                  label="Facilities & Campuses"
                  description="UNIZIK campus facility records"
                  color="#D97706"
                  bg="rgba(217,119,6,0.1)"
                  onClick={() => router.push(ROUTES.adminFacilities)}
                />
                <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                  <QuickActionRow
                    icon={ClipboardList}
                    label="System Settings"
                    description="Institution-wide configuration"
                    color="#DC2626"
                    bg="rgba(220,38,38,0.1)"
                    onClick={() => router.push(ROUTES.adminSystemSettings)}
                  />
                </PermissionGate>
                <QuickActionRow
                  icon={FileClock}
                  label="Audit Log"
                  description="Review system-wide activity"
                  color="#4A7080"
                  bg="rgba(74,112,128,0.1)"
                  onClick={() => router.push(ROUTES.adminAuditLog)}
                />
                <QuickActionRow
                  icon={Users}
                  label="Manage Workforce"
                  description="Duty rosters and shift assignments"
                  color="#00B4D8"
                  bg="rgba(0,180,216,0.1)"
                  onClick={() => router.push(ROUTES.adminWorkforceManagement)}
                />
                <QuickActionRow
                  icon={CheckCircle2}
                  label="Announcements"
                  description="Broadcast a system-wide message"
                  color="#22C55E"
                  bg="rgba(34,197,94,0.1)"
                  onClick={() => router.push(ROUTES.announcements)}
                />
              </div>
            </Panel>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
