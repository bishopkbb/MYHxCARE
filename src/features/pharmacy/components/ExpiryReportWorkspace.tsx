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
import { formatDate, toWATDateInput } from '@/utils/datetime';
import {
  EXPIRY_STATUS_OPTIONS,
  getBatchDaysLeft,
  getExpiryBucket,
  INVENTORY_CATEGORY_OPTIONS,
  INVENTORY_LOCATION_OPTIONS,
  type ExpiryBucket,
  type InventoryBatchRow,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { useInventoryBatches } from '@/features/pharmacy/store/inventoryStore';
import { useSupplierOptions, useSuppliers } from '@/features/pharmacy/store/supplierStore';
import { getPharmacyLocation, type PharmacyLocationId } from '@/constants/pharmacyLocations';
import {
  BUCKET_CFG,
  EXPIRY_REPORT_STAT_META,
} from '@/features/pharmacy/__mocks__/expiryReportFixtures';

const ExpiryReportDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/ExpiryReportDetailModal').then(
      (m) => m.ExpiryReportDetailModal,
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

const EXPIRY_REPORT_BUCKET_OPTIONS = [
  ...EXPIRY_STATUS_OPTIONS,
  { value: '> 90 Days', label: 'Healthy (> 90 Days)' },
];

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

type Row = InventoryBatchRow & { bucket: ExpiryBucket; daysLeft: number };

type ExpiryFilters = {
  expiryFrom: string;
  expiryTo: string;
  location: string;
  category: string;
  supplier: string;
  bucket: string;
};

function filterRows(rows: Row[], filters: ExpiryFilters | null): Row[] {
  if (!filters) return rows;
  return rows.filter((r) => {
    const d = r.expiryDate.slice(0, 10);
    if (filters.expiryFrom && d < filters.expiryFrom) return false;
    if (filters.expiryTo && d > filters.expiryTo) return false;
    if (filters.location && r.locationId !== filters.location) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.supplier && r.supplier !== filters.supplier) return false;
    if (filters.bucket && r.bucket !== filters.bucket) return false;
    return true;
  });
}

function valueOf(rows: Row[]): number {
  return rows.reduce((sum, r) => sum + r.stockQty * r.unitPrice, 0);
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
  icon: (typeof EXPIRY_REPORT_STAT_META)[number]['icon'];
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

// ── Expiry timeline bar chart — real, bucketed from actual batch expiry
// dates for the next 12 months, plus an "Expired" bar for what's already
// past due ─────────────────────────────────────────────────────────────────
function ExpiryTimelineChart({ data }: { data: { label: string; count: number }[] }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const maxValue = Math.max(...data.map((d) => d.count), 1);
  let tick = Math.ceil(maxValue / 4);
  if (tick > 100) tick = Math.ceil(tick / 20) * 20;
  else if (tick > 20) tick = Math.ceil(tick / 10) * 10;
  else if (tick > 5) tick = Math.ceil(tick / 5) * 5;
  else tick = Math.max(1, tick);
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];

  return (
    <div className="mt-3 flex gap-3" style={{ height: 240 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 34 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          ))}
        </div>
        <div
          className="absolute inset-x-0 top-0 flex items-end gap-1.5"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {data.map((d, i) => (
            <div
              key={d.label}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              <div
                className="w-full rounded-t-[3px]"
                style={{
                  height: animate ? `${(d.count / niceMax) * 100}%` : 0,
                  background: d.label === 'Expired' ? '#DC2626' : '#D97706',
                  transition: `height 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 25}ms`,
                }}
              />
            </div>
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
  );
}

function RowMenu({ row, onView }: { row: Row; onView: () => void }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${row.medicationName} batch ${row.batchNo}`}
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

export function ExpiryReportWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const allBatches = useInventoryBatches();
  const suppliers = useSuppliers();
  const supplierOptions = useSupplierOptions();

  const defaultRangeStart = useMemo(() => toWATDateInput(), []);
  const defaultRangeEnd = useMemo(() => {
    const d = new Date(toWATDateInput());
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
  }, []);

  const [expiryFrom, setExpiryFrom] = useState('');
  const [expiryTo, setExpiryTo] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [bucketFilter, setBucketFilter] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Every stat card, chart, and sidebar panel always describes the full
  // current inventory — Generate Report's filters scope only the details
  // table, same convention as every other report screen in this suite.
  const allRows: Row[] = useMemo(
    () =>
      allBatches.map((b) => ({
        ...b,
        bucket: getExpiryBucket(b),
        daysLeft: getBatchDaysLeft(b),
      })),
    [allBatches],
  );

  const [appliedFilters, setAppliedFilters] = useState<ExpiryFilters | null>(null);
  const filteredRows = useMemo(
    () => filterRows(allRows, appliedFilters),
    [allRows, appliedFilters],
  );

  const expired = allRows.filter((r) => r.bucket === 'Expired');
  const within30 = allRows.filter((r) => r.bucket === '≤ 30 Days');
  const d31to60 = allRows.filter((r) => r.bucket === '31 – 60 Days');
  const d61to90 = allRows.filter((r) => r.bucket === '61 – 90 Days');
  const healthy = allRows.filter((r) => r.bucket === '> 90 Days');
  const valueAtRisk = valueOf(expired) + valueOf(within30);

  const statValues: Record<string, string> = {
    expired: expired.length.toLocaleString('en-GB'),
    'within-30': within30.length.toLocaleString('en-GB'),
    '31-60': d31to60.length.toLocaleString('en-GB'),
    '61-90': d61to90.length.toLocaleString('en-GB'),
    'value-at-risk': formatCurrency(valueAtRisk),
    healthy: healthy.length.toLocaleString('en-GB'),
  };

  const bucketBreakdown = useMemo(
    () => [
      { label: 'Expired', value: expired.length, color: BUCKET_CFG.Expired.color },
      { label: '≤ 30 Days', value: within30.length, color: BUCKET_CFG['≤ 30 Days'].color },
      { label: '31 – 60 Days', value: d31to60.length, color: BUCKET_CFG['31 – 60 Days'].color },
      { label: '61 – 90 Days', value: d61to90.length, color: BUCKET_CFG['61 – 90 Days'].color },
      { label: '> 90 Days', value: healthy.length, color: BUCKET_CFG['> 90 Days'].color },
    ],
    [expired, within30, d31to60, d61to90, healthy],
  );
  const bucketTotal = bucketBreakdown.reduce((sum, d) => sum + d.value, 0) || 1;

  const timelineData = useMemo(() => {
    const now = new Date(toWATDateInput());
    const points: { label: string; count: number }[] = [
      { label: 'Expired', count: expired.length },
    ];
    for (let i = 0; i < 11; i++) {
      const monthIdx = (now.getMonth() + i) % 12;
      const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const count = allRows.filter((r) => {
        const t = new Date(r.expiryDate).getTime();
        return t >= monthStart.getTime() && t < monthEnd.getTime();
      }).length;
      points.push({ label: MONTH_NAMES[monthIdx]!, count });
    }
    return points;
  }, [allRows, expired.length]);

  const topExpiringSoon = useMemo(
    () =>
      [...allRows]
        .filter((r) => r.bucket !== '> 90 Days')
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5),
    [allRows],
  );

  const expiryByCategory = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const r of [...expired, ...within30, ...d31to60]) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.stockQty * r.unitPrice);
    }
    return Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [expired, within30, d31to60]);

  const avgDaysToExpiry = useMemo(() => {
    const future = allRows.filter((r) => r.daysLeft >= 0);
    if (future.length === 0) return 0;
    return Math.round(future.reduce((sum, r) => sum + r.daysLeft, 0) / future.length);
  }, [allRows]);

  const onHoldCount = allRows.filter((r) => r.isOnHold).length;

  const expirySummary: { label: string; value: string }[] = [
    { label: 'Total Batches Tracked', value: allRows.length.toLocaleString('en-GB') },
    { label: 'Expired Value', value: formatCurrency(valueOf(expired)) },
    {
      label: 'At-Risk Value (≤ 60 Days)',
      value: formatCurrency(valueOf(expired) + valueOf(within30) + valueOf(d31to60)),
    },
    { label: 'Healthy Stock Value', value: formatCurrency(valueOf(healthy)) },
    { label: 'Avg. Days to Expiry', value: `${avgDaysToExpiry} days` },
    { label: 'Batches On Hold', value: onHoldCount.toLocaleString('en-GB') },
    { label: 'Total Suppliers', value: suppliers.length.toLocaleString('en-GB') },
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
    const next: ExpiryFilters = {
      expiryFrom,
      expiryTo,
      location,
      category,
      supplier,
      bucket: bucketFilter,
    };
    setAppliedFilters(next);
    setPage(1);
    const count = filterRows(allRows, next).length;
    toast.success(
      'Report generated',
      `${count} batch${count !== 1 ? 'es' : ''} match your filters.`,
    );
  }

  function handleResetFilters() {
    setExpiryFrom('');
    setExpiryTo('');
    setLocation('');
    setCategory('');
    setSupplier('');
    setBucketFilter('');
    setAppliedFilters(null);
    setPage(1);
    toast.info('Filters reset', 'Showing the full current inventory.');
  }

  const exportRows = useMemo(
    () => [
      [
        'Item Name',
        'Category',
        'Strength',
        'Form',
        'In Stock',
        'Batch No.',
        'Expiry Date',
        'Days Left',
        'Status',
        'Unit Cost',
        'Value at Risk',
      ],
      ...filteredRows.map((r) => [
        r.medicationName,
        r.category,
        r.strength,
        r.form,
        String(r.stockQty),
        r.batchNo,
        formatDate(r.expiryDate),
        r.bucket === 'Expired' ? 'Expired' : String(r.daysLeft),
        r.bucket,
        formatCurrency(r.unitPrice),
        formatCurrency(r.stockQty * r.unitPrice),
      ]),
    ],
    [filteredRows],
  );

  function handleExportPDF() {
    const rowsHtml = filteredRows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.medicationName)} ${escapeHtml(r.strength)}</td><td>${escapeHtml(r.category)}</td><td>${r.stockQty}</td><td>${escapeHtml(formatDate(r.expiryDate))}</td><td>${escapeHtml(r.bucket)}</td><td>${escapeHtml(formatCurrency(r.stockQty * r.unitPrice))}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'expiry-report',
      `<h1>Expiry Report</h1>
      <p class="meta">Generated ${escapeHtml(formatDate(new Date().toISOString()))}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Item</th><th>Category</th><th>In Stock</th><th>Expiry Date</th><th>Status</th><th>Value at Risk</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
    setExportMenuOpen(false);
    toast.success('Export ready', 'Expiry Report downloaded as PDF.');
  }

  function handleExportExcel() {
    downloadCSV('expiry-report-excel', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Expiry Report downloaded for Excel.');
  }

  function handleExportCSV() {
    downloadCSV('expiry-report', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Expiry Report downloaded as CSV.');
  }

  function handleScheduleReport(frequency: string, recipientEmail: string) {
    setScheduleModalOpen(false);
    toast.success('Report scheduled', `${frequency} delivery to ${recipientEmail} confirmed.`);
  }

  const topCategory = expiryByCategory[0];

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
              Expiry Report
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Expiry Report
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Track medication expiry across the pharmacy and the value at risk.
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
                  Expiry Date Range
                </label>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <FormDateInput
                      value={expiryFrom}
                      onChange={(e) => setExpiryFrom(e.target.value)}
                      aria-label="Expiry from date"
                      placeholder={defaultRangeStart}
                    />
                  </div>
                  <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                    –
                  </span>
                  <div className="min-w-0 flex-1">
                    <FormDateInput
                      value={expiryTo}
                      onChange={(e) => setExpiryTo(e.target.value)}
                      aria-label="Expiry to date"
                      placeholder={defaultRangeEnd}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Location
                </label>
                <FormSelect
                  id="expiry-report-location"
                  value={location}
                  onChange={setLocation}
                  options={INVENTORY_LOCATION_OPTIONS}
                  placeholder="All Locations"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Category
                </label>
                <FormSelect
                  id="expiry-report-category"
                  value={category}
                  onChange={setCategory}
                  options={INVENTORY_CATEGORY_OPTIONS}
                  placeholder="All Categories"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Supplier
                </label>
                <FormSelect
                  id="expiry-report-supplier"
                  value={supplier}
                  onChange={setSupplier}
                  options={supplierOptions}
                  placeholder="All Suppliers"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Expiry Status
                </label>
                <FormSelect
                  id="expiry-report-bucket"
                  value={bucketFilter}
                  onChange={setBucketFilter}
                  options={EXPIRY_REPORT_BUCKET_OPTIONS}
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
            {EXPIRY_REPORT_STAT_META.map((s) => (
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
                    Expiry Timeline (Next 12 Months)
                  </p>
                  <ExpiryTimelineChart data={timelineData} />
                </div>

                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Expiry by Status
                  </p>
                  <div className="mt-3 flex items-center gap-5">
                    <AnimatedDonutChart
                      breakdown={bucketBreakdown}
                      total={bucketTotal}
                      ariaLabel="Expiry by status donut chart"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {bucketBreakdown.map((d) => (
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
                            {d.value} ({((d.value / bucketTotal) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Total {bucketTotal.toLocaleString('en-GB')} batches
                  </p>
                </div>
              </div>

              {/* ── Expiry Details ─────────────────────────────────────────── */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 18, color: '#0D2630' }}
                >
                  Expiry Details
                </p>

                <ScrollableTable minWidth={1700} maxHeight={640} className="mt-3">
                  <div
                    className={`flex rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{
                      background: TABLE_HEADER_BG,
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="min-w-[160px] flex-1 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Item Name
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Category
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Strength
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Form
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        In Stock
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Batch No.
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Expiry Date
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Days Left
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Location
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Unit Cost (₦)
                      </span>
                    </div>
                    <div className="w-44 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Value at Risk (₦)
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
                        No batches match your filters
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
                    const bucketCfg = BUCKET_CFG[r.bucket];
                    const rowLocation = getPharmacyLocation(r.locationId as PharmacyLocationId);
                    return (
                      <div
                        key={r.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3">
                          <Tooltip content={r.medicationName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.medicationName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <Tooltip content={r.category}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.category}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.strength}</p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.form}</p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>{r.stockQty}</p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <Tooltip content={r.batchNo}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.batchNo}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatDate(r.expiryDate)}
                          </p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p
                            style={{
                              fontSize: 14,
                              color: r.daysLeft < 0 ? '#DC2626' : '#4A7080',
                            }}
                          >
                            {r.daysLeft < 0 ? 'Expired' : `${r.daysLeft} days`}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: bucketCfg.color,
                              border: `1px solid ${bucketCfg.border}`,
                              background: bucketCfg.bg,
                            }}
                          >
                            {r.bucket}
                          </span>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={rowLocation.shortName}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {rowLocation.shortName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatCurrency(r.unitPrice)}
                          </p>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatCurrency(r.stockQty * r.unitPrice)}
                          </p>
                        </div>
                        <div className="flex w-20 shrink-0 items-center justify-end py-3 pr-3">
                          <RowMenu row={r} onView={() => setDetailRow(r)} />
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
                  itemLabel="batches"
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
                  Expiry Summary
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {expirySummary.map((s) => (
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
                    Top Items Expiring Soon
                  </h2>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.pharmacyExpiry)}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View all
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {topExpiringSoon.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Nothing is expired or expiring soon.
                    </p>
                  )}
                  {topExpiringSoon.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <Tooltip content={`${r.medicationName} ${r.strength}`}>
                        <span className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {r.medicationName} {r.strength}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: r.daysLeft < 0 ? '#DC2626' : '#D97706' }}
                      >
                        {r.daysLeft < 0 ? 'Expired' : `${r.daysLeft} days`}
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
                  Expiry by Category (Value)
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {expiryByCategory.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Nothing is expired or expiring soon.
                    </p>
                  )}
                  {expiryByCategory.map((c) => (
                    <div key={c.label} className="flex items-center justify-between gap-2">
                      <Tooltip content={c.label}>
                        <span className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {c.label}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        {formatCurrency(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{
                  background: 'rgba(220,38,38,0.05)',
                  border: '1px solid rgba(220,38,38,0.2)',
                }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Report Insights
                </h2>
                <p className="mt-1.5" style={{ fontSize: 14, color: '#4A7080' }}>
                  {expired.length} item{expired.length !== 1 ? 's are' : ' is'} already expired,
                  worth {formatCurrency(valueOf(expired))}. Combined value at risk (expired plus
                  expiring within 30 days) is {formatCurrency(valueAtRisk)}.
                  {topCategory ? ` ${topCategory.label} carries the most exposure.` : ''}
                </p>
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex items-center gap-2 rounded-[12px] p-3.5"
            style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
          >
            <p style={{ fontSize: 14, color: '#0D2630' }}>
              Expiry values are based on average unit cost. Data is updated in real-time — the same
              batches Expiry Management, Batch Management, and Low Stock Alerts already show.
            </p>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {detailRow && (
        <ExpiryReportDetailModal
          row={detailRow}
          bucket={detailRow.bucket}
          daysLeft={detailRow.daysLeft}
          onClose={() => setDetailRow(null)}
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
