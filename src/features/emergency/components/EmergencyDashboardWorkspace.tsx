'use client';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BedDouble,
  BedSingle,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  FlaskConical,
  Pill,
  RefreshCw,
  ScanLine,
  UserPlus,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { QuickActionTile } from '@components/shared/QuickActionTile';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { formatTime } from '@/utils/datetime';
import { getTriageDisplay, triageSortWeight, type TriagePriority } from '@/utils/triage';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import {
  BED_STATUS,
  BEDS_AVAILABLE,
  BED_OCCUPANCY_PERCENT,
  CRITICAL_ALERTS,
  CRITICAL_PATIENTS_COUNT,
  deriveComplaintForEntry,
  derivePriorityForEntry,
  DISCHARGED_TODAY_COUNT,
  OBSERVATION_PATIENTS,
  OCCUPIED_BEDS,
  PENDING_ORDERS,
  PENDING_RESULTS_COUNT,
  PRIORITY_TIERS,
  RECENT_ADMISSIONS,
  TOTAL_BEDS,
  UNDER_OBSERVATION_COUNT,
} from '@/features/emergency/__mocks__/emergencyDashboardFixtures';

type PageState = 'loading' | 'loaded' | 'error';

const PRIORITY_COLOR: Record<TriagePriority, string> = {
  IMMEDIATE: '#DC2626',
  URGENT: '#D97706',
  LESS_URGENT: '#F59E0B',
  NON_URGENT: '#16A34A',
};

const PRIORITY_BG: Record<TriagePriority, string> = {
  IMMEDIATE: 'rgba(220,38,38,0.08)',
  URGENT: 'rgba(217,119,6,0.08)',
  LESS_URGENT: 'rgba(245,158,11,0.08)',
  NON_URGENT: 'rgba(22,163,74,0.08)',
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

function formatClinicalDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

function formatWaitMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

// ── Skeletons ────────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="size-10 shrink-0 animate-pulse rounded-[12px] bg-slate-200" />
      </div>
      <div className="mt-2.5 h-7 w-14 animate-pulse rounded bg-slate-200" />
      <div className="mt-1.5 h-3.5 w-28 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-3.5 w-full max-w-[160px] animate-pulse rounded bg-slate-200" />
      <div className="h-3.5 w-16 shrink-0 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="py-6 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
      {label}
    </p>
  );
}

// ── Panel shell ──────────────────────────────────────────────────────────

function Panel({
  title,
  viewAllHref,
  right,
  children,
}: {
  title: string;
  viewAllHref?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div
      className="flex h-full flex-col rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          {title}
        </h2>
        {right ??
          (viewAllHref && (
            <button
              type="button"
              onClick={() => router.push(viewAllHref)}
              className="font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              View All
            </button>
          ))}
      </div>
      {children}
    </div>
  );
}

// ── Generic donut (segments animate in via a shared `animate` flag) ──────

type DonutSegment = { label: string; value: number; color: string };

function Donut({
  data,
  centerValue,
  centerLabel,
  animate,
}: {
  data: DonutSegment[];
  centerValue: number | string;
  centerLabel: string;
  animate: boolean;
}) {
  const sum = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  type Seg = DonutSegment & { length: number; offset: number };
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

  const size = 200;

  return (
    <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 128 128"
          style={{ width: size, height: size }}
          role="img"
          aria-label={`${centerLabel} donut chart`}
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
          <span className="font-display font-bold" style={{ fontSize: 32, color: '#0D2630' }}>
            {centerValue}
          </span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>{centerLabel}</span>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <Tooltip content={d.label}>
                <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                  {d.label}
                </span>
              </Tooltip>
            </div>
            <span
              className="shrink-0 font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {d.value} ({sum > 0 ? Math.round((d.value / sum) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriorityPill({ priority }: { priority: TriagePriority }) {
  const display = getTriageDisplay(priority);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{ fontSize: 14, color: PRIORITY_COLOR[priority], background: PRIORITY_BG[priority] }}
    >
      {display.pulse && (
        <span
          className="size-1.5 animate-pulse rounded-full"
          style={{ background: PRIORITY_COLOR[priority] }}
          aria-hidden="true"
        />
      )}
      {display.label}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function EmergencyDashboardWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [now, setNow] = useState(() => new Date());
  const [animateCharts, setAnimateCharts] = useState(false);

  const allQueueEntries = useQueueEntries();
  const emergencyEntries = allQueueEntries.filter((e) => e.isEmergency);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (pageState !== 'loaded') return;
    const raf = requestAnimationFrame(() => setAnimateCharts(true));
    return () => cancelAnimationFrame(raf);
  }, [pageState]);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleRefresh() {
    setNow(new Date());
    setAnimateCharts(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimateCharts(true)));
  }

  const actorName = user?.name ?? 'Emergency Physician';

  // Triage Distribution + queue rows both derive from the same real entries +
  // the same deterministic priority annotation, so they can never disagree.
  const priorityCounts: Record<TriagePriority, number> = {
    IMMEDIATE: 0,
    URGENT: 0,
    LESS_URGENT: 0,
    NON_URGENT: 0,
  };
  const queueRows = emergencyEntries.map((e) => {
    const priority = derivePriorityForEntry(e.id);
    priorityCounts[priority] += 1;
    const waitMinutes = Math.max(
      0,
      Math.round((now.getTime() - new Date(e.arrivalTime).getTime()) / 60_000),
    );
    return { entry: e, priority, complaint: deriveComplaintForEntry(e.id), waitMinutes };
  });
  queueRows.sort((a, b) => triageSortWeight(a.priority) - triageSortWeight(b.priority));

  const avgWaitMinutes =
    queueRows.length > 0
      ? Math.round(queueRows.reduce((sum, r) => sum + r.waitMinutes, 0) / queueRows.length)
      : 0;

  const triageDonutData: DonutSegment[] = PRIORITY_TIERS.map((tier) => ({
    label: getTriageDisplay(tier).label,
    value: priorityCounts[tier],
    color: PRIORITY_COLOR[tier],
  }));

  const bedDonutData: DonutSegment[] = BED_STATUS.map((b) => ({
    label: b.label,
    value: b.count,
    color: b.color,
  }));

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load the Emergency Dashboard
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {/*  <HeartPulse style={{ width: 22, height: 22, color: '#DC2626' }} /> */}
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Emergency Dashboard
              </h1>
            </div>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {getWATGreeting()} Dr. {lastName(actorName)}, here&apos;s a real-time overview of
              emergency department operations and patient flow.
            </p>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
              {formatClinicalDate(now)} · {formatTime(now)} WAT
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          {pageState === 'loading' ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard
                icon={Users}
                label="Patients Waiting"
                value={emergencyEntries.length}
                info={`Avg wait time: ${avgWaitMinutes} mins`}
                accent="#00B4D8"
                iconBg="rgba(0,180,216,0.1)"
                onClick={() => router.push(ROUTES.emergencyPatientQueue)}
              />
              <StatCard
                icon={BedDouble}
                label="Occupied Beds"
                value={`${OCCUPIED_BEDS} / ${TOTAL_BEDS}`}
                info={`${BED_OCCUPANCY_PERCENT}% Occupancy`}
                accent="#0D9488"
                iconBg="rgba(13,148,136,0.1)"
                onClick={() => router.push(ROUTES.emergencyBedAssignment)}
              />
              <StatCard
                icon={AlertTriangle}
                label="Critical Patients"
                value={CRITICAL_PATIENTS_COUNT}
                info="Immediate attention"
                accent="#DC2626"
                iconBg="rgba(220,38,38,0.1)"
                onClick={() => router.push(ROUTES.emergencyCriticalAlerts)}
              />
              <StatCard
                icon={Eye}
                label="Under Observation"
                value={UNDER_OBSERVATION_COUNT}
                info="Currently monitored"
                accent="#D97706"
                iconBg="rgba(217,119,6,0.1)"
                onClick={() => router.push(ROUTES.emergencyObservationUnit)}
              />
              <StatCard
                icon={FlaskConical}
                label="Pending Results"
                value={PENDING_RESULTS_COUNT}
                info="Lab & Radiology"
                accent="#7C3AED"
                iconBg="rgba(124,58,237,0.1)"
                onClick={() => router.push(ROUTES.emergencyResultsReview)}
              />
              <StatCard
                icon={CheckCircle2}
                label="Discharged Today"
                value={DISCHARGED_TODAY_COUNT}
                info="Completed"
                accent="#16A34A"
                iconBg="rgba(22,163,74,0.1)"
                onClick={() => router.push(ROUTES.emergencyReports)}
              />
            </>
          )}
        </div>

        {/* Quick actions */}
        <h2 className="font-display mt-6 font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
          Quick Actions
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickActionTile
            icon={UserPlus}
            label="Register Patient"
            iconBg="rgba(0,180,216,0.12)"
            iconColor="#00B4D8"
            onClick={() => router.push(ROUTES.registrationEmergency)}
          />
          <QuickActionTile
            icon={Activity}
            label="Start Triage"
            iconBg="rgba(217,119,6,0.12)"
            iconColor="#D97706"
            onClick={() => router.push(ROUTES.emergencyTriageAssessment)}
          />
          <QuickActionTile
            icon={BedSingle}
            label="Assign Bed"
            iconBg="rgba(13,148,136,0.12)"
            iconColor="#0D9488"
            onClick={() => router.push(ROUTES.emergencyBedAssignment)}
          />
          <QuickActionTile
            icon={FileText}
            label="Open Patient Chart"
            iconBg="rgba(0,180,216,0.12)"
            iconColor="#00B4D8"
            onClick={() => router.push(ROUTES.patients)}
          />
          <QuickActionTile
            icon={FlaskConical}
            label="Request Lab Test"
            iconBg="rgba(124,58,237,0.12)"
            iconColor="#7C3AED"
            onClick={() => router.push(ROUTES.emergencyDiagnosticRequests)}
          />
          <QuickActionTile
            icon={ScanLine}
            label="Request Imaging"
            iconBg="rgba(124,58,237,0.12)"
            iconColor="#7C3AED"
            onClick={() => router.push(ROUTES.emergencyDiagnosticRequests)}
          />
          <QuickActionTile
            icon={Pill}
            label="Emergency Medication Order"
            iconBg="rgba(220,38,38,0.12)"
            iconColor="#DC2626"
            onClick={() => router.push(ROUTES.emergencyMedicationOrders)}
          />
          <QuickActionTile
            icon={FileCheck2}
            label="Complete Report"
            iconBg="rgba(74,112,128,0.12)"
            iconColor="#4A7080"
            onClick={() => router.push(ROUTES.emergencyReports)}
          />
        </div>

        {/* Live Emergency Queue + Triage Distribution */}
        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-stretch">
          <div className="min-w-0 flex-1">
            <Panel title="Live Emergency Queue" viewAllHref={ROUTES.emergencyPatientQueue}>
              {pageState === 'loading' ? (
                <div className="mt-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              ) : queueRows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Users style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    No patients waiting
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    Emergency arrivals will appear here as soon as they check in.
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <ScrollableTable minWidth={700}>
                    <div
                      className={`flex items-center ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Patient', 'min-w-[160px] flex-1'],
                        ['Age/Sex', 'w-16'],
                        ['Priority', 'w-28'],
                        ['Complaint', 'min-w-[120px] flex-1'],
                        ['Wait Time', 'w-24'],
                        ['Assigned To', 'w-28'],
                      ].map(([label, width]) => (
                        <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3 text-left`}>
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                    {queueRows.map(({ entry, priority, complaint, waitMinutes }) => (
                      <div
                        key={entry.id}
                        className="flex items-center"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="min-w-[160px] flex-1 py-3 pr-2 pl-3">
                          <Tooltip content={entry.patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {entry.patientName}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#00B4D8' }}>MRN: {entry.mrn}</p>
                        </div>
                        <div className="w-16 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {entry.age} / {entry.gender.charAt(0)}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <PriorityPill priority={priority} />
                        </div>
                        <div className="min-w-[120px] flex-1 py-3 pr-2">
                          <Tooltip content={complaint}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {complaint}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-2">
                          <p
                            className="font-sans font-medium whitespace-nowrap"
                            style={{
                              fontSize: 14,
                              color: waitMinutes > 30 ? '#DC2626' : '#4A7080',
                            }}
                          >
                            {formatWaitMinutes(waitMinutes)}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <Tooltip content={entry.attendingDoctor}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {entry.attendingDoctor}
                            </p>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </ScrollableTable>
                </div>
              )}
            </Panel>
          </div>
          <div className="w-full shrink-0 xl:w-[360px]">
            <Panel title="Triage Distribution">
              <Donut
                data={triageDonutData}
                centerValue={emergencyEntries.length}
                centerLabel="Total Patients"
                animate={animateCharts}
              />
            </Panel>
          </div>
        </div>

        {/* Bottom row: bed status, observation, pending orders, recent admissions */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="Emergency Bed Status">
            <Donut
              data={bedDonutData}
              centerValue={TOTAL_BEDS}
              centerLabel="Total Beds"
              animate={animateCharts}
            />
            <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
              {BEDS_AVAILABLE} beds available
            </p>
          </Panel>

          <Panel title="Observation Patients" viewAllHref={ROUTES.emergencyObservationUnit}>
            <div className="mt-3 flex flex-col">
              {OBSERVATION_PATIENTS.length === 0 ? (
                <EmptyRow label="No patients under observation" />
              ) : (
                OBSERVATION_PATIENTS.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="min-w-0">
                      <Tooltip content={p.patientName}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {p.patientName}
                        </p>
                      </Tooltip>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        {p.bed} · {p.observationTime} · {p.assignedTo}
                      </p>
                    </div>
                    <p
                      className="shrink-0 font-sans font-medium whitespace-nowrap"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      {p.nextReview}
                    </p>
                  </div>
                ))
              )}
            </div>
            <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
              Total: {OBSERVATION_PATIENTS.length} patients under observation
            </p>
          </Panel>

          <Panel title="Pending Orders" viewAllHref={ROUTES.emergencyOrdersManagement}>
            <div className="mt-3 flex flex-col gap-1">
              {[
                {
                  icon: FlaskConical,
                  label: 'Laboratory',
                  count: PENDING_ORDERS.laboratory,
                  color: '#7C3AED',
                },
                {
                  icon: ScanLine,
                  label: 'Radiology',
                  count: PENDING_ORDERS.radiology,
                  color: '#00B4D8',
                },
                {
                  icon: Pill,
                  label: 'Medications',
                  count: PENDING_ORDERS.medications,
                  color: '#DC2626',
                },
                {
                  icon: FileCheck2,
                  label: 'Procedures',
                  count: PENDING_ORDERS.procedures,
                  color: '#D97706',
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 py-2.5"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <row.icon style={{ width: 16, height: 16, color: row.color }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{row.label}</span>
                  </div>
                  <span
                    className="font-sans font-semibold"
                    style={{ fontSize: 14, color: row.color }}
                  >
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recent Emergency Admissions" viewAllHref={ROUTES.emergencyVisitHistory}>
            <div className="mt-3 flex flex-col">
              {RECENT_ADMISSIONS.length === 0 ? (
                <EmptyRow label="No recent admissions" />
              ) : (
                RECENT_ADMISSIONS.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="min-w-0">
                      <Tooltip content={a.patientName}>
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {a.patientName}
                        </p>
                      </Tooltip>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        {a.diagnosis} · {a.arrival}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: a.disposition === 'Admitted' ? '#16A34A' : '#4A7080',
                        background:
                          a.disposition === 'Admitted'
                            ? 'rgba(22,163,74,0.1)'
                            : 'rgba(74,112,128,0.1)',
                      }}
                    >
                      {a.disposition}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        {/* Critical Alerts */}
        <div className="mt-4">
          <Panel title="Critical Alerts" viewAllHref={ROUTES.emergencyCriticalAlerts}>
            <div className="mt-3 flex flex-col">
              {CRITICAL_ALERTS.length === 0 ? (
                <EmptyRow label="No critical alerts" />
              ) : (
                CRITICAL_ALERTS.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(220,38,38,0.1)' }}
                    >
                      <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {a.title}
                      </p>
                      <Tooltip content={a.detail}>
                        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {a.detail}
                        </p>
                      </Tooltip>
                    </div>
                    <span
                      className="shrink-0 whitespace-nowrap"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      {a.minutesAgo} mins ago
                    </span>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        <div className="h-4" />
      </div>
    </main>
  );
}
