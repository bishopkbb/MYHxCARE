/**
 * Mock fixtures for the Pharmacy Workforce Management screen.
 * Mirrors nurseWorkforceFixtures.ts's shape and conventions — same
 * ShiftType/ShiftStatus union, same generator pattern — so the screen this
 * backs behaves identically to its Nursing/Registration/Medical Records
 * siblings. "Ward" here is the real pharmacy campus a shift is worked at
 * (PHARMACY_LOCATIONS), not a hospital ward.
 * Swap out by pointing hooks to a real staffing/roster endpoint in Phase 6.
 */

import { PHARMACY_LOCATIONS } from '@/constants/pharmacyLocations';

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ON_CALL' | 'EMERGENCY';
export type ShiftStatus = 'ON_DUTY' | 'SCHEDULED' | 'ON_CALL' | 'COMPLETED' | 'CANCELLED';

export const WARD_OPTIONS = PHARMACY_LOCATIONS.map((l) => ({
  value: l.shortName,
  label: l.shortName,
}));

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
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const ROLE_OPTIONS = [
  'Chief Pharmacist',
  'Senior Pharmacist',
  'Pharmacist',
  'Pharmacy Technician',
  'Pharmacy Assistant',
  'Intern Pharmacist',
].map((r) => ({ value: r, label: r }));

export type PharmacyShift = {
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

// The same informal pharmacist roster already reused across ADR Reports,
// Dispensing Report, and Queue Monitor — extended with technician/assistant
// names for the fuller roster this screen needs.
const CURATED_FIRST_NAMES = ['Adaeze', 'Victoria', 'John', 'Grace', 'Ngozi', 'Chidi'];
const GEN_FIRST_NAMES = [
  'Chinonso',
  'Ifeoma',
  'Tobenna',
  'Uchechi',
  'Kelechi',
  'Amaka',
  'Emenike',
  'Ozioma',
  'Chibuzor',
  'Nkiru',
  'Ekene',
  'Oluchi',
];
const GEN_LAST_NAMES = [
  'Nnaji',
  'Okonkwo',
  'Achara',
  'Emeka',
  'Ibe',
  'Onyekwere',
  'Chukwu',
  'Ozoemena',
  'Uba',
  'Madueke',
  'Nweke',
  'Ejiofor',
];
const GEN_WARDS = PHARMACY_LOCATIONS.map((l) => l.shortName);
const WARD_ROLE: Record<string, string[]> = Object.fromEntries(
  GEN_WARDS.map((w) => [w, ['Pharmacist', 'Pharmacy Technician', 'Senior Pharmacist']]),
);
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

export const MOCK_PHARMACY_ROSTER: PharmacyShift[] = Array.from({ length: 20 }, (_, i) => {
  const isCurated = i < CURATED_FIRST_NAMES.length;
  const firstName = isCurated
    ? (CURATED_FIRST_NAMES[i] as string)
    : (GEN_FIRST_NAMES[(i - CURATED_FIRST_NAMES.length) % GEN_FIRST_NAMES.length] as string);
  const lastName = isCurated
    ? ''
    : (GEN_LAST_NAMES[((i - CURATED_FIRST_NAMES.length) * 5) % GEN_LAST_NAMES.length] as string);
  const staffName = isCurated ? `Pharm. ${firstName}` : `${firstName} ${lastName}`;
  const ward = GEN_WARDS[i % GEN_WARDS.length] as string;
  const roles = WARD_ROLE[ward] as string[];
  const role = isCurated
    ? i === 0
      ? 'Chief Pharmacist'
      : 'Senior Pharmacist'
    : roles[i % roles.length]!;
  const shiftType = GEN_SHIFT_TYPES[i % GEN_SHIFT_TYPES.length] as ShiftType;
  const status = GEN_STATUS[i % GEN_STATUS.length] as ShiftStatus;
  return {
    id: `phws-${String(i + 1).padStart(3, '0')}`,
    staffName,
    initials: isCurated ? `${firstName[0]}` : `${firstName[0]}${lastName[0]}`,
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
  onDuty: MOCK_PHARMACY_ROSTER.filter((s) => s.status === 'ON_DUTY').length,
  todaysShifts: MOCK_PHARMACY_ROSTER.length,
  onCall: MOCK_PHARMACY_ROSTER.filter((s) => s.status === 'ON_CALL').length,
  pendingAck: MOCK_PHARMACY_ROSTER.filter((s) => !s.acknowledged).length,
  coveragePercent: 90,
  pendingChanges: 2,
};

// ─── Coverage overview ──────────────────────────────────────────────────────

export type CoverageMetric = { label: string; percent: number; color: string };

export const COVERAGE_OVERVIEW: CoverageMetric[] = [
  { label: 'Overall Coverage', percent: 90, color: '#00B4D8' },
  { label: 'Morning Shift', percent: 95, color: '#22C55E' },
  { label: 'Afternoon Shift', percent: 88, color: '#00B4D8' },
  { label: 'Night Shift', percent: 80, color: '#F59E0B' },
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

export const PENDING_ACKNOWLEDGEMENTS: PendingAcknowledgement[] = MOCK_PHARMACY_ROSTER.filter(
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
  return `phws-${String(MOCK_PHARMACY_ROSTER.length + 1).padStart(3, '0')}`;
}
