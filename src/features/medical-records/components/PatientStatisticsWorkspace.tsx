'use client';

import { Camera, FileSpreadsheet, FileText as FileTextIcon, Info, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  AGE_DISTRIBUTION,
  EMERGENCY_REGISTRATION_BY_CATEGORY,
  FACULTY_DISTRIBUTION_STUDENTS,
  GENDER_DISTRIBUTION,
  INSURANCE_DISTRIBUTION,
  KEY_INSIGHTS,
  MONTHLY_GROWTH,
  PATIENT_STATS,
  TOP_DIAGNOSES,
  TOTAL_EMERGENCY_REGISTRATIONS_DISPLAY,
  TOTAL_PATIENTS_DISPLAY,
  TOTAL_STUDENTS_DISPLAY,
  TOTAL_VISITS_DISPLAY,
  VISIT_FREQUENCY,
  type DistributionSlice,
  type LabeledBar,
  type TrendPoint,
} from '@/features/medical-records/__mocks__/patientStatisticsFixtures';

function computeTick(maxValue: number): number {
  if (maxValue <= 0) return 1;
  let tick = Math.ceil(maxValue / 4);
  if (tick > 1000) tick = Math.ceil(tick / 500) * 500;
  else if (tick > 100) tick = Math.ceil(tick / 100) * 100;
  else if (tick > 20) tick = Math.ceil(tick / 10) * 10;
  return tick;
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(n);
}

// ── Mini sparkline for Key Insights cards ───────────────────────────────────
function Sparkline({ data, color, animate }: { data: number[]; color: string; animate: boolean }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const W = 100;
  const H = 28;
  const stepX = W / (data.length - 1);
  const points = data.map((v, i) => ({ x: i * stepX, y: H - ((v - min) / range) * H }));
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="mt-2 h-7 w-full"
      aria-hidden="true"
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: 400,
          strokeDashoffset: animate ? 0 : 400,
          transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </svg>
  );
}

// ── Donut chart with optional center total ──────────────────────────────────
function DonutChart({
  data,
  total,
  animate,
}: {
  data: DistributionSlice[];
  total?: string;
  animate: boolean;
}) {
  const sum = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  type Seg = DistributionSlice & { length: number; offset: number };
  const { segments } = data.reduce<{ cumulative: number; segments: Seg[] }>(
    (acc, d) => {
      const rawLength = (d.value / sum) * circumference;
      const offset = -(acc.cumulative / sum) * circumference;
      return {
        cumulative: acc.cumulative + d.value,
        segments: [...acc.segments, { ...d, length: Math.max(0, rawLength - gapPx), offset }],
      };
    },
    { cumulative: 0, segments: [] },
  );

  return (
    <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: 150, height: 150 }}
      >
        <svg
          viewBox="0 0 128 128"
          style={{ width: 150, height: 150 }}
          role="img"
          aria-label="Distribution donut chart"
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
                  transition: `stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms`,
                }}
              />
            ))}
          </g>
        </svg>
        {total && (
          <div className="absolute flex flex-col items-center">
            <span className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
              {total}
            </span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Total</span>
          </div>
        )}
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
        {data.map((d) => (
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
              {d.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal bar chart (Top Diagnoses) ────────────────────────────────────
function HorizontalBarChart({ data, animate }: { data: LabeledBar[]; animate: boolean }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const step = computeTick(maxValue);
  const niceMax = step * 4;
  const ticks = [0, step, step * 2, step * 3, step * 4];

  return (
    <div className="mt-2 flex flex-col gap-3">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3">
          <span
            className="w-56 shrink-0 truncate text-right font-sans"
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            {d.label}
          </span>
          <div
            className="relative h-5 min-w-0 flex-1 rounded-[4px]"
            style={{ background: 'rgba(139,92,246,0.08)' }}
          >
            <div
              className="h-full rounded-[4px]"
              style={{
                width: animate ? `${(d.value / niceMax) * 100}%` : 0,
                background: '#8B5CF6',
                transition: `width 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms`,
              }}
            />
          </div>
          <span
            className="w-14 shrink-0 font-sans font-medium"
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            {d.value.toLocaleString()}
          </span>
        </div>
      ))}
      <div className="mt-1 flex items-center gap-3">
        <span className="w-56 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 justify-between">
          {ticks.map((t) => (
            <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {formatCompact(t)}
            </span>
          ))}
        </div>
        <span className="w-14 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}

// ── Area chart (Monthly Growth) ──────────────────────────────────────────────
function AreaChart({
  data,
  color,
  animate,
}: {
  data: TrendPoint[];
  color: string;
  animate: boolean;
}) {
  const gradientId = useId();
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const tick = computeTick(maxValue);
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];
  const W = 400;
  const H = 200;
  const stepX = W / (data.length - 1);
  const points = data.map((d, i) => ({ x: i * stepX, y: H - (d.value / niceMax) * H }));
  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD = `${lineD} L ${points[points.length - 1]?.x.toFixed(1)} ${H} L ${points[0]?.x.toFixed(1)} ${H} Z`;

  return (
    <div className="mt-2 flex gap-3" style={{ height: 240 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 34 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {formatCompact(t)}
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
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={areaD}
            fill={`url(#${gradientId})`}
            style={{ opacity: animate ? 1 : 0, transition: 'opacity 0.6s ease 0.4s' }}
          />
          <path
            d={lineD}
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
              r={3.5}
              fill={color}
              vectorEffect="non-scaling-stroke"
              style={{ opacity: animate ? 1 : 0, transition: `opacity 0.3s ${i * 60}ms` }}
            />
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-between" style={{ height: 24 }}>
          {data.map((d) => (
            <span key={d.label} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PatientStatisticsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [animateCharts, setAnimateCharts] = useState(false);
  const now = useState(() => new Date())[0];

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

  function handleSnapshot() {
    toast.success('Snapshot captured', 'A snapshot of this dashboard has been saved.');
  }

  function handleExportExcel() {
    const rows = [
      ['Metric', 'Value', 'Detail'],
      ...PATIENT_STATS.map((s) => [s.label, s.value, s.subLabel]),
      ...TOP_DIAGNOSES.map((d) => [`Diagnosis: ${d.label}`, String(d.value), '']),
      ...INSURANCE_DISTRIBUTION.map((d) => [
        `Insurance: ${d.label}`,
        String(d.value),
        `${d.percent}% of total patients`,
      ]),
      ...EMERGENCY_REGISTRATION_BY_CATEGORY.map((d) => [
        `Emergency Registrations: ${d.label}`,
        String(d.value),
        `${d.percent}% of ${TOTAL_EMERGENCY_REGISTRATIONS_DISPLAY} emergency registrations`,
      ]),
    ];
    downloadCSV('patient-statistics-excel', rows);
    toast.success('Export ready', 'Patient Statistics downloaded for Excel.');
  }

  function handleExportPDF() {
    const statsHtml = PATIENT_STATS.map(
      (s) =>
        `<tr><td>${escapeHtml(s.label)}</td><td>${escapeHtml(s.value)}</td><td>${escapeHtml(s.subLabel)}</td></tr>`,
    ).join('');
    const insuranceHtml = INSURANCE_DISTRIBUTION.map(
      (d) =>
        `<tr><td>${escapeHtml(d.label)}</td><td>${d.value.toLocaleString()}</td><td>${d.percent}%</td></tr>`,
    ).join('');
    const emergencyHtml = EMERGENCY_REGISTRATION_BY_CATEGORY.map(
      (d) =>
        `<tr><td>${escapeHtml(d.label)}</td><td>${d.value.toLocaleString()}</td><td>${d.percent}%</td></tr>`,
    ).join('');
    downloadPDF(
      'patient-statistics',
      `<h1>Patient Statistics</h1>
      <p class="meta">Comprehensive overview of patient demographics and center performance.</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Metric</th><th>Value</th><th>Detail</th></tr></thead>
        <tbody>${statsHtml}</tbody>
      </table>
      <h2 style="font-size:16px;margin:20px 0 6px">Insurance Details</h2>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Provider</th><th>Patients</th><th>% of Total</th></tr></thead>
        <tbody>${insuranceHtml}</tbody>
      </table>
      <h2 style="font-size:16px;margin:20px 0 6px">Emergency Registrations by Category</h2>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
        <thead><tr><th>Category</th><th>Registrations</th><th>% of Total</th></tr></thead>
        <tbody>${emergencyHtml}</tbody>
      </table>`,
    );
    toast.success('Export ready', 'Patient Statistics downloaded as PDF.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.medicalRecordsDashboard)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Reports</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Patient Statistics
            </span>
          </nav>

          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Patient Statistics
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Comprehensive overview of patient demographics and center performance.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSnapshot}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Camera style={{ width: 15, height: 15 }} />
                Dashboard Snapshot
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <FileSpreadsheet style={{ width: 15, height: 15, color: '#22C55E' }} />
                Export Excel
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <FileTextIcon style={{ width: 15, height: 15, color: '#EF4444' }} />
                Export PDF
              </button>
              <span
                className="flex h-11 shrink-0 items-center rounded-[10px] px-4 font-sans font-medium"
                style={{ fontSize: 14, color: '#4A7080', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Jun 1, 2026 - Jun 30, 2026
              </span>
            </div>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {PATIENT_STATS.map((s) => (
              <div
                key={s.id}
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: s.iconBg }}
                  >
                    <s.icon style={{ width: 17, height: 17, color: s.color }} />
                  </div>
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {s.label}
                  </p>
                </div>
                <p
                  className="font-display mt-2 font-semibold"
                  style={{ fontSize: 22, color: '#0D2630' }}
                >
                  {s.value}
                </p>
                <p
                  className="mt-0.5 font-sans font-medium"
                  style={{ fontSize: 14, color: s.direction ? '#16A34A' : '#8A98A3' }}
                >
                  {s.direction === 'up' ? '↑ ' : ''}
                  {s.subLabel}
                </p>
              </div>
            ))}
          </div>

          {/* ── Distribution + diagnoses charts ───────────────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Age Distribution
              </p>
              <DonutChart
                data={AGE_DISTRIBUTION}
                total={TOTAL_PATIENTS_DISPLAY}
                animate={animateCharts}
              />
            </div>
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Gender Distribution
              </p>
              <DonutChart
                data={GENDER_DISTRIBUTION}
                total={TOTAL_PATIENTS_DISPLAY}
                animate={animateCharts}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Faculty Distribution (Students)
              </p>
              <DonutChart
                data={FACULTY_DISTRIBUTION_STUDENTS}
                total={TOTAL_STUDENTS_DISPLAY}
                animate={animateCharts}
              />
            </div>
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Top Diagnoses
              </p>
              <HorizontalBarChart data={TOP_DIAGNOSES} animate={animateCharts} />
            </div>
          </div>

          {/* ── Insurance Details + Emergency Registration ────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Insurance Details
              </p>
              <DonutChart
                data={INSURANCE_DISTRIBUTION}
                total={TOTAL_PATIENTS_DISPLAY}
                animate={animateCharts}
              />
            </div>
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Emergency Registrations by Category (Student / Staff)
              </p>
              <DonutChart
                data={EMERGENCY_REGISTRATION_BY_CATEGORY}
                total={TOTAL_EMERGENCY_REGISTRATIONS_DISPLAY}
                animate={animateCharts}
              />
            </div>
          </div>

          {/* ── Visit Frequency + Monthly Growth ──────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Visit Frequency (Number of Visits per Patient)
              </p>
              <DonutChart
                data={VISIT_FREQUENCY}
                total={TOTAL_VISITS_DISPLAY}
                animate={animateCharts}
              />
            </div>
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Monthly Growth (New Patients)
              </p>
              <AreaChart data={MONTHLY_GROWTH} color="#3B82F6" animate={animateCharts} />
            </div>
          </div>

          {/* ── Key Insights ───────────────────────────────────────────────── */}
          <div className="mt-5">
            <h2 className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
              Key Insights
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {KEY_INSIGHTS.map((k) => (
                <div
                  key={k.id}
                  className="rounded-[12px] p-4"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: k.iconBg }}
                    >
                      <k.icon style={{ width: 17, height: 17, color: k.color }} />
                    </div>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {k.label}
                    </p>
                  </div>
                  <p
                    className="font-display mt-2 font-semibold"
                    style={{ fontSize: 18, color: '#0D2630' }}
                  >
                    {k.value}
                  </p>
                  <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                    {k.subLabel}
                  </p>
                  <Sparkline data={k.sparkline} color={k.color} animate={animateCharts} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Analytics Summary ──────────────────────────────────────────── */}
          <div
            className="mt-5 flex flex-col gap-3 rounded-[12px] p-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <Info
                style={{ width: 18, height: 18, color: '#00B4D8', flexShrink: 0, marginTop: 2 }}
              />
              <div className="min-w-0">
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Analytics Summary
                </p>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  There was a total of 2,458 new patient registrations this month. General
                  Outpatient Department recorded the highest visits. Fever remains the most common
                  complaint.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <RefreshCcw style={{ width: 14, height: 14, color: '#8A98A3' }} />
              <span style={{ fontSize: 14, color: '#8A98A3' }}>
                Last updated: {formatHumanDate(now.toISOString())} {formatTime(now.toISOString())}
              </span>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
