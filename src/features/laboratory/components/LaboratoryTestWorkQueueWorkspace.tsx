'use client';

import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Hourglass,
  MoreVertical,
  PackageCheck,
  PauseCircle,
  Play,
  Printer,
  RefreshCw,
  ScanLine,
  Search,
  TestTube2,
  Timer,
  UserRound,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ExportMenu } from '@components/ExportMenu';
import { FilterDropdown } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatDateTime, formatTime, isSameDay, isToday } from '@/utils/datetime';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import {
  putTestOnHold,
  resumeTest,
  startTest,
  useLabResults,
} from '@/features/laboratory/store/labResultStore';
import {
  completedToday,
  deriveCollectionPoint,
  deriveSampleId,
  deriveTrackingStage,
  groupIntoOrders,
  orderSampleType,
  relevantTests,
  type RawLabOrder,
  type TrackingStage,
} from '@/features/laboratory/utils/labOrders';
import type {
  LabDepartment,
  LabResultPriority,
  LabResultStatus,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import type { HoldTestInput } from './HoldTestModal';

const HoldTestModal = dynamic(() => import('./HoldTestModal').then((m) => m.HoldTestModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});

const ScanSampleModal = dynamic(() => import('./ScanSampleModal').then((m) => m.ScanSampleModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

type RowStatus = 'In Queue' | 'In Progress' | 'On Hold' | 'Completed';

/** Bench-processing SLA — a different, narrower budget than any prior
 * screen's (measured from *received*, not order/collection), since this is
 * the lab's own turnaround, not the whole specimen journey. */
const PROCESSING_TARGET_MS: Record<LabResultPriority, number> = {
  STAT: 2 * 60 * 60_000,
  URGENT: 4 * 60 * 60_000,
  ROUTINE: 8 * 60 * 60_000,
};

type QueueOrder = RawLabOrder & {
  status: RowStatus;
  isHighPriority: boolean;
  addedAt?: string;
  tatRemainingMs?: number;
};

function earliestOf(dates: (string | undefined)[]): string | undefined {
  let earliest: string | undefined;
  for (const d of dates) {
    if (!d) continue;
    if (!earliest || new Date(d).getTime() < new Date(earliest).getTime()) earliest = d;
  }
  return earliest;
}

function buildQueueOrder(raw: RawLabOrder, nowMs: number): QueueOrder | undefined {
  const isHighPriority = raw.priority === 'STAT' || raw.priority === 'URGENT';
  const relevant = relevantTests(raw);

  if (relevant.length === 0) {
    if (!completedToday(raw)) return undefined;
    const resultedTests = raw.tests.filter(
      (t) => (t.status === 'RESULTED' || t.status === 'VERIFIED') && t.resultAt,
    );
    const addedAt = earliestOf(resultedTests.map((t) => t.receivedAt ?? t.sampleCollectedAt));
    return { ...raw, status: 'Completed', isHighPriority, ...(addedAt ? { addedAt } : {}) };
  }

  const onHold = relevant.some((t) => t.isOnHold);
  const started = relevant.some((t) => t.analysisStartedAt);
  const status: RowStatus = onHold ? 'On Hold' : started ? 'In Progress' : 'In Queue';

  const addedAt = earliestOf(relevant.map((t) => t.receivedAt ?? t.sampleCollectedAt));
  const tatRemainingMs = addedAt
    ? PROCESSING_TARGET_MS[raw.priority] - (nowMs - new Date(addedAt).getTime())
    : undefined;

  return {
    ...raw,
    status,
    isHighPriority,
    ...(addedAt ? { addedAt } : {}),
    ...(tatRemainingMs !== undefined ? { tatRemainingMs } : {}),
  };
}

function formatHrsMin(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatTatRemaining(ms: number): string {
  return ms < 0 ? `-${formatHrsMin(-ms)}` : formatHrsMin(ms);
}

// ── Config ─────────────────────────────────────────────────────────────────

const DEPARTMENTS: LabDepartment[] = [
  'Hematology',
  'Biochemistry',
  'Microbiology',
  'Immunology',
  'Coagulation',
];
const DEPARTMENT_OPTIONS = DEPARTMENTS.map((d) => ({ value: d, label: d }));
const DATE_RANGE_OPTIONS = [
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
];
const PRIORITY_OPTIONS = [
  { value: 'STAT', label: 'STAT' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'ROUTINE', label: 'Routine' },
];

type FilterKey = 'dateRange' | 'department' | 'priority';
type FilterState = Record<FilterKey, string>;
const FILTER_DEFAULTS: FilterState = { dateRange: 'ALL', department: 'ALL', priority: 'ALL' };
const FILTER_DEFS: {
  key: FilterKey;
  defaultLabel: string;
  options: { value: string; label: string }[];
}[] = [
  { key: 'dateRange', defaultLabel: 'All Time', options: DATE_RANGE_OPTIONS },
  { key: 'department', defaultLabel: 'All Departments', options: DEPARTMENT_OPTIONS },
  { key: 'priority', defaultLabel: 'All Priorities', options: PRIORITY_OPTIONS },
];

type Tab = 'All Tests' | 'High Priority' | 'In Progress' | 'On Hold' | 'Completed Today';
const TABS: Tab[] = ['All Tests', 'High Priority', 'In Progress', 'On Hold', 'Completed Today'];

const STATUS_CFG: Record<RowStatus, { color: string; border: string; bg: string }> = {
  'In Queue': { color: '#8B5CF6', border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.08)' },
  'In Progress': { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.08)' },
  'On Hold': { color: '#D97706', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Completed: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
};

const PRIORITY_CFG: Record<LabResultPriority, { color: string; border: string; bg: string }> = {
  STAT: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  URGENT: { color: '#D97706', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  ROUTINE: { color: '#4A7080', border: 'rgba(0,100,130,0.2)', bg: 'transparent' },
};

function testDisplayStatus(t: {
  status: LabResultStatus;
  isOnHold?: boolean;
  analysisStartedAt?: string;
}): { label: string; color: string; border: string; bg: string } {
  if (t.status === 'RESULTED' || t.status === 'VERIFIED') {
    return {
      label: 'Completed',
      color: '#16A34A',
      border: 'rgba(34,197,94,0.4)',
      bg: 'rgba(34,197,94,0.08)',
    };
  }
  if (t.isOnHold) {
    return {
      label: 'On Hold',
      color: '#D97706',
      border: 'rgba(245,158,11,0.4)',
      bg: 'rgba(245,158,11,0.08)',
    };
  }
  if (t.analysisStartedAt) {
    return {
      label: 'In Progress',
      color: '#3B82F6',
      border: 'rgba(59,130,246,0.4)',
      bg: 'rgba(59,130,246,0.08)',
    };
  }
  return {
    label: 'Pending',
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.4)',
    bg: 'rgba(139,92,246,0.08)',
  };
}

const STEPPER_STAGES: { stage: TrackingStage; label: string; icon: LucideIcon }[] = [
  { stage: 'Collected', label: 'Collected', icon: TestTube2 },
  { stage: 'Received', label: 'Received', icon: PackageCheck },
  { stage: 'In Analysis', label: 'In Analysis', icon: FlaskConical },
  { stage: 'Awaiting Verification', label: 'Verified', icon: ClipboardList },
  { stage: 'Published', label: 'Published', icon: CheckCircle2 },
];

// ── Export ─────────────────────────────────────────────────────────────────

function exportOrdersAsCSV(orders: QueueOrder[]) {
  downloadCSV('test-work-queue', [
    [
      'Sample ID',
      'Order ID',
      'Patient',
      'MRN',
      'Test(s)',
      'Department',
      'Priority',
      'Status',
      'Added At',
    ],
    ...orders.map((o) => [
      deriveSampleId(o.groupKey, o.orderedAt),
      o.orderId,
      o.patientName,
      o.mrn,
      o.tests.map((t) => t.testName).join('; '),
      Array.from(new Set(o.tests.map((t) => t.department))).join('; '),
      o.priority,
      o.status,
      o.addedAt ? formatDateTime(o.addedAt) : '—',
    ]),
  ]);
}

function printableWorklist(orders: QueueOrder[]) {
  const body = `
    <h1>Test Work Queue — Printable Worklist</h1>
    <p class="meta">${orders.length} item${orders.length === 1 ? '' : 's'}</p>
    <table>
      <thead><tr><th>Sample ID</th><th>Order ID</th><th>Patient</th><th>Test(s)</th><th>Department</th><th>Priority</th><th>Status</th></tr></thead>
      <tbody>
        ${orders
          .map(
            (o) =>
              `<tr><td>${escapeHtml(deriveSampleId(o.groupKey, o.orderedAt))}</td><td>${escapeHtml(o.orderId)}</td><td>${escapeHtml(o.patientName)}</td><td>${escapeHtml(o.tests.map((t) => t.testName).join(', '))}</td><td>${escapeHtml(Array.from(new Set(o.tests.map((t) => t.department))).join(', '))}</td><td>${escapeHtml(o.priority)}</td><td>${escapeHtml(o.status)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
  downloadPDF('test-work-queue-worklist', body);
}

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
    <div
      className="flex items-center gap-3 px-3 py-3"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="h-3.5 w-24 shrink-0 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-32 shrink-0 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 flex-1 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-20 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

// ── Row action menu ──────────────────────────────────────────────────────────

function QueueRowMenu({
  status,
  open,
  onToggle,
  onView,
  onHold,
  onResume,
}: {
  status: RowStatus;
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onHold?: (() => void) | undefined;
  onResume?: (() => void) | undefined;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={200}>
        <button
          type="button"
          onClick={onView}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <ClipboardList style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View Details
        </button>
        {status === 'On Hold' && onResume && (
          <button
            type="button"
            onClick={onResume}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <Play style={{ width: 15, height: 15, color: '#16A34A' }} />
            Resume
          </button>
        )}
        {(status === 'In Queue' || status === 'In Progress') && onHold && (
          <button
            type="button"
            onClick={onHold}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <PauseCircle style={{ width: 15, height: 15, color: '#D97706' }} />
            Put On Hold
          </button>
        )}
      </RowMenuPortal>
    </div>
  );
}

// ── Main workspace ───────────────────────────────────────────────────────────

export function LaboratoryTestWorkQueueWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const results = useLabResults();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now] = useState(() => new Date());

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 700);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  const orders = useMemo<QueueOrder[]>(() => {
    const nowMs = now.getTime();
    const built: QueueOrder[] = [];
    for (const raw of groupIntoOrders(results)) {
      const order = buildQueueOrder(raw, nowMs);
      if (order) built.push(order);
    }
    return built;
  }, [results, now]);

  const universe = useMemo(() => orders.filter((o) => o.status !== 'Completed'), [orders]);
  const completedTodayOrders = useMemo(
    () => orders.filter((o) => o.status === 'Completed'),
    [orders],
  );

  // ── Stat cards ────────────────────────────────────────────────────────────
  const testsInQueueCount = universe.length;
  const highPriorityCount = useMemo(
    () => universe.filter((o) => o.isHighPriority).length,
    [universe],
  );
  const inProgressCount = useMemo(
    () => universe.filter((o) => o.status === 'In Progress').length,
    [universe],
  );
  const completedTodayCount = completedTodayOrders.length;
  const overdueCount = useMemo(
    () => universe.filter((o) => o.tatRemainingMs !== undefined && o.tatRemainingMs < 0).length,
    [universe],
  );
  const avgTatLabel = useMemo(() => {
    const durations: number[] = [];
    for (const r of results) {
      const start = r.receivedAt ?? r.sampleCollectedAt;
      if (!start || !r.resultAt) continue;
      if (r.status !== 'RESULTED' && r.status !== 'VERIFIED') continue;
      durations.push(new Date(r.resultAt).getTime() - new Date(start).getTime());
    }
    if (durations.length === 0) return '—';
    return formatHrsMin(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }, [results]);

  // ── Filters / search / tabs / pagination ─────────────────────────────────
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [tab, setTab] = useState<Tab>('All Tests');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [rowMenuOpenKey, setRowMenuOpenKey] = useState<string | null>(null);
  const [holdTarget, setHoldTarget] = useState<QueueOrder | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  function setFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenFilter(null);
    setPage(1);
  }

  const preTabFiltered = useMemo(() => {
    let list = orders;
    if (filters.dateRange !== 'ALL') {
      list = list.filter((o) => {
        if (filters.dateRange === 'TODAY') return isToday(o.orderedAt);
        if (filters.dateRange === 'YESTERDAY') {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          return isSameDay(o.orderedAt, y);
        }
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(o.orderedAt).getTime() >= sevenDaysAgo.getTime();
      });
    }
    if (filters.department !== 'ALL') {
      list = list.filter((o) => o.tests.some((t) => t.department === filters.department));
    }
    if (filters.priority !== 'ALL') list = list.filter((o) => o.priority === filters.priority);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.patientName.toLowerCase().includes(q) ||
          o.mrn.toLowerCase().includes(q) ||
          o.orderId.toLowerCase().includes(q) ||
          deriveSampleId(o.groupKey, o.orderedAt).toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, filters, search, now]);

  const tabCounts = useMemo(() => {
    const base = preTabFiltered.filter((o) => o.status !== 'Completed');
    return {
      'All Tests': base.length,
      'High Priority': base.filter((o) => o.isHighPriority).length,
      'In Progress': base.filter((o) => o.status === 'In Progress').length,
      'On Hold': base.filter((o) => o.status === 'On Hold').length,
      'Completed Today': preTabFiltered.filter((o) => o.status === 'Completed').length,
    } as Record<Tab, number>;
  }, [preTabFiltered]);

  const filtered = useMemo(() => {
    switch (tab) {
      case 'All Tests':
        return preTabFiltered.filter((o) => o.status !== 'Completed');
      case 'High Priority':
        return preTabFiltered.filter((o) => o.status !== 'Completed' && o.isHighPriority);
      case 'In Progress':
        return preTabFiltered.filter((o) => o.status === 'In Progress');
      case 'On Hold':
        return preTabFiltered.filter((o) => o.status === 'On Hold');
      case 'Completed Today':
        return preTabFiltered.filter((o) => o.status === 'Completed');
    }
  }, [preTabFiltered, tab]);

  const hasActiveFilters = search !== '' || Object.values(filters).some((v) => v !== 'ALL');

  function clearFilters() {
    setSearch('');
    setFilters(FILTER_DEFAULTS);
    setPage(1);
  }

  function selectTab(next: Tab) {
    setTab(next);
    setPage(1);
    setSelectedGroupKey(null);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const selectedOrder = selectedGroupKey
    ? orders.find((o) => o.groupKey === selectedGroupKey)
    : undefined;

  function openOrder(order: QueueOrder) {
    setSelectedGroupKey(order.groupKey);
  }

  function handleStartTest(order: QueueOrder) {
    const toStart = relevantTests(order).filter((t) => !t.analysisStartedAt && !t.isOnHold);
    if (toStart.length === 0) return;
    for (const t of toStart) startTest(t.id, user?.name ?? 'Lab Scientist');
    toast.success(
      'Test started',
      `${order.orderId} — ${toStart.length} test${toStart.length === 1 ? '' : 's'} now in progress.`,
    );
  }

  function handleResume(order: QueueOrder) {
    const held = relevantTests(order).filter((t) => t.isOnHold);
    if (held.length === 0) return;
    for (const t of held) resumeTest(t.id);
    toast.success('Resumed', `${order.orderId} is back in progress.`);
  }

  function handleHoldConfirm(input: HoldTestInput) {
    if (!holdTarget) return;
    for (const id of input.testIds) putTestOnHold(id, user?.name ?? 'Lab Scientist', input.reason);
    toast.success(
      'Test on hold',
      `${holdTarget.orderId} — ${input.testIds.length} test${input.testIds.length === 1 ? '' : 's'} paused.`,
    );
    setHoldTarget(null);
  }

  const scanEntries = useMemo(
    () =>
      universe.map((o) => ({
        sampleId: deriveSampleId(o.groupKey, o.orderedAt),
        groupKey: o.groupKey,
      })),
    [universe],
  );

  if (pageState === 'error') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
          <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load the work queue
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
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Test Work Queue
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                View and manage tests awaiting processing in the laboratory
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleRetry}
                className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <RefreshCw style={{ width: 15, height: 15 }} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <ScanLine style={{ width: 15, height: 15 }} />
                Scan Sample
              </button>
            </div>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {pageState === 'loading' ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : (
              <>
                <StatCard
                  icon={FlaskConical}
                  label="Tests in Queue"
                  value={testsInQueueCount}
                  info="Received, not yet resulted"
                  accent="#8B5CF6"
                  iconBg="rgba(139,92,246,0.1)"
                />
                <StatCard
                  icon={AlertCircle}
                  label="High Priority"
                  value={highPriorityCount}
                  info="STAT and Urgent"
                  accent="#EF4444"
                  iconBg="rgba(239,68,68,0.1)"
                />
                <StatCard
                  icon={Hourglass}
                  label="In Progress"
                  value={inProgressCount}
                  info="Being worked on now"
                  accent="#3B82F6"
                  iconBg="rgba(59,130,246,0.1)"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Completed Today"
                  value={completedTodayCount}
                  info="Resulted since midnight (WAT)"
                  accent="#16A34A"
                  iconBg="rgba(22,163,74,0.1)"
                />
                <StatCard
                  icon={AlertCircle}
                  label="Overdue"
                  value={overdueCount}
                  info="Past the processing SLA"
                  accent="#DC2626"
                  iconBg="rgba(220,38,38,0.1)"
                />
                <StatCard
                  icon={Timer}
                  label="Avg TAT (All)"
                  value={avgTatLabel}
                  info="Received to resulted (hrs:min)"
                  accent="#D97706"
                  iconBg="rgba(245,158,11,0.1)"
                />
              </>
            )}
          </div>

          {pageState === 'loaded' && (
            <>
              {/* ── Filter bar ──────────────────────────────────────────────── */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[220px] flex-1">
                  <Search
                    style={{
                      width: 16,
                      height: 16,
                      color: '#8A98A3',
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by patient, MRN, order ID, or sample ID"
                    className={`h-11 w-full rounded-[10px] pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                      background: '#FFFFFF',
                    }}
                  />
                </div>
                {FILTER_DEFS.map((def) => (
                  <FilterDropdown
                    key={def.key}
                    def={def}
                    value={filters[def.key]}
                    isOpen={openFilter === def.key}
                    onToggle={() => setOpenFilter(openFilter === def.key ? null : def.key)}
                    onSelect={(v) => setFilter(def.key, v)}
                  />
                ))}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#EF4444' }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                    Clear filters
                  </button>
                )}
              </div>

              {/* ── Tabs + export/print ─────────────────────────────────────── */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="overflow-x-auto scroll-smooth">
                  <div
                    className="flex gap-1"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    {TABS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => selectTab(t)}
                        className={`shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: tab === t ? '#00B4D8' : '#4A7080',
                          borderBottom: tab === t ? '2px solid #00B4D8' : '2px solid transparent',
                        }}
                      >
                        {t} ({tabCounts[t]})
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printableWorklist(filtered)}
                    className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-slate-50 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  >
                    <Printer style={{ width: 15, height: 15 }} />
                    Printable Worklist
                  </button>
                  <ExportMenu
                    variant="button"
                    onExportPDF={() => printableWorklist(filtered)}
                    onExportCSV={() => exportOrdersAsCSV(filtered)}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                {/* ── List pane ─────────────────────────────────────────────── */}
                <div className={`min-w-0 flex-1 ${selectedOrder ? 'hidden xl:block' : 'block'}`}>
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <ScrollableTable minWidth={1560} maxHeight={640}>
                      <div
                        className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{
                          background: TABLE_HEADER_BG,
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        {[
                          ['Sample ID', 'w-48', 'left'],
                          ['Order ID', 'w-44', 'left'],
                          ['Patient', 'w-44', 'left'],
                          ['Test(s)', 'min-w-[160px] flex-1', 'left'],
                          ['Department', 'w-36', 'left'],
                          ['Priority', 'w-24', 'center'],
                          ['Status', 'w-40', 'center'],
                          ['TAT Remaining', 'w-32', 'center'],
                          ['Added At', 'w-32', 'left'],
                        ].map(([label, width, align]) => (
                          <div
                            key={label}
                            className={`${width} shrink-0 py-2.5 pr-2 ${align === 'center' ? 'text-center' : ''}`}
                          >
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              {label}
                            </span>
                          </div>
                        ))}
                        <div className="w-40 shrink-0 py-2.5 pr-3 text-center">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Action
                          </span>
                        </div>
                      </div>

                      {pageRows.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                          <div
                            className="flex size-14 items-center justify-center rounded-full"
                            style={{ background: 'rgba(226,237,241,0.6)' }}
                          >
                            <Search style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 16, color: '#4A7080' }}
                          >
                            No tests match your filters
                          </p>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={clearFilters}
                              className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
                      )}

                      {pageRows.map((order) => {
                        const statusCfg = STATUS_CFG[order.status];
                        const priorityCfg = PRIORITY_CFG[order.priority];
                        const sampleId = deriveSampleId(order.groupKey, order.orderedAt);
                        const departments = Array.from(
                          new Set(order.tests.map((t) => t.department)),
                        );
                        const testsLabel =
                          order.tests.length === 1
                            ? order.tests[0]!.testName
                            : `${order.tests.length} tests`;
                        const testsTooltip = order.tests.map((t) => t.testName).join(', ');
                        const canStart = order.status === 'In Queue';
                        const canContinue = order.status === 'In Progress';
                        const canResume = order.status === 'On Hold';

                        return (
                          <div
                            key={order.groupKey}
                            onClick={() => openOrder(order)}
                            className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                            style={{
                              borderBottom: '1px solid rgba(0,100,130,0.08)',
                              background:
                                selectedGroupKey === order.groupKey ? '#E6F8FD' : 'transparent',
                            }}
                          >
                            <div className="w-48 shrink-0 py-3 pr-2 pl-3">
                              <Tooltip content={sampleId}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {sampleId}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2">
                              <Tooltip content={order.orderId}>
                                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                  {order.orderId}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2">
                              <Tooltip content={order.patientName}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {order.patientName}
                                </p>
                              </Tooltip>
                              <Tooltip content={order.mrn}>
                                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {order.mrn}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="min-w-[160px] flex-1 py-3 pr-2">
                              <Tooltip content={testsTooltip}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {testsLabel}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2">
                              <Tooltip content={departments.join(', ')}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {departments.length === 1 ? departments[0] : 'Multiple'}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-24 shrink-0 py-3 pr-2 text-center">
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                                style={{
                                  fontSize: 14,
                                  color: priorityCfg.color,
                                  border: `1px solid ${priorityCfg.border}`,
                                  background: priorityCfg.bg,
                                }}
                              >
                                {order.priority}
                              </span>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2 text-center">
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                                style={{
                                  fontSize: 14,
                                  color: statusCfg.color,
                                  border: `1px solid ${statusCfg.border}`,
                                  background: statusCfg.bg,
                                }}
                              >
                                {order.status}
                              </span>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2 text-center">
                              <p
                                style={{
                                  fontSize: 14,
                                  color:
                                    order.tatRemainingMs !== undefined && order.tatRemainingMs < 0
                                      ? '#EF4444'
                                      : '#4A7080',
                                }}
                              >
                                {order.tatRemainingMs !== undefined
                                  ? formatTatRemaining(order.tatRemainingMs)
                                  : '—'}
                              </p>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2">
                              {order.addedAt ? (
                                <>
                                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                                    {formatDate(order.addedAt)}
                                  </p>
                                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                    {formatTime(order.addedAt)}
                                  </p>
                                </>
                              ) : (
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>—</p>
                              )}
                            </div>
                            <div
                              className="flex w-40 shrink-0 items-center justify-center gap-1 py-3 pr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canStart && (
                                <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                                  <button
                                    type="button"
                                    onClick={() => handleStartTest(order)}
                                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                    style={{ fontSize: 14, background: '#00B4D8' }}
                                  >
                                    <Play style={{ width: 14, height: 14 }} />
                                    Start Test
                                  </button>
                                </PermissionGate>
                              )}
                              {canContinue && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(
                                      `${ROUTES.laboratoryResultEntry}?order=${encodeURIComponent(order.groupKey)}`,
                                    )
                                  }
                                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                  style={{ fontSize: 14, background: '#3B82F6' }}
                                >
                                  Continue
                                </button>
                              )}
                              {canResume && (
                                <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                                  <button
                                    type="button"
                                    onClick={() => handleResume(order)}
                                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                    style={{ fontSize: 14, background: '#D97706' }}
                                  >
                                    Resume
                                  </button>
                                </PermissionGate>
                              )}
                              {order.status === 'Completed' && (
                                <button
                                  type="button"
                                  onClick={() => openOrder(order)}
                                  className={`flex h-9 items-center rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                  style={{
                                    fontSize: 14,
                                    color: '#4A7080',
                                    border: '1px solid rgba(0,100,130,0.18)',
                                  }}
                                >
                                  View
                                </button>
                              )}
                              <QueueRowMenu
                                status={order.status}
                                open={rowMenuOpenKey === order.groupKey}
                                onToggle={() =>
                                  setRowMenuOpenKey(
                                    rowMenuOpenKey === order.groupKey ? null : order.groupKey,
                                  )
                                }
                                onView={() => {
                                  setRowMenuOpenKey(null);
                                  openOrder(order);
                                }}
                                onHold={
                                  order.status === 'In Queue' || order.status === 'In Progress'
                                    ? () => {
                                        setRowMenuOpenKey(null);
                                        setHoldTarget(order);
                                      }
                                    : undefined
                                }
                                onResume={
                                  order.status === 'On Hold'
                                    ? () => {
                                        setRowMenuOpenKey(null);
                                        handleResume(order);
                                      }
                                    : undefined
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </ScrollableTable>

                    {filtered.length > 0 && (
                      <Pagination
                        page={safePage}
                        pageSize={pageSize}
                        totalItems={filtered.length}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                          setPageSize(size);
                          setPage(1);
                        }}
                        itemLabel="tests"
                      />
                    )}
                  </div>
                </div>

                {/* ── Detail pane ───────────────────────────────────────────── */}
                {selectedOrder && (
                  <div
                    className="flex w-full shrink-0 flex-col overflow-hidden xl:w-[380px]"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.12)',
                      borderRadius: 12,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                      <div className="flex items-center gap-2">
                        <p
                          className="font-display font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          {deriveSampleId(selectedOrder.groupKey, selectedOrder.orderedAt)}
                        </p>
                        <span
                          className="rounded-full px-2.5 py-0.5 font-sans font-semibold whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: PRIORITY_CFG[selectedOrder.priority].color,
                            border: `1px solid ${PRIORITY_CFG[selectedOrder.priority].border}`,
                            background: PRIORITY_CFG[selectedOrder.priority].bg,
                          }}
                        >
                          {selectedOrder.priority}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedGroupKey(null)}
                        aria-label="Close"
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      >
                        <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                      </button>
                    </div>
                    <p
                      className="-mt-2 px-4 pb-3 sm:px-5"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      Order: {selectedOrder.orderId}
                    </p>

                    <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                      {/* Patient Information */}
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-12 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                          style={{ background: selectedOrder.avatarBg, fontSize: 15 }}
                        >
                          {selectedOrder.initials}
                        </div>
                        <div className="min-w-0">
                          <Tooltip content={selectedOrder.patientName}>
                            <p
                              className="truncate font-sans font-semibold"
                              style={{ fontSize: 16, color: '#0D2630' }}
                            >
                              {selectedOrder.patientName}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {selectedOrder.mrn}</p>
                        </div>
                      </div>
                      {selectedOrder.patientId && (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(ROUTES.patientProfile(selectedOrder.patientId!))
                          }
                          className={`mt-3 flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          <UserRound style={{ width: 14, height: 14 }} />
                          View Patient Profile
                        </button>
                      )}

                      {/* Order Information */}
                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Order Information
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          {[
                            ['Requested By', selectedOrder.orderedBy],
                            ['Ordered At', formatDateTime(selectedOrder.orderedAt)],
                            ['Collection Point', deriveCollectionPoint(selectedOrder)],
                            ['Sample Type', orderSampleType(selectedOrder.tests)],
                          ].map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between gap-2">
                              <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                              <Tooltip content={value!}>
                                <span
                                  className="max-w-[200px] truncate text-right font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {value}
                                </span>
                              </Tooltip>
                            </div>
                          ))}
                          {selectedOrder.tests.find((t) => t.comment)?.comment && (
                            <div className="flex items-start justify-between gap-2">
                              <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                                Clinical Note
                              </span>
                              <p
                                className="text-right font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {selectedOrder.tests.find((t) => t.comment)?.comment}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tests in this Order */}
                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Tests in this Order ({selectedOrder.tests.length})
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          {selectedOrder.tests.map((t, i) => {
                            const cfg = testDisplayStatus(t);
                            return (
                              <div
                                key={t.id}
                                className="flex items-start gap-2.5 rounded-[10px] p-3"
                                style={{
                                  background: '#F5FBFD',
                                  border: '1px solid rgba(0,100,130,0.1)',
                                }}
                              >
                                <span
                                  className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
                                  style={{
                                    fontSize: 14,
                                    background: 'rgba(0,180,216,0.12)',
                                    color: '#00B4D8',
                                  }}
                                >
                                  {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <Tooltip content={t.testName}>
                                    <p
                                      className="truncate font-sans font-medium"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {t.testName}
                                    </p>
                                  </Tooltip>
                                </div>
                                <span
                                  className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color: cfg.color,
                                    border: `1px solid ${cfg.border}`,
                                    background: cfg.bg,
                                  }}
                                >
                                  {cfg.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Current Status stepper */}
                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Current Status
                        </p>
                        <div className="mt-3 overflow-x-auto scroll-smooth">
                          {(() => {
                            const stage = deriveTrackingStage(selectedOrder, now.getTime());
                            const stageIndex = stage
                              ? STEPPER_STAGES.findIndex((s) => s.stage === stage)
                              : -1;
                            const collectedTest = selectedOrder.tests.find(
                              (t) => t.sampleCollectedAt,
                            );
                            const receivedTest = selectedOrder.tests.find((t) => t.receivedAt);
                            return (
                              <div className="flex min-w-[420px] items-start">
                                {STEPPER_STAGES.map((s, i) => {
                                  const Icon = s.icon;
                                  const done = i < stageIndex || stage === 'Published';
                                  const active = i === stageIndex && stage !== 'Rejected';
                                  const time =
                                    s.stage === 'Collected'
                                      ? collectedTest?.sampleCollectedAt
                                      : s.stage === 'Received'
                                        ? receivedTest?.receivedAt
                                        : undefined;
                                  return (
                                    <div key={s.stage} className="flex flex-1 items-start">
                                      <div className="flex flex-1 flex-col items-center gap-1.5">
                                        <div
                                          className="flex size-9 shrink-0 items-center justify-center rounded-full"
                                          style={{
                                            background:
                                              done || active ? '#00B4D8' : 'rgba(0,100,130,0.08)',
                                            border:
                                              !done && !active
                                                ? '1.5px solid rgba(0,100,130,0.2)'
                                                : 'none',
                                          }}
                                        >
                                          <Icon
                                            style={{
                                              width: 15,
                                              height: 15,
                                              color: done || active ? '#FFFFFF' : '#8A98A3',
                                            }}
                                          />
                                        </div>
                                        <p
                                          className="text-center font-sans font-medium"
                                          style={{
                                            fontSize: 14,
                                            color: done || active ? '#0D2630' : '#8A98A3',
                                          }}
                                        >
                                          {s.label}
                                        </p>
                                        {time && (
                                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                            {formatTime(time)}
                                          </p>
                                        )}
                                      </div>
                                      {i < STEPPER_STAGES.length - 1 && (
                                        <div
                                          className="mt-4 h-px flex-1"
                                          style={{ borderTop: '1px dashed rgba(0,100,130,0.25)' }}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-2.5 p-4 pt-0 sm:p-5 sm:pt-0">
                      <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                        <div className="flex items-center gap-2.5">
                          {selectedOrder.status === 'In Queue' && (
                            <button
                              type="button"
                              onClick={() => handleStartTest(selectedOrder)}
                              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                              style={{ fontSize: 14, background: '#00B4D8' }}
                            >
                              <Play style={{ width: 15, height: 15 }} />
                              Start Test
                            </button>
                          )}
                          {selectedOrder.status === 'In Progress' && (
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `${ROUTES.laboratoryResultEntry}?order=${encodeURIComponent(selectedOrder.groupKey)}`,
                                )
                              }
                              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                              style={{ fontSize: 14, background: '#3B82F6' }}
                            >
                              Continue Testing
                            </button>
                          )}
                          {selectedOrder.status === 'On Hold' && (
                            <button
                              type="button"
                              onClick={() => handleResume(selectedOrder)}
                              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                              style={{ fontSize: 14, background: '#D97706' }}
                            >
                              <Play style={{ width: 15, height: 15 }} />
                              Resume Test
                            </button>
                          )}
                          {(selectedOrder.status === 'In Queue' ||
                            selectedOrder.status === 'In Progress') && (
                            <button
                              type="button"
                              onClick={() => setHoldTarget(selectedOrder)}
                              className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                              style={{
                                fontSize: 14,
                                color: '#D97706',
                                border: '1px solid rgba(217,119,6,0.35)',
                              }}
                            >
                              <PauseCircle style={{ width: 15, height: 15 }} />
                              Hold
                            </button>
                          )}
                        </div>
                      </PermissionGate>
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.laboratoryOrders)}
                        className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        <ClipboardList style={{ width: 15, height: 15 }} />
                        View Order Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {pageState === 'loading' && (
            <div
              className="mt-5 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>

      {holdTarget && (
        <HoldTestModal
          orderId={holdTarget.orderId}
          patientName={holdTarget.patientName}
          mrn={holdTarget.mrn}
          pendingTests={relevantTests(holdTarget)
            .filter((t) => !t.isOnHold)
            .map((t) => ({ id: t.id, testName: t.testName }))}
          onClose={() => setHoldTarget(null)}
          onConfirm={handleHoldConfirm}
        />
      )}

      {scanOpen && (
        <ScanSampleModal
          entries={scanEntries}
          onClose={() => setScanOpen(false)}
          onFound={(groupKey) => setSelectedGroupKey(groupKey)}
        />
      )}
    </div>
  );
}
