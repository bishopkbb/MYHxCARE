/**
 * Mock fixtures for the Nursing Workforce Management screen (Matron-only).
 * Swap out by pointing hooks to a real staffing/roster endpoint in Phase 6.
 */

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ON_CALL' | 'EMERGENCY';
export type ShiftStatus = 'ON_DUTY' | 'SCHEDULED' | 'ON_CALL' | 'COMPLETED';

export const WARD_OPTIONS = [
  'Female Ward',
  'Male Ward',
  'ICU',
  'Maternity Ward',
  'Pediatric Ward',
].map((w) => ({ value: w, label: w }));

export const SHIFT_TYPE_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'ON_CALL', label: 'On-Call' },
  { value: 'EMERGENCY', label: 'Emergency' },
];

export const STATUS_OPTIONS: { value: ShiftStatus; label: string }[] = [
  { value: 'ON_DUTY', label: 'On Duty' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ON_CALL', label: 'On-Call' },
  { value: 'COMPLETED', label: 'Completed' },
];

export const ROLE_OPTIONS = [
  'Staff Nurse',
  'Senior Nurse',
  'Charge Nurse',
  'ICU Nurse',
  'Maternity Nurse',
  'Pediatric Nurse',
].map((r) => ({ value: r, label: r }));

export type NurseShift = {
  id: string;
  staffName: string;
  initials: string;
  avatarBg: string;
  role: string;
  ward: string;
  shiftType: ShiftType;
  timeRange: string;
  status: ShiftStatus;
  acknowledged: boolean;
};

const SHIFT_TIME_RANGE: Record<ShiftType, string> = {
  MORNING: '07:00 - 15:00',
  AFTERNOON: '15:00 - 23:00',
  NIGHT: '23:00 - 07:00',
  ON_CALL: '00:00 - 23:59',
  EMERGENCY: '07:00 - 19:00',
};

const GEN_FIRST_NAMES = [
  'Chinyere',
  'Nkechi',
  'Amarachi',
  'Chiamaka',
  'Ifunanya',
  'Somtochukwu',
  'Ebele',
  'Uzoamaka',
  'Adanna',
  'Chiedozie',
  'Ogechi',
  'Nonso',
];
const GEN_LAST_NAMES = [
  'Anyanwu',
  'Ibekwe',
  'Okoli',
  'Nwoke',
  'Chukwuma',
  'Eneh',
  'Uba',
  'Anozie',
  'Igwe',
  'Madu',
  'Obiora',
  'Nnamdi',
];
const GEN_WARDS = ['Female Ward', 'Male Ward', 'ICU', 'Maternity Ward', 'Pediatric Ward'];
const WARD_ROLE: Record<string, string[]> = {
  'Female Ward': ['Staff Nurse', 'Senior Nurse'],
  'Male Ward': ['Staff Nurse', 'Senior Nurse'],
  ICU: ['ICU Nurse', 'Charge Nurse'],
  'Maternity Ward': ['Maternity Nurse', 'Senior Nurse'],
  'Pediatric Ward': ['Pediatric Nurse', 'Staff Nurse'],
};
const GEN_SHIFT_TYPES: ShiftType[] = ['MORNING', 'AFTERNOON', 'NIGHT', 'MORNING', 'ON_CALL'];
const GEN_STATUS: ShiftStatus[] = [
  'ON_DUTY',
  'SCHEDULED',
  'SCHEDULED',
  'ON_DUTY',
  'COMPLETED',
  'SCHEDULED',
  'ON_CALL',
];
const GEN_AVATAR_BG = ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#00B4D8', '#EC4899'];

export const MOCK_NURSE_ROSTER: NurseShift[] = Array.from({ length: 22 }, (_, i) => {
  const firstName = GEN_FIRST_NAMES[i % GEN_FIRST_NAMES.length] as string;
  const lastName = GEN_LAST_NAMES[(i * 5) % GEN_LAST_NAMES.length] as string;
  const ward = GEN_WARDS[i % GEN_WARDS.length] as string;
  const roles = WARD_ROLE[ward] as string[];
  const role = roles[i % roles.length] as string;
  const shiftType = GEN_SHIFT_TYPES[i % GEN_SHIFT_TYPES.length] as ShiftType;
  const status = GEN_STATUS[i % GEN_STATUS.length] as ShiftStatus;
  return {
    id: `nws-${String(i + 1).padStart(3, '0')}`,
    staffName: `${firstName} ${lastName}`,
    initials: `${firstName[0]}${lastName[0]}`,
    avatarBg: GEN_AVATAR_BG[i % GEN_AVATAR_BG.length] as string,
    role,
    ward,
    shiftType,
    timeRange: SHIFT_TIME_RANGE[shiftType],
    status,
    acknowledged: status !== 'SCHEDULED' || i % 3 !== 0,
  };
});

// ─── Stat cards ─────────────────────────────────────────────────────────────

export const WORKFORCE_STATS = {
  onDuty: MOCK_NURSE_ROSTER.filter((s) => s.status === 'ON_DUTY').length,
  todaysShifts: MOCK_NURSE_ROSTER.length,
  onCall: MOCK_NURSE_ROSTER.filter((s) => s.status === 'ON_CALL').length,
  pendingAck: MOCK_NURSE_ROSTER.filter((s) => !s.acknowledged).length,
  coveragePercent: 92,
  pendingChanges: 3,
};

// ─── Coverage overview ──────────────────────────────────────────────────────

export type CoverageMetric = { label: string; percent: number; color: string };

export const COVERAGE_OVERVIEW: CoverageMetric[] = [
  { label: 'Overall Coverage', percent: 92, color: '#00B4D8' },
  { label: 'Morning Shift', percent: 96, color: '#22C55E' },
  { label: 'Afternoon Shift', percent: 90, color: '#00B4D8' },
  { label: 'Night Shift', percent: 85, color: '#F59E0B' },
  { label: 'On-Call Coverage', percent: 100, color: '#22C55E' },
];

// ─── Pending acknowledgements ───────────────────────────────────────────────

export type PendingAcknowledgement = {
  id: string;
  staffName: string;
  initials: string;
  avatarBg: string;
  shiftLabel: string;
  day: string;
};

export const PENDING_ACKNOWLEDGEMENTS: PendingAcknowledgement[] = MOCK_NURSE_ROSTER.filter(
  (s) => !s.acknowledged,
)
  .slice(0, 5)
  .map((s) => ({
    id: s.id,
    staffName: s.staffName,
    initials: s.initials,
    avatarBg: s.avatarBg,
    shiftLabel: `${SHIFT_TYPE_OPTIONS.find((o) => o.value === s.shiftType)?.label} Shift`,
    day: 'Today',
  }));

export function nextShiftId(): string {
  return `nws-${String(MOCK_NURSE_ROSTER.length + 1).padStart(3, '0')}`;
}

export { atOffset };
