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
import { formatHumanDate, formatTime, toWATDateInput } from '@/utils/datetime';
import {
  ADR_CAUSALITY_COLOR,
  ADR_CAUSALITY_OPTIONS,
  ADR_DRUG_CLASS_OPTIONS,
  ADR_SEVERITY_COLOR,
  ADR_SEVERITY_OPTIONS,
  ADR_STATUS_COLOR,
  ADR_STATUS_OPTIONS,
  type ADRReport,
  type ADRSeverity,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { useADRReports } from '@/features/pharmacy/store/adrReportStore';
import { ADR_REPORT_STAT_META } from '@/features/pharmacy/__mocks__/adrReportFixtures';

const ADRReportRowModal = dynamic(
  () => import('@/features/pharmacy/components/ADRReportRowModal').then((m) => m.ADRReportRowModal),
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

type ADRFilters = {
  dateFrom: string;
  dateTo: string;
  drugClass: string;
  severity: string;
  causality: string;
  status: string;
};

function computeTopDrugClasses(rows: ADRReport[]): { label: string; count: number }[] {
  const byClass = new Map<string, number>();
  for (const r of rows) byClass.set(r.drugClass, (byClass.get(r.drugClass) ?? 0) + 1);
  return Array.from(byClass.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}

function computeTopReporters(rows: ADRReport[]): { label: string; count: number }[] {
  const byReporter = new Map<string, number>();
  for (const r of rows) byReporter.set(r.reportedBy, (byReporter.get(r.reportedBy) ?? 0) + 1);
  return Array.from(byReporter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}

function filterRows(rows: ADRReport[], filters: ADRFilters | null): ADRReport[] {
  if (!filters) return rows;
  return rows.filter((r) => {
    const d = r.reportedAt.slice(0, 10);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo && d > filters.dateTo) return false;
    if (filters.drugClass && r.drugClass !== filters.drugClass) return false;
    if (filters.severity && r.severity !== filters.severity) return false;
    if (filters.causality && r.causality !== filters.causality) return false;
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
  icon: (typeof ADR_REPORT_STAT_META)[number]['icon'];
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

// ── ADR trend bar chart — real, bucketed from actual reportedAt dates ───────
function ADRTrendChart({
  data,
  color,
}: {
  data: { label: string; count: number }[];
  color: string;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const maxValue = Math.max(...data.map((d) => d.count), 1);
  let tick = Math.ceil(maxValue / 4);
  if (tick > 20) tick = Math.ceil(tick / 10) * 10;
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
                  background: color,
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

function RowMenu({ report, onView }: { report: ADRReport; onView: () => void }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${report.id}`}
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

export function ADRReportWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const allRows = useADRReports();

  const defaultRangeStart = useMemo(() => {
    const d = new Date(toWATDateInput());
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const today = toWATDateInput();

  const [dateFrom, setDateFrom] = useState(defaultRangeStart);
  const [dateTo, setDateTo] = useState(today);
  const [drugClass, setDrugClass] = useState('');
  const [severity, setSeverity] = useState('');
  const [causality, setCausality] = useState('');
  const [status, setStatus] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [detailReport, setDetailReport] = useState<ADRReport | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Every stat card, chart, and sidebar panel always describes the full
  // report log — Generate Report's filters scope only the details table,
  // same convention as every other report screen in this suite.
  const [appliedFilters, setAppliedFilters] = useState<ADRFilters | null>(null);
  const filteredRows = useMemo(
    () => filterRows(allRows, appliedFilters),
    [allRows, appliedFilters],
  );

  const underAssessment = allRows.filter((r) => r.status === 'Under Assessment');
  const resolved = allRows.filter((r) => r.status === 'Resolved');
  const reportedToNPC = allRows.filter((r) => r.status === 'Reported to NPC');
  const serious = allRows.filter((r) => r.severity === 'Severe');
  const uniqueDrugs = new Set(allRows.flatMap((r) => r.suspectedDrugs)).size;

  const statValues: Record<string, string> = {
    'total-reports': allRows.length.toLocaleString('en-GB'),
    'under-assessment': underAssessment.length.toLocaleString('en-GB'),
    resolved: resolved.length.toLocaleString('en-GB'),
    'reported-npc': reportedToNPC.length.toLocaleString('en-GB'),
    serious: serious.length.toLocaleString('en-GB'),
    'unique-drugs': uniqueDrugs.toLocaleString('en-GB'),
  };

  const trendData = useMemo(() => {
    const days = 14;
    const buckets: { label: string; count: number }[] = [];
    const now = new Date(toWATDateInput());
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = allRows.filter((r) => r.reportedAt.slice(0, 10) === key).length;
      buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, count });
    }
    return buckets;
  }, [allRows]);

  const severityBreakdown = useMemo(() => {
    const byLabel = new Map<ADRSeverity, number>();
    for (const r of allRows) byLabel.set(r.severity, (byLabel.get(r.severity) ?? 0) + 1);
    return Array.from(byLabel.entries())
      .filter(([, count]) => count > 0)
      .map(([sev, count]) => ({
        label: sev,
        value: count,
        color: ADR_SEVERITY_COLOR[sev].color,
      }));
  }, [allRows]);
  const severityTotal = severityBreakdown.reduce((sum, d) => sum + d.value, 0) || 1;

  // Plain (unmemoized) — cheap grouping over at most a few hundred rows, and
  // the React Compiler can't preserve manual memoization for these two once
  // this large a component accumulates enough hooks, so there's nothing
  // useMemo would actually buy here.
  const topDrugClasses = computeTopDrugClasses(allRows);
  const topReporters = computeTopReporters(allRows);

  const uniquePatients = new Set(allRows.map((r) => r.patientId)).size;
  const decided = resolved.length + reportedToNPC.length;
  const resolutionRate =
    allRows.length > 0 ? ((resolved.length / allRows.length) * 100).toFixed(1) : '0';
  const npcRate =
    allRows.length > 0 ? ((reportedToNPC.length / allRows.length) * 100).toFixed(1) : '0';

  const adrSummary: { label: string; value: string }[] = [
    { label: 'Serious (Severe) Reports', value: serious.length.toLocaleString('en-GB') },
    { label: 'Under Assessment', value: underAssessment.length.toLocaleString('en-GB') },
    { label: 'Resolution Rate', value: `${resolutionRate}%` },
    { label: 'Reported to NPC Rate', value: `${npcRate}%` },
    { label: 'Unique Patients Affected', value: uniquePatients.toLocaleString('en-GB') },
    { label: 'Cases Closed', value: decided.toLocaleString('en-GB') },
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
    const next: ADRFilters = { dateFrom, dateTo, drugClass, severity, causality, status };
    setAppliedFilters(next);
    setPage(1);
    const count = filterRows(allRows, next).length;
    toast.success(
      'Report generated',
      `${count} ADR report${count !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function handleResetFilters() {
    setDateFrom(defaultRangeStart);
    setDateTo(today);
    setDrugClass('');
    setSeverity('');
    setCausality('');
    setStatus('');
    setAppliedFilters(null);
    setPage(1);
    toast.info('Filters reset', 'Showing the full ADR report log.');
  }

  const exportRows = useMemo(
    () => [
      [
        'Report ID',
        'Date',
        'Patient',
        'MRN',
        'Suspected Drug(s)',
        'Drug Class',
        'Reaction',
        'Severity',
        'Causality',
        'Status',
        'Reported By',
      ],
      ...filteredRows.map((r) => [
        r.id,
        `${formatHumanDate(r.reportedAt)} ${formatTime(r.reportedAt)}`,
        r.patientName,
        r.mrn,
        r.suspectedDrugs.join(', '),
        r.drugClass,
        r.reaction,
        r.severity,
        r.causality,
        r.status,
        r.reportedBy,
      ]),
    ],
    [filteredRows],
  );

  function handleExportPDF() {
    const rowsHtml = filteredRows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(formatHumanDate(r.reportedAt))}</td><td>${escapeHtml(r.patientName)}</td><td>${escapeHtml(r.suspectedDrugs.join(', '))}</td><td>${escapeHtml(r.severity)}</td><td>${escapeHtml(r.status)}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'adr-report',
      `<h1>ADR Report</h1>
      <p class="meta">${escapeHtml(formatHumanDate(dateFrom))} – ${escapeHtml(formatHumanDate(dateTo))}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Report ID</th><th>Date</th><th>Patient</th><th>Suspected Drug(s)</th><th>Severity</th><th>Status</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
    setExportMenuOpen(false);
    toast.success('Export ready', 'ADR Report downloaded as PDF.');
  }

  function handleExportExcel() {
    downloadCSV('adr-report-excel', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'ADR Report downloaded for Excel.');
  }

  function handleExportCSV() {
    downloadCSV('adr-report', exportRows);
    setExportMenuOpen(false);
    toast.success('Export ready', 'ADR Report downloaded as CSV.');
  }

  function handleScheduleReport(frequency: string, recipientEmail: string) {
    setScheduleModalOpen(false);
    toast.success('Report scheduled', `${frequency} delivery to ${recipientEmail} confirmed.`);
  }

  const topDrugClass = topDrugClasses[0];

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
              ADR Report
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                ADR Report
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Track adverse drug reaction reports from assessment through to closure.
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
                  Drug Class
                </label>
                <FormSelect
                  id="adr-report-drug-class"
                  value={drugClass}
                  onChange={setDrugClass}
                  options={ADR_DRUG_CLASS_OPTIONS}
                  placeholder="All Drug Classes"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Severity
                </label>
                <FormSelect
                  id="adr-report-severity"
                  value={severity}
                  onChange={setSeverity}
                  options={ADR_SEVERITY_OPTIONS}
                  placeholder="All Severities"
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Causality
                </label>
                <FormSelect
                  id="adr-report-causality"
                  value={causality}
                  onChange={setCausality}
                  options={ADR_CAUSALITY_OPTIONS}
                  placeholder="All Causalities"
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
                  id="adr-report-status"
                  value={status}
                  onChange={setStatus}
                  options={ADR_STATUS_OPTIONS}
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
            {ADR_REPORT_STAT_META.map((s) => (
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
                    ADR Reports Trend (Last 14 Days)
                  </p>
                  <ADRTrendChart data={trendData} color="#00B4D8" />
                </div>

                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Reports by Severity
                  </p>
                  <div className="mt-3 flex items-center gap-5">
                    <AnimatedDonutChart
                      breakdown={severityBreakdown}
                      total={severityTotal}
                      ariaLabel="Reports by severity donut chart"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {severityBreakdown.map((d) => (
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
                            {d.value} ({((d.value / severityTotal) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Total {severityTotal.toLocaleString('en-GB')} reports
                  </p>
                </div>
              </div>

              {/* ── ADR Details ───────────────────────────────────────────────── */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 18, color: '#0D2630' }}
                >
                  ADR Details
                </p>

                <ScrollableTable minWidth={1500} maxHeight={640} className="mt-3">
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
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Report ID
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
                      </span>
                    </div>
                    <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Suspected Drug(s)
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Drug Class
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Reaction
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Severity
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Causality
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
                        Reported By
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
                        No ADR reports match your filters
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
                    const severityCfg = ADR_SEVERITY_COLOR[r.severity];
                    const causalityCfg = ADR_CAUSALITY_COLOR[r.causality];
                    const statusCfg = ADR_STATUS_COLOR[r.status];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-28 shrink-0 py-3 pr-2 pl-3">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(r.reportedAt)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatTime(r.reportedAt)}
                          </p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <Tooltip content={r.id}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              {r.id}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
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
                          <Tooltip content={r.suspectedDrugs.join(', ')}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.suspectedDrugs.join(', ')}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{r.drugClass}</p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={r.reaction}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.reaction}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: severityCfg.color,
                              border: `1px solid ${severityCfg.border}`,
                              background: severityCfg.bg,
                            }}
                          >
                            {r.severity}
                          </span>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: causalityCfg.color,
                              border: `1px solid ${causalityCfg.border}`,
                              background: causalityCfg.bg,
                            }}
                          >
                            {r.causality}
                          </span>
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
                          <Tooltip content={r.reportedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.reportedBy}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="flex w-20 shrink-0 items-center justify-end py-3 pr-3">
                          <RowMenu report={r} onView={() => setDetailReport(r)} />
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
                  itemLabel="reports"
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
                  ADR Summary
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {adrSummary.map((s) => (
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
                    Top Suspected Drug Classes
                  </h2>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.pharmacyAdr)}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View all
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {topDrugClasses.map((c) => (
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
                        {c.count} (
                        {allRows.length > 0 ? ((c.count / allRows.length) * 100).toFixed(1) : 0}%)
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
                  Top Reporters
                </h2>
                <div className="mt-3 flex flex-col gap-2.5">
                  {topReporters.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>No reports filed yet.</p>
                  )}
                  {topReporters.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-2">
                      <Tooltip content={r.label}>
                        <span className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {r.label}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        {r.count} reports
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
                  {serious.length} report{serious.length !== 1 ? 's are' : ' is'} classified Severe,
                  and {underAssessment.length} case
                  {underAssessment.length !== 1 ? 's remain' : ' remains'} under assessment.
                  {topDrugClass ? ` ${topDrugClass.label} accounts for the most reports.` : ''}
                </p>
              </div>
            </div>
          </div>

          <div
            className="mt-5 flex items-center gap-2 rounded-[12px] p-3.5"
            style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
          >
            <p style={{ fontSize: 14, color: '#0D2630' }}>
              This is the same live report log Adverse Drug Reactions shows — filing a new report
              there appears here immediately.
            </p>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {detailReport && (
        <ADRReportRowModal report={detailReport} onClose={() => setDetailReport(null)} />
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
