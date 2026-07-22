'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  Droplet,
  Download,
  FilePlus2,
  GlassWater,
  Heart,
  HeartPulse,
  Minus,
  Table2,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime, isToday } from '@/utils/datetime';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { type NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';
import {
  clearPendingVitalsPatientId,
  hasRecordedVitals,
  markVitalsRecorded,
} from '@/features/nursing/store/nursingWorkflowStore';
import {
  bloodSugarFlag,
  bpFlag,
  computeNews2,
  getBodyMeasurements,
  getVitalReadingsForPatient,
  pulseFlag,
  respRateFlag,
  spo2Flag,
  tempFlag,
  type Flag,
  type VitalReading,
} from '@/features/nursing/__mocks__/vitalSignsFixtures';
import { NursePatientPicker } from './NursePatientPicker';
import type { FluidBalanceEntry } from './FluidBalanceModal';
import type { RecordedVitals } from './RecordVitalsModal';

const RecordVitalsModal = dynamic(
  () => import('./RecordVitalsModal').then((m) => m.RecordVitalsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FluidBalanceModal = dynamic(
  () => import('./FluidBalanceModal').then((m) => m.FluidBalanceModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';
type RangeKey = '6h' | '12h' | '24h' | '3d' | '7d';
type ViewMode = 'chart' | 'table';

const RANGE_OPTIONS: { key: RangeKey; label: string; hours: number }[] = [
  { key: '6h', label: 'Last 6 Hours', hours: 6 },
  { key: '12h', label: 'Last 12 Hours', hours: 12 },
  { key: '24h', label: 'Last 24 Hours', hours: 24 },
  { key: '3d', label: 'Last 3 Days', hours: 24 * 3 },
  { key: '7d', label: 'Last 7 Days', hours: 24 * 7 },
];

const FLAG_CFG: Record<Flag, { color: string; border: string; bg: string }> = {
  High: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Low: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Normal: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
};

const NEWS2_RISK_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#EF4444', border: 'rgba(239,68,68,0.35)', bg: 'rgba(239,68,68,0.06)' },
  Medium: { color: '#F59E0B', border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.06)' },
  Low: { color: '#22C55E', border: 'rgba(34,197,94,0.35)', bg: 'rgba(34,197,94,0.06)' },
};

function timingLabel(iso: string): string {
  return isToday(iso) ? `Today, ${formatTime(iso)}` : `${formatHumanDate(iso)}, ${formatTime(iso)}`;
}

function rangeAxisLabel(iso: string, range: RangeKey): string {
  return range === '3d' || range === '7d' ? formatHumanDate(iso).slice(0, 6) : formatTime(iso);
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministically splits a known running total across N buckets so the
 * bars always sum back to the exact figure shown elsewhere for this patient
 * (patientRecordFixtures' intakeMl/outputMl) — never an independently
 * invented series that could drift from that total. */
function distributeTotal(seedKey: string, total: number, buckets: number): number[] {
  if (buckets <= 0) return [];
  const rand = mulberry32(hashSeed(seedKey));
  const weights = Array.from({ length: buckets }, () => 0.3 + rand());
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / weightSum) * total);
  const rounded = raw.map((v) => Math.round(v));
  const drift = total - rounded.reduce((a, b) => a + b, 0);
  if (rounded.length > 0) rounded[rounded.length - 1]! += drift;
  return rounded.map((v) => Math.max(0, v));
}

function computeTick(maxValue: number): number {
  if (maxValue <= 0) return 1;
  let tick = Math.ceil(maxValue / 4);
  if (tick > 100) tick = Math.ceil(tick / 20) * 20;
  else if (tick > 20) tick = Math.ceil(tick / 10) * 10;
  else if (tick > 10) tick = Math.ceil(tick / 5) * 5;
  return tick;
}

type ChartPoint = { label: string; value: number };
type ChartSeries = { data: ChartPoint[]; color: string; name?: string };

// ── Line/area trend chart — fixed clinical y-range, optional area fill,
// optional multi-series (Blood Pressure's systolic/diastolic pair) ──────────
function ObservationTrendChart({
  seriesList,
  min,
  max,
  ticks,
  fillArea,
}: {
  seriesList: ChartSeries[];
  min: number;
  max: number;
  ticks: number[];
  fillArea?: boolean;
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const W = 700;
  const H = 160;
  const range = max - min || 1;
  const primary = seriesList[0];
  const dataLen = primary?.data.length ?? 0;
  const stepX = dataLen > 1 ? W / (dataLen - 1) : W;
  const toY = (v: number) => H - ((Math.min(max, Math.max(min, v)) - min) / range) * H;

  const xLabelIdx =
    dataLen > 0
      ? Array.from(new Set([0, Math.round((dataLen - 1) / 2), dataLen - 1])).filter(
          (v) => v >= 0 && v < dataLen,
        )
      : [];

  return (
    <div className="mt-2 flex gap-3" style={{ height: 176 }}>
      <div className="flex shrink-0 flex-col justify-between pb-5 text-right" style={{ width: 34 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 20px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0"
          style={{ height: 'calc(100% - 20px)', width: '100%' }}
        >
          {seriesList.map((s) => {
            const points = s.data.map((d, i) => ({ x: i * stepX, y: toY(d.value) }));
            const pathD = points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');
            const areaD =
              points.length > 0
                ? `${pathD} L ${points[points.length - 1]!.x.toFixed(1)} ${H} L ${points[0]!.x.toFixed(1)} ${H} Z`
                : '';
            return (
              <g key={s.color}>
                {fillArea && (
                  <path
                    d={areaD}
                    fill={s.color}
                    opacity={animate ? 0.12 : 0}
                    style={{ transition: 'opacity 0.9s cubic-bezier(0.22,1,0.36,1)' }}
                  />
                )}
                <path
                  d={pathD}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    strokeDasharray: 1400,
                    strokeDashoffset: animate ? 0 : 1400,
                    transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
                {dataLen <= 20 &&
                  points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={3}
                      fill={s.color}
                      vectorEffect="non-scaling-stroke"
                      opacity={animate ? 1 : 0}
                      style={{ transition: `opacity 0.4s ease ${i * 20}ms` }}
                    />
                  ))}
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex" style={{ height: 20 }}>
          {xLabelIdx.map((i, idx) => (
            <span
              key={i}
              className="min-w-0 flex-1 truncate font-sans"
              style={{
                fontSize: 14,
                color: '#8A98A3',
                textAlign: idx === 0 ? 'left' : idx === xLabelIdx.length - 1 ? 'right' : 'center',
              }}
            >
              {primary?.data[i]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Vertical bar chart — auto nice-max scaling from 0 (fluid totals) ────────
function ObservationBarChart({ data, color }: { data: ChartPoint[]; color: string }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const tick = computeTick(maxValue);
  const niceMax = tick * 4;
  const ticks = [0, tick, tick * 2, tick * 3, tick * 4];
  const barLabelIdx =
    data.length > 0
      ? Array.from(new Set([0, Math.round((data.length - 1) / 2), data.length - 1])).filter(
          (v) => v >= 0 && v < data.length,
        )
      : [];

  return (
    <div className="mt-2 flex gap-3" style={{ height: 176 }}>
      <div className="flex shrink-0 flex-col justify-between pb-5 text-right" style={{ width: 34 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {t}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 20px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          ))}
        </div>
        <div
          className="absolute inset-x-0 top-0 flex items-end gap-1"
          style={{ height: 'calc(100% - 20px)' }}
        >
          {data.map((d, i) => (
            <div
              key={`${d.label}-${i}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              <div
                className="w-full rounded-t-[3px]"
                style={{
                  height: animate ? `${(d.value / niceMax) * 100}%` : 0,
                  background: color,
                  transition: `height 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 30}ms`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex" style={{ height: 20 }}>
          {barLabelIdx.map((i, idx) => (
            <span
              key={i}
              className="min-w-0 flex-1 truncate font-sans"
              style={{
                fontSize: 14,
                color: '#8A98A3',
                textAlign: idx === 0 ? 'left' : idx === barLabelIdx.length - 1 ? 'right' : 'center',
              }}
            >
              {data[i]?.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  unit,
  rightLabel,
  rightValue,
  legend,
  children,
}: {
  icon: typeof Heart;
  iconColor: string;
  iconBg: string;
  label: string;
  unit?: string;
  rightLabel: string;
  rightValue: string;
  legend?: { color: string; name: string }[];
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: iconBg }}
          >
            <Icon style={{ width: 16, height: 16, color: iconColor }} />
          </div>
          <div>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {label}
            </p>
            {unit && <p style={{ fontSize: 14, color: '#8A98A3' }}>{unit}</p>}
          </div>
        </div>
        <div className="text-right">
          <p style={{ fontSize: 14, color: '#8A98A3' }}>{rightLabel}</p>
          <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
            {rightValue}
          </p>
        </div>
      </div>
      {legend && (
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {legend.map((l) => (
            <span
              key={l.name}
              className="flex items-center gap-1.5"
              style={{ fontSize: 14, color: '#4A7080' }}
            >
              <span className="size-2 rounded-full" style={{ background: l.color }} />
              {l.name}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

function EmptyObservationsState({ onRecord }: { onRecord: () => void }) {
  return (
    <div
      className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(0,180,216,0.12)' }}
      >
        <HeartPulse style={{ width: 24, height: 24, color: '#00B4D8' }} />
      </div>
      <div>
        <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          No observations recorded yet
        </p>
        <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
          This patient hasn&apos;t had a first observation taken. Record their baseline to start
          tracking trends.
        </p>
      </div>
      <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
        <button
          type="button"
          onClick={onRecord}
          className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
          style={{ background: '#00B4D8', fontSize: 14 }}
        >
          <FilePlus2 style={{ width: 16, height: 16 }} />
          Record First Observation
        </button>
      </PermissionGate>
    </div>
  );
}

function SkeletonChartCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-2">
        <div className="size-8 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mt-4 h-[140px] animate-pulse rounded bg-slate-100" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ObservationChartsWorkspace() {
  const [selectedPatient, setSelectedPatient] = useState<NursePatient | null>(null);

  useEffect(() => {
    clearPendingVitalsPatientId();
  }, []);

  if (!selectedPatient) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
          <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Observation Charts
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Continuous patient monitoring and trends.
            </p>
            <div className="mt-5">
              <NursePatientPicker
                onSelect={setSelectedPatient}
                description="Choose a patient from your assigned roster to view their observation charts."
                actionVerb="observation charts"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PatientObservationPanel
      key={selectedPatient.id}
      patient={selectedPatient}
      onChangePatient={() => setSelectedPatient(null)}
    />
  );
}

function PatientObservationPanel({
  patient,
  onChangePatient,
}: {
  patient: NursePatient;
  onChangePatient: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const record = getPatientRecord(patient.id)!;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [range, setRange] = useState<RangeKey>('24h');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [fluidModalOpen, setFluidModalOpen] = useState(false);
  const [showEwsHistory, setShowEwsHistory] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [fluidTotals, setFluidTotals] = useState({
    intakeMl: record.intakeMl,
    outputMl: record.outputMl,
    lastRecordedAt: record.intakeLastRecorded,
  });
  const [ewsLastCalculatedAt, setEwsLastCalculatedAt] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const isFirstEverVisit = patient.isPreAdmission && patient.isNewPatient;
      const hasHistory = !isFirstEverVisit || hasRecordedVitals(patient.id);
      setReadings(hasHistory ? getVitalReadingsForPatient(patient.id) : []);
      setPageState('loaded');
    }, 700);
    return () => clearTimeout(t);
  }, [patient.id, patient.isPreAdmission, patient.isNewPatient]);

  useEffect(() => {
    const t = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(t);
  }, [readings, range]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 60 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const cutoffMs = RANGE_OPTIONS.find((r) => r.key === range)!.hours * 3_600_000;
  const windowed = readings
    .filter((r) => nowMs - new Date(r.recordedAt).getTime() <= cutoffMs)
    .slice()
    .reverse();
  const latest = readings[0];
  const earliestInWindow = windowed[0];

  function seriesFor(key: keyof VitalReading, roundDecimals = 0): ChartPoint[] {
    return windowed.map((r) => ({
      label: rangeAxisLabel(r.recordedAt, range),
      value:
        roundDecimals > 0 ? Number((r[key] as number).toFixed(roundDecimals)) : (r[key] as number),
    }));
  }

  const intakeBuckets = distributeTotal(
    `${patient.id}-intake-${windowed.length}`,
    fluidTotals.intakeMl,
    windowed.length,
  );
  const outputBuckets = distributeTotal(
    `${patient.id}-output-${windowed.length}`,
    fluidTotals.outputMl,
    windowed.length,
  );
  const intakeSeries: ChartPoint[] = windowed.map((r, i) => ({
    label: rangeAxisLabel(r.recordedAt, range),
    value: intakeBuckets[i] ?? 0,
  }));
  const outputSeries: ChartPoint[] = windowed.map((r, i) => ({
    label: rangeAxisLabel(r.recordedAt, range),
    value: outputBuckets[i] ?? 0,
  }));

  const news2 = latest ? computeNews2(latest) : null;
  const totalPages = Math.max(1, Math.ceil(windowed.length / tablePageSize));
  const safeTablePage = Math.min(tablePage, totalPages);
  const tableRows = windowed
    .slice()
    .reverse()
    .slice(
      (safeTablePage - 1) * tablePageSize,
      (safeTablePage - 1) * tablePageSize + tablePageSize,
    );

  function handleSaveObservation(vitals: RecordedVitals) {
    if (patient.isPreAdmission) markVitalsRecorded(patient.id);
    const newReading: VitalReading = {
      id: `${patient.id}-r${readings.length}-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      systolic: vitals.systolic,
      diastolic: vitals.diastolic,
      pulse: vitals.pulse,
      respRate: vitals.respRate,
      temp: vitals.temp,
      spo2: vitals.spo2,
      painScore: vitals.painScore,
      bloodSugar: vitals.bloodSugar,
    };
    setReadings((prev) => [newReading, ...prev]);
    setRecordModalOpen(false);
    toast.success('Observation recorded', `New observation saved for ${patient.patientName}.`);
  }

  function handleSaveFluidBalance(entry: FluidBalanceEntry) {
    setFluidTotals((prev) => ({
      intakeMl: prev.intakeMl + entry.intakeMl,
      outputMl: prev.outputMl + entry.outputMl,
      lastRecordedAt: new Date().toISOString(),
    }));
    setFluidModalOpen(false);
    toast.success(
      'Fluid balance updated',
      `Added ${entry.intakeMl} ml intake / ${entry.outputMl} ml output for ${patient.patientName}.`,
    );
  }

  function handleCalculateEws() {
    if (!latest || !news2) return;
    setEwsLastCalculatedAt(new Date().toISOString());
    toast.success(
      `EWS: ${news2.total} — ${news2.risk} Risk`,
      news2.risk === 'High'
        ? 'Urgent clinical review required.'
        : news2.risk === 'Medium'
          ? 'Increased monitoring required.'
          : 'Routine monitoring is sufficient.',
    );
  }

  function handleExport() {
    if (!latest) return;
    const rowsHtml = windowed
      .slice()
      .reverse()
      .map((r, i) => {
        const bucket = windowed.length - 1 - i;
        return `<tr><td>${escapeHtml(formatHumanDate(r.recordedAt))} ${escapeHtml(formatTime(r.recordedAt))}</td><td>${r.systolic}/${r.diastolic}</td><td>${r.pulse}</td><td>${r.respRate}</td><td>${r.temp.toFixed(1)}</td><td>${r.spo2}</td><td>${r.painScore}</td><td>${r.bloodSugar}</td><td>${intakeBuckets[bucket] ?? 0}</td><td>${outputBuckets[bucket] ?? 0}</td></tr>`;
      })
      .join('');
    downloadPDF(
      `observation-chart-${patient.mrn}`,
      `<h1>Observation Chart — ${escapeHtml(patient.patientName)}</h1>
       <p class="meta">MRN: ${escapeHtml(patient.mrn)} · ${patient.age} Y / ${patient.gender} · ${escapeHtml(RANGE_OPTIONS.find((r) => r.key === range)!.label)}</p>
       <table>
         <thead><tr><th>Date &amp; Time</th><th>BP</th><th>Pulse</th><th>RR</th><th>Temp</th><th>SpO2</th><th>Pain</th><th>BS</th><th>Intake (ml)</th><th>Output (ml)</th></tr></thead>
         <tbody>${rowsHtml}</tbody>
       </table>`,
    );
    toast.success('Export ready', 'Observation chart downloaded as PDF.');
  }

  const allergyCfg = record.allergies.length
    ? { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' }
    : { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' };

  const rangeStart = windowed[0]?.recordedAt;
  const rangeEnd = windowed[windowed.length - 1]?.recordedAt ?? latest?.recordedAt;

  // ── Observation Trends Summary — computed from window start vs. latest ──
  const trends: { text: string; ok: boolean }[] = [];
  if (latest && earliestInWindow) {
    const tempDelta = latest.temp - earliestInWindow.temp;
    trends.push({
      text:
        tempFlag(latest.temp) === 'Normal'
          ? `Temperature is ${tempDelta < -0.1 ? 'trending down and' : tempDelta > 0.1 ? 'trending up but' : 'stable and'} within normal range.`
          : `Temperature is ${FLAG_CFG[tempFlag(latest.temp)] ? tempFlag(latest.temp).toLowerCase() : ''} — outside normal range.`,
      ok: tempFlag(latest.temp) === 'Normal',
    });
    const pulseOk = pulseFlag(latest.pulse) === 'Normal';
    const respOk = respRateFlag(latest.respRate) === 'Normal';
    trends.push({
      text:
        pulseOk && respOk
          ? 'Pulse and respiration are stable.'
          : 'Pulse or respiration is outside the normal range — monitor closely.',
      ok: pulseOk && respOk,
    });
    const bpOk = bpFlag(latest.systolic) === 'Normal';
    trends.push({
      text: bpOk
        ? 'Blood pressure is within target range.'
        : 'Blood pressure is outside target range.',
      ok: bpOk,
    });
    const fluidBalance = fluidTotals.intakeMl - fluidTotals.outputMl;
    trends.push({
      text: `Fluid balance: ${fluidBalance >= 0 ? '+' : ''}${fluidBalance} ml.`,
      ok: true,
    });
    if (latest.painScore < earliestInWindow.painScore) {
      trends.push({
        text: `Pain score improved from ${earliestInWindow.painScore} to ${latest.painScore}.`,
        ok: true,
      });
    } else if (latest.painScore > earliestInWindow.painScore) {
      trends.push({
        text: `Pain score increased from ${earliestInWindow.painScore} to ${latest.painScore}.`,
        ok: false,
      });
    } else {
      trends.push({ text: `Pain score steady at ${latest.painScore}/10.`, ok: true });
    }
    const bsOk = bloodSugarFlag(latest.bloodSugar) === 'Normal';
    trends.push({
      text: bsOk
        ? 'Blood sugar is within range.'
        : `Blood sugar is ${bloodSugarFlag(latest.bloodSugar).toLowerCase()}.`,
      ok: bsOk,
    });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.nurseMyPatients)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              My Patients
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <button
              type="button"
              onClick={() => router.push(ROUTES.nursePatientRecord(patient.id))}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Patient Record
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ color: '#0D2630' }}>
              Observation Charts
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Observation Charts
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Continuous patient monitoring and trends.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => router.push(ROUTES.nursePatientRecord(patient.id))}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                <ArrowLeft style={{ width: 16, height: 16, color: '#4A7080' }} />
                Back to Patient Record
              </button>
              <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(true)}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ background: '#00B4D8', fontSize: 14 }}
                >
                  <FilePlus2 style={{ width: 16, height: 16 }} />
                  Add New Observation
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* ── Patient header card ─────────────────────────────────────── */}
          <div
            className="mt-4 flex flex-col gap-4 rounded-[12px] p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="font-display flex size-16 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                style={{ background: patient.avatarBg, fontSize: 20 }}
              >
                {patient.initials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 20, color: '#0D2630' }}
                  >
                    {patient.patientName}
                  </p>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                    {patient.age} Y / {patient.gender}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {patient.mrn}</span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Bed: {patient.bed}</span>
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>{patient.ward}</span>
                </div>
                <button
                  type="button"
                  onClick={onChangePatient}
                  className={`mt-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  Change Patient
                </button>
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-2.5 lg:w-[220px]">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(239,68,68,0.1)' }}
              >
                <HeartPulse style={{ width: 20, height: 20, color: '#EF4444' }} />
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Diagnosis</p>
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  {patient.diagnosis}
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  Admitted {formatHumanDate(record.admissionDate)} ({record.lengthOfStayDays} days)
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              {[
                [
                  'Code Status',
                  record.codeStatus,
                  { color: '#00B4D8', border: 'rgba(0,180,216,0.4)', bg: 'rgba(0,180,216,0.08)' },
                ],
                [
                  'Allergies',
                  record.allergies.length ? `${record.allergies.length} Recorded` : 'None Known',
                  allergyCfg,
                ],
              ].map(([label, value, cfg]) => {
                const c = cfg as { color: string; border: string; bg: string };
                return (
                  <div key={label as string} className="flex items-center justify-between gap-4">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>{label as string}</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: c.color,
                        border: `1px solid ${c.border}`,
                        background: c.bg,
                      }}
                    >
                      {value as string}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <AllergyBanner allergies={record.allergies} className="mt-4" />

          {/* ── Range tabs + range display + view/export ─────────────────── */}
          <div
            className="mt-4 flex flex-col gap-3 rounded-[12px] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-wrap gap-1 overflow-x-auto scroll-smooth">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRange(opt.key)}
                  className={`rounded-[8px] px-3 py-2 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    background: range === opt.key ? '#00B4D8' : 'transparent',
                    color: range === opt.key ? '#FFFFFF' : '#4A7080',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {rangeStart && rangeEnd && (
                <span
                  className="rounded-[10px] px-3 py-2 font-sans whitespace-nowrap"
                  style={{ fontSize: 14, color: '#4A7080', background: '#F5FBFD' }}
                >
                  {formatHumanDate(rangeStart)} {formatTime(rangeStart)} – {formatTime(rangeEnd)}
                </span>
              )}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ border: '1px solid rgba(0,100,130,0.15)', fontSize: 14, color: '#0D2630' }}
              >
                <Table2 style={{ width: 16, height: 16, color: '#00B4D8' }} />
                {viewMode === 'chart' ? 'View Table' : 'View Charts'}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ border: '1px solid rgba(0,100,130,0.15)', fontSize: 14, color: '#0D2630' }}
              >
                <Download style={{ width: 16, height: 16, color: '#00B4D8' }} />
                Export
              </button>
            </div>
          </div>

          {pageState === 'loading' ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonChartCard key={i} />
              ))}
            </div>
          ) : !latest ? (
            <EmptyObservationsState onRecord={() => setRecordModalOpen(true)} />
          ) : (
            <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="min-w-0 flex-1">
                {viewMode === 'chart' ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <ChartCard
                        icon={Thermometer}
                        iconColor="#EF4444"
                        iconBg="rgba(239,68,68,0.10)"
                        label="Temperature"
                        unit="°C"
                        rightLabel="Latest"
                        rightValue={latest.temp.toFixed(1)}
                      >
                        <ObservationTrendChart
                          seriesList={[{ data: seriesFor('temp', 1), color: '#EF4444' }]}
                          min={35}
                          max={39}
                          ticks={[35, 36, 37, 38, 39]}
                          fillArea
                        />
                      </ChartCard>
                      <ChartCard
                        icon={Heart}
                        iconColor="#EF4444"
                        iconBg="rgba(239,68,68,0.10)"
                        label="Pulse"
                        unit="bpm"
                        rightLabel="Latest"
                        rightValue={String(latest.pulse)}
                      >
                        <ObservationTrendChart
                          seriesList={[{ data: seriesFor('pulse'), color: '#22C55E' }]}
                          min={40}
                          max={120}
                          ticks={[40, 60, 80, 100, 120]}
                          fillArea
                        />
                      </ChartCard>
                      <ChartCard
                        icon={Wind}
                        iconColor="#3B82F6"
                        iconBg="rgba(59,130,246,0.10)"
                        label="Respiration"
                        unit="breaths/min"
                        rightLabel="Latest"
                        rightValue={String(latest.respRate)}
                      >
                        <ObservationTrendChart
                          seriesList={[{ data: seriesFor('respRate'), color: '#3B82F6' }]}
                          min={0}
                          max={40}
                          ticks={[0, 10, 20, 30, 40]}
                          fillArea
                        />
                      </ChartCard>
                      <ChartCard
                        icon={HeartPulse}
                        iconColor="#EF4444"
                        iconBg="rgba(239,68,68,0.10)"
                        label="Blood Pressure"
                        unit="mmHg"
                        rightLabel="Latest"
                        rightValue={`${latest.systolic}/${latest.diastolic}`}
                        legend={[
                          { color: '#EF4444', name: 'Systolic' },
                          { color: '#3B82F6', name: 'Diastolic' },
                        ]}
                      >
                        <ObservationTrendChart
                          seriesList={[
                            { data: seriesFor('systolic'), color: '#EF4444' },
                            { data: seriesFor('diastolic'), color: '#3B82F6' },
                          ]}
                          min={20}
                          max={180}
                          ticks={[20, 60, 100, 140, 180]}
                        />
                      </ChartCard>
                      <ChartCard
                        icon={Droplet}
                        iconColor="#00B4D8"
                        iconBg="rgba(0,180,216,0.10)"
                        label="Fluid Intake"
                        unit="ml"
                        rightLabel="Total"
                        rightValue={`${fluidTotals.intakeMl.toLocaleString()} ml`}
                      >
                        <ObservationBarChart data={intakeSeries} color="#60A5FA" />
                      </ChartCard>
                      <ChartCard
                        icon={GlassWater}
                        iconColor="#22C55E"
                        iconBg="rgba(34,197,94,0.10)"
                        label="Fluid Output"
                        unit="ml"
                        rightLabel="Total"
                        rightValue={`${fluidTotals.outputMl.toLocaleString()} ml`}
                      >
                        <ObservationBarChart data={outputSeries} color="#86EFAC" />
                      </ChartCard>
                      <ChartCard
                        icon={Beaker}
                        iconColor="#8B5CF6"
                        iconBg="rgba(139,92,246,0.10)"
                        label="Pain Score"
                        unit="(0-10)"
                        rightLabel="Latest"
                        rightValue={String(latest.painScore)}
                      >
                        <ObservationTrendChart
                          seriesList={[{ data: seriesFor('painScore'), color: '#8B5CF6' }]}
                          min={0}
                          max={10}
                          ticks={[0, 2, 4, 6, 8, 10]}
                          fillArea
                        />
                      </ChartCard>
                      <ChartCard
                        icon={Droplet}
                        iconColor="#F59E0B"
                        iconBg="rgba(245,158,11,0.10)"
                        label="Blood Sugar"
                        unit="mg/dL"
                        rightLabel="Latest"
                        rightValue={String(latest.bloodSugar)}
                      >
                        <ObservationTrendChart
                          seriesList={[{ data: seriesFor('bloodSugar'), color: '#F59E0B' }]}
                          min={0}
                          max={300}
                          ticks={[0, 75, 150, 225, 300]}
                          fillArea
                        />
                      </ChartCard>
                    </div>

                    {/* ── Observation Trends Summary ──────────────────────── */}
                    <div
                      className="mt-4 rounded-[12px] p-4 sm:p-5"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Observation Trends Summary
                      </h2>
                      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                        {trends.map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            {t.ok ? (
                              <CheckCircle2
                                style={{
                                  width: 16,
                                  height: 16,
                                  color: '#22C55E',
                                  marginTop: 2,
                                  flexShrink: 0,
                                }}
                              />
                            ) : (
                              <AlertTriangle
                                style={{
                                  width: 16,
                                  height: 16,
                                  color: '#F59E0B',
                                  marginTop: 2,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span style={{ fontSize: 14, color: '#4A7080' }}>{t.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Observation Table
                    </h2>
                    <div className="mt-3 overflow-x-auto scroll-smooth">
                      <div className="min-w-[860px]">
                        <div
                          className="flex"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.1)' }}
                        >
                          <div className="w-40 shrink-0 py-2 pr-2 pl-1">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Date &amp; Time
                            </span>
                          </div>
                          {[
                            'BP',
                            'Pulse',
                            'RR',
                            'Temp',
                            'SpO₂',
                            'Pain',
                            'BS',
                            'Intake',
                            'Output',
                          ].map((h) => (
                            <div key={h} className="min-w-0 flex-1 py-2 pr-2">
                              <span
                                className="font-sans font-bold tracking-wider uppercase"
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                {h}
                              </span>
                            </div>
                          ))}
                        </div>
                        {tableRows.map((r) => {
                          const bucket = windowed.findIndex((w) => w.id === r.id);
                          return (
                            <div
                              key={r.id}
                              className="flex"
                              style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
                            >
                              <div className="w-40 shrink-0 py-2.5 pr-2 pl-1">
                                <p
                                  className="whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {formatHumanDate(r.recordedAt)}, {formatTime(r.recordedAt)}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1 py-2.5 pr-2">
                                <p
                                  style={{
                                    fontSize: 14,
                                    color: FLAG_CFG[bpFlag(r.systolic)].color,
                                  }}
                                >
                                  {r.systolic}/{r.diastolic}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1 py-2.5 pr-2">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>{r.pulse}</p>
                              </div>
                              <div className="min-w-0 flex-1 py-2.5 pr-2">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>{r.respRate}</p>
                              </div>
                              <div className="min-w-0 flex-1 py-2.5 pr-2">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>
                                  {r.temp.toFixed(1)}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1 py-2.5 pr-2">
                                <p
                                  style={{ fontSize: 14, color: FLAG_CFG[spo2Flag(r.spo2)].color }}
                                >
                                  {r.spo2}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1 py-2.5 pr-2">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>{r.painScore}</p>
                              </div>
                              <div className="min-w-0 flex-1 py-2.5 pr-2">
                                <p
                                  style={{
                                    fontSize: 14,
                                    color: FLAG_CFG[bloodSugarFlag(r.bloodSugar)].color,
                                  }}
                                >
                                  {r.bloodSugar}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1 py-2.5 pr-2">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>
                                  {intakeBuckets[bucket] ?? 0}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1 py-2.5 pr-2">
                                <p style={{ fontSize: 14, color: '#0D2630' }}>
                                  {outputBuckets[bucket] ?? 0}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Pagination
                      page={safeTablePage}
                      pageSize={tablePageSize}
                      totalItems={windowed.length}
                      onPageChange={setTablePage}
                      onPageSizeChange={(size) => {
                        setTablePageSize(size);
                        setTablePage(1);
                      }}
                      itemLabel="observations"
                      pageSizeOptions={[10, 25, 50]}
                    />
                  </div>
                )}
              </div>

              {/* ── Sidebar ─────────────────────────────────────────────── */}
              <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[300px]">
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Latest Observations
                  </h2>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {(
                      [
                        [
                          Thermometer,
                          '#EF4444',
                          'Temperature',
                          `${latest.temp.toFixed(1)} °C`,
                          timingLabel(latest.recordedAt),
                        ],
                        [
                          Heart,
                          '#EF4444',
                          'Pulse',
                          `${latest.pulse} bpm`,
                          timingLabel(latest.recordedAt),
                        ],
                        [
                          Wind,
                          '#3B82F6',
                          'Respiration',
                          `${latest.respRate} /min`,
                          timingLabel(latest.recordedAt),
                        ],
                        [
                          HeartPulse,
                          '#EF4444',
                          'Blood Pressure',
                          `${latest.systolic}/${latest.diastolic} mmHg`,
                          timingLabel(latest.recordedAt),
                        ],
                        [
                          Droplet,
                          '#22C55E',
                          'SpO₂',
                          `${latest.spo2} %`,
                          timingLabel(latest.recordedAt),
                        ],
                        [
                          Beaker,
                          '#8B5CF6',
                          'Pain Score',
                          `${latest.painScore} /10`,
                          timingLabel(latest.recordedAt),
                        ],
                        [
                          Droplet,
                          '#F59E0B',
                          'Blood Sugar',
                          `${latest.bloodSugar} mg/dL`,
                          timingLabel(latest.recordedAt),
                        ],
                        [
                          Droplet,
                          '#00B4D8',
                          'Fluid Intake',
                          `${fluidTotals.intakeMl.toLocaleString()} ml`,
                          timingLabel(fluidTotals.lastRecordedAt),
                        ],
                        [
                          GlassWater,
                          '#22C55E',
                          'Fluid Output',
                          `${fluidTotals.outputMl.toLocaleString()} ml`,
                          timingLabel(fluidTotals.lastRecordedAt),
                        ],
                      ] as [typeof Heart, string, string, string, string][]
                    ).map(([Icon, color, label, value, time]) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon style={{ width: 15, height: 15, color, flexShrink: 0 }} />
                          <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {label}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {value}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`mt-3 flex h-11 w-full items-center justify-center rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      border: '1px solid rgba(0,100,130,0.15)',
                      fontSize: 14,
                      color: '#00B4D8',
                    }}
                  >
                    View All Observations
                  </button>
                </div>

                {news2 && (
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Early Warning Score (NEWS2)
                    </h2>
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="font-display flex size-14 shrink-0 items-center justify-center rounded-[12px] font-bold"
                        style={{
                          fontSize: 22,
                          color: NEWS2_RISK_CFG[news2.risk]!.color,
                          background: NEWS2_RISK_CFG[news2.risk]!.bg,
                          border: `1px solid ${NEWS2_RISK_CFG[news2.risk]!.border}`,
                        }}
                      >
                        {news2.total}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: NEWS2_RISK_CFG[news2.risk]!.color }}
                        >
                          {news2.risk} Risk
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          Last calculated: {timingLabel(ewsLastCalculatedAt ?? latest.recordedAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEwsHistory((v) => !v)}
                      className={`mt-2 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      {showEwsHistory ? 'Hide EWS History' : 'View EWS History'}
                    </button>
                    {showEwsHistory && (
                      <div
                        className="mt-2 flex flex-col gap-2"
                        style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 8 }}
                      >
                        {[
                          windowed[Math.floor(windowed.length * 0.25)],
                          windowed[Math.floor(windowed.length * 0.6)],
                          latest,
                        ]
                          .filter((r): r is VitalReading => !!r)
                          .map((r) => {
                            const score = computeNews2(r);
                            return (
                              <div key={r.id} className="flex items-center justify-between gap-2">
                                <span style={{ fontSize: 14, color: '#4A7080' }}>
                                  {timingLabel(r.recordedAt)}
                                </span>
                                <span
                                  className="rounded-full px-2 py-0.5 font-sans font-medium"
                                  style={{
                                    fontSize: 14,
                                    color: NEWS2_RISK_CFG[score.risk]!.color,
                                    border: `1px solid ${NEWS2_RISK_CFG[score.risk]!.border}`,
                                    background: NEWS2_RISK_CFG[score.risk]!.bg,
                                  }}
                                >
                                  Score {score.total} · {score.risk}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Quick Actions
                  </h2>
                  <div className="mt-3 flex flex-col gap-2">
                    <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                      <button
                        type="button"
                        onClick={() => setRecordModalOpen(true)}
                        className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          background: 'rgba(0,180,216,0.1)',
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          <FilePlus2 style={{ width: 17, height: 17, color: '#00B4D8' }} />
                          Add New Observation
                        </span>
                        <span style={{ color: '#8A98A3' }}>›</span>
                      </button>
                    </PermissionGate>
                    <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                      <button
                        type="button"
                        onClick={() => setFluidModalOpen(true)}
                        className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          background: 'rgba(34,197,94,0.1)',
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          <GlassWater style={{ width: 17, height: 17, color: '#22C55E' }} />
                          Input Fluid Balance
                        </span>
                        <span style={{ color: '#8A98A3' }}>›</span>
                      </button>
                    </PermissionGate>
                    <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                      <button
                        type="button"
                        onClick={handleCalculateEws}
                        className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          background: 'rgba(139,92,246,0.1)',
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          <TrendingUp style={{ width: 17, height: 17, color: '#8B5CF6' }} />
                          Calculate EWS
                        </span>
                        <span style={{ color: '#8A98A3' }}>›</span>
                      </button>
                    </PermissionGate>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.nursePatientRecord(patient.id))}
                      className={`flex h-11 items-center justify-between rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#0D2630', background: 'rgba(245,158,11,0.1)' }}
                    >
                      <span className="flex items-center gap-2.5">
                        <TrendingDown style={{ width: 17, height: 17, color: '#F59E0B' }} />
                        View Patient Chart
                      </span>
                      <span style={{ color: '#8A98A3' }}>›</span>
                    </button>
                  </div>
                </div>

                <div className="px-1">
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    All times displayed in WAT (West Africa Time).
                  </p>
                  <p
                    className="mt-1 flex items-center gap-1.5"
                    style={{ fontSize: 14, color: '#8A98A3' }}
                  >
                    <Minus style={{ width: 12, height: 12 }} />
                    Auto-refresh in {countdown}s
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>

      {recordModalOpen && (
        <RecordVitalsModal
          patientName={patient.patientName}
          currentWeight={getBodyMeasurements(patient.id).weight}
          currentHeight={getBodyMeasurements(patient.id).height}
          onClose={() => setRecordModalOpen(false)}
          onSave={handleSaveObservation}
        />
      )}

      {fluidModalOpen && (
        <FluidBalanceModal
          patientName={patient.patientName}
          onClose={() => setFluidModalOpen(false)}
          onSave={handleSaveFluidBalance}
        />
      )}
    </div>
  );
}
