'use client';

import {
  AlertCircle,
  Package,
  PackageCheck,
  PackageSearch,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
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
import {
  receiveSample,
  rejectSample,
  useLabResults,
} from '@/features/laboratory/store/labResultStore';
import {
  awaitingReceptionTests,
  deriveCollectionPoint,
  deriveSampleId,
  deriveSampleType,
  groupIntoOrders,
  orderSampleType,
  receivedTests,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';
import type {
  LabDepartment,
  LabResultPriority,
  LabResultStatus,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import type { ReceiveAtBenchInput } from './ReceiveAtBenchModal';
import type { RejectSampleInput } from './RejectSampleModal';

const ReceiveAtBenchModal = dynamic(
  () => import('./ReceiveAtBenchModal').then((m) => m.ReceiveAtBenchModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const RejectSampleModal = dynamic(
  () => import('./RejectSampleModal').then((m) => m.RejectSampleModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

// ── Reception status — a different taxonomy layered on the same shared
// RawLabOrder grouping (see labOrders.ts). Reception is the one screen whose
// core transition (SAMPLE_COLLECTED -> IN_PROCESS / REJECTED) was already
// modeled in LabResultStatus but never driven live by any screen before this
// one. ───────────────────────────────────────────────────────────────────

type ReceptionStatus =
  'Awaiting Reception' | 'Received' | 'Rejected' | 'Pending Verification' | 'All Samples';

const RECEPTION_TABS: ReceptionStatus[] = [
  'Awaiting Reception',
  'Received',
  'Rejected',
  'Pending Verification',
  'All Samples',
];

/** Specimen-transport SLA — from collection to bench, a different real thing
 * than Sample Collection's order-to-draw SLA or the result-turnaround
 * TAT_HOURS in nursing's fixtures. No such target exists anywhere yet. */
const RECEPTION_SLA_MS: Record<LabResultPriority, number> = {
  STAT: 30 * 60_000,
  URGENT: 60 * 60_000,
  ROUTINE: 3 * 60 * 60_000,
};

function deriveReceptionStatus(order: RawLabOrder): ReceptionStatus | 'Received (Older)' {
  const { tests } = order;
  if (tests.some((t) => t.status === 'REJECTED')) return 'Rejected';
  if (tests.some((t) => t.status === 'SAMPLE_COLLECTED')) return 'Awaiting Reception';
  if (tests.some((t) => t.status === 'IN_PROCESS' || t.status === 'RESULTED')) {
    return 'Pending Verification';
  }
  // Every test is VERIFIED (or the order has no tests past ORDERED at all,
  // which can't reach this screen's tabs anyway) — surfaces only via the
  // date-scoped Received bucket below, resolved by the caller.
  return 'Received (Older)';
}

/** "Received" is date-scoped (matches the reference's own tab number equaling
 * its "Received Today" stat card) — computed separately from
 * `deriveReceptionStatus` since an order can be VERIFIED days after being
 * received today, or received days ago and verified today. */
function receivedToday(order: RawLabOrder): boolean {
  const maxReceivedAt = order.tests.reduce<string | undefined>((max, t) => {
    if (!t.receivedAt) return max;
    if (!max || new Date(t.receivedAt).getTime() > new Date(max).getTime()) return t.receivedAt;
    return max;
  }, undefined);
  return !!maxReceivedAt && isToday(maxReceivedAt);
}

function isOverdueForReception(order: RawLabOrder, nowMs: number): boolean {
  const collectedTests = order.tests.filter((t) => t.status === 'SAMPLE_COLLECTED');
  if (collectedTests.length === 0) return false;
  return collectedTests.some((t) => {
    if (!t.sampleCollectedAt) return false;
    return nowMs - new Date(t.sampleCollectedAt).getTime() > RECEPTION_SLA_MS[order.priority];
  });
}

type SampleOrder = RawLabOrder & {
  status: ReceptionStatus | 'Received (Older)';
  isReceivedToday: boolean;
  isInTransit: boolean;
  isOverdue: boolean;
};

function buildSampleOrder(raw: RawLabOrder, nowMs: number): SampleOrder {
  return {
    ...raw,
    status: deriveReceptionStatus(raw),
    isReceivedToday: receivedToday(raw),
    isInTransit: raw.tests.some((t) => t.status === 'SAMPLE_COLLECTED') && !!raw.ward,
    isOverdue: isOverdueForReception(raw, nowMs),
  };
}

// ── Config ─────────────────────────────────────────────────────────────────

const DEPARTMENTS: LabDepartment[] = [
  'Hematology',
  'Biochemistry',
  'Microbiology',
  'Immunology',
  'Coagulation',
];

const STATUS_CFG: Record<
  ReceptionStatus | 'Received (Older)',
  { color: string; border: string; bg: string }
> = {
  'Awaiting Reception': {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.4)',
    bg: 'rgba(139,92,246,0.08)',
  },
  Received: { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.08)' },
  Rejected: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  'Pending Verification': {
    color: '#D97706',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
  },
  'All Samples': { color: '#4A7080', border: 'rgba(0,100,130,0.2)', bg: 'transparent' },
  'Received (Older)': {
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

const TEST_STATUS_CFG: Record<
  LabResultStatus,
  { color: string; border: string; bg: string; label: string }
> = {
  ORDERED: {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.4)',
    bg: 'rgba(139,92,246,0.08)',
    label: 'Ordered',
  },
  SAMPLE_COLLECTED: {
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.4)',
    bg: 'rgba(59,130,246,0.08)',
    label: 'Awaiting Reception',
  },
  IN_PROCESS: {
    color: '#D97706',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
    label: 'Received',
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

type FilterKey = 'dateRange' | 'department' | 'collectionPoint' | 'priority';
type FilterState = Record<FilterKey, string>;
const FILTER_DEFAULTS: FilterState = {
  dateRange: 'ALL',
  department: 'ALL',
  collectionPoint: 'ALL',
  priority: 'ALL',
};

const DATE_RANGE_OPTIONS = [
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
];
const DEPARTMENT_OPTIONS = DEPARTMENTS.map((d) => ({ value: d, label: d }));
const PRIORITY_OPTIONS = [
  { value: 'STAT', label: 'STAT' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'ROUTINE', label: 'Routine' },
];

// ── Export ─────────────────────────────────────────────────────────────────

function exportOrdersAsCSV(orders: SampleOrder[]) {
  downloadCSV('sample-reception', [
    [
      'Order ID',
      'Patient',
      'MRN',
      'Collection Point',
      'Sample ID',
      'Sample Type',
      'Priority',
      'Status',
      'Collected At',
    ],
    ...orders.map((o) => [
      o.orderId,
      o.patientName,
      o.mrn,
      deriveCollectionPoint(o),
      deriveSampleId(o.groupKey, o.orderedAt),
      orderSampleType(o.tests),
      o.priority,
      o.status,
      o.tests[0]?.sampleCollectedAt ? formatDateTime(o.tests[0].sampleCollectedAt) : '—',
    ]),
  ]);
}

function exportOrdersAsPDF(orders: SampleOrder[]) {
  const body = `
    <h1>Sample Reception</h1>
    <p class="meta">${orders.length} specimen${orders.length === 1 ? '' : 's'}</p>
    <table>
      <thead><tr><th>Order ID</th><th>Patient</th><th>MRN</th><th>Collection Point</th><th>Sample ID</th><th>Sample Type</th><th>Status</th></tr></thead>
      <tbody>
        ${orders
          .map(
            (o) =>
              `<tr><td>${escapeHtml(o.orderId)}</td><td>${escapeHtml(o.patientName)}</td><td>${escapeHtml(o.mrn)}</td><td>${escapeHtml(deriveCollectionPoint(o))}</td><td>${escapeHtml(deriveSampleId(o.groupKey, o.orderedAt))}</td><td>${escapeHtml(orderSampleType(o.tests))}</td><td>${escapeHtml(o.status)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
  downloadPDF('sample-reception', body);
}

function printLabels(orders: SampleOrder[]) {
  const body = `
    <h1>Specimen Labels</h1>
    <p class="meta">${orders.length} label${orders.length === 1 ? '' : 's'}</p>
    ${orders
      .map(
        (o) => `
      <hr />
      <p><strong>${escapeHtml(o.patientName)}</strong> — MRN: ${escapeHtml(o.mrn)}</p>
      <p>Sample ID: ${escapeHtml(deriveSampleId(o.groupKey, o.orderedAt))} — Type: ${escapeHtml(orderSampleType(o.tests))}</p>
      <p>Order: ${escapeHtml(o.orderId)} — Collection Point: ${escapeHtml(deriveCollectionPoint(o))}</p>
    `,
      )
      .join('')}
  `;
  downloadPDF('specimen-labels', body);
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

export function LaboratorySampleReceptionWorkspace() {
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
  const awaitingReceptionCount = useMemo(
    () => orders.filter((o) => o.status === 'Awaiting Reception').length,
    [orders],
  );
  const receivedTodayCount = useMemo(
    () => orders.filter((o) => o.isReceivedToday).length,
    [orders],
  );
  const rejectedTodayCount = useMemo(
    () =>
      orders.filter((o) => {
        const rejectedTest = o.tests.find((t) => t.status === 'REJECTED');
        return rejectedTest?.rejectedAt && isToday(rejectedTest.rejectedAt);
      }).length,
    [orders],
  );
  const inTransitCount = useMemo(() => orders.filter((o) => o.isInTransit).length, [orders]);
  const pendingVerificationCount = useMemo(
    () => orders.filter((o) => o.status === 'Pending Verification').length,
    [orders],
  );
  const overdueCount = useMemo(() => orders.filter((o) => o.isOverdue).length, [orders]);

  // ── Filters / search / tabs / pagination ─────────────────────────────────
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [tab, setTab] = useState<ReceptionStatus>('Awaiting Reception');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [receiveTarget, setReceiveTarget] = useState<SampleOrder | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SampleOrder | null>(null);

  const collectionPointOptions = useMemo(
    () =>
      Array.from(new Set(orders.map(deriveCollectionPoint)))
        .sort()
        .map((cp) => ({ value: cp, label: cp })),
    [orders],
  );

  const filterDefs = useMemo(
    () => [
      { key: 'dateRange' as const, defaultLabel: 'All Time', options: DATE_RANGE_OPTIONS },
      { key: 'department' as const, defaultLabel: 'All Departments', options: DEPARTMENT_OPTIONS },
      {
        key: 'collectionPoint' as const,
        defaultLabel: 'All Collection Points',
        options: collectionPointOptions,
      },
      { key: 'priority' as const, defaultLabel: 'All Priorities', options: PRIORITY_OPTIONS },
    ],
    [collectionPointOptions],
  );

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
    if (filters.collectionPoint !== 'ALL') {
      list = list.filter((o) => deriveCollectionPoint(o) === filters.collectionPoint);
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
    const counts = {
      'Awaiting Reception': 0,
      Received: 0,
      Rejected: 0,
      'Pending Verification': 0,
      'All Samples': preTabFiltered.length,
    } as Record<ReceptionStatus, number>;
    for (const o of preTabFiltered) {
      if (o.status === 'Awaiting Reception') counts['Awaiting Reception'] += 1;
      else if (o.status === 'Rejected') counts.Rejected += 1;
      else if (o.status === 'Pending Verification') counts['Pending Verification'] += 1;
      if (o.isReceivedToday) counts.Received += 1;
    }
    return counts;
  }, [preTabFiltered]);

  const filtered = useMemo(() => {
    if (tab === 'All Samples') return preTabFiltered;
    if (tab === 'Received') return preTabFiltered.filter((o) => o.isReceivedToday);
    return preTabFiltered.filter((o) => o.status === tab);
  }, [preTabFiltered, tab]);

  const hasActiveFilters = search !== '' || Object.values(filters).some((v) => v !== 'ALL');

  function clearFilters() {
    setSearch('');
    setFilters(FILTER_DEFAULTS);
    setPage(1);
  }

  function selectTab(next: ReceptionStatus) {
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

  function toggleSelected(groupKey: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((o) => selectedKeys.has(o.groupKey));

  function toggleSelectAllOnPage() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((o) => next.delete(o.groupKey));
      else pageRows.forEach((o) => next.add(o.groupKey));
      return next;
    });
  }

  function handleBulkReceive() {
    const selectedOrders = orders.filter((o) => selectedKeys.has(o.groupKey));
    const eligible = selectedOrders.filter((o) => awaitingReceptionTests(o).length > 0);
    if (eligible.length === 0) {
      toast.error('Nothing to receive', 'Select one or more samples awaiting reception first.');
      return;
    }
    const nowIso = new Date().toISOString();
    let count = 0;
    for (const o of eligible) {
      for (const t of awaitingReceptionTests(o)) {
        receiveSample(t.id, user?.name ?? 'Lab Scientist', nowIso);
        count += 1;
      }
    }
    toast.success(
      'Samples received',
      `${count} test${count === 1 ? '' : 's'} across ${eligible.length} specimen${eligible.length === 1 ? '' : 's'} logged in.`,
    );
    setSelectedKeys(new Set());
  }

  function handleReceiveConfirm(input: ReceiveAtBenchInput) {
    if (!receiveTarget) return;
    for (const id of input.testIds) {
      receiveSample(id, user?.name ?? 'Lab Scientist', input.receivedAt);
    }
    toast.success(
      'Sample received',
      `${receiveTarget.orderId} — ${input.testIds.length} test${input.testIds.length === 1 ? '' : 's'} logged in at the bench.`,
    );
    setReceiveTarget(null);
  }

  function handleRejectConfirm(input: RejectSampleInput) {
    if (!rejectTarget) return;
    for (const id of input.testIds) {
      rejectSample(id, user?.name ?? 'Lab Scientist', input.reason);
    }
    toast.error('Sample rejected', `${rejectTarget.orderId} — recollection required.`);
    setRejectTarget(null);
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
                Failed to load the reception worklist
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
                Sample Reception
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Receive and log incoming specimens from collection points
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
                  onClick={handleBulkReceive}
                  className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Plus style={{ width: 15, height: 15 }} />
                  Receive Samples
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {pageState === 'loading' ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : (
              <>
                <StatCard
                  icon={Package}
                  label="Awaiting Reception"
                  value={awaitingReceptionCount}
                  info="Not yet logged at the bench"
                  accent="#8B5CF6"
                  iconBg="rgba(139,92,246,0.1)"
                />
                <StatCard
                  icon={PackageCheck}
                  label="Received Today"
                  value={receivedTodayCount}
                  info="Since midnight (WAT)"
                  accent="#3B82F6"
                  iconBg="rgba(59,130,246,0.1)"
                />
                <StatCard
                  icon={XCircle}
                  label="Rejected Today"
                  value={rejectedTodayCount}
                  info="Needs recollection"
                  accent="#EF4444"
                  iconBg="rgba(239,68,68,0.1)"
                />
                <StatCard
                  icon={Truck}
                  label="In Transit"
                  value={inTransitCount}
                  info="Collected off-site, en route"
                  accent="#D97706"
                  iconBg="rgba(245,158,11,0.1)"
                />
                <StatCard
                  icon={PackageSearch}
                  label="Pending Verification"
                  value={pendingVerificationCount}
                  info="Received, still in the pipeline"
                  accent="#00B4D8"
                  iconBg="rgba(0,180,216,0.1)"
                />
                <StatCard
                  icon={ShieldAlert}
                  label="Overdue (Not Received)"
                  value={overdueCount}
                  info="Past the transport SLA"
                  accent="#DC2626"
                  iconBg="rgba(220,38,38,0.1)"
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
                {filterDefs.map((def) => (
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
                    {RECEPTION_TABS.map((t) => (
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
                  <ExportMenu
                    variant="button"
                    onExportPDF={() => exportOrdersAsPDF(filtered)}
                    onExportCSV={() => exportOrdersAsCSV(filtered)}
                  />
                  <button
                    type="button"
                    onClick={() => printLabels(filtered)}
                    className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-slate-50 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  >
                    <Printer style={{ width: 15, height: 15 }} />
                    Print Labels
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                {/* ── List pane ─────────────────────────────────────────────── */}
                <div className={`min-w-0 flex-1 ${selectedOrder ? 'hidden xl:block' : 'block'}`}>
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <ScrollableTable minWidth={1600} maxHeight={640}>
                      <div
                        className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{
                          background: TABLE_HEADER_BG,
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        <div className="flex w-11 shrink-0 items-center justify-center py-2.5">
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            onChange={toggleSelectAllOnPage}
                            aria-label="Select all samples on this page"
                            className="size-4 shrink-0 accent-[#00B4D8]"
                          />
                        </div>
                        {[
                          ['Order ID', 'w-44', 'left'],
                          ['Patient', 'w-44', 'left'],
                          ['Collection Point', 'w-44', 'left'],
                          ['Sample ID', 'w-48', 'left'],
                          ['Sample Type', 'min-w-[160px] flex-1', 'left'],
                          ['Collected At', 'w-32', 'left'],
                          ['Priority', 'w-24', 'center'],
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
                            No specimens match your filters
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
                        const sampleType = orderSampleType(order.tests);
                        const collectionPoint = deriveCollectionPoint(order);
                        const collectedAt = order.tests.find(
                          (t) => t.sampleCollectedAt,
                        )?.sampleCollectedAt;
                        const pending = awaitingReceptionTests(order);

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
                            <div
                              className="flex w-11 shrink-0 items-center justify-center py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedKeys.has(order.groupKey)}
                                onChange={() => toggleSelected(order.groupKey)}
                                aria-label={`Select order ${order.orderId}`}
                                className="size-4 shrink-0 accent-[#00B4D8]"
                              />
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2">
                              <Tooltip content={order.orderId}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
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
                                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                  {order.mrn}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2">
                              <Tooltip content={collectionPoint}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {collectionPoint}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-48 shrink-0 py-3 pr-2">
                              <Tooltip content={sampleId}>
                                <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                  {sampleId}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="min-w-[160px] flex-1 py-3 pr-2">
                              <Tooltip content={sampleType}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {sampleType}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2">
                              {collectedAt ? (
                                <>
                                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                                    {formatDate(collectedAt)}
                                  </p>
                                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                    {formatTime(collectedAt)}
                                  </p>
                                </>
                              ) : (
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>—</p>
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
                                {order.status === 'Received (Older)' ? 'Received' : order.status}
                              </span>
                            </div>
                            <div
                              className="flex w-32 shrink-0 items-center justify-center py-3 pr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {pending.length > 0 ? (
                                <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                                  <button
                                    type="button"
                                    onClick={() => setReceiveTarget(order)}
                                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                    style={{ fontSize: 14, background: '#00B4D8' }}
                                  >
                                    <PackageCheck style={{ width: 14, height: 14 }} />
                                    Receive
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
                        itemLabel="samples"
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
                          Reception Guidelines
                        </p>
                        <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                          Verify patient identity and sample type, check sample integrity and
                          labeling, record temperature if required, and update status to Received or
                          Rejected.
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
                      {selectedOrder.ward && (
                        <div className="mt-3 flex items-center justify-between gap-2">
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
                            ['Ordered By', selectedOrder.orderedBy],
                            ['Order Date / Time', formatDateTime(selectedOrder.orderedAt)],
                            ['Collection Point', deriveCollectionPoint(selectedOrder)],
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

                      {/* Sample Details */}
                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Sample Details{' '}
                          {awaitingReceptionTests(selectedOrder).length > 0 &&
                            '(to be completed on reception)'}
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          {(() => {
                            const received = receivedTests(selectedOrder);
                            const receivedTest = received.find((t) => t.receivedAt);
                            const rows: [string, string][] = [
                              [
                                'Sample ID',
                                deriveSampleId(selectedOrder.groupKey, selectedOrder.orderedAt),
                              ],
                              ['Sample Type', orderSampleType(selectedOrder.tests)],
                              [
                                'Collected At',
                                selectedOrder.tests.find((t) => t.sampleCollectedAt)
                                  ?.sampleCollectedAt
                                  ? formatDateTime(
                                      selectedOrder.tests.find((t) => t.sampleCollectedAt)!
                                        .sampleCollectedAt!,
                                    )
                                  : '—',
                              ],
                              [
                                'Collected By',
                                selectedOrder.tests.find((t) => t.sampleCollectedBy)
                                  ?.sampleCollectedBy ?? '—',
                              ],
                              [
                                'Received At',
                                receivedTest?.receivedAt
                                  ? formatDateTime(receivedTest.receivedAt)
                                  : '—',
                              ],
                              ['Received By', receivedTest?.receivedBy ?? '—'],
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
                    {awaitingReceptionTests(selectedOrder).length > 0 && (
                      <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                        <div className="flex shrink-0 items-center gap-2.5 p-4 pt-0 sm:p-5 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => setReceiveTarget(selectedOrder)}
                            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                            style={{ fontSize: 14, background: '#16A34A' }}
                          >
                            <PackageCheck style={{ width: 15, height: 15 }} />
                            Receive Sample
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTarget(selectedOrder)}
                            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                            style={{ fontSize: 14, background: '#EF4444' }}
                          >
                            <X style={{ width: 15, height: 15 }} />
                            Reject Sample
                          </button>
                        </div>
                      </PermissionGate>
                    )}
                    <div className="shrink-0 px-4 pb-4 sm:px-5 sm:pb-5">
                      <button
                        type="button"
                        onClick={() => printLabels([selectedOrder])}
                        className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        <Printer style={{ width: 15, height: 15 }} />
                        Print Label
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

      {receiveTarget && (
        <ReceiveAtBenchModal
          orderId={receiveTarget.orderId}
          patientName={receiveTarget.patientName}
          mrn={receiveTarget.mrn}
          sampleId={deriveSampleId(receiveTarget.groupKey, receiveTarget.orderedAt)}
          sampleType={orderSampleType(receiveTarget.tests)}
          pendingTests={awaitingReceptionTests(receiveTarget).map((t) => ({
            id: t.id,
            testName: t.testName,
          }))}
          onClose={() => setReceiveTarget(null)}
          onConfirm={handleReceiveConfirm}
        />
      )}

      {rejectTarget && (
        <RejectSampleModal
          orderId={rejectTarget.orderId}
          patientName={rejectTarget.patientName}
          mrn={rejectTarget.mrn}
          pendingTests={awaitingReceptionTests(rejectTarget).map((t) => ({
            id: t.id,
            testName: t.testName,
          }))}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
        />
      )}
    </div>
  );
}
