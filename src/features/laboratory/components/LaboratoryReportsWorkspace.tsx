'use client';

import {
  AlertTriangle,
  BarChart3,
  Beaker,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  FlaskConical,
  History,
  Library,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  TestTube,
  Timer,
  UserSquare2,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
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
  categoryColorFor,
  formatMinutes,
  getDepartmentRows,
  getTopTests,
  getVolumeSeries,
  REPORT_PERIOD_OPTIONS,
  STAT_DELTAS,
  sumField,
  weightedAvg,
  type DepartmentReportRow,
  type ReportPeriod,
  type VolumePoint,
} from '@/features/laboratory/__mocks__/laboratoryReportsFixtures';
import { CriticalResultsReportTab } from './reports/CriticalResultsReportTab';
import { DepartmentPerformanceTab } from './reports/DepartmentPerformanceTab';
import { InventoryReportsTab } from './reports/InventoryReportsTab';
import { PublishedResultsReportTab } from './reports/PublishedResultsReportTab';
import { QualityControlPreviewTab } from './reports/QualityControlPreviewTab';
import { RejectedSamplesReportTab } from './reports/RejectedSamplesReportTab';
import { SampleReportsTab } from './reports/SampleReportsTab';
import { StaffReportsTab } from './reports/StaffReportsTab';

const ScheduleReportModal = dynamic(
  () => import('./ScheduleReportModal').then((m) => m.ScheduleReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const DepartmentReportDetailModal = dynamic(
  () => import('./DepartmentReportDetailModal').then((m) => m.DepartmentReportDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const TAT_TARGET_MINUTES = 150;

type TabKey =
  | 'summary'
  | 'sample-reports'
  | 'published-results'
  | 'critical-results'
  | 'rejected-samples'
  | 'quality-control'
  | 'inventory-reports'
  | 'staff-reports'
  | 'department-performance';

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'summary', label: 'Summary', icon: BarChart3 },
  { key: 'sample-reports', label: 'Sample Reports', icon: TestTube },
  { key: 'published-results', label: 'Published Results', icon: FileText },
  { key: 'critical-results', label: 'Critical Results', icon: AlertTriangle },
  { key: 'rejected-samples', label: 'Rejected Samples', icon: XCircle },
  { key: 'quality-control', label: 'Quality Control Reports', icon: ShieldAlert },
  { key: 'inventory-reports', label: 'Inventory Reports', icon: Beaker },
  { key: 'staff-reports', label: 'Staff Reports', icon: Users },
  { key: 'department-performance', label: 'Department Performance', icon: UserSquare2 },
];

function PeriodDropdown({
  value,
  onChange,
}: {
  value: ReportPeriod;
  onChange: (v: ReportPeriod) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
        style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.18)' }}
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
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={150}>
        {REPORT_PERIOD_OPTIONS.map((opt) => (
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

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  delta,
  deltaGoodDirection,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  delta: number;
  deltaGoodDirection: 'up' | 'down';
}) {
  const isUp = delta >= 0;
  const isGood = deltaGoodDirection === (isUp ? 'up' : 'down');
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <p
        className="font-sans"
        style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080', minHeight: 40 }}
      >
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
        <p
          className="font-display font-bold"
          style={{ fontSize: 24, lineHeight: '30px', color: '#0D2630' }}
        >
          {value}
        </p>
      </div>
      <p
        className="mt-1.5 font-sans font-medium"
        style={{ fontSize: 14, lineHeight: '20px', color: isGood ? '#16A34A' : '#DC2626' }}
      >
        {isUp ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs last month
      </p>
    </div>
  );
}

function VolumeTrendChart({ data }: { data: VolumePoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...data.map((d) => d.tests), 1);
  const niceMax = Math.ceil(max / 200) * 200 || 200;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 240;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.tests / niceMax) * H,
  }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD = `${pathD} L ${points[points.length - 1]?.x.toFixed(1)} ${H} L 0 ${H} Z`;
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
  const hoveredPoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="mt-2 flex gap-3" style={{ height: 280 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 42 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {Math.round(t)}
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
          <defs>
            <linearGradient id="lab-report-volume-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#00B4D8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#lab-report-volume-fill)" stroke="none" />
          <path
            d={pathD}
            fill="none"
            stroke="#00B4D8"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={0}
              x2={hoveredPoint.x}
              y2={H}
              stroke="rgba(0,100,130,0.25)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {points.map((p, i) => (
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
        {hovered && hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
            style={{
              left: `${(hoveredPoint.x / W) * 100}%`,
              top: Math.max(0, (hoveredPoint.y / H) * (280 - 24) - 56),
              transform: 'translateX(-50%)',
              background: '#0D2630',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{formatHumanDate(hovered.date)}</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
              {hovered.tests.toLocaleString('en-GB')} Tests
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

export function LaboratoryReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [period, setPeriod] = useState<ReportPeriod>('This Month');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportOpen, setExportOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [deptDetailFor, setDeptDetailFor] = useState<DepartmentReportRow | null>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);

  const rows = useMemo(() => getDepartmentRows(period), [period]);
  const volumeSeries = useMemo(() => getVolumeSeries(period), [period]);
  const topTests = useMemo(() => getTopTests(period), [period]);

  const totalTests = sumField(rows, 'totalTests');
  const samplesReceived = sumField(rows, 'samplesReceived');
  const resultsPublished = sumField(rows, 'resultsPublished');
  const pendingResults = sumField(rows, 'pendingResults');
  const rejectedSamples = sumField(rows, 'rejectedSamples');
  const criticalResults = sumField(rows, 'criticalResults');
  const avgTatMinutes = weightedAvg(rows, 'avgTatMinutes');
  const onTimePct = weightedAvg(rows, 'onTimePct');
  const onTimeCount = Math.round((resultsPublished * onTimePct) / 100);
  const delayedCount = resultsPublished - onTimeCount;
  const withinTarget = avgTatMinutes <= TAT_TARGET_MINUTES;

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * pageSize, (safePage - 1) * pageSize + pageSize);

  function buildTableRows(): string[][] {
    return [
      ...rows.map((r) => [
        r.department,
        String(r.totalTests),
        String(r.samplesReceived),
        String(r.resultsPublished),
        String(r.pendingResults),
        String(r.rejectedSamples),
        String(r.criticalResults),
        formatMinutes(r.avgTatMinutes),
        `${r.onTimePct.toFixed(1)}%`,
      ]),
      [
        'Total',
        String(totalTests),
        String(samplesReceived),
        String(resultsPublished),
        String(pendingResults),
        String(rejectedSamples),
        String(criticalResults),
        formatMinutes(avgTatMinutes),
        `${onTimePct.toFixed(1)}%`,
      ],
    ];
  }

  function handleExportCSV() {
    setExportOpen(false);
    downloadCSV('laboratory-reports-summary', [
      [
        'Department',
        'Total Tests',
        'Samples Received',
        'Results Published',
        'Pending Results',
        'Rejected Samples',
        'Critical Results',
        'Avg TAT',
        'On-time %',
      ],
      ...buildTableRows(),
    ]);
    toast.success('Export ready', 'Laboratory Reports summary downloaded as CSV.');
  }

  function handleExportPDF() {
    setExportOpen(false);
    const rowsHtml = buildTableRows()
      .map(
        (r, i) =>
          `<tr${i === buildTableRows().length - 1 ? ' style="font-weight:600"' : ''}><td>${r
            .map(escapeHtml)
            .join('</td><td>')}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'laboratory-reports-summary',
      `<h1>Laboratory Reports — ${escapeHtml(period)}</h1><p class="meta">Total Tests ${totalTests.toLocaleString('en-GB')} · Samples Received ${samplesReceived.toLocaleString('en-GB')} · Results Published ${resultsPublished.toLocaleString('en-GB')} · Avg TAT ${formatMinutes(avgTatMinutes)}</p><hr/><table><thead><tr><th>Department</th><th>Total Tests</th><th>Samples Received</th><th>Results Published</th><th>Pending</th><th>Rejected</th><th>Critical</th><th>Avg TAT</th><th>On-time %</th></tr></thead><tbody>${rowsHtml}</tbody></table>`,
    );
    toast.success('Preparing report', 'Laboratory Reports PDF opened in a new tab.');
  }

  function handlePrint() {
    setExportOpen(false);
    handleExportPDF();
  }

  function handleGenerateReport() {
    handleExportPDF();
  }

  function handleQuickAction(label: string, detail: string) {
    toast.info(label, detail);
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
              Laboratory Reports
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Laboratory Reports
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Generate and analyze laboratory performance, quality and operational reports.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Calendar style={{ width: 15, height: 15 }} />
                Schedule Report
              </button>
              <div className="relative">
                <button
                  ref={exportBtnRef}
                  type="button"
                  onClick={() => setExportOpen((v) => !v)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Download style={{ width: 15, height: 15 }} />
                  Export
                  <ChevronDown
                    style={{
                      width: 13,
                      height: 13,
                      transition: 'transform 150ms',
                      transform: exportOpen ? 'rotate(180deg)' : 'none',
                    }}
                  />
                </button>
                <RowMenuPortal
                  open={exportOpen}
                  anchorRef={exportBtnRef}
                  onClose={() => setExportOpen(false)}
                  width={170}
                >
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2F3A40' }}
                  >
                    Export as CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2F3A40' }}
                  >
                    Export as PDF
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2F3A40' }}
                  >
                    Print
                  </button>
                </RowMenuPortal>
              </div>
              <button
                type="button"
                onClick={handleGenerateReport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                Generate Report
              </button>
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div
            className="mt-5 flex gap-1 overflow-x-auto scroll-smooth rounded-t-[12px] px-3 pt-3"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,100,130,0.12)',
              borderBottom: 'none',
            }}
          >
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`flex shrink-0 items-center gap-1.5 px-3.5 pb-3 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: active ? '#00B4D8' : '#4A7080',
                    borderBottom: active ? '2px solid #00B4D8' : '2px solid transparent',
                  }}
                >
                  <t.icon style={{ width: 14, height: 14 }} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div
            className="rounded-b-[12px] p-4 sm:p-5"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,100,130,0.12)',
              borderTop: 'none',
            }}
          >
            {activeTab === 'sample-reports' ? (
              <SampleReportsTab
                period={period}
                periodDropdown={<PeriodDropdown value={period} onChange={setPeriod} />}
              />
            ) : activeTab === 'published-results' ? (
              <PublishedResultsReportTab
                period={period}
                periodDropdown={<PeriodDropdown value={period} onChange={setPeriod} />}
              />
            ) : activeTab === 'critical-results' ? (
              <CriticalResultsReportTab period={period} />
            ) : activeTab === 'rejected-samples' ? (
              <RejectedSamplesReportTab period={period} />
            ) : activeTab === 'quality-control' ? (
              <QualityControlPreviewTab />
            ) : activeTab === 'inventory-reports' ? (
              <InventoryReportsTab />
            ) : activeTab === 'staff-reports' ? (
              <StaffReportsTab />
            ) : activeTab === 'department-performance' ? (
              <DepartmentPerformanceTab period={period} />
            ) : (
              <>
                {/* ── Stat cards ────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
                  <StatCard
                    icon={FlaskConical}
                    iconColor="#2563EB"
                    iconBg="rgba(37,99,235,0.12)"
                    label="Total Tests"
                    value={totalTests.toLocaleString('en-GB')}
                    delta={STAT_DELTAS.totalTests}
                    deltaGoodDirection="up"
                  />
                  <StatCard
                    icon={TestTube}
                    iconColor="#16A34A"
                    iconBg="rgba(34,197,94,0.12)"
                    label="Samples Received"
                    value={samplesReceived.toLocaleString('en-GB')}
                    delta={STAT_DELTAS.samplesReceived}
                    deltaGoodDirection="up"
                  />
                  <StatCard
                    icon={FileText}
                    iconColor="#7C3AED"
                    iconBg="rgba(124,58,237,0.12)"
                    label="Results Published"
                    value={resultsPublished.toLocaleString('en-GB')}
                    delta={STAT_DELTAS.resultsPublished}
                    deltaGoodDirection="up"
                  />
                  <StatCard
                    icon={Clock}
                    iconColor="#D97706"
                    iconBg="rgba(245,158,11,0.12)"
                    label="Pending Results"
                    value={pendingResults.toLocaleString('en-GB')}
                    delta={STAT_DELTAS.pendingResults}
                    deltaGoodDirection="down"
                  />
                  <StatCard
                    icon={XCircle}
                    iconColor="#DC2626"
                    iconBg="rgba(239,68,68,0.12)"
                    label="Rejected Samples"
                    value={rejectedSamples.toLocaleString('en-GB')}
                    delta={STAT_DELTAS.rejectedSamples}
                    deltaGoodDirection="down"
                  />
                  <StatCard
                    icon={AlertTriangle}
                    iconColor="#DC2626"
                    iconBg="rgba(239,68,68,0.12)"
                    label="Critical Results"
                    value={criticalResults.toLocaleString('en-GB')}
                    delta={STAT_DELTAS.criticalResults}
                    deltaGoodDirection="down"
                  />
                  <StatCard
                    icon={Timer}
                    iconColor="#0D9488"
                    iconBg="rgba(13,148,136,0.12)"
                    label="TAT (Avg)"
                    value={formatMinutes(avgTatMinutes)}
                    delta={STAT_DELTAS.avgTat}
                    deltaGoodDirection="down"
                  />
                </div>

                {/* ── Charts row ────────────────────────────────────────── */}
                <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <div
                    className="rounded-[12px] p-4 xl:col-span-1"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Test Volume Trend
                      </h2>
                      <PeriodDropdown value={period} onChange={setPeriod} />
                    </div>
                    <VolumeTrendChart data={volumeSeries} />
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
                        Tests by Category
                      </h2>
                      <PeriodDropdown value={period} onChange={setPeriod} />
                    </div>
                    <div className="mt-4 flex items-center gap-5">
                      <AnimatedDonutChart
                        breakdown={rows.map((r, i) => ({
                          label: r.department,
                          value: r.totalTests,
                          color: categoryColorFor(i),
                        }))}
                        total={totalTests}
                        size={132}
                        ariaLabel="Tests by category donut chart"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        {rows.map((r, i) => (
                          <div
                            key={r.department}
                            className="flex items-center justify-between gap-2"
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ background: categoryColorFor(i) }}
                              />
                              <Tooltip content={r.department}>
                                <span
                                  className="truncate"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {r.department}
                                </span>
                              </Tooltip>
                            </div>
                            <span
                              className="shrink-0 font-sans font-medium whitespace-nowrap"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.totalTests.toLocaleString('en-GB')} (
                              {((r.totalTests / Math.max(1, totalTests)) * 100).toFixed(1)}%)
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
                    <div className="flex items-center justify-between gap-2">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        TAT Performance
                      </h2>
                      <PeriodDropdown value={period} onChange={setPeriod} />
                    </div>
                    <div className="mt-4 flex items-center gap-5">
                      <AnimatedDonutChart
                        breakdown={[
                          { label: 'On-time', value: onTimeCount, color: '#16A34A' },
                          { label: 'Delayed', value: delayedCount, color: '#DC2626' },
                        ]}
                        total={resultsPublished}
                        size={132}
                        centerValue={`${onTimePct.toFixed(1)}%`}
                        centerLabel="On-time"
                        ariaLabel="TAT performance donut chart"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="flex items-center gap-1.5"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ background: '#16A34A' }}
                            />
                            On-time
                          </span>
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {onTimeCount.toLocaleString('en-GB')} ({onTimePct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="flex items-center gap-1.5"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ background: '#DC2626' }}
                            />
                            Delayed
                          </span>
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {delayedCount.toLocaleString('en-GB')} ({(100 - onTimePct).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="mt-3 rounded-[10px] p-3"
                      style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Average TAT</p>
                      <p
                        className="font-display mt-0.5 font-bold"
                        style={{ fontSize: 20, color: '#0D2630' }}
                      >
                        {formatMinutes(avgTatMinutes)}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>
                          Target: ≤ {formatMinutes(TAT_TARGET_MINUTES)}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: withinTarget ? '#16A34A' : '#DC2626',
                            background: withinTarget
                              ? 'rgba(34,197,94,0.1)'
                              : 'rgba(239,68,68,0.1)',
                          }}
                        >
                          {withinTarget && <Check style={{ width: 12, height: 12 }} />}
                          {withinTarget ? 'Within Target' : 'Over Target'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Report Summary table + sidebar ───────────────────── */}
                <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
                  <div
                    className="min-w-0 flex-1 rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Report Summary{' '}
                      <span style={{ color: '#8A98A3', fontWeight: 400 }}>({period})</span>
                    </h2>
                    <div className="mt-3">
                      <ScrollableTable minWidth={1600}>
                        <div
                          className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                          style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                        >
                          {[
                            ['Department', 'min-w-[160px] flex-1'],
                            ['Total Tests', 'w-32'],
                            ['Samples Received', 'w-52'],
                            ['Results Published', 'w-56'],
                            ['Pending Results', 'w-44'],
                            ['Rejected Samples', 'w-48'],
                            ['Critical Results', 'w-48'],
                            ['Avg TAT', 'w-28'],
                            ['On-time %', 'w-28'],
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
                          <div className="w-24 shrink-0 py-2.5 pr-3 text-center">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Action
                            </span>
                          </div>
                        </div>
                        {pageRows.map((r) => (
                          <div
                            key={r.department}
                            className="flex items-center"
                            style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                          >
                            <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3 text-center">
                              <Tooltip content={r.department}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
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
                            <div className="w-52 shrink-0 py-3 pr-2 text-center">
                              <p style={{ fontSize: 14, color: '#0D2630' }}>
                                {r.samplesReceived.toLocaleString('en-GB')}
                              </p>
                            </div>
                            <div className="w-56 shrink-0 py-3 pr-2 text-center">
                              <p style={{ fontSize: 14, color: '#0D2630' }}>
                                {r.resultsPublished.toLocaleString('en-GB')}
                              </p>
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2 text-center">
                              <p style={{ fontSize: 14, color: '#D97706' }}>
                                {r.pendingResults.toLocaleString('en-GB')}
                              </p>
                            </div>
                            <div className="w-48 shrink-0 py-3 pr-2 text-center">
                              <p style={{ fontSize: 14, color: '#DC2626' }}>
                                {r.rejectedSamples.toLocaleString('en-GB')}
                              </p>
                            </div>
                            <div className="w-48 shrink-0 py-3 pr-2 text-center">
                              <p
                                style={{
                                  fontSize: 14,
                                  color: r.criticalResults > 0 ? '#DC2626' : '#8A98A3',
                                }}
                              >
                                {r.criticalResults.toLocaleString('en-GB')}
                              </p>
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-2 text-center">
                              <p
                                className="whitespace-nowrap"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {formatMinutes(r.avgTatMinutes)}
                              </p>
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-2 text-center">
                              <p style={{ fontSize: 14, color: '#16A34A' }}>
                                {r.onTimePct.toFixed(1)}%
                              </p>
                            </div>
                            <div className="flex w-24 shrink-0 items-center justify-center py-3 pr-3">
                              <button
                                type="button"
                                onClick={() => setDeptDetailFor(r)}
                                aria-label={`View ${r.department} detail`}
                                className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                              >
                                <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                            </div>
                          </div>
                        ))}
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
                          <div className="w-52 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {samplesReceived.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-56 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {resultsPublished.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {pendingResults.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-48 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {rejectedSamples.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-48 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {criticalResults.toLocaleString('en-GB')}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold whitespace-nowrap"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatMinutes(avgTatMinutes)}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2 text-center">
                            <p
                              className="font-sans font-bold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {onTimePct.toFixed(1)}%
                            </p>
                          </div>
                          <div className="w-24 shrink-0 py-3 pr-3" />
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
                          Top 5 Most Ordered Tests
                        </h2>
                        <PeriodDropdown value={period} onChange={setPeriod} />
                      </div>
                      <div className="mt-3.5 flex flex-col gap-3.5">
                        {topTests.map((t) => {
                          const pct = (t.count / Math.max(1, totalTests)) * 100;
                          return (
                            <div key={t.name}>
                              <div className="flex items-center justify-between gap-2">
                                <Tooltip content={t.name}>
                                  <span
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {t.name}
                                  </span>
                                </Tooltip>
                              </div>
                              <div className="mt-1.5 flex items-center gap-2">
                                <div
                                  className="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                                  style={{ background: '#E6F8FD' }}
                                >
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.min(100, pct * 4)}%`,
                                      background: '#00B4D8',
                                    }}
                                  />
                                </div>
                                <span
                                  className="shrink-0 font-sans font-medium whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {t.count.toLocaleString('en-GB')} ({pct.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
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
                        Quick Actions
                      </h2>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                          {
                            icon: Sparkles,
                            label: 'Custom Report',
                            detail: 'Build-your-own report is on the Laboratory Reports roadmap.',
                          },
                          {
                            icon: Send,
                            label: 'Saved Reports',
                            detail:
                              'No saved reports yet — save one from any export to see it here.',
                          },
                          {
                            icon: Library,
                            label: 'Data Dictionary',
                            detail:
                              'Test and metric definitions for this dashboard are coming soon.',
                          },
                          {
                            icon: History,
                            label: 'Report History',
                            detail: 'Past generated and scheduled reports will appear here.',
                          },
                        ].map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            onClick={() => handleQuickAction(action.label, action.detail)}
                            className={`flex flex-col items-start gap-2 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                          >
                            <action.icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {action.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {scheduleOpen && (
        <ScheduleReportModal
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

      {deptDetailFor && (
        <DepartmentReportDetailModal
          row={deptDetailFor}
          period={period}
          onClose={() => setDeptDetailFor(null)}
        />
      )}
    </div>
  );
}
