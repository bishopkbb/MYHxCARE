'use client';

import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  Download,
  FileDown,
  FileText,
  MoreVertical,
  Sheet,
  SlidersHorizontal,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatCurrency } from '@/utils/currency';
import { formatHumanDate, formatTime, toWATDateInput } from '@/utils/datetime';
import {
  PROCUREMENT_DEPARTMENT_OPTIONS,
  PROCUREMENT_PRIORITY_OPTIONS,
  PROCUREMENT_STATUS_OPTIONS,
  REQUEST_TYPE_OPTIONS,
  type ProcurementRequest,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { useProcurementRequests } from '@/features/pharmacy/store/procurementRequestStore';
import {
  PRIORITY_CFG,
  PROCUREMENT_REPORT_STAT_META,
  STATUS_CFG,
} from '@/features/pharmacy/__mocks__/procurementReportFixtures';

const ProcurementReportDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/ProcurementReportDetailModal').then(
      (m) => m.ProcurementReportDetailModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ScheduleReportModal = dynamic(
  () =>
    import('@/features/pharmacy/components/ScheduleReportModal').then((m) => m.ScheduleReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const TYPE_COLORS: Record<string, string> = {
  Medication: '#00B4D8',
  'Medical Supplies': '#3B82F6',
  Equipment: '#F59E0B',
};

type Row = ProcurementRequest & { totalValue: number };

type ProcurementFilters = {
  dateFrom: string;
  dateTo: string;
  department: string;
  requestType: string;
  priority: string;
  status: string;
};

function totalValueOf(request: ProcurementRequest): number {
  return request.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}

function filterRows(rows: Row[], filters: ProcurementFilters | null): Row[] {
  if (!filters) return rows;
  return rows.filter((r) => {
    const d = r.createdAt.slice(0, 10);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo && d > filters.dateTo) return false;
    if (filters.department && r.department !== filters.department) return false;
    if (filters.requestType && r.requestType !== filters.requestType) return false;
    if (filters.priority && r.priority !== filters.priority) return false;
    if (filters.status && r.status !== filters.status) return false;
    return true;
  });
}

// ── Stat card ────────────────────────────────────────────────────────────
function ReportStatCard({
  label,
  value,
  icon: Icon,
  accent,
  iconBg,
  percent,
  direction,
  comparedTo,
}: {
  label: string;
  value: string;
  icon: (typeof PROCUREMENT_REPORT_STAT_META)[number]['icon'];
  accent: string;
  iconBg: string;
  percent: number;
  direction: 'up' | 'down';
  comparedTo: string;
}) {
  const isUp = direction === 'up';
  const TrendIcon = isUp ? ArrowUp : ArrowDown;

  return (
    <div
      className="min-w-0 rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <Tooltip content={label}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {label}
          </p>
        </Tooltip>
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 16, height: 16, color: accent }} />
        </div>
      </div>
      <Tooltip content={value}>
        <p
          className="font-display mt-2 truncate font-semibold"
          style={{ fontSize: 24, color: '#0D2630' }}
        >
          {value}
        </p>
      </Tooltip>
      <p
        className="mt-0.5 flex items-center gap-1 font-sans font-medium"
        style={{ fontSize: 14, color: isUp ? '#16A34A' : '#DC2626' }}
      >
        <TrendIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
        {percent}% vs {comparedTo}
      </p>
    </div>
  );
}

// ── Dual-series bar trend — real, bucketed from actual request createdAt
// dates ──────────────────────────────────────────────────────────────────
function ProcurementTrendChart({
  data,
  colorRequests,
  colorSpend,
}: {
  data: { label: string; requests: number; spend: number }[];
  colorRequests: string;
  colorSpend: string;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const maxRequests = Math.max(...data.map((d) => d.requests), 1);

  return (
    <div>
      <div className="mt-1 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorRequests }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Requests Created</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorSpend }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Days With Spend</span>
        </div>
      </div>
      <div className="mt-3 flex gap-3" style={{ height: 240 }}>
        <div
          className="flex shrink-0 flex-col justify-between pb-6 text-right"
          style={{ width: 34 }}
        >
          {[
            maxRequests,
            Math.round(maxRequests * 0.75),
            Math.round(maxRequests * 0.5),
            Math.round(maxRequests * 0.25),
            0,
          ].map((t, i) => (
            <span key={i} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            className="absolute inset-x-0 top-0 flex flex-col justify-between"
            style={{ height: 'calc(100% - 24px)' }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
            ))}
          </div>
          <div
            className="absolute inset-x-0 top-0 flex items-end gap-1.5"
            style={{ height: 'calc(100% - 24px)' }}
          >
            {data.map((d, i) => (
              <Tooltip
                key={d.label}
                content={`${d.requests} requests · ${formatCurrency(d.spend)}`}
              >
                <div
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  style={{ height: '100%' }}
                >
                  <div
                    className="w-full rounded-t-[3px]"
                    style={{
                      height: animate ? `${(d.requests / maxRequests) * 100}%` : 0,
                      background: d.spend > 0 ? colorSpend : colorRequests,
                      transition: `height 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 20}ms`,
                    }}
                  />
                </div>
              </Tooltip>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-1.5" style={{ height: 24 }}>
            {data.map((d) => (
              <span
                key={d.label}
                className="min-w-0 flex-1 text-center font-sans"
                style={{ fontSize: 14, color: '#8A98A3' }}
              >
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RowMenu({ request, onView }: { request: Row; onView: () => void }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${request.id}`}
        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={160}>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onView();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          View Details
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function ProcurementReportWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const requests = useProcurementRequests();

  const defaultRangeStart = useMemo(() => {
    const d = new Date(toWATDateInput());
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const today = toWATDateInput();

  const [dateFrom, setDateFrom] = useState(defaultRangeStart);
  const [dateTo, setDateTo] = useState(today);
  const [department, setDepartment] = useState('');
  const [requestType, setRequestType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<Row | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Every stat card, chart, and sidebar panel always describes the full
  // request log — Generate Report's filters scope only the details table,
  // same convention as every other report screen in this suite.
  const allRows: Row[] = useMemo(
    () => requests.map((r) => ({ ...r, totalValue: totalValueOf(r) })),
    [requests],
  );

  const [appliedFilters, setAppliedFilters] = useState<ProcurementFilters | null>(null);
  const filteredRows = useMemo(
    () => filterRows(allRows, appliedFilters),
    [allRows, appliedFilters],
  );

  const pendingApproval = allRows.filter((r) => r.status === 'Pending Approval');
  const approved = allRows.filter((r) => r.status === 'Approved');
  const orderedOrInTransit = allRows.filter(
    (r) => r.status === 'Ordered' || r.status === 'Partially Received',
  );
  const completed = allRows.filter((r) => r.status === 'Completed');
  const rejected = allRows.filter((r) => r.status === 'Rejected');
  const totalSpend = allRows.reduce((sum, r) => sum + r.totalValue, 0);

  const statValues: Record<string, string> = {
    'total-requests': allRows.length.toLocaleString('en-GB'),
    'pending-approval': pendingApproval.length.toLocaleString('en-GB'),
    approved: approved.length.toLocaleString('en-GB'),
    ordered: orderedOrInTransit.length.toLocaleString('en-GB'),
    completed: completed.length.toLocaleString('en-GB'),
    'total-spend': formatCurrency(totalSpend),
  };

  const trendData = useMemo(() => {
    const days = 14;
    const buckets: { label: string; requests: number; spend: number }[] = [];
    const now = new Date(toWATDateInput());
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayRows = allRows.filter((r) => r.createdAt.slice(0, 10) === key);
      buckets.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        requests: dayRows.length,
        spend: dayRows.reduce((sum, r) => sum + r.totalValue, 0),
      });
    }
    return buckets;
  }, [allRows]);

  const typeBreakdown = useMemo(() => {
    const byType = new Map<string, number>();
    for (const r of allRows) byType.set(r.requestType, (byType.get(r.requestType) ?? 0) + 1);
    return REQUEST_TYPE_OPTIONS.map((t) => ({
      label: t.value,
      value: byType.get(t.value) ?? 0,
      color: TYPE_COLORS[t.value] ?? '#8A98A3',
    })).filter((s) => s.value > 0);
  }, [allRows]);
  const typeTotal = typeBreakdown.reduce((sum, d) => sum + d.value, 0) || 1;

  const topRequestedItems = useMemo(() => {
    const byItem = new Map<string, number>();
    for (const r of allRows) {
      for (const item of r.items) {
        byItem.set(item.name, (byItem.get(item.name) ?? 0) + item.quantity);
      }
    }
    return Array.from(byItem.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, qty]) => ({ label, qty }));
  }, [allRows]);

  const topSuppliers = useMemo(() => {
    const bySupplier = new Map<string, number>();
    for (const r of allRows) {
      if (!r.supplier) continue;
      bySupplier.set(r.supplier, (bySupplier.get(r.supplier) ?? 0) + r.totalValue);
    }
    return Array.from(bySupplier.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [allRows]);

  const totalItemsRequested = allRows.reduce((sum, r) => sum + r.items.length, 0);
  const avgItemsPerRequest =
    allRows.length > 0 ? (totalItemsRequested / allRows.length).toFixed(1) : '0';
  const avgRequestValue = allRows.length > 0 ? totalSpend / allRows.length : 0;
  const decided = allRows.length - pendingApproval.length;
  const approvalRate =
    decided > 0 ? (((decided - rejected.length) / decided) * 100).toFixed(1) : '0';

  const procurementSummary: { label: string; value: string }[] = [
    { label: 'Total Items Requested', value: totalItemsRequested.toLocaleString('en-GB') },
    { label: 'Avg. Items per Request', value: avgItemsPerRequest },
    { label: 'Avg. Request Value', value: formatCurrency(avgRequestValue) },
    { label: 'Approval Rate', value: `${approvalRate}%` },
    { label: 'Rejected Requests', value: rejected.length.toLocaleString('en-GB') },
  ];

  useEffect(() => {
    if (!exportMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportMenuOpen]);

  function handleGenerateReport() {
    const next: ProcurementFilters = {
      dateFrom,
      dateTo,
      department,
      requestType,
      priority,
      status,
    };
    setAppliedFilters(next);
    setPage(1);
    const count = filterRows(allRows, next).length;
    toast.success(
      'Report generated',
      `${count} request${count !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleResetFilters() {
    setDateFrom(defaultRangeStart);
    setDateTo(today);
    setDepartment('');
    setRequestType('');
    setPriority('');
    setStatus('');
    setAppliedFilters(null);
    setPage(1);
    toast.info('Filters reset', 'Showing the full request log.');
  }

  const exportRows = useMemo(
    () => [
      [
        'Request ID',
        'Date',
        'Type',
        'Department',
        'Priority',
        'Items',
        'Total Value',
        'Status',
        'Requested By',
        'Supplier',
        'PO Number',
      ],
      ...filteredRows.map((r) => [
        r.id,
        `${formatHumanDate(r.createdAt)} ${formatTime(r.createdAt)}`,
        r.requestType,
        r.department,
        r.priority,
        String(r.items.length),
        formatCurrency(r.totalValue),
        r.status,
        r.requestedBy,
        r.supplier ?? '',
        r.poNumber ?? '',
      ]),
    ],
    [filteredRows],
  );

  function handleExportPDF() {
    const rowsHtml = filteredRows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(formatHumanDate(r.createdAt))}</td><td>${escapeHtml(r.requestType)}</td><td>${escapeHtml(r.department)}</td><td>${r.items.length}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(formatCurrency(r.totalValue))}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'procurement-report',
      `<h1>Procurement Report</h1>
      <p class="meta">${escapeHtml(formatHumanDate(dateFrom))} – ${escapeHtml(formatHumanDate(dateTo))}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Request ID</th><th>Date</th><th>Type</th><th>Department</th><th>Items</th><th>Status</th><th>Total Value</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
    setExportMenuOpen(false);
    toast.success('Export ready', 'Procurement Report downloaded as PDF.');
  }

  function handleExportExcel() {
    downloadCSV('procurement-report-excel', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Procurement Report downloaded for Excel.');
  }

  function handleExportCSV() {
    downloadCSV('procurement-report', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Procurement Report downloaded as CSV.');
  }

  function handleScheduleReport(frequency: string, recipientEmail: string) {
    setScheduleModalOpen(false);
    toast.success('Report scheduled', `${frequency} delivery to ${recipientEmail} confirmed.`);
  }

  const topSupplier = topSuppliers[0];

  const pageStart = (page - 1) * pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.pharmacy)}
              className={`transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Home
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Reports</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Procurement Report
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Procurement Report
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Track purchase requests from submission through to receiving.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setScheduleModalOpen(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Calendar style={{ width: 15, height: 15 }} />
                Schedule Report
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Download style={{ width: 15, height: 15 }} />
                  Export Report
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      transition: 'transform 150ms',
                      transform: exportMenuOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>
                {exportMenuOpen && (
                  <div
                    className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute right-0 z-20 mt-1.5 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
                    style={{
                      minWidth: 180,
                      border: '1px solid rgba(0,100,130,0.15)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      <FileText style={{ width: 15, height: 15, color: '#EF4444' }} />
                      Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      <Sheet style={{ width: 15, height: 15, color: '#22C55E' }} />
                      Export Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      <FileDown style={{ width: 15, height: 15, color: '#00B4D8' }} />
                      Export CSV
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleGenerateReport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0F766E' }}
              >
                <SlidersHorizontal style={{ width: 15, height: 15 }} />
                Generate Report
              </button>
            </div>
          </div>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <FormDateInput
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      aria-label="From date"
                    />
                  </div>
                  <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                    –
                  </span>
                  <div className="min-w-0 flex-1">
                    <FormDateInput
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      aria-label="To date"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Department
                </label>
                <FormSelect
                  id="procurement-report-department"
                  value={department}
                  onChange={setDepartment}
                  options={PROCUREMENT_DEPARTMENT_OPTIONS}
                  placeholder="All Departments"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Request Type
                </label>
                <FormSelect
                  id="procurement-report-type"
                  value={requestType}
                  onChange={setRequestType}
                  options={REQUEST_TYPE_OPTIONS}
                  placeholder="All Types"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Priority
                </label>
                <FormSelect
                  id="procurement-report-priority"
                  value={priority}
                  onChange={setPriority}
                  options={PROCUREMENT_PRIORITY_OPTIONS}
                  placeholder="All Priorities"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Status
                </label>
                <FormSelect
                  id="procurement-report-status"
                  value={status}
                  onChange={setStatus}
                  options={PROCUREMENT_STATUS_OPTIONS}
                  placeholder="All Statuses"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMoreFiltersOpen((v) => !v)}
                className={`flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                <SlidersHorizontal style={{ width: 14, height: 14 }} />
                More Filters
                <ChevronDown
                  style={{
                    width: 14,
                    height: 14,
                    transition: 'transform 150ms',
                    transform: moreFiltersOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {PROCUREMENT_REPORT_STAT_META.map((s) => (
              <ReportStatCard
                key={s.id}
                label={s.label}
                value={statValues[s.id] ?? '0'}
                icon={s.icon}
                accent={s.accent}
                iconBg={s.iconBg}
                percent={s.info.percent}
                direction={s.info.direction}
                comparedTo={s.info.comparedTo}
              />
            ))}
          </div>

          {/* ── Main + sidebar ─────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
            <div className="flex min-w-0 flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Procurement Trend (Last 14 Days)
                  </p>
                  <ProcurementTrendChart
                    data={trendData}
                    colorRequests="#00B4D8"
                    colorSpend="#EC4899"
                  />
                </div>

                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Requests by Type
                  </p>
                  <div className="mt-3 flex items-center gap-5">
                    <AnimatedDonutChart
                      breakdown={typeBreakdown}
                      total={typeTotal}
                      ariaLabel="Requests by type donut chart"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {typeBreakdown.map((d) => (
                        <div key={d.label} className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ background: d.color }}
                            />
                            <Tooltip content={d.label}>
                              <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {d.label}
                              </span>
                            </Tooltip>
                          </div>
                          <span
                            className="shrink-0 font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {d.value} ({((d.value / typeTotal) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Total {typeTotal.toLocaleString('en-GB')} requests
                  </p>
                </div>
              </div>

              {/* ── Procurement Details ──────────────────────────────────────── */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 18, color: '#0D2630' }}
                >
                  Procurement Details
                </p>

                <ScrollableTable minWidth={1600} maxHeight={640} className="mt-3">
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{
                      background: TABLE_HEADER_BG,
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Date
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Request ID
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Type
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Department
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Priority
                      </span>
                    </div>
                    <div className="w-20 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Items
                      </span>
                    </div>
                    <div className="w-44 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Total Value (₦)
                      </span>
                    </div>
                    <div className="w-44 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Requested By
                      </span>
                    </div>
                    <div className="min-w-[144px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Supplier
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        PO Number
                      </span>
                    </div>
                    <div className="flex w-20 shrink-0 items-center justify-end py-2.5 pr-3">
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
                        <FileText style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No requests match your filters
                      </p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}

                  {pageRows.map((r) => {
                    const statusCfg = STATUS_CFG[r.status];
                    const priorityCfg = PRIORITY_CFG[r.priority] ?? PRIORITY_CFG['Medium']!;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-28 shrink-0 py-3 pr-2 pl-3">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(r.createdAt)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatTime(r.createdAt)}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={r.id}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              {r.id}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.requestType}</p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.department}</p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: priorityCfg.color,
                              border: `1px solid ${priorityCfg.border}`,
                              background: priorityCfg.bg,
                            }}
                          >
                            {r.priority}
                          </span>
                        </div>
                        <div className="w-20 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>{r.items.length}</p>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatCurrency(r.totalValue)}
                          </p>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.border}`,
                              background: statusCfg.bg,
                            }}
                          >
                            {r.status}
                          </span>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={r.requestedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.requestedBy}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="min-w-[144px] flex-1 py-3 pr-2">
                          <Tooltip content={r.supplier ?? '—'}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.supplier ?? '—'}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <Tooltip content={r.poNumber ?? '—'}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.poNumber ?? '—'}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="flex w-20 shrink-0 items-center justify-end py-3 pr-3">
                          <RowMenu request={r} onView={() => setDetailRequest(r)} />
                        </div>
                      </div>
                    );
                  })}
                </ScrollableTable>

                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={filteredRows.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="requests"
                  pageSizeOptions={ROWS_PER_PAGE_OPTIONS}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="flex min-w-0 flex-col gap-4">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Procurement Summary
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {procurementSummary.map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-2">
                      <Tooltip content={s.label}>
                        <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {s.label}
                        </span>
                      </Tooltip>
                      <Tooltip content={s.value}>
                        <span
                          className="max-w-[140px] shrink-0 truncate text-right font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {s.value}
                        </span>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Top Requested Items
                  </h2>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.pharmacyProcurementRequests)}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View all
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {topRequestedItems.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>No requests recorded yet.</p>
                  )}
                  {topRequestedItems.map((m) => (
                    <div key={m.label} className="flex items-center justify-between gap-2">
                      <Tooltip content={m.label}>
                        <span className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {m.label}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        {m.qty} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Top Suppliers by Spend
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {topSuppliers.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      No supplier-assigned requests yet.
                    </p>
                  )}
                  {topSuppliers.map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-2">
                      <Tooltip content={s.label}>
                        <span className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {s.label}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        {formatCurrency(s.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{
                  background: 'rgba(34,197,94,0.06)',
                  border: '1px solid rgba(34,197,94,0.25)',
                }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Report Insights
                </h2>
                <p className="mt-1.5" style={{ fontSize: 14, color: '#4A7080' }}>
                  {pendingApproval.length} request{pendingApproval.length !== 1 ? 's are' : ' is'}{' '}
                  waiting on approval, and total spend across all requests is{' '}
                  {formatCurrency(totalSpend)}.
                  {topSupplier ? ` ${topSupplier.label} accounts for the most spend.` : ''}
                </p>
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex items-center gap-2 rounded-[12px] p-3.5"
            style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
          >
            <p style={{ fontSize: 14, color: '#0D2630' }}>
              Marking a request Ordered creates a real purchase order in Stock Receiving — this
              report and Stock Movement Report both reflect that the moment it happens.
            </p>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {detailRequest && (
        <ProcurementReportDetailModal
          request={detailRequest}
          onClose={() => setDetailRequest(null)}
        />
      )}
      {scheduleModalOpen && (
        <ScheduleReportModal
          onSchedule={handleScheduleReport}
          onClose={() => setScheduleModalOpen(false)}
        />
      )}
    </div>
  );
}
