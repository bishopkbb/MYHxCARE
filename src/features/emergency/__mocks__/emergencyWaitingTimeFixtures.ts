/**
 * Emergency Waiting Time Reports fixtures — historical wait-time analytics
 * across triage, treatment and discharge stages. No real ED-wide historical
 * wait-time store exists in this build (same gap already noted in
 * `emergencyReportsFixtures.ts`) — illustrative but internally consistent
 * data, clearly commented, swapped for a real
 * `GET /emergency/reports/waiting-time` endpoint in Phase 6.
 *
 * Triage Acuity uses the canonical 4-tier `TriagePriority`
 * (`src/utils/triage.ts`), not the mockup's 5-tier Red/Orange/Yellow/
 * Green/Blue scale — the same substitution the Emergency Dashboard plan
 * settled on for Triage Distribution.
 */

import { TRIAGE_DISPLAY, type TriagePriority } from '@/utils/triage';
import { REPORT_LOCATIONS, REPORT_SHIFTS } from './emergencyReportsFixtures';

export type WaitTimeStat = {
  key: string;
  label: string;
  value: string;
  deltaPercent: number;
  direction: 'up' | 'down';
  goodDirection: 'up' | 'down';
};

export const WAIT_TIME_STATS: WaitTimeStat[] = [
  {
    key: 'total',
    label: 'Average Total Wait Time',
    value: '2h 45m',
    deltaPercent: 8.4,
    direction: 'down',
    goodDirection: 'down',
  },
  {
    key: 'triage',
    label: 'Average Triage Wait Time',
    value: '22m',
    deltaPercent: 5.2,
    direction: 'down',
    goodDirection: 'down',
  },
  {
    key: 'treatment',
    label: 'Average Treatment Wait Time',
    value: '1h 48m',
    deltaPercent: 7.6,
    direction: 'down',
    goodDirection: 'down',
  },
  {
    key: 'discharge',
    label: 'Average Discharge Wait Time',
    value: '35m',
    deltaPercent: 11.3,
    direction: 'down',
    goodDirection: 'down',
  },
  {
    key: 'patients',
    label: 'Total Patients Analyzed',
    value: '1,256',
    deltaPercent: 9.7,
    direction: 'up',
    goodDirection: 'up',
  },
];

export type WaitTimeTrendPoint = {
  date: string; // ISO
  label: string; // 'Jun 23'
  totalMinutes: number;
  triageMinutes: number;
  treatmentMinutes: number;
  dischargeMinutes: number;
  location: string;
  shift: string;
};

function seedTrend(days: number, endMs: number): WaitTimeTrendPoint[] {
  const points: WaitTimeTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endMs - i * 24 * 60 * 60 * 1000);
    // Gentle deterministic wobble around the headline averages so the trend
    // reads as real without a PRNG dependency — index-based, not random.
    const wobble = Math.sin(i * 0.7) * 3 + Math.cos(i * 1.3) * 2;
    const triageMinutes = Math.max(12, Math.round(22 + wobble));
    const treatmentMinutes = Math.max(80, Math.round(108 + wobble * 4));
    const dischargeMinutes = Math.max(20, Math.round(35 + wobble * 1.5));
    const totalMinutes = triageMinutes + treatmentMinutes + dischargeMinutes;
    points.push({
      date: d.toISOString(),
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      totalMinutes,
      triageMinutes,
      treatmentMinutes,
      dischargeMinutes,
      location: REPORT_LOCATIONS[i % REPORT_LOCATIONS.length]!,
      shift: REPORT_SHIFTS[i % REPORT_SHIFTS.length]!,
    });
  }
  return points;
}

export const WAIT_TIME_TREND: WaitTimeTrendPoint[] = seedTrend(30, Date.now());

export type AcuityWaitSlice = {
  priority: TriagePriority;
  label: string;
  minutes: number;
  color: string;
};

const PRIORITY_COLOR: Record<TriagePriority, string> = {
  IMMEDIATE: '#DC2626',
  URGENT: '#F97316',
  LESS_URGENT: '#FBBF24',
  NON_URGENT: '#22C55E',
};

// Ascending with acuity level, deliberately below each tier's clinical
// maxWaitMinutes guideline (TRIAGE_DISPLAY) except the least urgent, which
// mildly exceeds it — this is what drives the "over target" flag in the
// Wait Time Benchmarks panel.
const ACUITY_MINUTES: Record<TriagePriority, number> = {
  IMMEDIATE: 8,
  URGENT: 9,
  LESS_URGENT: 55,
  NON_URGENT: 130,
};

export const ACUITY_WAIT_BREAKDOWN: AcuityWaitSlice[] = (
  ['IMMEDIATE', 'URGENT', 'LESS_URGENT', 'NON_URGENT'] as TriagePriority[]
).map((priority) => ({
  priority,
  label: TRIAGE_DISPLAY[priority].label,
  minutes: ACUITY_MINUTES[priority],
  color: PRIORITY_COLOR[priority],
}));

export const OVERALL_AVERAGE_MINUTES = 165; // 2h 45m — matches WAIT_TIME_STATS 'total'

export type WaitTimeSummaryRow = {
  date: string;
  label: string;
  totalPatients: number;
  triageAvg: number;
  triage90th: number;
  treatmentAvg: number;
  treatment90th: number;
  dischargeAvg: number;
  discharge90th: number;
  totalAvg: number;
  total90th: number;
  location: string;
  shift: string;
};

function seedSummary(days: number, endMs: number): WaitTimeSummaryRow[] {
  const rows: WaitTimeSummaryRow[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(endMs - i * 24 * 60 * 60 * 1000);
    const wobble = Math.sin(i * 0.9) * 4 + Math.cos(i * 0.5) * 3;
    const triageAvg = Math.max(15, Math.round(21 + wobble));
    const treatmentAvg = Math.max(85, Math.round(107 + wobble * 4));
    const dischargeAvg = Math.max(25, Math.round(33 + wobble * 1.2));
    const totalAvg = triageAvg + treatmentAvg + dischargeAvg;
    rows.push({
      date: d.toISOString(),
      label:
        i === 0
          ? `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} (Today)`
          : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      totalPatients: 130 + Math.round(Math.abs(wobble) * 12) + i,
      triageAvg,
      triage90th: Math.round(triageAvg * 2.15),
      treatmentAvg,
      treatment90th: Math.round(treatmentAvg * 1.85),
      dischargeAvg,
      discharge90th: Math.round(dischargeAvg * 2.3),
      totalAvg,
      total90th: Math.round(totalAvg * 1.65),
      location: REPORT_LOCATIONS[i % REPORT_LOCATIONS.length]!,
      shift: REPORT_SHIFTS[i % REPORT_SHIFTS.length]!,
    });
  }
  return rows;
}

export const WAIT_TIME_SUMMARY: WaitTimeSummaryRow[] = seedSummary(7, Date.now());

export type WaitTimeInsights = {
  busiestDay: string;
  busiestDayDetail: string;
  peakHours: string;
  peakHoursDetail: string;
  longestWait: string;
  longestWaitDetail: string;
  improvementPercent: number;
  improvementDetail: string;
};

export const WAIT_TIME_INSIGHTS: WaitTimeInsights = {
  busiestDay: 'Yesterday',
  busiestDayDetail: '52 visits, average wait 2h 54m',
  peakHours: '17:00 – 18:00',
  peakHoursDetail: 'Average wait 3h 42m',
  longestWait: '7h 18m',
  longestWaitDetail: 'Non-Urgent, Yesterday at 11:45 PM',
  improvementPercent: 8.4,
  improvementDetail: 'reduction in average total wait time vs last 7 days',
};

export type WaitTimeBenchmark = {
  label: string;
  targetMinutes: number;
  actualMinutes: number;
};

export const WAIT_TIME_BENCHMARKS: WaitTimeBenchmark[] = [
  ...ACUITY_WAIT_BREAKDOWN.filter((a) => a.priority !== 'IMMEDIATE').map((a) => ({
    label: `${TRIAGE_DISPLAY[a.priority].label} Triage`,
    targetMinutes: TRIAGE_DISPLAY[a.priority].maxWaitMinutes,
    actualMinutes: a.minutes,
  })),
  { label: 'Discharge', targetMinutes: 45, actualMinutes: 35 },
];
