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
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatCurrency } from '@/utils/currency';
import { formatDate, toWATDateInput } from '@/utils/datetime';
import {
  getInventoryRowStatus,
  INVENTORY_CATEGORY_OPTIONS,
  INVENTORY_LOCATION_OPTIONS,
  INVENTORY_STATUS_OPTIONS,
  type InventoryBatchRow,
  type InventoryStatus,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { useInventoryBatches } from '@/features/pharmacy/store/inventoryStore';
import { useSupplierOptions, useSuppliers } from '@/features/pharmacy/store/supplierStore';
import {
  AVERAGE_STOCK_COVERAGE_DAYS,
  buildInventoryValueTrend,
  buildMovementBreakdown,
  CATEGORY_COLORS,
  INVENTORY_REPORT_STAT_META,
  INVENTORY_TURNOVER_RATIO,
} from '@/features/pharmacy/__mocks__/inventoryReportFixtures';

const InventoryReportDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/InventoryReportDetailModal').then(
      (m) => m.InventoryReportDetailModal,
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

const STATUS_CFG: Record<InventoryStatus, { color: string; border: string; bg: string }> = {
  'In Stock': { color: '#16A34A', border: 'rgba(22,163,74,0.35)', bg: 'rgba(22,163,74,0.08)' },
  'Low Stock': { color: '#D97706', border: 'rgba(217,119,6,0.35)', bg: 'rgba(217,119,6,0.08)' },
  'Out of Stock': { color: '#DC2626', border: 'rgba(220,38,38,0.35)', bg: 'rgba(220,38,38,0.08)' },
  'Expiring Soon': {
    color: '#7C3AED',
    border: 'rgba(124,58,237,0.35)',
    bg: 'rgba(124,58,237,0.08)',
  },
};

type Row = InventoryBatchRow & { status: InventoryStatus };

type InventoryFilters = {
  location: string;
  category: string;
  supplier: string;
  stockStatus: string;
};

function filterRows(rows: Row[], filters: InventoryFilters | null): Row[] {
  if (!filters) return rows;
  return rows.filter((r) => {
    if (filters.location && r.locationId !== filters.location) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.supplier && r.supplier !== filters.supplier) return false;
    if (filters.stockStatus && r.status !== filters.stockStatus) return false;
    return true;
  });
}

/** Days between now and an expiry date — defined at module scope (not
 * inside the component) so calling Date.now() here isn't flagged as an
 * impure render call; same convention as PharmacyQueueMonitorWorkspace's
 * minutesSince(). */
function daysUntil(dateIso: string): number {
  return Math.round((new Date(dateIso).getTime() - Date.now()) / 86_400_000);
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
  icon: (typeof INVENTORY_REPORT_STAT_META)[number]['icon'];
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

// ── Single-series line trend chart with a soft area fill ────────────────────
function LineTrendChart({
  data,
  color,
}: {
  data: { label: string; value: number }[];
  color: string;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  let tick = Math.ceil(maxValue / 4);
  if (tick > 1_000_000) tick = Math.ceil(tick / 500_000) * 500_000;
  else if (tick > 100_000) tick = Math.ceil(tick / 50_000) * 50_000;
  else if (tick > 1000) tick = Math.ceil(tick / 1000) * 1000;
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];
  const W = 400;
  const H = 200;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => ({ x: i * stepX, y: H - (d.value / niceMax) * H }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD = `${pathD} L ${W} ${H} L 0 ${H} Z`;
  const xLabelIdx = [0, Math.floor(data.length / 2), data.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  return (
    <div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: color }} />
        <span style={{ fontSize: 14, color: '#4A7080' }}>Inventory Value (₦)</span>
      </div>
      <div className="mt-3 flex gap-3" style={{ height: 240 }}>
        <div
          className="flex shrink-0 flex-col justify-between pb-6 text-right"
          style={{ width: 46 }}
        >
          {[...ticks].reverse().map((t) => (
            <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              ₦{(t / 1_000_000).toFixed(t >= 1_000_000 ? 0 : 1)}M
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
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-0"
            style={{ height: 'calc(100% - 24px)', width: '100%' }}
            role="img"
            aria-label="Inventory value trend chart"
          >
            <defs>
              <linearGradient id="inventory-value-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path
              d={areaD}
              fill="url(#inventory-value-fill)"
              stroke="none"
              style={{ opacity: animate ? 1 : 0, transition: 'opacity 0.6s ease-out 0.4s' }}
            />
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              style={{
                strokeDasharray: 1400,
                strokeDashoffset: animate ? 0 : 1400,
                transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
            {xLabelIdx.map((i) => (
              <span key={i} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                {data[i]?.label}
              </span>
            ))}
          </div>
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

export function InventoryReportWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const allBatches = useInventoryBatches();
  const suppliers = useSuppliers();
  const supplierOptions = useSupplierOptions();

  const defaultRangeStart = useMemo(() => {
    const d = new Date(toWATDateInput());
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const today = toWATDateInput();

  const [dateFrom, setDateFrom] = useState(defaultRangeStart);
  const [dateTo, setDateTo] = useState(today);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Every stat card, the donut, the summary panel, and the top lists always
  // describe the FULL current inventory — same convention as Prescription
  // Report / Dispensing Report, where Generate Report's filters scope only
  // the details table below, not the report's headline numbers.
  const allRows: Row[] = useMemo(
    () => allBatches.map((b) => ({ ...b, status: getInventoryRowStatus(b) })),
    [allBatches],
  );

  // A snapshot of the filter values as of the last Generate Report click —
  // null means "no filter applied yet, show everything". Deriving
  // filteredRows from this via useMemo (rather than copying into its own
  // state synced by an effect) means it naturally stays live: if inventory
  // changes while a filter is active, the filtered view updates too.
  const [appliedFilters, setAppliedFilters] = useState<InventoryFilters | null>(null);

  const filteredRows = useMemo(
    () => filterRows(allRows, appliedFilters),
    [allRows, appliedFilters],
  );

  const totalValue = useMemo(
    () => allRows.reduce((sum, r) => sum + r.stockQty * r.unitPrice, 0),
    [allRows],
  );
  const totalItems = allRows.length;
  const lowStockCount = allRows.filter((r) => r.status === 'Low Stock').length;
  const outOfStockCount = allRows.filter((r) => r.status === 'Out of Stock').length;
  const nearExpiryCount = allRows.filter((r) => r.status === 'Expiring Soon').length;
  // No live receiving log exists on InventoryBatchRow (no received-at
  // timestamp) — this one card stays a representative static figure while
  // the other five are real.
  const itemsReceived = 356;

  const statValues: Record<string, string> = {
    'total-value': formatCurrency(totalValue),
    'total-items': totalItems.toLocaleString('en-GB'),
    'low-stock': lowStockCount.toLocaleString('en-GB'),
    'out-of-stock': outOfStockCount.toLocaleString('en-GB'),
    'near-expiry': nearExpiryCount.toLocaleString('en-GB'),
    'items-received': itemsReceived.toLocaleString('en-GB'),
  };

  const trendData = useMemo(() => buildInventoryValueTrend(totalValue), [totalValue]);

  const departmentBreakdown = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const r of allRows) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.stockQty * r.unitPrice);
    }
    const sorted = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6).reduce((sum, [, v]) => sum + v, 0);
    const slices = top.map(([label, value], i) => ({
      label,
      value,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]!,
    }));
    if (rest > 0) {
      slices.push({ label: 'Others', value: rest, color: CATEGORY_COLORS[6]! });
    }
    return slices;
  }, [allRows]);
  const categoryTotal = departmentBreakdown.reduce((sum, d) => sum + d.value, 0) || 1;

  const topStockedItems = useMemo(() => {
    const byItem = new Map<string, number>();
    for (const r of allRows) {
      const key = `${r.medicationName} ${r.strength} ${r.form}`;
      byItem.set(key, (byItem.get(key) ?? 0) + r.stockQty * r.unitPrice);
    }
    return Array.from(byItem.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [allRows]);

  const topExpiringItems = useMemo(
    () =>
      allRows
        .filter((r) => r.status === 'Expiring Soon')
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
        .slice(0, 5),
    [allRows],
  );

  const movementBreakdown = buildMovementBreakdown(totalItems);
  const reorderBreached = allRows.filter((r) => r.stockQty <= r.reorderLevel).length;

  const inventorySummary: { label: string; value: string }[] = [
    ...movementBreakdown.map((m) => ({
      label: m.label,
      value: `${m.value.toLocaleString('en-GB')} (${totalItems > 0 ? ((m.value / totalItems) * 100).toFixed(1) : 0}%)`,
    })),
    {
      label: 'Reorder Level Breached',
      value: `${reorderBreached.toLocaleString('en-GB')} (${totalItems > 0 ? ((reorderBreached / totalItems) * 100).toFixed(1) : 0}%)`,
    },
    { label: 'Expired Items', value: outOfStockCount.toLocaleString('en-GB') },
    { label: 'Average Stock Coverage', value: `${AVERAGE_STOCK_COVERAGE_DAYS} days` },
    { label: 'Inventory Turnover Ratio', value: INVENTORY_TURNOVER_RATIO.toFixed(2) },
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

  // Date Range is collected but InventoryBatchRow has no received-date field
  // to filter against — same honest-limitation convention as Location in
  // prescriptionReportFixtures.ts.
  function handleGenerateReport() {
    const next = { location, category, supplier, stockStatus };
    setAppliedFilters(next);
    setPage(1);
    const count = filterRows(allRows, next).length;
    toast.success(
      'Report generated',
      `${count} inventory item${count !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleResetFilters() {
    setDateFrom(defaultRangeStart);
    setDateTo(today);
    setLocation('');
    setCategory('');
    setSupplier('');
    setStockStatus('');
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
        'Unit',
        'In Stock',
        'Reorder Level',
        'Status',
        'Expiry Date',
        'Batch No.',
        'Unit Cost',
        'Total Value',
      ],
      ...filteredRows.map((r) => [
        r.medicationName,
        r.category,
        r.strength,
        r.form,
        r.unit,
        String(r.stockQty),
        String(r.reorderLevel),
        r.status,
        formatDate(r.expiryDate),
        r.batchNo,
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
          `<tr><td>${escapeHtml(r.medicationName)} ${escapeHtml(r.strength)}</td><td>${escapeHtml(r.category)}</td><td>${r.stockQty}</td><td>${r.reorderLevel}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(formatDate(r.expiryDate))}</td><td>${escapeHtml(r.batchNo)}</td><td>${escapeHtml(formatCurrency(r.stockQty * r.unitPrice))}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'inventory-report',
      `<h1>Inventory Report</h1>
      <p class="meta">Generated ${escapeHtml(formatDate(new Date().toISOString()))}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Item</th><th>Category</th><th>In Stock</th><th>Reorder Level</th><th>Status</th><th>Expiry Date</th><th>Batch No.</th><th>Total Value</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
    setExportMenuOpen(false);
    toast.success('Export ready', 'Inventory Report downloaded as PDF.');
  }

  function handleExportExcel() {
    downloadCSV('inventory-report-excel', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Inventory Report downloaded for Excel.');
  }

  function handleExportCSV() {
    downloadCSV('inventory-report', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Inventory Report downloaded as CSV.');
  }

  function handleScheduleReport(frequency: string, recipientEmail: string) {
    setScheduleModalOpen(false);
    toast.success('Report scheduled', `${frequency} delivery to ${recipientEmail} confirmed.`);
  }

  const topCategory = departmentBreakdown[0];
  const totalValueMeta = INVENTORY_REPORT_STAT_META.find((s) => s.id === 'total-value')!;

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
              Inventory Reports
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Inventory Reports
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Comprehensive overview of pharmacy inventory and stock status.
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
                  Location
                </label>
                <FormSelect
                  id="inventory-report-location"
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
                  id="inventory-report-category"
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
                  id="inventory-report-supplier"
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
                  Stock Status
                </label>
                <FormSelect
                  id="inventory-report-status"
                  value={stockStatus}
                  onChange={setStockStatus}
                  options={INVENTORY_STATUS_OPTIONS}
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
            {INVENTORY_REPORT_STAT_META.map((s) => (
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
                    Inventory Value Trend
                  </p>
                  <LineTrendChart data={trendData} color="#16A34A" />
                </div>

                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Inventory by Category
                  </p>
                  <div className="mt-3 flex items-center gap-5">
                    <AnimatedDonutChart
                      breakdown={departmentBreakdown}
                      total={categoryTotal}
                      ariaLabel="Inventory by category donut chart"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {departmentBreakdown.map((d) => (
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
                            {((d.value / categoryTotal) * 100).toFixed(1)}% (
                            {formatCurrency(d.value)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Total {formatCurrency(categoryTotal)}
                  </p>
                </div>
              </div>

              {/* ── Inventory Details ───────────────────────────────────────── */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 18, color: '#0D2630' }}
                >
                  Inventory Details
                </p>

                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 1700 }}>
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="w-12 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          #
                        </span>
                      </div>
                      <div className="min-w-[160px] flex-1 py-2.5 pr-2">
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
                      <div className="w-24 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Unit
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
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Reorder Level
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
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
                          Expiry Date
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
                          Unit Cost (₦)
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
                          No inventory items match your filters
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

                    {pageRows.map((r, idx) => {
                      const statusCfg = STATUS_CFG[r.status];
                      return (
                        <div
                          key={r.id}
                          className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-12 shrink-0 py-3 pr-2 pl-3">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{pageStart + idx + 1}</p>
                          </div>
                          <div className="min-w-[160px] flex-1 py-3 pr-2">
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
                          <div className="w-24 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{r.unit}</p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#0D2630' }}>{r.stockQty}</p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{r.reorderLevel}</p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
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
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.stockQty === 0 ? '—' : formatDate(r.expiryDate)}
                            </p>
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
                  </div>
                </div>

                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={filteredRows.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="items"
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
                  Inventory Summary
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {inventorySummary.map((s) => (
                    <div key={s.label} className="flex items-center justify-between gap-2">
                      <Tooltip content={s.label}>
                        <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {s.label}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {s.value}
                      </span>
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
                    Top Stocked Items (By Value)
                  </h2>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.pharmacyInventory)}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View all
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {topStockedItems.map((m) => (
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
                        {formatCurrency(m.value)}
                      </span>
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
                    Top Expiring Items (Within 60 Days)
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
                  {topExpiringItems.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Nothing in stock is expiring within 60 days.
                    </p>
                  )}
                  {topExpiringItems.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <Tooltip content={`${r.medicationName} ${r.strength}`}>
                        <span className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {r.medicationName} {r.strength}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#7C3AED' }}
                      >
                        {Math.max(0, daysUntil(r.expiryDate))} days
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
                  Inventory value increased by {totalValueMeta.info.percent}% compared to{' '}
                  {totalValueMeta.info.comparedTo}. {reorderBreached} item
                  {reorderBreached !== 1 ? 's are' : ' is'} below reorder level. Please review and
                  raise procurement requests.
                  {topCategory ? ` ${topCategory.label} holds the most inventory value.` : ''}
                </p>
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex items-center gap-2 rounded-[12px] p-3.5"
            style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
          >
            <p style={{ fontSize: 14, color: '#0D2630' }}>
              All inventory values are based on average unit cost. Data is updated in real-time.
            </p>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {detailRow && (
        <InventoryReportDetailModal
          row={detailRow}
          status={detailRow.status}
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
