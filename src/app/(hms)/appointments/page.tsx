'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatTime } from '@/utils/datetime';
import type { Appointment } from '@/features/appointments/__mocks__/appointmentFixtures';
import {
  deriveStatus,
  isSameCalendarDay,
  type AppointmentStatus,
  type ScheduledAppointment,
} from '@/features/registration/__mocks__/appointmentSchedulingFixtures';
import { useScheduledAppointments } from '@/features/registration/store/appointmentStore';

// ── Types ──────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';

// ── Config ─────────────────────────────────────────────────────────────────────

// Same 5-value vocabulary and colors as Registration's own calendar
// (registration/appointments/page.tsx's STATUS_CFG) — one status, one look,
// app-wide.
const STATUS_CFG: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  Confirmed: {
    label: 'Confirmed',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.35)',
  },
  Scheduled: {
    label: 'Scheduled',
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.08)',
    border: 'rgba(0,180,216,0.35)',
  },
  'In Progress': {
    label: 'In Progress',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.35)',
  },
  Completed: {
    label: 'Completed',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.35)',
  },
  Cancelled: {
    label: 'Cancelled',
    color: '#8A98A3',
    bg: 'rgba(138,152,163,0.06)',
    border: 'rgba(138,152,163,0.35)',
  },
};

// ── Status Badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="shrink-0 font-sans font-medium"
      style={{
        fontSize: 14,
        lineHeight: '22px',
        borderRadius: 20,
        padding: '3px 14px',
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonAppointmentCard() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-4 sm:gap-5 sm:px-5"
      style={{
        borderRadius: 12,
        background: '#FFFFFF',
        border: '1px solid rgba(0,100,130,0.12)',
      }}
    >
      <div
        className="shrink-0 animate-pulse rounded bg-slate-200"
        style={{ width: 72, height: 18 }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 160, height: 20 }} />
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 210, height: 16 }} />
      </div>
      <div
        className="shrink-0 animate-pulse rounded-full bg-slate-200"
        style={{ width: 90, height: 28 }}
      />
    </div>
  );
}

// ── Appointment Card ───────────────────────────────────────────────────────────

function AppointmentCard({ appt }: { appt: Appointment }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-4 transition-shadow duration-150 hover:shadow-md sm:gap-5 sm:px-5"
      style={{
        borderRadius: 12,
        background: '#FFFFFF',
        border: '1px solid rgba(0,100,130,0.12)',
      }}
    >
      <span
        className="shrink-0 font-sans"
        style={{ width: 80, fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
      >
        {appt.time}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className="truncate font-sans font-semibold"
          style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
        >
          {appt.patientName}
        </p>
        <p
          className="truncate font-sans"
          style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
        >
          {appt.type}
        </p>
      </div>

      <StatusBadge status={appt.status} />
    </div>
  );
}

// Converts a real, shared ScheduledAppointment (appointmentStore.ts —
// SYS-012) into this screen's own display shape, deriving the same status
// Registration's own calendar would show for it.
function scheduledAppointmentToAppointment(a: ScheduledAppointment, now: number): Appointment {
  return {
    id: a.id,
    time: formatTime(a.dateTime),
    patientName: a.patientName,
    type: a.visitType,
    status: deriveStatus(a, now),
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const { user } = useAuth();
  const allAppointments = useScheduledAppointments();
  // Matches registration/appointments/page.tsx's own pattern — Date.now()
  // can't be called directly during render (impure), so status/day
  // derivation reads from state that ticks on an interval instead.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const todaysAppointments = allAppointments
    .filter(
      (a) => a.doctorId === user?.id && isSameCalendarDay(new Date(a.dateTime), new Date(now)),
    )
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
    .map((a) => scheduledAppointmentToAppointment(a, now));

  const todayLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px]">
          {/* ── Page header ─────────────────────────────────────────────────── */}
          <div
            className="px-4 sm:px-6"
            style={{
              background: '#FFFFFF',
              borderBottom: '1px solid rgba(0,100,130,0.12)',
              paddingTop: 24,
              paddingBottom: 20,
            }}
          >
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 28, lineHeight: '36px', color: '#0D2630' }}
            >
              Appointments
            </h1>
            <p
              className="font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8', marginTop: 2 }}
            >
              Today — {todayLabel}
            </p>
          </div>

          {/* ── Content ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 px-4 pt-4 pb-10 sm:px-6">
            {/* Loading */}
            {pageState === 'loading' &&
              Array.from({ length: 4 }).map((_, i) => <SkeletonAppointmentCard key={i} />)}

            {/* Error */}
            {pageState === 'error' && (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <AlertCircle style={{ width: 40, height: 40, color: '#EF4444', opacity: 0.7 }} />
                <div className="text-center">
                  <p
                    className="font-sans font-medium"
                    style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                  >
                    Failed to load appointments
                  </p>
                  <p
                    className="font-sans"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080', marginTop: 4 }}
                  >
                    Check your connection and try again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-2 transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    borderRadius: 8,
                    border: '1px solid rgba(0,100,130,0.20)',
                    background: '#FFFFFF',
                    padding: '10px 20px',
                    fontSize: 14,
                    lineHeight: '22px',
                    color: '#0D2630',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw style={{ width: 16, height: 16 }} />
                  Retry
                </button>
              </div>
            )}

            {/* Loaded */}
            {pageState === 'loaded' &&
              (todaysAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{ width: 64, height: 64, background: 'rgba(0,180,216,0.10)' }}
                  >
                    <CalendarDays style={{ width: 28, height: 28, color: '#00B4D8' }} />
                  </div>
                  <p
                    className="font-sans font-semibold"
                    style={{ fontSize: 18, lineHeight: '26px', color: '#0D2630' }}
                  >
                    No appointments today
                  </p>
                  <p
                    className="text-center font-sans"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                  >
                    Your schedule is clear for the day.
                  </p>
                </div>
              ) : (
                todaysAppointments.map((appt) => <AppointmentCard key={appt.id} appt={appt} />)
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
