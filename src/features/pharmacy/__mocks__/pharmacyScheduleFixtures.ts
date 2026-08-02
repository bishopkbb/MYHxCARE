/**
 * Mock fixtures for the pharmacy-scoped My Schedule page.
 * Mirrors nurseScheduleFixtures.ts's shape and conventions exactly — same
 * ShiftType union, same panel types — so this screen behaves identically to
 * its Nursing sibling. Deliberately NOT wired to staffShiftStore.ts, same as
 * Nursing's own My Schedule (see that store's own doc comment: unifying a
 * personal week-view with the shared roster needs a date dimension neither
 * currently carries — a larger structural pass, not in scope here).
 *
 * Unlike Nursing's version, dates are computed from the real current week
 * rather than hardcoded to a fixed calendar date, so this fixture never goes
 * stale. Replace with real API data in Phase 6 integration.
 */

import { PHARMACY_LOCATIONS } from '@/constants/pharmacyLocations';

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'on-call' | 'off-day';

export type ActiveShift = {
  type: ShiftType;
  label: string;
  startTime: string;
  endTime: string;
  location: string;
  dateLabel: string;
  status: 'acknowledged' | 'pending';
  progressPercent: number;
  remainingLabel: string;
};

export type WeekDay = {
  dayName: string;
  dateLabel: string;
  isToday: boolean;
  shift: ShiftType;
  shiftLabel?: string;
  timeRange?: string;
  status?: 'acknowledged' | 'pending';
};

export type UpcomingShift = {
  id: string;
  dayLabel: string;
  type: ShiftType;
  timeRange: string;
  timeNote?: string;
  location: string | null;
  status: 'confirmed' | 'pending' | 'off-day';
  requiresAction: boolean;
};

export type CampusCoverageEntry = {
  id: string;
  initials: string;
  name: string;
  subtitleLabel: string;
  timeRange: string;
  isNow: boolean;
  isYou: boolean;
  avatarColor: string;
};

export type MonthStat = {
  count: number;
  label: string;
  color: string;
  bg: string;
};

function fmtDayName(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', weekday: 'short' }).format(d);
}
function fmtDateLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    month: 'short',
    day: 'numeric',
  }).format(d);
}
function fmtFullDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}
function fmtDayComma(d: Date): string {
  return `${fmtDayName(d)}, ${fmtDateLabel(d)}`;
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const TODAY = new Date();
const WEEK_START = startOfWeekMonday(TODAY);
const WEEK_END = new Date(WEEK_START);
WEEK_END.setDate(WEEK_START.getDate() + 6);

const PRIMARY_LOCATION = PHARMACY_LOCATIONS[0]!.shortName;

export const MOCK_PHARMACIST = {
  name: 'Pharm. Adaeze',
  role: 'Pharmacist',
  ward: `${PRIMARY_LOCATION} Pharmacy`,
  weekLabel: `${fmtDateLabel(WEEK_START)} – ${fmtDateLabel(WEEK_END)}, ${WEEK_END.getFullYear()}`,
};

export const MOCK_ACTIVE_SHIFT: ActiveShift = {
  type: 'morning',
  label: 'Morning Shift',
  startTime: '07:00',
  endTime: '15:00',
  location: `${PRIMARY_LOCATION} Pharmacy, Dispensing Counter`,
  dateLabel: fmtFullDate(TODAY),
  status: 'acknowledged',
  progressPercent: 55,
  remainingLabel: '~3.5h remaining',
};

// Mon..Sun cycling pattern, same shape as Nursing's own week — day names and
// dates are the real current week, not hardcoded.
const WEEK_PATTERN: {
  shift: ShiftType;
  label?: string;
  range?: string;
  status?: 'acknowledged' | 'pending';
}[] = [
  { shift: 'morning', label: 'Morning', range: '07:00–15:00', status: 'acknowledged' },
  { shift: 'afternoon', label: 'Afternoon', range: '15:00–23:00', status: 'acknowledged' },
  { shift: 'off-day' },
  { shift: 'morning', label: 'Morning', range: '07:00–15:00', status: 'acknowledged' },
  { shift: 'on-call', label: 'On-Call', range: '23:00–07:00', status: 'pending' },
  { shift: 'off-day' },
  { shift: 'night', label: 'Night', range: '23:00–07:00', status: 'pending' },
];

export const MOCK_WEEK_DAYS: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(WEEK_START);
  d.setDate(WEEK_START.getDate() + i);
  const spec = WEEK_PATTERN[i]!;
  const isToday = d.toDateString() === TODAY.toDateString();
  return {
    dayName: fmtDayName(d),
    dateLabel: fmtDateLabel(d),
    isToday,
    shift: spec.shift,
    ...(spec.label ? { shiftLabel: spec.label } : {}),
    ...(spec.range ? { timeRange: spec.range } : {}),
    ...(spec.status ? { status: spec.status } : {}),
  };
});

const UPCOMING_PATTERN: {
  shift: ShiftType;
  range: string;
  note?: string;
  location: string | null;
  status: 'confirmed' | 'pending' | 'off-day';
  requiresAction: boolean;
}[] = [
  {
    shift: 'afternoon',
    range: '15:00–23:00',
    location: `${PRIMARY_LOCATION} Pharmacy`,
    status: 'confirmed',
    requiresAction: false,
  },
  { shift: 'off-day', range: 'Full Day', location: null, status: 'off-day', requiresAction: false },
  {
    shift: 'morning',
    range: '07:00–15:00',
    location: `${PRIMARY_LOCATION} Pharmacy`,
    status: 'confirmed',
    requiresAction: false,
  },
  {
    shift: 'on-call',
    range: '23:00–07:00',
    note: '(+1)',
    location: `${PRIMARY_LOCATION} Pharmacy / Float Cover`,
    status: 'pending',
    requiresAction: true,
  },
  { shift: 'off-day', range: 'Full Day', location: null, status: 'off-day', requiresAction: false },
  {
    shift: 'night',
    range: '23:00–07:00',
    note: '(+1)',
    location: `${PRIMARY_LOCATION} Pharmacy`,
    status: 'pending',
    requiresAction: true,
  },
  {
    shift: 'morning',
    range: '07:00–15:00',
    location: `${PRIMARY_LOCATION} Pharmacy`,
    status: 'pending',
    requiresAction: true,
  },
];

export const MOCK_UPCOMING_SHIFTS: UpcomingShift[] = UPCOMING_PATTERN.map((spec, i) => {
  const d = new Date(TODAY);
  d.setDate(TODAY.getDate() + i + 1);
  return {
    id: `u${i + 1}`,
    dayLabel: fmtDayComma(d),
    type: spec.shift,
    timeRange: spec.range,
    ...(spec.note ? { timeNote: spec.note } : {}),
    location: spec.location,
    status: spec.status,
    requiresAction: spec.requiresAction,
  };
});

const onCallDay = MOCK_UPCOMING_SHIFTS.find((s) => s.type === 'on-call');

export const MOCK_CAMPUS_COVERAGE: CampusCoverageEntry[] = [
  {
    id: 'cc1',
    initials: 'PV',
    name: 'Pharm. Victoria',
    subtitleLabel: 'Today (Afternoon)',
    timeRange: '15:00 – 23:00',
    isNow: true,
    isYou: false,
    avatarColor: '#1A3D4D',
  },
  {
    id: 'cc2',
    initials: 'PJ',
    name: 'Pharm. John',
    subtitleLabel: 'Tonight',
    timeRange: '23:00 – 07:00',
    isNow: false,
    isYou: false,
    avatarColor: '#4A7080',
  },
  {
    id: 'cc3',
    initials: 'PA',
    name: 'Pharm. Adaeze',
    subtitleLabel: onCallDay?.dayLabel ?? 'This Week',
    timeRange: '23:00 – 07:00',
    isNow: false,
    isYou: true,
    avatarColor: '#F59E0B',
  },
  {
    id: 'cc4',
    initials: 'PG',
    name: 'Pharm. Grace',
    subtitleLabel: 'Next On-Call',
    timeRange: '23:00 – 07:00',
    isNow: false,
    isYou: false,
    avatarColor: '#6B7280',
  },
];

export const MOCK_MONTH_STATS: MonthStat[] = [
  { count: 9, label: 'Morning Shifts', color: '#F97316', bg: '#FFF7ED' },
  { count: 7, label: 'Afternoon Shifts', color: '#00B4D8', bg: '#F0F9FF' },
  { count: 4, label: 'Night Shifts', color: '#8B5CF6', bg: '#F5F3FF' },
  { count: 2, label: 'On-Call Duties', color: '#EF4444', bg: '#FFF1F2' },
];
