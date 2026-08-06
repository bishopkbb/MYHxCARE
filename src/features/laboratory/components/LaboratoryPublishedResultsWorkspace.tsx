'use client';

import {
  Award,
  Barcode,
  CalendarCheck,
  CalendarRange,
  FileText,
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
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatDateTime, formatTime, isSameDay, isToday } from '@/utils/datetime';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { useLabResults } from '@/features/laboratory/store/labResultStore';
import {
  deriveCollectionPoint,
  deriveSampleId,
  groupIntoOrders,
  orderSampleType,
  publishedTests,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';
import type { LabDepartment, LabResult } from '@/features/laboratory/__mocks__/labResultFixtures';

const PublishedReportModal = dynamic(
  () => import('./PublishedReportModal').then((m) => m.PublishedReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

const FLAG_STYLE: Record<'H' | 'L' | 'A' | 'CRIT', { background: string; color: string }> = {
  H: { background: 'rgba(239,68,68,0.12)', color: '#DC2626' },
  L: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
  A: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
  CRIT: { background: '#EF4444', color: '#FFFFFF' },
};

type Tab = 'All' | 'Critical';
const TABS: Tab[] = ['All', 'Critical'];

type QueueOrder = RawLabOrder & {
  published: LabResult[];
  hasCritical: boolean;
  publishedAt?: string;
};

function earliestOf(dates: (string | undefined)[]): string | undefined {
  let earliest: string | undefined;
  for (const d of dates) {
    if (!d) continue;
    if (!earliest || new Date(d).getTime() < new Date(earliest).getTime()) earliest = d;
  }
  return earliest;
}

function buildQueueOrder(raw: RawLabOrder): QueueOrder | undefined {
  const published = publishedTests(raw);
  if (published.length === 0) return undefined;
  const hasCritical = published.some((t) => t.flag === 'CRITICAL');
  const publishedAt = earliestOf(published.map((t) => t.doctorReviewedAt));
  return { ...raw, published, hasCritical, ...(publishedAt ? { publishedAt } : {}) };
}

function formatHrsMin(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function withinDays(iso: string, now: Date, days: number): boolean {
  const ms = now.getTime() - new Date(iso).getTime();
  return ms >= 0 && ms <= days * 24 * 60 * 60_000;
}

// ── Row action menu ──────────────────────────────────────────────────────────

function PublishedRowMenu({
  open,
  onToggle,
  onView,
  onPrint,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onPrint: () => void;
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
          View Full Report
        </button>
        <button
          type="button"
          onClick={onPrint}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Printer style={{ width: 15, height: 15, color: '#4A7080' }} />
          Print Report
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

export function LaboratoryPublishedResultsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const results = useLabResults();

  const [pageState, setPageState] = useState<PageState>('loaded');
  const [now] = useState(() => new Date());

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  const orders = useMemo<QueueOrder[]>(() => {
    const built: QueueOrder[] = [];
    for (const raw of groupIntoOrders(results)) {
      const order = buildQueueOrder(raw);
      if (order) built.push(order);
    }
    return built;
  }, [results]);

  // ── Stat cards — scanned across all results, not just the filtered page ──
  const publishedTodayCount = useMemo(
    () =>
      results.filter(
        (r) => r.status === 'VERIFIED' && r.doctorReviewedAt && isToday(r.doctorReviewedAt),
      ).length,
    [results],
  );
  const thisWeekCount = useMemo(
    () =>
      results.filter(
        (r) =>
          r.status === 'VERIFIED' && r.doctorReviewedAt && withinDays(r.doctorReviewedAt, now, 7),
      ).length,
    [results, now],
  );
  const thisMonthCount = useMemo(
    () =>
      results.filter(
        (r) =>
          r.status === 'VERIFIED' && r.doctorReviewedAt && withinDays(r.doctorReviewedAt, now, 30),
      ).length,
    [results, now],
  );
  const criticalReportedCount = useMemo(() => orders.filter((o) => o.hasCritical).length, [orders]);
  const avgTatPublishedLabel = useMemo(() => {
    const durations: number[] = [];
    for (const r of results) {
      if (r.status !== 'VERIFIED' || !r.doctorReviewedAt) continue;
      durations.push(new Date(r.doctorReviewedAt).getTime() - new Date(r.orderedAt).getTime());
    }
    if (durations.length === 0) return '—';
    return formatHrsMin(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }, [results]);

  // ── Filters / search / tabs / pagination ─────────────────────────────────
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [tab, setTab] = useState<Tab>('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [rowMenuOpenKey, setRowMenuOpenKey] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    orderId: string;
    patientName: string;
    mrn: string;
    tests: LabResult[];
  } | null>(null);

  const sampleTypeOptions = useMemo(
    () => Array.from(new Set(orders.map((o) => orderSampleType(o.published)))).sort(),
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
        if (!o.publishedAt) return false;
        if (filters.dateRange === 'TODAY') return isToday(o.publishedAt);
        if (filters.dateRange === 'YESTERDAY') {
          const y = new Date(now);
          y.setDate(y.getDate() - 1);
          return isSameDay(o.publishedAt, y);
        }
        return withinDays(o.publishedAt, now, 7);
      });
    }
    if (filters.department !== 'ALL') {
      list = list.filter((o) => o.published.some((t) => t.department === filters.department));
    }
    if (filters.sampleType !== 'ALL') {
      list = list.filter((o) => orderSampleType(o.published) === filters.sampleType);
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
    }),
    [preTabFiltered],
  );

  const filtered = useMemo(() => {
    switch (tab) {
      case 'All':
        return preTabFiltered;
      case 'Critical':
        return preTabFiltered.filter((o) => o.hasCritical);
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

  function openOrder(order: QueueOrder) {
    setSelectedGroupKey(order.groupKey);
  }

  function printReport(orderId: string, patientName: string, mrn: string, tests: LabResult[]) {
    const rowsHtml = tests
      .map((t) => {
        const rowLines = (t.rows ?? [])
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.parameter)}</td><td>${escapeHtml(r.value)}${r.unit ? ' ' + escapeHtml(r.unit) : ''}</td><td>${escapeHtml(r.reference)}</td><td>${escapeHtml(r.flag ?? '')}</td></tr>`,
          )
          .join('');
        return `<h1 style="font-size:16px;margin-top:16px;">${escapeHtml(t.testName)} — ${escapeHtml(t.department)}</h1><table><thead><tr><th>Parameter</th><th>Value</th><th>Reference</th><th>Flag</th></tr></thead><tbody>${rowLines}</tbody></table>${t.doctorReviewedAt ? `<p class="meta">Verified by ${escapeHtml(t.doctorReviewedBy ?? '—')} — ${escapeHtml(formatDateTime(t.doctorReviewedAt))}</p>` : ''}`;
      })
      .join('');
    downloadPDF(
      'Published Result Report',
      `<h1>Published Result Report</h1><p class="meta">${escapeHtml(orderId)} — ${escapeHtml(patientName)} · ${escapeHtml(mrn)}</p><hr/>${rowsHtml}`,
    );
    toast.success('Preparing report', 'Report opened in a new tab.');
  }

  function exportRowsAsCSV() {
    const header = [
      'Sample ID',
      'Order ID',
      'Patient',
      'MRN',
      'Tests',
      'Department',
      'Published At',
      'Verified By',
    ];
    const rows = filtered.map((o) => [
      deriveSampleId(o.groupKey, o.orderedAt),
      o.orderId,
      o.patientName,
      o.mrn,
      o.published.map((t) => t.testName).join('; '),
      Array.from(new Set(o.published.map((t) => t.department))).join('; '),
      o.publishedAt ? formatDateTime(o.publishedAt) : '—',
      o.published[0]?.doctorReviewedBy ?? '—',
    ]);
    downloadCSV('published-results', [header, ...rows]);
    toast.success('Export ready', 'CSV download started.');
  }

  function exportRowsAsPDF() {
    const rowsHtml = filtered
      .map(
        (o) =>
          `<tr><td>${escapeHtml(deriveSampleId(o.groupKey, o.orderedAt))}</td><td>${escapeHtml(o.orderId)}</td><td>${escapeHtml(o.patientName)}</td><td>${escapeHtml(o.published.map((t) => t.testName).join(', '))}</td><td>${o.publishedAt ? escapeHtml(formatDateTime(o.publishedAt)) : '—'}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'Published Results',
      `<h1>Published Results</h1><p class="meta">${escapeHtml(formatDateTime(now.toISOString()))} — ${filtered.length} published results</p><hr/><table><thead><tr><th>Sample ID</th><th>Order ID</th><th>Patient</th><th>Test(s)</th><th>Published At</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
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
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load Published Results
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
                Published Results
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                View and manage all published laboratory results.
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
              <ExportMenu
                onExportCSV={exportRowsAsCSV}
                onExportPDF={exportRowsAsPDF}
                variant="button"
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={Award}
              label="Published Today"
              value={publishedTodayCount}
              info="Verified since midnight (WAT)"
              accent="#16A34A"
              iconBg="rgba(34,197,94,0.12)"
            />
            <StatCard
              icon={CalendarRange}
              label="Results This Week"
              value={thisWeekCount}
              info="Verified in the last 7 days"
              accent="#00B4D8"
              iconBg="rgba(0,180,216,0.12)"
            />
            <StatCard
              icon={CalendarCheck}
              label="This Month"
              value={thisMonthCount}
              info="Verified in the last 30 days"
              accent="#8B5CF6"
              iconBg="rgba(139,92,246,0.12)"
            />
            <StatCard
              icon={ShieldAlert}
              label="Critical Results Reported"
              value={criticalReportedCount}
              info="Contains a critical flag"
              accent="#EF4444"
              iconBg="rgba(239,68,68,0.12)"
            />
            <StatCard
              icon={Timer}
              label="Avg TAT (Published)"
              value={avgTatPublishedLabel}
              info="Order to publish (hrs:min)"
              accent="#D97706"
              iconBg="rgba(245,158,11,0.12)"
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
                    {t === 'All' ? 'All Published' : 'Critical Results'} ({tabCounts[t]})
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                exportRowsAsPDF();
                toast.success('Preparing reports', 'Printable report opened in a new tab.');
              }}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Printer style={{ width: 15, height: 15 }} />
              Print Reports
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div
              className="min-w-0 flex-1 rounded-[12px] bg-white"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <ScrollableTable minWidth={1520} maxHeight={640}>
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
                    className="w-32 shrink-0 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Collected At
                  </div>
                  <div
                    className="w-32 shrink-0 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Published At
                  </div>
                  <div
                    className="w-36 shrink-0 py-3 pr-3 text-center font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Result Status
                  </div>
                  <div
                    className="w-40 shrink-0 py-3 pr-3 font-sans font-semibold"
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Verified By
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
                      <Award style={{ width: 24, height: 24, color: '#00B4D8' }} />
                    </div>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      No published results yet
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {hasActiveFilters
                        ? 'No results match your current filters.'
                        : 'Results appear here once a doctor verifies them.'}
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
                    const sampleId = deriveSampleId(order.groupKey, order.orderedAt);
                    const departments = Array.from(
                      new Set(order.published.map((t) => t.department)),
                    );
                    const departmentLabel = departments.length === 1 ? departments[0] : 'Multiple';
                    const testsLabel = order.published.map((t) => t.testName).join(', ');
                    const collectedAt = earliestOf(order.published.map((t) => t.sampleCollectedAt));
                    const verifiedBy = order.published[0]?.doctorReviewedBy ?? '—';
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
                        <div
                          className="w-32 shrink-0 py-3 pr-3"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {order.publishedAt ? (
                            <>
                              <p>{formatDate(order.publishedAt)}</p>
                              <p style={{ color: '#8A98A3' }}>{formatTime(order.publishedAt)}</p>
                            </>
                          ) : (
                            '—'
                          )}
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-3 text-center">
                          <span
                            className="rounded-full px-2.5 py-1 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: '#16A34A',
                              border: '1px solid rgba(34,197,94,0.4)',
                              background: 'rgba(34,197,94,0.08)',
                            }}
                          >
                            Published
                          </span>
                        </div>
                        <Tooltip content={verifiedBy}>
                          <div
                            className="w-40 shrink-0 truncate py-3 pr-3"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {verifiedBy}
                          </div>
                        </Tooltip>
                        <div
                          className="flex w-16 shrink-0 items-center justify-end pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PublishedRowMenu
                            open={rowMenuOpenKey === order.groupKey}
                            onToggle={() =>
                              setRowMenuOpenKey((k) =>
                                k === order.groupKey ? null : order.groupKey,
                              )
                            }
                            onView={() => {
                              openOrder(order);
                              setRowMenuOpenKey(null);
                              setReportTarget({
                                orderId: order.orderId,
                                patientName: order.patientName,
                                mrn: order.mrn,
                                tests: order.published,
                              });
                            }}
                            onPrint={() => {
                              setRowMenuOpenKey(null);
                              printReport(
                                order.orderId,
                                order.patientName,
                                order.mrn,
                                order.published,
                              );
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

            {/* ── Right rail: Result Summary ─────────────────────────────── */}
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
                      Result Summary
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
                    <span
                      className="rounded-full px-2 py-0.5 font-sans font-semibold"
                      style={{ fontSize: 13, background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}
                    >
                      Published
                    </span>
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
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Ordered By</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {selectedOrder.orderedBy}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Order Date / Time</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {formatDateTime(selectedOrder.orderedAt)}
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
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>Sample Type</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {orderSampleType(selectedOrder.published)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Test Results ({selectedOrder.published.length})
                    </p>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {selectedOrder.published.map((t, i) => (
                        <div key={t.id} className="flex items-center justify-between gap-2 py-1">
                          <Tooltip content={t.testName}>
                            <span
                              className="min-w-0 flex-1 truncate"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {i + 1}. {t.testName}
                            </span>
                          </Tooltip>
                          {t.flag === 'CRITICAL' && (
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 font-sans font-semibold"
                              style={{ fontSize: 13, ...FLAG_STYLE.CRIT }}
                            >
                              CRIT
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setReportTarget({
                                orderId: selectedOrder.orderId,
                                patientName: selectedOrder.patientName,
                                mrn: selectedOrder.mrn,
                                tests: [t],
                              })
                            }
                            className={`shrink-0 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3.5 rounded-[10px] p-3.5" style={{ background: '#F5FBFD' }}>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Verification Information
                    </p>
                    <div
                      className="mt-1.5 flex flex-col divide-y"
                      style={{ borderColor: 'rgba(0,100,130,0.1)' }}
                    >
                      <div className="flex items-center justify-between py-1.5">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Verified By</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selectedOrder.published[0]?.doctorReviewedBy ?? '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Verified At</span>
                        <span
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selectedOrder.publishedAt
                            ? formatDateTime(selectedOrder.publishedAt)
                            : '—'}
                        </span>
                      </div>
                      {selectedOrder.published[0]?.comment && (
                        <div className="py-1.5">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>Verification Note</span>
                          <p className="mt-0.5" style={{ fontSize: 14, color: '#0D2630' }}>
                            {selectedOrder.published[0].comment}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setReportTarget({
                        orderId: selectedOrder.orderId,
                        patientName: selectedOrder.patientName,
                        mrn: selectedOrder.mrn,
                        tests: selectedOrder.published,
                      })
                    }
                    className={`mt-3.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <FileText style={{ width: 15, height: 15 }} />
                    View Full Report
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printReport(
                        selectedOrder.orderId,
                        selectedOrder.patientName,
                        selectedOrder.mrn,
                        selectedOrder.published,
                      )
                    }
                    className={`mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#0D2630' }}
                  >
                    <Printer style={{ width: 15, height: 15 }} />
                    Print Report
                  </button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-[12px] bg-white px-4 py-14 text-center"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <Award style={{ width: 28, height: 28, color: '#8A98A3' }} />
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

      {reportTarget && (
        <PublishedReportModal
          orderId={reportTarget.orderId}
          patientName={reportTarget.patientName}
          mrn={reportTarget.mrn}
          tests={reportTarget.tests}
          onClose={() => setReportTarget(null)}
          onPrint={() =>
            printReport(
              reportTarget.orderId,
              reportTarget.patientName,
              reportTarget.mrn,
              reportTarget.tests,
            )
          }
        />
      )}
    </div>
  );
}
