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
import { getPharmacyLocation, type PharmacyLocationId } from '@/constants/pharmacyLocations';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatCurrency } from '@/utils/currency';
import { formatHumanDate, formatTime, toWATDateInput } from '@/utils/datetime';
import { INVENTORY_LOCATION_OPTIONS } from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { useReceipts } from '@/features/pharmacy/store/stockReceivingStore';
import { useTransfers } from '@/features/pharmacy/store/stockTransferStore';
import { useAdjustments } from '@/features/pharmacy/store/stockAdjustmentStore';
import { useMedicationReturns } from '@/features/pharmacy/store/medicationReturnsStore';
import {
  buildMovementLedger,
  MOVEMENT_DIRECTION_OPTIONS,
  MOVEMENT_TYPE_CFG,
  MOVEMENT_TYPE_COLORS,
  MOVEMENT_TYPE_OPTIONS,
  STOCK_MOVEMENT_STAT_META,
  type MovementType,
  type StockMovementRecord,
} from '@/features/pharmacy/__mocks__/stockMovementReportFixtures';

const StockMovementReportDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/StockMovementReportDetailModal').then(
      (m) => m.StockMovementReportDetailModal,
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

type MovementFilters = {
  dateFrom: string;
  dateTo: string;
  location: string;
  type: string;
  direction: string;
};

function filterRows(rows: StockMovementRecord[], filters: MovementFilters | null) {
  if (!filters) return rows;
  return rows.filter((r) => {
    const d = r.date.slice(0, 10);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo && d > filters.dateTo) return false;
    if (filters.location && r.locationId !== filters.location) return false;
    if (filters.type && r.type !== filters.type) return false;
    if (filters.direction && r.direction !== filters.direction) return false;
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
  icon: (typeof STOCK_MOVEMENT_STAT_META)[number]['icon'];
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

// ── Dual-series bar-style trend (real, sparse event data reads more
// honestly as bars than an interpolated line) ───────────────────────────────
function MovementTrendChart({
  data,
  colorIn,
  colorOut,
}: {
  data: { label: string; stockIn: number; stockOut: number }[];
  colorIn: string;
  colorOut: string;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const maxValue = Math.max(...data.map((d) => Math.max(d.stockIn, d.stockOut)), 1);
  let tick = Math.ceil(maxValue / 4);
  if (tick > 1000) tick = Math.ceil(tick / 500) * 500;
  else if (tick > 100) tick = Math.ceil(tick / 50) * 50;
  else if (tick > 10) tick = Math.ceil(tick / 10) * 10;
  else tick = Math.max(1, tick);
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];

  return (
    <div>
      <div className="mt-1 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorIn }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Stock In</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOut }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Stock Out</span>
        </div>
      </div>
      <div className="mt-3 flex gap-3" style={{ height: 240 }}>
        <div
          className="flex shrink-0 flex-col justify-between pb-6 text-right"
          style={{ width: 34 }}
        >
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
                className="flex min-w-0 flex-1 items-end justify-center gap-0.5"
                style={{ height: '100%' }}
              >
                <div
                  className="w-full rounded-t-[3px]"
                  style={{
                    height: animate ? `${(d.stockIn / niceMax) * 100}%` : 0,
                    background: colorIn,
                    transition: `height 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 15}ms`,
                  }}
                />
                <div
                  className="w-full rounded-t-[3px]"
                  style={{
                    height: animate ? `${(d.stockOut / niceMax) * 100}%` : 0,
                    background: colorOut,
                    transition: `height 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 15 + 60}ms`,
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
    </div>
  );
}

function RowMenu({ record, onView }: { record: StockMovementRecord; onView: () => void }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${record.reference}`}
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

export function StockMovementReportWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const receipts = useReceipts();
  const transfers = useTransfers();
  const adjustments = useAdjustments();
  const returns = useMedicationReturns();

  const defaultRangeStart = useMemo(() => {
    const d = new Date(toWATDateInput());
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const today = toWATDateInput();

  const [dateFrom, setDateFrom] = useState(defaultRangeStart);
  const [dateTo, setDateTo] = useState(today);
  const [location, setLocation] = useState('');
  const [movementType, setMovementType] = useState('');
  const [direction, setDirection] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<StockMovementRecord | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // The full ledger always powers the stat cards, charts, and sidebar —
  // Generate Report's filters scope only the details table, same convention
  // as every other report screen in this suite.
  const allRows = useMemo(
    () => buildMovementLedger(receipts, transfers, adjustments, returns),
    [receipts, transfers, adjustments, returns],
  );

  const [appliedFilters, setAppliedFilters] = useState<MovementFilters | null>(null);
  const filteredRows = useMemo(
    () => filterRows(allRows, appliedFilters),
    [allRows, appliedFilters],
  );

  const stockIn = useMemo(
    () => allRows.filter((r) => r.direction === 'In').reduce((sum, r) => sum + r.qty, 0),
    [allRows],
  );
  const stockOut = useMemo(
    () => allRows.filter((r) => r.direction === 'Out').reduce((sum, r) => sum + r.qty, 0),
    [allRows],
  );
  const netChange = stockIn - stockOut;
  const totalValueMoved = useMemo(
    () => allRows.reduce((sum, r) => sum + r.totalValue, 0),
    [allRows],
  );
  const completedTransfersCount = transfers.filter((t) => t.status === 'Completed').length;

  const statValues: Record<string, string> = {
    'total-movements': allRows.length.toLocaleString('en-GB'),
    'stock-in': stockIn.toLocaleString('en-GB'),
    'stock-out': stockOut.toLocaleString('en-GB'),
    'net-change': `${netChange >= 0 ? '+' : ''}${netChange.toLocaleString('en-GB')}`,
    'total-value': formatCurrency(totalValueMoved),
    'completed-transfers': completedTransfersCount.toLocaleString('en-GB'),
  };

  // Real daily trend — bucketed from the actual event dates in the ledger,
  // not a synthetic wave like Inventory Report's value trend has to be.
  const trendData = useMemo(() => {
    const days = 14;
    const buckets: { label: string; stockIn: number; stockOut: number }[] = [];
    const now = new Date(toWATDateInput());
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayRows = allRows.filter((r) => r.date.slice(0, 10) === key);
      buckets.push({
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        stockIn: dayRows.filter((r) => r.direction === 'In').reduce((s, r) => s + r.qty, 0),
        stockOut: dayRows.filter((r) => r.direction === 'Out').reduce((s, r) => s + r.qty, 0),
      });
    }
    return buckets;
  }, [allRows]);

  const typeBreakdown = useMemo(() => {
    const byType = new Map<MovementType, number>();
    for (const r of allRows) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
    return MOVEMENT_TYPE_OPTIONS.map((t) => ({
      label: t.value,
      value: byType.get(t.value) ?? 0,
      color: MOVEMENT_TYPE_COLORS[t.value],
    })).filter((s) => s.value > 0);
  }, [allRows]);
  const typeTotal = typeBreakdown.reduce((sum, d) => sum + d.value, 0) || 1;

  const topMovedMedications = useMemo(() => {
    const byMed = new Map<string, number>();
    for (const r of allRows) {
      const key = `${r.medicationName} ${r.strength}`;
      byMed.set(key, (byMed.get(key) ?? 0) + r.qty);
    }
    return Array.from(byMed.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, qty]) => ({ label, qty }));
  }, [allRows]);

  const movementsByLocation = useMemo(() => {
    const byLoc = new Map<string, number>();
    for (const r of allRows) byLoc.set(r.locationId, (byLoc.get(r.locationId) ?? 0) + 1);
    return Array.from(byLoc.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([locationId, count]) => ({
        label: getPharmacyLocation(locationId as PharmacyLocationId).shortName,
        count,
      }));
  }, [allRows]);

  const avgMovementsPerDay = (allRows.length / 30).toFixed(2);
  const mostActiveLocation = movementsByLocation[0]?.label ?? '—';
  const mostMovedMedication = topMovedMedications[0]?.label ?? '—';

  const movementSummary: { label: string; value: string }[] = [
    { label: 'Total Stock In', value: `${stockIn.toLocaleString('en-GB')} units` },
    { label: 'Total Stock Out', value: `${stockOut.toLocaleString('en-GB')} units` },
    {
      label: 'Net Stock Change',
      value: `${netChange >= 0 ? '+' : ''}${netChange.toLocaleString('en-GB')} units`,
    },
    { label: 'Avg. Movements per Day', value: avgMovementsPerDay },
    { label: 'Most Active Location', value: mostActiveLocation },
    { label: 'Most Moved Medication', value: mostMovedMedication },
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
    const next: MovementFilters = { dateFrom, dateTo, location, type: movementType, direction };
    setAppliedFilters(next);
    setPage(1);
    const count = filterRows(allRows, next).length;
    toast.success(
      'Report generated',
      `${count} movement${count !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleResetFilters() {
    setDateFrom(defaultRangeStart);
    setDateTo(today);
    setLocation('');
    setMovementType('');
    setDirection('');
    setAppliedFilters(null);
    setPage(1);
    toast.info('Filters reset', 'Showing the full movement ledger.');
  }

  const exportRows = useMemo(
    () => [
      [
        'Date',
        'Type',
        'Medication',
        'Strength',
        'Form',
        'Qty',
        'Direction',
        'Location',
        'Reference',
        'Performed By',
        'Value',
      ],
      ...filteredRows.map((r) => [
        `${formatHumanDate(r.date)} ${formatTime(r.date)}`,
        r.type,
        r.medicationName,
        r.strength,
        r.form,
        String(r.qty),
        r.direction,
        getPharmacyLocation(r.locationId as PharmacyLocationId).shortName,
        r.reference,
        r.performedBy,
        formatCurrency(r.totalValue),
      ]),
    ],
    [filteredRows],
  );

  function handleExportPDF() {
    const rowsHtml = filteredRows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(formatHumanDate(r.date))}</td><td>${escapeHtml(r.type)}</td><td>${escapeHtml(r.medicationName)} ${escapeHtml(r.strength)}</td><td>${r.qty}</td><td>${escapeHtml(r.direction)}</td><td>${escapeHtml(r.reference)}</td><td>${escapeHtml(formatCurrency(r.totalValue))}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'stock-movement-report',
      `<h1>Stock Movement Report</h1>
      <p class="meta">${escapeHtml(formatHumanDate(dateFrom))} – ${escapeHtml(formatHumanDate(dateTo))}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Date</th><th>Type</th><th>Medication</th><th>Qty</th><th>Direction</th><th>Reference</th><th>Value</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
    setExportMenuOpen(false);
    toast.success('Export ready', 'Stock Movement Report downloaded as PDF.');
  }

  function handleExportExcel() {
    downloadCSV('stock-movement-report-excel', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Stock Movement Report downloaded for Excel.');
  }

  function handleExportCSV() {
    downloadCSV('stock-movement-report', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Stock Movement Report downloaded as CSV.');
  }

  function handleScheduleReport(frequency: string, recipientEmail: string) {
    setScheduleModalOpen(false);
    toast.success('Report scheduled', `${frequency} delivery to ${recipientEmail} confirmed.`);
  }

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
              Stock Movement Report
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Stock Movement Report
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Every stock in, stock out, transfer, and adjustment across the pharmacy.
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  id="stock-movement-report-location"
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
                  Movement Type
                </label>
                <FormSelect
                  id="stock-movement-report-type"
                  value={movementType}
                  onChange={setMovementType}
                  options={MOVEMENT_TYPE_OPTIONS}
                  placeholder="All Types"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Direction
                </label>
                <FormSelect
                  id="stock-movement-report-direction"
                  value={direction}
                  onChange={setDirection}
                  options={MOVEMENT_DIRECTION_OPTIONS}
                  placeholder="In & Out"
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
            {STOCK_MOVEMENT_STAT_META.map((s) => (
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
                    Stock Movement Trend (Last 14 Days)
                  </p>
                  <MovementTrendChart data={trendData} colorIn="#16A34A" colorOut="#DC2626" />
                </div>

                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Movement by Type
                  </p>
                  <div className="mt-3 flex items-center gap-5">
                    <AnimatedDonutChart
                      breakdown={typeBreakdown}
                      total={typeTotal}
                      ariaLabel="Movement by type donut chart"
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
                    Total {typeTotal.toLocaleString('en-GB')} movements
                  </p>
                </div>
              </div>

              {/* ── Movement Details ─────────────────────────────────────────── */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 18, color: '#0D2630' }}
                >
                  Movement Details
                </p>

                <ScrollableTable minWidth={1440} maxHeight={640} className="mt-3">
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
                        Date &amp; Time
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Type
                      </span>
                    </div>
                    <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Medication
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
                    <div className="w-20 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Qty
                      </span>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Direction
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
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Reference
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Performed By
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Value (₦)
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
                        No movements match your filters
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
                    const typeCfg = MOVEMENT_TYPE_CFG[r.type];
                    const location = getPharmacyLocation(r.locationId as PharmacyLocationId);
                    return (
                      <div
                        key={r.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-28 shrink-0 py-3 pr-2 pl-3">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(r.date)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(r.date)}</p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: typeCfg.color,
                              border: `1px solid ${typeCfg.border}`,
                              background: typeCfg.bg,
                            }}
                          >
                            {r.type}
                          </span>
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
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.strength}</p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.form}</p>
                        </div>
                        <div className="w-20 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>{r.qty}</p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <span
                            className="font-sans font-semibold"
                            style={{
                              fontSize: 14,
                              color: r.direction === 'In' ? '#16A34A' : '#DC2626',
                            }}
                          >
                            {r.direction === 'In' ? '↓ In' : '↑ Out'}
                          </span>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={location.shortName}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {location.shortName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <Tooltip content={r.reference}>
                            <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                              {r.reference}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={r.performedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.performedBy}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatCurrency(r.totalValue)}
                          </p>
                        </div>
                        <div className="flex w-20 shrink-0 items-center justify-end py-3 pr-3">
                          <RowMenu record={r} onView={() => setDetailRecord(r)} />
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
                  itemLabel="movements"
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
                  Movement Summary
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {movementSummary.map((s) => (
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
                    Top Moved Medications
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
                  {topMovedMedications.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>No movements recorded yet.</p>
                  )}
                  {topMovedMedications.map((m) => (
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
                  Movements by Location
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {movementsByLocation.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>No movements recorded yet.</p>
                  )}
                  {movementsByLocation.map((l) => (
                    <div key={l.label} className="flex items-center justify-between gap-2">
                      <Tooltip content={l.label}>
                        <span className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {l.label}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        {l.count}
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
                  {netChange >= 0
                    ? `Stock grew by ${netChange.toLocaleString('en-GB')} units net over the period.`
                    : `Stock shrank by ${Math.abs(netChange).toLocaleString('en-GB')} units net over the period.`}{' '}
                  {mostActiveLocation} is the most active location, and {mostMovedMedication} moved
                  the most units.
                </p>
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex items-center gap-2 rounded-[12px] p-3.5"
            style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
          >
            <p style={{ fontSize: 14, color: '#0D2630' }}>
              Every row here traces back to a real receipt, transfer, adjustment, or return — Stock
              Receiving, Stock Transfers, Stock Adjustments, and Medication Returns all feed this
              ledger live.
            </p>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {detailRecord && (
        <StockMovementReportDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
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
