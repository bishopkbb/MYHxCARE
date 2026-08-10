'use client';

import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileClock,
  FlaskConical,
  Hourglass,
  Printer,
  RotateCcw,
  Timer,
  TestTube,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
import { formatHumanDate } from '@/utils/datetime';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import {
  formatHms,
  getTatTrendSeries,
  overallAvgTatSeconds,
  overallLongestTatSeconds,
  sumTatField,
  TAT_DEPARTMENT_ROWS,
  TAT_PERIOD_OPTIONS,
  TAT_TARGETS,
  type TatPeriod,
  type TatTrendPoint,
} from '@/features/laboratory/__mocks__/tatReportsFixtures';
import { FOCUS_RING, ReportDonutCard, ReportStatCard } from './reports/reportShared';
import { TatByDepartmentTab } from './tat/TatByDepartmentTab';
import { TatByTestTab } from './tat/TatByTestTab';
import { TatComplianceTab } from './tat/TatComplianceTab';
import { TatDelayedResultsTab } from './tat/TatDelayedResultsTab';
import { TatMonthlyTrendTab } from './tat/TatMonthlyTrendTab';
import { TatPerformanceSummaryTab } from './tat/TatPerformanceSummaryTab';
import { TatPriorityTab } from './tat/TatPriorityTab';

const ScheduleReportModal = dynamic(
  () => import('./ScheduleReportModal').then((m) => m.ScheduleReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const ROWS_PER_PAGE = 10;

type TatTabKey =
  | 'overview'
  | 'by-department'
  | 'by-test'
  | 'stat-vs-routine'
  | 'delayed-results'
  | 'tat-compliance'
  | 'monthly-trend'
  | 'performance-summary';

const TABS: { key: TatTabKey; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'by-department', label: 'By Department', icon: Building2 },
  { key: 'by-test', label: 'By Test', icon: FlaskConical },
  { key: 'stat-vs-routine', label: 'STAT vs Routine', icon: Zap },
  { key: 'delayed-results', label: 'Delayed Results', icon: Clock },
  { key: 'tat-compliance', label: 'TAT Compliance', icon: CheckCircle2 },
  { key: 'monthly-trend', label: 'Monthly Trend', icon: TrendingUp },
  { key: 'performance-summary', label: 'Performance Summary', icon: FileClock },
];

const TEST_CATEGORY_OPTIONS = [
  { value: 'Hematology Tests', label: 'Hematology Tests' },
  { value: 'Chemistry Panels', label: 'Chemistry Panels' },
  { value: 'Microbiology Cultures', label: 'Microbiology Cultures' },
  { value: 'Immunology Assays', label: 'Immunology Assays' },
  { value: 'Serology Tests', label: 'Serology Tests' },
];
const TEST_OPTIONS = [
  { value: 'Full Blood Count (FBC)', label: 'Full Blood Count (FBC)' },
  { value: 'Malaria Parasite (MP)', label: 'Malaria Parasite (MP)' },
  { value: 'Widal Test', label: 'Widal Test' },
  { value: 'Urinalysis (U/E)', label: 'Urinalysis (U/E)' },
  { value: 'Liver Function Test', label: 'Liver Function Test' },
  { value: 'Blood Culture', label: 'Blood Culture' },
];
const SAMPLE_TYPE_OPTIONS = [
  { value: 'Whole Blood (EDTA)', label: 'Whole Blood (EDTA)' },
  { value: 'Serum', label: 'Serum' },
  { value: 'Urine', label: 'Urine' },
  { value: 'Swab', label: 'Swab' },
  { value: 'Stool', label: 'Stool' },
];
const PRIORITY_OPTIONS = [
  { value: 'STAT', label: 'STAT' },
  { value: 'Routine', label: 'Routine' },
  { value: 'Low', label: 'Low' },
];
const TAT_STATUS_OPTIONS = [
  { value: 'Within Target', label: 'Within Target' },
  { value: 'Delayed', label: 'Delayed' },
];

function PeriodDropdown({
  value,
  onChange,
}: {
  value: TatPeriod;
  onChange: (v: TatPeriod) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
        style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
      >
        {value}
        <ChevronDown
          style={{
            width: 13,
            height: 13,
            transition: 'transform 150ms',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={160}>
        {TAT_PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              onChange(opt);
              setOpen(false);
            }}
            className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
            style={{
              fontSize: 14,
              color: value === opt ? '#00B4D8' : '#2F3A40',
              fontWeight: value === opt ? 600 : 400,
            }}
          >
            {opt}
          </button>
        ))}
      </RowMenuPortal>
    </div>
  );
}

function TatTrendChart({ data }: { data: TatTrendPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...data.map((d) => Math.max(d.thisMonthSeconds, d.lastMonthSeconds)), 1);
  const niceMax = Math.ceil(max / 3600) * 3600 || 3600;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const toY = (seconds: number) => H - (seconds / niceMax) * H;
  const thisPoints = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: toY(d.thisMonthSeconds),
  }));
  const lastPoints = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: toY(d.lastMonthSeconds),
  }));
  const pathFor = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const xLabelIdx = [0, 4, 9, 14, 19, 24, 29].filter((v) => v < data.length);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX / stepX)));
    setHoverIdx(idx);
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredThis = hoverIdx !== null ? thisPoints[hoverIdx] : null;

  return (
    <div className="mt-2 flex gap-3" style={{ height: 260 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 50 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {formatHms(t).slice(0, 5)}
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
          <path
            d={pathFor(lastPoints)}
            fill="none"
            stroke="#B8C4CC"
            strokeWidth={2}
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={pathFor(thisPoints)}
            fill="none"
            stroke="#00B4D8"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {hoveredThis && (
            <line
              x1={hoveredThis.x}
              y1={0}
              x2={hoveredThis.x}
              y2={H}
              stroke="rgba(0,100,130,0.25)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {thisPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#00B4D8"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {hovered && hoveredThis && (
          <div
            className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
            style={{
              left: `${(hoveredThis.x / W) * 100}%`,
              top: Math.max(0, (hoveredThis.y / H) * (260 - 24) - 76),
              transform: 'translateX(-50%)',
              background: '#0D2630',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{formatHumanDate(hovered.date)}</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
              This Month: {formatHms(hovered.thisMonthSeconds)}
            </p>
            <p className="font-sans" style={{ fontSize: 14, color: '#B8C4CC' }}>
              Last Month: {formatHms(hovered.lastMonthSeconds)}
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
          {xLabelIdx.map((i) => (
            <span key={i} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {data[i]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TurnaroundTimeReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TatTabKey>('overview');
  const [period, setPeriod] = useState<TatPeriod>('This Month');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ROWS_PER_PAGE);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const [dateFrom, setDateFrom] = useState('2026-06-01');
  const [dateTo, setDateTo] = useState('2026-06-30');
  const [department, setDepartment] = useState('');
  const [testCategory, setTestCategory] = useState('');
  const [test, setTest] = useState('');
  const [sampleType, setSampleType] = useState('');
  const [priority, setPriority] = useState('');
  const [tatStatus, setTatStatus] = useState('');
  const [appliedDepartment, setAppliedDepartment] = useState('');

  const series = useMemo(() => getTatTrendSeries(), []);

  const totalTests = sumTatField('totalTests');
  const withinTarget = sumTatField('withinTarget');
  const delayed = sumTatField('delayed');
  const compliancePct = totalTests > 0 ? (withinTarget / totalTests) * 100 : 0;
  const avgTat = overallAvgTatSeconds();
  const longest = overallLongestTatSeconds();

  const rows = useMemo(
    () =>
      TAT_DEPARTMENT_ROWS.filter((r) => !appliedDepartment || r.department === appliedDepartment),
    [appliedDepartment],
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize);

  const hasActiveFilters =
    department !== '' ||
    testCategory !== '' ||
    test !== '' ||
    sampleType !== '' ||
    priority !== '' ||
    tatStatus !== '';

  function resetFilters() {
    setDepartment('');
    setTestCategory('');
    setTest('');
    setSampleType('');
    setPriority('');
    setTatStatus('');
    setAppliedDepartment('');
    setPage(1);
  }

  function applyFilters() {
    setAppliedDepartment(department);
    setPage(1);
    const activeCount = [department, testCategory, test, sampleType, priority, tatStatus].filter(
      Boolean,
    ).length;
    toast.success(
      'Filters applied',
      activeCount > 0
        ? `${activeCount} filter${activeCount !== 1 ? 's' : ''} active — showing ${department || 'all'} department${department ? '' : 's'}.`
        : 'No filters active — showing all departments.',
    );
  }

  function buildTableRows(): string[][] {
    return [
      ...rows.map((r) => [
        r.department,
        String(r.totalTests),
        formatHms(r.avgTatSeconds),
        String(r.withinTarget),
        String(r.delayed),
        `${((r.withinTarget / r.totalTests) * 100).toFixed(1)}%`,
        formatHms(r.longestTatSeconds),
      ]),
      [
        'Total',
        String(totalTests),
        formatHms(avgTat),
        String(withinTarget),
        String(delayed),
        `${compliancePct.toFixed(1)}%`,
        formatHms(longest.seconds),
      ],
    ];
  }

  function handleExport() {
    downloadCSV('tat-report-overview', [
      [
        'Department',
        'Total Tests',
        'Avg TAT',
        'Within Target',
        'Delayed',
        'Compliance Rate',
        'Longest TAT',
      ],
      ...buildTableRows(),
    ]);
    toast.success('Export ready', 'Turnaround Time report downloaded as CSV.');
  }

  function handlePrint() {
    const rowsHtml = buildTableRows()
      .map(
        (r, i) =>
          `<tr${i === buildTableRows().length - 1 ? ' style="font-weight:600"' : ''}><td>${r.map(escapeHtml).join('</td><td>')}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'tat-report-overview',
      `<h1>Turnaround Time (TAT) Report — ${escapeHtml(period)}</h1><p class="meta">Overall Avg TAT ${escapeHtml(formatHms(avgTat))} · Compliance ${compliancePct.toFixed(1)}% · Within Target ${withinTarget.toLocaleString('en-GB')} · Delayed ${delayed.toLocaleString('en-GB')}</p><hr/><table><thead><tr><th>Department</th><th>Total Tests</th><th>Avg TAT</th><th>Within Target</th><th>Delayed</th><th>Compliance</th><th>Longest TAT</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
    );
    toast.success('Preparing report', 'Turnaround Time report opened in a new tab.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
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
            <span style={{ color: '#4A7080' }}>Reports</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Turnaround Time (TAT) Reports
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Turnaround Time (TAT) Reports
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Monitor and analyze turnaround time performance across tests, departments and time
                periods.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export Report
              </button>
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Calendar style={{ width: 15, height: 15 }} />
                Schedule Report
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Printer style={{ width: 15, height: 15 }} />
                Print Report
              </button>
            </div>
          </div>

          {/* ── Tabs + period ───────────────────────────────────────────── */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex gap-1 overflow-x-auto scroll-smooth rounded-[12px] px-2 py-2"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {TABS.map((t) => {
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-2 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: active ? '#00B4D8' : '#4A7080',
                      background: active ? 'rgba(0,180,216,0.08)' : 'transparent',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <PeriodDropdown value={period} onChange={setPeriod} />
          </div>

          {activeTab === 'by-department' ? (
            <div className="mt-4">
              <TatByDepartmentTab />
            </div>
          ) : activeTab === 'by-test' ? (
            <div className="mt-4">
              <TatByTestTab />
            </div>
          ) : activeTab === 'stat-vs-routine' ? (
            <div className="mt-4">
              <TatPriorityTab />
            </div>
          ) : activeTab === 'delayed-results' ? (
            <div className="mt-4">
              <TatDelayedResultsTab />
            </div>
          ) : activeTab === 'tat-compliance' ? (
            <div className="mt-4">
              <TatComplianceTab />
            </div>
          ) : activeTab === 'monthly-trend' ? (
            <div className="mt-4">
              <TatMonthlyTrendTab />
            </div>
          ) : activeTab === 'performance-summary' ? (
            <div className="mt-4">
              <TatPerformanceSummaryTab />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {/* ── Stat cards ──────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <ReportStatCard
                  icon={Clock}
                  iconColor="#00B4D8"
                  iconBg="rgba(0,180,216,0.12)"
                  label="Overall Avg TAT"
                  value={formatHms(avgTat)}
                  info={period}
                />
                <ReportStatCard
                  icon={CheckCircle2}
                  iconColor="#16A34A"
                  iconBg="rgba(34,197,94,0.12)"
                  label="TAT Compliance"
                  value={`${compliancePct.toFixed(1)}%`}
                  info={period}
                  infoColor="#16A34A"
                />
                <ReportStatCard
                  icon={Hourglass}
                  iconColor="#D97706"
                  iconBg="rgba(245,158,11,0.12)"
                  label="Within Target"
                  value={withinTarget.toLocaleString('en-GB')}
                  info={period}
                />
                <ReportStatCard
                  icon={AlertTriangle}
                  iconColor="#DC2626"
                  iconBg="rgba(239,68,68,0.12)"
                  label="Delayed Results"
                  value={delayed.toLocaleString('en-GB')}
                  info={period}
                  infoColor="#DC2626"
                />
                <ReportStatCard
                  icon={Timer}
                  iconColor="#7C3AED"
                  iconBg="rgba(124,58,237,0.12)"
                  label="Longest TAT"
                  value={formatHms(longest.seconds)}
                  info={longest.department}
                />
                <ReportStatCard
                  icon={TestTube}
                  iconColor="#2563EB"
                  iconBg="rgba(37,99,235,0.12)"
                  label="Total Tests"
                  value={totalTests.toLocaleString('en-GB')}
                  info={period}
                />
              </div>

              {/* ── Trend + Compliance donut ──────────────────────────── */}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div
                  className="rounded-[12px] p-4 xl:col-span-2"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Average TAT Trend
                    </h2>
                    <div className="flex items-center gap-4">
                      <span
                        className="flex items-center gap-1.5"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        <span
                          className="h-0.5 w-4 rounded-full"
                          style={{ background: '#00B4D8' }}
                        />
                        This Month
                      </span>
                      <span
                        className="flex items-center gap-1.5"
                        style={{ fontSize: 14, color: '#8A98A3' }}
                      >
                        <span
                          className="h-0.5 w-4 rounded-full"
                          style={{ background: '#B8C4CC' }}
                        />
                        Last Month
                      </span>
                    </div>
                  </div>
                  <TatTrendChart data={series} />
                </div>

                <ReportDonutCard
                  title="TAT Compliance Rate"
                  breakdown={[
                    { label: 'Within Target', value: withinTarget, color: '#16A34A' },
                    { label: 'Delayed', value: delayed, color: '#DC2626' },
                  ]}
                  total={totalTests}
                  centerValue={`${compliancePct.toFixed(1)}%`}
                  centerLabel="Compliance"
                />
              </div>

              {/* ── Table + Sidebar ─────────────────────────────────────── */}
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  {/* ── Department table ───────────────────────────────── */}
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      TAT by Department
                    </h2>
                    <div className="mt-3">
                      <ScrollableTable minWidth={1240}>
                        <div
                          className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                          style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                        >
                          {[
                            ['Department', 'min-w-[160px] flex-1'],
                            ['Total Tests', 'w-32'],
                            ['Avg TAT', 'w-32'],
                            ['Within Target', 'w-36'],
                            ['Delayed', 'w-28'],
                            ['Compliance Rate', 'w-44'],
                            ['Longest TAT', 'w-32'],
                            ['Trend', 'w-32'],
                          ].map(([label, width]) => (
                            <div
                              key={label}
                              className={`${width} shrink-0 py-2.5 pr-2 pl-3 text-center`}
                            >
                              <span
                                className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                        {pageRows.map((r) => {
                          const rate = (r.withinTarget / r.totalTests) * 100;
                          const isUp = r.complianceTrendPct >= 0;
                          return (
                            <div
                              key={r.department}
                              className="flex items-center"
                              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                            >
                              <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3 text-center">
                                <Tooltip content={r.department}>
                                  <p
                                    className="truncate font-sans font-medium"
                                    style={{ fontSize: 14, color: '#00B4D8' }}
                                  >
                                    {r.department}
                                  </p>
                                </Tooltip>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2 text-center">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>
                                  {r.totalTests.toLocaleString('en-GB')}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2 text-center">
                                <p
                                  className="whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {formatHms(r.avgTatSeconds)}
                                </p>
                              </div>
                              <div className="w-36 shrink-0 py-3 pr-2 text-center">
                                <p style={{ fontSize: 14, color: '#16A34A' }}>
                                  {r.withinTarget.toLocaleString('en-GB')}
                                </p>
                              </div>
                              <div className="w-28 shrink-0 py-3 pr-2 text-center">
                                <p style={{ fontSize: 14, color: '#DC2626' }}>
                                  {r.delayed.toLocaleString('en-GB')}
                                </p>
                              </div>
                              <div className="w-44 shrink-0 py-3 pr-2 text-center">
                                <p
                                  style={{
                                    fontSize: 14,
                                    color:
                                      rate >= 90 ? '#16A34A' : rate >= 80 ? '#D97706' : '#DC2626',
                                  }}
                                >
                                  {rate.toFixed(1)}%
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2 text-center">
                                <p
                                  className="whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {formatHms(r.longestTatSeconds)}
                                </p>
                              </div>
                              <div className="w-32 shrink-0 py-3 pr-2 text-center">
                                <p
                                  className="font-sans font-medium whitespace-nowrap"
                                  style={{ fontSize: 14, color: isUp ? '#16A34A' : '#DC2626' }}
                                >
                                  {isUp ? '↑' : '↓'} {Math.abs(r.complianceTrendPct).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex items-center" style={{ background: '#F5FBFD' }}>
                          <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              Total
                            </p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {totalTests.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold whitespace-nowrap"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatHms(avgTat)}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {withinTarget.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {delayed.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {compliancePct.toFixed(1)}%
                            </p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold whitespace-nowrap"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatHms(longest.seconds)}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#16A34A' }}
                            >
                              ↑ 4.6%
                            </p>
                          </div>
                        </div>
                      </ScrollableTable>
                    </div>
                    <Pagination
                      page={safePage}
                      pageSize={pageSize}
                      totalItems={rows.length}
                      onPageChange={setPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                      }}
                      itemLabel="departments"
                      pageSizeOptions={[5, 10, 25]}
                    />
                  </div>
                </div>

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Filters
                      </h2>
                      <button
                        type="button"
                        onClick={resetFilters}
                        disabled={!hasActiveFilters}
                        className={`flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40 ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        <RotateCcw style={{ width: 13, height: 13 }} />
                        Reset
                      </button>
                    </div>

                    <div className="mt-3 flex flex-col gap-3">
                      <div>
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Date Range
                        </label>
                        <div className="flex flex-col gap-2">
                          <FormDateInput
                            value={dateFrom}
                            max={dateTo}
                            onChange={(e) => setDateFrom(e.target.value)}
                            aria-label="From date"
                          />
                          <div className="flex items-center gap-2">
                            <span className="shrink-0" style={{ color: '#8A98A3', fontSize: 14 }}>
                              to
                            </span>
                          </div>
                          <FormDateInput
                            value={dateTo}
                            min={dateFrom}
                            onChange={(e) => setDateTo(e.target.value)}
                            aria-label="To date"
                          />
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
                          id="tat-filter-department"
                          value={department}
                          onChange={setDepartment}
                          options={TAT_DEPARTMENT_ROWS.map((r) => ({
                            value: r.department,
                            label: r.department,
                          }))}
                          placeholder="All Departments"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Test Category
                        </label>
                        <FormSelect
                          id="tat-filter-category"
                          value={testCategory}
                          onChange={setTestCategory}
                          options={TEST_CATEGORY_OPTIONS}
                          placeholder="All Categories"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Test
                        </label>
                        <FormSelect
                          id="tat-filter-test"
                          value={test}
                          onChange={setTest}
                          options={TEST_OPTIONS}
                          placeholder="All Tests"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Sample Type
                        </label>
                        <FormSelect
                          id="tat-filter-sample"
                          value={sampleType}
                          onChange={setSampleType}
                          options={SAMPLE_TYPE_OPTIONS}
                          placeholder="All Sample Types"
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
                          id="tat-filter-priority"
                          value={priority}
                          onChange={setPriority}
                          options={PRIORITY_OPTIONS}
                          placeholder="All Priorities"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1.5 block font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          TAT Status
                        </label>
                        <FormSelect
                          id="tat-filter-status"
                          value={tatStatus}
                          onChange={setTatStatus}
                          options={TAT_STATUS_OPTIONS}
                          placeholder="All"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={applyFilters}
                        className={`flex h-11 w-full items-center justify-center rounded-[10px] font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        Apply Filters
                      </button>
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
                        TAT Targets (SLA)
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab('stat-vs-routine')}
                        className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        View all
                      </button>
                    </div>
                    <div className="mt-3 flex flex-col gap-2.5">
                      {TAT_TARGETS.map((t) => (
                        <div key={t.priority} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {t.priority}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              ≤ {t.targetMinutes} mins
                            </p>
                          </div>
                          <span
                            className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: t.compliancePct >= 92 ? '#16A34A' : '#D97706',
                              background:
                                t.compliancePct >= 92
                                  ? 'rgba(34,197,94,0.1)'
                                  : 'rgba(245,158,11,0.1)',
                            }}
                          >
                            {t.compliancePct.toFixed(1)}%
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
                      Quick Reports
                    </h2>
                    <div className="mt-3 flex flex-col gap-1">
                      {[
                        {
                          icon: CheckCircle2,
                          label: 'TAT Compliance Report',
                          tab: 'tat-compliance' as TatTabKey,
                        },
                        {
                          icon: AlertTriangle,
                          label: 'Delayed Results Report',
                          tab: 'delayed-results' as TatTabKey,
                        },
                        { icon: Timer, label: 'Longest TAT Report', tab: 'by-test' as TatTabKey },
                        {
                          icon: Building2,
                          label: 'Department TAT Summary',
                          tab: 'by-department' as TatTabKey,
                        },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setActiveTab(item.tab)}
                          className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        >
                          <span className="flex items-center gap-2.5">
                            <item.icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                            <span style={{ fontSize: 14, color: '#0D2630' }}>{item.label}</span>
                          </span>
                          <ChevronRight style={{ width: 15, height: 15, color: '#8A98A3' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {scheduleOpen && (
        <ScheduleReportModal
          defaultReportType="Turnaround Time Report"
          onClose={() => setScheduleOpen(false)}
          onSubmit={(input) => {
            setScheduleOpen(false);
            toast.success(
              'Report scheduled',
              `${input.reportType} will be emailed ${input.frequency.toLowerCase()} to ${input.recipients}.`,
            );
          }}
        />
      )}
    </div>
  );
}
