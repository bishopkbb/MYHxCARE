'use client';

import {
  ActivitySquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  TestTube2,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ExportMenu } from '@components/ExportMenu';
import { FilterDropdown } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
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
import { collectSample, useLabResults } from '@/features/laboratory/store/labResultStore';
import {
  deriveSampleId,
  deriveSampleType,
  groupIntoOrders,
  orderSampleType,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';
import type {
  LabDepartment,
  LabResult,
  LabResultPriority,
  LabResultStatus,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import type { CollectSampleInput } from './CollectSampleModal';

const CollectSampleModal = dynamic(
  () => import('./CollectSampleModal').then((m) => m.CollectSampleModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const WalkInCollectionModal = dynamic(
  () => import('./WalkInCollectionModal').then((m) => m.WalkInCollectionModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

// ── Collection status — a different, 5-bucket taxonomy layered on top of the
// same shared `RawLabOrder` grouping Orders uses, scoped to today's
// phlebotomy queue (see labOrders.ts). A requisition fully collected on a
// prior day and never rejected deliberately surfaces in none of these 5
// buckets — same as the reference screen's own tab set, which has no
// catch-all "All" tab. ────────────────────────────────────────────────────

type CollectionStatus =
  | 'Pending Collection'
  | 'In Progress'
  | 'Collected Today'
  | 'Collection Overdue'
  | 'Rejected'
  | 'Collected (Older)';

const COLLECTION_TABS: CollectionStatus[] = [
  'Pending Collection',
  'In Progress',
  'Collected Today',
  'Collection Overdue',
  'Rejected',
];

/** Collection-turnaround SLA, from order placement to specimen draw — a
 * different real thing than `TEST_TAT_HOURS` in
 * `nursing/__mocks__/laboratoryFixtures.ts` (that's a result-turnaround
 * target, measured from collection to result). No such target exists
 * anywhere in the codebase yet, so these are new, priority-based constants. */
const COLLECTION_SLA_MS: Record<LabResultPriority, number> = {
  STAT: 30 * 60_000,
  URGENT: 2 * 60 * 60_000,
  ROUTINE: 4 * 60 * 60_000,
};

function deriveCollectionStatus(order: RawLabOrder, nowMs: number): CollectionStatus {
  const { tests, priority, orderedAt } = order;
  if (tests.some((t) => t.status === 'REJECTED')) return 'Rejected';

  const noneStillOrdered = tests.every((t) => t.status !== 'ORDERED');
  if (noneStillOrdered) {
    const maxCollectedAt = tests.reduce<string | undefined>((max, t) => {
      if (!t.sampleCollectedAt) return max;
      if (!max || new Date(t.sampleCollectedAt).getTime() > new Date(max).getTime()) {
        return t.sampleCollectedAt;
      }
      return max;
    }, undefined);
    return maxCollectedAt && isToday(maxCollectedAt) ? 'Collected Today' : 'Collected (Older)';
  }

  const someCollected = tests.some((t) => t.status !== 'ORDERED');
  if (someCollected) return 'In Progress';

  const elapsed = nowMs - new Date(orderedAt).getTime();
  return elapsed > COLLECTION_SLA_MS[priority] ? 'Collection Overdue' : 'Pending Collection';
}

/** Tests still eligible for a (re)collection action — either never drawn, or
 * drawn but rejected by the lab and awaiting a fresh sample. */
function collectibleTests(order: RawLabOrder): LabResult[] {
  return order.tests.filter((t) => t.status === 'ORDERED' || t.status === 'REJECTED');
}

type SampleOrder = RawLabOrder & { status: CollectionStatus };

function buildSampleOrder(raw: RawLabOrder, nowMs: number): SampleOrder {
  return { ...raw, status: deriveCollectionStatus(raw, nowMs) };
}

// ── Config ─────────────────────────────────────────────────────────────────

const DEPARTMENTS: LabDepartment[] = [
  'Hematology',
  'Biochemistry',
  'Microbiology',
  'Immunology',
  'Coagulation',
];

const STATUS_CFG: Record<CollectionStatus, { color: string; border: string; bg: string }> = {
  'Pending Collection': {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.4)',
    bg: 'rgba(139,92,246,0.08)',
  },
  'In Progress': { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.08)' },
  'Collected Today': {
    color: '#16A34A',
    border: 'rgba(34,197,94,0.4)',
    bg: 'rgba(34,197,94,0.08)',
  },
  'Collection Overdue': {
    color: '#DC2626',
    border: 'rgba(220,38,38,0.4)',
    bg: 'rgba(220,38,38,0.08)',
  },
  Rejected: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  'Collected (Older)': {
    color: '#16A34A',
    border: 'rgba(34,197,94,0.4)',
    bg: 'rgba(34,197,94,0.08)',
  },
};

const PRIORITY_CFG: Record<LabResultPriority, { color: string; border: string; bg: string }> = {
  STAT: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  URGENT: { color: '#D97706', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  ROUTINE: { color: '#4A7080', border: 'rgba(0,100,130,0.2)', bg: 'transparent' },
};

const DEPARTMENT_CFG: Record<LabDepartment, { color: string; bg: string }> = {
  Hematology: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  Biochemistry: { color: '#00B4D8', bg: 'rgba(0,180,216,0.1)' },
  Microbiology: { color: '#D97706', bg: 'rgba(245,158,11,0.1)' },
  Immunology: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  Coagulation: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
};

const TEST_STATUS_CFG: Record<
  LabResultStatus,
  { color: string; border: string; bg: string; label: string }
> = {
  ORDERED: {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.4)',
    bg: 'rgba(139,92,246,0.08)',
    label: 'Pending',
  },
  SAMPLE_COLLECTED: {
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.4)',
    bg: 'rgba(59,130,246,0.08)',
    label: 'Collected',
  },
  IN_PROCESS: {
    color: '#D97706',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
    label: 'In Process',
  },
  RESULTED: {
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.4)',
    bg: 'rgba(0,180,216,0.08)',
    label: 'Resulted',
  },
  VERIFIED: {
    color: '#16A34A',
    border: 'rgba(34,197,94,0.4)',
    bg: 'rgba(34,197,94,0.08)',
    label: 'Verified',
  },
  REJECTED: {
    color: '#EF4444',
    border: 'rgba(239,68,68,0.4)',
    bg: 'rgba(239,68,68,0.08)',
    label: 'Rejected',
  },
};

type FilterKey = 'dateRange' | 'department' | 'priority';
type FilterState = Record<FilterKey, string>;
const FILTER_DEFAULTS: FilterState = { dateRange: 'ALL', department: 'ALL', priority: 'ALL' };
const FILTER_DEFS: {
  key: FilterKey;
  defaultLabel: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'dateRange',
    defaultLabel: 'All Time',
    options: [
      { value: 'TODAY', label: 'Today' },
      { value: 'YESTERDAY', label: 'Yesterday' },
      { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
    ],
  },
  {
    key: 'department',
    defaultLabel: 'All Departments',
    options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
  },
  {
    key: 'priority',
    defaultLabel: 'All Priorities',
    options: [
      { value: 'STAT', label: 'STAT' },
      { value: 'URGENT', label: 'Urgent' },
      { value: 'ROUTINE', label: 'Routine' },
    ],
  },
];

// ── Export ─────────────────────────────────────────────────────────────────

function exportOrdersAsCSV(orders: SampleOrder[]) {
  downloadCSV('sample-collection', [
    [
      'Order ID',
      'Patient',
      'MRN',
      'Test(s)',
      'Department',
      'Priority',
      'Status',
      'Requested Date',
      'Requested Time',
    ],
    ...orders.map((o) => [
      o.orderId,
      o.patientName,
      o.mrn,
      o.tests.map((t) => t.testName).join('; '),
      Array.from(new Set(o.tests.map((t) => t.department))).join('; '),
      o.priority,
      o.status,
      formatDate(o.orderedAt),
      formatTime(o.orderedAt),
    ]),
  ]);
}

function exportOrdersAsPDF(orders: SampleOrder[]) {
  const body = `
    <h1>Sample Collection</h1>
    <p class="meta">${orders.length} requisition${orders.length === 1 ? '' : 's'}</p>
    <table>
      <thead><tr><th>Order ID</th><th>Patient</th><th>MRN</th><th>Test(s)</th><th>Department</th><th>Priority</th><th>Status</th><th>Requested</th></tr></thead>
      <tbody>
        ${orders
          .map(
            (o) =>
              `<tr><td>${escapeHtml(o.orderId)}</td><td>${escapeHtml(o.patientName)}</td><td>${escapeHtml(o.mrn)}</td><td>${escapeHtml(o.tests.map((t) => t.testName).join(', '))}</td><td>${escapeHtml(Array.from(new Set(o.tests.map((t) => t.department))).join(', '))}</td><td>${escapeHtml(o.priority)}</td><td>${escapeHtml(o.status)}</td><td>${escapeHtml(formatDate(o.orderedAt))} ${escapeHtml(formatTime(o.orderedAt))}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
  downloadPDF('sample-collection', body);
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
      <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-24 shrink-0 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-32 shrink-0 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 flex-1 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-20 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

// ── Main workspace ───────────────────────────────────────────────────────────

export function LaboratorySampleCollectionWorkspace() {
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

  const orders = useMemo<SampleOrder[]>(() => {
    const nowMs = now.getTime();
    return groupIntoOrders(results).map((raw) => buildSampleOrder(raw, nowMs));
  }, [results, now]);

  // ── Stat cards — always over the full, unfiltered order set ─────────────
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'Pending Collection').length,
    [orders],
  );
  const inProgressCount = useMemo(
    () => orders.filter((o) => o.status === 'In Progress').length,
    [orders],
  );
  const collectedTodayCount = useMemo(
    () => orders.filter((o) => o.status === 'Collected Today').length,
    [orders],
  );
  const overdueCount = useMemo(
    () => orders.filter((o) => o.status === 'Collection Overdue').length,
    [orders],
  );
  const rejectedCount = useMemo(
    () => orders.filter((o) => o.status === 'Rejected').length,
    [orders],
  );

  // ── Filters / search / tabs / pagination ─────────────────────────────────
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [tab, setTab] = useState<CollectionStatus>('Pending Collection');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [collectTarget, setCollectTarget] = useState<SampleOrder | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);

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
          o.orderId.toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, filters, search, now]);

  const tabCounts = useMemo(() => {
    const counts = {} as Record<CollectionStatus, number>;
    for (const s of COLLECTION_TABS) counts[s] = 0;
    for (const o of preTabFiltered) {
      if (o.status in counts) counts[o.status] += 1;
    }
    return counts;
  }, [preTabFiltered]);

  const filtered = useMemo(
    () => preTabFiltered.filter((o) => o.status === tab),
    [preTabFiltered, tab],
  );

  const hasActiveFilters = search !== '' || Object.values(filters).some((v) => v !== 'ALL');

  function clearFilters() {
    setSearch('');
    setFilters(FILTER_DEFAULTS);
    setPage(1);
  }

  function selectTab(next: CollectionStatus) {
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

  function openOrder(order: SampleOrder) {
    setSelectedGroupKey(order.groupKey);
  }

  function handleCollectConfirm(input: CollectSampleInput) {
    if (!collectTarget) return;
    for (const id of input.testIds) {
      collectSample(id, user?.name ?? 'Lab Scientist', input.collectedAt);
    }
    toast.success(
      'Sample collected',
      `${collectTarget.orderId} — ${input.testIds.length} test${input.testIds.length === 1 ? '' : 's'} drawn (${input.sampleType}).`,
    );
    setCollectTarget(null);
  }

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
                Failed to load the collection worklist
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
                Sample Collection
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage specimen collection for laboratory orders
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
              <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                <button
                  type="button"
                  onClick={() => setWalkInOpen(true)}
                  className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Plus style={{ width: 15, height: 15 }} />
                  Walk-in Collection
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {pageState === 'loading' ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : (
              <>
                <StatCard
                  icon={ClipboardList}
                  label="Pending Collection"
                  value={pendingCount}
                  info="Awaiting specimen draw"
                  accent="#8B5CF6"
                  iconBg="rgba(139,92,246,0.1)"
                />
                <StatCard
                  icon={ActivitySquare}
                  label="Collection In Progress"
                  value={inProgressCount}
                  info="Partially drawn"
                  accent="#3B82F6"
                  iconBg="rgba(59,130,246,0.1)"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Collected Today"
                  value={collectedTodayCount}
                  info="Since midnight (WAT)"
                  accent="#16A34A"
                  iconBg="rgba(22,163,74,0.1)"
                />
                <StatCard
                  icon={Clock}
                  label="Collection Overdue"
                  value={overdueCount}
                  info="Past the collection SLA"
                  accent="#DC2626"
                  iconBg="rgba(220,38,38,0.1)"
                />
                <StatCard
                  icon={XCircle}
                  label="Collection Rejected"
                  value={rejectedCount}
                  info="Needs recollection"
                  accent="#EF4444"
                  iconBg="rgba(239,68,68,0.1)"
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
                    placeholder="Search by patient, MRN, or order ID"
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

              {/* ── Tabs + export ───────────────────────────────────────────── */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="overflow-x-auto scroll-smooth">
                  <div
                    className="flex gap-1"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    {COLLECTION_TABS.map((t) => (
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
                <ExportMenu
                  variant="button"
                  onExportPDF={() => exportOrdersAsPDF(filtered)}
                  onExportCSV={() => exportOrdersAsCSV(filtered)}
                />
              </div>

              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                {/* ── List pane ─────────────────────────────────────────────── */}
                <div className={`min-w-0 flex-1 ${selectedOrder ? 'hidden xl:block' : 'block'}`}>
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <ScrollableTable minWidth={1440} maxHeight={640}>
                      <div
                        className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{
                          background: TABLE_HEADER_BG,
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        {[
                          ['Order ID', 'w-44', 'left'],
                          ['Patient', 'w-44', 'left'],
                          ['Age/Gender', 'w-32', 'center'],
                          ['Test(s)', 'min-w-[160px] flex-1', 'center'],
                          ['Department', 'w-32', 'left'],
                          ['Priority', 'w-24', 'center'],
                          ['Requested At', 'w-32', 'left'],
                          ['Status', 'w-52', 'center'],
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
                        <div className="w-32 shrink-0 py-2.5 pr-3 text-center">
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
                            No requisitions match your filters
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
                        const uniqueDepartments = Array.from(
                          new Set(order.tests.map((t) => t.department)),
                        );
                        const testsLabel =
                          order.tests.length === 1
                            ? order.tests[0]!.testName
                            : `${order.tests.length} tests`;
                        const testsTooltip = order.tests.map((t) => t.testName).join(', ');
                        const collectible = collectibleTests(order);

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
                            <div className="w-44 shrink-0 py-3 pr-2 pl-3">
                              <div className="flex items-center gap-1.5">
                                <Tooltip content={order.orderId}>
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {order.orderId}
                                  </p>
                                </Tooltip>
                                {order.isWalkIn && (
                                  <span
                                    className="shrink-0 rounded-full px-1.5 py-0.5 font-sans font-semibold whitespace-nowrap"
                                    style={{
                                      fontSize: 14,
                                      color: '#8B5CF6',
                                      border: '1px solid rgba(139,92,246,0.4)',
                                      background: 'rgba(139,92,246,0.08)',
                                    }}
                                  >
                                    WALK-IN
                                  </span>
                                )}
                              </div>
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
                                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                  {order.mrn}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2 text-center">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {order.age !== undefined ? order.age : '—'}
                                {order.gender ? ` · ${order.gender[0]}` : ''}
                              </p>
                            </div>
                            <div className="min-w-[160px] flex-1 py-3 pr-2 text-center">
                              <Tooltip content={testsTooltip}>
                                <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                  {testsLabel}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2">
                              {uniqueDepartments.length === 1 ? (
                                <span
                                  className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color: DEPARTMENT_CFG[uniqueDepartments[0]!].color,
                                    background: DEPARTMENT_CFG[uniqueDepartments[0]!].bg,
                                  }}
                                >
                                  {uniqueDepartments[0]}
                                </span>
                              ) : (
                                <Tooltip content={uniqueDepartments.join(', ')}>
                                  <span
                                    className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                                    style={{
                                      fontSize: 14,
                                      color: '#4A7080',
                                      background: 'rgba(0,100,130,0.08)',
                                    }}
                                  >
                                    Multiple
                                  </span>
                                </Tooltip>
                              )}
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
                            <div className="w-32 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {formatDate(order.orderedAt)}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatTime(order.orderedAt)}
                              </p>
                            </div>
                            <div className="w-52 shrink-0 py-3 pr-2 text-center">
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
                            <div
                              className="flex w-32 shrink-0 items-center justify-center py-3 pr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {collectible.length > 0 ? (
                                <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                                  <button
                                    type="button"
                                    onClick={() => setCollectTarget(order)}
                                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                    style={{ fontSize: 14, background: '#00B4D8' }}
                                  >
                                    <TestTube2 style={{ width: 14, height: 14 }} />
                                    {order.status === 'Rejected' ? 'Recollect' : 'Collect'}
                                  </button>
                                </PermissionGate>
                              ) : (
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
                        itemLabel="orders"
                      />
                    )}
                  </div>

                  <div
                    className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-[12px] p-4"
                    style={{
                      background: 'rgba(0,180,216,0.06)',
                      border: '1px solid rgba(0,180,216,0.2)',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle
                        style={{
                          width: 16,
                          height: 16,
                          color: '#00B4D8',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      />
                      <div>
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Collection Guidelines
                        </p>
                        <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                          Verify patient identity, explain the procedure, use the correct tube type,
                          label immediately, and ensure sample integrity before dispatch to the lab
                          bench.
                        </p>
                      </div>
                    </div>
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
                          {selectedOrder.orderId}
                        </p>
                        {selectedOrder.isWalkIn && (
                          <span
                            className="rounded-full px-2.5 py-0.5 font-sans font-semibold whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: '#8B5CF6',
                              border: '1px solid rgba(139,92,246,0.4)',
                              background: 'rgba(139,92,246,0.08)',
                            }}
                          >
                            WALK-IN
                          </span>
                        )}
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
                      <div className="mt-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>Age / Gender</span>
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {selectedOrder.age !== undefined ? selectedOrder.age : '—'}
                            {selectedOrder.gender ? ` · ${selectedOrder.gender}` : ''}
                          </span>
                        </div>
                        {selectedOrder.ward && (
                          <div className="flex items-center justify-between gap-2">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Ward / Bed</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {selectedOrder.ward}
                              {selectedOrder.bed ? ` · ${selectedOrder.bed}` : ''}
                            </span>
                          </div>
                        )}
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
                            ['Requested', formatDateTime(selectedOrder.orderedAt)],
                            ['Priority', selectedOrder.priority],
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
                        </div>
                      </div>

                      {/* Tests Ordered */}
                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Tests Ordered ({selectedOrder.tests.length})
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          {selectedOrder.tests.map((t, i) => {
                            const cfg = TEST_STATUS_CFG[t.status];
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
                                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                                    {deriveSampleType(t)}
                                  </p>
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

                      {/* Collection Details */}
                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Collection Details
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          {(() => {
                            const collectedTests = selectedOrder.tests.filter(
                              (t) => t.sampleCollectedAt,
                            );
                            const maxCollectedAt = collectedTests.reduce<string | undefined>(
                              (max, t) => {
                                if (!t.sampleCollectedAt) return max;
                                if (
                                  !max ||
                                  new Date(t.sampleCollectedAt).getTime() > new Date(max).getTime()
                                ) {
                                  return t.sampleCollectedAt;
                                }
                                return max;
                              },
                              undefined,
                            );
                            const collectedBy = collectedTests[0]?.sampleCollectedBy;
                            const rows: [string, string][] = [
                              ['Sample Type', orderSampleType(selectedOrder.tests)],
                              ['Collection Status', selectedOrder.status],
                              ['Collected By', collectedBy ?? '—'],
                              [
                                'Collection Date / Time',
                                maxCollectedAt ? formatDateTime(maxCollectedAt) : '—',
                              ],
                              [
                                'Sample ID',
                                collectedTests.length > 0
                                  ? deriveSampleId(selectedOrder.groupKey, selectedOrder.orderedAt)
                                  : '—',
                              ],
                            ];
                            return rows.map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between gap-2">
                                <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                                <Tooltip content={value}>
                                  <span
                                    className="max-w-[200px] truncate text-right font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {value}
                                  </span>
                                </Tooltip>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {collectibleTests(selectedOrder).length > 0 && (
                      <div className="shrink-0 p-4 pt-0 sm:p-5 sm:pt-0">
                        <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                          <button
                            type="button"
                            onClick={() => setCollectTarget(selectedOrder)}
                            className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                            style={{ fontSize: 14, background: '#00B4D8' }}
                          >
                            <TestTube2 style={{ width: 15, height: 15 }} />
                            {selectedOrder.status === 'Rejected'
                              ? 'Recollect Sample'
                              : 'Start Collection'}
                          </button>
                        </PermissionGate>
                      </div>
                    )}
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

      {collectTarget && (
        <CollectSampleModal
          orderId={collectTarget.orderId}
          patientName={collectTarget.patientName}
          mrn={collectTarget.mrn}
          pendingTests={collectibleTests(collectTarget).map((t) => ({
            id: t.id,
            testName: t.testName,
          }))}
          defaultSampleType={orderSampleType(collectibleTests(collectTarget))}
          onClose={() => setCollectTarget(null)}
          onConfirm={handleCollectConfirm}
        />
      )}

      {walkInOpen && <WalkInCollectionModal onClose={() => setWalkInOpen(false)} />}
    </div>
  );
}
