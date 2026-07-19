/**
 * Mock fixtures for the Medical Records Workforce Management screen (supervisor-only).
 * Swap out by pointing hooks to a real staffing/roster endpoint in Phase 6.
 */

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ON_CALL' | 'EMERGENCY';
export type ShiftStatus = 'ON_DUTY' | 'SCHEDULED' | 'ON_CALL' | 'COMPLETED';

export const WARD_OPTIONS = [
  'Filing Room',
  'Retrieval Desk',
  'Archive Storage',
  'Release of Information Desk',
  'Health Information Unit',
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
  'Records Officer',
  'Senior Records Officer',
  'Archivist',
  'Health Information Officer',
  'Coding Officer',
].map((r) => ({ value: r, label: r }));

export type RecordsShift = {
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
  'Ngozi',
  'Emeka',
  'Chidinma',
  'Obinna',
  'Adaeze',
  'Tochukwu',
  'Nkiruka',
  'Chibuzo',
  'Ijeoma',
  'Uzochukwu',
  'Chiamaka',
  'Ekene',
];
const GEN_LAST_NAMES = [
  'Asogwa',
  'Onwuka',
  'Ezeanya',
  'Nnabuife',
  'Okeke',
  'Iloegbunam',
  'Anyaoku',
  'Ugochukwu',
  'Ndukwe',
  'Achebe',
  'Onuoha',
  'Ejiofor',
];
const GEN_STATIONS = [
  'Filing Room',
  'Retrieval Desk',
  'Archive Storage',
  'Release of Information Desk',
  'Health Information Unit',
];
const STATION_ROLE: Record<string, string[]> = {
  'Filing Room': ['Records Officer', 'Archivist'],
  'Retrieval Desk': ['Records Officer', 'Senior Records Officer'],
  'Archive Storage': ['Archivist', 'Senior Records Officer'],
  'Release of Information Desk': ['Health Information Officer', 'Records Officer'],
  'Health Information Unit': ['Coding Officer', 'Health Information Officer'],
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

export const MOCK_RECORDS_ROSTER: RecordsShift[] = Array.from({ length: 18 }, (_, i) => {
  const firstName = GEN_FIRST_NAMES[i % GEN_FIRST_NAMES.length] as string;
  const lastName = GEN_LAST_NAMES[(i * 5) % GEN_LAST_NAMES.length] as string;
  const ward = GEN_STATIONS[i % GEN_STATIONS.length] as string;
  const roles = STATION_ROLE[ward] as string[];
  const role = roles[i % roles.length] as string;
  const shiftType = GEN_SHIFT_TYPES[i % GEN_SHIFT_TYPES.length] as ShiftType;
  const status = GEN_STATUS[i % GEN_STATUS.length] as ShiftStatus;
  return {
    id: `rds-${String(i + 1).padStart(3, '0')}`,
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
  onDuty: MOCK_RECORDS_ROSTER.filter((s) => s.status === 'ON_DUTY').length,
  todaysShifts: MOCK_RECORDS_ROSTER.length,
  onCall: MOCK_RECORDS_ROSTER.filter((s) => s.status === 'ON_CALL').length,
  pendingAck: MOCK_RECORDS_ROSTER.filter((s) => !s.acknowledged).length,
  coveragePercent: 88,
  pendingChanges: 2,
};

// ─── Coverage overview ──────────────────────────────────────────────────────

export type CoverageMetric = { label: string; percent: number; color: string };

export const COVERAGE_OVERVIEW: CoverageMetric[] = [
  { label: 'Overall Coverage', percent: 88, color: '#00B4D8' },
  { label: 'Morning Shift', percent: 94, color: '#22C55E' },
  { label: 'Afternoon Shift', percent: 85, color: '#00B4D8' },
  { label: 'Night Shift', percent: 78, color: '#F59E0B' },
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

export const PENDING_ACKNOWLEDGEMENTS: PendingAcknowledgement[] = MOCK_RECORDS_ROSTER.filter(
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
  return `rds-${String(MOCK_RECORDS_ROSTER.length + 1).padStart(3, '0')}`;
}
