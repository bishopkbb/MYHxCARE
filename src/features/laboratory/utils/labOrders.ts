/**
 * Shared "Order" derivation for every Laboratory screen that groups the
 * canonical, per-test `LabResult` store into requisition-level rows. An
 * "Order" is not a stored entity — it's every `LabResult` row that shares the
 * same patient and the same `orderedAt` timestamp, which is real and true by
 * construction: `addLabOrder()` (`labResultStore.ts`) stamps every test
 * submitted in one request with one shared `orderedAt`. Computed fresh from
 * the live store on every render; never persisted.
 *
 * Each screen (Laboratory Orders, Sample Collection, …) layers its own
 * status taxonomy on top of this shared raw grouping — the taxonomies differ
 * per screen, but the grouping/id/priority mechanics don't, so they live here
 * once instead of being re-implemented per screen.
 */

import { WAT_TZ, isToday } from '@/utils/datetime';
import type {
  LabDepartment,
  LabResult,
  LabResultPriority,
  LabResultRow,
  LabResultStatus,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import type { Gender } from '@/types/patient.types';

/** Shared rank of the real workflow stages — used anywhere an order's status
 * is "as advanced as its least-progressed test." `REJECTED` is intentionally
 * out of band (-1): it's a blocking exception, never a point on this ladder. */
export const TEST_STATUS_RANK: Record<LabResultStatus, number> = {
  ORDERED: 0,
  SAMPLE_COLLECTED: 1,
  IN_PROCESS: 2,
  RESULTED: 3,
  VERIFIED: 4,
  REJECTED: -1,
};

export type RawLabOrder = {
  orderId: string;
  groupKey: string;
  patientId?: string;
  patientName: string;
  mrn: string;
  initials: string;
  avatarBg: string;
  age?: number;
  gender?: Gender;
  ward?: string;
  bed?: string;
  orderedBy: string;
  orderedAt: string;
  priority: LabResultPriority;
  tests: LabResult[];
  /** True when every test on the requisition was logged by the Lab
   * Scientist directly (Walk-in Collection), not a doctor. */
  isWalkIn: boolean;
};

export function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash;
}

/** Presentation-only derived label, never persisted — distinct `ORD` prefix
 * so an order-level id is never confused with a per-test lab number
 * (`deriveLabNo()` on the Dashboard) or a specimen id (`deriveSampleId()`
 * below). */
export function deriveOrderId(groupKey: string, orderedAt: string): string {
  const d = new Date(orderedAt);
  const yymmdd = new Intl.DateTimeFormat('en-GB', {
    timeZone: WAT_TZ,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .split('/')
    .reverse()
    .join('');
  const seq = simpleHash(groupKey) % 10000;
  return `ORD${yymmdd}-${String(seq).padStart(4, '0')}`;
}

const PRIORITY_RANK: Record<LabResultPriority, number> = { ROUTINE: 0, URGENT: 1, STAT: 2 };

/** An order's priority is the worst (highest-urgency) priority among its
 * tests — a STAT test on an otherwise routine requisition makes the whole
 * requisition STAT for triage purposes. */
export function worstPriority(tests: LabResult[]): LabResultPriority {
  return tests.reduce<LabResultPriority>(
    (worst, t) => (PRIORITY_RANK[t.priority] > PRIORITY_RANK[worst] ? t.priority : worst),
    'ROUTINE',
  );
}

function buildRawOrder(groupKey: string, tests: LabResult[]): RawLabOrder {
  const first = tests[0]!;
  return {
    orderId: deriveOrderId(groupKey, first.orderedAt),
    groupKey,
    ...(first.patientId ? { patientId: first.patientId } : {}),
    patientName: first.patientName,
    mrn: first.mrn,
    initials: first.initials,
    avatarBg: first.avatarBg,
    ...(first.age !== undefined ? { age: first.age } : {}),
    ...(first.gender ? { gender: first.gender } : {}),
    ...(first.ward ? { ward: first.ward } : {}),
    ...(first.bed ? { bed: first.bed } : {}),
    orderedBy: first.orderedBy,
    orderedAt: first.orderedAt,
    priority: worstPriority(tests),
    tests,
    isWalkIn: tests.some((t) => t.isWalkIn === true),
  };
}

/** Groups the live `LabResult[]` into requisition-level rows, newest first. */
export function groupIntoOrders(results: LabResult[]): RawLabOrder[] {
  const groups = new Map<string, LabResult[]>();
  for (const r of results) {
    const key = `${r.patientId ?? r.mrn}|${r.orderedAt}`;
    const arr = groups.get(key);
    if (arr) arr.push(r);
    else groups.set(key, [r]);
  }
  return Array.from(groups.entries())
    .map(([groupKey, tests]) => buildRawOrder(groupKey, tests))
    .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime());
}

// ── Sample type / id — derived, not persisted ────────────────────────────────
// No `sampleType`/`sampleId` field exists on the canonical `LabResult` entity;
// adding one would mean extending a shared entity three live screens depend
// on for a value that's rule-derivable from data that already exists
// (department, test name). Kept presentation-only, same convention as
// `deriveOrderId()`/`deriveLabNo()`.

const DEPARTMENT_SAMPLE_TYPE: Partial<Record<LabDepartment, string>> = {
  Hematology: 'Whole Blood (EDTA)',
  Coagulation: 'Whole Blood (Citrate)',
  Biochemistry: 'Serum',
  Immunology: 'Serum',
};

/** Best-effort specimen type for a single test, inferred from its real
 * department/name — Microbiology has no single default, so it falls back to
 * keyword matches on the test name before defaulting to Whole Blood. */
export function deriveSampleType(test: LabResult): string {
  const fromDepartment = DEPARTMENT_SAMPLE_TYPE[test.department];
  if (fromDepartment) return fromDepartment;
  const name = test.testName.toLowerCase();
  if (name.includes('urin')) return 'Urine';
  if (name.includes('culture')) return 'Whole Blood (Culture Bottle)';
  if (name.includes('csf')) return 'Cerebrospinal Fluid';
  return 'Whole Blood';
}

/** The order's own sample type — the single type if every test agrees, else
 * "Multiple" (same convention as the Department column on Orders). */
export function orderSampleType(tests: LabResult[]): string {
  const types = new Set(tests.map(deriveSampleType));
  return types.size === 1 ? [...types][0]! : 'Multiple';
}

/** Presentation-only specimen id, shown only once an order has at least one
 * collected test — distinct `SMP` prefix and a different hash seed than
 * `deriveOrderId()` so the two never coincidentally match. */
export function deriveSampleId(groupKey: string, orderedAt: string): string {
  const d = new Date(orderedAt);
  const yymmdd = new Intl.DateTimeFormat('en-GB', {
    timeZone: WAT_TZ,
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .split('/')
    .reverse()
    .join('');
  const seq = simpleHash(`sample:${groupKey}`) % 10000;
  return `SMP${yymmdd}-${String(seq).padStart(4, '0')}`;
}

// ── Collection point — derived, not persisted ────────────────────────────────
// No field on LabResult captures "OPD Phlebotomy vs Maternity Unit vs
// Cardiology Unit" — that granularity doesn't exist in the data model, and
// inventing a multi-value enum nothing else in the app ever sets would be
// fabricating operational data. The one real, non-fabricated distinction
// available is whether the order carries a real `ward` (an admitted patient,
// whose specimen must physically travel to the lab) or not (a walk-in/OPD
// patient, drawn on-site).

/** Real ward name when the order has one, else the on-site desk. */
export function deriveCollectionPoint(order: RawLabOrder): string {
  return order.ward ?? 'OPD Phlebotomy';
}

// ── Reception-stage test filters — shared between Sample Reception's table
// and its Receive/Reject modals. ────────────────────────────────────────────

/** Tests that have reached the bench and are awaiting a reception decision
 * (receive or reject) — mirrors `collectibleTests()` on Sample Collection. */
export function awaitingReceptionTests(order: RawLabOrder): LabResult[] {
  return order.tests.filter((t) => t.status === 'SAMPLE_COLLECTED');
}

/** Tests that have already been logged in at the bench (received into the
 * lab pipeline, whatever stage they're at now). */
export function receivedTests(order: RawLabOrder): LabResult[] {
  return order.tests.filter((t) =>
    (['IN_PROCESS', 'RESULTED', 'VERIFIED'] as LabResult['status'][]).includes(t.status),
  );
}

// ── Tracking stage — Sample Tracking's own full-pipeline taxonomy ────────────
// Read-only/visibility concept, not a new store state: `IN_PROCESS` is one
// real status, but "Received" (just logged in) vs "In Analysis" (been on the
// bench a while) is a real, non-fabricated read of elapsed time since the
// test's own `receivedAt` (or `sampleCollectedAt` if it was never explicitly
// received) — not a persisted field, not a guess unconnected to real data.

export type TrackingStage =
  'Collected' | 'Received' | 'In Analysis' | 'Awaiting Verification' | 'Published' | 'Rejected';

const ANALYSIS_START_MS = 20 * 60_000;

/** `undefined` means the order hasn't been collected at all yet (every test
 * still `ORDERED`) — Sample Tracking's universe deliberately excludes those;
 * that's what Orders/Sample Collection are for. */
export function deriveTrackingStage(order: RawLabOrder, nowMs: number): TrackingStage | undefined {
  const { tests } = order;
  if (tests.some((t) => t.status === 'REJECTED')) return 'Rejected';

  const trackable = tests.filter((t) => t.status !== 'ORDERED');
  if (trackable.length === 0) return undefined;

  const minRank = Math.min(...trackable.map((t) => TEST_STATUS_RANK[t.status]));
  if (minRank === 1) return 'Collected';
  if (minRank === 3) return 'Awaiting Verification';
  if (minRank === 4) return 'Published';

  // minRank === 2 (IN_PROCESS) — split on real elapsed time since the
  // earliest still-in-process test was logged in.
  const referenceMs = trackable
    .filter((t) => t.status === 'IN_PROCESS')
    .reduce<number | undefined>((earliest, t) => {
      const ts = t.receivedAt ?? t.sampleCollectedAt;
      if (!ts) return earliest;
      const ms = new Date(ts).getTime();
      return earliest === undefined ? ms : Math.min(earliest, ms);
    }, undefined);
  return referenceMs !== undefined && nowMs - referenceMs > ANALYSIS_START_MS
    ? 'In Analysis'
    : 'Received';
}

/** Coarse, real-derivable location — no field captures per-bench/per-analyzer
 * assignment, and inventing one would be fabricating data nothing else
 * produces or reads. Deliberately coarser than the reference image. */
export function deriveCurrentLocation(order: RawLabOrder, stage: TrackingStage): string {
  if (stage === 'Collected' || stage === 'Rejected') return deriveCollectionPoint(order);
  if (stage === 'Received') return 'Sample Reception';
  if (stage === 'In Analysis') {
    const inProcess = order.tests.find((t) => t.status === 'IN_PROCESS');
    return `${(inProcess ?? order.tests[0]!).department} Lab`;
  }
  if (stage === 'Awaiting Verification') return 'Result Verification';
  return '—'; // Published
}

// ── Test Work Queue filters — the bench-side "currently mine to work" set,
// shared between the table and the Start/Hold/Resume actions. ──────────────

/** The order's tests actually in the queue's universe (received, not yet
 * resulted) — same narrowing convention as `awaitingReceptionTests()`. */
export function relevantTests(order: RawLabOrder): LabResult[] {
  return order.tests.filter((t) => t.status === 'IN_PROCESS');
}

/** An order counts as "completed today" once every test that was ever
 * `IN_PROCESS` has resulted, and the latest such result landed today — same
 * date-scoped pattern as Sample Reception's `receivedToday()`. */
export function completedToday(order: RawLabOrder): boolean {
  if (order.tests.some((t) => t.status === 'IN_PROCESS')) return false;
  const resultedTests = order.tests.filter(
    (t) => (t.status === 'RESULTED' || t.status === 'VERIFIED') && t.resultAt,
  );
  if (resultedTests.length === 0) return false;
  const maxResultAt = resultedTests.reduce<string | undefined>((max, t) => {
    if (!t.resultAt) return max;
    if (!max || new Date(t.resultAt).getTime() > new Date(max).getTime()) return t.resultAt;
    return max;
  }, undefined);
  return !!maxResultAt && isToday(maxResultAt);
}

// ── Result Verification filters — the lab's own second-reviewer QC queue,
// shared between the table and the verify modal. ───────────────────────────

/** Tests that have a value but haven't had the lab's own QC sign-off yet —
 * same narrowing convention as `awaitingReceptionTests()`. Distinct from
 * `status === 'VERIFIED'`, which is the doctor's own downstream transition. */
export function awaitingVerificationTests(order: RawLabOrder): LabResult[] {
  return order.tests.filter((t) => t.status === 'RESULTED' && !t.labVerifiedAt);
}

// ── Published Results — the doctor-verified archive. ────────────────────────

/** Tests the doctor has verified — the app's one real "published" signal
 * (`verifyResult()` is the only transition to this terminal status). Same
 * narrowing convention as `awaitingVerificationTests()`. */
export function publishedTests(order: RawLabOrder): LabResult[] {
  return order.tests.filter((t) => t.status === 'VERIFIED');
}

// ── Critical Results — the lab's own notification-tracking log. ────────────
// Unlike every other screen this one is naturally per-*test* (a critical
// flag is a per-test event), not per-order — callers flatten
// `groupIntoOrders()`'s output through this filter rather than grouping by
// it, reusing the same real derivations (`deriveSampleId`, `orderId`,
// `deriveCollectionPoint`) without a new grouping shape.

/** Every critical-flagged test on the order — usually zero or one, but a
 * multi-test order can have more than one parameter cross critical. */
export function criticalTests(order: RawLabOrder): LabResult[] {
  return order.tests.filter((t) => t.flag === 'CRITICAL');
}

/** The specific row that actually triggered the critical flag — matched by
 * parameter name against `criticalValueLabel` (e.g. "Potassium (K+) 6.2
 * mmol/L"), so the table/detail panel can show the real value and reference
 * range instead of just the compound label string. `undefined` when the
 * test predates structured `rows` (rare in seed data, always true for
 * anything produced through Result Entry). */
export function findCriticalRow(test: LabResult): LabResultRow | undefined {
  if (!test.criticalValueLabel || !test.rows) return undefined;
  return test.rows.find((r) => test.criticalValueLabel!.startsWith(r.parameter));
}
