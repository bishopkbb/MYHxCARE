/**
 * Mock fixtures for the workforce management (duty roster) domain.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

export type ShiftType = 'EMERGENCY' | 'NIGHT' | 'ON_CALL' | 'MORNING' | 'AFTERNOON';

export type ShiftStatus = 'ON_DUTY' | 'SCHEDULED' | 'ON_CALL' | 'COMPLETED';

export type DoctorShift = {
  id: string;
  doctorName: string;
  initials: string;
  avatarBg: string;
  role: string;
  department: string;
  shiftType: ShiftType;
  timeRange: string;
  ward: string;
  status: ShiftStatus;
  acknowledged: boolean;
};

const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#22C55E', '#00B4D8', '#EC4899'];

function initialsOf(name: string): string {
  const parts = name.replace('Dr. ', '').split(' ');
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

function makeShift(
  id: number,
  doctorName: string,
  role: string,
  department: string,
  shiftType: ShiftType,
  timeRange: string,
  ward: string,
  status: ShiftStatus,
  acknowledged: boolean,
): DoctorShift {
  return {
    id: `shift-${String(id).padStart(3, '0')}`,
    doctorName,
    initials: initialsOf(doctorName),
    avatarBg: AVATAR_COLORS[id % AVATAR_COLORS.length]!,
    role,
    department,
    shiftType,
    timeRange,
    ward,
    status,
    acknowledged,
  };
}

export const MOCK_ROSTER: DoctorShift[] = [
  makeShift(
    1,
    'Dr. Jane Ezeonu',
    'GP',
    'General Practice',
    'EMERGENCY',
    '08:00 AM – 4:00 PM',
    'General OPD',
    'ON_DUTY',
    true,
  ),
  makeShift(
    2,
    'Dr. Ngozi Okafor',
    'Pediatrician',
    'Paediatrics',
    'NIGHT',
    '10:00 PM – 4:00 AM',
    'General OPD',
    'SCHEDULED',
    true,
  ),
  makeShift(
    3,
    'Dr. Samuel Ade',
    'Emergency',
    'Emergency Medicine',
    'ON_CALL',
    '24 Hours',
    'Emergency',
    'ON_CALL',
    true,
  ),
  makeShift(
    4,
    'Dr. Ada Chukwu',
    'GP',
    'General Practice',
    'MORNING',
    '08:00 AM – 4:00 PM',
    'Family Clinic',
    'SCHEDULED',
    false,
  ),
  makeShift(
    5,
    'Dr. Jane Ezeonu',
    'GP',
    'General Practice',
    'EMERGENCY',
    '08:00 AM – 4:00 PM',
    'General OPD',
    'ON_DUTY',
    true,
  ),
  makeShift(
    6,
    'Dr. Michael Obi',
    'Consultant',
    'Internal Medicine',
    'AFTERNOON',
    '3:00 PM – 11:00 PM',
    'General OPD',
    'SCHEDULED',
    false,
  ),
  makeShift(
    7,
    'Dr. Emmanuel Umeh',
    'Surgeon',
    'Surgery',
    'MORNING',
    '08:00 AM – 4:00 PM',
    'Surgical Ward',
    'ON_DUTY',
    true,
  ),
  makeShift(
    8,
    'Dr. Chinwe Nwachukwu',
    'Cardiologist',
    'Cardiology',
    'MORNING',
    '08:00 AM – 4:00 PM',
    'Cardiology Clinic',
    'ON_DUTY',
    true,
  ),
  makeShift(
    9,
    'Dr. Ibrahim Musa',
    'Anaesthetist',
    'Anaesthesia',
    'NIGHT',
    '10:00 PM – 4:00 AM',
    'Surgical Ward',
    'SCHEDULED',
    false,
  ),
  makeShift(
    10,
    'Dr. Babatunde Alade',
    'Radiologist',
    'Radiology',
    'AFTERNOON',
    '3:00 PM – 11:00 PM',
    'Radiology',
    'SCHEDULED',
    true,
  ),
  makeShift(
    11,
    'Dr. Chidinma Eze',
    'Psychiatrist',
    'Psychiatry',
    'MORNING',
    '08:00 AM – 4:00 PM',
    'Psychiatry Unit',
    'ON_DUTY',
    true,
  ),
  makeShift(
    12,
    'Dr. Uche Eze',
    'Orthopaedic Surgeon',
    'Orthopaedics',
    'ON_CALL',
    '24 Hours',
    'Emergency',
    'ON_CALL',
    true,
  ),
  makeShift(
    13,
    'Dr. Kemi Okafor',
    'Dermatologist',
    'Dermatology',
    'MORNING',
    '08:00 AM – 4:00 PM',
    'Family Clinic',
    'SCHEDULED',
    false,
  ),
  makeShift(
    14,
    'Dr. Nkiru Eze',
    'Neurologist',
    'Neurology',
    'AFTERNOON',
    '3:00 PM – 11:00 PM',
    'General OPD',
    'SCHEDULED',
    true,
  ),
  makeShift(
    15,
    'Dr. Blessing Obi',
    'Obstetrician',
    'Obs & Gynaecology',
    'NIGHT',
    '10:00 PM – 4:00 AM',
    'Maternity Ward',
    'SCHEDULED',
    false,
  ),
  makeShift(
    16,
    'Dr. Chidi Anyanwu',
    'Cardiologist',
    'Cardiology',
    'MORNING',
    '08:00 AM – 4:00 PM',
    'Cardiology Clinic',
    'ON_DUTY',
    true,
  ),
  makeShift(
    17,
    'Dr. Ijeoma Nwachukwu',
    'Psychiatrist',
    'Psychiatry',
    'AFTERNOON',
    '3:00 PM – 11:00 PM',
    'Psychiatry Unit',
    'SCHEDULED',
    true,
  ),
  makeShift(
    18,
    'Dr. Adaora Chukwuma',
    'Lab Scientist',
    'Laboratory',
    'MORNING',
    '08:00 AM – 4:00 PM',
    'General OPD',
    'ON_DUTY',
    true,
  ),
  makeShift(
    19,
    'Dr. Chukwuemeka Nwosu',
    'Emergency',
    'Emergency Medicine',
    'ON_CALL',
    '24 Hours',
    'Emergency',
    'ON_CALL',
    false,
  ),
  makeShift(
    20,
    'Dr. Amaka Ibe',
    'GP',
    'General Practice',
    'MORNING',
    '08:00 AM – 4:00 PM',
    'Family Clinic',
    'SCHEDULED',
    true,
  ),
  makeShift(
    21,
    'Dr. Obiora Nnamdi',
    'Consultant',
    'Internal Medicine',
    'AFTERNOON',
    '3:00 PM – 11:00 PM',
    'General OPD',
    'SCHEDULED',
    true,
  ),
  makeShift(
    22,
    'Dr. Ngozi Adeyemi',
    'Pediatrician',
    'Paediatrics',
    'MORNING',
    '08:00 AM – 4:00 PM',
    'Paediatric Ward',
    'ON_DUTY',
    true,
  ),
  makeShift(
    23,
    'Dr. Femi Balogun',
    'Surgeon',
    'Surgery',
    'NIGHT',
    '10:00 PM – 4:00 AM',
    'Surgical Ward',
    'SCHEDULED',
    false,
  ),
  makeShift(
    24,
    'Dr. Halima Bello',
    'GP',
    'General Practice',
    'EMERGENCY',
    '08:00 AM – 4:00 PM',
    'General OPD',
    'ON_DUTY',
    true,
  ),
];

export const ROLE_OPTIONS = Array.from(new Set(MOCK_ROSTER.map((s) => s.role))).sort();

export type WorkforceStats = {
  doctorsOnDuty: number;
  todaysShiftTotal: number;
  onCallDoctors: number;
  shiftsAckPending: number;
  coverageStatusPercent: number;
  shiftChangesPending: number;
};

export const WORKFORCE_STATS: WorkforceStats = {
  doctorsOnDuty: 18,
  todaysShiftTotal: 24,
  onCallDoctors: 4,
  shiftsAckPending: 6,
  coverageStatusPercent: 98,
  shiftChangesPending: 6,
};

export type CoverageMetric = {
  label: string;
  percent: number;
  color: string;
};

export const COVERAGE_OVERVIEW: CoverageMetric[] = [
  { label: 'Overall Coverage', percent: 98, color: '#22C55E' },
  { label: 'Morning Shift (07:00–15:00)', percent: 100, color: '#3B82F6' },
  { label: 'Afternoon Shift (15:00–23:00)', percent: 90, color: '#22C55E' },
  { label: 'Night Shift (23:00–07:00)', percent: 95, color: '#8B5CF6' },
  { label: 'On-Call Coverage (24 Hrs)', percent: 100, color: '#F59E0B' },
];

export type PendingAcknowledgement = {
  id: string;
  doctorName: string;
  initials: string;
  avatarBg: string;
  shiftLabel: string;
  day: string;
};

export const PENDING_ACKNOWLEDGEMENTS: PendingAcknowledgement[] = [
  {
    id: 'ack-001',
    doctorName: 'Dr. Michael Obi',
    initials: 'MO',
    avatarBg: '#22C55E',
    shiftLabel: 'Afternoon Shift',
    day: 'Today',
  },
  {
    id: 'ack-002',
    doctorName: 'Dr. Ada Chukwu',
    initials: 'AC',
    avatarBg: '#EF4444',
    shiftLabel: 'Night Shift',
    day: 'Today',
  },
  {
    id: 'ack-003',
    doctorName: 'Dr. Emmanuel Umeh',
    initials: 'EU',
    avatarBg: '#8B5CF6',
    shiftLabel: 'Morning Shift',
    day: 'Today',
  },
  {
    id: 'ack-004',
    doctorName: 'Dr. Ibrahim Musa',
    initials: 'IM',
    avatarBg: '#3B82F6',
    shiftLabel: 'Night Shift',
    day: 'Tomorrow',
  },
  {
    id: 'ack-005',
    doctorName: 'Dr. Chinwe Nwachukwu',
    initials: 'CN',
    avatarBg: '#F59E0B',
    shiftLabel: 'Morning Shift',
    day: 'Tomorrow',
  },
  {
    id: 'ack-006',
    doctorName: 'Dr. Babatunde Alade',
    initials: 'BA',
    avatarBg: '#00B4D8',
    shiftLabel: 'Afternoon Shift',
    day: 'Tomorrow',
  },
];

// ── Shift calendar ────────────────────────────────────────────────────────────

export type CalendarSlot = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ON_CALL';

export const CALENDAR_SLOT_META: Record<
  CalendarSlot,
  { label: string; time: string; color: string; border: string; bg: string }
> = {
  MORNING: {
    label: 'Morning',
    time: '07:00–15:00',
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.35)',
    bg: 'rgba(59,130,246,0.06)',
  },
  AFTERNOON: {
    label: 'Afternoon',
    time: '15:00–23:00',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.06)',
  },
  NIGHT: {
    label: 'Night',
    time: '23:00–07:00',
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.35)',
    bg: 'rgba(139,92,246,0.06)',
  },
  ON_CALL: {
    label: 'On-Call',
    time: '24 Hrs',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.06)',
  },
};

// Rotating doctor pools per slot — deterministic by absolute day index, so
// navigating weeks forward/backward always yields a stable, varied roster
// rather than random or unset cells.
const CALENDAR_DOCTOR_POOLS: Record<CalendarSlot, string[]> = {
  MORNING: ['Dr. Jane E.', 'Dr. Michael O.', 'Dr. Ada C.'],
  AFTERNOON: ['Dr. Michael O.', 'Dr. Chinedu A.', 'Dr. Jane E.'],
  NIGHT: ['Dr. Ngozi O.', 'Dr. Samuel A.'],
  ON_CALL: ['Dr. Samuel A.', 'Dr. Chinedu A.', 'Dr. Emmanuel U.'],
};

export function getCalendarAssignment(slot: CalendarSlot, dayIndexAbsolute: number): string {
  const pool = CALENDAR_DOCTOR_POOLS[slot];
  const idx = ((dayIndexAbsolute % pool.length) + pool.length) % pool.length;
  return pool[idx]!;
}
