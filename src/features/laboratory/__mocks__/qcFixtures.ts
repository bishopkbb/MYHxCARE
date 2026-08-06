/**
 * Mock fixtures for Quality Control (QC) — a domain with zero prior art
 * anywhere in the codebase (instrument control runs, control lots,
 * Levey-Jennings/Westgard statistical QC, corrective actions). The
 * Laboratory Dashboard's own `QC_TODAY` in `labDashboardFixtures.ts` was a
 * placeholder for exactly this domain — once this file exists, the
 * Dashboard reads real counts derived from `QC_RUNS` instead.
 *
 * Westgard evaluation is a function of (observed, mean, sd), not
 * per-fixture hand-tagging: a result flags `1-2s` beyond 2 SD (warning —
 * doesn't fail alone), `1-3s` beyond 3 SD (reject), or `2-2s` when two
 * consecutive runs for the same instrument+test+level land beyond 2 SD on
 * the same side. This is the simplified multirule real labs run day to day.
 */

import type { LabDepartment } from './labResultFixtures';

export type QcLevel = 'Level 1' | 'Level 2';

export type QcTestDefinition = {
  name: string;
  unit: string;
  levels: Record<QcLevel, { mean: number; sd: number }>;
};

export type QcInstrument = {
  id: string;
  name: string;
  department: LabDepartment;
  testGroup: string;
  tests: QcTestDefinition[];
};

export const QC_INSTRUMENTS: QcInstrument[] = [
  {
    id: 'chem-1',
    name: 'Chemistry Analyzer 1',
    department: 'Biochemistry',
    testGroup: 'Chemistry',
    tests: [
      {
        name: 'Glucose',
        unit: 'mg/dL',
        levels: { 'Level 1': { mean: 100, sd: 2.5 }, 'Level 2': { mean: 180, sd: 4.5 } },
      },
      {
        name: 'Urea',
        unit: 'mg/dL',
        levels: { 'Level 1': { mean: 23, sd: 2.5 }, 'Level 2': { mean: 55, sd: 4 } },
      },
      {
        name: 'Creatinine',
        unit: 'mg/dL',
        levels: { 'Level 1': { mean: 0.9, sd: 0.15 }, 'Level 2': { mean: 2.4, sd: 0.2 } },
      },
      {
        name: 'ALT (SGPT)',
        unit: 'U/L',
        levels: { 'Level 1': { mean: 25, sd: 7.5 }, 'Level 2': { mean: 85, sd: 10 } },
      },
      {
        name: 'AST (SGOT)',
        unit: 'U/L',
        levels: { 'Level 1': { mean: 25, sd: 7.5 }, 'Level 2': { mean: 85, sd: 10 } },
      },
    ],
  },
  {
    id: 'hema-1',
    name: 'Hematology Analyzer',
    department: 'Hematology',
    testGroup: 'Hematology',
    tests: [
      {
        name: 'WBC',
        unit: '10⁹/L',
        levels: { 'Level 1': { mean: 7.5, sd: 0.5 }, 'Level 2': { mean: 3.2, sd: 0.3 } },
      },
      {
        name: 'RBC',
        unit: '10¹²/L',
        levels: { 'Level 1': { mean: 4.8, sd: 0.2 }, 'Level 2': { mean: 3.1, sd: 0.2 } },
      },
      {
        name: 'Hemoglobin',
        unit: 'g/dL',
        levels: { 'Level 1': { mean: 14, sd: 0.5 }, 'Level 2': { mean: 9.5, sd: 0.5 } },
      },
      {
        name: 'Hematocrit',
        unit: '%',
        levels: { 'Level 1': { mean: 42, sd: 1.5 }, 'Level 2': { mean: 29, sd: 1.5 } },
      },
      {
        name: 'Platelets',
        unit: '10⁹/L',
        levels: { 'Level 1': { mean: 250, sd: 15 }, 'Level 2': { mean: 90, sd: 10 } },
      },
    ],
  },
  {
    id: 'elec-1',
    name: 'Electrolyte Analyzer',
    department: 'Biochemistry',
    testGroup: 'Electrolytes',
    tests: [
      {
        name: 'Sodium',
        unit: 'mmol/L',
        levels: { 'Level 1': { mean: 140, sd: 2 }, 'Level 2': { mean: 125, sd: 2.5 } },
      },
      {
        name: 'Potassium',
        unit: 'mmol/L',
        levels: { 'Level 1': { mean: 4.2, sd: 0.15 }, 'Level 2': { mean: 6.0, sd: 0.2 } },
      },
      {
        name: 'Chloride',
        unit: 'mmol/L',
        levels: { 'Level 1': { mean: 102, sd: 2 }, 'Level 2': { mean: 88, sd: 2.5 } },
      },
      {
        name: 'Bicarbonate',
        unit: 'mmol/L',
        levels: { 'Level 1': { mean: 24, sd: 1.5 }, 'Level 2': { mean: 15, sd: 1.5 } },
      },
    ],
  },
  {
    id: 'immuno-1',
    name: 'Immuno Analyzer',
    department: 'Immunology',
    testGroup: 'Immunology',
    tests: [
      {
        name: 'TSH',
        unit: 'mIU/L',
        levels: { 'Level 1': { mean: 2.5, sd: 0.3 }, 'Level 2': { mean: 12, sd: 1 } },
      },
      {
        name: 'Free T4',
        unit: 'ng/dL',
        levels: { 'Level 1': { mean: 1.2, sd: 0.1 }, 'Level 2': { mean: 0.5, sd: 0.08 } },
      },
      {
        name: 'HbA1c',
        unit: '%',
        levels: { 'Level 1': { mean: 5.5, sd: 0.2 }, 'Level 2': { mean: 9.5, sd: 0.3 } },
      },
    ],
  },
  {
    id: 'coag-1',
    name: 'Coagulation Analyzer',
    department: 'Coagulation',
    testGroup: 'Coagulation',
    tests: [
      {
        name: 'PT',
        unit: 'sec',
        levels: { 'Level 1': { mean: 12.5, sd: 0.5 }, 'Level 2': { mean: 22, sd: 1 } },
      },
      {
        name: 'APTT',
        unit: 'sec',
        levels: { 'Level 1': { mean: 30, sd: 1.5 }, 'Level 2': { mean: 55, sd: 2.5 } },
      },
      {
        name: 'INR',
        unit: 'ratio',
        levels: { 'Level 1': { mean: 1.0, sd: 0.05 }, 'Level 2': { mean: 2.2, sd: 0.15 } },
      },
    ],
  },
];

export function getInstrument(id: string): QcInstrument | undefined {
  return QC_INSTRUMENTS.find((i) => i.id === id);
}

// ── Control lots ─────────────────────────────────────────────────────────────

export type QcLotStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Depleted';

export type QcLot = {
  id: string;
  instrumentId: string;
  levels: QcLevel[];
  manufacturer: string;
  openedAt: string;
  expiresAt: string;
  status: QcLotStatus;
};

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function yymmdd(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

const LOT_PREFIX: Record<string, string> = {
  'chem-1': 'CHM',
  'hema-1': 'HMT',
  'elec-1': 'ELE',
  'immuno-1': 'IMM',
  'coag-1': 'COA',
};

const MANUFACTURER: Record<string, string> = {
  'chem-1': 'Bio-Rad Laboratories',
  'hema-1': 'Sysmex Corporation',
  'elec-1': 'Roche Diagnostics',
  'immuno-1': 'Roche Diagnostics',
  'coag-1': 'Werfen (Instrumentation Laboratory)',
};

const openedAt = atOffset(-4, 8, 0);
const activeLotExpiresAt = atOffset(86, 0, 0);

export const QC_LOTS: QcLot[] = [
  ...QC_INSTRUMENTS.map((inst) => ({
    id: `${LOT_PREFIX[inst.id]}-LT-${yymmdd(openedAt)}-A`,
    instrumentId: inst.id,
    levels: ['Level 1', 'Level 2'] as QcLevel[],
    manufacturer: MANUFACTURER[inst.id]!,
    openedAt,
    expiresAt: activeLotExpiresAt,
    status: 'Active' as QcLotStatus,
  })),
  {
    id: `CHM-LT-${yymmdd(atOffset(-49, 8, 0))}-C`,
    instrumentId: 'chem-1',
    levels: ['Level 1', 'Level 2'],
    manufacturer: MANUFACTURER['chem-1']!,
    openedAt: atOffset(-49, 8, 0),
    expiresAt: atOffset(-19, 0, 0),
    status: 'Expired',
  },
  {
    id: `HMT-LT-${yymmdd(atOffset(-40, 8, 0))}-A`,
    instrumentId: 'hema-1',
    levels: ['Level 1', 'Level 2'],
    manufacturer: MANUFACTURER['hema-1']!,
    openedAt: atOffset(-40, 8, 0),
    expiresAt: atOffset(4, 0, 0),
    status: 'Expiring Soon',
  },
];

export function getLot(id: string): QcLot | undefined {
  return QC_LOTS.find((l) => l.id === id);
}

function activeLotFor(instrumentId: string): QcLot {
  return QC_LOTS.find((l) => l.instrumentId === instrumentId && l.status === 'Active')!;
}

// ── QC runs ──────────────────────────────────────────────────────────────────

export type QcType = 'Internal' | 'External';
export type QcRunStatus = 'Passed' | 'Failed' | 'In Progress';
export type WestgardRule = '1-2s' | '1-3s' | '2-2s';

export type QcControlResult = {
  test: string;
  unit: string;
  targetLow: number;
  targetHigh: number;
  observed: number | null;
  status: 'Passed' | 'Failed' | 'Pending';
  rule?: WestgardRule;
};

export type QcRun = {
  id: string;
  instrumentId: string;
  level: QcLevel;
  qcType: QcType;
  lotId: string;
  runAt: string;
  status: QcRunStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
  results: QcControlResult[];
};

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function targetRange(mean: number, sd: number, dp: number): { low: number; high: number } {
  return { low: round(mean - 2 * sd, dp), high: round(mean + 2 * sd, dp) };
}

function decimalsFor(unit: string): number {
  if (unit === 'ratio' || unit.includes('mg/dL') || unit.startsWith('10')) return 1;
  if (unit === 'mmol/L' || unit === 'sec' || unit === '%') return 1;
  return 2;
}

// Deterministic pseudo-random generator (mulberry32) so the seeded data is
// stable across reloads instead of reshuffling on every dev-server refresh.
function mulberry32(seed: number): () => number {
  let s = seed;
  return function random() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller gaussian sample in [-1, 1]-ish SD units.
function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-6);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const REVIEWERS = ['Mary Nwankwo', 'Dr. C. Ezenwa', 'Adaora Ugwu', 'Chukwuemeka Ugwu'];

function evaluateResult(
  observed: number,
  mean: number,
  sd: number,
): { status: 'Passed' | 'Failed'; rule?: WestgardRule } {
  const dev = Math.abs(observed - mean) / sd;
  if (dev > 3) return { status: 'Failed', rule: '1-3s' };
  if (dev > 2) return { status: 'Passed', rule: '1-2s' };
  return { status: 'Passed' };
}

const rng = mulberry32(20260630);
let seq = 0;
const runIdDate = yymmdd(new Date().toISOString());

function nextRunId(): string {
  seq += 1;
  return `QCR-${runIdDate}-${String(seq).padStart(4, '0')}`;
}

// Tracks the last out-of-2SD side ('+' | '-') per instrument+test+level, so
// two consecutive same-side warnings can be escalated to a real 2-2s reject.
const lastSide = new Map<string, '+' | '-'>();

function buildResults(
  inst: QcInstrument,
  level: QcLevel,
  overrides: Record<string, number> = {},
): QcControlResult[] {
  return inst.tests.map((test) => {
    const { mean, sd } = test.levels[level];
    const dp = decimalsFor(test.unit);
    const { low, high } = targetRange(mean, sd, dp);
    const observed =
      overrides[test.name] !== undefined
        ? overrides[test.name]!
        : round(mean + gaussian(rng) * sd, dp);

    const evaluated = evaluateResult(observed, mean, sd);
    const key = `${inst.id}|${test.name}|${level}`;
    let rule = evaluated.rule;
    let status = evaluated.status;

    if (rule === '1-2s') {
      const side: '+' | '-' = observed >= mean ? '+' : '-';
      if (lastSide.get(key) === side) {
        rule = '2-2s';
        status = 'Failed';
      }
      lastSide.set(key, side);
    } else if (rule !== '1-3s') {
      lastSide.delete(key);
    }

    return {
      test: test.name,
      unit: test.unit,
      targetLow: low,
      targetHigh: high,
      observed,
      status,
      ...(rule ? { rule } : {}),
    };
  });
}

function runStatusFromResults(results: QcControlResult[]): QcRunStatus {
  return results.some((r) => r.status === 'Failed') ? 'Failed' : 'Passed';
}

function pickReviewer(dayOffset: number, idx: number): string {
  return REVIEWERS[(Math.abs(dayOffset) + idx) % REVIEWERS.length]!;
}

const runs: QcRun[] = [];

// ── Historical days (oldest first, so sequence numbers ascend naturally) ────
for (let dayOffset = -4; dayOffset <= -1; dayOffset++) {
  QC_INSTRUMENTS.forEach((inst, idx) => {
    (['Level 1', 'Level 2'] as QcLevel[]).forEach((level, levelIdx) => {
      const overrides: Record<string, number> = {};
      // One deliberate reject and one deliberate 2-2s pair for realistic
      // Westgard Rules / Corrective Actions content beyond pure chance.
      if (dayOffset === -2 && inst.id === 'chem-1' && level === 'Level 2') {
        overrides['Creatinine'] = 3.4; // > mean(2.4) + 3*sd(0.2) = 3.0 -> 1-3s
      }
      if ((dayOffset === -3 || dayOffset === -2) && inst.id === 'elec-1' && level === 'Level 1') {
        overrides['Sodium'] = 145.5; // mean 140, sd 2 -> +2.75 SD both days -> 2-2s on 2nd
      }

      const runAt = atOffset(dayOffset, 7 + idx, 15 * levelIdx);
      const results = buildResults(inst, level, overrides);
      runs.push({
        id: nextRunId(),
        instrumentId: inst.id,
        level,
        qcType: 'Internal',
        lotId: activeLotFor(inst.id).id,
        runAt,
        status: runStatusFromResults(results),
        reviewedBy: pickReviewer(dayOffset, idx),
        reviewedAt: runAt,
        results,
      });
    });
  });
}

// ── Today — hand-authored to closely mirror the reference design's own
// worked example (Chemistry Analyzer 1 Level 1's exact observed values,
// Hematology Analyzer's Level 2 reject, Immuno Analyzer's two in-progress
// runs with no reviewer/results yet). ───────────────────────────────────────
const chem = getInstrument('chem-1')!;
const hema = getInstrument('hema-1')!;
const elec = getInstrument('elec-1')!;
const immuno = getInstrument('immuno-1')!;
const coag = getInstrument('coag-1')!;

const chemL1Results = buildResults(chem, 'Level 1', {
  Glucose: 98.6,
  Urea: 21.4,
  Creatinine: 0.9,
  'ALT (SGPT)': 22,
  'AST (SGOT)': 24,
});
runs.push({
  id: nextRunId(),
  instrumentId: chem.id,
  level: 'Level 1',
  qcType: 'Internal',
  lotId: activeLotFor(chem.id).id,
  runAt: atOffset(0, 8, 15),
  status: runStatusFromResults(chemL1Results),
  reviewedBy: 'Mary Nwankwo',
  reviewedAt: atOffset(0, 8, 28),
  comments: 'All parameters within acceptable range.',
  results: chemL1Results,
});

const chemL2Results = buildResults(chem, 'Level 2');
runs.push({
  id: nextRunId(),
  instrumentId: chem.id,
  level: 'Level 2',
  qcType: 'Internal',
  lotId: activeLotFor(chem.id).id,
  runAt: atOffset(0, 8, 15),
  status: runStatusFromResults(chemL2Results),
  reviewedBy: 'Mary Nwankwo',
  reviewedAt: atOffset(0, 8, 29),
  results: chemL2Results,
});

const hemaL1Results = buildResults(hema, 'Level 1');
runs.push({
  id: nextRunId(),
  instrumentId: hema.id,
  level: 'Level 1',
  qcType: 'Internal',
  lotId: activeLotFor(hema.id).id,
  runAt: atOffset(0, 7, 50),
  status: runStatusFromResults(hemaL1Results),
  reviewedBy: 'Dr. C. Ezenwa',
  reviewedAt: atOffset(0, 8, 5),
  results: hemaL1Results,
});

const hemaL2Results = buildResults(hema, 'Level 2', { WBC: 1.8 }); // < mean(3.2) - 3*sd(0.3)=2.3 -> 1-3s reject
runs.push({
  id: nextRunId(),
  instrumentId: hema.id,
  level: 'Level 2',
  qcType: 'Internal',
  lotId: activeLotFor(hema.id).id,
  runAt: atOffset(0, 7, 50),
  status: runStatusFromResults(hemaL2Results),
  reviewedBy: 'Dr. C. Ezenwa',
  reviewedAt: atOffset(0, 8, 6),
  comments: 'WBC control out of range — repeat run requested.',
  results: hemaL2Results,
});

const elecL1Results = buildResults(elec, 'Level 1');
runs.push({
  id: nextRunId(),
  instrumentId: elec.id,
  level: 'Level 1',
  qcType: 'Internal',
  lotId: activeLotFor(elec.id).id,
  runAt: atOffset(0, 7, 20),
  status: runStatusFromResults(elecL1Results),
  reviewedBy: 'Mary Nwankwo',
  reviewedAt: atOffset(0, 7, 35),
  results: elecL1Results,
});

const elecL2Results = buildResults(elec, 'Level 2');
runs.push({
  id: nextRunId(),
  instrumentId: elec.id,
  level: 'Level 2',
  qcType: 'Internal',
  lotId: activeLotFor(elec.id).id,
  runAt: atOffset(0, 7, 20),
  status: runStatusFromResults(elecL2Results),
  reviewedBy: 'Mary Nwankwo',
  reviewedAt: atOffset(0, 7, 36),
  results: elecL2Results,
});

// In-progress: results logged but not yet reviewed (no reviewedBy/status per
// test resolved) — every result is honestly 'Pending', not fabricated.
function pendingResults(inst: QcInstrument, level: QcLevel): QcControlResult[] {
  return inst.tests.map((test) => {
    const { mean, sd } = test.levels[level];
    const dp = decimalsFor(test.unit);
    const { low, high } = targetRange(mean, sd, dp);
    return {
      test: test.name,
      unit: test.unit,
      targetLow: low,
      targetHigh: high,
      observed: null,
      status: 'Pending',
    };
  });
}

runs.push({
  id: nextRunId(),
  instrumentId: immuno.id,
  level: 'Level 1',
  qcType: 'Internal',
  lotId: activeLotFor(immuno.id).id,
  runAt: atOffset(0, 7, 0),
  status: 'In Progress',
  results: pendingResults(immuno, 'Level 1'),
});

runs.push({
  id: nextRunId(),
  instrumentId: immuno.id,
  level: 'Level 2',
  qcType: 'Internal',
  lotId: activeLotFor(immuno.id).id,
  runAt: atOffset(0, 6, 45),
  status: 'In Progress',
  results: pendingResults(immuno, 'Level 2'),
});

const coagL1Results = buildResults(coag, 'Level 1');
runs.push({
  id: nextRunId(),
  instrumentId: coag.id,
  level: 'Level 1',
  qcType: 'Internal',
  lotId: activeLotFor(coag.id).id,
  runAt: atOffset(-1, 22, 10),
  status: runStatusFromResults(coagL1Results),
  reviewedBy: 'Dr. C. Ezenwa',
  reviewedAt: atOffset(-1, 22, 22),
  results: coagL1Results,
});

const coagL2Results = buildResults(coag, 'Level 2');
runs.push({
  id: nextRunId(),
  instrumentId: coag.id,
  level: 'Level 2',
  qcType: 'Internal',
  lotId: activeLotFor(coag.id).id,
  runAt: atOffset(-1, 22, 10),
  status: runStatusFromResults(coagL2Results),
  reviewedBy: 'Dr. C. Ezenwa',
  reviewedAt: atOffset(-1, 22, 23),
  results: coagL2Results,
});

// Newest first, matching every other Lab screen's table ordering convention.
export const QC_RUNS: QcRun[] = [...runs].sort(
  (a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime(),
);

// ── Corrective actions — derived 1:1 from every Failed run's flagged
// result(s), not a separately fabricated list. ─────────────────────────────

export type CorrectiveActionStatus = 'Open' | 'In Progress' | 'Resolved';

export type CorrectiveAction = {
  id: string;
  qcRunId: string;
  instrumentName: string;
  test: string;
  level: QcLevel;
  rule: WestgardRule;
  issue: string;
  assignedTo: string;
  raisedAt: string;
  status: CorrectiveActionStatus;
  rootCause?: string;
  actionTaken?: string;
  resolvedAt?: string;
};

function deriveCorrectiveActions(): CorrectiveAction[] {
  const actions: CorrectiveAction[] = [];
  for (const run of QC_RUNS) {
    if (run.status !== 'Failed') continue;
    const inst = getInstrument(run.instrumentId)!;
    for (const result of run.results) {
      if (result.status !== 'Failed' || !result.rule) continue;
      const isOld = new Date(run.runAt).getTime() < new Date(atOffset(-2, 0, 0)).getTime();
      actions.push({
        id: `ca-${run.id}-${result.test.replace(/\s+/g, '-')}`,
        qcRunId: run.id,
        instrumentName: inst.name,
        test: result.test,
        level: run.level,
        rule: result.rule,
        issue: `${result.rule} violation — ${run.level} ${result.test} (${result.observed} ${result.unit}, target ${result.targetLow}–${result.targetHigh})`,
        assignedTo: run.reviewedBy ?? 'Unassigned',
        raisedAt: run.runAt,
        status: isOld ? 'Resolved' : result.rule === '2-2s' ? 'In Progress' : 'Open',
        ...(isOld
          ? {
              rootCause:
                'Control material handling error — vial not equilibrated to room temperature before use.',
              actionTaken:
                'Re-ran QC after proper equilibration; result within range on repeat. Staff re-briefed on lot handling SOP.',
              resolvedAt: atOffset(-1, 9, 0),
            }
          : {}),
      });
    }
  }
  return actions;
}

export const CORRECTIVE_ACTIONS: CorrectiveAction[] = deriveCorrectiveActions();
