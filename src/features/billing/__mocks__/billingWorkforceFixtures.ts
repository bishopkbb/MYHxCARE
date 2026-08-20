/**
 * Mock fixtures for the Billing (Finance Department) Workforce Management
 * screen. Mirrors laboratoryWorkforceFixtures.ts's shape and conventions —
 * same ShiftType/ShiftStatus union, same generator pattern — so this screen
 * behaves identically to its Laboratory/Pharmacy/Nursing/Registration/
 * Medical Records siblings. "Ward" here is the Finance Department's own
 * internal team a shift is worked in, not a hospital ward — reusing the
 * shared `StaffShift.ward` field the same way Laboratory repurposes it for
 * its own lab departments. Roles reuse the exact staff-title vocabulary
 * already established for billing staff in billingAccountDetailFixtures.ts
 * (`PAYMENT_STAFF`, `FINANCE_APPROVERS`), not a second invented list.
 * Swap out by pointing hooks to a real staffing/roster endpoint in Phase 6.
 */

export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ON_CALL' | 'EMERGENCY';
export type ShiftStatus = 'ON_DUTY' | 'SCHEDULED' | 'ON_CALL' | 'COMPLETED' | 'CANCELLED';

const FINANCE_TEAMS = [
  'Billing & Invoicing',
  'Payments & Collections',
  'Reconciliation',
  'Refunds & Adjustments',
  'Reports & Compliance',
];

export const WARD_OPTIONS = FINANCE_TEAMS.map((d) => ({ value: d, label: d }));

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
  'Finance Manager',
  'Chief Accountant',
  'Accountant',
  'Finance Officer',
  'Billing Officer',
  'Cashier',
].map((r) => ({ value: r, label: r }));

export type BillingShift = {
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

// The same informal roster naming pool already reused across Laboratory's
// own Workforce Management fixtures, kept consistent with this session's
// established curated + generated split.
const CURATED_FIRST_NAMES = ['Ifeanyi', 'Chioma', 'Emeka', 'Blessing', 'Uche', 'Ngozi'];
const GEN_FIRST_NAMES = [
  'Chinedu',
  'Adaeze',
  'Tochukwu',
  'Amarachi',
  'Ikenna',
  'Chiamaka',
  'Nnamdi',
  'Ijeoma',
  'Obiora',
  'Chinyere',
  'Kingsley',
  'Adaobi',
];
const GEN_LAST_NAMES = [
  'Okafor',
  'Eze',
  'Nwachukwu',
  'Onwuka',
  'Ibekwe',
  'Anyanwu',
  'Okoro',
  'Nnamani',
  'Uzoma',
  'Chukwuma',
  'Okereke',
  'Obi',
];
const GEN_WARDS = FINANCE_TEAMS;
const WARD_ROLE: Record<string, string[]> = Object.fromEntries(
  GEN_WARDS.map((w) => [w, ['Accountant', 'Finance Officer', 'Billing Officer']]),
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

export const MOCK_BILLING_ROSTER: BillingShift[] = Array.from({ length: 18 }, (_, i) => {
  const isCurated = i < CURATED_FIRST_NAMES.length;
  const firstName = isCurated
    ? (CURATED_FIRST_NAMES[i] as string)
    : (GEN_FIRST_NAMES[(i - CURATED_FIRST_NAMES.length) % GEN_FIRST_NAMES.length] as string);
  const lastName = isCurated
    ? ''
    : (GEN_LAST_NAMES[((i - CURATED_FIRST_NAMES.length) * 5) % GEN_LAST_NAMES.length] as string);
  const staffName = isCurated ? `${firstName} Okafor` : `${firstName} ${lastName}`;
  const ward = GEN_WARDS[i % GEN_WARDS.length] as string;
  const roles = WARD_ROLE[ward] as string[];
  const role = isCurated
    ? i === 0
      ? 'Finance Manager'
      : i === 1
        ? 'Chief Accountant'
        : 'Accountant'
    : roles[i % roles.length]!;
  const shiftType = GEN_SHIFT_TYPES[i % GEN_SHIFT_TYPES.length] as ShiftType;
  const status = GEN_STATUS[i % GEN_STATUS.length] as ShiftStatus;
  return {
    id: `billws-${String(i + 1).padStart(3, '0')}`,
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
//
// Computed from whatever roster is passed in — a live `StaffShift[]` (mapped
// through `toBillingView()`) from the canonical `staffShiftStore.ts` in real
// usage, or `MOCK_BILLING_ROSTER` as a fallback/seed. Kept live (not frozen
// at module load) so a shift created/cancelled/acknowledged on Workforce
// Management moves these numbers immediately — including on the Billing
// Dashboard's own "Staff on Duty" card, which reads the same store.

export type WorkforceStats = {
  onDuty: number;
  todaysShifts: number;
  onCall: number;
  pendingAck: number;
  coveragePercent: number;
  cancelledToday: number;
};

export function computeWorkforceStats(rows: BillingShift[]): WorkforceStats {
  const onDuty = rows.filter((s) => s.status === 'ON_DUTY').length;
  const onCall = rows.filter((s) => s.status === 'ON_CALL').length;
  const cancelledToday = rows.filter((s) => s.status === 'CANCELLED').length;
  const active = rows.filter((s) => s.status !== 'CANCELLED');
  const coveragePercent =
    active.length === 0 ? 0 : Math.round(((onDuty + onCall) / active.length) * 100);
  return {
    onDuty,
    todaysShifts: rows.length,
    onCall,
    pendingAck: rows.filter((s) => !s.acknowledged).length,
    coveragePercent,
    cancelledToday,
  };
}

// ─── Coverage overview ──────────────────────────────────────────────────────

export type CoverageMetric = { label: string; percent: number; color: string };

function colorForCoverage(percent: number): string {
  if (percent >= 90) return '#22C55E';
  if (percent >= 80) return '#00B4D8';
  return '#F59E0B';
}

function coverageFor(rows: BillingShift[], shiftType: ShiftType | null): number {
  const scoped = shiftType ? rows.filter((s) => s.shiftType === shiftType) : rows;
  const active = scoped.filter((s) => s.status !== 'CANCELLED');
  if (active.length === 0) return 100; // nothing scheduled to cover, vacuously fully covered
  const covered = active.filter((s) => s.status === 'ON_DUTY' || s.status === 'ON_CALL').length;
  return Math.round((covered / active.length) * 100);
}

export function computeCoverageOverview(rows: BillingShift[]): CoverageMetric[] {
  const entries: [string, ShiftType | null][] = [
    ['Overall Coverage', null],
    ['Morning Shift', 'MORNING'],
    ['Afternoon Shift', 'AFTERNOON'],
    ['Night Shift', 'NIGHT'],
    ['On-Call Coverage', 'ON_CALL'],
  ];
  return entries.map(([label, shiftType]) => {
    const percent = coverageFor(rows, shiftType);
    return { label, percent, color: colorForCoverage(percent) };
  });
}

export function nextShiftId(): string {
  return `billws-${String(MOCK_BILLING_ROSTER.length + 1).padStart(3, '0')}`;
}
