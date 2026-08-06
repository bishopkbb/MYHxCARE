'use client';

import {
  AlertCircle,
  AlertTriangle,
  Barcode,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  MessageSquare,
  MoreVertical,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Timer,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { ExportMenu } from '@components/ExportMenu';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
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
  addNote,
  markLabVerified,
  useLabResults,
} from '@/features/laboratory/store/labResultStore';
import {
  awaitingVerificationTests,
  deriveCollectionPoint,
  deriveSampleId,
  groupIntoOrders,
  orderSampleType,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';
import { computeFlag, getCatalogForTest } from '@/features/laboratory/__mocks__/labTestCatalog';
import type {
  LabDepartment,
  LabResult,
  LabResultPriority,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import type { ChecklistItem } from './VerifyResultModal';

const VerifyResultModal = dynamic(
  () => import('./VerifyResultModal').then((m) => m.VerifyResultModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

/** How long a result may sit awaiting the lab's own QC sign-off before it's
 * overdue — the lab-verification budget, distinct from Test Work Queue's own
 * receipt-to-result `PROCESSING_TARGET_MS`. */
const VERIFICATION_SLA_MS: Record<LabResultPriority, number> = {
  STAT: 30 * 60_000,
  URGENT: 60 * 60_000,
  ROUTINE: 120 * 60_000,
};

const PRIORITY_CFG: Record<LabResultPriority, { color: string; border: string; bg: string }> = {
  STAT: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  URGENT: { color: '#D97706', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  ROUTINE: { color: '#4A7080', border: 'rgba(0,100,130,0.2)', bg: 'transparent' },
};

const FLAG_STYLE: Record<'H' | 'L' | 'A' | 'CRIT', { background: string; color: string }> = {
  H: { background: 'rgba(239,68,68,0.12)', color: '#DC2626' },
  L: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
  A: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
  CRIT: { background: '#EF4444', color: '#FFFFFF' },
};

type Tab = 'All' | 'Critical' | 'Overdue';
const TABS: Tab[] = ['All', 'Critical', 'Overdue'];

type QueueOrder = RawLabOrder & {
  awaiting: LabResult[];
  hasCritical: boolean;
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
  const awaiting = awaitingVerificationTests(raw);
  if (awaiting.length === 0) return undefined;
  const hasCritical = awaiting.some((t) => t.flag === 'CRITICAL');
  const earliestResultAt = earliestOf(awaiting.map((t) => t.resultAt));
  const tatRemainingMs = earliestResultAt
    ? VERIFICATION_SLA_MS[raw.priority] - (nowMs - new Date(earliestResultAt).getTime())
    : undefined;
  return {
    ...raw,
    awaiting,
    hasCritical,
    ...(tatRemainingMs !== undefined ? { tatRemainingMs } : {}),
  };
}

function formatHrsMin(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTatRemaining(ms: number): string {
  const sign = ms < 0 ? '-' : '';
  return `${sign}${formatHrsMin(Math.abs(ms))}`;
}

/** Real, derived checklist — see the plan's rationale: only "all entered"
 * and "critical reviewed" are clinically load-bearing and always fixable, so
 * only those two block verification. The rest display honestly (a legacy
 * row missing `unit`/`method` correctly shows unmet) without blocking. */
function computeChecklist(tests: LabResult[]): ChecklistItem[] {
  const rows = tests.flatMap((t) => (t.rows ?? []).map((row) => ({ test: t, row })));
  const allEntered = rows.every(({ row }) => row.value.trim() !== '');
  const referencesValidated = rows.every(({ row }) => row.reference.trim() !== '');
  const criticalReviewed = tests.every(
    (t) => t.flag !== 'CRITICAL' || t.criticalAcknowledgedAt !== undefined,
  );
  const unitsAndMethods = rows.every(
    ({ row }) => row.unit !== undefined && row.method !== undefined,
  );
  const noCalcErrors = rows.every(({ test, row }) => {
    const param = getCatalogForTest(test.testName).find((p) => p.parameter === row.parameter);
    if (!param) return true;
    return (computeFlag(row.value, param) ?? undefined) === (row.flag ?? undefined);
  });
  return [
    { key: 'entered', label: 'All results entered', passed: allEntered, blocking: true },
    {
      key: 'reference',
      label: 'Reference ranges validated',
      passed: referencesValidated,
      blocking: false,
    },
    {
      key: 'critical',
      label: 'Critical values reviewed',
      passed: criticalReviewed,
      blocking: true,
    },
    {
      key: 'units',
      label: 'Units and methods verified',
      passed: unitsAndMethods,
      blocking: false,
    },
    { key: 'calc', label: 'No calculation errors', passed: noCalcErrors, blocking: false },
  ];
}

function canVerifyFromChecklist(checklist: ChecklistItem[]): boolean {
  return checklist.filter((c) => c.blocking).every((c) => c.passed);
}

// ── Row action menu ──────────────────────────────────────────────────────────

function VerificationRowMenu({
  open,
  onToggle,
  onView,
  onAddComment,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onAddComment: () => void;
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
        <button
          type="button"
          onClick={onAddComment}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <MessageSquare style={{ width: 15, height: 15, color: '#4A7080' }} />
          Add Comment
        </button>
      </RowMenuPortal>
    </div>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

type FilterKey = 'dateRange' | 'department' | 'sampleType';
type FilterState = Record<FilterKey, string>;
const FILTER_DEFAULTS: FilterState = { dateRange: 'ALL', department: 'ALL', sampleType: 'ALL' };

const DEPARTMENTS: LabDepartment[] = [
  'Hematology',
  'Biochemistry',
  'Microbiology',
  'Immunology',
  'Coagulation',
];

// ── Main workspace ───────────────────────────────────────────────────────────

export function LaboratoryResultVerificationWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const results = useLabResults();

  const [pageState, setPageState] = useState<PageState>('loaded');
  const [now] = useState(() => new Date());

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

  // ── Stat cards ────────────────────────────────────────────────────────────
  const awaitingCount = orders.length;
  const verifiedTodayCount = useMemo(
    () => results.filter((r) => r.labVerifiedAt && isToday(r.labVerifiedAt)).length,
    [results],
  );
  const criticalCount = useMemo(() => orders.filter((o) => o.hasCritical).length, [orders]);
  const overdueCount = useMemo(
    () => orders.filter((o) => o.tatRemainingMs !== undefined && o.tatRemainingMs < 0).length,
    [orders],
  );
  const avgTatPendingLabel = useMemo(() => {
    const durations: number[] = [];
    for (const o of orders) {
      for (const t of o.awaiting) {
        if (!t.resultAt) continue;
        durations.push(now.getTime() - new Date(t.resultAt).getTime());
      }
    }
    if (durations.length === 0) return '—';
    return formatHrsMin(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }, [orders, now]);

  // ── Filters / search / tabs / pagination ─────────────────────────────────
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [tab, setTab] = useState<Tab>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [rowMenuOpenKey, setRowMenuOpenKey] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<QueueOrder | null>(null);
  const [commentTarget, setCommentTarget] = useState<QueueOrder | null>(null);
  const [commentText, setCommentText] = useState('');

  const sampleTypeOptions = useMemo(
    () => Array.from(new Set(orders.map((o) => orderSampleType(o.awaiting)))).sort(),
    [orders],
  );

  const FILTER_DEFS: FilterDef[] = [
    {
      key: 'dateRange',
      defaultLabel: 'All Time',
      options: [
        { value: 'ALL', label: 'All Time' },
        { value: 'TODAY', label: 'Today' },
        { value: 'YESTERDAY', label: 'Yesterday' },
        { value: '7DAYS', label: 'Last 7 Days' },
      ],
    },
    {
      key: 'department',
      defaultLabel: 'All Departments',
      options: [
        { value: 'ALL', label: 'All Departments' },
        ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
      ],
    },
    {
      key: 'sampleType',
      defaultLabel: 'All Sample Types',
      options: [
        { value: 'ALL', label: 'All Sample Types' },
        ...sampleTypeOptions.map((s) => ({ value: s, label: s })),
      ],
    },
  ];

  function setFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenFilter(null);
    setPage(1);
  }

  const preTabFiltered = useMemo(() => {
    let list = orders;
    if (filters.dateRange !== 'ALL') {
      list = list.filter((o) => {
        const resultAt = earliestOf(o.awaiting.map((t) => t.resultAt));
        if (!resultAt) return false;
        if (filters.dateRange === 'TODAY') return isToday(resultAt);
        if (filters.dateRange === 'YESTERDAY') {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          return isSameDay(resultAt, y);
        }
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(resultAt).getTime() >= sevenDaysAgo.getTime();
      });
    }
    if (filters.department !== 'ALL') {
      list = list.filter((o) => o.awaiting.some((t) => t.department === filters.department));
    }
    if (filters.sampleType !== 'ALL') {
      list = list.filter((o) => orderSampleType(o.awaiting) === filters.sampleType);
    }
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

  const tabCounts = useMemo(
    () => ({
      All: preTabFiltered.length,
      Critical: preTabFiltered.filter((o) => o.hasCritical).length,
      Overdue: preTabFiltered.filter((o) => o.tatRemainingMs !== undefined && o.tatRemainingMs < 0)
        .length,
    }),
    [preTabFiltered],
  );

  const filtered = useMemo(() => {
    switch (tab) {
      case 'All':
        return preTabFiltered;
      case 'Critical':
        return preTabFiltered.filter((o) => o.hasCritical);
      case 'Overdue':
        return preTabFiltered.filter((o) => o.tatRemainingMs !== undefined && o.tatRemainingMs < 0);
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
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const selectedOrder = useMemo(
    () =>
      (selectedGroupKey ? orders.find((o) => o.groupKey === selectedGroupKey) : undefined) ??
      pageRows[0],
    [selectedGroupKey, orders, pageRows],
  );

  const selectedChecklist = useMemo(
    () => (selectedOrder ? computeChecklist(selectedOrder.awaiting) : []),
    [selectedOrder],
  );
  const selectedCanVerify = canVerifyFromChecklist(selectedChecklist);

  function openOrder(order: QueueOrder) {
    setSelectedGroupKey(order.groupKey);
  }

  function handleVerifyConfirm() {
    if (!verifyTarget) return;
    const checklist = computeChecklist(verifyTarget.awaiting);
    if (!canVerifyFromChecklist(checklist)) return;
    for (const t of verifyTarget.awaiting) markLabVerified(t.id, user?.name ?? 'Lab Scientist');
    toast.success(
      'Result verified',
      `${verifyTarget.orderId} — ${verifyTarget.awaiting.length} test${verifyTarget.awaiting.length === 1 ? '' : 's'} signed off.`,
    );
    setVerifyTarget(null);
  }

  function handleSaveComment() {
    if (!commentTarget || !commentText.trim()) return;
    for (const t of commentTarget.awaiting) {
      addNote(t.id, {
        text: commentText.trim(),
        author: user?.name ?? 'Lab Scientist',
        createdAt: new Date().toISOString(),
      });
    }
    toast.success('Comment added', `Saved to ${commentTarget.orderId}.`);
    setCommentTarget(null);
    setCommentText('');
  }

  function exportRowsAsCSV() {
    const header = [
      'Sample ID',
      'Order ID',
      'Patient',
      'MRN',
      'Tests',
      'Department',
      'Priority',
      'TAT Remaining',
    ];
    const rows = filtered.map((o) => [
      deriveSampleId(o.groupKey, o.orderedAt),
      o.orderId,
      o.patientName,
      o.mrn,
      o.awaiting.map((t) => t.testName).join('; '),
      Array.from(new Set(o.awaiting.map((t) => t.department))).join('; '),
      o.priority,
      o.tatRemainingMs !== undefined ? formatTatRemaining(o.tatRemainingMs) : '—',
    ]);
    downloadCSV('result-verification', [header, ...rows]);
    toast.success('Export ready', 'CSV download started.');
  }

  function exportRowsAsPDF() {
    const rowsHtml = filtered
      .map(
        (o) =>
          `<tr><td>${escapeHtml(deriveSampleId(o.groupKey, o.orderedAt))}</td><td>${escapeHtml(o.orderId)}</td><td>${escapeHtml(o.patientName)}</td><td>${escapeHtml(o.awaiting.map((t) => t.testName).join(', '))}</td><td>${escapeHtml(o.priority)}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'Result Verification Worklist',
      `<h1>Result Verification Worklist</h1><p class="meta">${escapeHtml(formatDateTime(now.toISOString()))} — ${filtered.length} results awaiting verification</p><hr/><table><thead><tr><th>Sample ID</th><th>Order ID</th><th>Patient</th><th>Test(s)</th><th>Priority</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
    );
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
                Failed to load Result Verification
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
                Result Verification
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Review and verify test results before publishing.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={ClipboardCheck}
              label="Awaiting Verification"
              value={awaitingCount}
              info="Resulted, not yet signed off"
              accent="#8B5CF6"
              iconBg="rgba(139,92,246,0.12)"
            />
            <StatCard
              icon={CheckCircle2}
              label="Verified Today"
              value={verifiedTodayCount}
              info="Signed off since midnight (WAT)"
              accent="#16A34A"
              iconBg="rgba(34,197,94,0.12)"
            />
            <StatCard
              icon={ShieldAlert}
              label="Critical Results"
              value={criticalCount}
              info="Contains a critical flag"
              accent="#EF4444"
              iconBg="rgba(239,68,68,0.12)"
            />
            <StatCard
              icon={Timer}
              label="Avg TAT (Pending)"
              value={avgTatPendingLabel}
              info="Resulted to now (hrs:min)"
              accent="#D97706"
              iconBg="rgba(245,158,11,0.12)"
            />
            <StatCard
              icon={AlertTriangle}
              label="Overdue"
              value={overdueCount}
              info="Past the verification SLA"
              accent="#EF4444"
              iconBg="rgba(239,68,68,0.12)"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[240px] flex-1">
              <Search
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                  color: '#8A98A3',
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
                className={`h-11 w-full rounded-[10px] pr-3.5 pl-10 font-sans outline-none ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.18)' }}
              />
            </div>
            {FILTER_DEFS.map((def) => (
              <FilterDropdown
                key={def.key}
                def={def}
                value={filters[def.key as FilterKey]}
                isOpen={openFilter === def.key}
                onToggle={() =>
                  setOpenFilter((k) => (k === def.key ? null : (def.key as FilterKey)))
                }
                onSelect={(v) => setFilter(def.key as FilterKey, v)}
              />
            ))}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                Clear
              </button>
            )}
          </div>

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
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  exportRowsAsPDF();
                  toast.success('Preparing worklist', 'Printable worklist opened in a new tab.');
                }}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print Worklist
              </button>
              <ExportMenu
                onExportCSV={exportRowsAsCSV}
                onExportPDF={exportRowsAsPDF}
                variant="button"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div
              className="min-w-0 flex-1 rounded-[12px] bg-white"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <ScrollableTable minWidth={1440} maxHeight={640}>
                <div
                  className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                  style={{ background: TABLE_HEADER_BG }}
                >
                  <div
                    className="w-36 shrink-0 px-3.5 py-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Sample ID
                  </div>
                  <div
                    className="w-36 shrink-0 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Order ID
                  </div>
                  <div
                    className="w-44 shrink-0 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Patient
                  </div>
                  <div
                    className="min-w-0 flex-1 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Test(s)
                  </div>
                  <div
                    className="w-32 shrink-0 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Department
                  </div>
                  <div
                    className="w-24 shrink-0 py-3 pr-3 text-center font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Priority
                  </div>
                  <div
                    className="w-24 shrink-0 py-3 pr-3 text-center font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    TAT Remaining
                  </div>
                  <div
                    className="w-48 shrink-0 py-3 pr-3 text-center font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Status
                  </div>
                  <div
                    className="w-36 shrink-0 py-3 pr-3 text-right font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Actions
                  </div>
                </div>

                {pageRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(0,180,216,0.1)' }}
                    >
                      <ClipboardCheck style={{ width: 24, height: 24, color: '#00B4D8' }} />
                    </div>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Nothing awaiting verification
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {hasActiveFilters
                        ? 'No results match your current filters.'
                        : 'Every resulted test has been signed off.'}
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
                ) : (
                  pageRows.map((order) => {
                    const priorityCfg = PRIORITY_CFG[order.priority];
                    const sampleId = deriveSampleId(order.groupKey, order.orderedAt);
                    const departments = Array.from(
                      new Set(order.awaiting.map((t) => t.department)),
                    );
                    const departmentLabel = departments.length === 1 ? departments[0] : 'Multiple';
                    const testsLabel =
                      order.awaiting.length === 1
                        ? order.awaiting[0]!.testName
                        : `${order.awaiting.map((t) => t.testName).join(', ')}`;
                    const isOverdue =
                      order.tatRemainingMs !== undefined && order.tatRemainingMs < 0;
                    return (
                      <div
                        key={order.groupKey}
                        onClick={() => openOrder(order)}
                        className={`flex cursor-pointer items-center border-t transition-colors duration-150 hover:bg-[#F5FBFD] ${selectedOrder?.groupKey === order.groupKey ? 'bg-[#F5FBFD]' : ''}`}
                        style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                      >
                        <div
                          className="w-36 shrink-0 px-3.5 py-3"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          {sampleId}
                        </div>
                        <div
                          className="w-36 shrink-0 py-3 pr-3"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          {order.orderId}
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-3">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {order.patientName}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{order.mrn}</p>
                        </div>
                        <Tooltip content={testsLabel}>
                          <div
                            className="min-w-0 flex-1 truncate py-3 pr-3"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {testsLabel}
                          </div>
                        </Tooltip>
                        <div
                          className="w-32 shrink-0 py-3 pr-3"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {departmentLabel}
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-3 text-center">
                          <span
                            className="rounded-full px-2.5 py-1 font-sans font-medium"
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
                        <div
                          className="w-24 shrink-0 py-3 pr-3 text-center font-sans font-semibold"
                          style={{ fontSize: 14, color: isOverdue ? '#EF4444' : '#4A7080' }}
                        >
                          {order.tatRemainingMs !== undefined
                            ? formatTatRemaining(order.tatRemainingMs)
                            : '—'}
                        </div>
                        <div className="w-48 shrink-0 py-3 pr-3 text-center">
                          <span
                            className="rounded-full px-2.5 py-1 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: '#8B5CF6',
                              border: '1px solid rgba(139,92,246,0.4)',
                              background: 'rgba(139,92,246,0.08)',
                            }}
                          >
                            Awaiting Verification
                          </span>
                        </div>
                        <div
                          className="flex w-36 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                            <button
                              type="button"
                              onClick={() => {
                                openOrder(order);
                                setVerifyTarget(order);
                              }}
                              className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                              style={{ fontSize: 14, background: '#00B4D8' }}
                            >
                              Review
                            </button>
                          </PermissionGate>
                          <VerificationRowMenu
                            open={rowMenuOpenKey === order.groupKey}
                            onToggle={() =>
                              setRowMenuOpenKey((k) =>
                                k === order.groupKey ? null : order.groupKey,
                              )
                            }
                            onView={() => {
                              openOrder(order);
                              setRowMenuOpenKey(null);
                            }}
                            onAddComment={() => {
                              setCommentTarget(order);
                              setRowMenuOpenKey(null);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </ScrollableTable>

              {pageRows.length > 0 && (
                <div className="px-4 py-3">
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
                </div>
              )}

              <div
                className="mx-4 mb-4 flex items-start gap-2.5 rounded-[10px] px-3.5 py-3"
                style={{ background: 'rgba(0,180,216,0.06)' }}
              >
                <AlertCircle
                  style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0, marginTop: 2 }}
                />
                <p style={{ fontSize: 14, color: '#0D2630' }}>
                  Ensure all results are accurate, within reference ranges, and critical values are
                  addressed before verifying and publishing.{' '}
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        'SOP not available',
                        'Verification SOP documents are not yet published in-app.',
                      )
                    }
                    className={`font-sans font-medium underline transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ color: '#00B4D8' }}
                  >
                    View Verification SOP
                  </button>
                </p>
              </div>
            </div>

            {/* ── Right rail: Selected Result Preview ────────────────────── */}
            <div className="flex shrink-0 flex-col gap-4 xl:w-[380px]">
              {selectedOrder ? (
                <div
                  className="rounded-[12px] bg-white p-4 sm:p-5"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between">
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Selected Result Preview
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedGroupKey(null)}
                      aria-label="Clear selection"
                      className={`flex size-9 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
                    >
                      <X style={{ width: 16, height: 16, color: '#8A98A3' }} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Barcode style={{ width: 20, height: 20, color: '#4A7080' }} />
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 15, color: '#0D2630' }}
                    >
                      {deriveSampleId(selectedOrder.groupKey, selectedOrder.orderedAt)}
                    </span>
                    {selectedOrder.hasCritical && (
                      <span
                        className="rounded-full px-2 py-0.5 font-sans font-semibold"
                        style={{ fontSize: 13, ...FLAG_STYLE.CRIT }}
                      >
                        Critical
                      </span>
                    )}
                  </div>
                  <p className="mt-1" style={{ fontSize: 14, color: '#00B4D8' }}>
                    Order: {selectedOrder.orderId}
                  </p>

                  <div
                    className="mt-3.5 flex items-center gap-3"
                    style={{ borderTop: '1px solid rgba(0,100,130,0.1)', paddingTop: 14 }}
                  >
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                      style={{ background: selectedOrder.avatarBg, fontSize: 14 }}
                    >
                      {selectedOrder.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selectedOrder.patientName}
                      </p>
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        {selectedOrder.mrn}
                        {selectedOrder.age !== undefined ? ` · ${selectedOrder.age} Y` : ''}
                        {selectedOrder.gender ? ` / ${selectedOrder.gender}` : ''}
                      </p>
                    </div>
                    {selectedOrder.patientId && (
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.patientProfile(selectedOrder.patientId!))}
                        className={`shrink-0 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        View Profile
                      </button>
                    )}
                  </div>

                  <div
                    className="mt-3 flex flex-col divide-y"
                    style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                  >
                    <div className="flex items-center justify-between py-1.5">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Sample Type</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {orderSampleType(selectedOrder.awaiting)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Collection Point</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {deriveCollectionPoint(selectedOrder)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Collected At</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {(() => {
                          const at = earliestOf(
                            selectedOrder.awaiting.map((t) => t.sampleCollectedAt),
                          );
                          return at ? `${formatDate(at)}, ${formatTime(at)}` : '—';
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>
                        Tests ({selectedOrder.awaiting.length})
                      </span>
                      <span
                        className="text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selectedOrder.awaiting.map((t) => t.testName).join(', ')}
                      </span>
                    </div>
                    {selectedOrder.awaiting[0]?.comment && (
                      <div className="py-1.5">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Clinical Note</span>
                        <p className="mt-0.5" style={{ fontSize: 14, color: '#0D2630' }}>
                          {selectedOrder.awaiting[0].comment}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-3.5 rounded-[10px] p-3.5" style={{ background: '#F5FBFD' }}>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Verification Checklist
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {selectedChecklist.map((item) => (
                        <div key={item.key} className="flex items-center gap-2">
                          {item.passed ? (
                            <CheckCircle2 style={{ width: 15, height: 15, color: '#22C55E' }} />
                          ) : (
                            <AlertTriangle
                              style={{
                                width: 15,
                                height: 15,
                                color: item.blocking ? '#EF4444' : '#F59E0B',
                              }}
                            />
                          )}
                          <span
                            style={{ fontSize: 14, color: item.passed ? '#0D2630' : '#4A7080' }}
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        {selectedCanVerify ? (
                          <CheckCircle2 style={{ width: 15, height: 15, color: '#22C55E' }} />
                        ) : (
                          <span
                            className="shrink-0 rounded-full"
                            style={{ width: 15, height: 15, border: '2px solid #8A98A3' }}
                          />
                        )}
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: selectedCanVerify ? '#0D2630' : '#8A98A3' }}
                        >
                          Ready to verify
                        </span>
                      </div>
                    </div>
                  </div>

                  <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                    <button
                      type="button"
                      onClick={() => setVerifyTarget(selectedOrder)}
                      className={`mt-3.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                      style={{ fontSize: 14, background: '#0D2630' }}
                    >
                      <CheckCircle2 style={{ width: 15, height: 15 }} />
                      Review &amp; Verify Result
                    </button>
                  </PermissionGate>
                  <button
                    type="button"
                    onClick={() => setCommentTarget(selectedOrder)}
                    className={`mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <MessageSquare style={{ width: 15, height: 15 }} />
                    Add Comment
                  </button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-white px-4 py-14 text-center"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <ClipboardCheck style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Select a result to preview it here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {verifyTarget && (
        <VerifyResultModal
          orderId={verifyTarget.orderId}
          patientName={verifyTarget.patientName}
          mrn={verifyTarget.mrn}
          tests={verifyTarget.awaiting}
          checklist={computeChecklist(verifyTarget.awaiting)}
          canVerify={canVerifyFromChecklist(computeChecklist(verifyTarget.awaiting))}
          onClose={() => setVerifyTarget(null)}
          onConfirm={handleVerifyConfirm}
        />
      )}

      {commentTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(13,38,48,0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCommentTarget(null);
          }}
        >
          <div
            className="flex w-full flex-col overflow-hidden bg-white"
            style={{ maxWidth: 440, borderRadius: 16 }}
          >
            <div
              className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
              style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
                Add Comment
              </h2>
              <button
                type="button"
                onClick={() => setCommentTarget(null)}
                aria-label="Close"
                className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
              >
                <X style={{ width: 20, height: 20, color: '#4A7080' }} />
              </button>
            </div>
            <div className="px-6 py-5">
              <textarea
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a note about this result…"
                autoFocus
                className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.18)' }}
              />
            </div>
            <div
              className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
              style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
            >
              <button
                type="button"
                onClick={() => setCommentTarget(null)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveComment}
                disabled={!commentText.trim()}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 ${commentText.trim() ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'} ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                Save Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
