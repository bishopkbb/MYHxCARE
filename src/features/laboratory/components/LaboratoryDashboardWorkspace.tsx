'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  BadgeCheck,
  Beaker,
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  FlaskConical,
  Gauge,
  Inbox,
  Info,
  ListChecks,
  Megaphone,
  NotebookPen,
  Package,
  Printer,
  Radar,
  RefreshCw,
  Send,
  ShieldCheck,
  Timer,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { isToday, toRelativeTime } from '@/utils/datetime';
import { useAnnouncements } from '@/features/announcements/store/announcementsStore';
import { useLabResults } from '@/features/laboratory/store/labResultStore';
import type { LabDepartment, LabResult } from '@/features/laboratory/__mocks__/labResultFixtures';
import {
  EQUIPMENT_STATUS,
  getEquipmentOnlineSummary,
  LAB_NOTIFICATIONS,
  type EquipmentStatus,
} from '@/features/laboratory/__mocks__/labDashboardFixtures';
import { getMostRecentQcRunAt, getQcTodaySummary } from '@/features/laboratory/store/qcStore';

type PageState = 'loading' | 'loaded' | 'error';
type Shift = 'Morning' | 'Afternoon' | 'Night';

const SHIFT_OPTIONS: { value: Shift; range: string }[] = [
  { value: 'Morning', range: '08:00 AM - 04:00 PM' },
  { value: 'Afternoon', range: '04:00 PM - 12:00 AM' },
  { value: 'Night', range: '12:00 AM - 08:00 AM' },
];

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// ── WAT-safe greeting/date — module-level, matches Pharmacy Dashboard's own
// pattern exactly ──────────────────────────────────────────────────────────

function getWATGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatClinicalDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatWATTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

function formatHrsMin(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** Module-level so the impure `Date.now()` read never happens directly
 * inside the component body — same pattern as this codebase's established
 * `daysUntil()`/`minutesSince()` helpers. */
function isoMinutesAgo(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Presentation-only derived label — LabResult has no accession/specimen-ID
 * field on the canonical entity, so this is never persisted or read back. */
function deriveLabNo(result: LabResult): string {
  const d = new Date(result.orderedAt);
  const yymmdd = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .split('/')
    .reverse()
    .join('');
  const seq = simpleHash(result.id) % 10000;
  return `LAB${yymmdd}-${String(seq).padStart(4, '0')}`;
}

// ── Config ─────────────────────────────────────────────────────────────────

const DEPARTMENT_CFG: Record<LabDepartment, { color: string; bg: string }> = {
  Hematology: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  Biochemistry: { color: '#00B4D8', bg: 'rgba(0,180,216,0.1)' },
  Microbiology: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  Immunology: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  Coagulation: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
};
const DEPARTMENTS: LabDepartment[] = [
  'Hematology',
  'Biochemistry',
  'Microbiology',
  'Immunology',
  'Coagulation',
];

const FLAG_CFG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL: {
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.1)',
    border: 'rgba(220,38,38,0.35)',
    label: 'Critical',
  },
  H: {
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.1)',
    border: 'rgba(220,38,38,0.35)',
    label: 'Critical High',
  },
  L: {
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.1)',
    border: 'rgba(220,38,38,0.35)',
    label: 'Critical Low',
  },
};

const EQUIPMENT_STATUS_CFG: Record<EquipmentStatus, { color: string; label: string }> = {
  Online: { color: '#16A34A', label: 'Online' },
  'Maintenance Due': { color: '#D97706', label: 'Maintenance Due' },
  Offline: { color: '#DC2626', label: 'Offline' },
};

// ── Skeletons ──────────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="size-10 shrink-0 animate-pulse rounded-[12px] bg-slate-200" />
      </div>
      <div className="mt-2.5 h-7 w-14 animate-pulse rounded bg-slate-200" />
      <div className="mt-1.5 h-3.5 w-28 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-3.5 w-full max-w-[160px] animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-16 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="py-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
      {label}
    </p>
  );
}

// ── Panel shell ────────────────────────────────────────────────────────────

function Panel({
  title,
  icon: Icon,
  viewAllHref,
  onViewAll,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  viewAllHref?: string;
  onViewAll?: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div
      className="flex h-full flex-col rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon style={{ width: 18, height: 18, color: '#00B4D8' }} />}
          <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            {title}
          </h2>
        </div>
        {(viewAllHref || onViewAll) && (
          <button
            type="button"
            onClick={onViewAll ?? (() => viewAllHref && router.push(viewAllHref))}
            className={`shrink-0 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#00B4D8' }}
          >
            View all
          </button>
        )}
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

// ── Stat card — same visual DNA as the shared StatCard, plus a "View X"
// action link the reference image calls for on every card ──────────────────

function LabStatCard({
  icon: Icon,
  label,
  value,
  info,
  accent,
  iconBg,
  viewLabel,
  onView,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  info: string;
  accent: string;
  iconBg: string;
  viewLabel: string;
  onView: () => void;
}) {
  return (
    <div
      className="flex h-full flex-col rounded-[12px] p-4"
      style={{
        background: '#FFFFFF',
        border: `1px solid ${accent}`,
        borderTopWidth: 3,
        boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.05)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="min-w-0 font-sans font-semibold"
          style={{ fontSize: 15, lineHeight: '22px', color: '#25464D' }}
        >
          {label}
        </p>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-[12px]"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 22, height: 22, color: accent }} />
        </div>
      </div>
      <p className="font-display mt-1.5 font-black" style={{ fontSize: 28, color: accent }}>
        {value}
      </p>
      <p className="mt-1 font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
        {info}
      </p>
      <button
        type="button"
        onClick={onView}
        className={`mt-auto flex items-center gap-1 self-start pt-2.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
        style={{ fontSize: 14, color: accent }}
      >
        {viewLabel} →
      </button>
    </div>
  );
}

// ── Quick action tile ─────────────────────────────────────────────────────

function QuickActionTile({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 flex-col items-center gap-2 rounded-[12px] px-3 py-3.5 text-center transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      style={{ border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: `${color}1A` }}
      >
        <Icon style={{ width: 20, height: 20, color }} />
      </div>
      <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {label}
      </span>
    </button>
  );
}

// ── Tests-by-department horizontal bars — same pattern as
// MedicalRecordsReportsWorkspace.tsx's DepartmentUsageBars ─────────────────

function DepartmentBars({
  rows,
  animate,
}: {
  rows: { department: LabDepartment; count: number }[];
  animate: boolean;
}) {
  const maxValue = Math.max(...rows.map((r) => r.count), 1);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => {
        const cfg = DEPARTMENT_CFG[row.department];
        const percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
        return (
          <div key={row.department} className="flex items-center gap-3">
            <Tooltip content={row.department}>
              <span
                className="w-28 shrink-0 truncate text-right font-sans"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                {row.department}
              </span>
            </Tooltip>
            <div
              className="relative h-5 min-w-0 flex-1 rounded-[4px]"
              style={{ background: cfg.bg }}
            >
              <div
                className="h-full rounded-[4px]"
                style={{
                  width: animate ? `${(row.count / maxValue) * 100}%` : 0,
                  background: cfg.color,
                  transition: `width 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms`,
                }}
              />
            </div>
            <span
              className="w-20 shrink-0 font-sans font-medium whitespace-nowrap"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {row.count} ({percent}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function LaboratoryDashboardWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const results = useLabResults();
  const announcements = useAnnouncements();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now] = useState(() => new Date());
  const [animateCharts, setAnimateCharts] = useState(false);
  const [shift, setShift] = useState<Shift>('Morning');
  const [shiftMenuOpen, setShiftMenuOpen] = useState(false);
  const shiftButtonRef = useRef<HTMLButtonElement>(null);

  const actorName = user?.name ?? 'Lab Scientist';

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (pageState !== 'loaded') return;
    const raf = requestAnimationFrame(() => setAnimateCharts(true));
    return () => cancelAnimationFrame(raf);
  }, [pageState]);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleRefresh() {
    setAnimateCharts(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimateCharts(true)));
  }

  // ── Real, derived stats — every number below traces to the same
  // `results` array, never a second independently-typed count ──────────────

  const openResults = useMemo(
    () => results.filter((r) => !['RESULTED', 'VERIFIED', 'REJECTED'].includes(r.status)),
    [results],
  );
  const awaitingCollection = useMemo(
    () => results.filter((r) => r.status === 'ORDERED'),
    [results],
  );
  const awaitingReception = useMemo(
    () => results.filter((r) => r.status === 'SAMPLE_COLLECTED'),
    [results],
  );
  const awaitingEntry = useMemo(() => results.filter((r) => r.status === 'IN_PROCESS'), [results]);
  const awaitingVerification = useMemo(
    () => results.filter((r) => r.status === 'RESULTED'),
    [results],
  );
  const receivedToday = useMemo(
    () => results.filter((r) => r.sampleCollectedAt && isToday(r.sampleCollectedAt)),
    [results],
  );
  const criticalOpen = useMemo(
    () => results.filter((r) => r.flag === 'CRITICAL' && r.status !== 'VERIFIED'),
    [results],
  );

  const avgTatLabel = useMemo(() => {
    const withBoth = results.filter((r) => r.resultAt);
    if (withBoth.length === 0) return '—';
    const totalMs = withBoth.reduce(
      (sum, r) => sum + (new Date(r.resultAt!).getTime() - new Date(r.orderedAt).getTime()),
      0,
    );
    return formatHrsMin(totalMs / withBoth.length);
  }, [results]);

  const equipmentSummary = getEquipmentOnlineSummary();
  const qcTodaySummary = getQcTodaySummary();

  const workQueues = useMemo(() => {
    function urgentCount(rows: LabResult[]) {
      return rows.filter((r) => r.priority === 'STAT' || r.priority === 'URGENT').length;
    }
    function lastUpdated(rows: LabResult[]) {
      if (rows.length === 0) return null;
      const latest = rows.reduce((max, r) => Math.max(max, new Date(r.orderedAt).getTime()), 0);
      return new Date(latest);
    }
    return [
      {
        label: 'Laboratory Orders',
        href: ROUTES.laboratoryOrders,
        icon: FlaskConical,
        rows: openResults,
      },
      {
        label: 'Sample Collection',
        href: ROUTES.laboratorySampleCollection,
        icon: Inbox,
        rows: awaitingCollection,
      },
      {
        label: 'Sample Reception',
        href: ROUTES.laboratorySampleReception,
        icon: Package,
        rows: awaitingReception,
      },
      {
        label: 'Results Awaiting Entry',
        href: ROUTES.laboratoryResultEntry,
        icon: NotebookPen,
        rows: awaitingEntry,
      },
      {
        label: 'Results Awaiting Verification',
        href: ROUTES.laboratoryResultVerification,
        icon: BadgeCheck,
        rows: awaitingVerification,
      },
      {
        label: 'Critical Results',
        href: ROUTES.laboratoryCriticalResults,
        icon: AlertTriangle,
        rows: criticalOpen,
      },
    ].map((q) => ({
      ...q,
      pending: q.rows.length,
      urgent: urgentCount(q.rows),
      lastUpdated: lastUpdated(q.rows),
    }));
  }, [
    openResults,
    awaitingCollection,
    awaitingReception,
    awaitingEntry,
    awaitingVerification,
    criticalOpen,
  ]);

  const tatByDepartment = useMemo(
    () =>
      DEPARTMENTS.map((department) => {
        const rows = results.filter((r) => r.department === department && r.resultAt);
        const count = rows.length;
        const avgMs =
          count === 0
            ? 0
            : rows.reduce(
                (sum, r) =>
                  sum + (new Date(r.resultAt!).getTime() - new Date(r.orderedAt).getTime()),
                0,
              ) / count;
        return { department, count, avgLabel: count === 0 ? '—' : formatHrsMin(avgMs) };
      }),
    [results],
  );
  const tatDonutBreakdown = tatByDepartment
    .filter((d) => d.count > 0)
    .map((d) => ({
      label: d.department,
      value: d.count,
      color: DEPARTMENT_CFG[d.department].color,
    }));
  const tatDonutTotal = tatDonutBreakdown.reduce((sum, d) => sum + d.value, 0);

  const testsByDepartmentToday = useMemo(
    () =>
      DEPARTMENTS.map((department) => ({
        department,
        count: results.filter((r) => r.department === department && isToday(r.orderedAt)).length,
      })),
    [results],
  );
  const testsToday = testsByDepartmentToday.reduce((sum, d) => sum + d.count, 0);

  const sampleStatusBuckets = useMemo(() => {
    const buckets: { label: string; value: number; color: string }[] = [
      {
        label: 'Sample Collected',
        value: results.filter((r) => r.status === 'SAMPLE_COLLECTED').length,
        color: '#00B4D8',
      },
      {
        label: 'In Process',
        value: results.filter((r) => r.status === 'IN_PROCESS').length,
        color: '#F59E0B',
      },
      {
        label: 'Resulted',
        value: results.filter((r) => r.status === 'RESULTED').length,
        color: '#8B5CF6',
      },
      {
        label: 'Verified',
        value: results.filter((r) => r.status === 'VERIFIED').length,
        color: '#16A34A',
      },
    ];
    return buckets;
  }, [results]);
  const totalSamples = sampleStatusBuckets.reduce((sum, b) => sum + b.value, 0);

  const criticalRows = useMemo(
    () =>
      [...criticalOpen]
        .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
        .slice(0, 5),
    [criticalOpen],
  );

  const recentActivity = useMemo(() => {
    type Event = { id: string; label: string; actor: string; at: string; icon: LucideIcon };
    const events: Event[] = [];
    for (const r of results) {
      if (r.sampleCollectedAt && r.sampleCollectedBy) {
        events.push({
          id: `${r.id}-collected`,
          label: `Sample collected for ${r.patientName} — ${r.testName}`,
          actor: r.sampleCollectedBy,
          at: r.sampleCollectedAt,
          icon: FlaskConical,
        });
      }
      if (r.resultAt) {
        events.push({
          id: `${r.id}-resulted`,
          label: `Result entered for ${r.patientName} — ${r.testName}`,
          actor: r.orderedBy,
          at: r.resultAt,
          icon: NotebookPen,
        });
      }
      if (r.doctorReviewedAt && r.doctorReviewedBy && r.status === 'VERIFIED') {
        events.push({
          id: `${r.id}-verified`,
          label: `Result verified for ${r.patientName} — ${r.testName}`,
          actor: r.doctorReviewedBy,
          at: r.doctorReviewedAt,
          icon: CheckCircle2,
        });
      }
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5);
  }, [results]);

  const mergedFeed = useMemo(() => {
    const fromAnnouncements = announcements.slice(0, 3).map((a) => ({
      id: `ann-${a.id}`,
      icon: Megaphone,
      color: '#00B4D8',
      bg: 'rgba(0,180,216,0.1)',
      text: a.title,
      at: a.publishedAt,
    }));
    const fromLab = LAB_NOTIFICATIONS.map((n) => ({
      id: n.id,
      icon: n.type === 'equipment' ? Gauge : n.type === 'qc' ? ShieldCheck : Info,
      color: '#D97706',
      bg: 'rgba(217,119,6,0.1)',
      text: n.message,
      at: isoMinutesAgo(n.minutesAgo),
    }));
    return [...fromAnnouncements, ...fromLab]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 5);
  }, [announcements]);

  if (pageState === 'error') {
    return (
      <main
        className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center"
        style={{ background: '#F5FBFD' }}
      >
        <AlertCircle style={{ width: 40, height: 40, color: '#EF4444', opacity: 0.7 }} />
        <p className="font-sans font-medium" style={{ fontSize: 16, color: '#0D2630' }}>
          Failed to load the laboratory dashboard
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
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Greeting + shift selector + refresh ─────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                {getWATGreeting()}, {lastName(actorName)}
              </h1>
              <p className="mt-0.5 font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                Here&apos;s what&apos;s happening in the laboratory today.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <button
                  ref={shiftButtonRef}
                  type="button"
                  onClick={() => setShiftMenuOpen((v) => !v)}
                  aria-expanded={shiftMenuOpen}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    border: '1px solid rgba(0,100,130,0.2)',
                    color: '#0D2630',
                    fontSize: 14,
                  }}
                >
                  Shift: {shift} ({SHIFT_OPTIONS.find((s) => s.value === shift)?.range})
                  <ChevronDown style={{ width: 15, height: 15, color: '#4A7080' }} />
                </button>
                <RowMenuPortal
                  open={shiftMenuOpen}
                  anchorRef={shiftButtonRef}
                  onClose={() => setShiftMenuOpen(false)}
                  width={260}
                >
                  {SHIFT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setShift(opt.value);
                        setShiftMenuOpen(false);
                      }}
                      className={`flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    >
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {opt.value}
                      </span>
                      <span className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {opt.range}
                      </span>
                    </button>
                  ))}
                </RowMenuPortal>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ background: '#00B4D8', fontSize: 14 }}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Refresh
              </button>
            </div>
          </div>
          <p className="mt-1 font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {formatClinicalDate(now)} · {formatWATTime(now)} WAT
          </p>

          {/* ── Stat cards ───────────────────────────────────────────────── */}
          <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4 xl:gap-4">
            {pageState === 'loading' ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : (
              <>
                <LabStatCard
                  icon={ClipboardList}
                  label="Pending Orders"
                  value={openResults.length}
                  info="Open across the pipeline"
                  accent="#7C3AED"
                  iconBg="rgba(124,58,237,0.1)"
                  viewLabel="View Orders"
                  onView={() => router.push(ROUTES.laboratoryOrders)}
                />
                <LabStatCard
                  icon={Inbox}
                  label="Samples Awaiting Collection"
                  value={awaitingCollection.length}
                  info="Not yet collected"
                  accent="#00B4D8"
                  iconBg="rgba(0,180,216,0.1)"
                  viewLabel="View Collection List"
                  onView={() => router.push(ROUTES.laboratorySampleCollection)}
                />
                <LabStatCard
                  icon={Package}
                  label="Samples Received Today"
                  value={receivedToday.length}
                  info="Collected today"
                  accent="#16A34A"
                  iconBg="rgba(22,163,74,0.1)"
                  viewLabel="View Received"
                  onView={() => router.push(ROUTES.laboratorySampleReception)}
                />
                <LabStatCard
                  icon={NotebookPen}
                  label="Results Awaiting Entry"
                  value={awaitingEntry.length}
                  info="In process at the bench"
                  accent="#D97706"
                  iconBg="rgba(217,119,6,0.1)"
                  viewLabel="View Work Queue"
                  onView={() => router.push(ROUTES.laboratoryTestWorkQueue)}
                />
                <LabStatCard
                  icon={BadgeCheck}
                  label="Results Awaiting Verification"
                  value={awaitingVerification.length}
                  info="Entered, not yet verified"
                  accent="#8B5CF6"
                  iconBg="rgba(139,92,246,0.1)"
                  viewLabel="View Verification"
                  onView={() => router.push(ROUTES.laboratoryResultVerification)}
                />
                <LabStatCard
                  icon={AlertTriangle}
                  label="Critical Results"
                  value={criticalOpen.length}
                  info="Needing attention"
                  accent="#DC2626"
                  iconBg="rgba(220,38,38,0.1)"
                  viewLabel="View Critical"
                  onView={() => router.push(ROUTES.laboratoryCriticalResults)}
                />
                <LabStatCard
                  icon={Timer}
                  label="Average TAT (All Tests)"
                  value={avgTatLabel}
                  info="hrs:min"
                  accent="#0D9488"
                  iconBg="rgba(13,148,136,0.1)"
                  viewLabel="View TAT Report"
                  onView={() => router.push(ROUTES.laboratoryTatReports)}
                />
                <LabStatCard
                  icon={Gauge}
                  label="Active Equipment"
                  value={`${equipmentSummary.online}/${equipmentSummary.total}`}
                  info="Online"
                  accent="#16A34A"
                  iconBg="rgba(22,163,74,0.1)"
                  viewLabel="View Equipment"
                  onView={() => router.push(ROUTES.laboratoryEquipmentCalibration)}
                />
              </>
            )}
          </div>

          {/* ── Rest of the dashboard — a coherent skeleton while loading,
              real content once loaded (data itself is synchronous; this is
              the same brief-flash convention every other dashboard uses) ── */}
          {pageState === 'loading' && (
            <div className="mt-4 flex flex-col gap-4">
              <div
                className="rounded-[12px] p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 flex flex-col gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[12px] p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="mt-4 flex flex-col gap-3">
                      {Array.from({ length: 4 }).map((_, r) => (
                        <SkeletonRow key={r} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick Actions ────────────────────────────────────────────── */}
          {pageState === 'loaded' && (
            <div>
              <div className="mt-4">
                <p
                  className="font-display mb-2 font-semibold"
                  style={{ fontSize: 18, color: '#0D2630' }}
                >
                  Quick Actions
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                  <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                    <QuickActionTile
                      icon={Inbox}
                      label="Receive Sample"
                      color="#00B4D8"
                      onClick={() => router.push(ROUTES.laboratorySampleReception)}
                    />
                  </PermissionGate>
                  <QuickActionTile
                    icon={Printer}
                    label="Print Sample Label"
                    color="#4A7080"
                    onClick={() => router.push(ROUTES.laboratorySampleCollection)}
                  />
                  <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                    <QuickActionTile
                      icon={NotebookPen}
                      label="Enter Test Result"
                      color="#D97706"
                      onClick={() => router.push(ROUTES.laboratoryResultEntry)}
                    />
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                    <QuickActionTile
                      icon={BadgeCheck}
                      label="Verify Result"
                      color="#8B5CF6"
                      onClick={() => router.push(ROUTES.laboratoryResultVerification)}
                    />
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                    <QuickActionTile
                      icon={Send}
                      label="Publish Result"
                      color="#16A34A"
                      onClick={() => router.push(ROUTES.laboratoryPublishedResults)}
                    />
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                    <QuickActionTile
                      icon={AlertTriangle}
                      label="Report Critical Value"
                      color="#DC2626"
                      onClick={() => router.push(ROUTES.laboratoryCriticalResults)}
                    />
                  </PermissionGate>
                  <QuickActionTile
                    icon={Beaker}
                    label="Perform QC Check"
                    color="#0D9488"
                    onClick={() => router.push(ROUTES.laboratoryQualityControl)}
                  />
                  <QuickActionTile
                    icon={Archive}
                    label="Receive Stock"
                    color="#F59E0B"
                    onClick={() => router.push(ROUTES.laboratoryStockReceiving)}
                  />
                </div>
              </div>

              {/* ── Work Queues / TAT Overview / Critical Results ───────────── */}
              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="xl:col-span-1">
                  <Panel
                    title="Work Queues"
                    icon={ListChecks}
                    onViewAll={() => router.push(ROUTES.laboratoryTestWorkQueue)}
                  >
                    <ScrollableTable minWidth={420}>
                      <div
                        className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{
                          background: TABLE_HEADER_BG,
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        <span
                          className="min-w-0 flex-1 py-2.5 pr-2 pl-3 font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Queue
                        </span>
                        <span
                          className="w-20 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Pending
                        </span>
                        <span
                          className="w-16 shrink-0 py-2.5 pr-2 font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Urgent
                        </span>
                        <span
                          className="w-8 shrink-0 py-2.5 pr-3"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        />
                      </div>
                      {workQueues.map((q, idx) => (
                        <button
                          key={q.label}
                          type="button"
                          onClick={() => router.push(q.href)}
                          className={`flex w-full items-center text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{
                            borderBottom:
                              idx === workQueues.length - 1
                                ? undefined
                                : '1px solid rgba(0,100,130,0.08)',
                          }}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2 py-3 pr-2 pl-3">
                            <q.icon
                              style={{ width: 15, height: 15, color: '#8A98A3', flexShrink: 0 }}
                            />
                            <Tooltip content={q.label}>
                              <span
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {q.label}
                              </span>
                            </Tooltip>
                          </div>
                          <div className="w-20 shrink-0 py-3 pr-2">
                            <span
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {q.pending}
                            </span>
                          </div>
                          <div className="w-16 shrink-0 py-3 pr-2">
                            <span
                              className="font-sans font-semibold"
                              style={{
                                fontSize: 14,
                                color: q.urgent > 0 ? '#DC2626' : '#8A98A3',
                              }}
                            >
                              {q.urgent}
                            </span>
                          </div>
                          <div className="flex w-8 shrink-0 justify-end py-3 pr-3">
                            <ChevronDown
                              style={{
                                width: 14,
                                height: 14,
                                color: '#8A98A3',
                                transform: 'rotate(-90deg)',
                              }}
                            />
                          </div>
                        </button>
                      ))}
                    </ScrollableTable>
                  </Panel>
                </div>

                <div className="xl:col-span-1">
                  <Panel
                    title="Turnaround Time (TAT) Overview"
                    icon={Timer}
                    onViewAll={() => router.push(ROUTES.laboratoryTatReports)}
                  >
                    <div className="flex shrink-0 flex-col items-center gap-1 pb-2 text-center">
                      <span
                        className="font-display font-black"
                        style={{ fontSize: 24, color: '#0D9488' }}
                      >
                        {avgTatLabel}
                      </span>
                      <span className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Average TAT (hrs:min)
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row">
                      <AnimatedDonutChart
                        breakdown={tatDonutBreakdown}
                        total={tatDonutTotal}
                        size={180}
                        ariaLabel="Turnaround time by department"
                      />
                      <div className="flex flex-col gap-2.5">
                        {tatByDepartment.map((d) => (
                          <div key={d.department} className="flex items-center gap-2">
                            <span
                              className="shrink-0 rounded-full"
                              style={{
                                width: 9,
                                height: 9,
                                background: DEPARTMENT_CFG[d.department].color,
                              }}
                            />
                            <Tooltip content={d.department}>
                              <span
                                className="w-24 shrink-0 truncate font-sans"
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                {d.department}
                              </span>
                            </Tooltip>
                            <span
                              className="font-sans font-medium whitespace-nowrap"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {d.avgLabel} hrs
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Panel>
                </div>

                <div className="xl:col-span-2">
                  <Panel
                    title="Critical Results (Needing Attention)"
                    icon={AlertTriangle}
                    onViewAll={() => router.push(ROUTES.laboratoryCriticalResults)}
                  >
                    {criticalRows.length === 0 ? (
                      <EmptyRow label="No critical results right now." />
                    ) : (
                      <div
                        className="flex flex-col divide-y"
                        style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                      >
                        {criticalRows.map((r) => {
                          const flagCfg = FLAG_CFG[r.flag ?? 'CRITICAL'] ?? FLAG_CFG['CRITICAL']!;
                          return (
                            <div
                              key={r.id}
                              className="flex items-start justify-between gap-3 py-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <Tooltip content={r.patientName}>
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {r.patientName}
                                  </p>
                                </Tooltip>
                                <p className="font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {r.testName} · {r.department}
                                </p>
                                <p className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  Lab No: {deriveLabNo(r)}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <span
                                  className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color: flagCfg.color,
                                    background: flagCfg.bg,
                                    border: `1px solid ${flagCfg.border}`,
                                  }}
                                >
                                  {flagCfg.label}
                                </span>
                                <span
                                  className="font-sans whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#8A98A3' }}
                                >
                                  {formatWATTime(new Date(r.orderedAt))}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                </div>
              </div>

              {/* ── Tests by Department / Sample Status / QC / Equipment ────── */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="lg:col-span-1">
                  <Panel title="Tests by Department (Today)" icon={Radar}>
                    {testsToday === 0 ? (
                      <EmptyRow label="No tests ordered yet today." />
                    ) : (
                      <>
                        <DepartmentBars rows={testsByDepartmentToday} animate={animateCharts} />
                        <p className="mt-3 font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                          Total: {testsToday} tests
                        </p>
                      </>
                    )}
                  </Panel>
                </div>

                <div className="lg:col-span-1">
                  <Panel title="Sample Status Overview" icon={FlaskConical}>
                    <div className="flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row">
                      <AnimatedDonutChart
                        breakdown={sampleStatusBuckets}
                        total={totalSamples}
                        size={180}
                        ariaLabel="Sample status breakdown"
                      />
                      <div className="flex flex-col gap-2.5">
                        {sampleStatusBuckets.map((b) => {
                          const percent =
                            totalSamples > 0 ? Math.round((b.value / totalSamples) * 100) : 0;
                          return (
                            <div key={b.label} className="flex items-center gap-2">
                              <span
                                className="shrink-0 rounded-full"
                                style={{ width: 9, height: 9, background: b.color }}
                              />
                              <Tooltip content={b.label}>
                                <span
                                  className="w-28 shrink-0 truncate font-sans"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {b.label}
                                </span>
                              </Tooltip>
                              <span
                                className="font-sans font-medium whitespace-nowrap"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {b.value} ({percent}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p
                      className="mt-3 shrink-0 text-center font-sans"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      Total Samples: {totalSamples}
                    </p>
                  </Panel>
                </div>

                <div className="lg:col-span-1">
                  <Panel
                    title="Quality Control (QC) Today"
                    icon={ShieldCheck}
                    onViewAll={() => router.push(ROUTES.laboratoryQualityControl)}
                  >
                    <div className="grid grid-cols-3 gap-2.5">
                      <div
                        className="flex flex-col items-center gap-1 rounded-[10px] py-4"
                        style={{ background: 'rgba(22,163,74,0.06)' }}
                      >
                        <CheckCircle2 style={{ width: 20, height: 20, color: '#16A34A' }} />
                        <span
                          className="font-display font-black"
                          style={{ fontSize: 22, color: '#16A34A' }}
                        >
                          {qcTodaySummary.passed}
                        </span>
                        <span className="font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                          Passed
                        </span>
                      </div>
                      <div
                        className="flex flex-col items-center gap-1 rounded-[10px] py-4"
                        style={{ background: 'rgba(220,38,38,0.06)' }}
                      >
                        <XCircle style={{ width: 20, height: 20, color: '#DC2626' }} />
                        <span
                          className="font-display font-black"
                          style={{ fontSize: 22, color: '#DC2626' }}
                        >
                          {qcTodaySummary.failed}
                        </span>
                        <span className="font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                          Failed
                        </span>
                      </div>
                      <div
                        className="flex flex-col items-center gap-1 rounded-[10px] py-4"
                        style={{ background: 'rgba(74,112,128,0.06)' }}
                      >
                        <Clock3 style={{ width: 20, height: 20, color: '#4A7080' }} />
                        <span
                          className="font-display font-black"
                          style={{ fontSize: 22, color: '#4A7080' }}
                        >
                          {qcTodaySummary.inProgress}
                        </span>
                        <span className="font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                          Pending
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Last QC run:{' '}
                      {(() => {
                        const lastRunAt = getMostRecentQcRunAt();
                        return lastRunAt ? formatWATTime(new Date(lastRunAt)) : '—';
                      })()}
                    </p>
                  </Panel>
                </div>

                <div className="lg:col-span-1">
                  <Panel
                    title="Equipment Status"
                    icon={Gauge}
                    onViewAll={() => router.push(ROUTES.laboratoryEquipmentCalibration)}
                  >
                    <div
                      className="flex flex-col divide-y"
                      style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                    >
                      {EQUIPMENT_STATUS.slice(0, 6).map((eq) => {
                        const cfg = EQUIPMENT_STATUS_CFG[eq.status];
                        return (
                          <div
                            key={eq.name}
                            className="flex items-center justify-between gap-2 py-2.5"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="shrink-0 rounded-full"
                                style={{ width: 8, height: 8, background: cfg.color }}
                              />
                              <Tooltip content={eq.name}>
                                <span
                                  className="truncate font-sans"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {eq.name}
                                </span>
                              </Tooltip>
                            </div>
                            <span
                              className="shrink-0 font-sans font-medium whitespace-nowrap"
                              style={{ fontSize: 14, color: cfg.color }}
                            >
                              {cfg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </div>
              </div>

              {/* ── Recent Activity / Announcements ──────────────────────────── */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel title="Recent Activity" icon={Clock3}>
                  {recentActivity.length === 0 ? (
                    <EmptyRow label="No recent activity yet." />
                  ) : (
                    <div
                      className="flex flex-col divide-y"
                      style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                    >
                      {recentActivity.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 py-2.5">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full"
                            style={{ background: 'rgba(0,180,216,0.1)' }}
                          >
                            <event.icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Tooltip content={event.label}>
                              <p
                                className="truncate font-sans"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {event.label}
                              </p>
                            </Tooltip>
                            <p className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                              by {event.actor} · {toRelativeTime(event.at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Notifications & Announcements"
                  icon={Bell}
                  onViewAll={() => router.push(ROUTES.announcements)}
                >
                  {mergedFeed.length === 0 ? (
                    <EmptyRow label="Nothing new right now." />
                  ) : (
                    <div
                      className="flex flex-col divide-y"
                      style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                    >
                      {mergedFeed.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 py-2.5">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full"
                            style={{ background: item.bg }}
                          >
                            <item.icon style={{ width: 16, height: 16, color: item.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Tooltip content={item.text}>
                              <p
                                className="truncate font-sans"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {item.text}
                              </p>
                            </Tooltip>
                            <p className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {toRelativeTime(item.at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          )}

          <div className="h-6" />
        </div>
      </main>
    </div>
  );
}
