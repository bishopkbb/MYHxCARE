'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  CALENDAR_SLOT_META,
  getCalendarAssignment,
  type CalendarSlot,
} from '@/features/workforce/__mocks__/workforceFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const SLOTS: CalendarSlot[] = ['MORNING', 'AFTERNOON', 'NIGHT', 'ON_CALL'];

type ViewMode = 'day' | 'week' | 'month' | 'timeline';

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'timeline', label: 'Timeline' },
];

const DAY_ABBR_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  weekday: 'short',
});
const DAY_NUM_FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: '2-digit' });
const MONTH_SHORT_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  month: 'short',
});
const YEAR_FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric' });
const WEEKDAY_LONG_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  weekday: 'long',
});

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function dayIndexAbsolute(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return dayIndexAbsolute(a) === dayIndexAbsolute(b);
}

function dayLabel(d: Date): string {
  return `${DAY_ABBR_FMT.format(d).toUpperCase()} ${DAY_NUM_FMT.format(d)}`;
}

// ── Shift chip ────────────────────────────────────────────────────────────────

function ShiftChip({
  slot,
  doctorName,
  dimmed,
}: {
  slot: CalendarSlot;
  doctorName: string;
  dimmed: boolean;
}) {
  const meta = CALENDAR_SLOT_META[slot];
  return (
    <span
      className="inline-flex items-center justify-center rounded-[8px] px-2.5 py-1.5 font-sans font-medium transition-opacity duration-150"
      style={{
        fontSize: 14,
        lineHeight: '20px',
        color: meta.color,
        border: `1px solid ${meta.border}`,
        background: meta.bg,
        whiteSpace: 'nowrap',
        opacity: dimmed ? 0.3 : 1,
      }}
    >
      {doctorName}
    </span>
  );
}

// ── Shift Calendar ───────────────────────────────────────────────────────────

export function ShiftCalendar() {
  const [mode, setMode] = useState<ViewMode>('week');
  const [offset, setOffset] = useState(0);
  const [filterSlot, setFilterSlot] = useState<CalendarSlot | 'ALL'>('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  const today = useMemo(() => new Date(), []);

  function changeMode(next: ViewMode) {
    setMode(next);
    setOffset(0);
  }

  function goPrev() {
    setOffset((o) => o - 1);
  }
  function goNext() {
    setOffset((o) => o + 1);
  }
  function goToday() {
    setOffset(0);
  }

  // ── Derived period ──────────────────────────────────────────────────────
  const weekStart = useMemo(() => addDays(getMonday(today), offset * 7), [today, offset]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const dayDate = useMemo(() => addDays(today, offset), [today, offset]);
  const monthAnchor = useMemo(() => addMonths(today, offset), [today, offset]);

  const monthGrid = useMemo(() => {
    const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const gridStart = getMonday(first);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [monthAnchor]);

  const rangeLabel = useMemo(() => {
    if (mode === 'day') {
      return `${WEEKDAY_LONG_FMT.format(dayDate)}, ${DAY_NUM_FMT.format(dayDate)} ${MONTH_SHORT_FMT.format(dayDate)} ${YEAR_FMT.format(dayDate)}`;
    }
    if (mode === 'month') {
      return `${MONTH_SHORT_FMT.format(monthAnchor)} ${YEAR_FMT.format(monthAnchor)}`;
    }
    const weekEnd = addDays(weekStart, 6);
    return `${MONTH_SHORT_FMT.format(weekStart)} ${DAY_NUM_FMT.format(weekStart)} – ${MONTH_SHORT_FMT.format(weekEnd)} ${DAY_NUM_FMT.format(weekEnd)}, ${YEAR_FMT.format(weekEnd)}`;
  }, [mode, dayDate, monthAnchor, weekStart]);

  function assignmentFor(slot: CalendarSlot, date: Date): string {
    return getCalendarAssignment(slot, dayIndexAbsolute(date));
  }

  return (
    <div
      className="mt-5 overflow-hidden rounded-[12px] p-4 sm:p-5"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <h2
        className="font-display font-semibold"
        style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
      >
        Shift Calendar
      </h2>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div
          className="flex items-center gap-1.5 rounded-[10px] p-1"
          style={{ background: 'rgba(226,237,241,0.5)' }}
        >
          {VIEW_MODES.map((m) => {
            const active = mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => changeMode(m.value)}
                className={`rounded-[8px] px-3.5 py-1.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  background: active ? '#00B4D8' : 'transparent',
                  color: active ? '#FFFFFF' : '#4A7080',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous period"
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 ${FOCUS_RING}`}
          >
            <span
              className="flex size-9 items-center justify-center rounded-[8px]"
              style={{ border: '1px solid #0064821F', background: '#FFFFFF' }}
            >
              <ChevronLeft style={{ width: 16, height: 16, color: '#4A7080' }} />
            </span>
          </button>
          <button
            type="button"
            onClick={goToday}
            className={`rounded-[8px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid #0064821F' }}
          >
            {rangeLabel}
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next period"
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 ${FOCUS_RING}`}
          >
            <span
              className="flex size-9 items-center justify-center rounded-[8px]"
              style={{ border: '1px solid #0064821F', background: '#FFFFFF' }}
            >
              <ChevronRight style={{ width: 16, height: 16, color: '#4A7080' }} />
            </span>
          </button>
        </div>

        <div className="relative ml-auto" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{
              border: filterOpen ? '1px solid #00B4D8' : '1px solid #0064821F',
              color: filterSlot !== 'ALL' ? '#00B4D8' : '#0D2630',
              fontSize: 14,
            }}
          >
            <ListFilter style={{ width: 16, height: 16 }} />
            Filter
            <ChevronDown
              style={{
                width: 14,
                height: 14,
                transform: filterOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms',
              }}
            />
          </button>
          {filterOpen && (
            <div
              className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1 min-w-[170px] overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
              style={{
                border: '1px solid rgba(0,100,130,0.12)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setFilterSlot('ALL');
                  setFilterOpen(false);
                }}
                className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                style={{
                  fontSize: 14,
                  color: filterSlot === 'ALL' ? '#00B4D8' : '#2F3A40',
                  fontWeight: filterSlot === 'ALL' ? 600 : 400,
                }}
              >
                All Shifts
              </button>
              {SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    setFilterSlot(slot);
                    setFilterOpen(false);
                  }}
                  className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                  style={{
                    fontSize: 14,
                    color: filterSlot === slot ? '#00B4D8' : '#2F3A40',
                    fontWeight: filterSlot === slot ? 600 : 400,
                  }}
                >
                  {CALENDAR_SLOT_META[slot].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Week view ─────────────────────────────────────────────────────── */}
      {mode === 'week' && (
        <div className="mt-4 overflow-x-auto scroll-smooth">
          <div className="min-w-[720px]">
            <div
              className="flex"
              style={{ background: 'rgba(226,237,241,0.4)', borderBottom: '1px solid #0064821F' }}
            >
              <div className="w-28 shrink-0 px-3 py-2.5">
                <span
                  className="font-sans font-bold tracking-wider uppercase"
                  style={{ fontSize: 14, color: '#4A7080' }}
                >
                  Time
                </span>
              </div>
              {weekDays.map((d) => (
                <div key={d.toISOString()} className="min-w-0 flex-1 px-3 py-2.5">
                  <span
                    className="font-sans font-bold tracking-wider uppercase"
                    style={{
                      fontSize: 14,
                      color: isSameCalendarDay(d, today) ? '#00B4D8' : '#4A7080',
                    }}
                  >
                    {dayLabel(d)}
                  </span>
                </div>
              ))}
            </div>
            {SLOTS.map((slot) => (
              <div
                key={slot}
                className="flex items-stretch"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
              >
                <div className="w-28 shrink-0 px-3 py-3">
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {CALENDAR_SLOT_META[slot].label}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{CALENDAR_SLOT_META[slot].time}</p>
                </div>
                {weekDays.map((d) => (
                  <div key={d.toISOString()} className="flex min-w-0 flex-1 items-center px-3 py-3">
                    <ShiftChip
                      slot={slot}
                      doctorName={assignmentFor(slot, d)}
                      dimmed={filterSlot !== 'ALL' && filterSlot !== slot}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Day view ──────────────────────────────────────────────────────── */}
      {mode === 'day' && (
        <div className="mt-4 flex flex-col gap-2.5">
          {SLOTS.map((slot) => (
            <div
              key={slot}
              className="flex items-center justify-between gap-3 rounded-[10px] px-4 py-3"
              style={{ border: '1px solid rgba(0,100,130,0.08)' }}
            >
              <div>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {CALENDAR_SLOT_META[slot].label}
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{CALENDAR_SLOT_META[slot].time}</p>
              </div>
              <ShiftChip
                slot={slot}
                doctorName={assignmentFor(slot, dayDate)}
                dimmed={filterSlot !== 'ALL' && filterSlot !== slot}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Timeline view ─────────────────────────────────────────────────── */}
      {mode === 'timeline' && (
        <div className="mt-4 flex flex-col gap-2">
          {weekDays.map((d) => (
            <div
              key={d.toISOString()}
              className="flex flex-wrap items-center gap-3 rounded-[10px] px-4 py-3"
              style={{
                border: isSameCalendarDay(d, today)
                  ? '1px solid rgba(0,180,216,0.35)'
                  : '1px solid rgba(0,100,130,0.08)',
                background: isSameCalendarDay(d, today) ? 'rgba(0,180,216,0.04)' : 'transparent',
              }}
            >
              <p
                className="w-24 shrink-0 font-sans font-semibold"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {dayLabel(d)}
              </p>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {SLOTS.map((slot) => (
                  <ShiftChip
                    key={slot}
                    slot={slot}
                    doctorName={assignmentFor(slot, d)}
                    dimmed={filterSlot !== 'ALL' && filterSlot !== slot}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Month view ────────────────────────────────────────────────────── */}
      {mode === 'month' && (
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-1.5">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d) => (
              <div key={d} className="px-1 py-1 text-center">
                <span
                  className="font-sans font-bold tracking-wider"
                  style={{ fontSize: 14, color: '#8A98A3' }}
                >
                  {d}
                </span>
              </div>
            ))}
            {monthGrid.map((d) => {
              const inMonth = d.getMonth() === monthAnchor.getMonth();
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    setMode('day');
                    setOffset(Math.round((d.getTime() - today.getTime()) / 86_400_000));
                  }}
                  className={`flex min-h-[64px] flex-col items-start gap-1 rounded-[8px] p-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    border: isSameCalendarDay(d, today)
                      ? '1px solid #00B4D8'
                      : '1px solid rgba(0,100,130,0.08)',
                    opacity: inMonth ? 1 : 0.35,
                  }}
                >
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {DAY_NUM_FMT.format(d)}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {SLOTS.map((slot) => (
                      <span
                        key={slot}
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{ background: CALENDAR_SLOT_META[slot].color }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
