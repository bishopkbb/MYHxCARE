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
import { formatHumanDate, formatTime, toWATDateInput } from '@/utils/datetime';
import {
  DISPENSED_BY_OPTIONS,
  DISPENSING_BY_DEPARTMENT,
  DISPENSING_RECORDS,
  DISPENSING_REPORT_STATS,
  DISPENSING_SUMMARY,
  DISPENSING_TREND_DAILY,
  DISPENSING_TREND_MONTHLY,
  DISPENSING_TREND_WEEKLY,
  LOCATION_OPTIONS,
  PHARMACIST_OPTIONS,
  REPORT_DEPARTMENT_OPTIONS,
  TOP_DISPENSED_MEDICATIONS,
  TOP_DISPENSING_PHARMACISTS,
  type DispensingReportRecord,
  type DispensingTrendPoint,
  type ReportStat,
} from '@/features/pharmacy/__mocks__/dispensingReportFixtures';

const DispensingReportDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/DispensingReportDetailModal').then(
      (m) => m.DispensingReportDetailModal,
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
const ROWS_PER_PAGE_OPTIONS = [8, 10, 25, 50];

const PERIOD_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

// ── Stat card (same shell as Prescription Report's, every card here is a
// delta so it doesn't need the ratio/delta union) ──────────────────────────
function ReportStatCard({ stat }: { stat: ReportStat }) {
  const Icon = stat.icon;
  const isUp = stat.info.direction === 'up';
  const TrendIcon = isUp ? ArrowUp : ArrowDown;

  return (
    <div
      className="min-w-0 rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <Tooltip content={stat.label}>
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {stat.label}
          </p>
        </Tooltip>
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: stat.iconBg }}
        >
          <Icon style={{ width: 16, height: 16, color: stat.accent }} />
        </div>
      </div>
      <Tooltip content={stat.value}>
        <p
          className="font-display mt-2 truncate font-semibold"
          style={{ fontSize: 24, color: '#0D2630' }}
        >
          {stat.value}
        </p>
      </Tooltip>
      <p
        className="mt-0.5 flex items-center gap-1 font-sans font-medium"
        style={{ fontSize: 14, color: isUp ? '#16A34A' : '#DC2626' }}
      >
        <TrendIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
        {stat.info.percent}% vs {stat.info.comparedTo}
      </p>
    </div>
  );
}

// ── Dual-series line trend chart ────────────────────────────────────────────
function DualLineTrendChart({
  data,
  colorA,
  colorB,
  animate,
}: {
  data: DispensingTrendPoint[];
  colorA: string;
  colorB: string;
  animate: boolean;
}) {
  const maxValue = Math.max(...data.map((d) => Math.max(d.items, d.prescriptions)), 1);
  let tick = Math.ceil(maxValue / 4);
  if (tick > 100) tick = Math.ceil(tick / 20) * 20;
  else if (tick > 20) tick = Math.ceil(tick / 10) * 10;
  else if (tick > 5) tick = Math.ceil(tick / 5) * 5;
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];
  const W = 400;
  const H = 200;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;

  function pathFor(key: 'items' | 'prescriptions'): string {
    return data
      .map((d, i) => {
        const x = i * stepX;
        const y = H - (d[key] / niceMax) * H;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const xLabelIdx = [0, Math.floor(data.length / 2), data.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  return (
    <div>
      <div className="mt-1 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: colorA }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Items Dispensed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: colorB }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Prescriptions Dispensed</span>
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
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-0"
            style={{ height: 'calc(100% - 24px)', width: '100%' }}
            role="img"
            aria-label="Dispensing trend chart"
          >
            <path
              d={pathFor('items')}
              fill="none"
              stroke={colorA}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              style={{
                strokeDasharray: 1400,
                strokeDashoffset: animate ? 0 : 1400,
                transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
            <path
              d={pathFor('prescriptions')}
              fill="none"
              stroke={colorB}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              style={{
                strokeDasharray: 1400,
                strokeDashoffset: animate ? 0 : 1400,
                transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) 120ms',
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

// ── Row actions kebab menu ──────────────────────────────────────────────────
function RowMenu({
  record,
  onView,
  onPrint,
}: {
  record: DispensingReportRecord;
  onView: () => void;
  onPrint: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${record.id}`}
        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={180}>
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
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onPrint();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#00B4D8' }}
        >
          Print Receipt
        </button>
      </RowMenuPortal>
    </div>
  );
}

function isInRange(iso: string, from: string, to: string): boolean {
  const d = iso.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function DispensingReportWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [animateCharts, setAnimateCharts] = useState(false);
  // 30 days back so the default range comfortably covers DISPENSING_RECORDS'
  // sample — same reasoning as prescriptionReportFixtures.ts's own default.
  const defaultRangeStart = useMemo(() => {
    const d = new Date(toWATDateInput());
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const today = toWATDateInput();

  const [dateFrom, setDateFrom] = useState(defaultRangeStart);
  const [dateTo, setDateTo] = useState(today);
  const [location, setLocation] = useState('');
  const [pharmacist, setPharmacist] = useState('');
  const [department, setDepartment] = useState('');
  const [dispensedBy, setDispensedBy] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const [rows, setRows] = useState<DispensingReportRecord[]>(DISPENSING_RECORDS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [period, setPeriod] = useState('Daily');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<DispensingReportRecord | null>(null);

  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimateCharts(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

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

  function retriggerChartAnimation() {
    setAnimateCharts(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimateCharts(true));
    });
  }

  function applyFilters(): DispensingReportRecord[] {
    return DISPENSING_RECORDS.filter((r) => {
      if (!isInRange(r.date, dateFrom, dateTo)) return false;
      // Location is collected here but no DispensingReportRecord field
      // captures dispensing outlet yet — known limitation, same convention
      // as prescriptionReportFixtures.ts's own Location filter.
      if (pharmacist && r.dispensedBy !== pharmacist) return false;
      if (department && r.department !== department) return false;
      if (dispensedBy && r.dispensedBy !== dispensedBy) return false;
      return true;
    });
  }

  function handleGenerateReport() {
    const filtered = applyFilters();
    setRows(filtered);
    setPage(1);
    retriggerChartAnimation();
    toast.success(
      'Report generated',
      `${filtered.length} dispensing record${filtered.length !== 1 ? 's' : ''} for ${formatHumanDate(dateFrom)} – ${formatHumanDate(dateTo)}.`,
    );
  }

  function handleResetFilters() {
    setDateFrom(defaultRangeStart);
    setDateTo(today);
    setLocation('');
    setPharmacist('');
    setDepartment('');
    setDispensedBy('');
    setRows(DISPENSING_RECORDS);
    setPage(1);
    toast.info('Filters reset', 'Showing all dispensing records for the last 30 days.');
  }

  const exportRows = useMemo(
    () => [
      [
        'Prescription ID',
        'Date',
        'Patient',
        'MRN',
        'Medication',
        'Strength',
        'Form',
        'Qty Dispensed',
        'Dispensed By',
        'Department',
        'Total Value',
      ],
      ...rows.map((r) => [
        r.id,
        `${formatHumanDate(r.date)} ${formatTime(r.date)}`,
        r.patientName,
        r.mrn,
        r.medicationName,
        r.strength,
        r.form,
        String(r.qtyDispensed),
        r.dispensedBy,
        r.department,
        formatCurrency(r.totalValue),
      ]),
    ],
    [rows],
  );

  function handleExportPDF() {
    const rowsHtml = rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(formatHumanDate(r.date))}</td><td>${escapeHtml(r.patientName)}</td><td>${escapeHtml(r.medicationName)} ${escapeHtml(r.strength)}</td><td>${r.qtyDispensed}</td><td>${escapeHtml(r.dispensedBy)}</td><td>${escapeHtml(r.department)}</td><td>${escapeHtml(formatCurrency(r.totalValue))}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'dispensing-report',
      `<h1>Dispensing Report</h1>
      <p class="meta">${escapeHtml(formatHumanDate(dateFrom))} – ${escapeHtml(formatHumanDate(dateTo))}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Prescription ID</th><th>Date</th><th>Patient</th><th>Medication</th><th>Qty</th><th>Dispensed By</th><th>Department</th><th>Total Value</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
    setExportMenuOpen(false);
    toast.success('Export ready', 'Dispensing Report downloaded as PDF.');
  }

  function handleExportExcel() {
    downloadCSV('dispensing-report-excel', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Dispensing Report downloaded for Excel.');
  }

  function handleExportCSV() {
    downloadCSV('dispensing-report', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Dispensing Report downloaded as CSV.');
  }

  function handleScheduleReport(frequency: string, recipientEmail: string) {
    setScheduleModalOpen(false);
    toast.success('Report scheduled', `${frequency} delivery to ${recipientEmail} confirmed.`);
  }

  function handlePrintReceipt(record: DispensingReportRecord) {
    toast.info('Printing receipt', `Dispensing receipt for ${record.id} sent to printer.`);
  }

  const trendData =
    period === 'Weekly'
      ? DISPENSING_TREND_WEEKLY
      : period === 'Monthly'
        ? DISPENSING_TREND_MONTHLY
        : DISPENSING_TREND_DAILY;

  const departmentBreakdown = DISPENSING_BY_DEPARTMENT.map((d) => ({
    label: d.label,
    value: d.value,
    color: d.color,
  }));
  const departmentTotal = DISPENSING_BY_DEPARTMENT.reduce((sum, d) => sum + d.value, 0);

  const topDepartment = DISPENSING_BY_DEPARTMENT[0]!;
  const totalStat = DISPENSING_REPORT_STATS[0]!;

  const pageStart = (page - 1) * pageSize;
  const pageRows = rows.slice(pageStart, pageStart + pageSize);

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
              Dispensing Report
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Dispensing Report
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Comprehensive overview of medication dispensing activities.
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
                  id="dispensing-report-location"
                  value={location}
                  onChange={setLocation}
                  options={LOCATION_OPTIONS}
                  placeholder="All Locations"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Pharmacist
                </label>
                <FormSelect
                  id="dispensing-report-pharmacist"
                  value={pharmacist}
                  onChange={setPharmacist}
                  options={PHARMACIST_OPTIONS}
                  placeholder="All Pharmacists"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Department
                </label>
                <FormSelect
                  id="dispensing-report-department"
                  value={department}
                  onChange={setDepartment}
                  options={REPORT_DEPARTMENT_OPTIONS}
                  placeholder="All Departments"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Dispensed By
                </label>
                <FormSelect
                  id="dispensing-report-dispensed-by"
                  value={dispensedBy}
                  onChange={setDispensedBy}
                  options={DISPENSED_BY_OPTIONS}
                  placeholder="All (Including System)"
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
            {DISPENSING_REPORT_STATS.map((s) => (
              <ReportStatCard key={s.id} stat={s} />
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Dispensing Trend
                    </p>
                    <div style={{ width: 130 }}>
                      <FormSelect
                        id="dispensing-report-period"
                        value={period}
                        onChange={setPeriod}
                        options={PERIOD_OPTIONS}
                        placeholder="Daily"
                      />
                    </div>
                  </div>
                  <DualLineTrendChart
                    data={trendData}
                    colorA="#00B4D8"
                    colorB="#3B82F6"
                    animate={animateCharts}
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
                    Dispensing by Department
                  </p>
                  <div className="mt-3 flex items-center gap-5">
                    <AnimatedDonutChart
                      breakdown={departmentBreakdown}
                      total={departmentTotal}
                      ariaLabel="Dispensing by department donut chart"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {DISPENSING_BY_DEPARTMENT.map((d) => (
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
                            {d.value.toLocaleString('en-GB')} ({d.percent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Total {departmentTotal.toLocaleString('en-GB')}
                  </p>
                </div>
              </div>

              {/* ── Dispensing Details ───────────────────────────────────────── */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 18, color: '#0D2630' }}
                >
                  Dispensing Details
                </p>

                <div className="mt-3 overflow-x-auto scroll-smooth">
                  <div style={{ minWidth: 1472 }}>
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
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
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Prescription ID
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Patient
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
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Qty Dispensed
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Dispensed By
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Department
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
                          <FileText style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No dispensing records match your filters
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

                    {pageRows.map((r) => (
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
                          <Tooltip content={r.patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.patientName}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{r.mrn}</p>
                        </div>
                        <div className="min-w-[160px] flex-1 py-3 pr-2">
                          <Tooltip content={r.medicationName}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
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
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.qtyDispensed}</p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <Tooltip content={r.dispensedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.dispensedBy}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={r.department}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.department}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-44 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatCurrency(r.totalValue)}
                          </p>
                        </div>
                        <div className="flex w-20 shrink-0 items-center justify-end py-3 pr-3">
                          <RowMenu
                            record={r}
                            onView={() => setDetailRecord(r)}
                            onPrint={() => handlePrintReceipt(r)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={rows.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="dispensing records"
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
                  Dispensing Summary
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {DISPENSING_SUMMARY.map((s) => (
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
                    Top Dispensed Medications
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        'Top Dispensed Medications',
                        'Full medication breakdown is on the way.',
                      )
                    }
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View all
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {TOP_DISPENSED_MEDICATIONS.map((m) => (
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
                        {m.count} ({m.percent}%)
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
                    Top Dispensing Pharmacists
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        'Top Dispensing Pharmacists',
                        'Full pharmacist breakdown is on the way.',
                      )
                    }
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View all
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {TOP_DISPENSING_PHARMACISTS.map((p) => (
                    <div key={p.label} className="flex items-center justify-between gap-2">
                      <Tooltip content={p.label}>
                        <span className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {p.label}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        {p.count} ({p.percent}%)
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
                  Dispensed items increased by {totalStat.info.percent}% compared to{' '}
                  {totalStat.info.comparedTo}. {topDepartment.label} has the highest dispensing
                  volume.
                </p>
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex items-center gap-2 rounded-[12px] p-3.5"
            style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
          >
            <p style={{ fontSize: 14, color: '#0D2630' }}>
              All dispensing data is real-time and inclusive of manual and system generated records.
            </p>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {detailRecord && (
        <DispensingReportDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
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
