/**
 * Mock fixtures for the My Schedule page.
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

export type OnCallEntry = {
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

export const MOCK_DOCTOR = {
  name: 'Dr. Emeka Obi',
  specialty: 'General Practice',
  weekLabel: 'Jun 30 – Jul 6, 2026',
};

export const MOCK_ACTIVE_SHIFT: ActiveShift = {
  type: 'morning',
  label: 'Morning Shift',
  startTime: '07:00',
  endTime: '13:00',
  location: 'General OPD, Block C',
  dateLabel: 'Monday, June 30, 2026',
  status: 'acknowledged',
  progressPercent: 60,
  remainingLabel: '~2.4h remaining',
};

export const MOCK_WEEK_DAYS: WeekDay[] = [
  {
    dayName: 'Mon',
    dateLabel: 'Jun 30',
    isToday: true,
    shift: 'morning',
    shiftLabel: 'Morning',
    timeRange: '07:00–13:00',
    status: 'acknowledged',
  },
  {
    dayName: 'Tue',
    dateLabel: 'Jul 1',
    isToday: false,
    shift: 'afternoon',
    shiftLabel: 'Afternoon',
    timeRange: '13:00–19:00',
    status: 'acknowledged',
  },
  { dayName: 'Wed', dateLabel: 'Jul 2', isToday: false, shift: 'off-day' },
  {
    dayName: 'Thu',
    dateLabel: 'Jul 3',
    isToday: false,
    shift: 'morning',
    shiftLabel: 'Morning',
    timeRange: '07:00–13:00',
    status: 'acknowledged',
  },
  {
    dayName: 'Fri',
    dateLabel: 'Jul 4',
    isToday: false,
    shift: 'on-call',
    shiftLabel: 'On-Call',
    timeRange: '19:00–07:00',
    status: 'pending',
  },
  { dayName: 'Sat', dateLabel: 'Jul 5', isToday: false, shift: 'off-day' },
  { dayName: 'Sun', dateLabel: 'Jul 6', isToday: false, shift: 'off-day' },
];

export const MOCK_UPCOMING_SHIFTS: UpcomingShift[] = [
  {
    id: 'u1',
    dayLabel: 'Tue, Jul 1',
    type: 'afternoon',
    timeRange: '13:00–19:00',
    location: 'General OPD, Block C',
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
    timeRange: '07:00–13:00',
    location: 'General OPD, Block C',
    status: 'confirmed',
    requiresAction: false,
  },
  {
    id: 'u4',
    dayLabel: 'Fri, Jul 4',
    type: 'on-call',
    timeRange: '19:00–07:00',
    timeNote: '(+1)',
    location: 'Emergency Department / General Cover',
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
    dayLabel: 'Mon, Jul 7',
    type: 'morning',
    timeRange: '07:00–13:00',
    location: 'General OPD, Block C',
    status: 'pending',
    requiresAction: true,
  },
  {
    id: 'u7',
    dayLabel: 'Tue, Jul 8',
    type: 'night',
    timeRange: '19:00–07:00',
    timeNote: '(+1)',
    location: 'Ward C, General Medicine',
    status: 'pending',
    requiresAction: true,
  },
];

export const MOCK_ON_CALL_ROTA: OnCallEntry[] = [
  {
    id: 'oc1',
    initials: 'AN',
    name: 'Dr. Ada Nwosu',
    subtitleLabel: 'Today (Evening)',
    timeRange: '13:00 – 19:00',
    isNow: true,
    isYou: false,
    avatarColor: '#1A3D4D',
  },
  {
    id: 'oc2',
    initials: 'CA',
    name: 'Dr. Chike Adu',
    subtitleLabel: 'Tonight',
    timeRange: '19:00 – 07:00',
    isNow: false,
    isYou: false,
    avatarColor: '#4A7080',
  },
  {
    id: 'oc3',
    initials: 'EO',
    name: 'Dr. Emeka Obi',
    subtitleLabel: 'Fri, Jul 4',
    timeRange: '19:00 – 07:00',
    isNow: false,
    isYou: true,
    avatarColor: '#F59E0B',
  },
  {
    id: 'oc4',
    initials: 'NI',
    name: 'Dr. Ngozi Ibe',
    subtitleLabel: 'Sat, Jul 5',
    timeRange: '19:00 – 07:00',
    isNow: false,
    isYou: false,
    avatarColor: '#6B7280',
  },
];

export const MOCK_MONTH_STATS: MonthStat[] = [
  { count: 8, label: 'Morning Shifts', color: '#F97316', bg: '#FFF7ED' },
  { count: 6, label: 'Afternoon Shifts', color: '#00B4D8', bg: '#F0F9FF' },
  { count: 3, label: 'Night Shifts', color: '#8B5CF6', bg: '#F5F3FF' },
  { count: 2, label: 'On-Call Duties', color: '#EF4444', bg: '#FFF1F2' },
];
