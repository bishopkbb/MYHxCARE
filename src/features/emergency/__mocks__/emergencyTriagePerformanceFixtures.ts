/**
 * Emergency Triage Performance Reports fixtures — accuracy and response-time
 * analytics for the triage process itself. No real ED-wide historical
 * triage-performance store exists in this build (same gap already noted in
 * `emergencyReportsFixtures.ts` and `emergencyWaitingTimeFixtures.ts`) —
 * illustrative but internally consistent data, clearly commented, swapped
 * for a real `GET /emergency/reports/triage-performance` endpoint in
 * Phase 6.
 *
 * Triage Acuity uses the canonical 4-tier `TriagePriority`
 * (`src/utils/triage.ts`), not the mockup's 5-tier Resuscitation/Emergency/
 * Urgent/Less Urgent/Non-Urgent scale — the same substitution already made
 * for the Emergency Dashboard's Triage Distribution and the Waiting Time
 * Reports' acuity breakdown.
 */

import { TRIAGE_DISPLAY, type TriagePriority } from '@/utils/triage';
import { REPORT_LOCATIONS, REPORT_SHIFTS } from './emergencyReportsFixtures';

export type TriageStat = {
  key: string;
  label: string;
  value: string;
  deltaPercent: number;
  direction: 'up' | 'down';
  goodDirection: 'up' | 'down';
};

export const TRIAGE_STATS: TriageStat[] = [
  {
    key: 'total',
    label: 'Total Patients Triaged',
    value: '1,256',
    deltaPercent: 9.6,
    direction: 'up',
    goodDirection: 'up',
  },
  {
    key: 'avgTime',
    label: 'Average Triage Time',
    value: '22m',
    deltaPercent: 6.8,
    direction: 'down',
    goodDirection: 'down',
  },
  {
    key: 'accuracy',
    label: 'Triage Accuracy Rate',
    value: '94.2%',
    deltaPercent: 3.2,
    direction: 'up',
    goodDirection: 'up',
  },
  {
    key: 'retriaged',
    label: 'Re-triaged Patients',
    value: '48 (3.8%)',
    deltaPercent: 8.3,
    direction: 'down',
    goodDirection: 'down',
  },
  {
    key: 'under5',
    label: 'Triage < 5 min',
    value: '78.6%',
    deltaPercent: 12.4,
    direction: 'up',
    goodDirection: 'up',
  },
];

export type AcuityTriageRow = {
  priority: TriagePriority;
  label: string;
  count: number;
  avgMinutes: number;
  accuracyPercent: number;
  benchmarkPercent: number;
  color: string;
};

const PRIORITY_COLOR: Record<TriagePriority, string> = {
  IMMEDIATE: '#DC2626',
  URGENT: '#F97316',
  LESS_URGENT: '#FBBF24',
  NON_URGENT: '#22C55E',
};

// Counts sum to 1,256 (TRIAGE_STATS 'total'); times ascend and accuracy
// descends with decreasing acuity, mirroring the mockup's shape compressed
// from 5 tiers into the canonical 4.
const ACUITY_ROWS: Record<
  TriagePriority,
  { count: number; avgMinutes: number; accuracyPercent: number; benchmarkPercent: number }
> = {
  IMMEDIATE: { count: 145, avgMinutes: 9, accuracyPercent: 96.9, benchmarkPercent: 95 },
  URGENT: { count: 495, avgMinutes: 15, accuracyPercent: 94.5, benchmarkPercent: 91 },
  LESS_URGENT: { count: 461, avgMinutes: 26, accuracyPercent: 92.6, benchmarkPercent: 88 },
  NON_URGENT: { count: 155, avgMinutes: 32, accuracyPercent: 91.2, benchmarkPercent: 85 },
};

export const TRIAGE_ACUITY_BREAKDOWN: AcuityTriageRow[] = (
  ['IMMEDIATE', 'URGENT', 'LESS_URGENT', 'NON_URGENT'] as TriagePriority[]
).map((priority) => ({
  priority,
  label: TRIAGE_DISPLAY[priority].label,
  ...ACUITY_ROWS[priority],
  color: PRIORITY_COLOR[priority],
}));

export const TOTAL_TRIAGED = TRIAGE_ACUITY_BREAKDOWN.reduce((sum, a) => sum + a.count, 0);

export type NursePerformanceRow = {
  id: string;
  name: string;
  totalTriaged: number;
  avgOverallMinutes: number;
  avgByPriority: Record<TriagePriority, number>;
  accuracyPercent: number;
  retriagedCount: number;
  retriagedPercent: number;
  under5Count: number;
  under5Percent: number;
  trendPercent: number;
  trendDirection: 'up' | 'down';
  location: string;
  shift: string;
};

function avgByPriorityFor(overall: number): Record<TriagePriority, number> {
  return {
    IMMEDIATE: Math.max(4, overall - 8),
    URGENT: Math.max(6, overall - 3),
    LESS_URGENT: overall + 2,
    NON_URGENT: overall + 8,
  };
}

export const NURSE_PERFORMANCE: NursePerformanceRow[] = [
  {
    id: 'nrs-1',
    name: 'Chioma Nwosu',
    totalTriaged: 186,
    avgOverallMinutes: 18,
    avgByPriority: avgByPriorityFor(18),
    accuracyPercent: 97.6,
    retriagedCount: 5,
    retriagedPercent: 2.7,
    under5Count: 152,
    under5Percent: 81.7,
    trendPercent: 4.3,
    trendDirection: 'up',
    location: REPORT_LOCATIONS[0]!,
    shift: REPORT_SHIFTS[0]!,
  },
  {
    id: 'nrs-2',
    name: 'Adaeze Okafor',
    totalTriaged: 172,
    avgOverallMinutes: 20,
    avgByPriority: avgByPriorityFor(20),
    accuracyPercent: 96.1,
    retriagedCount: 7,
    retriagedPercent: 4.1,
    under5Count: 128,
    under5Percent: 74.4,
    trendPercent: 2.1,
    trendDirection: 'up',
    location: REPORT_LOCATIONS[1 % REPORT_LOCATIONS.length]!,
    shift: REPORT_SHIFTS[1 % REPORT_SHIFTS.length]!,
  },
  {
    id: 'nrs-3',
    name: 'Ibrahim Musa',
    totalTriaged: 168,
    avgOverallMinutes: 21,
    avgByPriority: avgByPriorityFor(21),
    accuracyPercent: 94.8,
    retriagedCount: 8,
    retriagedPercent: 4.8,
    under5Count: 118,
    under5Percent: 70.2,
    trendPercent: 1.2,
    trendDirection: 'up',
    location: REPORT_LOCATIONS[2 % REPORT_LOCATIONS.length]!,
    shift: REPORT_SHIFTS[2 % REPORT_SHIFTS.length]!,
  },
  {
    id: 'nrs-4',
    name: 'Mary Ada',
    totalTriaged: 154,
    avgOverallMinutes: 22,
    avgByPriority: avgByPriorityFor(22),
    accuracyPercent: 93.4,
    retriagedCount: 9,
    retriagedPercent: 5.8,
    under5Count: 106,
    under5Percent: 68.8,
    trendPercent: 0.6,
    trendDirection: 'down',
    location: REPORT_LOCATIONS[3 % REPORT_LOCATIONS.length]!,
    shift: REPORT_SHIFTS[3 % REPORT_SHIFTS.length]!,
  },
  {
    id: 'nrs-5',
    name: 'Tunde Adebayo',
    totalTriaged: 148,
    avgOverallMinutes: 23,
    avgByPriority: avgByPriorityFor(23),
    accuracyPercent: 92.1,
    retriagedCount: 11,
    retriagedPercent: 7.4,
    under5Count: 92,
    under5Percent: 62.2,
    trendPercent: 1.8,
    trendDirection: 'down',
    location: REPORT_LOCATIONS[4 % REPORT_LOCATIONS.length]!,
    shift: REPORT_SHIFTS[4 % REPORT_SHIFTS.length]!,
  },
  {
    id: 'nrs-6',
    name: 'Grace Eze',
    totalTriaged: 134,
    avgOverallMinutes: 24,
    avgByPriority: avgByPriorityFor(24),
    accuracyPercent: 90.3,
    retriagedCount: 12,
    retriagedPercent: 9.0,
    under5Count: 76,
    under5Percent: 56.7,
    trendPercent: 2.3,
    trendDirection: 'down',
    location: REPORT_LOCATIONS[5 % REPORT_LOCATIONS.length]!,
    shift: REPORT_SHIFTS[5 % REPORT_SHIFTS.length]!,
  },
];

export type TriageInsights = {
  busiestDay: string;
  busiestDayDetail: string;
  peakHour: string;
  bestPerformingNurse: string;
  bestPerformingNurseDetail: string;
  longestAvgTriageLabel: string;
  longestAvgTriageDetail: string;
  improvementPercent: number;
};

export const TRIAGE_INSIGHTS: TriageInsights = {
  busiestDay: 'Yesterday',
  busiestDayDetail: '286 triaged',
  peakHour: '16:00 – 17:00',
  bestPerformingNurse: 'Chioma Nwosu',
  bestPerformingNurseDetail: 'Accuracy 97.6%',
  longestAvgTriageLabel: 'Non-Urgent',
  longestAvgTriageDetail: '32m',
  improvementPercent: 3.2,
};
