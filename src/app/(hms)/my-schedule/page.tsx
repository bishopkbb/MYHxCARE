'use client';

import { useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  Clock,
  MapPin,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Bell,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import {
  MOCK_DOCTOR,
  MOCK_ACTIVE_SHIFT,
  MOCK_WEEK_DAYS,
  MOCK_UPCOMING_SHIFTS,
  MOCK_ON_CALL_ROTA,
  MOCK_MONTH_STATS,
  type ShiftType,
  type WeekDay,
  type UpcomingShift,
  type OnCallEntry,
  type MonthStat,
} from '@/features/schedule/__mocks__/scheduleFixtures';

// ── Types ──────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';

// ── Config ─────────────────────────────────────────────────────────────────────

const SHIFT_CFG: Record<ShiftType, { label: string; color: string; bg: string; border: string }> = {
  morning: {
    label: 'MORNING',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.10)',
    border: 'rgba(249,115,22,0.28)',
  },
  afternoon: {
    label: 'AFTERNOON',
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.10)',
    border: 'rgba(0,180,216,0.28)',
  },
  night: {
    label: 'NIGHT',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.10)',
    border: 'rgba(139,92,246,0.28)',
  },
  'on-call': {
    label: 'ON-CALL',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.28)',
  },
  'off-day': {
    label: 'OFF DAY',
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.10)',
    border: 'rgba(107,114,128,0.28)',
  },
};

const LEGEND = [
  { color: '#F97316', label: 'Morning' },
  { color: '#00B4D8', label: 'Afternoon' },
  { color: '#8B5CF6', label: 'Night' },
  { color: '#EF4444', label: 'On-Call' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getTimeOfDayMeta() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { Icon: Sun, color: '#F97316' };
  if (h >= 12 && h < 17) return { Icon: Sun, color: '#EAB308' };
  if (h >= 17 && h < 21) return { Icon: Sun, color: '#F97316' };
  return { Icon: Moon, color: '#8B5CF6' };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ShiftTypeIcon({ type, size = 28 }: { type: ShiftType; size?: number }) {
  if (type === 'on-call') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#EF4444',
          flexShrink: 0,
        }}
      />
    );
  }
  const meta: Record<string, { Icon: typeof Sun; color: string }> = {
    morning: { Icon: Sun, color: '#F97316' },
    afternoon: { Icon: Sun, color: '#00B4D8' },
    night: { Icon: Moon, color: '#8B5CF6' },
    'off-day': { Icon: Sun, color: '#CBD5E1' },
  };
  const { Icon, color } = meta[type] ?? { Icon: Sun, color: '#CBD5E1' };
  return <Icon style={{ width: size, height: size, color, flexShrink: 0 }} />;
}

function ShiftBadge({ type }: { type: ShiftType }) {
  const cfg = SHIFT_CFG[type];
  return (
    <span
      className="shrink-0 font-sans font-semibold"
      style={{
        fontSize: 14,
        lineHeight: '20px',
        borderRadius: 6,
        padding: '2px 8px',
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        letterSpacing: '0.2px',
      }}
    >
      {cfg.label}
    </span>
  );
}

// ── Skeleton components ────────────────────────────────────────────────────────

function SkeletonActiveShiftCard() {
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ borderRadius: 16, background: '#1A3D4D', minHeight: 145, position: 'relative' }}
    >
      <div className="flex items-center gap-4 px-6 py-6 sm:gap-6">
        <div
          className="shrink-0 animate-pulse rounded-2xl"
          style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.15)' }}
        />
        <div className="flex flex-1 flex-col gap-2">
          <div
            className="animate-pulse rounded"
            style={{ width: 140, height: 14, background: 'rgba(255,255,255,0.15)' }}
          />
          <div
            className="animate-pulse rounded"
            style={{ width: 220, height: 30, background: 'rgba(255,255,255,0.15)' }}
          />
          <div className="flex flex-wrap gap-4">
            <div
              className="animate-pulse rounded"
              style={{ width: 100, height: 16, background: 'rgba(255,255,255,0.15)' }}
            />
            <div
              className="animate-pulse rounded"
              style={{ width: 150, height: 16, background: 'rgba(255,255,255,0.15)' }}
            />
            <div
              className="animate-pulse rounded"
              style={{ width: 140, height: 16, background: 'rgba(255,255,255,0.15)' }}
            />
          </div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <div
            className="animate-pulse rounded-full"
            style={{ width: 164, height: 38, background: 'rgba(255,255,255,0.15)' }}
          />
          <div
            className="animate-pulse rounded"
            style={{ width: 110, height: 14, background: 'rgba(255,255,255,0.15)' }}
          />
        </div>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  );
}

function SkeletonWeekDayCard() {
  return (
    <div
      className="flex shrink-0 flex-col gap-1.5"
      style={{
        width: 120,
        minHeight: 160,
        borderRadius: 12,
        padding: 12,
        border: '1px solid rgba(0,100,130,0.12)',
        background: '#FFFFFF',
      }}
    >
      <div className="animate-pulse rounded bg-slate-200" style={{ width: 36, height: 18 }} />
      <div className="animate-pulse rounded bg-slate-200" style={{ width: 44, height: 16 }} />
      <div className="flex flex-1 items-center justify-center">
        <div
          className="animate-pulse rounded-full bg-slate-200"
          style={{ width: 30, height: 30 }}
        />
      </div>
      <div className="animate-pulse rounded bg-slate-200" style={{ width: 60, height: 16 }} />
      <div className="animate-pulse rounded bg-slate-200" style={{ width: 80, height: 14 }} />
    </div>
  );
}

function SkeletonUpcomingRow({ last = false }: { last?: boolean }) {
  return (
    <div
      className="flex items-start gap-3 py-4"
      style={{ borderBottom: last ? 'none' : '1px solid rgba(0,100,130,0.08)' }}
    >
      <div
        className="shrink-0 animate-pulse rounded-full bg-slate-200"
        style={{ width: 28, height: 28, marginTop: 2 }}
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 90, height: 18 }} />
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 70, height: 20 }} />
        </div>
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 180, height: 16 }} />
      </div>
      <div
        className="shrink-0 animate-pulse rounded bg-slate-200"
        style={{ width: 100, height: 36 }}
      />
    </div>
  );
}

function SkeletonOnCallEntry({ last = false }: { last?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid rgba(0,100,130,0.08)' }}
    >
      <div
        className="shrink-0 animate-pulse rounded-full bg-slate-200"
        style={{ width: 40, height: 40 }}
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 130, height: 18 }} />
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 90, height: 16 }} />
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 80, height: 14 }} />
      </div>
    </div>
  );
}

function SkeletonMonthStat() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 py-6"
      style={{ borderRadius: 12, background: '#F8FAFC', flex: 1, minWidth: 0 }}
    >
      <div className="animate-pulse rounded bg-slate-200" style={{ width: 48, height: 42 }} />
      <div className="animate-pulse rounded bg-slate-200" style={{ width: 100, height: 16 }} />
    </div>
  );
}

// ── Content components ─────────────────────────────────────────────────────────

function WeekDayCard({ day }: { day: WeekDay }) {
  const isOff = day.shift === 'off-day';
  const shiftCfg = SHIFT_CFG[day.shift];

  return (
    <div
      className="flex shrink-0 flex-col"
      style={{
        width: 120,
        minHeight: 160,
        borderRadius: 12,
        padding: 12,
        gap: 4,
        border: day.isToday ? '2px solid #00B4D8' : '1px solid rgba(0,100,130,0.12)',
        background: day.isToday ? 'rgba(0,180,216,0.06)' : '#FFFFFF',
      }}
    >
      {/* Day name + today dot */}
      <div className="flex items-center justify-between">
        <span
          className="font-sans font-semibold"
          style={{ fontSize: 14, lineHeight: '20px', color: day.isToday ? '#00B4D8' : '#0D2630' }}
        >
          {day.dayName}
        </span>
        {day.isToday && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#00B4D8',
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* Date */}
      <span className="font-sans" style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}>
        {day.dateLabel}
      </span>

      {/* Shift icon */}
      <div className="flex flex-1 items-center justify-center py-1">
        {isOff ? (
          <span style={{ fontSize: 20, color: '#CBD5E1', fontWeight: 300, lineHeight: 1 }}>—</span>
        ) : (
          <ShiftTypeIcon type={day.shift} size={30} />
        )}
      </div>

      {/* Shift label */}
      {day.shiftLabel ? (
        <span
          className="font-sans font-medium"
          style={{ fontSize: 14, lineHeight: '20px', color: shiftCfg.color }}
        >
          {day.shiftLabel}
        </span>
      ) : (
        <span className="font-sans" style={{ fontSize: 14, lineHeight: '20px', color: '#94A3B8' }}>
          Off Day
        </span>
      )}

      {/* Time range */}
      {day.timeRange && (
        <span className="font-sans" style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}>
          {day.timeRange}
        </span>
      )}

      {/* Status icon */}
      {day.status === 'acknowledged' && (
        <CheckCircle2 style={{ width: 18, height: 18, color: '#16A34A' }} />
      )}
      {day.status === 'pending' && (
        <AlertTriangle style={{ width: 18, height: 18, color: '#D97706' }} />
      )}
    </div>
  );
}

interface UpcomingShiftRowProps {
  shift: UpcomingShift & { resolvedStatus: 'confirmed' | 'declined' | 'pending' | 'off-day' };
  onConfirm: (id: string) => void;
  onCannotAttend: (id: string) => void;
  last?: boolean;
}

function UpcomingShiftRow({
  shift,
  onConfirm,
  onCannotAttend,
  last = false,
}: UpcomingShiftRowProps) {
  const isOff = shift.type === 'off-day';
  const showConfirmed = shift.resolvedStatus === 'confirmed';
  const showActions = shift.requiresAction && shift.resolvedStatus === 'pending';

  return (
    <div
      className="py-4"
      style={{ borderBottom: last ? 'none' : '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex shrink-0 items-start justify-center pt-1" style={{ width: 32 }}>
          {isOff ? (
            <span style={{ fontSize: 18, color: '#CBD5E1', lineHeight: 1 }}>—</span>
          ) : (
            <ShiftTypeIcon type={shift.type} size={24} />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className="font-sans font-semibold"
              style={{ fontSize: 15, lineHeight: '22px', color: '#0D2630' }}
            >
              {shift.dayLabel}
            </span>
            <ShiftBadge type={shift.type} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
            <span
              className="flex items-center gap-1 font-sans"
              style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
            >
              <Clock style={{ width: 13, height: 13, flexShrink: 0 }} />
              {shift.timeRange}
              {shift.timeNote && <span className="ml-0.5">{shift.timeNote}</span>}
            </span>
            {shift.location && (
              <span
                className="flex items-center gap-1 font-sans"
                style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
              >
                <MapPin style={{ width: 13, height: 13, flexShrink: 0 }} />
                {shift.location}
              </span>
            )}
          </div>
        </div>

        {/* Status / Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {showConfirmed && (
            <span
              className="flex items-center gap-1.5 font-sans font-medium"
              style={{ fontSize: 14, lineHeight: '20px', color: '#16A34A' }}
            >
              <CheckCircle2 style={{ width: 16, height: 16 }} />
              Confirmed
            </span>
          )}
          {showActions && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onConfirm(shift.id)}
                className="font-sans font-medium transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  borderRadius: 8,
                  border: 'none',
                  background: '#00B4D8',
                  padding: '8px 16px',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Confirm Shift
              </button>
              <button
                type="button"
                onClick={() => onCannotAttend(shift.id)}
                className="font-sans font-medium transition-colors duration-150 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:outline-none"
                style={{
                  borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.35)',
                  background: '#FFFFFF',
                  padding: '8px 16px',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: '#EF4444',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Cannot Attend
              </button>
            </div>
          )}
          {shift.resolvedStatus === 'declined' && (
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#EF4444' }}>
              Absence reported
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function OnCallEntryRow({ entry, last = false }: { entry: OnCallEntry; last?: boolean }) {
  const timeColor = entry.isNow ? '#00B4D8' : entry.isYou ? '#D97706' : '#4A7080';

  return (
    <div
      className="flex items-center gap-3 py-3"
      style={{
        borderLeft: entry.isNow ? '3px solid #00B4D8' : '3px solid transparent',
        paddingLeft: 12,
        paddingRight: 12,
        background: entry.isNow
          ? 'rgba(0,180,216,0.05)'
          : entry.isYou
            ? 'rgba(245,158,11,0.05)'
            : 'transparent',
        borderBottom: last ? 'none' : '1px solid rgba(0,100,130,0.08)',
      }}
    >
      {/* Avatar */}
      <div
        className="flex shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
        style={{
          width: 40,
          height: 40,
          background: entry.avatarColor,
          fontSize: 14,
          lineHeight: '20px',
        }}
      >
        {entry.initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="font-sans font-semibold"
            style={{ fontSize: 15, lineHeight: '22px', color: '#0D2630' }}
          >
            {entry.name}
          </span>
          {entry.isNow && (
            <span
              className="font-sans font-semibold"
              style={{
                fontSize: 14,
                lineHeight: '18px',
                borderRadius: 4,
                padding: '1px 6px',
                color: '#16A34A',
                background: 'rgba(22,163,74,0.10)',
                border: '1px solid rgba(22,163,74,0.25)',
              }}
            >
              NOW
            </span>
          )}
          {entry.isYou && (
            <span
              className="font-sans font-semibold"
              style={{
                fontSize: 14,
                lineHeight: '18px',
                borderRadius: 4,
                padding: '1px 6px',
                color: '#D97706',
                background: 'rgba(217,119,6,0.10)',
                border: '1px solid rgba(217,119,6,0.25)',
              }}
            >
              YOU
            </span>
          )}
        </div>
        <p className="font-sans" style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}>
          {entry.subtitleLabel}
        </p>
        <p
          className="font-sans font-medium"
          style={{ fontSize: 14, lineHeight: '20px', color: timeColor }}
        >
          {entry.timeRange}
        </p>
      </div>
    </div>
  );
}

function MonthStatCard({ stat }: { stat: MonthStat }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-6"
      style={{ borderRadius: 12, background: stat.bg, minWidth: 0 }}
    >
      <span
        className="font-display font-bold"
        style={{ fontSize: 36, lineHeight: '44px', color: stat.color }}
      >
        {stat.count}
      </span>
      <span
        className="text-center font-sans"
        style={{ fontSize: 14, lineHeight: '20px', color: stat.color, opacity: 0.85 }}
      >
        {stat.label}
      </span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MySchedulePage() {
  const toast = useToast();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleConfirmShift(id: string) {
    setConfirmedIds((prev) => new Set([...prev, id]));
    toast.success('Shift confirmed', 'Your attendance has been recorded.');
  }

  function handleCannotAttend(id: string) {
    setDeclinedIds((prev) => new Set([...prev, id]));
    toast.error('Absence reported', 'A coordinator will be notified to arrange cover.');
  }

  const enrichedUpcoming = MOCK_UPCOMING_SHIFTS.map((s) => ({
    ...s,
    resolvedStatus: confirmedIds.has(s.id)
      ? ('confirmed' as const)
      : declinedIds.has(s.id)
        ? ('declined' as const)
        : s.status,
    requiresAction: s.requiresAction && !confirmedIds.has(s.id) && !declinedIds.has(s.id),
  }));

  const pendingCount = enrichedUpcoming.filter((s) => s.requiresAction).length;

  const timeOfDay = getTimeOfDayMeta();
  const TimeIcon = timeOfDay.Icon;

  const monthLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px]">
          {/* ── Page header ──────────────────────────────────────────────────── */}
          <div
            className="px-4 sm:px-6"
            style={{
              background: '#FFFFFF',
              borderBottom: '1px solid rgba(0,100,130,0.12)',
              paddingTop: 24,
              paddingBottom: 20,
            }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 28, lineHeight: '36px', color: '#0D2630' }}
                >
                  My Schedule
                </h1>
                <p
                  className="font-sans"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080', marginTop: 2 }}
                >
                  {MOCK_DOCTOR.name} · {MOCK_DOCTOR.specialty} · Week of {MOCK_DOCTOR.weekLabel}
                </p>
              </div>

              {pendingCount > 0 && (
                <div
                  className="flex shrink-0 items-center gap-2"
                  style={{
                    borderRadius: 12,
                    border: '1px solid #FEE685',
                    background: '#FFFBEB',
                    padding: '8px 12px',
                  }}
                >
                  <AlertTriangle
                    style={{ width: 16, height: 16, color: '#D97706', flexShrink: 0 }}
                  />
                  <span
                    className="font-sans font-medium"
                    style={{
                      fontSize: 14,
                      lineHeight: '22px',
                      color: '#B45309',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pendingCount} shift{pendingCount !== 1 ? 's' : ''} awaiting acknowledgement
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Content ──────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 px-4 pt-4 pb-10 sm:px-6">
            {/* ── Loading ──────────────────────────────────────────────────── */}
            {pageState === 'loading' && (
              <>
                <SkeletonActiveShiftCard />

                {/* Week skeleton */}
                <div className="flex flex-col gap-3">
                  <div
                    className="animate-pulse rounded bg-slate-200"
                    style={{ width: 90, height: 20 }}
                  />
                  <div className="overflow-x-auto scroll-smooth pb-1">
                    <div className="flex gap-4">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <SkeletonWeekDayCard key={i} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Two-column skeleton */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div
                    style={{
                      borderRadius: 12,
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.12)',
                      padding: 20,
                    }}
                  >
                    <div
                      className="mb-4 animate-pulse rounded bg-slate-200"
                      style={{ width: 150, height: 22 }}
                    />
                    {Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonUpcomingRow key={i} last={i === 4} />
                    ))}
                  </div>
                  <div
                    style={{
                      borderRadius: 12,
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.12)',
                      padding: 20,
                    }}
                  >
                    <div
                      className="mb-4 animate-pulse rounded bg-slate-200"
                      style={{ width: 160, height: 22 }}
                    />
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonOnCallEntry key={i} last={i === 3} />
                    ))}
                  </div>
                </div>

                {/* Monthly stats skeleton */}
                <div className="flex flex-col gap-3">
                  <div
                    className="animate-pulse rounded bg-slate-200"
                    style={{ width: 220, height: 24 }}
                  />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonMonthStat key={i} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Error ────────────────────────────────────────────────────── */}
            {pageState === 'error' && (
              <div className="flex flex-col items-center justify-center gap-4 py-20">
                <AlertCircle style={{ width: 40, height: 40, color: '#EF4444', opacity: 0.7 }} />
                <div className="text-center">
                  <p
                    className="font-sans font-medium"
                    style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                  >
                    Failed to load schedule
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

            {/* ── Loaded ───────────────────────────────────────────────────── */}
            {pageState === 'loaded' && (
              <>
                {/* Today's Active Shift */}
                <div
                  className="relative flex flex-col overflow-hidden"
                  style={{ borderRadius: 16, background: '#1A3D4D', minHeight: 145 }}
                >
                  <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-6">
                    {/* Time-of-day icon */}
                    <div
                      className="flex shrink-0 items-center justify-center"
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.10)',
                      }}
                    >
                      <TimeIcon style={{ width: 32, height: 32, color: timeOfDay.color }} />
                    </div>

                    {/* Shift info */}
                    <div className="flex-1">
                      <p
                        className="font-sans font-semibold tracking-wider uppercase"
                        style={{
                          fontSize: 14,
                          lineHeight: '20px',
                          color: '#00B4D8',
                          marginBottom: 4,
                        }}
                      >
                        Today&apos;s Active Shift
                      </p>
                      <h2
                        className="font-display font-bold text-white"
                        style={{ fontSize: 26, lineHeight: '34px', marginBottom: 8 }}
                      >
                        {MOCK_ACTIVE_SHIFT.label}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                        <span
                          className="flex items-center gap-1.5 font-sans"
                          style={{
                            fontSize: 14,
                            lineHeight: '20px',
                            color: 'rgba(255,255,255,0.65)',
                          }}
                        >
                          <Clock style={{ width: 14, height: 14 }} />
                          {MOCK_ACTIVE_SHIFT.startTime} – {MOCK_ACTIVE_SHIFT.endTime}
                        </span>
                        <span
                          className="flex items-center gap-1.5 font-sans"
                          style={{
                            fontSize: 14,
                            lineHeight: '20px',
                            color: 'rgba(255,255,255,0.65)',
                          }}
                        >
                          <MapPin style={{ width: 14, height: 14 }} />
                          {MOCK_ACTIVE_SHIFT.location}
                        </span>
                        <span
                          className="flex items-center gap-1.5 font-sans"
                          style={{
                            fontSize: 14,
                            lineHeight: '20px',
                            color: 'rgba(255,255,255,0.65)',
                          }}
                        >
                          <CalendarDays style={{ width: 14, height: 14 }} />
                          {MOCK_ACTIVE_SHIFT.dateLabel}
                        </span>
                      </div>
                    </div>

                    {/* Acknowledged badge + remaining */}
                    <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                      {MOCK_ACTIVE_SHIFT.status === 'acknowledged' ? (
                        <div
                          className="flex items-center gap-2 font-sans font-medium"
                          style={{
                            borderRadius: 20,
                            border: '1.5px solid rgba(22,163,74,0.50)',
                            background: 'rgba(22,163,74,0.12)',
                            padding: '8px 16px',
                            fontSize: 14,
                            lineHeight: '20px',
                            color: '#4ADE80',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CheckCircle2 style={{ width: 16, height: 16 }} />
                          Shift Acknowledged
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="font-sans font-medium transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            borderRadius: 20,
                            border: 'none',
                            background: '#00B4D8',
                            padding: '8px 20px',
                            fontSize: 14,
                            lineHeight: '20px',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Acknowledge Shift
                        </button>
                      )}
                      <span
                        className="font-sans"
                        style={{
                          fontSize: 14,
                          lineHeight: '20px',
                          color: 'rgba(255,255,255,0.45)',
                        }}
                      >
                        {MOCK_ACTIVE_SHIFT.remainingLabel}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      style={{
                        width: `${MOCK_ACTIVE_SHIFT.progressPercent}%`,
                        height: '100%',
                        background: '#00B4D8',
                      }}
                    />
                  </div>
                </div>

                {/* This Week */}
                <div className="flex flex-col gap-3">
                  <p
                    className="font-sans font-bold tracking-wider uppercase"
                    style={{ fontSize: 14, lineHeight: '20px', color: '#0D2630' }}
                  >
                    This Week
                  </p>

                  <div className="overflow-x-auto scroll-smooth pb-1">
                    <div className="flex gap-4 lg:gap-[50px]" style={{ minWidth: 'min-content' }}>
                      {MOCK_WEEK_DAYS.map((day) => (
                        <WeekDayCard key={day.dayName} day={day} />
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                    {LEGEND.map((item) => (
                      <span key={item.label} className="flex items-center gap-1.5">
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: item.color,
                            flexShrink: 0,
                            display: 'inline-block',
                          }}
                        />
                        <span
                          className="font-sans"
                          style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
                        >
                          {item.label}
                        </span>
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 style={{ width: 14, height: 14, color: '#16A34A' }} />
                      <span
                        className="font-sans"
                        style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
                      >
                        Acknowledged
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle style={{ width: 14, height: 14, color: '#D97706' }} />
                      <span
                        className="font-sans"
                        style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
                      >
                        Pending
                      </span>
                    </span>
                  </div>
                </div>

                {/* Two-column: Upcoming Shifts + On-Call Rota */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* Upcoming Shifts */}
                  <div
                    style={{
                      borderRadius: 12,
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.12)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="flex items-center justify-between px-5 py-4"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays style={{ width: 18, height: 18, color: '#00B4D8' }} />
                        <span
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                        >
                          Upcoming Shifts
                        </span>
                      </div>
                      {pendingCount > 0 && (
                        <span
                          className="font-sans font-medium"
                          style={{
                            fontSize: 14,
                            lineHeight: '20px',
                            borderRadius: 20,
                            padding: '3px 10px',
                            color: '#D97706',
                            background: 'rgba(217,119,6,0.10)',
                            border: '1px solid rgba(217,119,6,0.28)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {pendingCount} pending ack.
                        </span>
                      )}
                    </div>
                    <div className="px-5">
                      {enrichedUpcoming.map((shift, i) => (
                        <UpcomingShiftRow
                          key={shift.id}
                          shift={shift}
                          onConfirm={handleConfirmShift}
                          onCannotAttend={handleCannotAttend}
                          last={i === enrichedUpcoming.length - 1}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Dept. On-Call Rota */}
                  <div
                    style={{
                      borderRadius: 12,
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.12)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="px-5 py-4"
                      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Bell style={{ width: 18, height: 18, color: '#EF4444' }} />
                        <span
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                        >
                          Dept. On-Call Rota
                        </span>
                      </div>
                      <p
                        className="font-sans"
                        style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080', marginTop: 2 }}
                      >
                        {MOCK_DOCTOR.specialty} · Next 7 days
                      </p>
                    </div>

                    <div>
                      {MOCK_ON_CALL_ROTA.map((entry, i) => (
                        <OnCallEntryRow
                          key={entry.id}
                          entry={entry}
                          last={i === MOCK_ON_CALL_ROTA.length - 1}
                        />
                      ))}
                    </div>

                    {/* On-call pending warning */}
                    {MOCK_UPCOMING_SHIFTS.some(
                      (s) =>
                        s.type === 'on-call' &&
                        s.requiresAction &&
                        !confirmedIds.has(s.id) &&
                        !declinedIds.has(s.id),
                    ) && (
                      <div
                        className="mx-4 mb-4 flex items-start gap-2"
                        style={{
                          borderRadius: 8,
                          background: '#FFFBEB',
                          border: '1px solid #FEE685',
                          padding: '10px 12px',
                          marginTop: 8,
                        }}
                      >
                        <AlertTriangle
                          style={{
                            width: 16,
                            height: 16,
                            color: '#D97706',
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        />
                        <p
                          className="font-sans"
                          style={{ fontSize: 14, lineHeight: '20px', color: '#B45309' }}
                        >
                          Your on-call assignment (Fri Jul 4) is awaiting acknowledgement.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Overview */}
                <div className="flex flex-col gap-3">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                  >
                    Monthly Overview — {monthLabel}
                  </p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {MOCK_MONTH_STATS.map((stat) => (
                      <MonthStatCard key={stat.label} stat={stat} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
