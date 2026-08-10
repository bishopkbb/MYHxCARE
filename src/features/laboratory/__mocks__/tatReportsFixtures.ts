/**
 * Turnaround Time (TAT) Reports — the Overview tab's rollup data. Every
 * total is a real sum of the department breakdown below it, apportioned
 * with a largest-remainder rounding so counts never drift from the
 * headline stat cards (9,684 total tests / 8,942 within target / 742
 * delayed / 92.4% compliance).
 */

export type TatPeriod = 'Today' | 'This Week' | 'This Month' | 'Last Month' | 'This Quarter';

export const TAT_PERIOD_OPTIONS: TatPeriod[] = [
  'Today',
  'This Week',
  'This Month',
  'Last Month',
  'This Quarter',
];

export type TatDepartmentRow = {
  department: string;
  totalTests: number;
  avgTatSeconds: number;
  withinTarget: number;
  delayed: number;
  complianceTrendPct: number;
  longestTatSeconds: number;
};

export type TatPriority = 'STAT' | 'Routine' | 'Low';
export type TatTarget = { priority: TatPriority; targetMinutes: number; compliancePct: number };

export type TatTrendPoint = {
  dayIndex: number;
  date: string;
  label: string;
  thisMonthSeconds: number;
  lastMonthSeconds: number;
};

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Largest-remainder apportionment — splits `total` across `shares`
 * (which needn't sum to exactly 1) so the parts always add back up to
 * exactly `total`, distributing rounding to the largest fractional
 * remainders first rather than dumping all drift on one row. */
function apportion(shares: number[], total: number): number[] {
  const shareSum = shares.reduce((a, b) => a + b, 0) || 1;
  const raw = shares.map((s) => (s / shareSum) * total);
  const floors = raw.map(Math.floor);
  const used = floors.reduce((a, b) => a + b, 0);
  let remainder = total - used;
  const order = raw.map((r, i) => ({ i, frac: r - floors[i]! })).sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    result[order[k]!.i]! += 1;
    remainder--;
  }
  return result;
}

type BaseRow = {
  department: string;
  rawTotalTests: number; // reference-design proportions, rescaled to the real headline total
  avgTatSeconds: number;
  onTimePct: number;
  complianceTrendPct: number;
  longestTatSeconds: number;
};

const OVERVIEW_TOTAL_TESTS = 9684;
const OVERVIEW_WITHIN_TARGET = 8942;

const BASE_ROWS: BaseRow[] = [
  {
    department: 'Hematology',
    rawTotalTests: 4432,
    avgTatSeconds: 6332,
    onTimePct: 92.3,
    complianceTrendPct: 6.2,
    longestTatSeconds: 31512,
  },
  {
    department: 'Clinical Chemistry',
    rawTotalTests: 3538,
    avgTatSeconds: 8534,
    onTimePct: 91.8,
    complianceTrendPct: 5.4,
    longestTatSeconds: 45045,
  },
  {
    department: 'Microbiology',
    rawTotalTests: 2143,
    avgTatSeconds: 14121,
    onTimePct: 88.3,
    complianceTrendPct: -2.1,
    longestTatSeconds: 85510,
  },
  {
    department: 'Immunology',
    rawTotalTests: 1223,
    avgTatSeconds: 8320,
    onTimePct: 94.5,
    complianceTrendPct: 7.8,
    longestTatSeconds: 37233,
  },
  {
    department: 'Serology',
    rawTotalTests: 698,
    avgTatSeconds: 5418,
    onTimePct: 92.4,
    complianceTrendPct: 3.1,
    longestTatSeconds: 22542,
  },
  {
    department: 'Other',
    rawTotalTests: 424,
    avgTatSeconds: 4325,
    onTimePct: 73.8,
    complianceTrendPct: -4.6,
    longestTatSeconds: 18320,
  },
];

const totalTestsByDept = apportion(
  BASE_ROWS.map((r) => r.rawTotalTests),
  OVERVIEW_TOTAL_TESTS,
);
const withinTargetByDept = apportion(
  BASE_ROWS.map((r, i) => (totalTestsByDept[i]! * r.onTimePct) / 100),
  OVERVIEW_WITHIN_TARGET,
);

export const TAT_DEPARTMENT_ROWS: TatDepartmentRow[] = BASE_ROWS.map((r, i) => ({
  department: r.department,
  totalTests: totalTestsByDept[i]!,
  avgTatSeconds: r.avgTatSeconds,
  withinTarget: withinTargetByDept[i]!,
  delayed: totalTestsByDept[i]! - withinTargetByDept[i]!,
  complianceTrendPct: r.complianceTrendPct,
  longestTatSeconds: r.longestTatSeconds,
}));

export function sumTatField<K extends keyof TatDepartmentRow>(key: K): number {
  return TAT_DEPARTMENT_ROWS.reduce((sum, r) => sum + (r[key] as number), 0);
}

export function overallAvgTatSeconds(): number {
  const totalWeight = sumTatField('totalTests');
  if (totalWeight === 0) return 0;
  const sum = TAT_DEPARTMENT_ROWS.reduce((s, r) => s + r.avgTatSeconds * r.totalTests, 0);
  return sum / totalWeight;
}

export function overallLongestTatSeconds(): { seconds: number; department: string } {
  return TAT_DEPARTMENT_ROWS.reduce(
    (best, r) =>
      r.longestTatSeconds > best.seconds
        ? { seconds: r.longestTatSeconds, department: r.department }
        : best,
    { seconds: 0, department: '' },
  );
}

export function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export const TAT_TARGETS: TatTarget[] = [
  { priority: 'STAT', targetMinutes: 60, compliancePct: 94.3 },
  { priority: 'Routine', targetMinutes: 240, compliancePct: 92.1 },
  { priority: 'Low', targetMinutes: 1440, compliancePct: 90.3 },
];

const chartAxisDateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  day: 'numeric',
  month: 'short',
});

/** Daily average-TAT series for This Month vs Last Month, in seconds — the
 * two lines are independently seeded but both trend around the real
 * weighted overall average, matching the reference design's dual-line
 * comparison chart. */
export function getTatTrendSeries(): TatTrendPoint[] {
  const days = 30;
  const avg = overallAvgTatSeconds();
  const randThis = mulberry32(hashSeed('tat-trend-this-month'));
  const randLast = mulberry32(hashSeed('tat-trend-last-month'));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(9, 0, 0, 0);

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(monthStart);
    d.setDate(monthStart.getDate() + i);
    const thisWobble = 0.82 + randThis() * 0.36;
    const lastWobble = 0.88 + randLast() * 0.4;
    return {
      dayIndex: i,
      date: d.toISOString(),
      label: chartAxisDateFmt.format(d),
      thisMonthSeconds: Math.round(avg * thisWobble),
      lastMonthSeconds: Math.round(avg * 1.14 * lastWobble),
    };
  });
}

// ── By Test ─────────────────────────────────────────────────────────────

export type TatTestRow = {
  test: string;
  department: string;
  totalTests: number;
  avgTatSeconds: number;
  compliancePct: number;
};

/** The same named tests as Laboratory Reports' Top 5 Most Ordered Tests,
 * so a user recognizes them across both reports — this is a "most common
 * tests" slice, not an exhaustive breakdown, so it isn't required to sum
 * to the 9,684 headline total (same convention as that Top 5 list). */
export const TAT_BY_TEST: TatTestRow[] = [
  {
    test: 'Full Blood Count (FBC)',
    department: 'Hematology',
    totalTests: 1665,
    avgTatSeconds: 5400,
    compliancePct: 95.2,
  },
  {
    test: 'Malaria Parasite (MP)',
    department: 'Hematology',
    totalTests: 1268,
    avgTatSeconds: 3600,
    compliancePct: 97.8,
  },
  {
    test: 'Widal Test',
    department: 'Serology',
    totalTests: 799,
    avgTatSeconds: 7200,
    compliancePct: 90.1,
  },
  {
    test: 'Urinalysis (U/E)',
    department: 'Clinical Chemistry',
    totalTests: 760,
    avgTatSeconds: 4500,
    compliancePct: 93.4,
  },
  {
    test: 'Liver Function Test',
    department: 'Clinical Chemistry',
    totalTests: 657,
    avgTatSeconds: 9000,
    compliancePct: 88.7,
  },
  {
    test: 'Blood Culture',
    department: 'Microbiology',
    totalTests: 220,
    avgTatSeconds: 85510,
    compliancePct: 61.5,
  },
];

// ── STAT vs Routine ──────────────────────────────────────────────────────

export type TatPriorityRow = {
  priority: TatPriority;
  totalTests: number;
  avgTatSeconds: number;
  targetMinutes: number;
  compliancePct: number;
};

/** Splits the exact 9,684 headline total across the three priorities, so
 * this tab and the Overview tab always agree on volume. */
export const TAT_BY_PRIORITY: TatPriorityRow[] = [
  {
    priority: 'STAT',
    totalTests: 1552,
    avgTatSeconds: 2280,
    targetMinutes: 60,
    compliancePct: 94.3,
  },
  {
    priority: 'Routine',
    totalTests: 7050,
    avgTatSeconds: 9840,
    targetMinutes: 240,
    compliancePct: 92.1,
  },
  {
    priority: 'Low',
    totalTests: 1082,
    avgTatSeconds: 42000,
    targetMinutes: 1440,
    compliancePct: 90.3,
  },
];

// ── Delayed Results ──────────────────────────────────────────────────────

export type DelayReasonRow = { reason: string; count: number };

/** Sums to exactly the 742 delayed-results headline total. */
export const DELAY_REASONS: DelayReasonRow[] = [
  { reason: 'High Sample Volume Backlog', count: 245 },
  { reason: 'Equipment Downtime', count: 156 },
  { reason: 'Staff Shortage', count: 134 },
  { reason: 'Add-on Test Requested', count: 104 },
  { reason: 'Sample Re-collection Required', count: 68 },
  { reason: 'Other', count: 35 },
];

export type DelayedExample = {
  id: string;
  test: string;
  department: string;
  priority: TatPriority;
  orderedAt: string;
  targetMinutes: number;
  elapsedMinutes: number;
  reason: string;
};

/** A handful of illustrative currently-delayed tests — not the full 742,
 * the same convention as the Critical Results tab's "live queue": a
 * representative sample for the list view, while the stat card carries
 * the real period total. */
export function getDelayedExamples(): DelayedExample[] {
  const rand = mulberry32(hashSeed('tat-delayed-examples'));
  const templates: {
    test: string;
    department: string;
    priority: TatPriority;
    targetMinutes: number;
    reason: string;
  }[] = [
    {
      test: 'Blood Culture',
      department: 'Microbiology',
      priority: 'Low',
      targetMinutes: 1440,
      reason: 'High Sample Volume Backlog',
    },
    {
      test: 'Liver Function Test',
      department: 'Clinical Chemistry',
      priority: 'Routine',
      targetMinutes: 240,
      reason: 'Equipment Downtime',
    },
    {
      test: 'Widal Test',
      department: 'Serology',
      priority: 'Routine',
      targetMinutes: 240,
      reason: 'Staff Shortage',
    },
    {
      test: 'Full Blood Count (FBC)',
      department: 'Hematology',
      priority: 'STAT',
      targetMinutes: 60,
      reason: 'Add-on Test Requested',
    },
    {
      test: 'Urinalysis (U/E)',
      department: 'Clinical Chemistry',
      priority: 'Routine',
      targetMinutes: 240,
      reason: 'High Sample Volume Backlog',
    },
    {
      test: 'Stool Culture',
      department: 'Microbiology',
      priority: 'Low',
      targetMinutes: 1440,
      reason: 'Sample Re-collection Required',
    },
    {
      test: 'Coagulation Panel',
      department: 'Hematology',
      priority: 'STAT',
      targetMinutes: 60,
      reason: 'Equipment Downtime',
    },
    {
      test: 'Widal Test',
      department: 'Serology',
      priority: 'Routine',
      targetMinutes: 240,
      reason: 'Other',
    },
  ];
  return templates.map((t, i) => {
    const overageFactor = 1.15 + rand() * 0.9;
    const elapsedMinutes = Math.round(t.targetMinutes * overageFactor);
    const orderedMinutesAgo = elapsedMinutes + Math.round(rand() * 30);
    const orderedAt = new Date(Date.now() - orderedMinutesAgo * 60_000).toISOString();
    return {
      id: `delayed-${i + 1}`,
      test: t.test,
      department: t.department,
      priority: t.priority,
      orderedAt,
      targetMinutes: t.targetMinutes,
      elapsedMinutes,
      reason: t.reason,
    };
  });
}

// ── Monthly Trend ────────────────────────────────────────────────────────

export type MonthlyTrendPoint = { month: string; avgTatSeconds: number; compliancePct: number };

const monthLabelFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  month: 'short',
});

/** Last 6 months of average TAT and compliance, ending at the current
 * month (whose value matches the real weighted Overview average exactly). */
export function getMonthlyTrend(): MonthlyTrendPoint[] {
  const avg = overallAvgTatSeconds();
  const compliance = (sumTatField('withinTarget') / Math.max(1, sumTatField('totalTests'))) * 100;
  const rand = mulberry32(hashSeed('tat-monthly-trend'));
  const points: MonthlyTrendPoint[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const isCurrent = i === 0;
    const wobble = 0.88 + rand() * 0.28;
    const complianceWobble = 0.92 + rand() * 0.14;
    points.push({
      month: monthLabelFmt.format(d),
      avgTatSeconds: isCurrent ? Math.round(avg) : Math.round(avg * wobble),
      compliancePct: isCurrent
        ? Math.round(compliance * 10) / 10
        : Math.round(Math.min(99, compliance * complianceWobble) * 10) / 10,
    });
  }
  return points;
}
