'use client';

import {
  AlertTriangle,
  Calendar,
  Download,
  Droplet,
  Eye,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Printer,
  Search,
  User as UserIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { ExportMenu } from '@/components/ExportMenu';
import { FilterDropdown } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatDateTime, formatHumanDate } from '@/utils/datetime';
import {
  getPatientDetail,
  resolvePatientIdByMrn,
} from '@/features/patients/__mocks__/patientFixtures';
import { useLabResults } from '@/features/laboratory/store/labResultStore';
import { groupIntoOrders, type RawLabOrder } from '@/features/laboratory/utils/labOrders';
import type { LabDepartment, LabResult } from '@/features/laboratory/__mocks__/labResultFixtures';

const PublishedReportModal = dynamic(
  () => import('./PublishedReportModal').then((m) => m.PublishedReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// ── History's own 3-state taxonomy — layered on the same shared RawLabOrder
// grouping every other Lab screen reads (see labOrders.ts's own doc comment:
// each screen derives its own taxonomy from the same raw grouping). This is
// deliberately simpler than Laboratory Orders' 6-state workflow taxonomy —
// History is a completed-visit audit log, not an active work queue. ────────

type HistoryStatus = 'Completed' | 'Pending' | 'Cancelled';

function deriveHistoryStatus(tests: LabResult[]): HistoryStatus {
  if (tests.every((t) => t.status === 'REJECTED')) return 'Cancelled';
  if (tests.every((t) => t.status === 'VERIFIED')) return 'Completed';
  return 'Pending';
}

const STATUS_CFG: Record<HistoryStatus, { color: string; border: string; bg: string }> = {
  Completed: { color: '#16A34A', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
  Pending: { color: '#B45309', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Cancelled: { color: '#DC2626', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
};

const TABS: { key: 'ALL' | HistoryStatus; label: string }[] = [
  { key: 'ALL', label: 'All Orders' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Cancelled', label: 'Cancelled' },
];

const DEPARTMENTS: LabDepartment[] = [
  'Hematology',
  'Biochemistry',
  'Microbiology',
  'Immunology',
  'Coagulation',
];

type FilterKey = 'dateRange' | 'status' | 'department';
type FilterState = { dateRange: string; status: string; department: string };
const FILTER_DEFAULTS: FilterState = { dateRange: 'ALL', status: 'ALL', department: 'ALL' };

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
      { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
    ],
  },
  {
    key: 'status',
    defaultLabel: 'All Status',
    options: [
      { value: 'Completed', label: 'Completed' },
      { value: 'Pending', label: 'Pending' },
      { value: 'Cancelled', label: 'Cancelled' },
    ],
  },
  {
    key: 'department',
    defaultLabel: 'All Departments',
    options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
  },
];

function dateRangeCutoff(range: string): number | null {
  const now = new Date();
  if (range === 'TODAY') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (range === 'YESTERDAY') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  }
  if (range === 'LAST_7_DAYS') return now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (range === 'LAST_30_DAYS') return now.getTime() - 30 * 24 * 60 * 60 * 1000;
  return null;
}

function orderDepartment(order: RawLabOrder): string {
  const depts = new Set(order.tests.map((t) => t.department));
  return depts.size === 1 ? [...depts][0]! : 'Multiple';
}

function orderTestsSummary(order: RawLabOrder): string {
  return order.tests.map((t) => t.testName).join(', ');
}

/** Earliest sample collection among the order's tests — usually one draw
 * covers every test on a requisition, so the first test's timestamp is
 * representative; falls back honestly to undefined (rendered "—") rather
 * than fabricating a collection time no test actually recorded. */
function orderCollectedAt(order: RawLabOrder): string | undefined {
  return order.tests.find((t) => t.sampleCollectedAt)?.sampleCollectedAt;
}

/** Latest result timestamp among the order's tests — matches
 * LaboratoryOrdersWorkspace's own `maxResultAt` derivation for consistency. */
function orderReportedAt(order: RawLabOrder): string | undefined {
  return order.tests.reduce<string | undefined>((max, t) => {
    if (!t.resultAt) return max;
    if (!max || new Date(t.resultAt).getTime() > new Date(max).getTime()) return t.resultAt;
    return max;
  }, undefined);
}

type PatientOption = { mrn: string; patientName: string; patientId?: string; lastOrderAt: string };

function SkeletonRow() {
  return (
    <div
      className="flex min-h-[56px] animate-pulse items-center px-3"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="w-[14%] py-3 pr-3">
        <div className="h-4 w-24 rounded bg-slate-100" />
      </div>
      <div className="w-[13%] py-3 pr-3">
        <div className="h-4 w-20 rounded bg-slate-100" />
      </div>
      <div className="w-[12%] py-3 pr-3">
        <div className="h-4 w-20 rounded bg-slate-100" />
      </div>
      <div className="min-w-0 flex-1 py-3 pr-3">
        <div className="h-4 w-40 rounded bg-slate-100" />
      </div>
      <div className="w-24 shrink-0 py-3 pr-3">
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="w-[13%] py-3 pr-3">
        <div className="h-4 w-24 rounded bg-slate-100" />
      </div>
      <div className="w-[13%] py-3 pr-3">
        <div className="h-4 w-24 rounded bg-slate-100" />
      </div>
      <div className="w-20 shrink-0 py-3 pr-3">
        <div className="h-6 w-12 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[10px] p-3" style={{ background: bg }}>
      <p style={{ fontSize: 14, color: '#4A7080' }}>{label}</p>
      <p className="font-display font-bold" style={{ fontSize: 22, color }}>
        {value}
      </p>
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon style={{ width: 14, height: 14, color: '#8A98A3', marginTop: 3, flexShrink: 0 }} />
      <div className="min-w-0">
        <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
        <Tooltip content={value}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {value}
          </p>
        </Tooltip>
      </div>
    </div>
  );
}

export function LaboratoryHistoryWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const results = useLabResults();
  const allOrders = useMemo(() => groupIntoOrders(results), [results]);

  const [pageState, setPageState] = useState<'loading' | 'loaded'>('loading');
  const [selectedMrn, setSelectedMrn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'ALL' | HistoryStatus>('ALL');
  const [filters, setFilters] = useState<FilterState>(FILTER_DEFAULTS);
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<RawLabOrder | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 600);
    return () => clearTimeout(t);
  }, []);

  // Read `?mrn=`/`?patientId=` via window.location.search in an effect (same
  // convention as Patient Card Printing's `?prefill=` handoff and
  // Registration's Patient Profile fix) rather than `useSearchParams()`,
  // which would opt this route out of static optimization unless wrapped in
  // a Suspense boundary. Lets a future "View Lab History" link elsewhere
  // deep-link straight past the search step below.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const mrnParam = params.get('mrn');
      const patientIdParam = params.get('patientId');
      if (mrnParam) {
        setSelectedMrn(mrnParam);
      } else if (patientIdParam) {
        const match = allOrders.find((o) => o.patientId === patientIdParam);
        if (match) setSelectedMrn(match.mrn);
      }
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL read is one-time on mount; allOrders is intentionally excluded
  }, []);

  useEffect(() => {
    if (!openFilter) return;
    function onMouseDown(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [openFilter]);

  // ── Step 1: patient universe for the search-and-select entry point ──────
  const patientOptions = useMemo<PatientOption[]>(() => {
    const byMrn = new Map<string, PatientOption>();
    for (const order of allOrders) {
      const existing = byMrn.get(order.mrn);
      if (!existing || new Date(order.orderedAt) > new Date(existing.lastOrderAt)) {
        byMrn.set(order.mrn, {
          mrn: order.mrn,
          patientName: order.patientName,
          ...(order.patientId ? { patientId: order.patientId } : {}),
          lastOrderAt: order.orderedAt,
        });
      }
    }
    return Array.from(byMrn.values()).sort(
      (a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime(),
    );
  }, [allOrders]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patientOptions.slice(0, 20);
    return patientOptions
      .filter((p) => p.patientName.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q))
      .slice(0, 20);
  }, [patientOptions, searchQuery]);

  // ── Step 2: selected patient's full history ──────────────────────────────
  const patientOrders = useMemo(
    () => (selectedMrn ? allOrders.filter((o) => o.mrn === selectedMrn) : []),
    [allOrders, selectedMrn],
  );

  const resolvedPatientId = useMemo(() => {
    const fromOrder = patientOrders.find((o) => o.patientId)?.patientId;
    if (fromOrder) return fromOrder;
    return selectedMrn ? resolvePatientIdByMrn(selectedMrn) : null;
  }, [patientOrders, selectedMrn]);

  const patientDetail = useMemo(
    () => (resolvedPatientId ? getPatientDetail(resolvedPatientId) : null),
    [resolvedPatientId],
  );

  const entries = useMemo(
    () =>
      patientOrders.map((order) => ({
        order,
        status: deriveHistoryStatus(order.tests),
        collectedAt: orderCollectedAt(order),
        reportedAt: orderReportedAt(order),
      })),
    [patientOrders],
  );

  const stats = useMemo(
    () => ({
      total: entries.length,
      completed: entries.filter((e) => e.status === 'Completed').length,
      pending: entries.filter((e) => e.status === 'Pending').length,
      cancelled: entries.filter((e) => e.status === 'Cancelled').length,
    }),
    [entries],
  );

  const recentTests = useMemo(() => {
    return entries
      .flatMap((e) => e.order.tests.map((t) => ({ test: t, order: e.order })))
      .sort(
        (a, b) =>
          new Date(b.test.resultAt ?? b.test.orderedAt).getTime() -
          new Date(a.test.resultAt ?? a.test.orderedAt).getTime(),
      )
      .slice(0, 5);
  }, [entries]);

  const filtered = useMemo(() => {
    const cutoff = dateRangeCutoff(filters.dateRange);
    return entries.filter((e) => {
      if (tab !== 'ALL' && e.status !== tab) return false;
      if (filters.status !== 'ALL' && e.status !== filters.status) return false;
      if (filters.department !== 'ALL' && orderDepartment(e.order) !== filters.department) {
        return false;
      }
      if (cutoff !== null && new Date(e.order.orderedAt).getTime() < cutoff) return false;
      return true;
    });
  }, [entries, tab, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginated = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const rowMenuButtonRefs = useMemo(() => {
    const map = new Map<string, RefObject<HTMLButtonElement | null>>();
    for (const { order } of paginated) map.set(order.orderId, { current: null });
    return map;
  }, [paginated]);

  function getRowMenuButtonRef(id: string) {
    return rowMenuButtonRefs.get(id) ?? { current: null };
  }

  function setFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOpenFilter(null);
    setPage(1);
  }

  function resetFilters() {
    setFilters(FILTER_DEFAULTS);
    setTab('ALL');
    setPage(1);
  }

  function handleSelectPatient(option: PatientOption) {
    setSelectedMrn(option.mrn);
    setSearchQuery('');
    resetFilters();
  }

  function handleChangePatient() {
    setSelectedMrn(null);
    setSearchQuery('');
    resetFilters();
  }

  function printReport(order: RawLabOrder) {
    const rowsHtml = order.tests
      .map((t) => {
        const rowLines = (t.rows ?? [])
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.parameter)}</td><td>${escapeHtml(r.value)}${r.unit ? ' ' + escapeHtml(r.unit) : ''}</td><td>${escapeHtml(r.reference)}</td><td>${escapeHtml(r.flag ?? '')}</td></tr>`,
          )
          .join('');
        return `<h1 style="font-size:16px;margin-top:16px;">${escapeHtml(t.testName)} — ${escapeHtml(t.department)}</h1><table><thead><tr><th>Parameter</th><th>Value</th><th>Reference</th><th>Flag</th></tr></thead><tbody>${rowLines}</tbody></table>`;
      })
      .join('');
    downloadPDF(
      'Laboratory History Report',
      `<h1>Laboratory History Report</h1><p class="meta">${escapeHtml(order.orderId)} — ${escapeHtml(order.patientName)} · ${escapeHtml(order.mrn)}</p><hr/>${rowsHtml}`,
    );
    toast.success('Preparing report', 'Report opened in a new tab.');
  }

  function printHistory() {
    const rows = filtered
      .map(
        (e) =>
          `<tr><td>${escapeHtml(e.order.orderId)}</td><td>${escapeHtml(formatDateTime(e.order.orderedAt))}</td><td>${escapeHtml(orderDepartment(e.order))}</td><td>${escapeHtml(orderTestsSummary(e.order))}</td><td>${escapeHtml(e.status)}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'Laboratory History',
      `<h1>Laboratory History</h1><p class="meta">${escapeHtml(patientDetail?.name ?? patientOrders[0]?.patientName ?? '')} · ${escapeHtml(selectedMrn ?? '')} — ${filtered.length} order${filtered.length === 1 ? '' : 's'}</p><hr/><table><thead><tr><th>Order ID</th><th>Order Date</th><th>Department</th><th>Tests</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
    toast.success('Preparing history', 'Report opened in a new tab.');
  }

  function exportAsCSV() {
    downloadCSV('laboratory-history', [
      [
        'Order ID',
        'Order Date',
        'Department',
        'Tests',
        'Status',
        'Collected On',
        'Result Reported On',
      ],
      ...filtered.map((e) => [
        e.order.orderId,
        formatDateTime(e.order.orderedAt),
        orderDepartment(e.order),
        orderTestsSummary(e.order),
        e.status,
        e.collectedAt ? formatDateTime(e.collectedAt) : '—',
        e.reportedAt ? formatDateTime(e.reportedAt) : '—',
      ]),
    ]);
  }

  const hasActiveFilters =
    filters.dateRange !== 'ALL' || filters.status !== 'ALL' || filters.department !== 'ALL';

  // ── Step 1: search & select ──────────────────────────────────────────────
  if (!selectedMrn) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
          <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-10 sm:px-6">
            <div className="text-center">
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Laboratory History
              </h1>
              <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                Search for a patient to view all their laboratory orders and results.
              </p>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div
                className="flex h-11 items-center gap-2.5 rounded-[10px] px-3.5"
                style={{ border: '1px solid #0064821F', background: '#FFFFFF' }}
              >
                <Search style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by patient name or MRN…"
                  className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#0D2630' }}
                />
              </div>

              <div className="mt-4 flex flex-col">
                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
                    <div
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(226,237,241,0.6)' }}
                    >
                      <UserIcon style={{ width: 28, height: 28, color: '#8A98A3' }} />
                    </div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      No patients match this search
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>Try a different name or MRN.</p>
                  </div>
                ) : (
                  searchResults.map((p) => (
                    <button
                      key={p.mrn}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className={`flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="min-w-0">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {p.patientName}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{p.mrn}</p>
                      </div>
                      <p className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Last order {formatHumanDate(p.lastOrderAt)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Step 2: full history for the selected patient ────────────────────────
  const displayName = patientDetail?.name ?? patientOrders[0]?.patientName ?? selectedMrn;
  const displayGender = patientDetail?.gender ?? patientOrders[0]?.gender ?? '—';
  const displayAge = patientDetail?.age ?? '—';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.laboratory)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Home
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <button
              type="button"
              onClick={handleChangePatient}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Patient Records
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Laboratory History
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Laboratory History
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                View all laboratory orders and results for the selected patient.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleChangePatient}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Search style={{ width: 15, height: 15 }} />
                Change Patient
              </button>
              <button
                type="button"
                onClick={printHistory}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print History
              </button>
              <ExportMenu variant="button" onExportPDF={printHistory} onExportCSV={exportAsCSV} />
            </div>
          </div>

          {/* ── Patient identity banner ─────────────────────────────────── */}
          <div
            className="mt-5 flex flex-wrap items-start gap-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div
              className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ background: '#E2EDF1' }}
            >
              <UserIcon style={{ width: 28, height: 28, color: '#8A98A3' }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 20, color: '#0D2630' }}
                >
                  {displayName}
                </p>
                {patientDetail &&
                  patientDetail.queueStatus &&
                  patientDetail.queueStatus !== '—' && (
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: '#16A34A',
                        border: '1px solid rgba(34,197,94,0.4)',
                        background: 'rgba(34,197,94,0.08)',
                      }}
                    >
                      {patientDetail.queueStatus}
                    </span>
                  )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <DetailField icon={UserIcon} label="Patient ID" value={resolvedPatientId ?? '—'} />
                <DetailField
                  icon={UserIcon}
                  label="Gender / Age"
                  value={`${displayGender} / ${displayAge}`}
                />
                <DetailField
                  icon={Calendar}
                  label="Date of Birth"
                  value={patientDetail?.dob ? formatHumanDate(patientDetail.dob) : '—'}
                />
                <DetailField
                  icon={Phone}
                  label="Phone Number"
                  value={patientDetail?.phone ?? '—'}
                />
                <DetailField icon={Mail} label="Email" value={patientDetail?.email ?? '—'} />
                <DetailField icon={MapPin} label="Address" value={patientDetail?.address ?? '—'} />
                <DetailField
                  icon={Droplet}
                  label="Blood Group"
                  value={patientDetail?.bloodGroup ?? '—'}
                />
                <DetailField
                  icon={AlertTriangle}
                  label="Allergies"
                  value={
                    patientDetail && patientDetail.allergies.length > 0
                      ? `${patientDetail.allergies.length} known`
                      : 'No known allergies'
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <AllergyBanner allergies={patientDetail?.allergies ?? []} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            {/* ── Left: filters, tabs, table ─────────────────────────────── */}
            <div className="flex min-w-0 flex-col gap-4">
              <div
                ref={filterBarRef}
                className="flex flex-wrap items-center gap-2.5 rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
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
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className={`ml-auto flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  Reset
                </button>
              </div>

              <div
                className="overflow-hidden rounded-[12px]"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div
                  className="flex items-center gap-1 overflow-x-auto scroll-smooth px-3 pt-3"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.10)' }}
                >
                  {TABS.map((t) => {
                    const count =
                      t.key === 'ALL'
                        ? entries.length
                        : entries.filter((e) => e.status === t.key).length;
                    const active = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setTab(t.key);
                          setPage(1);
                        }}
                        className={`shrink-0 px-3.5 pb-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: active ? '#00B4D8' : '#4A7080',
                          borderBottom: active ? '2px solid #00B4D8' : '2px solid transparent',
                        }}
                      >
                        {t.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {pageState === 'loading' ? (
                  <div className="pb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                    <div
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(226,237,241,0.6)' }}
                    >
                      <Search style={{ width: 28, height: 28, color: '#8A98A3' }} />
                    </div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      No orders match this filter
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Try adjusting the tab or filters above.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className={`mt-1 font-sans font-semibold transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto scroll-smooth">
                      <div style={{ minWidth: 1080 }}>
                        <div
                          className="flex px-3 py-3"
                          style={{
                            background: 'rgba(226,237,241,0.4)',
                            borderBottom: '1px solid #0064821F',
                          }}
                        >
                          {[
                            ['Order ID', 'w-[14%]'],
                            ['Order Date', 'w-[13%]'],
                            ['Department', 'w-[12%]'],
                            ['Tests', 'min-w-0 flex-1'],
                            ['Status', 'w-24 shrink-0'],
                            ['Collected On', 'w-[13%]'],
                            ['Result Reported On', 'w-[13%]'],
                            ['Actions', 'w-20 shrink-0'],
                          ].map(([label, width]) => (
                            <Tooltip key={label} content={label!}>
                              <span
                                className={`${width} truncate pr-3 font-sans font-bold tracking-wider uppercase`}
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                {label}
                              </span>
                            </Tooltip>
                          ))}
                        </div>

                        {paginated.map(({ order, status, collectedAt, reportedAt }) => {
                          const cfg = STATUS_CFG[status];
                          const menuOpen = openRowMenuId === order.orderId;
                          return (
                            <div
                              key={order.orderId}
                              className="flex items-center px-3 py-3 transition-colors duration-150 hover:bg-[#F5FBFD]"
                              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                            >
                              <Tooltip content={order.orderId}>
                                <span
                                  className="w-[14%] truncate pr-3 font-sans font-medium"
                                  style={{ fontSize: 14, color: '#00B4D8' }}
                                >
                                  {order.orderId}
                                </span>
                              </Tooltip>
                              <Tooltip content={formatDateTime(order.orderedAt)}>
                                <span
                                  className="w-[13%] truncate pr-3"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {formatDateTime(order.orderedAt)}
                                </span>
                              </Tooltip>
                              <Tooltip content={orderDepartment(order)}>
                                <span
                                  className="w-[12%] truncate pr-3"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {orderDepartment(order)}
                                </span>
                              </Tooltip>
                              <Tooltip
                                content={`${orderTestsSummary(order)} (${order.tests.length} test${order.tests.length === 1 ? '' : 's'})`}
                              >
                                <span
                                  className="min-w-0 flex-1 truncate pr-3"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {orderTestsSummary(order)}
                                  <span style={{ color: '#8A98A3' }}>
                                    {' '}
                                    ({order.tests.length} test{order.tests.length === 1 ? '' : 's'})
                                  </span>
                                </span>
                              </Tooltip>
                              <span className="w-24 shrink-0 pr-3">
                                <span
                                  className="inline-flex rounded-full px-2.5 py-0.5 font-sans font-medium"
                                  style={{
                                    fontSize: 14,
                                    color: cfg.color,
                                    border: `1px solid ${cfg.border}`,
                                    background: cfg.bg,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {status}
                                </span>
                              </span>
                              <Tooltip content={collectedAt ? formatDateTime(collectedAt) : '—'}>
                                <span
                                  className="w-[13%] truncate pr-3"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {collectedAt ? formatDateTime(collectedAt) : '—'}
                                </span>
                              </Tooltip>
                              <Tooltip content={reportedAt ? formatDateTime(reportedAt) : '—'}>
                                <span
                                  className="w-[13%] truncate pr-3"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {reportedAt ? formatDateTime(reportedAt) : '—'}
                                </span>
                              </Tooltip>
                              <span className="flex w-20 shrink-0 items-center gap-1.5 pr-3">
                                <button
                                  type="button"
                                  onClick={() => setReportTarget(order)}
                                  aria-label={`View ${order.orderId}`}
                                  className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] ${FOCUS_RING}`}
                                >
                                  <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                                </button>
                                <div className="relative shrink-0">
                                  <button
                                    ref={getRowMenuButtonRef(order.orderId)}
                                    type="button"
                                    onClick={() =>
                                      setOpenRowMenuId(menuOpen ? null : order.orderId)
                                    }
                                    aria-label="More actions"
                                    className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] ${FOCUS_RING}`}
                                  >
                                    <MoreVertical
                                      style={{ width: 15, height: 15, color: '#4A7080' }}
                                    />
                                  </button>
                                  <RowMenuPortal
                                    open={menuOpen}
                                    anchorRef={getRowMenuButtonRef(order.orderId)}
                                    onClose={() => setOpenRowMenuId(null)}
                                    width={160}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        printReport(order);
                                        setOpenRowMenuId(null);
                                      }}
                                      className={`flex w-full items-center gap-2 px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] ${FOCUS_RING}`}
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      <Printer style={{ width: 14, height: 14 }} />
                                      Print Order
                                    </button>
                                  </RowMenuPortal>
                                </div>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Pagination
                      page={clampedPage}
                      pageSize={pageSize}
                      totalItems={filtered.length}
                      onPageChange={setPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                      }}
                      itemLabel="orders"
                      pageSizeOptions={[10, 25, 50]}
                    />
                  </>
                )}
              </div>

              <div
                className="flex items-start gap-2.5 rounded-[10px] p-3"
                style={{
                  background: 'rgba(0,180,216,0.06)',
                  border: '1px solid rgba(0,180,216,0.2)',
                }}
              >
                <Download
                  style={{ width: 16, height: 16, color: '#00B4D8' }}
                  className="mt-0.5 shrink-0"
                />
                <p style={{ fontSize: 14, color: '#0D2630' }}>
                  Note: Results are available after verification and publication by the authorized
                  officer.
                </p>
              </div>
            </div>

            {/* ── Right rail ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                  >
                    Patient Summary
                  </h2>
                  {resolvedPatientId && (
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.patientProfile(resolvedPatientId))}
                      className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View Profile
                    </button>
                  )}
                </div>
                <div className="mt-3.5 flex flex-col gap-3">
                  <DetailField
                    icon={UserIcon}
                    label="Patient ID"
                    value={resolvedPatientId ?? '—'}
                  />
                  <DetailField
                    icon={Phone}
                    label="Phone Number"
                    value={patientDetail?.phone ?? '—'}
                  />
                  <DetailField icon={Mail} label="Email" value={patientDetail?.email ?? '—'} />
                  <DetailField
                    icon={MapPin}
                    label="Address"
                    value={patientDetail?.address ?? '—'}
                  />
                  <DetailField
                    icon={Droplet}
                    label="Blood Group"
                    value={patientDetail?.bloodGroup ?? '—'}
                  />
                  <DetailField
                    icon={AlertTriangle}
                    label="Allergies"
                    value={
                      patientDetail && patientDetail.allergies.length > 0
                        ? patientDetail.allergies.map((a) => a.substance).join(', ')
                        : 'No known allergies'
                    }
                  />
                </div>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                >
                  Laboratory Overview
                </h2>
                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  <MiniStat
                    label="Total Orders"
                    value={stats.total}
                    color="#00B4D8"
                    bg="rgba(0,180,216,0.08)"
                  />
                  <MiniStat
                    label="Completed"
                    value={stats.completed}
                    color="#16A34A"
                    bg="rgba(34,197,94,0.08)"
                  />
                  <MiniStat
                    label="Pending"
                    value={stats.pending}
                    color="#B45309"
                    bg="rgba(245,158,11,0.08)"
                  />
                  <MiniStat
                    label="Cancelled"
                    value={stats.cancelled}
                    color="#DC2626"
                    bg="rgba(239,68,68,0.08)"
                  />
                </div>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                >
                  Recent Tests
                </h2>
                <div className="mt-3.5 flex flex-col gap-3">
                  {recentTests.length === 0 ? (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>No tests recorded.</p>
                  ) : (
                    recentTests.map(({ test, order }) => {
                      const status = deriveHistoryStatus([test]);
                      const cfg = STATUS_CFG[status];
                      return (
                        <div key={test.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <Tooltip content={test.testName}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {test.testName}
                              </p>
                            </Tooltip>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatHumanDate(test.resultAt ?? order.orderedAt)}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                              background: cfg.bg,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.laboratoryPublishedResults)}
                  className={`mt-3.5 flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View all results →
                </button>
              </div>
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
          onPrint={() => printReport(reportTarget)}
        />
      )}
    </div>
  );
}
