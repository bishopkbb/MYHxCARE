'use client';

import {
  AlertCircle,
  BedDouble,
  ChevronRight,
  ClipboardPlus,
  NotebookPen,
  Pill,
  RefreshCw,
  Siren,
  Stethoscope,
  Sun,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { QuickActionTile } from '@components/shared/QuickActionTile';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@hooks/useAuth';
import { formatTime } from '@/utils/datetime';
import {
  CURRENT_SHIFT,
  MEDICATION_DUE,
  MY_PATIENTS,
  NURSE_ALERTS,
  NURSE_DASHBOARD_STATS,
  TODAYS_ADMISSIONS,
  TOTAL_MEDICATIONS_DUE,
  TOTAL_PATIENTS_UNDER_CARE,
  UPCOMING_TASKS,
  WARD_CENSUS,
  TOTAL_BEDS,
  type PatientCondition,
} from '@/features/nursing/__mocks__/nurseDashboardFixtures';

type PageState = 'loading' | 'loaded' | 'error';

const CONDITION_CFG: Record<PatientCondition, { color: string; border: string; bg: string }> = {
  Stable: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'transparent' },
  Fair: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.06)' },
  Critical: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.06)' },
};

const SEVERITY_CFG: Record<
  'high' | 'warning' | 'info',
  { border: string; bg: string; iconColor: string }
> = {
  high: { border: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.05)', iconColor: '#EF4444' },
  warning: { border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.05)', iconColor: '#F59E0B' },
  info: { border: 'rgba(0,180,216,0.3)', bg: 'rgba(0,180,216,0.05)', iconColor: '#00B4D8' },
};

function getWATGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-2.5">
        <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mt-2.5 h-6 w-14 animate-pulse rounded bg-slate-200" />
      <div className="mt-1.5 h-3.5 w-32 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="py-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
      {label}
    </p>
  );
}

// ─── Ward Census donut ──────────────────────────────────────────────────────
function WardCensusDonut({ animate }: { animate: boolean }) {
  const sum = WARD_CENSUS.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  type Seg = (typeof WARD_CENSUS)[number] & { length: number; offset: number };
  const { segments } = WARD_CENSUS.reduce<{ cumulative: number; segments: Seg[] }>(
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
          aria-label="Ward census donut chart"
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
        <div className="absolute flex flex-col items-center">
          <span className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
            {TOTAL_BEDS}
          </span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Beds</span>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
        {WARD_CENSUS.map((d) => (
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
              {d.value} ({d.percent}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NurseDashboardWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [animateChart, setAnimateChart] = useState(false);
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (pageState !== 'loaded') return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimateChart(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [pageState]);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function toggleTask(id: string) {
    setTaskDone((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const firstName = (user?.name ?? 'Chidinma')
    .replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Nurse)\s+/, '')
    .split(' ')[0];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Nurse Dashboard
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                {getWATGreeting()}, Nurse {firstName}. Here&apos;s your patient care overview.
              </p>
            </div>
            <div
              className="flex items-center gap-3 rounded-[12px] p-3"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(245,158,11,0.12)' }}
              >
                <Sun style={{ width: 20, height: 20, color: '#F59E0B' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  Current Shift: <span style={{ color: '#0D2630' }}>{CURRENT_SHIFT.name}</span>
                </p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {formatTime(`2000-01-01T${CURRENT_SHIFT.startTime}:00+01:00`)} –{' '}
                  {formatTime(`2000-01-01T${CURRENT_SHIFT.endTime}:00+01:00`)}
                </p>
              </div>
            </div>
          </div>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load dashboard
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
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {pageState === 'loading'
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
                  : NURSE_DASHBOARD_STATS.map((s) => {
                      const isGood =
                        s.direction && s.goodDirection ? s.direction === s.goodDirection : true;
                      return (
                        <div
                          key={s.id}
                          className="rounded-[12px] p-4"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.12)',
                          }}
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
                            style={{
                              fontSize: 14,
                              color: s.direction ? (isGood ? '#16A34A' : '#DC2626') : '#8A98A3',
                            }}
                          >
                            {s.direction ? (s.direction === 'up' ? '↑ ' : '↓ ') : ''}
                            {s.subLabel}
                          </p>
                        </div>
                      );
                    })}
              </div>

              {/* ── Quick Actions ──────────────────────────────────────────── */}
              <div className="mt-5">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                >
                  Quick Actions
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <QuickActionTile
                    icon={Stethoscope}
                    label="Record Vitals"
                    iconBg="rgba(0,180,216,0.12)"
                    iconColor="#00B4D8"
                    onClick={() => router.push(ROUTES.nurseVitalSigns)}
                  />
                  <QuickActionTile
                    icon={Pill}
                    label="Administer Medication"
                    iconBg="rgba(139,92,246,0.12)"
                    iconColor="#8B5CF6"
                    onClick={() => router.push(ROUTES.nurseMedicationAdministration)}
                  />
                  <QuickActionTile
                    icon={NotebookPen}
                    label="Add Nursing Note"
                    iconBg="rgba(34,197,94,0.12)"
                    iconColor="#22C55E"
                    onClick={() => router.push(ROUTES.nurseNursingNotes)}
                  />
                  <QuickActionTile
                    icon={BedDouble}
                    label="Admit Patient"
                    iconBg="rgba(245,158,11,0.12)"
                    iconColor="#F59E0B"
                    onClick={() => router.push(ROUTES.nurseAdmissions)}
                  />
                  <QuickActionTile
                    icon={ClipboardPlus}
                    label="Shift Handover"
                    iconBg="rgba(59,130,246,0.12)"
                    iconColor="#3B82F6"
                    onClick={() => router.push(ROUTES.nurseShiftHandover)}
                  />
                  <QuickActionTile
                    icon={Siren}
                    label="Emergency Response"
                    iconBg="rgba(239,68,68,0.12)"
                    iconColor="#EF4444"
                    onClick={() => router.push(ROUTES.nurseEmergencyResponse)}
                  />
                </div>
              </div>

              {/* ── My Patients, Medication Due, Alerts, Admissions, Ward Census, Tasks ── */}
              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* My Patients */}
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      My Patients
                    </h2>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.nurseMyPatients)}
                      className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View all
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {pageState === 'loading' &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-[10px] bg-slate-100" />
                      ))}
                    {pageState === 'loaded' && MY_PATIENTS.length === 0 && (
                      <EmptyRow label="No patients currently assigned to you." />
                    )}
                    {pageState === 'loaded' &&
                      MY_PATIENTS.map((p) => {
                        const cfg = CONDITION_CFG[p.condition];
                        return (
                          <div key={p.id} className="flex items-center gap-2.5">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: p.avatarBg }}
                            >
                              {p.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {p.patientName}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {p.ward} · {p.bed}
                              </p>
                            </div>
                            <span
                              className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                background: cfg.bg,
                              }}
                            >
                              {p.condition}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <div
                    className="mt-4 flex items-center justify-between pt-3"
                    style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Total Patients: {TOTAL_PATIENTS_UNDER_CARE}
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.nurseMyPatients)}
                      className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      View All Patients
                    </button>
                  </div>
                </div>

                {/* Medication Due */}
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Medication Due
                    </h2>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.nurseMedicationAdministration)}
                      className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View all
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {pageState === 'loading' &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-[10px] bg-slate-100" />
                      ))}
                    {pageState === 'loaded' && MEDICATION_DUE.length === 0 && (
                      <EmptyRow label="No medications due right now." />
                    )}
                    {pageState === 'loaded' &&
                      MEDICATION_DUE.map((m) => (
                        <div key={m.id} className="flex items-center gap-2.5">
                          <p
                            className="w-14 shrink-0 font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: m.overdue ? '#EF4444' : '#0D2630' }}
                          >
                            {formatTime(m.time)}
                          </p>
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {m.patientName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {m.medication}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: '#4A7080',
                              border: '1px solid rgba(0,100,130,0.2)',
                            }}
                          >
                            {m.route}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div
                    className="mt-4 flex items-center justify-between pt-3"
                    style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Total Due: {TOTAL_MEDICATIONS_DUE}
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.nurseMedicationAdministration)}
                      className="flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, background: '#00B4D8' }}
                    >
                      View All Medications
                    </button>
                  </div>
                </div>

                {/* Alerts & Notifications */}
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Alerts &amp; Notifications
                    </h2>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.nurseNotifications)}
                      className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View all
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {pageState === 'loading' &&
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-[10px] bg-slate-100" />
                      ))}
                    {pageState === 'loaded' && NURSE_ALERTS.length === 0 && (
                      <EmptyRow label="No active alerts." />
                    )}
                    {pageState === 'loaded' &&
                      NURSE_ALERTS.map((a) => {
                        const cfg = SEVERITY_CFG[a.severity];
                        return (
                          <div
                            key={a.id}
                            className="flex items-start gap-2.5 rounded-[10px] p-3"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                          >
                            <a.icon
                              style={{
                                width: 16,
                                height: 16,
                                color: cfg.iconColor,
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {a.title}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {a.description}
                              </p>
                            </div>
                            <p
                              className="shrink-0 whitespace-nowrap"
                              style={{ fontSize: 14, color: '#8A98A3' }}
                            >
                              {formatTime(a.time)}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Today's Admissions */}
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Today&apos;s Admissions
                    </h2>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.nurseAdmissions)}
                      className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View all
                    </button>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    {pageState === 'loading' &&
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-10 animate-pulse rounded-[10px] bg-slate-100" />
                      ))}
                    {pageState === 'loaded' && TODAYS_ADMISSIONS.length === 0 && (
                      <EmptyRow label="No admissions recorded today." />
                    )}
                    {pageState === 'loaded' &&
                      TODAYS_ADMISSIONS.map((a) => (
                        <div key={a.id} className="flex items-center gap-2.5">
                          <p
                            className="w-14 shrink-0 font-sans font-medium whitespace-nowrap"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {formatTime(a.time)}
                          </p>
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {a.patientName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {a.ward} · {a.bed}
                            </p>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: '#F59E0B',
                              border: '1px solid rgba(245,158,11,0.4)',
                              background: 'rgba(245,158,11,0.06)',
                            }}
                          >
                            {a.status}
                          </span>
                        </div>
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.nurseAdmissions)}
                    className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    View All Admissions
                  </button>
                </div>

                {/* Ward Census Summary */}
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      Ward Census Summary
                    </h2>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.nurseWardCensus)}
                      className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      View all
                    </button>
                  </div>
                  {pageState === 'loading' ? (
                    <div className="mt-4 flex items-center justify-center">
                      <div className="size-[150px] animate-pulse rounded-full bg-slate-100" />
                    </div>
                  ) : (
                    <WardCensusDonut animate={animateChart} />
                  )}
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.nurseWardCensus)}
                    className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    Go to Ward Census
                  </button>
                </div>

                {/* Upcoming Tasks */}
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                  >
                    Upcoming Tasks
                  </h2>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {pageState === 'loading' &&
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-9 animate-pulse rounded-[10px] bg-slate-100" />
                      ))}
                    {pageState === 'loaded' && UPCOMING_TASKS.length === 0 && (
                      <EmptyRow label="No tasks scheduled for the rest of your shift." />
                    )}
                    {pageState === 'loaded' &&
                      UPCOMING_TASKS.map((t) => {
                        const done = Boolean(taskDone[t.id]);
                        return (
                          <label
                            key={t.id}
                            className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-1 py-1 transition-colors duration-150 hover:bg-[#F5FBFD]"
                          >
                            <input
                              type="checkbox"
                              checked={done}
                              onChange={() => toggleTask(t.id)}
                              className="size-4 shrink-0 cursor-pointer rounded"
                              style={{ accentColor: '#00B4D8' }}
                            />
                            <span
                              className="w-14 shrink-0 whitespace-nowrap"
                              style={{ fontSize: 14, color: '#8A98A3' }}
                            >
                              {t.time}
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate font-sans"
                              style={{
                                fontSize: 14,
                                color: done ? '#8A98A3' : '#0D2630',
                                textDecoration: done ? 'line-through' : undefined,
                              }}
                            >
                              {t.label}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.mySchedule)}
                    className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    View My Schedule
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>

              {/* ── Safety notice ──────────────────────────────────────────── */}
              <div
                className="mt-5 flex items-start gap-2.5 rounded-[12px] p-4"
                style={{
                  background: 'rgba(0,180,216,0.06)',
                  border: '1px solid rgba(0,180,216,0.25)',
                }}
              >
                <Info
                  style={{ width: 18, height: 18, color: '#00B4D8', flexShrink: 0, marginTop: 2 }}
                />
                <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                  Always verify patient identity before providing care. Report any concerns
                  immediately to the charge nurse or doctor.
                </p>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
