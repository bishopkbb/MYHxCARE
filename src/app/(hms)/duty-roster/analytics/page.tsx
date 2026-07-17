'use client';

import {
  AlertCircle,
  ChevronLeft,
  Clock3,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ExportMenu } from '@/components/ExportMenu';
import { ROUTES } from '@/constants/routes';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import {
  ANALYTICS_PERIODS,
  DEPARTMENT_COVERAGE,
  OVERTIME_TRACKING,
  UTILIZATION_TREND,
  WORKFORCE_ANALYTICS_SUMMARY,
  type AnalyticsPeriod,
} from '@/features/workforce/__mocks__/workforceFixtures';

type PageState = 'loading' | 'loaded' | 'error';

// ── Utilization bar chart ────────────────────────────────────────────────────

function UtilizationBarChart({
  data,
  animate,
}: {
  data: { label: string; percent: number }[];
  animate: boolean;
}) {
  const niceMax = 100;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="mt-2 flex gap-3" style={{ height: 240 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 32 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}%
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.22)' }} />
          ))}
        </div>
        <div
          className="absolute inset-x-0 top-0 flex items-end justify-between gap-2"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {data.map((d, i) => (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end">
              <span
                className="mb-1.5 font-sans font-medium transition-opacity duration-300"
                style={{
                  fontSize: 14,
                  lineHeight: '16px',
                  color: '#4A7080',
                  opacity: animate ? 1 : 0,
                  transitionDelay: animate ? `${i * 70 + 500}ms` : '0ms',
                }}
              >
                {d.percent}%
              </span>
              <div
                className="w-full"
                style={{
                  maxWidth: 44,
                  borderRadius: '6px 6px 0 0',
                  background: '#00B4D8',
                  height: animate ? `${(d.percent / niceMax) * 100}%` : 0,
                  transition: `height 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 70}ms`,
                }}
              />
            </div>
          ))}
        </div>
        <div
          className="absolute inset-x-0 bottom-0 flex justify-between gap-2"
          style={{ height: 24 }}
        >
          {data.map((d) => (
            <span
              key={d.label}
              className="flex-1 text-center font-sans"
              style={{ fontSize: 14, lineHeight: '20px', color: '#8A98A3' }}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Coverage donut chart ──────────────────────────────────────────────────────

function CoverageDonutChart({
  data,
  animate,
}: {
  data: { label: string; value: number; color: string }[];
  animate: boolean;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 60;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  type Segment = (typeof data)[number] & { length: number; offset: number };
  const { segments } = data.reduce<{ cumulative: number; segments: Segment[] }>(
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
    <div className="mt-2 flex flex-col items-center gap-5">
      <svg
        viewBox="0 0 160 160"
        style={{ width: 180, height: 180 }}
        role="img"
        aria-label="Department coverage donut chart"
      >
        <g transform="rotate(-90 80 80)">
          {segments.map((seg, i) => (
            <circle
              key={seg.label}
              cx={80}
              cy={80}
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
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5">
            <span
              className="shrink-0 rounded-[3px]"
              style={{ width: 10, height: 10, background: d.color }}
            />
            <span
              className="font-sans"
              style={{ fontSize: 14, lineHeight: '20px', color: d.color }}
            >
              {d.label} ({d.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  info,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  info: string;
}) {
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <p style={{ fontSize: 14, color: '#4A7080' }}>{label}</p>
      <div className="mt-2 flex items-center gap-2.5">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'rgba(0,180,216,0.10)' }}
        >
          <Icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
        </div>
        <p
          className="font-display font-bold"
          style={{ fontSize: 26, lineHeight: '32px', color: '#0D2630' }}
        >
          {value}
        </p>
      </div>
      <p className="mt-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
        {info}
      </p>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonChartCard() {
  return (
    <div
      className="rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-52 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkforceAnalyticsPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [period, setPeriod] = useState<AnalyticsPeriod>('this-week');
  const [animateCharts, setAnimateCharts] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

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
  }, [pageState, period]);

  const summary = WORKFORCE_ANALYTICS_SUMMARY[period];
  const utilizationData = UTILIZATION_TREND[period];
  const coverageData = DEPARTMENT_COVERAGE[period];
  const overtimeData = OVERTIME_TRACKING[period];
  const periodLabel = ANALYTICS_PERIODS.find((p) => p.key === period)?.label ?? 'This Week';

  function exportAsPDF() {
    const body = `
      <h1>Workforce Analytics — ${escapeHtml(periodLabel)}</h1>
      <p class="meta">Avg utilization ${summary.avgUtilizationPercent}% · ${summary.totalOvertimeHours}h overtime · ${summary.avgCoveragePercent}% coverage · ${summary.activeDoctors} active doctors</p>
      <hr>
      <table>
        <thead><tr><th>Doctor</th><th>Department</th><th>Overtime Hours</th><th>Shifts</th></tr></thead>
        <tbody>
          ${overtimeData.map((o) => `<tr><td>${escapeHtml(o.doctorName)}</td><td>${escapeHtml(o.department)}</td><td>${o.overtimeHours}</td><td>${o.shiftsCount}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
    downloadPDF(`workforce-analytics-${period}`, body);
  }

  function exportAsCSV() {
    downloadCSV(`workforce-analytics-${period}`, [
      ['Doctor', 'Department', 'Overtime Hours', 'Shifts'],
      ...overtimeData.map((o) => [
        o.doctorName,
        o.department,
        String(o.overtimeHours),
        String(o.shiftsCount),
      ]),
    ]);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.dutyRoster)}
            className="mb-3 flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Back to Workforce Management
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Workforce Analytics
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Staff utilisation, shift coverage, and overtime tracking.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
                  className="h-11 appearance-none rounded-[10px] pr-9 pl-3.5 font-sans font-medium"
                  style={{
                    border: '1px solid #0064821F',
                    background: '#FFFFFF',
                    fontSize: 14,
                    color: '#0D2630',
                  }}
                >
                  {ANALYTICS_PERIODS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <ExportMenu variant="button" onExportPDF={exportAsPDF} onExportCSV={exportAsCSV} />
            </div>
          </div>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load analytics
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
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {pageState === 'loading' ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
                      <div className="mt-2.5 h-7 w-14 animate-pulse rounded bg-slate-100" />
                    </div>
                  ))
                ) : (
                  <>
                    <StatCard
                      icon={TrendingUp}
                      label="Avg Utilization"
                      value={`${summary.avgUtilizationPercent}%`}
                      info={periodLabel}
                    />
                    <StatCard
                      icon={Clock3}
                      label="Overtime Hours"
                      value={String(summary.totalOvertimeHours)}
                      info={periodLabel}
                    />
                    <StatCard
                      icon={ShieldCheck}
                      label="Avg Coverage"
                      value={`${summary.avgCoveragePercent}%`}
                      info="Department staffed"
                    />
                    <StatCard
                      icon={Users}
                      label="Active Doctors"
                      value={String(summary.activeDoctors)}
                      info="On roster"
                    />
                  </>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {pageState === 'loading' ? (
                  <>
                    <SkeletonChartCard />
                    <SkeletonChartCard />
                  </>
                ) : (
                  <>
                    <div
                      className="rounded-[12px] p-4 sm:p-5"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                      >
                        Utilization Trend
                      </h2>
                      <UtilizationBarChart data={utilizationData} animate={animateCharts} />
                    </div>
                    <div
                      className="rounded-[12px] p-4 sm:p-5"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                      >
                        Department Coverage
                      </h2>
                      <CoverageDonutChart data={coverageData} animate={animateCharts} />
                    </div>
                  </>
                )}
              </div>

              <div
                className="mt-5 overflow-hidden rounded-[12px]"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="p-4 sm:p-5">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                  >
                    Overtime Tracking
                  </h2>
                </div>

                {pageState === 'loading' ? (
                  <div className="pb-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex min-h-[56px] items-center gap-4 px-5 py-3"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="size-8 animate-pulse rounded-full bg-slate-100" />
                        <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
                        <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : overtimeData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
                    <div
                      className="flex size-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(226,237,241,0.6)' }}
                    >
                      <Clock3 style={{ width: 28, height: 28, color: '#8A98A3' }} />
                    </div>
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      No overtime recorded
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Nobody exceeded scheduled hours in this period.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto scroll-smooth lg:block">
                      <div
                        className="flex"
                        style={{
                          background: 'rgba(226,237,241,0.4)',
                          borderTop: '1px solid #0064821F',
                          borderBottom: '1px solid #0064821F',
                        }}
                      >
                        <div className="w-[30%] px-4 py-3">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Doctor
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 px-4 py-3">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Department
                          </span>
                        </div>
                        <div className="w-32 shrink-0 px-4 py-3">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Overtime
                          </span>
                        </div>
                        <div className="w-28 shrink-0 px-4 py-3">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Shifts
                          </span>
                        </div>
                      </div>
                      {overtimeData.map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="flex w-[30%] min-w-0 items-center gap-2.5 px-4 py-3">
                            <div
                              className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: o.avatarBg }}
                            >
                              {o.initials}
                            </div>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {o.doctorName}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1 px-4 py-3">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {o.department}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 px-4 py-3">
                            <span
                              className="inline-flex rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: o.overtimeHours >= 30 ? '#EF4444' : '#F59E0B',
                                border: `1px solid ${o.overtimeHours >= 30 ? 'rgba(239,68,68,0.40)' : 'rgba(245,158,11,0.40)'}`,
                                background:
                                  o.overtimeHours >= 30
                                    ? 'rgba(239,68,68,0.06)'
                                    : 'rgba(245,158,11,0.06)',
                              }}
                            >
                              {o.overtimeHours}h
                            </span>
                          </div>
                          <div className="w-28 shrink-0 px-4 py-3">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{o.shiftsCount}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 px-4 py-3 lg:hidden">
                      {overtimeData.map((o) => (
                        <div
                          key={o.id}
                          className="rounded-[10px] p-3"
                          style={{ border: '1px solid rgba(0,100,130,0.10)' }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                                style={{ background: o.avatarBg }}
                              >
                                {o.initials}
                              </div>
                              <div className="min-w-0">
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {o.doctorName}
                                </p>
                                <p style={{ fontSize: 14, color: '#4A7080' }}>{o.department}</p>
                              </div>
                            </div>
                            <span
                              className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                color: o.overtimeHours >= 30 ? '#EF4444' : '#F59E0B',
                                border: `1px solid ${o.overtimeHours >= 30 ? 'rgba(239,68,68,0.40)' : 'rgba(245,158,11,0.40)'}`,
                                background:
                                  o.overtimeHours >= 30
                                    ? 'rgba(239,68,68,0.06)'
                                    : 'rgba(245,158,11,0.06)',
                              }}
                            >
                              {o.overtimeHours}h
                            </span>
                          </div>
                          <p className="mt-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {o.shiftsCount} shifts
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
