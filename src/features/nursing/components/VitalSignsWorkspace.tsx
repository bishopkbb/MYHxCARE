'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Droplet,
  FilePlus2,
  Gauge,
  Heart,
  HeartPulse,
  Printer,
  Ruler,
  ShieldAlert,
  Thermometer,
  User,
  Weight as WeightIcon,
  Wind,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { VitalTrendChart, type VitalChartPoint } from '@components/shared/VitalTrendChart';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime, isToday, toRelativeTime } from '@/utils/datetime';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { type NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import { getPatientRecord } from '@/features/nursing/__mocks__/patientRecordFixtures';
import {
  clearPendingVitalsPatientId,
  getEffectiveRoster,
  hasRecordedVitals,
  markVitalsRecorded,
  peekPendingVitalsPatientId,
} from '@/features/nursing/store/nursingWorkflowStore';
import {
  bloodSugarFlag,
  bpFlag,
  computeNews2,
  getBodyMeasurements,
  getVitalReadingsForPatient,
  painBand,
  pulseFlag,
  respRateFlag,
  spo2Flag,
  tempFlag,
  type BodyMeasurements,
  type Flag,
  type VitalReading,
} from '@/features/nursing/__mocks__/vitalSignsFixtures';
import { NursePatientPicker } from './NursePatientPicker';
import type { RecordedVitals } from './RecordVitalsModal';

const RecordVitalsModal = dynamic(
  () => import('./RecordVitalsModal').then((m) => m.RecordVitalsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';
type RangeKey = '6h' | '24h' | '7d' | '30d';

const RANGE_OPTIONS: { key: RangeKey; label: string; hours: number }[] = [
  { key: '6h', label: '6 Hours', hours: 6 },
  { key: '24h', label: '24 Hours', hours: 24 },
  { key: '7d', label: '7 Days', hours: 24 * 7 },
  { key: '30d', label: '30 Days', hours: 24 * 30 },
];

const FLAG_CFG: Record<Flag, { color: string; border: string; bg: string }> = {
  High: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Low: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Normal: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
};

const RISK_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Medium: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Low: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
};

const NEWS2_RISK_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#EF4444', border: 'rgba(239,68,68,0.35)', bg: 'rgba(239,68,68,0.06)' },
  Medium: { color: '#F59E0B', border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.06)' },
  Low: { color: '#22C55E', border: 'rgba(34,197,94,0.35)', bg: 'rgba(34,197,94,0.06)' },
};

const RECENT_TABLE_MIN = 5;
const RECENT_TABLE_MAX = 20;

function timingLabel(iso: string): string {
  return isToday(iso) ? `Today, ${formatTime(iso)}` : toRelativeTime(iso);
}

function rangeAxisLabel(iso: string, range: RangeKey): string {
  return range === '7d' || range === '30d' ? formatHumanDate(iso).slice(0, 6) : formatTime(iso);
}

// ── Vital stat tile ─────────────────────────────────────────────────────────

function VitalStatTile({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  unit,
  badge,
  badgeCfg,
  timestamp,
}: {
  icon: typeof Heart;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  unit?: string;
  badge?: string;
  badgeCfg?: { color: string; border: string; bg: string };
  timestamp: string;
}) {
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: iconBg }}
        >
          <Icon style={{ width: 16, height: 16, color: iconColor }} />
        </div>
        <span className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#4A7080' }}>
          {label}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-baseline gap-2">
        <span
          className="font-display font-bold"
          style={{ fontSize: 26, lineHeight: '32px', color: '#0D2630' }}
        >
          {value}
        </span>
        {badge && badgeCfg && (
          <span
            className="rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
            style={{
              fontSize: 14,
              color: badgeCfg.color,
              border: `1px solid ${badgeCfg.border}`,
              background: badgeCfg.bg,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {unit && <span style={{ fontSize: 14, color: '#8A98A3' }}>{unit}</span>}
      <span className="mt-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
        {timestamp}
      </span>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonTile() {
  return (
    <div
      className="flex flex-col gap-2 rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
      <div className="h-7 w-16 animate-pulse rounded bg-slate-100" />
      <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

function EmptyVitalsState({ onRecordVitals }: { onRecordVitals: () => void }) {
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
          No vitals recorded yet
        </p>
        <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
          This patient hasn&apos;t had a first set of vital signs taken. Record their baseline to
          start tracking trends.
        </p>
      </div>
      <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
        <button
          type="button"
          onClick={onRecordVitals}
          className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
          style={{ background: '#00B4D8', fontSize: 14 }}
        >
          <FilePlus2 style={{ width: 16, height: 16 }} />
          Record First Vitals
        </button>
      </PermissionGate>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function VitalSignsWorkspace() {
  // "Start Triage" in Patient Queue hands off a patient here directly,
  // skipping the picker — peek-only initializer so a Strict Mode
  // double-invoke can't drop it; the effect below clears it exactly once.
  const [selectedPatient, setSelectedPatient] = useState<NursePatient | null>(() => {
    const pendingId = peekPendingVitalsPatientId();
    if (!pendingId) return null;
    return getEffectiveRoster().find((p) => p.id === pendingId) ?? null;
  });

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
              Vital Signs
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Monitor, record and track patient vital signs.
            </p>
            <div className="mt-5">
              <NursePatientPicker onSelect={setSelectedPatient} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PatientVitalsPanel
      key={selectedPatient.id}
      patient={selectedPatient}
      onChangePatient={() => setSelectedPatient(null)}
    />
  );
}

function PatientVitalsPanel({
  patient,
  onChangePatient,
}: {
  patient: NursePatient;
  onChangePatient: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurements | null>(null);
  const [range, setRange] = useState<RangeKey>('24h');
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [nowMs, setNowMs] = useState(0);

  const trendSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      // Only a genuinely first-time patient has no real vitals history —
      // a returning patient (isNewPatient false/undefined) already has one
      // even before today's triage. Don't fabricate a 30-day trend for the
      // new-patient case until the nurse has actually recorded a first
      // reading (see markVitalsRecorded below).
      const isFirstEverVisit = patient.isPreAdmission && patient.isNewPatient;
      const hasHistory = !isFirstEverVisit || hasRecordedVitals(patient.id);
      setReadings(hasHistory ? getVitalReadingsForPatient(patient.id) : []);
      setBodyMeasurements(getBodyMeasurements(patient.id));
      setPageState('loaded');
    }, 700);
    return () => clearTimeout(t);
  }, [patient.id, patient.isPreAdmission, patient.isNewPatient]);

  useEffect(() => {
    const t = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(t);
  }, [readings, range]);

  function handleScrollToTrend() {
    trendSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleEscalate() {
    toast.error(
      'Patient escalated',
      `${patient.patientName} has been flagged for urgent review. The assigned doctor has been notified.`,
    );
  }

  function handleSaveVitals(vitals: RecordedVitals) {
    if (patient.isPreAdmission) markVitalsRecorded(patient.id);
    const newReading: VitalReading = {
      id: `${patient.id}-r${Date.now()}`,
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
    setBodyMeasurements({
      weight: vitals.weight,
      weightRecordedAt: newReading.recordedAt,
      height: vitals.height,
      heightRecordedAt: newReading.recordedAt,
    });
    setRecordModalOpen(false);
    toast.success('Vitals recorded', `New vitals saved for ${patient.patientName}.`);
  }

  function handlePrintReport() {
    if (!latest) return;
    const rowsHtml = readings
      .slice(0, RECENT_TABLE_MAX)
      .map(
        (r) =>
          `<tr><td>${escapeHtml(formatHumanDate(r.recordedAt))} ${escapeHtml(formatTime(r.recordedAt))}</td><td>${r.systolic}/${r.diastolic}</td><td>${r.pulse}</td><td>${r.respRate}</td><td>${r.temp}</td><td>${r.spo2}</td><td>${r.painScore}</td><td>${r.bloodSugar}</td></tr>`,
      )
      .join('');
    downloadPDF(
      `vital-signs-${patient.mrn}`,
      `<h1>Vital Signs Report — ${escapeHtml(patient.patientName)}</h1>
       <p class="meta">MRN: ${escapeHtml(patient.mrn)} · ${patient.age} Y / ${patient.gender}</p>
       <table>
         <thead><tr><th>Date &amp; Time</th><th>BP</th><th>Pulse</th><th>RR</th><th>Temp</th><th>SpO2</th><th>Pain</th><th>BS</th></tr></thead>
         <tbody>${rowsHtml}</tbody>
       </table>`,
    );
    toast.success('Report ready', 'Vital signs report downloaded as PDF.');
  }

  const record = getPatientRecord(patient.id)!;
  const latest = readings[0];
  const cutoffMs = RANGE_OPTIONS.find((r) => r.key === range)!.hours * 3_600_000;
  const windowed = readings
    .filter((r) => nowMs - new Date(r.recordedAt).getTime() <= cutoffMs)
    .slice()
    .reverse();

  function seriesFor(key: keyof VitalReading): VitalChartPoint[] {
    return windowed.map((r) => ({
      label: rangeAxisLabel(r.recordedAt, range),
      value: r[key] as number,
    }));
  }

  const news2 = latest ? computeNews2(latest) : null;
  const visibleReadings = readings.slice(0, showAllRecords ? RECENT_TABLE_MAX : RECENT_TABLE_MIN);
  const riskCfg = RISK_CFG[patient.riskLevel]!;
  const allergyCfg = record.allergies.length
    ? { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' }
    : { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' };

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
              Vital Signs
            </span>
          </div>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Vital Signs
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Monitor, record and track patient vital signs.
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
                  Record New Vitals
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
                <span
                  className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: '#8B5CF6',
                    border: '1px solid rgba(139,92,246,0.4)',
                    background: 'rgba(139,92,246,0.08)',
                  }}
                >
                  {record.diagnosisTag}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-start gap-2.5 lg:w-[200px]">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(0,180,216,0.1)' }}
              >
                <User style={{ width: 20, height: 20, color: '#00B4D8' }} />
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: 14, color: '#8A98A3' }}>Assigned Doctor</p>
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  {patient.doctorName}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              {[
                ['Risk Level', `${patient.riskLevel} Risk`, riskCfg],
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

          {/* ── Allergy banner (compliance — every patient-context page) ── */}
          <AllergyBanner allergies={record.allergies} className="mt-4" />

          {pageState === 'loading' || !bodyMeasurements ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : !latest ? (
            <EmptyVitalsState onRecordVitals={() => setRecordModalOpen(true)} />
          ) : (
            <>
              {/* ── 9 vital stat tiles ────────────────────────────────────── */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <VitalStatTile
                  icon={HeartPulse}
                  iconColor="#EF4444"
                  iconBg="rgba(239,68,68,0.10)"
                  label="Blood Pressure"
                  value={`${latest.systolic}/${latest.diastolic}`}
                  unit="mmHg"
                  badge={bpFlag(latest.systolic)}
                  badgeCfg={FLAG_CFG[bpFlag(latest.systolic)]}
                  timestamp={timingLabel(latest.recordedAt)}
                />
                <VitalStatTile
                  icon={Heart}
                  iconColor="#EF4444"
                  iconBg="rgba(239,68,68,0.10)"
                  label="Pulse"
                  value={String(latest.pulse)}
                  unit="bpm"
                  badge={pulseFlag(latest.pulse)}
                  badgeCfg={FLAG_CFG[pulseFlag(latest.pulse)]}
                  timestamp={timingLabel(latest.recordedAt)}
                />
                <VitalStatTile
                  icon={Wind}
                  iconColor="#F59E0B"
                  iconBg="rgba(245,158,11,0.10)"
                  label="Respiratory Rate"
                  value={String(latest.respRate)}
                  unit="rpm"
                  badge={respRateFlag(latest.respRate)}
                  badgeCfg={FLAG_CFG[respRateFlag(latest.respRate)]}
                  timestamp={timingLabel(latest.recordedAt)}
                />
                <VitalStatTile
                  icon={Thermometer}
                  iconColor="#EF4444"
                  iconBg="rgba(239,68,68,0.10)"
                  label="Temperature"
                  value={latest.temp.toFixed(1)}
                  unit="°C"
                  badge={tempFlag(latest.temp)}
                  badgeCfg={FLAG_CFG[tempFlag(latest.temp)]}
                  timestamp={timingLabel(latest.recordedAt)}
                />
                <VitalStatTile
                  icon={Droplet}
                  iconColor="#22C55E"
                  iconBg="rgba(34,197,94,0.10)"
                  label="Oxygen Saturation"
                  value={String(latest.spo2)}
                  unit="%"
                  badge={spo2Flag(latest.spo2)}
                  badgeCfg={FLAG_CFG[spo2Flag(latest.spo2)]}
                  timestamp={timingLabel(latest.recordedAt)}
                />
                <VitalStatTile
                  icon={Gauge}
                  iconColor="#F59E0B"
                  iconBg="rgba(245,158,11,0.10)"
                  label="Pain Score"
                  value={`${latest.painScore}/10`}
                  badge={painBand(latest.painScore)}
                  badgeCfg={
                    FLAG_CFG[
                      painBand(latest.painScore) === 'Severe'
                        ? 'High'
                        : painBand(latest.painScore) === 'Mild'
                          ? 'Normal'
                          : 'Low'
                    ]
                  }
                  timestamp={timingLabel(latest.recordedAt)}
                />
                <VitalStatTile
                  icon={WeightIcon}
                  iconColor="#8B5CF6"
                  iconBg="rgba(139,92,246,0.10)"
                  label="Weight"
                  value={bodyMeasurements.weight.toFixed(1)}
                  unit="kg"
                  timestamp={toRelativeTime(bodyMeasurements.weightRecordedAt)}
                />
                <VitalStatTile
                  icon={Ruler}
                  iconColor="#3B82F6"
                  iconBg="rgba(59,130,246,0.10)"
                  label="Height"
                  value={String(bodyMeasurements.height)}
                  unit="cm"
                  timestamp={toRelativeTime(bodyMeasurements.heightRecordedAt)}
                />
                <VitalStatTile
                  icon={Droplet}
                  iconColor="#EF4444"
                  iconBg="rgba(239,68,68,0.10)"
                  label="Blood Sugar"
                  value={String(latest.bloodSugar)}
                  unit="mg/dL"
                  badge={bloodSugarFlag(latest.bloodSugar)}
                  badgeCfg={FLAG_CFG[bloodSugarFlag(latest.bloodSugar)]}
                  timestamp={timingLabel(latest.recordedAt)}
                />
              </div>

              {/* ── Trend + NEWS2 ─────────────────────────────────────────── */}
              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[7fr_5fr]">
                <div
                  ref={trendSectionRef}
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 18, color: '#0D2630' }}
                    >
                      Vital Signs Trend
                    </h2>
                    <div
                      className="flex gap-1 rounded-[10px] p-1"
                      style={{ background: '#F5FBFD' }}
                    >
                      {RANGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setRange(opt.key)}
                          className={`rounded-[8px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
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
                  </div>

                  <div
                    className="mt-4 flex flex-col divide-y"
                    style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                  >
                    {(
                      [
                        {
                          key: 'systolic',
                          label: 'Blood Pressure (mmHg)',
                          color: '#EF4444',
                          min: 90,
                          max: 160,
                          value: `${latest.systolic}/${latest.diastolic}`,
                        },
                        {
                          key: 'pulse',
                          label: 'Pulse (bpm)',
                          color: '#EF4444',
                          min: 60,
                          max: 120,
                          value: String(latest.pulse),
                        },
                        {
                          key: 'respRate',
                          label: 'Respiratory Rate (rpm)',
                          color: '#F59E0B',
                          min: 12,
                          max: 30,
                          value: String(latest.respRate),
                        },
                        {
                          key: 'temp',
                          label: 'Temperature (°C)',
                          color: '#EF4444',
                          min: 36,
                          max: 39,
                          value: latest.temp.toFixed(1),
                        },
                        {
                          key: 'spo2',
                          label: 'SpO₂ (%)',
                          color: '#22C55E',
                          min: 90,
                          max: 100,
                          value: String(latest.spo2),
                        },
                        {
                          key: 'painScore',
                          label: 'Pain Score (/10)',
                          color: '#8B5CF6',
                          min: 0,
                          max: 10,
                          value: String(latest.painScore),
                        },
                      ] as const
                    ).map((v) => (
                      <div
                        key={v.key}
                        className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {v.label}
                          </p>
                          <div className="mt-1">
                            <VitalTrendChart
                              data={seriesFor(v.key)}
                              color={v.color}
                              min={v.min}
                              max={v.max}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-right" style={{ width: 80 }}>
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {v.value}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {timingLabel(latest.recordedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="mt-4 flex flex-wrap items-center gap-4"
                    style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 12 }}
                  >
                    {[
                      ['Normal Range', '#22C55E'],
                      ['Caution', '#F59E0B'],
                      ['Abnormal', '#EF4444'],
                    ].map(([label, color]) => (
                      <span
                        key={label}
                        className="flex items-center gap-1.5"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        <span style={{ width: 14, height: 0, borderTop: `2px dashed ${color}` }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Early Warning Score (NEWS2)
                      </h2>
                      {news2 && (
                        <span
                          className="rounded-full px-2.5 py-0.5 font-sans font-semibold whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: NEWS2_RISK_CFG[news2.risk]!.color,
                            border: `1px solid ${NEWS2_RISK_CFG[news2.risk]!.border}`,
                            background: NEWS2_RISK_CFG[news2.risk]!.bg,
                          }}
                        >
                          Score: {news2.total}
                        </span>
                      )}
                    </div>

                    {news2 && (
                      <>
                        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                          {[
                            ['Resp Rate', news2.respRate],
                            ['SpO₂', news2.spo2],
                            ['Temp', news2.temp],
                            ['SBP', news2.sbp],
                            ['Pulse', news2.pulse],
                            ['Consciousness', news2.consciousness],
                          ].map(([label, value]) => (
                            <div key={label as string} className="text-center">
                              <p
                                className="font-display font-bold"
                                style={{ fontSize: 20, color: '#0D2630' }}
                              >
                                {value}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
                            </div>
                          ))}
                        </div>

                        <div
                          className="mt-4 flex items-start gap-2.5 rounded-[10px] p-3"
                          style={{
                            background: NEWS2_RISK_CFG[news2.risk]!.bg || 'rgba(245,158,11,0.06)',
                            border: `1px solid ${NEWS2_RISK_CFG[news2.risk]!.border}`,
                          }}
                        >
                          <AlertTriangle
                            style={{
                              width: 18,
                              height: 18,
                              color: NEWS2_RISK_CFG[news2.risk]!.color,
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          />
                          <div>
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: NEWS2_RISK_CFG[news2.risk]!.color }}
                            >
                              {news2.risk} Risk
                            </p>
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {news2.risk === 'High'
                                ? 'Urgent clinical review required.'
                                : news2.risk === 'Medium'
                                  ? 'Increased monitoring required.'
                                  : 'Routine monitoring is sufficient.'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Recent Vital Signs table ───────────────────────────── */}
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Recent Vital Signs
                    </h2>
                    <div className="mt-3 overflow-x-auto scroll-smooth">
                      <div className="min-w-[480px]">
                        <div
                          className="flex"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.1)' }}
                        >
                          {['Date & Time', 'BP', 'Pulse', 'RR', 'Temp', 'SpO₂', 'Pain', 'BS'].map(
                            (h) => (
                              <div key={h} className="min-w-0 flex-1 py-2 pr-2">
                                <span
                                  className="font-sans font-bold tracking-wider uppercase"
                                  style={{ fontSize: 14, color: '#4A7080' }}
                                >
                                  {h}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                        {visibleReadings.map((r) => (
                          <div
                            key={r.id}
                            className="flex"
                            style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
                          >
                            <div className="min-w-0 flex-1 py-2.5 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {formatHumanDate(r.recordedAt)}, {formatTime(r.recordedAt)}
                              </p>
                            </div>
                            <div className="min-w-0 flex-1 py-2.5 pr-2">
                              <p
                                style={{ fontSize: 14, color: FLAG_CFG[bpFlag(r.systolic)].color }}
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
                              <p style={{ fontSize: 14, color: '#0D2630' }}>{r.temp.toFixed(1)}</p>
                            </div>
                            <div className="min-w-0 flex-1 py-2.5 pr-2">
                              <p style={{ fontSize: 14, color: FLAG_CFG[spo2Flag(r.spo2)].color }}>
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
                          </div>
                        ))}
                      </div>
                    </div>
                    {readings.length > RECENT_TABLE_MIN && (
                      <button
                        type="button"
                        onClick={() => setShowAllRecords((v) => !v)}
                        className={`mt-3 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        {showAllRecords ? 'Show Less' : 'View All Records'}
                      </button>
                    )}
                  </div>

                  {/* ── Actions ─────────────────────────────────────────────── */}
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Actions
                    </h2>
                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                        <button
                          type="button"
                          onClick={() => setRecordModalOpen(true)}
                          className={`flex h-11 items-center justify-center gap-2 rounded-[10px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                          style={{
                            border: '1px solid rgba(0,100,130,0.15)',
                            fontSize: 14,
                            color: '#0D2630',
                          }}
                        >
                          <FilePlus2 style={{ width: 16, height: 16, color: '#00B4D8' }} />
                          Record New Vitals
                        </button>
                      </PermissionGate>
                      <button
                        type="button"
                        onClick={handleScrollToTrend}
                        className={`flex h-11 items-center justify-center gap-2 rounded-[10px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          border: '1px solid rgba(0,100,130,0.15)',
                          fontSize: 14,
                          color: '#0D2630',
                        }}
                      >
                        <Gauge style={{ width: 16, height: 16, color: '#00B4D8' }} />
                        View Observation Chart
                      </button>
                      <button
                        type="button"
                        onClick={handleEscalate}
                        className={`flex h-11 items-center justify-center gap-2 rounded-[10px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] ${FOCUS_RING}`}
                        style={{
                          border: '1px solid rgba(239,68,68,0.35)',
                          fontSize: 14,
                          color: '#EF4444',
                        }}
                      >
                        <ShieldAlert style={{ width: 16, height: 16 }} />
                        Escalate Patient
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintReport}
                        className={`flex h-11 items-center justify-center gap-2 rounded-[10px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          border: '1px solid rgba(0,100,130,0.15)',
                          fontSize: 14,
                          color: '#0D2630',
                        }}
                      >
                        <Printer style={{ width: 16, height: 16, color: '#00B4D8' }} />
                        Print Report
                      </button>
                    </div>
                  </div>

                  {/* ── Last recorded by ────────────────────────────────────── */}
                  <div
                    className="flex items-center gap-3 rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                      style={{ background: '#00B4D8', fontSize: 14 }}
                    >
                      {record.nursingNotes[0]?.author
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('') ?? 'NU'}
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Last Recorded By</p>
                      <p
                        className="truncate font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {record.nursingNotes[0]?.author ?? 'Unknown'}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        {timingLabel(latest.recordedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Nursing notes ───────────────────────────────────────────── */}
              <div
                className="mt-5 rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 18, color: '#0D2630' }}
                  >
                    Nursing Notes{' '}
                    <span style={{ fontWeight: 400, color: '#8A98A3' }}>(Latest)</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.nurseNursingNotes)}
                    className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All Notes
                  </button>
                </div>
                {record.nursingNotes.length === 0 ? (
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No nursing notes recorded yet.
                  </p>
                ) : (
                  <div className="mt-3">
                    <p style={{ fontSize: 14, color: '#0D2630' }}>
                      <span className="font-sans font-semibold">
                        {formatTime(record.nursingNotes[0]!.dateTime)}:
                      </span>{' '}
                      {record.nursingNotes[0]!.note}
                    </p>
                    <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {record.nursingNotes[0]!.author}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>

      {recordModalOpen && bodyMeasurements && (
        <RecordVitalsModal
          patientName={patient.patientName}
          currentWeight={bodyMeasurements.weight}
          currentHeight={bodyMeasurements.height}
          onClose={() => setRecordModalOpen(false)}
          onSave={handleSaveVitals}
        />
      )}
    </div>
  );
}
