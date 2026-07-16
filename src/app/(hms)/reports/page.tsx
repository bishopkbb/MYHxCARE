'use client';

import { AlertCircle, ChevronDown, Download, RefreshCw, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/utils/datetime';
import {
  CONSULTATION_CHART_TITLE,
  DAILY_CONSULTATIONS,
  DIAGNOSIS_DISTRIBUTION,
  REFERRAL_REPORT_ROWS,
  REPORT_PERIODS,
  REPORT_STATS,
  type ReferralReportStatus,
  type ReportPeriod,
} from '@/features/reports/__mocks__/reportFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

const STATUS_CFG: Record<ReferralReportStatus, { label: string; color: string; bg: string }> = {
  accepted: { label: 'Accepted', color: '#16A34A', bg: 'rgba(34,197,94,0.10)' },
  pending: { label: 'Pending', color: '#D97706', bg: 'rgba(217,119,6,0.10)' },
  declined: { label: 'Declined', color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Rounds a bar-chart max up to a clean, evenly-divisible axis tick (4 gridlines
 * above zero) — e.g. a max of 22 becomes a tick of 6 (0/6/12/18/24). */
function computeTick(maxValue: number): number {
  if (maxValue <= 0) return 1;
  let tick = Math.ceil(maxValue / 4);
  if (tick > 100) tick = Math.ceil(tick / 20) * 20;
  else if (tick > 20) tick = Math.ceil(tick / 10) * 10;
  else if (tick > 10) tick = Math.ceil(tick / 5) * 5;
  return tick;
}

// ── Skeletons ──────────────────────────────────────────────────────────────────

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
      <div className="h-5 w-52 animate-pulse rounded bg-slate-100" />
      <div className="h-64 w-full animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

// ── Bar chart ──────────────────────────────────────────────────────────────────

function ConsultationBarChart({
  data,
  animate,
}: {
  data: { label: string; count: number }[];
  animate: boolean;
}) {
  const maxValue = Math.max(...data.map((d) => d.count), 1);
  const tick = computeTick(maxValue);
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];

  return (
    <div className="mt-2 flex gap-3" style={{ height: 240 }}>
      {/* Y-axis labels */}
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 26 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}
          </span>
        ))}
      </div>

      {/* Chart area */}
      <div className="relative min-w-0 flex-1">
        {/* Gridlines */}
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.22)' }} />
          ))}
        </div>

        {/* Bars */}
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
                {d.count}
              </span>
              <div
                className="w-full"
                style={{
                  maxWidth: 44,
                  borderRadius: '6px 6px 0 0',
                  background: '#00B4D8',
                  height: animate ? `${(d.count / niceMax) * 100}%` : 0,
                  transition: `height 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 70}ms`,
                }}
              />
            </div>
          ))}
        </div>

        {/* X-axis labels */}
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

// ── Donut chart ────────────────────────────────────────────────────────────────

function DiagnosisDonutChart({
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
  const gapPx = 3; // hairline separation between segments — keeps borders visible

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
        aria-label="Diagnosis distribution donut chart"
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

      {/* Legend */}
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
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [period, setPeriod] = useState<ReportPeriod>('this-week');
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [animateCharts, setAnimateCharts] = useState(false);

  const periodMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (periodMenuRef.current && !periodMenuRef.current.contains(e.target as Node)) {
        setPeriodMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Re-plays the chart draw-in animation whenever the loaded data changes.
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
      // Resets on unmount and right before the next run (period change) —
      // avoids a synchronous setState in the effect body.
      setAnimateCharts(false);
    };
  }, [pageState, period]);

  function handleExport() {
    toast.success('Export ready', `${periodLabel} clinical report downloaded as CSV.`);
  }

  const stats = REPORT_STATS[period];
  const consultationData = DAILY_CONSULTATIONS[period];
  const diagnosisData = DIAGNOSIS_DISTRIBUTION[period];
  const periodLabel = REPORT_PERIODS.find((p) => p.key === period)?.label ?? 'This Week';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Clinical Reports
              </h1>
              <p
                className="mt-0.5 font-sans"
                style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
              >
                Your clinical activity — June 2026
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative" ref={periodMenuRef}>
                <button
                  type="button"
                  onClick={() => setPeriodMenuOpen((v) => !v)}
                  aria-expanded={periodMenuOpen}
                  className={`flex items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    height: 40,
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.15)',
                    color: '#0D2630',
                    fontSize: 14,
                  }}
                >
                  {periodLabel}
                  <ChevronDown style={{ width: 15, height: 15, color: '#4A7080' }} />
                </button>
                {periodMenuOpen && (
                  <div
                    className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-40 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
                    style={{
                      border: '1px solid rgba(0,100,130,0.15)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                    }}
                  >
                    {REPORT_PERIODS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          setPeriod(p.key);
                          setPeriodMenuOpen(false);
                        }}
                        className={`flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: p.key === period ? '#00B4D8' : '#2F3A40',
                          fontWeight: p.key === period ? 600 : 400,
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleExport}
                className={`flex items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  height: 40,
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
                Export
              </button>
            </div>
          </div>

          {pageState === 'error' ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 py-10 text-center">
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load clinical reports
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className={`flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
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
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {pageState === 'loading'
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
                  : stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex flex-col p-4"
                        style={{
                          borderRadius: 12,
                          border: '1px solid rgba(0,100,130,0.12)',
                          background: '#FFFFFF',
                        }}
                      >
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
                        >
                          {stat.label}
                        </p>
                        <p
                          className="font-display mt-1.5 font-semibold"
                          style={{ fontSize: 28, lineHeight: '36px', color: '#0D2630' }}
                        >
                          {stat.value}
                        </p>
                        <p
                          className="mt-1 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            lineHeight: '20px',
                            color: stat.direction === 'up' ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {stat.delta} vs last month
                        </p>
                      </div>
                    ))}
              </div>

              {/* ── Charts row ─────────────────────────────────────────────── */}
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {pageState === 'loading' ? (
                  <>
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
                        style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                      >
                        {CONSULTATION_CHART_TITLE[period]}
                      </p>
                      <ConsultationBarChart data={consultationData} animate={animateCharts} />
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
                        style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                      >
                        Diagnosis Distribution ({periodLabel})
                      </p>
                      <DiagnosisDonutChart data={diagnosisData} animate={animateCharts} />
                    </div>
                  </>
                )}
              </div>

              {/* ── Referral report ────────────────────────────────────────── */}
              <div className="mt-6">
                <div
                  className="px-4 py-4 sm:px-5"
                  style={{
                    borderRadius: '12px 12px 0 0',
                    border: '1px solid rgba(0,100,130,0.12)',
                    borderBottom: 'none',
                    background: '#FFFFFF',
                  }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                  >
                    Referral Report
                  </p>
                </div>

                {/* Desktop table */}
                <div
                  className="hidden overflow-hidden lg:block"
                  style={{
                    borderRadius: '0 0 12px 12px',
                    border: '1px solid rgba(0,100,130,0.12)',
                  }}
                >
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <span
                      className="min-w-0 flex-1 py-3.5 pr-3 pl-5 text-sm font-bold tracking-wider uppercase"
                      style={{ color: '#4A7080' }}
                    >
                      Patient
                    </span>
                    <span
                      className="w-44 shrink-0 py-3.5 pr-4 text-sm font-bold tracking-wider uppercase"
                      style={{ color: '#4A7080' }}
                    >
                      Department
                    </span>
                    <span
                      className="w-48 shrink-0 py-3.5 pr-4 text-sm font-bold tracking-wider uppercase"
                      style={{ color: '#4A7080' }}
                    >
                      Referred To
                    </span>
                    <span
                      className="w-32 shrink-0 py-3.5 pr-4 text-sm font-bold tracking-wider uppercase"
                      style={{ color: '#4A7080' }}
                    >
                      Date
                    </span>
                    <span
                      className="w-28 shrink-0 py-3.5 pr-5 text-sm font-bold tracking-wider uppercase"
                      style={{ color: '#4A7080' }}
                    >
                      Status
                    </span>
                  </div>

                  {pageState === 'loading' ? (
                    <div>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex animate-pulse items-center bg-white"
                          style={{
                            borderBottom: i === 3 ? undefined : '1px solid rgba(0,100,130,0.08)',
                          }}
                        >
                          <div className="min-w-0 flex-1 py-4 pr-3 pl-5">
                            <div className="h-4 w-32 rounded bg-slate-100" />
                          </div>
                          <div className="w-44 shrink-0 py-4 pr-4">
                            <div className="h-4 w-24 rounded bg-slate-100" />
                          </div>
                          <div className="w-48 shrink-0 py-4 pr-4">
                            <div className="h-4 w-28 rounded bg-slate-100" />
                          </div>
                          <div className="w-32 shrink-0 py-4 pr-4">
                            <div className="h-4 w-20 rounded bg-slate-100" />
                          </div>
                          <div className="w-28 shrink-0 py-4 pr-5">
                            <div className="h-6 w-20 rounded-full bg-slate-100" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : REFERRAL_REPORT_ROWS.length === 0 ? (
                    <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 py-10 text-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No referrals recorded yet
                      </p>
                    </div>
                  ) : (
                    <div>
                      {REFERRAL_REPORT_ROWS.map((row, idx) => {
                        const cfg = STATUS_CFG[row.status];
                        const isLast = idx === REFERRAL_REPORT_ROWS.length - 1;
                        return (
                          <div
                            key={row.id}
                            className="flex items-center bg-white transition-colors duration-100 hover:bg-[#F5FBFD]"
                            style={{
                              borderBottom: isLast ? undefined : '1px solid rgba(0,100,130,0.08)',
                            }}
                          >
                            <div className="min-w-0 flex-1 py-4 pr-3 pl-5">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                              >
                                {row.patient}
                              </p>
                            </div>
                            <div className="w-44 shrink-0 py-4 pr-4">
                              <p
                                className="truncate font-sans"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                {row.department}
                              </p>
                            </div>
                            <div className="w-48 shrink-0 py-4 pr-4">
                              <p
                                className="truncate font-sans"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                              >
                                {row.referredTo}
                              </p>
                            </div>
                            <div className="w-32 shrink-0 py-4 pr-4">
                              <p
                                className="font-sans whitespace-nowrap"
                                style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                              >
                                {formatDate(row.date)}
                              </p>
                            </div>
                            <div className="w-28 shrink-0 py-4 pr-5">
                              <span
                                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap"
                                style={{
                                  borderColor: cfg.color,
                                  color: cfg.color,
                                  background: cfg.bg,
                                }}
                              >
                                {cfg.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Mobile cards */}
                <div
                  className="space-y-3 lg:hidden"
                  style={{
                    borderRadius: '0 0 12px 12px',
                    border: '1px solid rgba(0,100,130,0.12)',
                    borderTop: 'none',
                    padding: 12,
                  }}
                >
                  {pageState === 'loading'
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="animate-pulse space-y-2 p-3"
                          style={{ borderRadius: 10, border: '1px solid rgba(0,100,130,0.10)' }}
                        >
                          <div className="h-4 w-32 rounded bg-slate-100" />
                          <div className="h-3.5 w-40 rounded bg-slate-100" />
                          <div className="h-3.5 w-24 rounded bg-slate-100" />
                        </div>
                      ))
                    : REFERRAL_REPORT_ROWS.map((row) => {
                        const cfg = STATUS_CFG[row.status];
                        return (
                          <div
                            key={row.id}
                            className="p-3"
                            style={{ borderRadius: 10, border: '1px solid rgba(0,100,130,0.10)' }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                              >
                                {row.patient}
                              </p>
                              <span
                                className="shrink-0 rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap"
                                style={{
                                  borderColor: cfg.color,
                                  color: cfg.color,
                                  background: cfg.bg,
                                }}
                              >
                                {cfg.label}
                              </span>
                            </div>
                            <p
                              className="mt-1 font-sans"
                              style={{ fontSize: 14, lineHeight: '22px', color: '#25464D' }}
                            >
                              {row.department} · {row.referredTo}
                            </p>
                            <p
                              className="mt-0.5 font-sans"
                              style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                            >
                              {formatDate(row.date)}
                            </p>
                          </div>
                        );
                      })}
                </div>
              </div>

              <div className="h-6" />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
