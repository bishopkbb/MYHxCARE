'use client';

import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  MoreVertical,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  TestTube2,
  X,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ExportMenu } from '@components/ExportMenu';
import { FilterDropdown } from '@components/shared/FilterDropdown';
import { Pagination } from '@components/shared/Pagination';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { formatDate, formatDateTime, formatTime, isSameDay, isToday } from '@/utils/datetime';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { useLabResults } from '@/features/laboratory/store/labResultStore';
import {
  deriveCollectionPoint,
  deriveCurrentLocation,
  deriveSampleId,
  deriveTrackingStage,
  groupIntoOrders,
  orderSampleType,
  type RawLabOrder,
  type TrackingStage,
} from '@/features/laboratory/utils/labOrders';
import type { LabDepartment } from '@/features/laboratory/__mocks__/labResultFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

type SampleOrder = RawLabOrder & {
  stage: TrackingStage;
  location: string;
  lastUpdated?: string;
};

function deriveLastUpdated(order: RawLabOrder): string | undefined {
  let max: string | undefined;
  for (const t of order.tests) {
    for (const ts of [
      t.sampleCollectedAt,
      t.receivedAt,
      t.resultAt,
      t.doctorReviewedAt,
      t.rejectedAt,
    ]) {
      if (!ts) continue;
      if (!max || new Date(ts).getTime() > new Date(max).getTime()) max = ts;
    }
  }
  return max;
}

function buildTrackingOrder(raw: RawLabOrder, nowMs: number): SampleOrder | undefined {
  const stage = deriveTrackingStage(raw, nowMs);
  if (!stage) return undefined;
  const location = deriveCurrentLocation(raw, stage);
  const lastUpdated = deriveLastUpdated(raw);
  return { ...raw, stage, location, ...(lastUpdated ? { lastUpdated } : {}) };
}

// ── Config ─────────────────────────────────────────────────────────────────

const STAGES: TrackingStage[] = [
  'Collected',
  'Received',
  'In Analysis',
  'Awaiting Verification',
  'Published',
  'Rejected',
];

const TABS: ('All Samples' | TrackingStage)[] = ['All Samples', ...STAGES];

const STAGE_CFG: Record<TrackingStage, { color: string; border: string; bg: string }> = {
  Collected: { color: '#8B5CF6', border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.08)' },
  Received: { color: '#3B82F6', border: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.08)' },
  'In Analysis': { color: '#D97706', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  'Awaiting Verification': {
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.4)',
    bg: 'rgba(0,180,216,0.08)',
  },
  Published: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  Rejected: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
};

const STAGE_ICON: Record<TrackingStage, LucideIcon> = {
  Collected: TestTube2,
  Received: PackageCheck,
  'In Analysis': FlaskConical,
  'Awaiting Verification': ClipboardList,
  Published: CheckCircle2,
  Rejected: XCircle,
};

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

type FilterKey = 'dateRange' | 'department' | 'sampleType';
type FilterState = Record<FilterKey, string>;
const FILTER_DEFAULTS: FilterState = { dateRange: 'ALL', department: 'ALL', sampleType: 'ALL' };

const TIMELINE_STEPS: TrackingStage[] = [
  'Collected',
  'Received',
  'In Analysis',
  'Awaiting Verification',
  'Published',
];

// ── Export ─────────────────────────────────────────────────────────────────

function exportOrdersAsCSV(orders: SampleOrder[]) {
  downloadCSV('sample-tracking', [
    [
      'Sample ID',
      'Order ID',
      'Patient',
      'MRN',
      'Test(s)',
      'Sample Type',
      'Status',
      'Location',
      'Last Updated',
    ],
    ...orders.map((o) => [
      deriveSampleId(o.groupKey, o.orderedAt),
      o.orderId,
      o.patientName,
      o.mrn,
      o.tests.map((t) => t.testName).join('; '),
      orderSampleType(o.tests),
      o.stage,
      o.location,
      o.lastUpdated ? formatDateTime(o.lastUpdated) : '—',
    ]),
  ]);
}

function exportOrdersAsPDF(orders: SampleOrder[]) {
  const body = `
    <h1>Sample Tracking Report</h1>
    <p class="meta">${orders.length} specimen${orders.length === 1 ? '' : 's'}</p>
    <table>
      <thead><tr><th>Sample ID</th><th>Order ID</th><th>Patient</th><th>MRN</th><th>Sample Type</th><th>Status</th><th>Location</th></tr></thead>
      <tbody>
        ${orders
          .map(
            (o) =>
              `<tr><td>${escapeHtml(deriveSampleId(o.groupKey, o.orderedAt))}</td><td>${escapeHtml(o.orderId)}</td><td>${escapeHtml(o.patientName)}</td><td>${escapeHtml(o.mrn)}</td><td>${escapeHtml(orderSampleType(o.tests))}</td><td>${escapeHtml(o.stage)}</td><td>${escapeHtml(o.location)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
  downloadPDF('sample-tracking-report', body);
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
      <p>Order: ${escapeHtml(o.orderId)}</p>
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
      <div className="h-3.5 w-24 shrink-0 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-32 shrink-0 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 flex-1 animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-20 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

// ── Row action menu ──────────────────────────────────────────────────────────

function TrackingRowMenu({
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
          <ClipboardList style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View Details
        </button>
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

export function LaboratorySampleTrackingWorkspace() {
  const router = useRouter();
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
    const built: SampleOrder[] = [];
    for (const raw of groupIntoOrders(results)) {
      const order = buildTrackingOrder(raw, nowMs);
      if (order) built.push(order);
    }
    return built;
  }, [results, now]);

  // ── Stat cards — always over the full, unfiltered order set ─────────────
  const stageCounts = useMemo(() => {
    const counts = {} as Record<TrackingStage, number>;
    for (const s of STAGES) counts[s] = 0;
    for (const o of orders) counts[o.stage] += 1;
    return counts;
  }, [orders]);

  // ── Filters / search / tabs / pagination ─────────────────────────────────
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [tab, setTab] = useState<'All Samples' | TrackingStage>('All Samples');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [rowMenuOpenKey, setRowMenuOpenKey] = useState<string | null>(null);

  const sampleTypeOptions = useMemo(
    () =>
      Array.from(new Set(orders.map((o) => orderSampleType(o.tests))))
        .sort()
        .map((t) => ({ value: t, label: t })),
    [orders],
  );

  const filterDefs = useMemo(
    () => [
      { key: 'dateRange' as const, defaultLabel: 'All Time', options: DATE_RANGE_OPTIONS },
      { key: 'department' as const, defaultLabel: 'All Departments', options: DEPARTMENT_OPTIONS },
      { key: 'sampleType' as const, defaultLabel: 'All Sample Types', options: sampleTypeOptions },
    ],
    [sampleTypeOptions],
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
    if (filters.sampleType !== 'ALL') {
      list = list.filter((o) => orderSampleType(o.tests) === filters.sampleType);
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

  const tabCounts = useMemo(() => {
    const counts = { 'All Samples': preTabFiltered.length } as Record<
      'All Samples' | TrackingStage,
      number
    >;
    for (const s of STAGES) counts[s] = 0;
    for (const o of preTabFiltered) counts[o.stage] += 1;
    return counts;
  }, [preTabFiltered]);

  const filtered = useMemo(
    () => (tab === 'All Samples' ? preTabFiltered : preTabFiltered.filter((o) => o.stage === tab)),
    [preTabFiltered, tab],
  );

  const hasActiveFilters = search !== '' || Object.values(filters).some((v) => v !== 'ALL');

  function clearFilters() {
    setSearch('');
    setFilters(FILTER_DEFAULTS);
    setPage(1);
  }

  function selectTab(next: 'All Samples' | TrackingStage) {
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
                Failed to load the tracking board
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
                Sample Tracking
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Track specimen movement and current status in real-time
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
                variant="button"
                label="Export Tracking Report"
                onExportPDF={() => exportOrdersAsPDF(filtered)}
                onExportCSV={() => exportOrdersAsCSV(filtered)}
              />
            </div>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {pageState === 'loading' ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
            ) : (
              <>
                <StatCard
                  icon={TestTube2}
                  label="Collected"
                  value={stageCounts.Collected}
                  info="At or near the draw site"
                  accent="#8B5CF6"
                  iconBg="rgba(139,92,246,0.1)"
                />
                <StatCard
                  icon={PackageCheck}
                  label="Received"
                  value={stageCounts.Received}
                  info="Logged in, not yet started"
                  accent="#3B82F6"
                  iconBg="rgba(59,130,246,0.1)"
                />
                <StatCard
                  icon={FlaskConical}
                  label="In Analysis"
                  value={stageCounts['In Analysis']}
                  info="Being processed at the bench"
                  accent="#D97706"
                  iconBg="rgba(245,158,11,0.1)"
                />
                <StatCard
                  icon={ClipboardList}
                  label="Awaiting Verification"
                  value={stageCounts['Awaiting Verification']}
                  info="Resulted, pending sign-off"
                  accent="#00B4D8"
                  iconBg="rgba(0,180,216,0.1)"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Published"
                  value={stageCounts.Published}
                  info="Verified and released"
                  accent="#16A34A"
                  iconBg="rgba(22,163,74,0.1)"
                />
                <StatCard
                  icon={XCircle}
                  label="Rejected"
                  value={stageCounts.Rejected}
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

              {/* ── Tabs + print ────────────────────────────────────────────── */}
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

              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                {/* ── List pane ─────────────────────────────────────────────── */}
                <div className={`min-w-0 flex-1 ${selectedOrder ? 'hidden xl:block' : 'block'}`}>
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="overflow-x-auto scroll-smooth">
                      <div className="min-w-[1500px]">
                        <div
                          className="flex items-center rounded-t-[8px]"
                          style={{
                            background: 'rgba(226,237,241,0.4)',
                            borderBottom: '1px solid #E6F8FD',
                          }}
                        >
                          {[
                            ['Sample ID', 'w-48', 'left'],
                            ['Order ID', 'w-44', 'left'],
                            ['Patient', 'w-44', 'left'],
                            ['Test(s)', 'min-w-[160px] flex-1', 'left'],
                            ['Sample Type', 'w-40', 'left'],
                            ['Current Status', 'w-52', 'center'],
                            ['Current Location', 'w-40', 'left'],
                            ['Last Updated', 'w-32', 'left'],
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
                          const stageCfg = STAGE_CFG[order.stage];
                          const sampleId = deriveSampleId(order.groupKey, order.orderedAt);
                          const sampleType = orderSampleType(order.tests);
                          const testsLabel =
                            order.tests.length === 1
                              ? order.tests[0]!.testName
                              : `${order.tests.length} tests`;
                          const testsTooltip = order.tests.map((t) => t.testName).join(', ');

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
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#00B4D8' }}
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
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#8A98A3' }}
                                  >
                                    {order.mrn}
                                  </p>
                                </Tooltip>
                              </div>
                              <div className="min-w-[160px] flex-1 py-3 pr-2">
                                <Tooltip content={testsTooltip}>
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {testsLabel}
                                  </p>
                                </Tooltip>
                              </div>
                              <div className="w-40 shrink-0 py-3 pr-2">
                                <Tooltip content={sampleType}>
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {sampleType}
                                  </p>
                                </Tooltip>
                              </div>
                              <div className="w-52 shrink-0 py-3 pr-2 text-center">
                                <span
                                  className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                                  style={{
                                    fontSize: 14,
                                    color: stageCfg.color,
                                    border: `1px solid ${stageCfg.border}`,
                                    background: stageCfg.bg,
                                  }}
                                >
                                  {order.stage}
                                </span>
                              </div>
                              <div className="w-40 shrink-0 py-3 pr-2">
                                <Tooltip content={order.location}>
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {order.location}
                                  </p>
                                </Tooltip>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2">
                                {order.lastUpdated ? (
                                  <>
                                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                                      {formatDate(order.lastUpdated)}
                                    </p>
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {formatTime(order.lastUpdated)}
                                    </p>
                                  </>
                                ) : (
                                  <p style={{ fontSize: 14, color: '#8A98A3' }}>—</p>
                                )}
                              </div>
                              <div
                                className="flex w-14 shrink-0 items-center justify-end py-3 pr-3"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <TrackingRowMenu
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
                                  onPrint={() => {
                                    setRowMenuOpenKey(null);
                                    printLabels([order]);
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

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
                            color: STAGE_CFG[selectedOrder.stage].color,
                            border: `1px solid ${STAGE_CFG[selectedOrder.stage].border}`,
                            background: STAGE_CFG[selectedOrder.stage].bg,
                          }}
                        >
                          {selectedOrder.stage}
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

                      {/* Sample Information */}
                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Sample Information
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          {[
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
                        </div>
                      </div>

                      {/* Tracking Timeline */}
                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Tracking Timeline
                        </p>
                        <div className="mt-3 flex flex-col">
                          {(() => {
                            const stageRank = TIMELINE_STEPS.indexOf(
                              selectedOrder.stage === 'Rejected'
                                ? 'Collected'
                                : selectedOrder.stage,
                            );
                            const currentRank = selectedOrder.stage === 'Rejected' ? -1 : stageRank;
                            const collectedTest = selectedOrder.tests.find(
                              (t) => t.sampleCollectedAt,
                            );
                            const receivedTest = selectedOrder.tests.find((t) => t.receivedAt);
                            const resultedTest = selectedOrder.tests.find((t) => t.resultAt);
                            const publishedTest = selectedOrder.tests.find(
                              (t) => t.status === 'VERIFIED' && t.doctorReviewedAt,
                            );
                            const rejectedTest = selectedOrder.tests.find(
                              (t) => t.status === 'REJECTED',
                            );

                            const stepDetail: Record<
                              TrackingStage,
                              { time?: string; sub?: string }
                            > = {
                              Collected: {
                                ...(collectedTest?.sampleCollectedAt
                                  ? { time: formatDateTime(collectedTest.sampleCollectedAt) }
                                  : {}),
                                sub:
                                  collectedTest?.sampleCollectedBy ??
                                  deriveCollectionPoint(selectedOrder),
                              },
                              Received: {
                                ...(receivedTest?.receivedAt
                                  ? { time: formatDateTime(receivedTest.receivedAt) }
                                  : {}),
                                sub: 'Sample Reception',
                              },
                              'In Analysis': {
                                sub: deriveCurrentLocation(selectedOrder, 'In Analysis'),
                              },
                              'Awaiting Verification': {
                                ...(resultedTest?.resultAt
                                  ? { time: formatDateTime(resultedTest.resultAt) }
                                  : {}),
                                sub: 'Result Verification',
                              },
                              Published: {
                                ...(publishedTest?.doctorReviewedAt
                                  ? { time: formatDateTime(publishedTest.doctorReviewedAt) }
                                  : {}),
                                ...(publishedTest?.doctorReviewedBy
                                  ? { sub: publishedTest.doctorReviewedBy }
                                  : {}),
                              },
                              Rejected: {},
                            };

                            return TIMELINE_STEPS.map((step, i) => {
                              const Icon = STAGE_ICON[step];
                              const done = i < currentRank || selectedOrder.stage === 'Published';
                              const active =
                                i === currentRank && selectedOrder.stage !== 'Rejected';
                              const detail = stepDetail[step];
                              const isErrorPoint = selectedOrder.stage === 'Rejected' && i === 1;

                              return (
                                <div key={step} className="flex items-start gap-3">
                                  <div className="flex flex-col items-center">
                                    <div
                                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                                      style={{
                                        background: isErrorPoint
                                          ? 'rgba(239,68,68,0.12)'
                                          : done || active
                                            ? '#00B4D8'
                                            : 'rgba(0,100,130,0.08)',
                                      }}
                                    >
                                      {isErrorPoint ? (
                                        <XCircle
                                          style={{ width: 15, height: 15, color: '#EF4444' }}
                                        />
                                      ) : (
                                        <Icon
                                          style={{
                                            width: 14,
                                            height: 14,
                                            color: done || active ? '#FFFFFF' : '#8A98A3',
                                          }}
                                        />
                                      )}
                                    </div>
                                    {i < TIMELINE_STEPS.length - 1 && (
                                      <div
                                        className="my-0.5 w-px flex-1"
                                        style={{
                                          minHeight: 24,
                                          background: 'rgba(0,100,130,0.15)',
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1 pb-4">
                                    <p
                                      className="font-sans font-semibold"
                                      style={{
                                        fontSize: 14,
                                        color: isErrorPoint ? '#EF4444' : '#0D2630',
                                      }}
                                    >
                                      {step}
                                    </p>
                                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                      {detail.time ?? '—'}
                                    </p>
                                    {detail.sub && (
                                      <p style={{ fontSize: 14, color: '#4A7080' }}>{detail.sub}</p>
                                    )}
                                    {isErrorPoint && rejectedTest?.rejectionReason && (
                                      <p
                                        className="mt-0.5"
                                        style={{ fontSize: 14, color: '#EF4444' }}
                                      >
                                        {rejectedTest.rejectionReason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 p-4 pt-0 sm:p-5 sm:pt-0">
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
    </div>
  );
}
