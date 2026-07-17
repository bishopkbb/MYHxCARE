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

export const DEPARTMENT_OPTIONS = Array.from(new Set(MOCK_ROSTER.map((s) => s.department))).sort();

// ── Shift templates ────────────────────────────────────────────────────────────

export type TemplateSlotRequirement = {
  slot: CalendarSlot;
  role: string;
  count: number;
};

export type ShiftTemplate = {
  id: string;
  name: string;
  description: string;
  department: string;
  slots: TemplateSlotRequirement[];
  active: boolean;
  timesUsed: number;
  lastUsed: string | null;
};

export const MOCK_SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Standard Weekday — General OPD',
    description: 'Default Mon–Fri coverage for the general outpatient department.',
    department: 'General Practice',
    slots: [
      { slot: 'MORNING', role: 'GP', count: 3 },
      { slot: 'AFTERNOON', role: 'GP', count: 2 },
    ],
    active: true,
    timesUsed: 42,
    lastUsed: 'Jul 14, 2026',
  },
  {
    id: 'tpl-002',
    name: 'Weekend Emergency Coverage',
    description: '24-hour emergency department staffing for Saturday and Sunday.',
    department: 'Emergency Medicine',
    slots: [
      { slot: 'MORNING', role: 'Emergency', count: 2 },
      { slot: 'AFTERNOON', role: 'Emergency', count: 2 },
      { slot: 'NIGHT', role: 'Emergency', count: 2 },
      { slot: 'ON_CALL', role: 'Consultant', count: 1 },
    ],
    active: true,
    timesUsed: 26,
    lastUsed: 'Jul 13, 2026',
  },
  {
    id: 'tpl-003',
    name: 'ICU Night Rotation',
    description: 'Overnight critical-care staffing with anaesthetist backup.',
    department: 'Anaesthesia',
    slots: [
      { slot: 'NIGHT', role: 'Anaesthetist', count: 2 },
      { slot: 'ON_CALL', role: 'Consultant', count: 1 },
    ],
    active: true,
    timesUsed: 18,
    lastUsed: 'Jul 10, 2026',
  },
  {
    id: 'tpl-004',
    name: 'Surgical Ward Standard',
    description: 'Weekday surgical ward rounds and theatre coverage.',
    department: 'Surgery',
    slots: [
      { slot: 'MORNING', role: 'Surgeon', count: 2 },
      { slot: 'AFTERNOON', role: 'Surgeon', count: 1 },
      { slot: 'NIGHT', role: 'Surgeon', count: 1 },
    ],
    active: true,
    timesUsed: 31,
    lastUsed: 'Jul 15, 2026',
  },
  {
    id: 'tpl-005',
    name: 'Paediatrics Weekday',
    description: 'Standard weekday paediatric ward and outpatient staffing.',
    department: 'Paediatrics',
    slots: [
      { slot: 'MORNING', role: 'Pediatrician', count: 2 },
      { slot: 'AFTERNOON', role: 'Pediatrician', count: 1 },
    ],
    active: true,
    timesUsed: 37,
    lastUsed: 'Jul 16, 2026',
  },
  {
    id: 'tpl-006',
    name: 'Maternity 24/7 Coverage',
    description: 'Round-the-clock obstetric and delivery-suite staffing.',
    department: 'Obs & Gynaecology',
    slots: [
      { slot: 'MORNING', role: 'Obstetrician', count: 1 },
      { slot: 'AFTERNOON', role: 'Obstetrician', count: 1 },
      { slot: 'NIGHT', role: 'Obstetrician', count: 1 },
      { slot: 'ON_CALL', role: 'Consultant', count: 1 },
    ],
    active: true,
    timesUsed: 29,
    lastUsed: 'Jul 12, 2026',
  },
  {
    id: 'tpl-007',
    name: 'Radiology Weekday',
    description: 'Imaging and diagnostics coverage, Mon–Fri.',
    department: 'Radiology',
    slots: [{ slot: 'MORNING', role: 'Radiologist', count: 1 }],
    active: false,
    timesUsed: 9,
    lastUsed: 'Jun 28, 2026',
  },
  {
    id: 'tpl-008',
    name: 'Psychiatry Standard',
    description: 'Weekday outpatient and inpatient psychiatric coverage.',
    department: 'Psychiatry',
    slots: [
      { slot: 'MORNING', role: 'Psychiatrist', count: 1 },
      { slot: 'AFTERNOON', role: 'Psychiatrist', count: 1 },
    ],
    active: true,
    timesUsed: 15,
    lastUsed: 'Jul 9, 2026',
  },
];

// ── On-call ───────────────────────────────────────────────────────────────────

export type OnCallLevel = 'PRIMARY' | 'SECONDARY' | 'CONSULTANT';

export const ON_CALL_LEVEL_META: Record<OnCallLevel, { label: string; color: string }> = {
  PRIMARY: { label: 'Primary', color: '#00B4D8' },
  SECONDARY: { label: 'Secondary', color: '#8B5CF6' },
  CONSULTANT: { label: 'Consultant Backup', color: '#F59E0B' },
};

export type OnCallDoctorStatus = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';

export const ON_CALL_STATUS_META: Record<
  OnCallDoctorStatus,
  { label: string; color: string; border: string; bg: string }
> = {
  AVAILABLE: {
    label: 'Available',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  BUSY: {
    label: 'Busy',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.40)',
    bg: 'rgba(245,158,11,0.06)',
  },
  UNAVAILABLE: {
    label: 'Unavailable',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
};

export type OnCallAssignment = {
  id: string;
  department: string;
  level: OnCallLevel;
  doctorName: string;
  initials: string;
  avatarBg: string;
  phone: string;
  status: OnCallDoctorStatus;
  since: string;
  until: string;
};

export const TODAY_ON_CALL: OnCallAssignment[] = [
  {
    id: 'oc-001',
    department: 'Emergency Medicine',
    level: 'PRIMARY',
    doctorName: 'Dr. Samuel Ade',
    initials: 'SA',
    avatarBg: '#EF4444',
    phone: '+234 803 111 2222',
    status: 'AVAILABLE',
    since: '08:00 AM Today',
    until: '08:00 AM Tomorrow',
  },
  {
    id: 'oc-002',
    department: 'Emergency Medicine',
    level: 'SECONDARY',
    doctorName: 'Dr. Chukwuemeka Nwosu',
    initials: 'CN',
    avatarBg: '#3B82F6',
    phone: '+234 803 222 3333',
    status: 'AVAILABLE',
    since: '08:00 AM Today',
    until: '08:00 AM Tomorrow',
  },
  {
    id: 'oc-003',
    department: 'Emergency Medicine',
    level: 'CONSULTANT',
    doctorName: 'Dr. Obiora Nnamdi',
    initials: 'ON',
    avatarBg: '#8B5CF6',
    phone: '+234 803 333 4444',
    status: 'BUSY',
    since: '08:00 AM Today',
    until: '08:00 AM Tomorrow',
  },
  {
    id: 'oc-004',
    department: 'Surgery',
    level: 'PRIMARY',
    doctorName: 'Dr. Femi Balogun',
    initials: 'FB',
    avatarBg: '#22C55E',
    phone: '+234 803 444 5555',
    status: 'AVAILABLE',
    since: '08:00 AM Today',
    until: '08:00 AM Tomorrow',
  },
  {
    id: 'oc-005',
    department: 'Surgery',
    level: 'CONSULTANT',
    doctorName: 'Dr. Emmanuel Umeh',
    initials: 'EU',
    avatarBg: '#F59E0B',
    phone: '+234 803 555 6666',
    status: 'AVAILABLE',
    since: '08:00 AM Today',
    until: '08:00 AM Tomorrow',
  },
  {
    id: 'oc-006',
    department: 'Obs & Gynaecology',
    level: 'PRIMARY',
    doctorName: 'Dr. Blessing Obi',
    initials: 'BO',
    avatarBg: '#EC4899',
    phone: '+234 803 666 7777',
    status: 'UNAVAILABLE',
    since: '08:00 AM Today',
    until: '08:00 AM Tomorrow',
  },
  {
    id: 'oc-007',
    department: 'Anaesthesia',
    level: 'PRIMARY',
    doctorName: 'Dr. Ibrahim Musa',
    initials: 'IM',
    avatarBg: '#00B4D8',
    phone: '+234 803 777 8888',
    status: 'AVAILABLE',
    since: '08:00 AM Today',
    until: '08:00 AM Tomorrow',
  },
  {
    id: 'oc-008',
    department: 'Paediatrics',
    level: 'PRIMARY',
    doctorName: 'Dr. Ngozi Adeyemi',
    initials: 'NA',
    avatarBg: '#8B5CF6',
    phone: '+234 803 888 9999',
    status: 'AVAILABLE',
    since: '08:00 AM Today',
    until: '08:00 AM Tomorrow',
  },
];

export type OnCallScheduleEntry = {
  id: string;
  date: string;
  department: string;
  doctorName: string;
  initials: string;
  avatarBg: string;
  level: OnCallLevel;
};

const ON_CALL_ROTATION: {
  department: string;
  doctorName: string;
  initials: string;
  avatarBg: string;
}[] = [
  {
    department: 'Emergency Medicine',
    doctorName: 'Dr. Samuel Ade',
    initials: 'SA',
    avatarBg: '#EF4444',
  },
  {
    department: 'Emergency Medicine',
    doctorName: 'Dr. Chukwuemeka Nwosu',
    initials: 'CN',
    avatarBg: '#3B82F6',
  },
  { department: 'Surgery', doctorName: 'Dr. Femi Balogun', initials: 'FB', avatarBg: '#22C55E' },
  {
    department: 'Obs & Gynaecology',
    doctorName: 'Dr. Blessing Obi',
    initials: 'BO',
    avatarBg: '#EC4899',
  },
  {
    department: 'Anaesthesia',
    doctorName: 'Dr. Ibrahim Musa',
    initials: 'IM',
    avatarBg: '#00B4D8',
  },
  {
    department: 'Paediatrics',
    doctorName: 'Dr. Ngozi Adeyemi',
    initials: 'NA',
    avatarBg: '#8B5CF6',
  },
];

const ON_CALL_DATES = [
  'Mon, Jul 13',
  'Tue, Jul 14',
  'Wed, Jul 15',
  'Thu, Jul 16',
  'Fri, Jul 17',
  'Sat, Jul 18',
  'Sun, Jul 19',
];

export const ON_CALL_SCHEDULE: OnCallScheduleEntry[] = ON_CALL_DATES.flatMap((date, dayIdx) =>
  ON_CALL_ROTATION.map((rot, rotIdx) => ({
    id: `ocs-${dayIdx}-${rotIdx}`,
    date,
    department: rot.department,
    doctorName: rot.doctorName,
    initials: rot.initials,
    avatarBg: rot.avatarBg,
    level: (['PRIMARY', 'SECONDARY', 'CONSULTANT'] as const)[(dayIdx + rotIdx) % 3]!,
  })),
);

// ── Assignments ───────────────────────────────────────────────────────────────

export type AssignmentStatus = 'ASSIGNED' | 'UNASSIGNED' | 'ON_LEAVE';

export const ASSIGNMENT_STATUS_META: Record<
  AssignmentStatus,
  { label: string; color: string; border: string; bg: string }
> = {
  ASSIGNED: {
    label: 'Assigned',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  UNASSIGNED: {
    label: 'Unassigned',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.40)',
    bg: 'rgba(245,158,11,0.06)',
  },
  ON_LEAVE: {
    label: 'On Leave',
    color: '#6B7280',
    border: 'rgba(107,114,128,0.40)',
    bg: 'transparent',
  },
};

export type AssignableDoctor = {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  role: string;
  department: string;
  currentWard: string | null;
  status: AssignmentStatus;
};

const uniqueDoctors = new Map<string, DoctorShift>();
for (const s of MOCK_ROSTER)
  if (!uniqueDoctors.has(s.doctorName)) uniqueDoctors.set(s.doctorName, s);

export const DOCTOR_POOL: AssignableDoctor[] = [
  ...Array.from(uniqueDoctors.values()).map((s, i): AssignableDoctor => ({
    id: `doc-${String(i + 1).padStart(3, '0')}`,
    name: s.doctorName,
    initials: s.initials,
    avatarBg: s.avatarBg,
    role: s.role,
    department: s.department,
    currentWard: s.ward,
    status: 'ASSIGNED',
  })),
  {
    id: 'doc-unassigned-1',
    name: 'Dr. Grace Eze',
    initials: 'GE',
    avatarBg: '#F59E0B',
    role: 'GP',
    department: 'General Practice',
    currentWard: null,
    status: 'UNASSIGNED',
  },
  {
    id: 'doc-unassigned-2',
    name: 'Dr. Yusuf Danladi',
    initials: 'YD',
    avatarBg: '#3B82F6',
    role: 'Emergency',
    department: 'Emergency Medicine',
    currentWard: null,
    status: 'UNASSIGNED',
  },
  {
    id: 'doc-onleave-1',
    name: 'Dr. Patience Umeh',
    initials: 'PU',
    avatarBg: '#6B7280',
    role: 'Pediatrician',
    department: 'Paediatrics',
    currentWard: null,
    status: 'ON_LEAVE',
  },
];

export type HandoffRecord = {
  id: string;
  ward: string;
  outgoingDoctor: string;
  incomingDoctor: string;
  timestamp: string;
  notes: string;
};

export const HANDOFF_LOG: HandoffRecord[] = [
  {
    id: 'ho-001',
    ward: 'Emergency',
    outgoingDoctor: 'Dr. Samuel Ade',
    incomingDoctor: 'Dr. Chukwuemeka Nwosu',
    timestamp: 'Jul 17, 2026 · 08:00 AM',
    notes: '2 patients under observation, bed 4 awaiting lab results.',
  },
  {
    id: 'ho-002',
    ward: 'Surgical Ward',
    outgoingDoctor: 'Dr. Femi Balogun',
    incomingDoctor: 'Dr. Emmanuel Umeh',
    timestamp: 'Jul 16, 2026 · 08:00 PM',
    notes: 'Post-op patient in bed 2 stable, next dressing change due 06:00.',
  },
  {
    id: 'ho-003',
    ward: 'Maternity Ward',
    outgoingDoctor: 'Dr. Blessing Obi',
    incomingDoctor: 'Dr. Ijeoma Nwachukwu',
    timestamp: 'Jul 16, 2026 · 04:00 PM',
    notes: 'One delivery in progress, no complications noted.',
  },
];

// ── Analytics ─────────────────────────────────────────────────────────────────

export type AnalyticsPeriod = 'this-week' | 'this-month' | 'this-quarter';

export const ANALYTICS_PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'this-quarter', label: 'This Quarter' },
];

export type WorkforceAnalyticsSummary = {
  avgUtilizationPercent: number;
  totalOvertimeHours: number;
  avgCoveragePercent: number;
  activeDoctors: number;
};

export const WORKFORCE_ANALYTICS_SUMMARY: Record<AnalyticsPeriod, WorkforceAnalyticsSummary> = {
  'this-week': {
    avgUtilizationPercent: 87,
    totalOvertimeHours: 34,
    avgCoveragePercent: 96,
    activeDoctors: 24,
  },
  'this-month': {
    avgUtilizationPercent: 84,
    totalOvertimeHours: 142,
    avgCoveragePercent: 94,
    activeDoctors: 28,
  },
  'this-quarter': {
    avgUtilizationPercent: 81,
    totalOvertimeHours: 398,
    avgCoveragePercent: 92,
    activeDoctors: 31,
  },
};

export const UTILIZATION_TREND: Record<AnalyticsPeriod, { label: string; percent: number }[]> = {
  'this-week': [
    { label: 'Mon', percent: 82 },
    { label: 'Tue', percent: 88 },
    { label: 'Wed', percent: 91 },
    { label: 'Thu', percent: 85 },
    { label: 'Fri', percent: 90 },
    { label: 'Sat', percent: 78 },
    { label: 'Sun', percent: 74 },
  ],
  'this-month': [
    { label: 'Wk 1', percent: 83 },
    { label: 'Wk 2', percent: 86 },
    { label: 'Wk 3', percent: 81 },
    { label: 'Wk 4', percent: 88 },
  ],
  'this-quarter': [
    { label: 'Apr', percent: 79 },
    { label: 'May', percent: 82 },
    { label: 'Jun', percent: 80 },
    { label: 'Jul', percent: 84 },
  ],
};

export const DEPARTMENT_COVERAGE: Record<
  AnalyticsPeriod,
  { label: string; value: number; color: string }[]
> = {
  'this-week': [
    { label: 'General Practice', value: 28, color: '#00B4D8' },
    { label: 'Emergency', value: 22, color: '#EF4444' },
    { label: 'Surgery', value: 16, color: '#8B5CF6' },
    { label: 'Paediatrics', value: 14, color: '#3B82F6' },
    { label: 'Other', value: 20, color: '#F59E0B' },
  ],
  'this-month': [
    { label: 'General Practice', value: 26, color: '#00B4D8' },
    { label: 'Emergency', value: 24, color: '#EF4444' },
    { label: 'Surgery', value: 18, color: '#8B5CF6' },
    { label: 'Paediatrics', value: 15, color: '#3B82F6' },
    { label: 'Other', value: 17, color: '#F59E0B' },
  ],
  'this-quarter': [
    { label: 'General Practice', value: 25, color: '#00B4D8' },
    { label: 'Emergency', value: 25, color: '#EF4444' },
    { label: 'Surgery', value: 19, color: '#8B5CF6' },
    { label: 'Paediatrics', value: 16, color: '#3B82F6' },
    { label: 'Other', value: 15, color: '#F59E0B' },
  ],
};

export type OvertimeEntry = {
  id: string;
  doctorName: string;
  initials: string;
  avatarBg: string;
  department: string;
  overtimeHours: number;
  shiftsCount: number;
};

export const OVERTIME_TRACKING: Record<AnalyticsPeriod, OvertimeEntry[]> = {
  'this-week': [
    {
      id: 'ot-1',
      doctorName: 'Dr. Samuel Ade',
      initials: 'SA',
      avatarBg: '#EF4444',
      department: 'Emergency Medicine',
      overtimeHours: 9,
      shiftsCount: 2,
    },
    {
      id: 'ot-2',
      doctorName: 'Dr. Michael Obi',
      initials: 'MO',
      avatarBg: '#22C55E',
      department: 'Internal Medicine',
      overtimeHours: 6,
      shiftsCount: 1,
    },
    {
      id: 'ot-3',
      doctorName: 'Dr. Emmanuel Umeh',
      initials: 'EU',
      avatarBg: '#8B5CF6',
      department: 'Surgery',
      overtimeHours: 5,
      shiftsCount: 1,
    },
    {
      id: 'ot-4',
      doctorName: 'Dr. Ngozi Okafor',
      initials: 'NO',
      avatarBg: '#F59E0B',
      department: 'Paediatrics',
      overtimeHours: 4,
      shiftsCount: 1,
    },
  ],
  'this-month': [
    {
      id: 'ot-1',
      doctorName: 'Dr. Samuel Ade',
      initials: 'SA',
      avatarBg: '#EF4444',
      department: 'Emergency Medicine',
      overtimeHours: 32,
      shiftsCount: 7,
    },
    {
      id: 'ot-2',
      doctorName: 'Dr. Femi Balogun',
      initials: 'FB',
      avatarBg: '#22C55E',
      department: 'Surgery',
      overtimeHours: 27,
      shiftsCount: 6,
    },
    {
      id: 'ot-3',
      doctorName: 'Dr. Michael Obi',
      initials: 'MO',
      avatarBg: '#3B82F6',
      department: 'Internal Medicine',
      overtimeHours: 22,
      shiftsCount: 5,
    },
    {
      id: 'ot-4',
      doctorName: 'Dr. Ibrahim Musa',
      initials: 'IM',
      avatarBg: '#8B5CF6',
      department: 'Anaesthesia',
      overtimeHours: 19,
      shiftsCount: 4,
    },
    {
      id: 'ot-5',
      doctorName: 'Dr. Blessing Obi',
      initials: 'BO',
      avatarBg: '#EC4899',
      department: 'Obs & Gynaecology',
      overtimeHours: 15,
      shiftsCount: 3,
    },
  ],
  'this-quarter': [
    {
      id: 'ot-1',
      doctorName: 'Dr. Samuel Ade',
      initials: 'SA',
      avatarBg: '#EF4444',
      department: 'Emergency Medicine',
      overtimeHours: 94,
      shiftsCount: 21,
    },
    {
      id: 'ot-2',
      doctorName: 'Dr. Femi Balogun',
      initials: 'FB',
      avatarBg: '#22C55E',
      department: 'Surgery',
      overtimeHours: 81,
      shiftsCount: 18,
    },
    {
      id: 'ot-3',
      doctorName: 'Dr. Michael Obi',
      initials: 'MO',
      avatarBg: '#3B82F6',
      department: 'Internal Medicine',
      overtimeHours: 67,
      shiftsCount: 15,
    },
    {
      id: 'ot-4',
      doctorName: 'Dr. Ibrahim Musa',
      initials: 'IM',
      avatarBg: '#8B5CF6',
      department: 'Anaesthesia',
      overtimeHours: 58,
      shiftsCount: 13,
    },
    {
      id: 'ot-5',
      doctorName: 'Dr. Blessing Obi',
      initials: 'BO',
      avatarBg: '#EC4899',
      department: 'Obs & Gynaecology',
      overtimeHours: 49,
      shiftsCount: 11,
    },
    {
      id: 'ot-6',
      doctorName: 'Dr. Chukwuemeka Nwosu',
      initials: 'CN',
      avatarBg: '#F59E0B',
      department: 'Emergency Medicine',
      overtimeHours: 49,
      shiftsCount: 11,
    },
  ],
};
