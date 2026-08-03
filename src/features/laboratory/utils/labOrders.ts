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

import { WAT_TZ } from '@/utils/datetime';
import type {
  LabDepartment,
  LabResult,
  LabResultPriority,
} from '@/features/laboratory/__mocks__/labResultFixtures';
import type { Gender } from '@/types/patient.types';

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
