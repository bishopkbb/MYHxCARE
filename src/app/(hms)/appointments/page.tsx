'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, AlertCircle, RefreshCw } from 'lucide-react';
import {
  MOCK_APPOINTMENTS,
  type Appointment,
  type AppointmentStatus,
} from '@/features/appointments/__mocks__/appointmentFixtures';

// ── Types ──────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  confirmed: {
    label: 'Confirmed',
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.08)',
    border: 'rgba(22,163,74,0.28)',
  },
  urgent: {
    label: 'Urgent',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.28)',
  },
  pending: {
    label: 'Pending',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.28)',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.08)',
    border: 'rgba(107,114,128,0.28)',
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto" style={{ background: '#F5FBFD' }}>
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
                  className="flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
              (MOCK_APPOINTMENTS.length === 0 ? (
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
                MOCK_APPOINTMENTS.map((appt) => <AppointmentCard key={appt.id} appt={appt} />)
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
