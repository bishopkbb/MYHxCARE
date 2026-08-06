'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FlaskConical,
  MoreVertical,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  StickyNote,
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
import { addNote, collectSample, useLabResults } from '@/features/laboratory/store/labResultStore';
import {
  groupIntoOrders,
  TEST_STATUS_RANK,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';
import type {
  LabDepartment,
  LabResult,
  LabResultFlag,
  LabResultPriority,
  LabResultStatus,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import type { ReceiveSampleInput } from './ReceiveSampleModal';

const ReceiveSampleModal = dynamic(
  () => import('./ReceiveSampleModal').then((m) => m.ReceiveSampleModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

type OrderStatus =
  | 'New'
  | 'In Progress'
  | 'Awaiting Result Entry'
  | 'Awaiting Verification'
  | 'Completed'
  | 'Rejected';

type LabOrder = RawLabOrder & {
  status: OrderStatus;
  isNew: boolean;
  isCritical: boolean;
  completedAt?: string;
  tatMs?: number;
};

// ── Order status — layered on top of the shared `RawLabOrder` grouping from
// `labOrders.ts` (see that file for why an "Order" is a real, derived, never-
// persisted grouping of LabResult rows). This screen's own 6-state
// full-lifecycle taxonomy; other screens (e.g. Sample Collection) derive a
// different taxonomy from the same raw grouping. ───────────────────────────

function deriveOrderStatus(tests: LabResult[]): OrderStatus {
  if (tests.some((t) => t.status === 'REJECTED')) return 'Rejected';
  if (tests.every((t) => t.status === 'VERIFIED')) return 'Completed';
  if (tests.every((t) => t.status === 'ORDERED')) return 'New';
  const minRank = Math.min(...tests.map((t) => TEST_STATUS_RANK[t.status]));
  if (minRank <= 1) return 'In Progress';
  if (minRank === 2) return 'Awaiting Result Entry';
  return 'Awaiting Verification';
}

function formatHrsMin(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function buildOrder(raw: RawLabOrder): LabOrder {
  const { tests, orderedAt } = raw;
  const status = deriveOrderStatus(tests);
  const maxResultAt = tests.reduce<string | undefined>((max, t) => {
    if (!t.resultAt) return max;
    if (!max || new Date(t.resultAt).getTime() > new Date(max).getTime()) return t.resultAt;
    return max;
  }, undefined);
  const completion =
    status === 'Completed' && maxResultAt
      ? {
          completedAt: maxResultAt,
          tatMs: new Date(maxResultAt).getTime() - new Date(orderedAt).getTime(),
        }
      : {};
  return {
    ...raw,
    status,
    isNew: status === 'New',
    isCritical: tests.some((t) => t.flag === 'CRITICAL'),
    ...completion,
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

const ORDER_STATUSES: OrderStatus[] = [
  'New',
  'In Progress',
  'Awaiting Result Entry',
  'Awaiting Verification',
  'Completed',
  'Rejected',
];

const ORDER_STATUS_CFG: Record<OrderStatus, { color: string; border: string; bg: string }> = {
  New: { color: '#8B5CF6', border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.08)' },
  'In Progress': { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.08)' },
  'Awaiting Result Entry': {
    color: '#D97706',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
  },
  'Awaiting Verification': {
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.4)',
    bg: 'rgba(0,180,216,0.08)',
  },
  Completed: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  Rejected: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
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
    label: 'Ordered',
  },
  SAMPLE_COLLECTED: {
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.4)',
    bg: 'rgba(59,130,246,0.08)',
    label: 'Sample Collected',
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

const FLAG_LABEL: Record<LabResultFlag, string> = {
  NORMAL: 'Normal',
  ABNORMAL: 'Abnormal',
  CRITICAL: 'Critical',
};
const FLAG_COLOR: Record<LabResultFlag, string> = {
  NORMAL: '#16A34A',
  ABNORMAL: '#D97706',
  CRITICAL: '#DC2626',
};

const STEPPER_STEPS: { label: string; icon: LucideIcon }[] = [
  { label: 'Ordered', icon: ClipboardList },
  { label: 'Sample Collection', icon: TestTube2 },
  { label: 'Result Entry', icon: FlaskConical },
  { label: 'Verification', icon: ShieldCheck },
  { label: 'Published', icon: CheckCircle2 },
];

function stepIndexForOrder(status: OrderStatus): number {
  switch (status) {
    case 'New':
      return 0;
    case 'In Progress':
    case 'Rejected':
      return 1;
    case 'Awaiting Result Entry':
      return 2;
    case 'Awaiting Verification':
      return 3;
    case 'Completed':
      return 4;
  }
}

type FilterKey = 'dateRange' | 'priority' | 'department';
type FilterState = Record<FilterKey, string>;
const FILTER_DEFAULTS: FilterState = { dateRange: 'ALL', priority: 'ALL', department: 'ALL' };
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
    key: 'priority',
    defaultLabel: 'All Priorities',
    options: [
      { value: 'STAT', label: 'STAT' },
      { value: 'URGENT', label: 'Urgent' },
      { value: 'ROUTINE', label: 'Routine' },
    ],
  },
  {
    key: 'department',
    defaultLabel: 'All Departments',
    options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
  },
];

const TABS: ('All Orders' | OrderStatus)[] = ['All Orders', ...ORDER_STATUSES];

// ── Export ─────────────────────────────────────────────────────────────────

function exportOrdersAsCSV(orders: LabOrder[]) {
  downloadCSV('laboratory-orders', [
    [
      'Order ID',
      'Patient',
      'MRN',
      'Test(s)',
      'Ordered By',
      'Department',
      'Priority',
      'Status',
      'Ordered Date',
      'Ordered Time',
      'TAT',
    ],
    ...orders.map((o) => [
      o.orderId,
      o.patientName,
      o.mrn,
      o.tests.map((t) => t.testName).join('; '),
      o.orderedBy,
      Array.from(new Set(o.tests.map((t) => t.department))).join('; '),
      o.priority,
      o.status,
      formatDate(o.orderedAt),
      formatTime(o.orderedAt),
      o.tatMs !== undefined ? formatHrsMin(o.tatMs) : '—',
    ]),
  ]);
}

function exportOrdersAsPDF(orders: LabOrder[]) {
  const body = `
    <h1>Laboratory Orders</h1>
    <p class="meta">${orders.length} order${orders.length === 1 ? '' : 's'}</p>
    <table>
      <thead><tr><th>Order ID</th><th>Patient</th><th>MRN</th><th>Test(s)</th><th>Department</th><th>Priority</th><th>Status</th><th>Ordered</th></tr></thead>
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
  downloadPDF('laboratory-orders', body);
}

function specimenLabelBody(order: LabOrder): string {
  return `
    <h1>Specimen Label</h1>
    <p class="meta">${escapeHtml(order.orderId)}</p>
    <hr />
    <p><strong>${escapeHtml(order.patientName)}</strong></p>
    <p>MRN: ${escapeHtml(order.mrn)}</p>
    ${order.ward ? `<p>${escapeHtml(order.ward)}${order.bed ? ` — ${escapeHtml(order.bed)}` : ''}</p>` : ''}
    <p>Ordered by: ${escapeHtml(order.orderedBy)}</p>
    <p>Ordered: ${escapeHtml(formatDateTime(order.orderedAt))}</p>
    <hr />
    <table>
      <thead><tr><th>Test</th><th>Department</th></tr></thead>
      <tbody>${order.tests.map((t) => `<tr><td>${escapeHtml(t.testName)}</td><td>${escapeHtml(t.department)}</td></tr>`).join('')}</tbody>
    </table>
  `;
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
      <div className="h-3.5 w-20 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

// ── Row action menu ──────────────────────────────────────────────────────────

function OrderRowMenu({
  order,
  open,
  onToggle,
  onView,
  onReceive,
  onPrint,
}: {
  order: LabOrder;
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onReceive?: (() => void) | undefined;
  onPrint: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label={`More actions for ${order.orderId}`}
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
          View Order
        </button>
        {onReceive && (
          <button
            type="button"
            onClick={onReceive}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <TestTube2 style={{ width: 15, height: 15, color: '#22C55E' }} />
            Receive Sample
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Printer style={{ width: 15, height: 15, color: '#4A7080' }} />
          Print Label
        </button>
      </RowMenuPortal>
    </div>
  );
}

// ── Main workspace ───────────────────────────────────────────────────────────

export function LaboratoryOrdersWorkspace() {
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

  const orders = useMemo<LabOrder[]>(() => groupIntoOrders(results).map(buildOrder), [results]);

  // ── Stat cards — always over the full, unfiltered order set ─────────────
  const newCount = useMemo(() => orders.filter((o) => o.status === 'New').length, [orders]);
  const inProgressCount = useMemo(
    () => orders.filter((o) => o.status === 'In Progress').length,
    [orders],
  );
  const completedTodayCount = useMemo(
    () =>
      orders.filter((o) => o.status === 'Completed' && o.completedAt && isToday(o.completedAt))
        .length,
    [orders],
  );
  const criticalCount = useMemo(() => orders.filter((o) => o.isCritical).length, [orders]);
  const avgTatLabel = useMemo(() => {
    const completed = orders.filter((o) => o.tatMs !== undefined);
    if (completed.length === 0) return '—';
    const avg = completed.reduce((sum, o) => sum + (o.tatMs ?? 0), 0) / completed.length;
    return formatHrsMin(avg);
  }, [orders]);

  // ── Filters / search / tabs / pagination ─────────────────────────────────
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [tab, setTab] = useState<'All Orders' | OrderStatus>('All Orders');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [receiveTarget, setReceiveTarget] = useState<LabOrder | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [rowMenuOpenKey, setRowMenuOpenKey] = useState<string | null>(null);

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
    if (filters.priority !== 'ALL') list = list.filter((o) => o.priority === filters.priority);
    if (filters.department !== 'ALL') {
      list = list.filter((o) => o.tests.some((t) => t.department === filters.department));
    }
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
    const counts = { 'All Orders': preTabFiltered.length } as Record<
      'All Orders' | OrderStatus,
      number
    >;
    for (const s of ORDER_STATUSES) counts[s] = 0;
    for (const o of preTabFiltered) counts[o.status] += 1;
    return counts;
  }, [preTabFiltered]);

  const filtered = useMemo(
    () => (tab === 'All Orders' ? preTabFiltered : preTabFiltered.filter((o) => o.status === tab)),
    [preTabFiltered, tab],
  );

  const hasActiveFilters =
    search !== '' || Object.values(filters).some((v) => v !== 'ALL') || tab !== 'All Orders';

  function clearFilters() {
    setSearch('');
    setFilters(FILTER_DEFAULTS);
    setTab('All Orders');
    setPage(1);
  }

  function selectTab(next: 'All Orders' | OrderStatus) {
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

  function openOrder(order: LabOrder) {
    setSelectedGroupKey(order.groupKey);
    setNoteOpen(false);
    setNoteDraft('');
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

  const selectedOrders = orders.filter((o) => selectedKeys.has(o.groupKey));

  function handleReceiveConfirm(input: ReceiveSampleInput) {
    if (!receiveTarget) return;
    const pending = receiveTarget.tests.filter((t) => t.status === 'ORDERED');
    for (const t of pending) {
      collectSample(t.id, user?.name ?? 'Lab Scientist', input.collectedAt);
    }
    toast.success(
      'Sample received',
      `${receiveTarget.orderId} — ${pending.length} test${pending.length === 1 ? '' : 's'} logged in.`,
    );
    setReceiveTarget(null);
  }

  function handleBulkReceive() {
    const nowIso = new Date().toISOString();
    let count = 0;
    for (const o of selectedOrders) {
      const pending = o.tests.filter((t) => t.status === 'ORDERED');
      for (const t of pending) {
        collectSample(t.id, user?.name ?? 'Lab Scientist', nowIso);
        count += 1;
      }
    }
    toast.success(
      'Samples received',
      `${count} test${count === 1 ? '' : 's'} across ${selectedOrders.length} order${selectedOrders.length === 1 ? '' : 's'} logged in.`,
    );
    setSelectedKeys(new Set());
  }

  function handlePrintLabel(order: LabOrder) {
    downloadPDF(`specimen-label-${order.orderId}`, specimenLabelBody(order));
  }

  function handleSaveNote() {
    if (!selectedOrder || !noteDraft.trim()) return;
    const targetTest = selectedOrder.tests[0];
    if (!targetTest) return;
    addNote(targetTest.id, {
      text: noteDraft.trim(),
      author: user?.name ?? 'Lab Scientist',
      createdAt: new Date().toISOString(),
    });
    toast.success('Note added', `Your note on ${selectedOrder.orderId} has been saved.`);
    setNoteDraft('');
    setNoteOpen(false);
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
                Failed to load laboratory orders
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
                Laboratory Orders
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Track every test requisition from order to verification
              </p>
            </div>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {pageState === 'loading' ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : (
              <>
                <StatCard
                  icon={ClipboardList}
                  label="Total Orders"
                  value={orders.length}
                  info="Across all statuses"
                  accent="#00B4D8"
                  iconBg="rgba(0,180,216,0.1)"
                />
                <StatCard
                  icon={Sparkles}
                  label="New Orders"
                  value={newCount}
                  info="Awaiting sample collection"
                  accent="#8B5CF6"
                  iconBg="rgba(139,92,246,0.1)"
                />
                <StatCard
                  icon={Timer}
                  label="In Progress"
                  value={inProgressCount}
                  info="Sample collected, en route"
                  accent="#3B82F6"
                  iconBg="rgba(59,130,246,0.1)"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Completed Today"
                  value={completedTodayCount}
                  info="Verified since midnight (WAT)"
                  accent="#16A34A"
                  iconBg="rgba(22,163,74,0.1)"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Critical"
                  value={criticalCount}
                  info="Contains a critical flag"
                  accent="#DC2626"
                  iconBg="rgba(220,38,38,0.1)"
                />
                <StatCard
                  icon={Clock}
                  label="Average TAT"
                  value={avgTatLabel}
                  info="Completed orders (hrs:min)"
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
                <ExportMenu
                  variant="button"
                  onExportPDF={() => exportOrdersAsPDF(filtered)}
                  onExportCSV={() => exportOrdersAsCSV(filtered)}
                />
              </div>

              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                {/* ── List pane ─────────────────────────────────────────────── */}
                <div className={`min-w-0 flex-1 ${selectedOrder ? 'hidden xl:block' : 'block'}`}>
                  {selectedKeys.size > 0 && (
                    <div
                      className="mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-[10px] px-4 py-2.5"
                      style={{
                        background: 'rgba(0,180,216,0.06)',
                        border: '1px solid rgba(0,180,216,0.25)',
                      }}
                    >
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selectedKeys.size} order{selectedKeys.size === 1 ? '' : 's'} selected
                      </p>
                      <div className="flex items-center gap-2">
                        <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                          <button
                            type="button"
                            onClick={handleBulkReceive}
                            className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                            style={{ fontSize: 14, background: '#00B4D8' }}
                          >
                            <TestTube2 style={{ width: 14, height: 14 }} />
                            Receive Sample
                          </button>
                        </PermissionGate>
                        <button
                          type="button"
                          onClick={() => exportOrdersAsCSV(selectedOrders)}
                          className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-white ${FOCUS_RING}`}
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.18)',
                          }}
                        >
                          Export Selected
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <ScrollableTable minWidth={1580} maxHeight={640}>
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
                            aria-label="Select all orders on this page"
                            className="size-4 shrink-0 accent-[#00B4D8]"
                          />
                        </div>
                        {[
                          ['Order ID', 'w-44', 'left'],
                          ['Patient', 'w-44', 'left'],
                          ['Age/Gender', 'w-32', 'center'],
                          ['Test(s)', 'min-w-[180px] flex-1', 'center'],
                          ['Ordered By', 'w-40', 'left'],
                          ['Department', 'w-32', 'left'],
                          ['Priority', 'w-24', 'left'],
                          ['Status', 'w-52', 'center'],
                          ['Ordered', 'w-32', 'left'],
                          ['TAT', 'w-20', 'left'],
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
                        <div className="w-14 shrink-0 py-2.5 pr-3 text-right">
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
                            <Search style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 16, color: '#4A7080' }}
                          >
                            No orders match your filters
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
                        const statusCfg = ORDER_STATUS_CFG[order.status];
                        const priorityCfg = PRIORITY_CFG[order.priority];
                        const uniqueDepartments = Array.from(
                          new Set(order.tests.map((t) => t.department)),
                        );
                        const tatIsFinal =
                          order.status === 'Completed' && order.tatMs !== undefined;
                        const tatLabel = tatIsFinal
                          ? formatHrsMin(order.tatMs!)
                          : order.status === 'Rejected'
                            ? '—'
                            : formatHrsMin(now.getTime() - new Date(order.orderedAt).getTime());
                        const testsLabel =
                          order.tests.length === 1
                            ? order.tests[0]!.testName
                            : `${order.tests.length} tests`;
                        const testsTooltip = order.tests.map((t) => t.testName).join(', ');
                        const pendingCount = order.tests.filter(
                          (t) => t.status === 'ORDERED',
                        ).length;

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
                              <div className="flex items-center gap-1.5">
                                <Tooltip content={order.orderId}>
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {order.orderId}
                                  </p>
                                </Tooltip>
                                {order.isNew && (
                                  <span
                                    className="shrink-0 rounded-full px-1.5 py-0.5 font-sans font-semibold whitespace-nowrap"
                                    style={{
                                      fontSize: 14,
                                      color: '#FFFFFF',
                                      background: '#00B4D8',
                                    }}
                                  >
                                    NEW
                                  </span>
                                )}
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
                            <div className="min-w-[180px] flex-1 py-3 pr-2 text-center">
                              <Tooltip content={testsTooltip}>
                                <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                  {testsLabel}
                                </p>
                              </Tooltip>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2">
                              <Tooltip content={order.orderedBy}>
                                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                  {order.orderedBy}
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
                            <div className="w-24 shrink-0 py-3 pr-2">
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
                                {order.status}
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
                            <div className="w-20 shrink-0 py-3 pr-2">
                              <p
                                style={{
                                  fontSize: 14,
                                  color: tatIsFinal ? '#0D2630' : '#8A98A3',
                                }}
                              >
                                {tatLabel}
                              </p>
                            </div>
                            <div
                              className="flex w-14 shrink-0 items-center justify-end py-3 pr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <OrderRowMenu
                                order={order}
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
                                onReceive={
                                  pendingCount > 0
                                    ? () => {
                                        setRowMenuOpenKey(null);
                                        setReceiveTarget(order);
                                      }
                                    : undefined
                                }
                                onPrint={() => {
                                  setRowMenuOpenKey(null);
                                  handlePrintLabel(order);
                                }}
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
                        itemLabel="orders"
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
                          {selectedOrder.orderId}
                        </p>
                        {selectedOrder.isNew && (
                          <span
                            className="rounded-full px-2.5 py-0.5 font-sans font-semibold"
                            style={{ fontSize: 14, color: '#FFFFFF', background: '#00B4D8' }}
                          >
                            NEW
                          </span>
                        )}
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
                            ['Ordered By', selectedOrder.orderedBy],
                            ['Ordered', formatDateTime(selectedOrder.orderedAt)],
                            ['Priority', selectedOrder.priority],
                            [
                              'Department(s)',
                              Array.from(
                                new Set(selectedOrder.tests.map((t) => t.department)),
                              ).join(', '),
                            ],
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
                                  <p style={{ fontSize: 14, color: '#4A7080' }}>{t.department}</p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  <span
                                    className="rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                    style={{
                                      fontSize: 14,
                                      color: cfg.color,
                                      border: `1px solid ${cfg.border}`,
                                      background: cfg.bg,
                                    }}
                                  >
                                    {cfg.label}
                                  </span>
                                  {t.flag && (
                                    <span style={{ fontSize: 14, color: FLAG_COLOR[t.flag] }}>
                                      {FLAG_LABEL[t.flag]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Workflow Status stepper */}
                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Workflow Status
                        </p>
                        <div className="mt-3 overflow-x-auto scroll-smooth">
                          <div className="flex min-w-[560px] items-start">
                            {STEPPER_STEPS.map((step, i) => {
                              const stepIndex = stepIndexForOrder(selectedOrder.status);
                              const isErrorStep = selectedOrder.status === 'Rejected' && i === 1;
                              const done = !isErrorStep && i < stepIndex;
                              const active = !isErrorStep && i === stepIndex;
                              const Icon = step.icon;
                              return (
                                <div key={step.label} className="flex flex-1 items-start">
                                  <div className="flex flex-1 flex-col items-center gap-1.5">
                                    <div
                                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                                      style={{
                                        background: isErrorStep
                                          ? 'rgba(239,68,68,0.12)'
                                          : active || done
                                            ? '#00B4D8'
                                            : 'rgba(0,100,130,0.08)',
                                        border:
                                          !active && !done && !isErrorStep
                                            ? '1.5px solid rgba(0,100,130,0.2)'
                                            : 'none',
                                      }}
                                    >
                                      {isErrorStep ? (
                                        <AlertTriangle
                                          style={{ width: 15, height: 15, color: '#EF4444' }}
                                        />
                                      ) : done ? (
                                        <CheckCircle2
                                          style={{ width: 15, height: 15, color: '#FFFFFF' }}
                                        />
                                      ) : (
                                        <Icon
                                          style={{
                                            width: 15,
                                            height: 15,
                                            color: active ? '#FFFFFF' : '#8A98A3',
                                          }}
                                        />
                                      )}
                                    </div>
                                    <p
                                      className="text-center font-sans font-medium"
                                      style={{
                                        fontSize: 14,
                                        color: isErrorStep
                                          ? '#EF4444'
                                          : active || done
                                            ? '#0D2630'
                                            : '#8A98A3',
                                      }}
                                    >
                                      {step.label}
                                    </p>
                                  </div>
                                  {i < STEPPER_STEPS.length - 1 && (
                                    <div
                                      className="mt-4 h-px flex-1"
                                      style={{ borderTop: '1px dashed rgba(0,100,130,0.25)' }}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {selectedOrder.status === 'Rejected' && (
                          <p className="mt-2" style={{ fontSize: 14, color: '#EF4444' }}>
                            {selectedOrder.tests.find((t) => t.status === 'REJECTED')
                              ?.rejectionReason ?? 'Sample rejected — recollection required.'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-2.5 p-4 pt-0 sm:p-5 sm:pt-0">
                      <div className="flex items-center gap-2.5">
                        <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                          {selectedOrder.tests.some((t) => t.status === 'ORDERED') && (
                            <button
                              type="button"
                              onClick={() => setReceiveTarget(selectedOrder)}
                              className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                              style={{ fontSize: 14, background: '#00B4D8' }}
                            >
                              <TestTube2 style={{ width: 15, height: 15 }} />
                              Receive Sample
                            </button>
                          )}
                        </PermissionGate>
                        <button
                          type="button"
                          onClick={() => handlePrintLabel(selectedOrder)}
                          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
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
                      <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                        {noteOpen ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              rows={2}
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="Add a note about this order"
                              className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none ${FOCUS_RING}`}
                              style={{
                                fontSize: 14,
                                color: '#0D2630',
                                border: '1px solid rgba(0,100,130,0.18)',
                              }}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSaveNote}
                                className={`flex h-9 items-center rounded-[8px] px-3.5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                                style={{ fontSize: 14, background: '#00B4D8' }}
                              >
                                Save Note
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNoteOpen(false);
                                  setNoteDraft('');
                                }}
                                className={`flex h-9 items-center rounded-[8px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setNoteOpen(true)}
                            className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              color: '#4A7080',
                              border: '1px solid rgba(0,100,130,0.2)',
                            }}
                          >
                            <StickyNote style={{ width: 15, height: 15 }} />
                            Add Note
                          </button>
                        )}
                      </PermissionGate>
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
        <ReceiveSampleModal
          orderId={receiveTarget.orderId}
          patientName={receiveTarget.patientName}
          mrn={receiveTarget.mrn}
          pendingTestNames={receiveTarget.tests
            .filter((t) => t.status === 'ORDERED')
            .map((t) => t.testName)}
          onClose={() => setReceiveTarget(null)}
          onConfirm={handleReceiveConfirm}
        />
      )}
    </div>
  );
}
