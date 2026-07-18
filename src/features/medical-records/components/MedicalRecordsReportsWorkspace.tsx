'use client';

import {
  AlertCircle,
  Eye,
  MoreVertical,
  RefreshCw,
  Sheet,
  Filter as FilterIcon,
  FileDown,
  FileText,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  DEPARTMENT_USAGE,
  MEDICAL_RECORDS_ACTIVITY,
  OFFICER_OPTIONS,
  RECORD_REQUESTS_BREAKDOWN,
  RECORD_REQUESTS_TOTAL,
  RECORD_STATUS_OPTIONS,
  REPORT_DEPARTMENT_OPTIONS,
  REPORT_STATS,
  RETRIEVAL_TREND,
  ARCHIVE_TREND,
  type MedicalRecordActivity,
  type RecordActivityStatus,
} from '@/features/medical-records/__mocks__/medicalRecordsReportFixtures';
import { toDateInputValue } from './MedicalRecordView';

type PageState = 'loading' | 'loaded' | 'error';
const ROWS_PER_PAGE = 8;

const STATUS_CFG: Record<RecordActivityStatus, { color: string; border: string; bg: string }> = {
  Retrieved: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'rgba(34,197,94,0.06)' },
  Updated: { color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
  Archived: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
};

function computeTick(maxValue: number): number {
  if (maxValue <= 0) return 1;
  let tick = Math.ceil(maxValue / 4);
  if (tick > 100) tick = Math.ceil(tick / 20) * 20;
  else if (tick > 20) tick = Math.ceil(tick / 10) * 10;
  else if (tick > 10) tick = Math.ceil(tick / 5) * 5;
  return tick;
}

function SkeletonStatCard() {
  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{ borderRadius: 12, border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
    >
      <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
      <div className="h-7 w-16 animate-pulse rounded bg-slate-100" />
      <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

function SkeletonChartCard() {
  return (
    <div
      className="flex flex-col gap-4 p-4"
      style={{ borderRadius: 12, border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
    >
      <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
      <div className="h-56 w-full animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

// ── Line trend chart ─────────────────────────────────────────────────────────

function LineTrendChart({
  data,
  color,
  animate,
}: {
  data: { label: string; value: number }[];
  color: string;
  animate: boolean;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const tick = computeTick(maxValue);
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];
  const W = 400;
  const H = 200;
  const stepX = W / (data.length - 1);
  const points = data.map((d, i) => ({
    x: i * stepX,
    y: H - (d.value / niceMax) * H,
  }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const xLabelIdx = [0, 7, 14, 21, data.length - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="mt-2 flex gap-3" style={{ height: 240 }}>
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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
        >
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
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={color}
              vectorEffect="non-scaling-stroke"
              style={{ opacity: animate ? 1 : 0, transition: `opacity 0.3s ${i * 15}ms` }}
            />
          ))}
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
  );
}

// ── Record requests donut ────────────────────────────────────────────────────

function RequestsDonutChart({ animate }: { animate: boolean }) {
  const total = RECORD_REQUESTS_TOTAL || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  type Seg = (typeof RECORD_REQUESTS_BREAKDOWN)[number] & { length: number; offset: number };
  const { segments } = RECORD_REQUESTS_BREAKDOWN.reduce<{ cumulative: number; segments: Seg[] }>(
    (acc, d) => {
      const rawLength = (d.value / total) * circumference;
      const offset = -(acc.cumulative / total) * circumference;
      return {
        cumulative: acc.cumulative + d.value,
        segments: [...acc.segments, { ...d, length: Math.max(0, rawLength - gapPx), offset }],
      };
    },
    { cumulative: 0, segments: [] },
  );

  return (
    <div className="mt-2 flex items-center gap-5">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: 150, height: 150 }}
      >
        <svg
          viewBox="0 0 128 128"
          style={{ width: 150, height: 150 }}
          role="img"
          aria-label="Record requests donut chart"
        >
          <g transform="rotate(-90 64 64)">
            {segments.map((seg, i) => (
              <circle
                key={seg.label}
                cx={64}
                cy={64}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${animate ? seg.length : 0} ${circumference}`}
                strokeDashoffset={seg.offset}
                style={{
                  transition: `stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 120}ms`,
                }}
              />
            ))}
          </g>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
            {total}
          </span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Total</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {RECORD_REQUESTS_BREAKDOWN.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                {d.label}
              </span>
            </div>
            <span
              className="shrink-0 font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {d.value} ({d.percent.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Department usage horizontal bars ─────────────────────────────────────────

function DepartmentUsageBars({ animate }: { animate: boolean }) {
  const maxValue = Math.max(...DEPARTMENT_USAGE.map((d) => d.count), 1);
  const step = Math.max(100, Math.ceil(maxValue / 5 / 100) * 100);
  const niceMax = step * 5;
  const ticks = Array.from({ length: 6 }, (_, i) => i * step);

  return (
    <div className="mt-2 flex flex-col gap-3">
      {DEPARTMENT_USAGE.map((d, i) => (
        <div key={d.department} className="flex items-center gap-3">
          <span
            className="w-32 shrink-0 truncate text-right font-sans"
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            {d.department}
          </span>
          <div
            className="relative h-5 min-w-0 flex-1 rounded-[4px]"
            style={{ background: 'rgba(139,92,246,0.08)' }}
          >
            <div
              className="h-full rounded-[4px]"
              style={{
                width: animate ? `${(d.count / niceMax) * 100}%` : 0,
                background: '#8B5CF6',
                transition: `width 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms`,
              }}
            />
          </div>
          <span
            className="w-12 shrink-0 font-sans font-medium"
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            {d.count}
          </span>
        </div>
      ))}
      <div className="mt-1 flex items-center gap-3">
        <span className="w-32 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 justify-between">
          {ticks.map((t) => (
            <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {t}
            </span>
          ))}
        </div>
        <span className="w-12 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function MedicalRecordsReportsWorkspace() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [animateCharts, setAnimateCharts] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => toDateInputValue(new Date(2026, 5, 1)));
  const [dateTo, setDateTo] = useState(() => toDateInputValue(new Date(2026, 5, 30)));
  const [officer, setOfficer] = useState('');
  const [department, setDepartment] = useState('');
  const [recordStatus, setRecordStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState<MedicalRecordActivity[]>(MEDICAL_RECORDS_ACTIVITY);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (pageState !== 'loaded') return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimateCharts(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      setAnimateCharts(false);
    };
  }, [pageState]);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleReset() {
    setDateFrom(toDateInputValue(new Date(2026, 5, 1)));
    setDateTo(toDateInputValue(new Date(2026, 5, 30)));
    setOfficer('');
    setDepartment('');
    setRecordStatus('');
    setRows(MEDICAL_RECORDS_ACTIVITY);
    setCurrentPage(1);
    toast.info('Filters reset', 'Showing all medical records activity.');
  }

  function handleApplyFilters() {
    const filtered = MEDICAL_RECORDS_ACTIVITY.filter((r) => {
      if (officer && r.retrievedBy !== officer) return false;
      if (department && r.department !== department) return false;
      if (recordStatus && r.status !== recordStatus) return false;
      const d = r.date.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
    setRows(filtered);
    setCurrentPage(1);
    toast.success(
      'Filters applied',
      `${filtered.length} record${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = rows.slice(pageStart, pageStart + ROWS_PER_PAGE);

  function handleExportPDF() {
    const rowsHtml = rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.mrn)}</td><td>${escapeHtml(r.patientName)}</td><td>${escapeHtml(r.recordType)}</td><td>${escapeHtml(r.retrievedBy)}</td><td>${escapeHtml(r.department)}</td><td>${formatHumanDate(r.date)}</td><td>${r.status}</td><td>${r.retrievalTime}</td></tr>`,
      )
      .join('');
    downloadPDF(
      'medical-records-activity',
      `<h1>Medical Records Activity</h1>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>MRN</th><th>Patient</th><th>Record Type</th><th>Retrieved By</th><th>Department</th><th>Date</th><th>Status</th><th>Retrieval Time</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
    toast.success('Export ready', 'Medical Records Activity downloaded as PDF.');
  }

  function handleExportExcel() {
    const csvRows = [
      [
        'MRN',
        'Patient',
        'Record Type',
        'Retrieved By',
        'Department',
        'Date',
        'Status',
        'Retrieval Time',
      ],
      ...rows.map((r) => [
        r.mrn,
        r.patientName,
        r.recordType,
        r.retrievedBy,
        r.department,
        formatHumanDate(r.date),
        r.status,
        r.retrievalTime,
      ]),
    ];
    downloadCSV('medical-records-activity-excel', csvRows);
    toast.success('Export ready', 'Medical Records Activity downloaded for Excel.');
  }

  function handleExportCSV() {
    const csvRows = [
      [
        'MRN',
        'Patient',
        'Record Type',
        'Retrieved By',
        'Department',
        'Date',
        'Status',
        'Retrieval Time',
      ],
      ...rows.map((r) => [
        r.mrn,
        r.patientName,
        r.recordType,
        r.retrievedBy,
        r.department,
        formatHumanDate(r.date),
        r.status,
        r.retrievalTime,
      ]),
    ];
    downloadCSV('medical-records-activity', csvRows);
    toast.success('Export ready', 'Medical Records Activity downloaded as CSV.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Medical Records Reports
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Monitor record management performance and activities.
          </p>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load medical records reports
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  height: 40,
                  borderRadius: 12,
                  padding: '0 20px',
                  background: '#00B4D8',
                  fontSize: 14,
                }}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* ── Stat cards ─────────────────────────────────────────────── */}
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                {pageState === 'loading'
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
                  : REPORT_STATS.map((stat) => (
                      <div
                        key={stat.id}
                        className="flex flex-col p-4"
                        style={{
                          borderRadius: 12,
                          border: '1px solid rgba(0,100,130,0.12)',
                          background: '#FFFFFF',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full"
                            style={{ background: stat.iconBg }}
                          >
                            <stat.icon style={{ width: 16, height: 16, color: stat.color }} />
                          </div>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {stat.label}
                          </p>
                        </div>
                        <p
                          className="font-display mt-2 font-semibold"
                          style={{ fontSize: 24, color: '#0D2630' }}
                        >
                          {stat.value}
                        </p>
                        <p
                          className="mt-1 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            color: stat.direction === 'up' ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {stat.direction === 'up' ? '↑' : '↓'} {stat.deltaPercent}% from last month
                        </p>
                      </div>
                    ))}
              </div>

              {/* ── Filters ────────────────────────────────────────────────── */}
              <div
                className="mt-5 rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Filters
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2 lg:col-span-1">
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
                      Officer
                    </label>
                    <FormSelect
                      id="report-officer"
                      value={officer}
                      onChange={setOfficer}
                      options={OFFICER_OPTIONS}
                      placeholder="All Officers"
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
                      id="report-department"
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
                      Record Status
                    </label>
                    <FormSelect
                      id="report-status"
                      value={recordStatus}
                      onChange={setRecordStatus}
                      options={RECORD_STATUS_OPTIONS}
                      placeholder="All Status"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <RefreshCw style={{ width: 15, height: 15 }} />
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <FilterIcon style={{ width: 15, height: 15 }} />
                    Apply Filters
                  </button>
                </div>
              </div>

              {/* ── Charts ─────────────────────────────────────────────────── */}
              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {pageState === 'loading' ? (
                  <>
                    <SkeletonChartCard />
                    <SkeletonChartCard />
                    <SkeletonChartCard />
                    <SkeletonChartCard />
                  </>
                ) : (
                  <>
                    <div
                      className="p-4"
                      style={{
                        borderRadius: 12,
                        border: '1px solid rgba(0,100,130,0.12)',
                        background: '#FFFFFF',
                      }}
                    >
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 18, color: '#0D2630' }}
                      >
                        Retrieval Trend
                      </p>
                      <LineTrendChart
                        data={RETRIEVAL_TREND}
                        color="#3B82F6"
                        animate={animateCharts}
                      />
                    </div>
                    <div
                      className="p-4"
                      style={{
                        borderRadius: 12,
                        border: '1px solid rgba(0,100,130,0.12)',
                        background: '#FFFFFF',
                      }}
                    >
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 18, color: '#0D2630' }}
                      >
                        Archive Trend
                      </p>
                      <LineTrendChart
                        data={ARCHIVE_TREND}
                        color="#22C55E"
                        animate={animateCharts}
                      />
                    </div>
                    <div
                      className="p-4"
                      style={{
                        borderRadius: 12,
                        border: '1px solid rgba(0,100,130,0.12)',
                        background: '#FFFFFF',
                      }}
                    >
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 18, color: '#0D2630' }}
                      >
                        Record Requests
                      </p>
                      <RequestsDonutChart animate={animateCharts} />
                    </div>
                    <div
                      className="p-4"
                      style={{
                        borderRadius: 12,
                        border: '1px solid rgba(0,100,130,0.12)',
                        background: '#FFFFFF',
                      }}
                    >
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 18, color: '#0D2630' }}
                      >
                        Department Usage (Records Retrieved)
                      </p>
                      <DepartmentUsageBars animate={animateCharts} />
                    </div>
                  </>
                )}
              </div>

              {/* ── Activity table ─────────────────────────────────────────── */}
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 18, color: '#0D2630' }}
                  >
                    Medical Records Activity
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <FileText style={{ width: 15, height: 15, color: '#EF4444' }} />
                      Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <Sheet style={{ width: 15, height: 15, color: '#22C55E' }} />
                      Export Excel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <FileDown style={{ width: 15, height: 15, color: '#00B4D8' }} />
                      Export CSV
                    </button>
                  </div>
                </div>

                <div
                  className="mt-3 rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="overflow-x-auto scroll-smooth">
                    <div className="min-w-[1180px]">
                      <div
                        className="flex rounded-t-[8px]"
                        style={{
                          background: 'rgba(226,237,241,0.4)',
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            MRN
                          </span>
                        </div>
                        <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Patient
                          </span>
                        </div>
                        <div className="w-44 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Record Type
                          </span>
                        </div>
                        <div className="w-36 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Retrieved By
                          </span>
                        </div>
                        <div className="w-40 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Department
                          </span>
                        </div>
                        <div className="w-32 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Date
                          </span>
                        </div>
                        <div className="w-28 shrink-0 py-2.5 pr-2">
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
                            Retrieval Time
                          </span>
                        </div>
                        <div className="w-24 shrink-0 py-2.5 pr-3 text-right">
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
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            No activity matches your filters
                          </p>
                        </div>
                      )}

                      {pageRows.map((r) => {
                        const cfg = STATUS_CFG[r.status];
                        return (
                          <div
                            key={r.id}
                            className="flex items-center"
                            style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                          >
                            <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                              <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                {r.mrn}
                              </p>
                            </div>
                            <div className="flex min-w-[160px] flex-1 items-center gap-2.5 py-3 pr-2">
                              <div
                                className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                                style={{ background: r.avatarBg }}
                              >
                                {r.initials}
                              </div>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {r.patientName}
                              </p>
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {r.recordType}
                              </p>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {r.retrievedBy}
                              </p>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {r.department}
                              </p>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {formatHumanDate(r.date)}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(r.date)}</p>
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-2">
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  whiteSpace: 'nowrap',
                                  color: cfg.color,
                                  border: `1px solid ${cfg.border}`,
                                  background: cfg.bg,
                                }}
                              >
                                {r.status}
                              </span>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>{r.retrievalTime}</p>
                            </div>
                            <div className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                              <button
                                type="button"
                                onClick={() =>
                                  toast.info(
                                    'Viewing record',
                                    `Opening ${r.patientName}'s record activity.`,
                                  )
                                }
                                aria-label={`View ${r.patientName}`}
                                className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  toast.info('More actions', `Additional actions for ${r.mrn}.`)
                                }
                                aria-label={`More actions for ${r.mrn}`}
                                className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {rows.length > 0 && (
                    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        Showing {pageStart + 1} to{' '}
                        {Math.min(pageStart + ROWS_PER_PAGE, rows.length)} of {rows.length} records
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safePage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                          aria-label="Previous page"
                        >
                          ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                          .reduce<(number | 'ellipsis')[]>((acc, p) => {
                            if (acc.length > 0 && typeof acc[acc.length - 1] === 'number') {
                              const prev = acc[acc.length - 1] as number;
                              if (p - prev > 1) acc.push('ellipsis');
                            }
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, i) =>
                            p === 'ellipsis' ? (
                              <span
                                key={`e-${i}`}
                                style={{ fontSize: 14, color: '#8A98A3' }}
                                className="px-1"
                              >
                                …
                              </span>
                            ) : (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setCurrentPage(p)}
                                className="flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                style={{
                                  fontSize: 14,
                                  border: `1px solid ${p === safePage ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                                  color: p === safePage ? '#00B4D8' : '#4A7080',
                                  background: p === safePage ? '#E6F8FD' : 'transparent',
                                }}
                              >
                                {p}
                              </button>
                            ),
                          )}
                        <button
                          type="button"
                          disabled={safePage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                          aria-label="Next page"
                        >
                          ›
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                        <select
                          value={ROWS_PER_PAGE}
                          disabled
                          className="h-9 rounded-[8px] px-2 font-sans outline-none"
                          style={{
                            fontSize: 14,
                            border: '1px solid rgba(0,100,130,0.18)',
                            color: '#0D2630',
                          }}
                        >
                          <option value={ROWS_PER_PAGE}>{ROWS_PER_PAGE}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="h-6" />
        </div>
      </main>
    </div>
  );
}
