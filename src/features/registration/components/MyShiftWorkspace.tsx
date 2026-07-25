'use client';

import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  ShieldQuestion,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  SHIFT_TYPE_OPTIONS,
  type RegistrationShift,
  type ShiftStatus,
} from '@/features/registration/__mocks__/registrationWorkforceFixtures';
import {
  acknowledgeShift,
  useRegistrationShifts,
} from '@/features/registration/store/registrationShiftStore';

type PageState = 'loading' | 'loaded' | 'error';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STATUS_CFG: Record<ShiftStatus, { label: string; color: string }> = {
  ON_DUTY: { label: 'On Duty', color: '#22C55E' },
  SCHEDULED: { label: 'Scheduled', color: '#00B4D8' },
  ON_CALL: { label: 'On-Call', color: '#EF4444' },
  COMPLETED: { label: 'Completed', color: '#6B7280' },
  CANCELLED: { label: 'Cancelled', color: '#EF4444' },
};

function shiftTypeLabel(type: RegistrationShift['shiftType']): string {
  return SHIFT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function MyShiftWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const shifts = useRegistrationShifts();
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  // Only the demo Registration Officer login (usr_011) has a `staffId`-linked
  // shift in the mock roster today — every other account genuinely has none,
  // which is why the empty state below is a real, reachable state, not a
  // hypothetical.
  const myShifts = shifts.filter((s) => s.staffId === user?.id && s.status !== 'CANCELLED');
  const teamOnDuty = shifts.filter((s) => s.status === 'ON_DUTY' && s.staffId !== user?.id);

  function handleAcknowledge(shift: RegistrationShift) {
    acknowledgeShift(shift.id);
    toast.success('Shift acknowledged', 'Your shift has been marked as acknowledged.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.registration)}
              className={`transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              My Shift
            </span>
          </nav>

          <h1
            className="font-display mt-2 font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            My Shift
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Your own shift assignment and who else is on duty right now
          </p>

          {pageState === 'loading' && (
            <div className="mt-5 flex flex-col gap-4">
              <div
                className="animate-pulse rounded-[16px]"
                style={{ height: 160, background: '#E2EDF1' }}
              />
              <div
                className="animate-pulse rounded-[12px]"
                style={{ height: 220, background: '#E2EDF1' }}
              />
            </div>
          )}

          {pageState === 'error' && (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load your shift
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
          )}

          {pageState === 'loaded' && (
            <div className="mt-5 flex flex-col gap-4">
              {/* ── My shift(s) ──────────────────────────────────────────── */}
              {myShifts.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <ShieldQuestion style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                    No shift assigned to you right now
                  </p>
                  <p className="max-w-[380px]" style={{ fontSize: 14, color: '#8A98A3' }}>
                    If you were expecting one, check with your supervisor — shifts are assigned from
                    Workforce Management.
                  </p>
                </div>
              ) : (
                myShifts.map((shift) => {
                  const statusCfg = STATUS_CFG[shift.status];
                  return (
                    <div
                      key={shift.id}
                      className="relative flex flex-col overflow-hidden"
                      style={{ borderRadius: 16, background: '#1A3D4D', minHeight: 145 }}
                    >
                      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-6">
                        <div className="flex-1">
                          <p
                            className="font-sans font-semibold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#00B4D8', marginBottom: 4 }}
                          >
                            {shiftTypeLabel(shift.shiftType)} Shift
                          </p>
                          <h2
                            className="font-display font-bold text-white"
                            style={{ fontSize: 24, lineHeight: '32px', marginBottom: 8 }}
                          >
                            {shift.role} · {shift.ward}
                          </h2>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                            <span
                              className="flex items-center gap-1.5"
                              style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}
                            >
                              <Clock style={{ width: 14, height: 14 }} />
                              {shift.timeRange}
                            </span>
                            <span
                              className="flex items-center gap-1.5"
                              style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}
                            >
                              <MapPin style={{ width: 14, height: 14 }} />
                              {shift.ward}
                            </span>
                            <span
                              className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                color: statusCfg.color,
                                border: `1px solid ${statusCfg.color}66`,
                                background: `${statusCfg.color}1A`,
                              }}
                            >
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center">
                          {shift.acknowledged ? (
                            <div
                              className="flex items-center gap-2 font-sans font-medium"
                              style={{
                                borderRadius: 20,
                                border: '1.5px solid rgba(34,197,94,0.5)',
                                background: 'rgba(34,197,94,0.12)',
                                padding: '8px 16px',
                                fontSize: 14,
                                color: '#4ADE80',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <CheckCircle2 style={{ width: 16, height: 16 }} />
                              Shift Acknowledged
                            </div>
                          ) : (
                            // Self-service — deliberately not gated behind
                            // duty_roster:write (that's the supervisor
                            // roster-management permission). Acknowledging
                            // your own shift only requires being able to see
                            // it, which every registration staff member can.
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(shift)}
                              className={`font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                              style={{
                                borderRadius: 20,
                                border: 'none',
                                background: '#00B4D8',
                                padding: '8px 20px',
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Acknowledge Shift
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* ── Team on duty now ─────────────────────────────────────── */}
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <Users style={{ width: 18, height: 18, color: '#00B4D8' }} />
                  <h2
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Team on Duty Now
                  </h2>
                </div>
                {teamOnDuty.length === 0 ? (
                  <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                    Nobody else is currently marked on duty.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2.5">
                    {teamOnDuty.map((s) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                          style={{ background: s.avatarBg }}
                        >
                          {s.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {s.staffName}
                          </p>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {s.role} · {s.ward}
                          </p>
                        </div>
                        <span
                          className="flex shrink-0 items-center gap-1"
                          style={{ fontSize: 14, color: '#8A98A3' }}
                        >
                          <CalendarClock style={{ width: 13, height: 13 }} />
                          {s.timeRange}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
