/**
 * Mock fixtures for the nurse-scoped My Schedule page.
 * Replace with real API data in Phase 6 integration.
 */

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

export type WardCoverageEntry = {
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

export const MOCK_NURSE = {
  name: 'Nurse Chidinma Eze',
  role: 'Staff Nurse',
  ward: 'Male Medical Ward',
  weekLabel: 'Jun 30 – Jul 6, 2026',
};

export const MOCK_ACTIVE_SHIFT: ActiveShift = {
  type: 'morning',
  label: 'Morning Shift',
  startTime: '07:00',
  endTime: '15:00',
  location: 'Male Medical Ward, Beds 1–18',
  dateLabel: 'Monday, June 30, 2026',
  status: 'acknowledged',
  progressPercent: 60,
  remainingLabel: '~3.2h remaining',
};

export const MOCK_WEEK_DAYS: WeekDay[] = [
  {
    dayName: 'Mon',
    dateLabel: 'Jun 30',
    isToday: true,
    shift: 'morning',
    shiftLabel: 'Morning',
    timeRange: '07:00–15:00',
    status: 'acknowledged',
  },
  {
    dayName: 'Tue',
    dateLabel: 'Jul 1',
    isToday: false,
    shift: 'afternoon',
    shiftLabel: 'Afternoon',
    timeRange: '15:00–23:00',
    status: 'acknowledged',
  },
  { dayName: 'Wed', dateLabel: 'Jul 2', isToday: false, shift: 'off-day' },
  {
    dayName: 'Thu',
    dateLabel: 'Jul 3',
    isToday: false,
    shift: 'morning',
    shiftLabel: 'Morning',
    timeRange: '07:00–15:00',
    status: 'acknowledged',
  },
  {
    dayName: 'Fri',
    dateLabel: 'Jul 4',
    isToday: false,
    shift: 'on-call',
    shiftLabel: 'On-Call',
    timeRange: '23:00–07:00',
    status: 'pending',
  },
  { dayName: 'Sat', dateLabel: 'Jul 5', isToday: false, shift: 'off-day' },
  { dayName: 'Sun', dateLabel: 'Jul 6', isToday: false, shift: 'night' },
];

export const MOCK_UPCOMING_SHIFTS: UpcomingShift[] = [
  {
    id: 'u1',
    dayLabel: 'Tue, Jul 1',
    type: 'afternoon',
    timeRange: '15:00–23:00',
    location: 'Male Medical Ward, Beds 1–18',
    status: 'confirmed',
    requiresAction: false,
  },
  {
    id: 'u2',
    dayLabel: 'Wed, Jul 2',
    type: 'off-day',
    timeRange: 'Full Day',
    location: null,
    status: 'off-day',
    requiresAction: false,
  },
  {
    id: 'u3',
    dayLabel: 'Thu, Jul 3',
    type: 'morning',
    timeRange: '07:00–15:00',
    location: 'Male Medical Ward, Beds 1–18',
    status: 'confirmed',
    requiresAction: false,
  },
  {
    id: 'u4',
    dayLabel: 'Fri, Jul 4',
    type: 'on-call',
    timeRange: '23:00–07:00',
    timeNote: '(+1)',
    location: 'Male Medical Ward / Float Cover',
    status: 'pending',
    requiresAction: true,
  },
  {
    id: 'u5',
    dayLabel: 'Sat, Jul 5',
    type: 'off-day',
    timeRange: 'Full Day',
    location: null,
    status: 'off-day',
    requiresAction: false,
  },
  {
    id: 'u6',
    dayLabel: 'Sun, Jul 6',
    type: 'night',
    timeRange: '23:00–07:00',
    timeNote: '(+1)',
    location: 'Male Medical Ward, Beds 1–18',
    status: 'pending',
    requiresAction: true,
  },
  {
    id: 'u7',
    dayLabel: 'Mon, Jul 7',
    type: 'morning',
    timeRange: '07:00–15:00',
    location: 'Male Medical Ward, Beds 1–18',
    status: 'pending',
    requiresAction: true,
  },
];

export const MOCK_WARD_COVERAGE: WardCoverageEntry[] = [
  {
    id: 'wc1',
    initials: 'IB',
    name: 'Nurse Ibrahim B.',
    subtitleLabel: 'Today (Afternoon)',
    timeRange: '15:00 – 23:00',
    isNow: true,
    isYou: false,
    avatarColor: '#1A3D4D',
  },
  {
    id: 'wc2',
    initials: 'AY',
    name: 'Nurse Amaka Yusuf',
    subtitleLabel: 'Tonight',
    timeRange: '23:00 – 07:00',
    isNow: false,
    isYou: false,
    avatarColor: '#4A7080',
  },
  {
    id: 'wc3',
    initials: 'CE',
    name: 'Nurse Chidinma Eze',
    subtitleLabel: 'Fri, Jul 4',
    timeRange: '23:00 – 07:00',
    isNow: false,
    isYou: true,
    avatarColor: '#F59E0B',
  },
  {
    id: 'wc4',
    initials: 'NA',
    name: 'Nurse Ngozi Asogwa',
    subtitleLabel: 'Sat, Jul 5',
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
