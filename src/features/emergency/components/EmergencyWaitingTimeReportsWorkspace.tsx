'use client';

import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  DoorOpen,
  FileBarChart,
  Hourglass,
  Info,
  Plus,
  RefreshCw,
  Stethoscope,
  TrendingDown,
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
  ACUITY_WAIT_BREAKDOWN,
  OVERALL_AVERAGE_MINUTES,
  WAIT_TIME_BENCHMARKS,
  WAIT_TIME_INSIGHTS,
  WAIT_TIME_STATS,
  WAIT_TIME_SUMMARY,
  WAIT_TIME_TREND,
  type WaitTimeSummaryRow,
  type WaitTimeTrendPoint,
} from '@/features/emergency/__mocks__/emergencyWaitingTimeFixtures';
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
type ChartMode = 'Daily' | 'Weekly';
type AcuityFilter = 'ALL' | TriagePriority;

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const STAT_ICONS = {
  total: Clock,
  triage: Hourglass,
  treatment: Stethoscope,
  discharge: DoorOpen,
  patients: Users,
};
const STAT_COLORS: Record<string, { color: string; bg: string }> = {
  total: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  triage: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  treatment: { color: '#EA580C', bg: 'rgba(234,88,12,0.1)' },
  discharge: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  patients: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
};

type TrendSeries = {
  key: string;
  label: string;
  color: string;
  points: { x: string; value: number }[];
};

function MultiTrendChart({ series }: { series: TrendSeries[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const pointCount = series[0]?.points.length ?? 0;
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const max = Math.max(...allValues, 1);
  const niceMax = Math.ceil(max / 60) * 60 || 60;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 200;
  const stepX = pointCount > 1 ? W / (pointCount - 1) : 0;

  const seriesPoints = series.map((s) => ({
    ...s,
    coords: s.points.map((p, i) => ({
      x: pointCount > 1 ? i * stepX : W / 2,
      y: H - (p.value / niceMax) * H,
    })),
  }));

  const labelStep = pointCount > 8 ? Math.ceil(pointCount / 8) : 1;
  const xLabelIdx = Array.from({ length: pointCount }, (_, i) => i).filter(
    (i) => i % labelStep === 0,
  );

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || pointCount === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(pointCount - 1, Math.round(relX / stepX)));
    setHoverIdx(idx);
  }

  return (
    <div className="mt-2 flex gap-3" style={{ height: 240 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 42 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {formatMinutes(t)}
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
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 cursor-crosshair"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {hoverIdx !== null && stepX > 0 && (
            <line
              x1={hoverIdx * stepX}
              y1={0}
              x2={hoverIdx * stepX}
              y2={H}
              stroke="rgba(0,100,130,0.25)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {seriesPoints.map((s) => (
            <g key={s.key}>
              <path
                d={s.coords
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                  .join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {s.coords.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hoverIdx === i ? 5 : 3}
                  fill={s.color}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ))}
        </svg>
        {hoverIdx !== null && (
          <div
            className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
            style={{
              left: `${((hoverIdx * stepX) / W) * 100}%`,
              top: 0,
              transform: 'translate(-50%, 0)',
              background: '#0D2630',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{series[0]?.points[hoverIdx]?.x}</p>
            {series.map((s) => (
              <p
                key={s.key}
                className="font-sans font-semibold"
                style={{ fontSize: 14, color: s.color }}
              >
                {s.label}: {formatMinutes(s.points[hoverIdx]?.value ?? 0)}
              </p>
            ))}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
          {xLabelIdx.map((i) => (
            <span key={i} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {series[0]?.points[i]?.x}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmergencyWaitingTimeReportsWorkspace() {
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
  const [acuityFilter, setAcuityFilter] = useState<AcuityFilter>('ALL');
  const [openFilter, setOpenFilter] = useState<'location' | 'shift' | 'acuity' | null>(null);

  const [chartMode, setChartMode] = useState<ChartMode>('Daily');
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
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

  function inRange(iso: string): boolean {
    const t = new Date(iso).getTime();
    const from = new Date(fromDate).getTime();
    const to = new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1;
    return t >= from && t <= to;
  }

  const filteredTrend = WAIT_TIME_TREND.filter(
    (p) =>
      inRange(p.date) &&
      (locationFilter === 'ALL' || p.location === locationFilter) &&
      (shiftFilter === 'ALL' || p.shift === shiftFilter),
  );

  const filteredSummary = WAIT_TIME_SUMMARY.filter(
    (r) =>
      inRange(r.date) &&
      (locationFilter === 'ALL' || r.location === locationFilter) &&
      (shiftFilter === 'ALL' || r.shift === shiftFilter),
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function bucketWeekly(points: WaitTimeTrendPoint[]): WaitTimeTrendPoint[] {
    const buckets: WaitTimeTrendPoint[][] = [];
    for (let i = 0; i < points.length; i += 7) buckets.push(points.slice(i, i + 7));
    return buckets
      .filter((b) => b.length > 0)
      .map((b) => {
        const avg = (sel: (p: WaitTimeTrendPoint) => number) =>
          Math.round(b.reduce((sum, p) => sum + sel(p), 0) / b.length);
        return {
          date: b[b.length - 1]!.date,
          label: `${b[0]!.label} – ${b[b.length - 1]!.label}`,
          totalMinutes: avg((p) => p.totalMinutes),
          triageMinutes: avg((p) => p.triageMinutes),
          treatmentMinutes: avg((p) => p.treatmentMinutes),
          dischargeMinutes: avg((p) => p.dischargeMinutes),
          location: b[0]!.location,
          shift: b[0]!.shift,
        };
      });
  }

  const chartPoints = chartMode === 'Daily' ? filteredTrend : bucketWeekly(filteredTrend);

  const ALL_SERIES: TrendSeries[] = [
    {
      key: 'total',
      label: 'Total Wait Time',
      color: '#2563EB',
      points: chartPoints.map((p) => ({ x: p.label, value: p.totalMinutes })),
    },
    {
      key: 'triage',
      label: 'Triage Wait Time',
      color: '#16A34A',
      points: chartPoints.map((p) => ({ x: p.label, value: p.triageMinutes })),
    },
    {
      key: 'treatment',
      label: 'Treatment Wait Time',
      color: '#EA580C',
      points: chartPoints.map((p) => ({ x: p.label, value: p.treatmentMinutes })),
    },
    {
      key: 'discharge',
      label: 'Discharge Wait Time',
      color: '#7C3AED',
      points: chartPoints.map((p) => ({ x: p.label, value: p.dischargeMinutes })),
    },
  ];
  const visibleSeries = ALL_SERIES.filter((s) => !hiddenSeries.has(s.key));

  const acuityBreakdown =
    acuityFilter === 'ALL'
      ? ACUITY_WAIT_BREAKDOWN
      : ACUITY_WAIT_BREAKDOWN.filter((a) => a.priority === acuityFilter);
  const overallAverageMinutes =
    acuityFilter === 'ALL'
      ? OVERALL_AVERAGE_MINUTES
      : (acuityBreakdown[0]?.minutes ?? OVERALL_AVERAGE_MINUTES);
  const donutTotal = acuityBreakdown.reduce((sum, a) => sum + a.minutes, 0);

  const totalPatientsInRange = filteredSummary.reduce((sum, r) => sum + r.totalPatients, 0);

  function toggleSeries(key: string) {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleReset() {
    setFromDate(toDateInputValue(new Date(now - 7 * 24 * 60 * 60 * 1000)));
    setToDate(toDateInputValue(new Date(now)));
    setLocationFilter('ALL');
    setShiftFilter('ALL');
    setAcuityFilter('ALL');
  }

  function buildSummaryBody(rows: WaitTimeSummaryRow[]) {
    return `
      <h1>Waiting Time Report</h1>
      <p class="meta">${escapeHtml(fromDate)} – ${escapeHtml(toDate)}</p>
      <hr>
      <h3>Key Metrics</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
      ${WAIT_TIME_STATS.map((s) => `<tr><td>${escapeHtml(s.label)}</td><td>${escapeHtml(s.value)}</td></tr>`).join('')}
      </tbody></table>
      <h3>Waiting Time Summary by Time Period</h3>
      <table><thead><tr><th>Time Period</th><th>Total Patients</th><th>Triage Avg</th><th>Treatment Avg</th><th>Discharge Avg</th><th>Total Avg</th></tr></thead><tbody>
      ${rows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.label)}</td><td>${r.totalPatients}</td><td>${formatMinutes(r.triageAvg)}</td><td>${formatMinutes(r.treatmentAvg)}</td><td>${formatMinutes(r.dischargeAvg)}</td><td>${formatMinutes(r.totalAvg)}</td></tr>`,
        )
        .join('')}
      </tbody></table>
    `;
  }

  function handleGenerateReport() {
    downloadPDF('waiting-time-report', buildSummaryBody(filteredSummary));
    toast.success('Report generated', 'Waiting Time Report is ready and has been downloaded.');
  }

  function handleExportBulk(format: 'PDF' | 'CSV') {
    if (format === 'PDF') {
      downloadPDF('waiting-time-report', buildSummaryBody(filteredSummary));
    } else {
      downloadCSV('waiting-time-report', [
        [
          'Time Period',
          'Total Patients',
          'Triage Avg (m)',
          'Triage 90th (m)',
          'Treatment Avg (m)',
          'Treatment 90th (m)',
          'Discharge Avg (m)',
          'Discharge 90th (m)',
          'Total Avg (m)',
          'Total 90th (m)',
        ],
        ...filteredSummary.map((r) => [
          r.label,
          String(r.totalPatients),
          String(r.triageAvg),
          String(r.triage90th),
          String(r.treatmentAvg),
          String(r.treatment90th),
          String(r.dischargeAvg),
          String(r.discharge90th),
          String(r.totalAvg),
          String(r.total90th),
        ]),
      ]);
    }
    setExportMenuOpen(false);
    toast.success('Export ready', `Waiting Time Report exported as ${format}.`);
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

  const FILTER_DEFS: { key: 'location' | 'shift' | 'acuity'; def: FilterDef }[] = [
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
      key: 'acuity',
      def: {
        key: 'acuity',
        defaultLabel: 'All Acuity Levels',
        options: (['IMMEDIATE', 'URGENT', 'LESS_URGENT', 'NON_URGENT'] as TriagePriority[]).map(
          (p) => ({
            value: p,
            label: TRIAGE_DISPLAY[p].label,
          }),
        ),
      },
    },
  ];
  const filterValue: Record<string, string> = {
    location: locationFilter,
    shift: shiftFilter,
    acuity: acuityFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    location: setLocationFilter,
    shift: setShiftFilter,
    acuity: (v) => setAcuityFilter(v as AcuityFilter),
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <Info style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Waiting Time Reports
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
            Waiting Time Reports
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock style={{ width: 22, height: 22, color: '#00B4D8' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Waiting Time Reports
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Analyze patient wait times across triage, treatment and discharge stages.
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
              {WAIT_TIME_STATS.map((s) => {
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

            {/* Trend + Donut */}
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Average Wait Time Trend
                    </h2>
                    <Tooltip content="Hover over the chart to see exact values for each stage. Click a legend item to hide/show it.">
                      <Info style={{ width: 14, height: 14, color: '#8A98A3' }} />
                    </Tooltip>
                  </div>
                  <div
                    className="flex items-center rounded-[8px] p-0.5"
                    style={{ background: '#F5FBFD' }}
                  >
                    {(['Daily', 'Weekly'] as ChartMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setChartMode(mode)}
                        className={`rounded-[6px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: chartMode === mode ? '#FFFFFF' : '#4A7080',
                          background: chartMode === mode ? '#0D2630' : 'transparent',
                        }}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {ALL_SERIES.map((s) => {
                    const isHidden = hiddenSeries.has(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleSeries(s.key)}
                        className={`flex items-center gap-1.5 rounded-[6px] px-1.5 py-1 transition-opacity duration-150 ${FOCUS_RING}`}
                        style={{ opacity: isHidden ? 0.4 : 1 }}
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: s.color }}
                        />
                        <span style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
                {chartPoints.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      No data in the selected date range.
                    </p>
                  </div>
                ) : (
                  <MultiTrendChart series={visibleSeries} />
                )}
              </div>

              <div
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Average Wait Time by Triage Acuity
                </h2>
                <div className="mt-4 flex items-center gap-5">
                  <AnimatedDonutChart
                    breakdown={acuityBreakdown.map((a) => ({
                      label: a.label,
                      value: a.minutes,
                      color: a.color,
                    }))}
                    total={donutTotal}
                    size={132}
                    ariaLabel="Average wait time by triage acuity donut chart"
                    centerValue={formatMinutes(overallAverageMinutes)}
                    centerLabel="Overall Average"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {ACUITY_WAIT_BREAKDOWN.map((a) => (
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
                          {formatMinutes(a.minutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Based on {totalPatientsInRange.toLocaleString('en-GB')} patients
                </p>
              </div>
            </div>

            {/* Summary table */}
            <div
              className="mt-4 rounded-[12px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p
                className="font-display px-4 pt-4 font-semibold"
                style={{ fontSize: 16, color: '#0D2630' }}
              >
                Waiting Time Summary by Time Period
              </p>
              {filteredSummary.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <FileBarChart style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    No data found
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    Try a different date range or filter combination.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-2">
                    <ScrollableTable minWidth={1100}>
                      <div
                        className={TABLE_HEADER_STICKY_CLASS}
                        style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                      >
                        <div className="flex items-center">
                          <div className="min-w-[150px] flex-1 shrink-0 px-2 py-2" />
                          <div className="w-24 shrink-0 px-2 py-2" />
                          {[
                            ['Triage Wait Time', '#16A34A'],
                            ['Treatment Wait Time', '#EA580C'],
                            ['Discharge Wait Time', '#7C3AED'],
                            ['Total Wait Time', '#2563EB'],
                          ].map(([label, color]) => (
                            <div key={label} className="w-48 shrink-0 px-2 py-2 text-center">
                              <span
                                className="font-sans font-bold whitespace-nowrap"
                                style={{ fontSize: 14, color }}
                              >
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center">
                          <div className="min-w-[150px] flex-1 shrink-0 px-2 py-2">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Time Period
                            </span>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-2 text-center">
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Patients
                            </span>
                          </div>
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex w-48 shrink-0 items-center">
                              <div className="w-24 shrink-0 px-2 py-2 text-center">
                                <span
                                  className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  Average
                                </span>
                              </div>
                              <div className="w-24 shrink-0 px-2 py-2 text-center">
                                <span
                                  className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  90th Pctl
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {filteredSummary.map((r) => (
                        <div
                          key={r.date}
                          className="flex items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="min-w-[150px] flex-1 px-2 py-3">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.label}
                            </p>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{r.totalPatients}</p>
                          </div>
                          {[
                            [r.triageAvg, r.triage90th],
                            [r.treatmentAvg, r.treatment90th],
                            [r.dischargeAvg, r.discharge90th],
                            [r.totalAvg, r.total90th],
                          ].map(([avg, p90], i) => (
                            <div key={i} className="flex w-48 shrink-0 items-center">
                              <div className="w-24 shrink-0 px-2 py-3 text-center">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>
                                  {formatMinutes(avg!)}
                                </p>
                              </div>
                              <div className="w-24 shrink-0 px-2 py-3 text-center">
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {formatMinutes(p90!)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </ScrollableTable>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Showing 1 to {filteredSummary.length} of {filteredSummary.length} days
                    </p>
                    <button
                      type="button"
                      onClick={() => handleQuickAction('Full Details')}
                      className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View Full Details
                    </button>
                  </div>
                </>
              )}
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
                      {WAIT_TIME_INSIGHTS.busiestDay} ({WAIT_TIME_INSIGHTS.busiestDayDetail})
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
                      Peak Hours
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {WAIT_TIME_INSIGHTS.peakHours} ({WAIT_TIME_INSIGHTS.peakHoursDetail})
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
                      Longest Wait Time
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {WAIT_TIME_INSIGHTS.longestWait} ({WAIT_TIME_INSIGHTS.longestWaitDetail})
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <TrendingDown
                    style={{ width: 16, height: 16, color: '#16A34A' }}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Improvement
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      {WAIT_TIME_INSIGHTS.improvementPercent}%{' '}
                      {WAIT_TIME_INSIGHTS.improvementDetail}
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
                Wait Time Benchmarks
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Based on recommended targets</p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {WAIT_TIME_BENCHMARKS.map((b) => {
                  const isOver = b.actualMinutes > b.targetMinutes;
                  return (
                    <div key={b.label} className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>{b.label}</span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: isOver ? '#DC2626' : '#0D2630' }}
                      >
                        &lt; {formatMinutes(b.targetMinutes)}
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
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() => handleQuickAction('Custom Report Builder')}
                    className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    Create Custom Report
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() => handleQuickAction('Compare Time Periods')}
                  className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <FileBarChart style={{ width: 14, height: 14 }} />
                  Compare Time Periods
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAction('Report Templates')}
                  className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <FileBarChart style={{ width: 14, height: 14 }} />
                  View Report Templates
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
