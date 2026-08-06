'use client';

/**
 * The Quality Control (QC) store — real, shared, reactive state for
 * instrument control runs, control lots, and corrective actions. Same
 * `useSyncExternalStore` module-singleton pattern as `labResultStore.ts`:
 * logging a QC run from the New QC Run modal, or adding a lot from QC Setup,
 * is immediately visible everywhere else that reads this store in the same
 * session — including the Laboratory Dashboard's QC Today panel, which reads
 * `getQcTodaySummary()` instead of the old static `QC_TODAY` placeholder in
 * `labDashboardFixtures.ts`.
 *
 * Swap out by pointing these actions at real `POST /lab/qc/runs` /
 * `POST /lab/qc/lots` endpoints once that domain exists on the backend.
 */

import { useSyncExternalStore } from 'react';

import {
  CORRECTIVE_ACTIONS,
  QC_INSTRUMENTS,
  QC_LOTS,
  QC_RUNS,
  getInstrument,
  type CorrectiveAction,
  type CorrectiveActionStatus,
  type QcControlResult,
  type QcLevel,
  type QcLot,
  type QcRun,
  type QcRunStatus,
  type QcType,
  type WestgardRule,
} from '@/features/laboratory/__mocks__/qcFixtures';

let runs: QcRun[] = [...QC_RUNS];
let lots: QcLot[] = [...QC_LOTS];
let correctiveActions: CorrectiveAction[] = [...CORRECTIVE_ACTIONS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getRunsSnapshot(): QcRun[] {
  return runs;
}
function getRunsServerSnapshot(): QcRun[] {
  return QC_RUNS;
}
export function useQcRuns(): QcRun[] {
  return useSyncExternalStore(subscribe, getRunsSnapshot, getRunsServerSnapshot);
}

function getLotsSnapshot(): QcLot[] {
  return lots;
}
function getLotsServerSnapshot(): QcLot[] {
  return QC_LOTS;
}
export function useQcLots(): QcLot[] {
  return useSyncExternalStore(subscribe, getLotsSnapshot, getLotsServerSnapshot);
}

function getActionsSnapshot(): CorrectiveAction[] {
  return correctiveActions;
}
function getActionsServerSnapshot(): CorrectiveAction[] {
  return CORRECTIVE_ACTIONS;
}
export function useCorrectiveActions(): CorrectiveAction[] {
  return useSyncExternalStore(subscribe, getActionsSnapshot, getActionsServerSnapshot);
}

// ── Westgard evaluation — same rules qcFixtures.ts seeds with, exported so
// the New QC Run modal evaluates freshly-entered values the identical way. ──

export function evaluateQcResult(
  observed: number,
  mean: number,
  sd: number,
): { status: 'Passed' | 'Failed'; rule?: WestgardRule } {
  const dev = Math.abs(observed - mean) / sd;
  if (dev > 3) return { status: 'Failed', rule: '1-3s' };
  if (dev > 2) return { status: 'Passed', rule: '1-2s' };
  return { status: 'Passed' };
}

/** Most recent completed run for the same instrument+test+level, used to
 * check the 2-2s rule (two consecutive same-side 1-2s warnings) against. */
function findPriorResult(
  instrumentId: string,
  test: string,
  level: QcLevel,
  beforeRunAt: string,
): QcControlResult | undefined {
  const prior = runs
    .filter((r) => r.instrumentId === instrumentId && r.level === level && r.runAt < beforeRunAt)
    .sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime())[0];
  return prior?.results.find((res) => res.test === test);
}

export type NewQcRunInput = {
  instrumentId: string;
  level: QcLevel;
  qcType: QcType;
  lotId: string;
  runAt: string;
  reviewedBy: string;
  comments?: string;
  observedByTest: Record<string, number>;
  saveAsInProgress?: boolean;
};

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Logs a new QC run — evaluates every entered value against its test's
 * target range (Westgard 1-2s/1-3s/2-2s), derives per-test and run-level
 * status, and prepends it to the store. Mirrors `qcFixtures.ts`'s own seed
 * generator so live-logged runs are scored identically to seeded history. */
export function addQcRun(input: NewQcRunInput): QcRun {
  const instrument = getInstrument(input.instrumentId)!;
  const id = `QCR-${yymmdd(input.runAt)}-${String(nextSeq()).padStart(4, '0')}`;

  const results: QcControlResult[] = instrument.tests.map((test) => {
    const { mean, sd } = test.levels[input.level];
    const observed = input.observedByTest[test.name];
    if (input.saveAsInProgress || observed === undefined) {
      return {
        test: test.name,
        unit: test.unit,
        targetLow: round(mean - 2 * sd, 2),
        targetHigh: round(mean + 2 * sd, 2),
        observed: observed ?? null,
        status: 'Pending',
      };
    }

    const evaluated = evaluateQcResult(observed, mean, sd);
    let rule = evaluated.rule;
    let status = evaluated.status;

    if (rule === '1-2s') {
      const side: 'above' | 'below' = observed >= mean ? 'above' : 'below';
      const prior = findPriorResult(input.instrumentId, test.name, input.level, input.runAt);
      if (prior?.rule === '1-2s') {
        const priorSide: 'above' | 'below' = prior.observed! >= mean ? 'above' : 'below';
        if (priorSide === side) {
          rule = '2-2s';
          status = 'Failed';
        }
      }
    }

    return {
      test: test.name,
      unit: test.unit,
      targetLow: round(mean - 2 * sd, 2),
      targetHigh: round(mean + 2 * sd, 2),
      observed,
      status,
      ...(rule ? { rule } : {}),
    };
  });

  const runStatus: QcRunStatus = input.saveAsInProgress
    ? 'In Progress'
    : results.some((r) => r.status === 'Failed')
      ? 'Failed'
      : 'Passed';

  const run: QcRun = {
    id,
    instrumentId: input.instrumentId,
    level: input.level,
    qcType: input.qcType,
    lotId: input.lotId,
    runAt: input.runAt,
    status: runStatus,
    results,
    ...(input.saveAsInProgress
      ? {}
      : { reviewedBy: input.reviewedBy, reviewedAt: new Date().toISOString() }),
    ...(input.comments ? { comments: input.comments } : {}),
  };

  runs = [run, ...runs];

  if (runStatus === 'Failed') {
    const instrumentName = instrument.name;
    const newActions: CorrectiveAction[] = results
      .filter((r) => r.status === 'Failed' && r.rule)
      .map((r) => ({
        id: `ca-${run.id}-${r.test.replace(/\s+/g, '-')}`,
        qcRunId: run.id,
        instrumentName,
        test: r.test,
        level: run.level,
        rule: r.rule!,
        issue: `${r.rule} violation — ${run.level} ${r.test} (${r.observed} ${r.unit}, target ${r.targetLow}–${r.targetHigh})`,
        assignedTo: input.reviewedBy,
        raisedAt: run.runAt,
        status: 'Open' as CorrectiveActionStatus,
      }));
    correctiveActions = [...newActions, ...correctiveActions];
  }

  emit();
  return run;
}

let seqCounter = runs.length;
function nextSeq(): number {
  seqCounter += 1;
  return seqCounter;
}

function yymmdd(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export type NewQcLotInput = {
  instrumentId: string;
  levels: QcLevel[];
  manufacturer: string;
  openedAt: string;
  expiresAt: string;
};

export function addQcLot(input: NewQcLotInput): QcLot {
  const prefix = LOT_PREFIX[input.instrumentId] ?? 'LOT';
  const existingSuffixes = lots
    .filter((l) => l.instrumentId === input.instrumentId)
    .map((l) => l.id.slice(-1));
  const nextLetter = String.fromCharCode(
    65 + existingSuffixes.filter((s) => /[A-Z]/.test(s)).length,
  );
  const lot: QcLot = {
    id: `${prefix}-LT-${yymmdd(input.openedAt)}-${nextLetter}`,
    instrumentId: input.instrumentId,
    levels: input.levels,
    manufacturer: input.manufacturer,
    openedAt: input.openedAt,
    expiresAt: input.expiresAt,
    status: 'Active',
  };
  lots = [lot, ...lots];
  emit();
  return lot;
}

const LOT_PREFIX: Record<string, string> = {
  'chem-1': 'CHM',
  'hema-1': 'HMT',
  'elec-1': 'ELE',
  'immuno-1': 'IMM',
  'coag-1': 'COA',
};

export function updateQcLot(id: string, patch: Partial<Pick<QcLot, 'status' | 'expiresAt'>>): void {
  const idx = lots.findIndex((l) => l.id === id);
  if (idx === -1) return;
  lots = lots.map((l, i) => (i === idx ? { ...l, ...patch } : l));
  emit();
}

export type CorrectiveActionPatch = Partial<
  Pick<CorrectiveAction, 'status' | 'rootCause' | 'actionTaken' | 'resolvedAt'>
>;

export function updateCorrectiveAction(id: string, patch: CorrectiveActionPatch): void {
  const idx = correctiveActions.findIndex((a) => a.id === id);
  if (idx === -1) return;
  const resolvedAt =
    patch.status === 'Resolved' && !correctiveActions[idx]!.resolvedAt
      ? new Date().toISOString()
      : patch.resolvedAt;
  correctiveActions = correctiveActions.map((a, i) =>
    i === idx ? { ...a, ...patch, ...(resolvedAt ? { resolvedAt } : {}) } : a,
  );
  emit();
}

// ── Derived selectors ────────────────────────────────────────────────────────

function isSameCalendarDay(iso: string, dayOffset: number): boolean {
  const d = new Date(iso);
  const target = new Date();
  target.setDate(target.getDate() + dayOffset);
  return (
    d.getFullYear() === target.getFullYear() &&
    d.getMonth() === target.getMonth() &&
    d.getDate() === target.getDate()
  );
}

export type QcTodaySummary = {
  runsToday: number;
  passed: number;
  failed: number;
  inProgress: number;
  runsTodayDeltaPct: number | null;
  passedDeltaPct: number | null;
  failedDeltaPct: number | null;
  inProgressDeltaPct: number | null;
};

function pctDelta(today: number, yesterday: number): number | null {
  if (yesterday === 0) return today === 0 ? null : 100;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

/** Live replacement for the Dashboard's static `QC_TODAY` — every count and
 * "vs yesterday" delta is derived from the same `QC_RUNS`/logged runs, not a
 * fabricated percentage. */
export function getQcTodaySummary(): QcTodaySummary {
  const today = runs.filter((r) => isSameCalendarDay(r.runAt, 0));
  const yesterday = runs.filter((r) => isSameCalendarDay(r.runAt, -1));

  const count = (list: QcRun[], status: QcRunStatus) =>
    list.filter((r) => r.status === status).length;

  const passed = count(today, 'Passed');
  const failed = count(today, 'Failed');
  const inProgress = count(today, 'In Progress');

  return {
    runsToday: today.length,
    passed,
    failed,
    inProgress,
    runsTodayDeltaPct: pctDelta(today.length, yesterday.length),
    passedDeltaPct: pctDelta(passed, count(yesterday, 'Passed')),
    failedDeltaPct: pctDelta(failed, count(yesterday, 'Failed')),
    inProgressDeltaPct: pctDelta(inProgress, count(yesterday, 'In Progress')),
  };
}

export function getActiveLotsInUse(): number {
  return lots.filter((l) => l.status === 'Active').length;
}

export type NextQcDue = { instrumentName: string; at: string } | null;

/** The earliest instrument that hasn't logged a completed run today, or —
 * if every instrument already has — the instrument due again soonest based
 * on its earliest run today plus a 24h cadence. Honestly `null` (rendered
 * "—") rather than fabricated when nothing can be derived. */
export function getNextQcDue(): NextQcDue {
  const today = runs.filter((r) => isSameCalendarDay(r.runAt, 0) && r.status !== 'In Progress');
  const ranInstrumentIds = new Set(today.map((r) => r.instrumentId));
  const notYetRun = QC_INSTRUMENTS.find((i) => !ranInstrumentIds.has(i.id));
  if (notYetRun) {
    const due = new Date();
    due.setHours(7, 0, 0, 0);
    return { instrumentName: notYetRun.name, at: due.toISOString() };
  }
  if (today.length === 0) return null;
  const earliest = [...today].sort(
    (a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime(),
  )[0]!;
  const nextDue = new Date(earliest.runAt);
  nextDue.setDate(nextDue.getDate() + 1);
  const instrument = getInstrument(earliest.instrumentId)!;
  return { instrumentName: instrument.name, at: nextDue.toISOString() };
}

/** Timestamp of the most recently logged run — for the Dashboard's "Last QC
 * run" line. Honestly `null` rather than fabricated when none exist yet. */
export function getMostRecentQcRunAt(): string | null {
  if (runs.length === 0) return null;
  return runs.reduce((latest, r) => (r.runAt > latest ? r.runAt : latest), runs[0]!.runAt);
}
