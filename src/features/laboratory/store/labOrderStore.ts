'use client';

/**
 * "Submit"/"Send Request" on the lab-order form used to show a toast claiming
 * tests were "dispatched to the laboratory" while creating nothing anywhere
 * — not on this module's own `/lab/results`, not on Nurse Station's
 * Laboratory worklist. This module-level store is what makes the claim true
 * for the doctor's own `/lab/results` review queue: a submitted order now
 * appears there as a real, pending `LabResult` row. Full three-way
 * reconciliation with Nurse Station's `LabTestOrder` and Medical Records'
 * canonical `LabResult` is still open (see the gap report) — this closes the
 * "does it show up anywhere at all" half of the claim, not the cross-module
 * unification.
 *
 * Plain array, not a reactive store — `LabResultsWorkspace` reads it once at
 * mount via `useState(() => [...])`, the same pattern already used for
 * `MOCK_LAB_RESULTS` itself. Swap out by pointing hooks to a real lab-orders
 * endpoint in Phase 6.
 */

import { LAB_CATEGORIES } from '@/features/laboratory/__mocks__/labOrderFixtures';
import type { LabDepartment, LabResult } from '@/features/laboratory/__mocks__/labResultFixtures';

const CATEGORY_TO_DEPARTMENT: Record<string, LabDepartment> = {
  haematology: 'Hematology',
  'clinical-chemistry': 'Biochemistry',
  microbiology: 'Microbiology',
  serology: 'Immunology',
};

function findTestName(testId: string): string {
  for (const category of LAB_CATEGORIES) {
    const test = category.tests.find((t) => t.id === testId);
    if (test) return test.name;
  }
  return testId;
}

function findDepartmentForTest(testId: string): LabDepartment {
  for (const category of LAB_CATEGORIES) {
    if (category.tests.some((t) => t.id === testId)) {
      return CATEGORY_TO_DEPARTMENT[category.id] ?? 'Biochemistry';
    }
  }
  return 'Biochemistry';
}

let orders: LabResult[] = [];
let seq = 0;

export function addLabOrders(params: {
  patientId?: string;
  patientName: string;
  mrn: string;
  initials: string;
  avatarBg: string;
  testIds: string[];
  priority: 'stat' | 'urgent' | 'routine';
}): void {
  const orderedAt = new Date().toISOString();
  const newOrders: LabResult[] = params.testIds.map((testId) => {
    seq += 1;
    return {
      id: `lab-order-${seq}`,
      testName: findTestName(testId),
      department: findDepartmentForTest(testId),
      status: 'pending',
      priority: params.priority,
      resultAt: orderedAt,
      patient: {
        ...(params.patientId ? { patientId: params.patientId } : {}),
        initials: params.initials,
        avatarBg: params.avatarBg,
        name: params.patientName,
        mrn: params.mrn,
      },
    };
  });
  orders = [...newOrders, ...orders];
}

export function getLabOrders(): LabResult[] {
  return orders;
}
