/**
 * Laboratory Reports — the Summary tab's rollup data. Every total is a real
 * sum of the department breakdown below it (never a second, independently
 * invented number), and "Tests by Category" is literally the same
 * department totals shown a different way — not a separate dataset.
 */

export type ReportPeriod = 'This Month' | 'Last Month' | 'This Quarter' | 'This Year';

export const REPORT_PERIOD_OPTIONS: ReportPeriod[] = [
  'This Month',
  'Last Month',
  'This Quarter',
  'This Year',
];

export type DepartmentReportRow = {
  department: string;
  totalTests: number;
  samplesReceived: number;
  resultsPublished: number;
  pendingResults: number;
  rejectedSamples: number;
  criticalResults: number;
  avgTatMinutes: number;
  onTimePct: number;
};

export type TopTest = { name: string; count: number };
export type VolumePoint = { dayIndex: number; date: string; label: string; tests: number };
export type DailySeriesPoint = { dayIndex: number; date: string; label: string; value: number };
export type SampleTypeBreakdown = { type: string; count: number };
export type RejectionReasonBreakdown = { reason: string; count: number };

const chartAxisDateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Lagos',
  day: 'numeric',
  month: 'short',
});

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

/** This Month's department breakdown — every column here sums to the
 * headline stat cards exactly (12,458 total tests / 11,230 samples
 * received / 11,012 results published / 218 pending / 132 rejected /
 * 48 critical). */
const BASE_DEPARTMENTS: DepartmentReportRow[] = [
  {
    department: 'Hematology',
    totalTests: 3245,
    samplesReceived: 2980,
    resultsPublished: 2912,
    pendingResults: 36,
    rejectedSamples: 28,
    criticalResults: 12,
    avgTatMinutes: 95,
    onTimePct: 94.1,
  },
  {
    department: 'Clinical Chemistry',
    totalTests: 2980,
    samplesReceived: 2715,
    resultsPublished: 2640,
    pendingResults: 40,
    rejectedSamples: 32,
    criticalResults: 14,
    avgTatMinutes: 112,
    onTimePct: 91.7,
  },
  {
    department: 'Microbiology',
    totalTests: 2156,
    samplesReceived: 1985,
    resultsPublished: 1876,
    pendingResults: 59,
    rejectedSamples: 38,
    criticalResults: 16,
    avgTatMinutes: 151,
    onTimePct: 88.3,
  },
  {
    department: 'Immunology',
    totalTests: 1845,
    samplesReceived: 1690,
    resultsPublished: 1600,
    pendingResults: 48,
    rejectedSamples: 20,
    criticalResults: 4,
    avgTatMinutes: 106,
    onTimePct: 93.6,
  },
  {
    department: 'Serology',
    totalTests: 1125,
    samplesReceived: 1050,
    resultsPublished: 1020,
    pendingResults: 16,
    rejectedSamples: 8,
    criticalResults: 2,
    avgTatMinutes: 80,
    onTimePct: 96.2,
  },
  {
    department: 'Other',
    totalTests: 1107,
    samplesReceived: 810,
    resultsPublished: 964,
    pendingResults: 19,
    rejectedSamples: 6,
    criticalResults: 0,
    avgTatMinutes: 70,
    onTimePct: 97.3,
  },
];

const BASE_TOP_TESTS: TopTest[] = [
  { name: 'Full Blood Count (FBC)', count: 2145 },
  { name: 'Malaria Parasite (MP)', count: 1632 },
  { name: 'Widal Test', count: 1028 },
  { name: 'Urinalysis (U/E)', count: 978 },
  { name: 'Liver Function Test', count: 845 },
];

/** Shares of "This Month" Samples Received (11,230) by specimen type —
 * summed proportions, not an independently invented total. */
const BASE_SAMPLE_TYPE_SHARE: { type: string; share: number }[] = [
  { type: 'Whole Blood (EDTA)', share: 0.34 },
  { type: 'Serum', share: 0.27 },
  { type: 'Urine', share: 0.16 },
  { type: 'Swab', share: 0.11 },
  { type: 'Stool', share: 0.07 },
  { type: 'Other', share: 0.05 },
];

/** Shares of "This Month" Rejected Samples (132) by reason. */
const BASE_REJECTION_REASON_SHARE: { reason: string; share: number }[] = [
  { reason: 'Hemolyzed Specimen', share: 0.29 },
  { reason: 'Insufficient Volume', share: 0.24 },
  { reason: 'Clotted Sample', share: 0.19 },
  { reason: 'Mislabeled / Unlabeled', share: 0.15 },
  { reason: 'Wrong Container', share: 0.08 },
  { reason: 'Contaminated', share: 0.05 },
];

/** Period-over-period deltas shown on the stat cards — flavor context, not
 * derived from a second modeled "last period" dataset. */
export const STAT_DELTAS = {
  totalTests: 12.6,
  samplesReceived: 10.3,
  resultsPublished: 11.8,
  pendingResults: -8.4,
  rejectedSamples: -5.7,
  criticalResults: 14.3,
  avgTat: -9.1,
} as const;

/** This Month = 1×; other periods scale the same shape rather than invent
 * a second hand-authored dataset. */
const PERIOD_SCALE: Record<ReportPeriod, number> = {
  'This Month': 1,
  'Last Month': 1 / (1 + STAT_DELTAS.totalTests / 100),
  'This Quarter': 2.85,
  'This Year': 11.4,
};

function scaleRow(row: DepartmentReportRow, scale: number): DepartmentReportRow {
  return {
    ...row,
    totalTests: Math.round(row.totalTests * scale),
    samplesReceived: Math.round(row.samplesReceived * scale),
    resultsPublished: Math.round(row.resultsPublished * scale),
    pendingResults: Math.round(row.pendingResults * scale),
    rejectedSamples: Math.round(row.rejectedSamples * scale),
    criticalResults: Math.round(row.criticalResults * scale),
  };
}

export function getDepartmentRows(period: ReportPeriod): DepartmentReportRow[] {
  const scale = PERIOD_SCALE[period];
  return BASE_DEPARTMENTS.map((row) => scaleRow(row, scale));
}

export function getTopTests(period: ReportPeriod): TopTest[] {
  const scale = PERIOD_SCALE[period];
  return BASE_TOP_TESTS.map((t) => ({ ...t, count: Math.round(t.count * scale) }));
}

/** Splits `total` across `shares` (which sum to ~1) so the parts always add
 * back up to exactly `total` — the last-largest share absorbs any rounding
 * drift rather than leaving the breakdown a unit or two short/over. */
function splitByShare<T extends { share: number }>(
  items: T[],
  total: number,
): (Omit<T, 'share'> & { count: number })[] {
  const counts = items.map((item) => Math.round(item.share * total));
  const drift = total - counts.reduce((s, c) => s + c, 0);
  if (drift !== 0) {
    const largestIdx = counts.reduce((best, c, i) => (c > counts[best]! ? i : best), 0);
    counts[largestIdx]! += drift;
  }
  return items.map(({ share: _share, ...rest }, i) => ({ ...rest, count: counts[i]! }));
}

export function getSampleTypeBreakdown(period: ReportPeriod): SampleTypeBreakdown[] {
  const total = sumField(getDepartmentRows(period), 'samplesReceived');
  return splitByShare(BASE_SAMPLE_TYPE_SHARE, total);
}

export function getRejectionReasonBreakdown(period: ReportPeriod): RejectionReasonBreakdown[] {
  const total = sumField(getDepartmentRows(period), 'rejectedSamples');
  return splitByShare(BASE_REJECTION_REASON_SHARE, total);
}

export function sumField<K extends keyof DepartmentReportRow>(
  rows: DepartmentReportRow[],
  key: K,
): number {
  return rows.reduce((sum, r) => sum + (r[key] as number), 0);
}

/** Weighted average across departments, weighted by total tests. */
export function weightedAvg(
  rows: DepartmentReportRow[],
  key: 'avgTatMinutes' | 'onTimePct',
): number {
  const totalWeight = sumField(rows, 'totalTests');
  if (totalWeight === 0) return 0;
  const sum = rows.reduce((s, r) => s + r[key] * r.totalTests, 0);
  return sum / totalWeight;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const CATEGORY_COLORS = ['#2563EB', '#16A34A', '#7C3AED', '#F59E0B', '#0D9488', '#8A98A3'];

export function categoryColorFor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length]!;
}

function daysForPeriod(period: ReportPeriod): number {
  return period === 'This Quarter' ? 90 : period === 'This Year' ? 365 : 30;
}

/** Shared generator behind every daily trend series on this page: always
 * sums to exactly `total` (so a chart and its stat card never disagree),
 * with day `peakDayIndex` nudged to `peakDayValue` for a recognizable peak. */
function generateDailySeries(
  seedKey: string,
  total: number,
  days: number,
  peakDayIndex: number,
  peakDayValue: number,
): number[] {
  const rand = mulberry32(hashSeed(seedKey));
  const raw = Array.from({ length: days }, (_, i) => {
    const trend = 0.7 + (i / days) * 0.6;
    const noise = 0.55 + rand() * 0.9;
    return trend * noise;
  });
  const otherTarget = total - peakDayValue;
  const otherSum = raw.reduce((s, v, i) => (i === peakDayIndex ? s : s + v), 0);
  const scale = otherSum > 0 ? otherTarget / otherSum : 0;
  const values = raw.map((v, i) =>
    i === peakDayIndex ? peakDayValue : Math.max(2, Math.round(v * scale)),
  );

  let drift = total - values.reduce((s, v) => s + v, 0);
  let guard = 0;
  while (drift !== 0 && guard < days * 10) {
    const idx = guard % days;
    if (idx !== peakDayIndex && (drift > 0 || values[idx]! > 2)) {
      values[idx]! += drift > 0 ? 1 : -1;
      drift += drift > 0 ? -1 : 1;
    }
    guard++;
  }
  return values;
}

function daysFrom(values: number[]): { date: string; label: string }[] {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(9, 0, 0, 0);
  return values.map((_, i) => {
    const d = new Date(monthStart);
    d.setDate(monthStart.getDate() + i);
    return { date: d.toISOString(), label: chartAxisDateFmt.format(d) };
  });
}

/** A daily test-volume series for the period, always summing exactly to the
 * department total — the chart and the stat cards never disagree. Day 15 is
 * nudged to a recognizable peak, matching the reference design's
 * highlighted tooltip point. */
export function getVolumeSeries(period: ReportPeriod): VolumePoint[] {
  const total = sumField(getDepartmentRows(period), 'totalTests');
  const days = daysForPeriod(period);
  const peakDayIndex = Math.min(14, days - 1);
  const peakDayValue = period === 'This Month' ? 642 : Math.round((642 / 12458) * total);
  const values = generateDailySeries(
    `lab-reports-volume-${period}-${days}`,
    total,
    days,
    peakDayIndex,
    peakDayValue,
  );
  return values.map((tests, i) => ({ dayIndex: i, tests, ...daysFrom(values)[i]! }));
}

/** Same shared generator, targeting Samples Received instead of Total Tests
 * — used by the Sample Reports tab's daily collection trend. */
export function getSamplesReceivedSeries(period: ReportPeriod): DailySeriesPoint[] {
  const total = sumField(getDepartmentRows(period), 'samplesReceived');
  const days = daysForPeriod(period);
  const peakDayIndex = Math.min(14, days - 1);
  const peakDayValue = Math.round((580 / 11230) * total);
  const values = generateDailySeries(
    `lab-reports-samples-${period}-${days}`,
    total,
    days,
    peakDayIndex,
    peakDayValue,
  );
  return values.map((value, i) => ({ dayIndex: i, value, ...daysFrom(values)[i]! }));
}

/** Same shared generator, targeting Results Published — used by the
 * Published Results tab's daily publish trend. */
export function getResultsPublishedSeries(period: ReportPeriod): DailySeriesPoint[] {
  const total = sumField(getDepartmentRows(period), 'resultsPublished');
  const days = daysForPeriod(period);
  const peakDayIndex = Math.min(14, days - 1);
  const peakDayValue = Math.round((570 / 11012) * total);
  const values = generateDailySeries(
    `lab-reports-published-${period}-${days}`,
    total,
    days,
    peakDayIndex,
    peakDayValue,
  );
  return values.map((value, i) => ({ dayIndex: i, value, ...daysFrom(values)[i]! }));
}
