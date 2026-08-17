'use client';

import {
  Award,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileBarChart,
  MoreVertical,
  RefreshCcw,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { FormDateInput } from '@components/shared/FormDateInput';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { TRIAGE_DISPLAY, type TriagePriority } from '@/utils/triage';
import {
  NURSE_PERFORMANCE,
  TRIAGE_ACUITY_BREAKDOWN,
  TRIAGE_INSIGHTS,
  TRIAGE_STATS,
  type NursePerformanceRow,
} from '@/features/emergency/__mocks__/emergencyTriagePerformanceFixtures';
import {
  REPORT_LOCATIONS,
  REPORT_SHIFTS,
} from '@/features/emergency/__mocks__/emergencyReportsFixtures';
import type { ScheduleReportInput } from '@/features/emergency/components/ScheduleReportModal';

const ScheduleReportModal = dynamic(
  () => import('./ScheduleReportModal').then((m) => m.ScheduleReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type AcuityFilter = 'ALL' | TriagePriority;

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const PRIORITIES: TriagePriority[] = ['IMMEDIATE', 'URGENT', 'LESS_URGENT', 'NON_URGENT'];

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const STAT_ICONS = {
  total: Users,
  avgTime: Target,
  accuracy: CheckCircle2,
  retriaged: RefreshCcw,
  under5: Clock,
};
const STAT_COLORS: Record<string, { color: string; bg: string }> = {
  total: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  avgTime: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  accuracy: { color: '#EA580C', bg: 'rgba(234,88,12,0.1)' },
  retriaged: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  under5: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
};

function NurseRowMenu({
  open,
  onToggle,
  onViewProfile,
  onExport,
}: {
  open: boolean;
  onToggle: () => void;
  onViewProfile: () => void;
  onExport: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={190}>
        <button
          type="button"
          onClick={onViewProfile}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Eye style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View Profile
        </button>
        <button
          type="button"
          onClick={onExport}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
          Export Data
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function EmergencyTriagePerformanceReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [now] = useState(() => Date.now());
  const [pageState, setPageState] = useState<PageState>('loading');

  const [fromDate, setFromDate] = useState(() =>
    toDateInputValue(new Date(now - 7 * 24 * 60 * 60 * 1000)),
  );
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date(now)));
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [nurseFilter, setNurseFilter] = useState('ALL');
  const [acuityFilter, setAcuityFilter] = useState<AcuityFilter>('ALL');
  const [openFilter, setOpenFilter] = useState<'location' | 'shift' | 'nurse' | 'acuity' | null>(
    null,
  );

  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const filteredNurses = NURSE_PERFORMANCE.filter(
    (n) =>
      (nurseFilter === 'ALL' || n.id === nurseFilter) &&
      (locationFilter === 'ALL' || n.location === locationFilter) &&
      (shiftFilter === 'ALL' || n.shift === shiftFilter),
  );

  const acuityBreakdown =
    acuityFilter === 'ALL'
      ? TRIAGE_ACUITY_BREAKDOWN
      : TRIAGE_ACUITY_BREAKDOWN.filter((a) => a.priority === acuityFilter);
  const acuityTotal = acuityBreakdown.reduce((sum, a) => sum + a.count, 0);
  const maxAvgMinutes = Math.max(...acuityBreakdown.map((a) => a.avgMinutes), 1);

  function handleReset() {
    setFromDate(toDateInputValue(new Date(now - 7 * 24 * 60 * 60 * 1000)));
    setToDate(toDateInputValue(new Date(now)));
    setLocationFilter('ALL');
    setShiftFilter('ALL');
    setNurseFilter('ALL');
    setAcuityFilter('ALL');
  }

  function buildSummaryBody(rows: NursePerformanceRow[]) {
    return `
      <h1>Triage Performance Report</h1>
      <p class="meta">${escapeHtml(fromDate)} – ${escapeHtml(toDate)}</p>
      <hr>
      <h3>Key Metrics</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
      ${TRIAGE_STATS.map((s) => `<tr><td>${escapeHtml(s.label)}</td><td>${escapeHtml(s.value)}</td></tr>`).join('')}
      </tbody></table>
      <h3>Triage Performance by Nurse</h3>
      <table><thead><tr><th>Nurse Name</th><th>Total Triaged</th><th>Overall Avg (min)</th><th>Accuracy Rate</th><th>Re-triaged</th><th>&lt; 5 min</th></tr></thead><tbody>
      ${rows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.name)}</td><td>${r.totalTriaged}</td><td>${r.avgOverallMinutes}m</td><td>${r.accuracyPercent}%</td><td>${r.retriagedCount} (${r.retriagedPercent}%)</td><td>${r.under5Count} (${r.under5Percent}%)</td></tr>`,
        )
        .join('')}
      </tbody></table>
    `;
  }

  function handleGenerateReport() {
    downloadPDF('triage-performance-report', buildSummaryBody(filteredNurses));
    toast.success(
      'Report generated',
      'Triage Performance Report is ready and has been downloaded.',
    );
  }

  function handleExportBulk(format: 'PDF' | 'CSV') {
    if (format === 'PDF') {
      downloadPDF('triage-performance-report', buildSummaryBody(filteredNurses));
    } else {
      downloadCSV('triage-performance-report', [
        [
          'Nurse Name',
          'Total Triaged',
          'Overall Avg (min)',
          'Accuracy Rate (%)',
          'Re-triaged',
          'Re-triaged (%)',
          '< 5 min',
          '< 5 min (%)',
        ],
        ...filteredNurses.map((r) => [
          r.name,
          String(r.totalTriaged),
          String(r.avgOverallMinutes),
          String(r.accuracyPercent),
          String(r.retriagedCount),
          String(r.retriagedPercent),
          String(r.under5Count),
          String(r.under5Percent),
        ]),
      ]);
    }
    setExportMenuOpen(false);
    toast.success('Export ready', `Triage Performance Report exported as ${format}.`);
  }

  function handleExportNurse(row: NursePerformanceRow) {
    downloadCSV(`triage-performance-${row.name.toLowerCase().replace(/\s+/g, '-')}`, [
      ['Metric', 'Value'],
      ['Total Triaged', String(row.totalTriaged)],
      ['Overall Avg (min)', String(row.avgOverallMinutes)],
      ...PRIORITIES.map((p) => [
        `${TRIAGE_DISPLAY[p].label} Avg (min)`,
        String(row.avgByPriority[p]),
      ]),
      ['Accuracy Rate (%)', String(row.accuracyPercent)],
      ['Re-triaged', `${row.retriagedCount} (${row.retriagedPercent}%)`],
      ['< 5 min', `${row.under5Count} (${row.under5Percent}%)`],
    ]);
    toast.success('Export ready', `${row.name}'s data has been exported.`);
  }

  function handleScheduleSubmit(input: ScheduleReportInput) {
    setShowSchedule(false);
    toast.success(
      'Report scheduled',
      `${input.reportType} will be sent ${input.frequency.toLowerCase()} to ${input.recipients}.`,
    );
  }

  function handleQuickAction(label: string) {
    toast.info(label, 'This feature is on the roadmap and not yet available.');
  }

  const FILTER_DEFS: { key: 'location' | 'shift' | 'nurse' | 'acuity'; def: FilterDef }[] = [
    {
      key: 'location',
      def: {
        key: 'location',
        defaultLabel: 'All Locations',
        options: REPORT_LOCATIONS.map((l) => ({ value: l, label: l })),
      },
    },
    {
      key: 'shift',
      def: {
        key: 'shift',
        defaultLabel: 'All Shifts',
        options: REPORT_SHIFTS.map((s) => ({ value: s, label: s })),
      },
    },
    {
      key: 'nurse',
      def: {
        key: 'nurse',
        defaultLabel: 'All Nurses',
        options: NURSE_PERFORMANCE.map((n) => ({ value: n.id, label: n.name })),
      },
    },
    {
      key: 'acuity',
      def: {
        key: 'acuity',
        defaultLabel: 'All Levels',
        options: PRIORITIES.map((p) => ({ value: p, label: TRIAGE_DISPLAY[p].label })),
      },
    },
  ];
  const filterValue: Record<string, string> = {
    location: locationFilter,
    shift: shiftFilter,
    nurse: nurseFilter,
    acuity: acuityFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    location: setLocationFilter,
    shift: setShiftFilter,
    nurse: setNurseFilter,
    acuity: (v) => setAcuityFilter(v as AcuityFilter),
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertTriangle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Triage Performance Reports
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (pageState === 'loading') {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-64 animate-pulse rounded-[12px] bg-slate-100" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergency)}
            className={`font-sans transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            Home
          </button>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergencyReports)}
            className={`font-sans transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            Reports
          </button>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
            Triage Performance Reports
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 style={{ width: 22, height: 22, color: '#00B4D8' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Triage Performance Reports
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Monitor and evaluate triage activities, accuracy, and response times.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
              <button
                type="button"
                onClick={() => setShowSchedule(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Calendar style={{ width: 15, height: 15 }} />
                Schedule Report
              </button>
            </PermissionGate>
            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((p) => !p)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0D2630' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export
                <ChevronDown style={{ width: 14, height: 14 }} />
              </button>
              {exportMenuOpen && (
                <div
                  className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-20 mt-1 w-44 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
                  style={{
                    border: '1px solid rgba(0,100,130,0.12)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleExportBulk('PDF')}
                    className={`flex w-full items-center px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Export as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportBulk('CSV')}
                    className={`flex w-full items-center px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_320px] 2xl:items-start">
          <div className="min-w-0">
            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {TRIAGE_STATS.map((s) => {
                const Icon = STAT_ICONS[s.key as keyof typeof STAT_ICONS]!;
                const cfg = STAT_COLORS[s.key]!;
                const isGood = s.direction === s.goodDirection;
                return (
                  <div
                    key={s.key}
                    className="flex items-start gap-3 rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: cfg.bg }}
                    >
                      <Icon style={{ width: 20, height: 20, color: cfg.color }} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.label}</p>
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 20, color: '#0D2630' }}
                      >
                        {s.value}
                      </p>
                      <p style={{ fontSize: 14, color: isGood ? '#16A34A' : '#DC2626' }}>
                        {s.direction === 'up' ? '↑' : '↓'} {s.deltaPercent}% vs last 7 days
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filter bar */}
            <div
              className="mt-4 flex flex-wrap items-end gap-2.5 rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div>
                <label
                  className="mb-1.5 block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <FormDateInput
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    aria-label="From date"
                    max={toDate}
                  />
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>–</span>
                  <FormDateInput
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    aria-label="To date"
                    min={fromDate}
                  />
                </div>
              </div>
              {FILTER_DEFS.map(({ key, def }) => (
                <FilterDropdown
                  key={key}
                  def={def}
                  value={filterValue[key] ?? 'ALL'}
                  isOpen={openFilter === key}
                  onToggle={() => setOpenFilter((prev) => (prev === key ? null : key))}
                  onSelect={(v) => {
                    filterSetter[key]?.(v);
                    setOpenFilter(null);
                  }}
                />
              ))}
              <button
                type="button"
                onClick={handleReset}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Reset
              </button>
              <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  className={`ml-auto flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#0D2630' }}
                >
                  Generate Report
                </button>
              </PermissionGate>
            </div>

            {/* Three panels */}
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Triage Volume by Acuity Level
                </h2>
                <div className="mt-4 flex flex-col items-center gap-4">
                  <AnimatedDonutChart
                    breakdown={acuityBreakdown.map((a) => ({
                      label: a.label,
                      value: a.count,
                      color: a.color,
                    }))}
                    total={acuityTotal}
                    size={150}
                    ariaLabel="Triage volume by acuity level donut chart"
                    centerValue={acuityTotal.toLocaleString('en-GB')}
                    centerLabel="Total"
                  />
                  <div className="flex w-full flex-col gap-2">
                    {acuityBreakdown.map((a) => (
                      <div key={a.priority} className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: a.color }}
                          />
                          <Tooltip content={a.label}>
                            <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {a.label}
                            </span>
                          </Tooltip>
                        </div>
                        <span
                          className="shrink-0 font-sans font-medium whitespace-nowrap"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.count.toLocaleString('en-GB')} (
                          {((a.count / Math.max(1, acuityTotal)) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
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
                  Average Triage Time by Acuity Level
                </h2>
                <div className="mt-4 flex flex-col gap-3.5">
                  {acuityBreakdown.map((a) => (
                    <div key={a.priority}>
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#4A7080' }}>{a.label}</span>
                        <span
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.avgMinutes}m
                        </span>
                      </div>
                      <div
                        className="mt-1 h-2.5 w-full overflow-hidden rounded-full"
                        style={{ background: '#F5FBFD' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(a.avgMinutes / maxAvgMinutes) * 100}%`,
                            background: a.color,
                          }}
                        />
                      </div>
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
                  Triage Accuracy Rate by Acuity Level
                </h2>
                <div className="mt-4 flex flex-col gap-3">
                  {acuityBreakdown.map((a) => (
                    <div key={a.priority} className="flex items-center gap-2.5">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full"
                        style={{ border: `2px solid ${a.color}` }}
                      >
                        <span className="size-2 rounded-full" style={{ background: a.color }} />
                      </span>
                      <Tooltip content={a.label}>
                        <span
                          className="min-w-0 flex-1 truncate"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {a.label}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-bold whitespace-nowrap"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {a.accuracyPercent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Nurse performance table */}
            <div
              className="mt-4 rounded-[12px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p
                className="font-display px-4 pt-4 font-semibold"
                style={{ fontSize: 16, color: '#0D2630' }}
              >
                Triage Performance by Nurse
              </p>
              {filteredNurses.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <FileBarChart style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    No nurses found
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    Try a different filter combination.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-2">
                    <ScrollableTable minWidth={1350}>
                      <div
                        className={TABLE_HEADER_STICKY_CLASS}
                        style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                      >
                        <div className="flex items-center">
                          <div className="w-10 shrink-0 px-2 py-2" />
                          <div className="min-w-[130px] flex-1 shrink-0 px-2 py-2" />
                          <div className="w-24 shrink-0 px-2 py-2" />
                          <div className="w-[300px] shrink-0 px-2 py-2 text-center">
                            <span
                              className="font-sans font-bold whitespace-nowrap"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Average Triage Time (min)
                            </span>
                          </div>
                          <div className="w-28 shrink-0 px-2 py-2" />
                          <div className="w-24 shrink-0 px-2 py-2" />
                          <div className="w-24 shrink-0 px-2 py-2" />
                          <div className="w-24 shrink-0 px-2 py-2" />
                          <div className="w-20 shrink-0 px-2 py-2" />
                        </div>
                        <div className="flex items-center">
                          <div className="w-10 shrink-0 px-2 py-2 text-center">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              #
                            </span>
                          </div>
                          <div className="min-w-[130px] flex-1 shrink-0 px-2 py-2">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Nurse Name
                            </span>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-2 text-center">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Total
                            </span>
                          </div>
                          <div className="w-[60px] shrink-0 px-1 py-2 text-center">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Overall
                            </span>
                          </div>
                          {PRIORITIES.map((p) => (
                            <div key={p} className="w-[60px] shrink-0 px-1 py-2 text-center">
                              <span
                                className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                {TRIAGE_DISPLAY[p].shortLabel}
                              </span>
                            </div>
                          ))}
                          <div className="w-28 shrink-0 px-2 py-2 text-center">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Accuracy
                            </span>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-2 text-center">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Re-triaged
                            </span>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-2 text-center">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              &lt; 5 min
                            </span>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-2 text-center">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Trend
                            </span>
                          </div>
                          <div className="w-20 shrink-0 px-2 py-2" />
                        </div>
                      </div>
                      {filteredNurses.map((r, i) => (
                        <div
                          key={r.id}
                          className="flex items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-10 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{i + 1}</p>
                          </div>
                          <div className="min-w-[130px] flex-1 px-2 py-3">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.name}
                            </p>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{r.totalTriaged}</p>
                          </div>
                          <div className="w-[60px] shrink-0 px-1 py-3 text-center">
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.avgOverallMinutes}
                            </p>
                          </div>
                          {PRIORITIES.map((p) => (
                            <div key={p} className="w-[60px] shrink-0 px-1 py-3 text-center">
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{r.avgByPriority[p]}</p>
                            </div>
                          ))}
                          <div className="w-28 shrink-0 px-2 py-3 text-center">
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#16A34A' }}
                            >
                              {r.accuracyPercent}%
                            </p>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.retriagedCount} ({r.retriagedPercent}%)
                            </p>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.under5Count} ({r.under5Percent}%)
                            </p>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-3 text-center">
                            <p
                              style={{
                                fontSize: 14,
                                color: r.trendDirection === 'up' ? '#16A34A' : '#DC2626',
                              }}
                            >
                              {r.trendDirection === 'up' ? '↑' : '↓'} {r.trendPercent}%
                            </p>
                          </div>
                          <div className="flex w-20 shrink-0 items-center justify-center gap-1 px-2 py-3">
                            <button
                              type="button"
                              onClick={() => handleQuickAction('Nurse Performance Detail')}
                              aria-label="View nurse profile"
                              className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                            </button>
                            <NurseRowMenu
                              open={openRowMenuId === r.id}
                              onToggle={() =>
                                setOpenRowMenuId((prev) => (prev === r.id ? null : r.id))
                              }
                              onViewProfile={() => {
                                setOpenRowMenuId(null);
                                handleQuickAction('Nurse Performance Detail');
                              }}
                              onExport={() => {
                                setOpenRowMenuId(null);
                                handleExportNurse(r);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </ScrollableTable>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Showing 1 to {filteredNurses.length} of {filteredNurses.length} nurses
                    </p>
                  </div>
                </>
              )}
            </div>

            <div
              className="mt-4 flex items-start gap-2.5 rounded-[12px] p-4"
              style={{
                background: 'rgba(0,180,216,0.06)',
                border: '1px solid rgba(0,180,216,0.2)',
              }}
            >
              <FileBarChart
                style={{ width: 16, height: 16, color: '#00B4D8' }}
                className="mt-0.5 shrink-0"
              />
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                Triage performance is calculated based on time from patient arrival to triage
                completion and comparison with final disposition.
              </p>
            </div>

            <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
              All times are current. Data updates automatically.
            </p>
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Insights{' '}
                <span style={{ fontSize: 14, color: '#8A98A3', fontWeight: 400 }}>
                  (This Period)
                </span>
              </p>
              <div className="mt-2.5 flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <TrendingUp
                    style={{ width: 16, height: 16, color: '#2563EB' }}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Busiest Day
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {TRIAGE_INSIGHTS.busiestDay} ({TRIAGE_INSIGHTS.busiestDayDetail})
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock
                    style={{ width: 16, height: 16, color: '#D97706' }}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Peak Hour
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{TRIAGE_INSIGHTS.peakHour}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Award
                    style={{ width: 16, height: 16, color: '#16A34A' }}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Best Performing Nurse
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {TRIAGE_INSIGHTS.bestPerformingNurse} (
                      {TRIAGE_INSIGHTS.bestPerformingNurseDetail})
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    style={{ width: 16, height: 16, color: '#DC2626' }}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Longest Avg Triage Time
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {TRIAGE_INSIGHTS.longestAvgTriageLabel} (
                      {TRIAGE_INSIGHTS.longestAvgTriageDetail})
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <TrendingUp
                    style={{ width: 16, height: 16, color: '#16A34A' }}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Improvement in Accuracy
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      ↑ {TRIAGE_INSIGHTS.improvementPercent}% vs last 7 days
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Triage Accuracy Benchmark
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Based on recommended targets</p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {TRIAGE_ACUITY_BREAKDOWN.map((a) => {
                  const isBelow = a.accuracyPercent < a.benchmarkPercent;
                  return (
                    <div key={a.priority} className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>{a.label}</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: isBelow ? '#DC2626' : '#0D2630' }}
                      >
                        ≥ {a.benchmarkPercent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAction('Compare Nurses')}
                  className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Users style={{ width: 14, height: 14 }} />
                  Compare Nurses
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAction('View Nurse Performance')}
                  className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <BarChart3 style={{ width: 14, height: 14 }} />
                  View Nurse Performance
                </button>
                <button
                  type="button"
                  onClick={() => handleExportBulk('CSV')}
                  className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  Export Detailed Data
                </button>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() => setShowSchedule(true)}
                    className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Calendar style={{ width: 14, height: 14 }} />
                    Schedule New Report
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSchedule && (
        <ScheduleReportModal
          onClose={() => setShowSchedule(false)}
          onSubmit={handleScheduleSubmit}
        />
      )}
    </main>
  );
}
