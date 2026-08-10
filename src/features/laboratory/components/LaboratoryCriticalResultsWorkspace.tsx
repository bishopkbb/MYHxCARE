'use client';

import {
  AlertTriangle,
  Barcode,
  Bell,
  CheckCircle2,
  FileText,
  MessageSquare,
  MoreVertical,
  PhoneCall,
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
  communicateCritical,
  useLabResults,
} from '@/features/laboratory/store/labResultStore';
import {
  criticalTests,
  deriveSampleId,
  findCriticalRow,
  groupIntoOrders,
  orderSampleType,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';
import type {
  LabDepartment,
  LabResult,
  LabResultPriority,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import type { CommunicateCriticalInput } from './CommunicateCriticalModal';

const CommunicateCriticalModal = dynamic(
  () => import('./CommunicateCriticalModal').then((m) => m.CommunicateCriticalModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const CriticalResultReportModal = dynamic(
  () => import('./CriticalResultReportModal').then((m) => m.CriticalResultReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const AddLabCommentModal = dynamic(
  () => import('./AddLabCommentModal').then((m) => m.AddLabCommentModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

type Status = 'Awaiting Review' | 'Communicated' | 'Acknowledged';

const STATUS_CFG: Record<Status, { color: string; border: string; bg: string }> = {
  'Awaiting Review': {
    color: '#D97706',
    border: 'rgba(245,158,11,0.4)',
    bg: 'rgba(245,158,11,0.08)',
  },
  Communicated: { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.08)' },
  Acknowledged: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
};

const PRIORITY_CFG: Record<LabResultPriority, { color: string; border: string; bg: string }> = {
  STAT: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  URGENT: { color: '#D97706', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  ROUTINE: { color: '#4A7080', border: 'rgba(0,100,130,0.2)', bg: 'transparent' },
};

type Tab = 'All' | 'HighPriority' | 'Pending' | 'Acknowledged';
const TAB_LABELS: Record<Tab, string> = {
  All: 'All Critical',
  HighPriority: 'High Priority',
  Pending: 'Pending Communication',
  Acknowledged: 'Acknowledged',
};
const TABS: Tab[] = ['All', 'HighPriority', 'Pending', 'Acknowledged'];

type Entry = {
  order: RawLabOrder;
  test: LabResult;
  status: Status;
  responseTimeMs?: number;
};

function computeStatus(test: LabResult): Status {
  if (test.criticalAcknowledgedAt) return 'Acknowledged';
  if (test.criticalCommunicatedAt) return 'Communicated';
  return 'Awaiting Review';
}

function responseTimeMs(test: LabResult): number | undefined {
  if (!test.resultAt) return undefined;
  const respondedAt = test.criticalCommunicatedAt ?? test.criticalAcknowledgedAt;
  if (!respondedAt) return undefined;
  return new Date(respondedAt).getTime() - new Date(test.resultAt).getTime();
}

function formatHrsMin(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Row action menu ──────────────────────────────────────────────────────────

function CriticalRowMenu({
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
          <FileText style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View Full Result
        </button>
        <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
          <button
            type="button"
            onClick={onAddComment}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            <MessageSquare style={{ width: 15, height: 15, color: '#4A7080' }} />
            Add Comment
          </button>
        </PermissionGate>
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

export function LaboratoryCriticalResultsWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const results = useLabResults();

  const [pageState, setPageState] = useState<PageState>('loaded');

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  const entries = useMemo<Entry[]>(() => {
    const built: Entry[] = [];
    for (const order of groupIntoOrders(results)) {
      for (const test of criticalTests(order)) {
        const rt = responseTimeMs(test);
        built.push({
          order,
          test,
          status: computeStatus(test),
          ...(rt !== undefined ? { responseTimeMs: rt } : {}),
        });
      }
    }
    return built;
  }, [results]);

  // ── Stat cards ────────────────────────────────────────────────────────────
  const totalCount = entries.length;
  const awaitingCount = useMemo(
    () => entries.filter((e) => e.status === 'Awaiting Review').length,
    [entries],
  );
  const communicatedCount = useMemo(
    () => entries.filter((e) => e.status === 'Communicated').length,
    [entries],
  );
  const acknowledgedCount = useMemo(
    () => entries.filter((e) => e.status === 'Acknowledged').length,
    [entries],
  );
  const avgResponseLabel = useMemo(() => {
    const durations = entries
      .map((e) => e.responseTimeMs)
      .filter((d): d is number => d !== undefined);
    if (durations.length === 0) return '—';
    return formatHrsMin(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }, [entries]);

  // ── Filters / search / tabs / pagination ─────────────────────────────────
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [tab, setTab] = useState<Tab>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [rowMenuOpenKey, setRowMenuOpenKey] = useState<string | null>(null);
  const [communicateTarget, setCommunicateTarget] = useState<Entry | null>(null);
  const [reportTarget, setReportTarget] = useState<Entry | null>(null);
  const [commentTarget, setCommentTarget] = useState<Entry | null>(null);
  const [commentText, setCommentText] = useState('');

  const [now] = useState(() => new Date());

  const sampleTypeOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => orderSampleType([e.test])))).sort(),
    [entries],
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
    let list = entries;
    if (filters.dateRange !== 'ALL') {
      list = list.filter((e) => {
        if (!e.test.resultAt) return false;
        if (filters.dateRange === 'TODAY') return isToday(e.test.resultAt);
        if (filters.dateRange === 'YESTERDAY') {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          return isSameDay(e.test.resultAt, y);
        }
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(e.test.resultAt).getTime() >= sevenDaysAgo.getTime();
      });
    }
    if (filters.department !== 'ALL') {
      list = list.filter((e) => e.test.department === filters.department);
    }
    if (filters.sampleType !== 'ALL') {
      list = list.filter((e) => orderSampleType([e.test]) === filters.sampleType);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.order.patientName.toLowerCase().includes(q) ||
          e.order.mrn.toLowerCase().includes(q) ||
          e.order.orderId.toLowerCase().includes(q) ||
          deriveSampleId(e.order.groupKey, e.order.orderedAt).toLowerCase().includes(q),
      );
    }
    return list;
  }, [entries, filters, search, now]);

  const tabCounts = useMemo(
    () => ({
      All: preTabFiltered.length,
      HighPriority: preTabFiltered.filter(
        (e) => e.test.priority === 'STAT' || e.test.priority === 'URGENT',
      ).length,
      Pending: preTabFiltered.filter((e) => e.status === 'Awaiting Review').length,
      Acknowledged: preTabFiltered.filter((e) => e.status === 'Acknowledged').length,
    }),
    [preTabFiltered],
  );

  const filtered = useMemo(() => {
    switch (tab) {
      case 'All':
        return preTabFiltered;
      case 'HighPriority':
        return preTabFiltered.filter(
          (e) => e.test.priority === 'STAT' || e.test.priority === 'URGENT',
        );
      case 'Pending':
        return preTabFiltered.filter((e) => e.status === 'Awaiting Review');
      case 'Acknowledged':
        return preTabFiltered.filter((e) => e.status === 'Acknowledged');
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

  const selectedEntry = useMemo(
    () =>
      (selectedTestId ? entries.find((e) => e.test.id === selectedTestId) : undefined) ??
      pageRows[0],
    [selectedTestId, entries, pageRows],
  );

  function selectEntry(entry: Entry) {
    setSelectedTestId(entry.test.id);
  }

  function handleCommunicateConfirm(input: CommunicateCriticalInput) {
    if (!communicateTarget) return;
    communicateCritical(communicateTarget.test.id, user?.name ?? 'Lab Scientist');
    if (input.note) {
      addNote(communicateTarget.test.id, {
        text: `[${input.method}] ${input.note}`,
        author: user?.name ?? 'Lab Scientist',
        createdAt: new Date().toISOString(),
      });
    }
    toast.success(
      'Ward notified',
      `${communicateTarget.order.patientName}'s ${communicateTarget.test.testName} marked as communicated.`,
    );
    setCommunicateTarget(null);
  }

  function handleSaveComment() {
    if (!commentTarget || !commentText.trim()) return;
    addNote(commentTarget.test.id, {
      text: commentText.trim(),
      author: user?.name ?? 'Lab Scientist',
      createdAt: new Date().toISOString(),
    });
    toast.success('Comment added', `Saved to ${commentTarget.order.orderId}.`);
    setCommentTarget(null);
    setCommentText('');
  }

  function exportRowsAsCSV() {
    const header = [
      'Sample ID',
      'Order ID',
      'Patient',
      'Test',
      'Result',
      'Critical Value',
      'Status',
      'Response Time',
    ];
    const rows = filtered.map((e) => {
      const row = findCriticalRow(e.test);
      return [
        deriveSampleId(e.order.groupKey, e.order.orderedAt),
        e.order.orderId,
        e.order.patientName,
        row?.parameter ?? e.test.testName,
        row ? `${row.value}${row.unit ? ' ' + row.unit : ''}` : '—',
        row?.reference ?? '—',
        e.status,
        e.responseTimeMs !== undefined ? formatHrsMin(e.responseTimeMs) : '—',
      ];
    });
    downloadCSV('critical-results', [header, ...rows]);
    toast.success('Export ready', 'CSV download started.');
  }

  function exportRowsAsPDF() {
    const rowsHtml = filtered
      .map((e) => {
        const row = findCriticalRow(e.test);
        return `<tr><td>${escapeHtml(deriveSampleId(e.order.groupKey, e.order.orderedAt))}</td><td>${escapeHtml(e.order.orderId)}</td><td>${escapeHtml(e.order.patientName)}</td><td>${escapeHtml(row?.parameter ?? e.test.testName)}</td><td>${escapeHtml(row ? `${row.value}${row.unit ? ' ' + row.unit : ''}` : '—')}</td><td>${escapeHtml(e.status)}</td></tr>`;
      })
      .join('');
    downloadPDF(
      'Critical Results Report',
      `<h1>Critical Results Report</h1><p class="meta">${escapeHtml(formatDateTime(now.toISOString()))} — ${filtered.length} critical results</p><hr/><table><thead><tr><th>Sample ID</th><th>Order ID</th><th>Patient</th><th>Test</th><th>Result</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
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
              <AlertTriangle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load Critical Results
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
            <div className="flex items-center gap-2.5">
              <AlertTriangle style={{ width: 24, height: 24, color: '#EF4444' }} />
              <div>
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
                >
                  Critical Results
                </h1>
                <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                  View and manage critical test results that require immediate attention.
                </p>
              </div>
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
              <ExportMenu
                onExportCSV={exportRowsAsCSV}
                onExportPDF={exportRowsAsPDF}
                variant="button"
              />
              <button
                type="button"
                onClick={exportRowsAsPDF}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print Report
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={ShieldAlert}
              label="Critical Results"
              value={totalCount}
              info="Flagged critical values"
              accent="#EF4444"
              iconBg="rgba(239,68,68,0.12)"
            />
            <StatCard
              icon={Bell}
              label="Awaiting Review"
              value={awaitingCount}
              info="Not yet communicated"
              accent="#D97706"
              iconBg="rgba(245,158,11,0.12)"
            />
            <StatCard
              icon={PhoneCall}
              label="Communicated"
              value={communicatedCount}
              info="Ward notified, awaiting ack"
              accent="#3B82F6"
              iconBg="rgba(59,130,246,0.12)"
            />
            <StatCard
              icon={CheckCircle2}
              label="Acknowledged"
              value={acknowledgedCount}
              info="Confirmed by clinical staff"
              accent="#16A34A"
              iconBg="rgba(34,197,94,0.12)"
            />
            <StatCard
              icon={Timer}
              label="Avg Response Time"
              value={avgResponseLabel}
              info="Result to response (hrs:min)"
              accent="#8B5CF6"
              iconBg="rgba(139,92,246,0.12)"
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

          <div className="mt-4 overflow-x-auto scroll-smooth">
            <div className="flex gap-1" style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}>
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
                  {TAB_LABELS[t]} ({tabCounts[t]})
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div
              className="min-w-0 flex-1 rounded-[12px] bg-white"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <ScrollableTable minWidth={1580} maxHeight={640}>
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
                    Test
                  </div>
                  <div
                    className="w-32 shrink-0 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Result
                  </div>
                  <div
                    className="w-36 shrink-0 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Critical Value
                  </div>
                  <div
                    className="w-32 shrink-0 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Collected At
                  </div>
                  <div
                    className="w-44 shrink-0 py-3 pr-3 text-center font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Status
                  </div>
                  <div
                    className="w-24 shrink-0 py-3 pr-3 text-center font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Response
                  </div>
                  <div
                    className="w-16 shrink-0 py-3 pr-3 text-right font-sans font-semibold"
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
                      <ShieldAlert style={{ width: 24, height: 24, color: '#00B4D8' }} />
                    </div>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      No critical results
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {hasActiveFilters
                        ? 'No results match your current filters.'
                        : 'Nothing has crossed a critical threshold yet.'}
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
                  pageRows.map((entry) => {
                    const { order, test, status, responseTimeMs: rt } = entry;
                    const row = findCriticalRow(test);
                    const statusCfg = STATUS_CFG[status];
                    const sampleId = deriveSampleId(order.groupKey, order.orderedAt);
                    const collectedAt = test.sampleCollectedAt;
                    return (
                      <div
                        key={test.id}
                        onClick={() => selectEntry(entry)}
                        className={`flex cursor-pointer items-center border-t transition-colors duration-150 hover:bg-[#F5FBFD] ${selectedEntry?.test.id === test.id ? 'bg-[#F5FBFD]' : ''}`}
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
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {order.age !== undefined ? `${order.age} Y` : ''}
                            {order.age !== undefined && order.gender ? ' / ' : ''}
                            {order.gender ?? ''}
                          </p>
                        </div>
                        <Tooltip content={`${row?.parameter ?? test.testName} — ${test.testName}`}>
                          <div className="min-w-0 flex-1 py-3 pr-3">
                            <p
                              className="truncate font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row?.parameter ?? test.testName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {test.testName}
                            </p>
                          </div>
                        </Tooltip>
                        <div
                          className="w-32 shrink-0 py-3 pr-3 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#DC2626' }}
                        >
                          {row ? `${row.value}${row.unit ? ` ${row.unit}` : ''}` : '—'}
                        </div>
                        <Tooltip content={row?.reference ?? '—'}>
                          <div
                            className="w-36 shrink-0 truncate py-3 pr-3"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {row?.reference ?? '—'}
                          </div>
                        </Tooltip>
                        <div
                          className="w-32 shrink-0 py-3 pr-3"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {collectedAt ? (
                            <>
                              <p>{formatDate(collectedAt)}</p>
                              <p style={{ color: '#8A98A3' }}>{formatTime(collectedAt)}</p>
                            </>
                          ) : (
                            '—'
                          )}
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-3 text-center">
                          <span
                            className="rounded-full px-2.5 py-1 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.border}`,
                              background: statusCfg.bg,
                            }}
                          >
                            {status}
                          </span>
                        </div>
                        <div
                          className="w-24 shrink-0 py-3 pr-3 text-center font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {rt !== undefined ? formatHrsMin(rt) : '—'}
                        </div>
                        <div
                          className="flex w-16 shrink-0 items-center justify-end pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CriticalRowMenu
                            open={rowMenuOpenKey === test.id}
                            onToggle={() =>
                              setRowMenuOpenKey((k) => (k === test.id ? null : test.id))
                            }
                            onView={() => {
                              selectEntry(entry);
                              setRowMenuOpenKey(null);
                              setReportTarget(entry);
                            }}
                            onAddComment={() => {
                              setCommentTarget(entry);
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
                    itemLabel="results"
                  />
                </div>
              )}
            </div>

            {/* ── Right rail: Critical Result Details ────────────────────── */}
            <div className="flex shrink-0 flex-col gap-4 xl:w-[380px]">
              {selectedEntry ? (
                (() => {
                  const { order, test, status } = selectedEntry;
                  const row = findCriticalRow(test);
                  const priorityCfg = PRIORITY_CFG[test.priority];
                  const statusCfg = STATUS_CFG[status];
                  const reportedBy = test.analysisStartedBy ?? test.receivedBy ?? '—';
                  return (
                    <div
                      className="rounded-[12px] bg-white p-4 sm:p-5"
                      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center justify-between">
                        <p
                          className="font-display font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Critical Result Details
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedTestId(null)}
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
                          {deriveSampleId(order.groupKey, order.orderedAt)}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 font-sans font-semibold"
                          style={{
                            fontSize: 13,
                            color: priorityCfg.color,
                            border: `1px solid ${priorityCfg.border}`,
                            background: priorityCfg.bg,
                          }}
                        >
                          {test.priority}
                        </span>
                      </div>
                      <p className="mt-1" style={{ fontSize: 14, color: '#00B4D8' }}>
                        Order: {order.orderId}
                      </p>

                      <div
                        className="mt-3.5 flex items-center gap-3"
                        style={{ borderTop: '1px solid rgba(0,100,130,0.1)', paddingTop: 14 }}
                      >
                        <span
                          className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                          style={{ background: order.avatarBg, fontSize: 14 }}
                        >
                          {order.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {order.patientName}
                          </p>
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {order.mrn}
                            {order.age !== undefined ? ` · ${order.age} Y` : ''}
                            {order.gender ? ` / ${order.gender}` : ''}
                          </p>
                        </div>
                        {order.patientId && (
                          <button
                            type="button"
                            onClick={() => router.push(ROUTES.patientProfile(order.patientId!))}
                            className={`shrink-0 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            View Profile
                          </button>
                        )}
                      </div>

                      <div className="mt-3.5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Test Information
                        </p>
                        <div
                          className="mt-1.5 flex flex-col divide-y"
                          style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                        >
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Test</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row?.parameter ?? test.testName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Test Category</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {test.testName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Sample Type</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {orderSampleType([test])}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Result</span>
                            <span
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#DC2626' }}
                            >
                              {row ? `${row.value}${row.unit ? ` ${row.unit}` : ''}` : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Critical Range</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {row?.reference ?? '—'}
                            </span>
                          </div>
                          {row?.method && (
                            <div className="flex items-center justify-between py-1.5">
                              <span style={{ fontSize: 14, color: '#8A98A3' }}>Method</span>
                              <span
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {row.method}
                              </span>
                            </div>
                          )}
                          {test.sampleCollectedAt && (
                            <div className="flex items-center justify-between py-1.5">
                              <span style={{ fontSize: 14, color: '#8A98A3' }}>Collected At</span>
                              <span
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {formatDateTime(test.sampleCollectedAt)}
                              </span>
                            </div>
                          )}
                          {test.receivedAt && (
                            <div className="flex items-center justify-between py-1.5">
                              <span style={{ fontSize: 14, color: '#8A98A3' }}>Received At</span>
                              <span
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {formatDateTime(test.receivedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className="mt-3.5 rounded-[10px] p-3.5"
                        style={{ background: '#F5FBFD' }}
                      >
                        <div
                          className="flex flex-col divide-y"
                          style={{ borderColor: 'rgba(0,100,130,0.1)' }}
                        >
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Status</span>
                            <span
                              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                color: statusCfg.color,
                                border: `1px solid ${statusCfg.border}`,
                                background: statusCfg.bg,
                              }}
                            >
                              {status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Priority</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: priorityCfg.color }}
                            >
                              {test.priority}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Response Time</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {selectedEntry.responseTimeMs !== undefined
                                ? formatHrsMin(selectedEntry.responseTimeMs)
                                : '—'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>Reported By</span>
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {reportedBy}
                            </span>
                          </div>
                          {test.comment && (
                            <div className="py-1.5">
                              <span style={{ fontSize: 14, color: '#8A98A3' }}>Comments</span>
                              <p className="mt-0.5" style={{ fontSize: 14, color: '#0D2630' }}>
                                {test.comment}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {status !== 'Acknowledged' && (
                        <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                          <button
                            type="button"
                            onClick={() => setCommunicateTarget(selectedEntry)}
                            disabled={status === 'Communicated'}
                            className={`mt-3.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 ${status === 'Communicated' ? 'cursor-not-allowed opacity-50' : 'hover:opacity-90'} ${FOCUS_RING}`}
                            style={{ fontSize: 14, background: '#EF4444' }}
                          >
                            <PhoneCall style={{ width: 15, height: 15 }} />
                            {status === 'Communicated'
                              ? 'Awaiting Acknowledgment'
                              : 'Acknowledge & Communicate'}
                          </button>
                        </PermissionGate>
                      )}
                      <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                        <button
                          type="button"
                          onClick={() => setCommentTarget(selectedEntry)}
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
                      </PermissionGate>
                      <button
                        type="button"
                        onClick={() => setReportTarget(selectedEntry)}
                        className={`mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        <FileText style={{ width: 15, height: 15 }} />
                        View Full Result
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-white px-4 py-14 text-center"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <ShieldAlert style={{ width: 28, height: 28, color: '#8A98A3' }} />
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

      {communicateTarget && (
        <CommunicateCriticalModal
          testName={communicateTarget.test.testName}
          patientName={communicateTarget.order.patientName}
          mrn={communicateTarget.order.mrn}
          criticalValueLabel={communicateTarget.test.criticalValueLabel}
          onClose={() => setCommunicateTarget(null)}
          onConfirm={handleCommunicateConfirm}
        />
      )}

      {reportTarget && (
        <CriticalResultReportModal
          patientName={reportTarget.order.patientName}
          mrn={reportTarget.order.mrn}
          test={reportTarget.test}
          onClose={() => setReportTarget(null)}
        />
      )}

      {commentTarget && (
        <AddLabCommentModal
          value={commentText}
          onChange={setCommentText}
          onClose={() => setCommentTarget(null)}
          onSave={handleSaveComment}
          placeholder="Add a note about this critical result…"
        />
      )}
    </div>
  );
}
