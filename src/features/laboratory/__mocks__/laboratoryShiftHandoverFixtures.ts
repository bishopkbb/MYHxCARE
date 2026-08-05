/**
 * Mock fixtures for the Laboratory Shift Handover page. Adapted from
 * pharmacy's own `pharmacyShiftHandoverFixtures.ts` — same shift/personnel/
 * department/checklist/history shape and conventions, since that part is
 * inherently per-shift authored content, not something a live store produces.
 *
 * Unlike the pharmacy version, the Testing Summary, Pending Verification
 * Queue, and Priority Follow-ups panels are NOT fixtures here — the workspace
 * derives those live from `useLabResults()` + `groupIntoOrders()`
 * (`labResultStore.ts` / `labOrders.ts`), so a handover always reflects the
 * real test pipeline at hand-off time, not a stale snapshot. There is no
 * Laboratory equivalent of pharmacy's "Controlled Drugs Pending Approval"
 * panel, so neither a live nor a fixture version of it exists here.
 *
 * Low Stock Reagents, unlike its pharmacy "Low Stock Medicines" counterpart,
 * IS a static fixture below rather than a live read — Laboratory has no
 * inventory/reagent store yet (`/laboratory/reagent-management` is still a
 * `ComingSoon` stub). Wire this panel to a real reagent store once one
 * exists, same deferred-but-acknowledged convention used elsewhere in this
 * feature (see e.g. `deriveCollectionPoint()` in `labOrders.ts`).
 *
 * Replace with real API data in Phase 6 integration.
 */

import type { LabDepartment } from '@/features/laboratory/__mocks__/labResultFixtures';

export type ShiftType = 'Morning' | 'Afternoon' | 'Night';

export type HandoverShiftInfo = {
  shiftDateLabel: string;
  shiftType: ShiftType;
  shiftTimeRange: string;
  handoverTimeLabel: string;
};

export type HandoverLabScientist = {
  name: string;
  staffId: string;
  email: string;
  phone: string;
  avatarBg: string;
};

// Adaora Ugwu is the same LAB_SCIENTIST persona the login screen's dev
// identifier comment block maps to LAB-001 (see authFixtures.ts) — reused
// here as the outgoing scientist so the handover reads as this session's own
// logged-in user handing off, same convention as pharmacy's own recurring
// roster reuse.
export const OUTGOING_SCIENTIST: HandoverLabScientist = {
  name: 'Adaora Ugwu',
  staffId: 'LAB-001',
  email: 'adaora.u@myhxcare.ng',
  phone: '+234 806 214 7732',
  avatarBg: '#00B4D8',
};

export const INCOMING_SCIENTIST: HandoverLabScientist = {
  name: 'Ifeoma Nnaji',
  staffId: 'LAB-014',
  email: 'ifeoma.n@myhxcare.ng',
  phone: '+234 807 552 9014',
  avatarBg: '#8B5CF6',
};

export const SHIFT_INFO: HandoverShiftInfo = {
  shiftDateLabel: new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date()),
  shiftType: 'Morning',
  shiftTimeRange: '07:00 - 15:00',
  handoverTimeLabel: '14:45',
};

export type DepartmentHandoverInfo = {
  name: string;
  department: LabDepartment;
  departmentCode: string;
  operatingHours: string;
  scientistInCharge: string;
};

export const DEPARTMENT_INFO: DepartmentHandoverInfo = {
  name: 'Hematology Laboratory',
  department: 'Hematology',
  departmentCode: 'HEMA',
  operatingHours: '24 Hours (STAT coverage)',
  scientistInCharge: OUTGOING_SCIENTIST.name,
};

export type HandoverTask = {
  id: string;
  category: string;
  description: string;
  done: boolean;
};

export const OUTSTANDING_TASKS: HandoverTask[] = [
  {
    id: 't1',
    category: 'Reagent & Supplies',
    description: 'Confirm reorder submitted for Glucose Reagent Kit',
    done: false,
  },
  {
    id: 't2',
    category: 'Reagent & Supplies',
    description: 'Follow up on delayed delivery — Blood Culture Bottles',
    done: false,
  },
  {
    id: 't3',
    category: 'Reagent & Supplies',
    description: 'Quarantine check on batch flagged for QC review',
    done: false,
  },
  {
    id: 't4',
    category: 'Safety Follow-ups',
    description: 'Review critical value pending physician confirmation — Potassium (K+)',
    done: false,
  },
  {
    id: 't5',
    category: 'Safety Follow-ups',
    description: 'Confirm sample rejection communicated to ward — Urinalysis (Routine)',
    done: false,
  },
  {
    id: 't6',
    category: 'Procurement',
    description: 'Chase pending procurement approval — reagent restock',
    done: false,
  },
  {
    id: 't7',
    category: 'Procurement',
    description: 'Confirm supplier delivery window for tomorrow',
    done: false,
  },
  {
    id: 't8',
    category: 'Result Follow-ups',
    description: 'Callback pending for amended result',
    done: false,
  },
  {
    id: 't9',
    category: 'Result Follow-ups',
    description: 'Confirm repeat sample requested from ward',
    done: false,
  },
];

export type LowStockReagent = {
  id: string;
  reagentName: string;
  department: LabDepartment;
  stockQty: number;
  reorderLevel: number;
  unit: string;
};

// Static — see file header. Wire to a real reagent inventory store once
// Reagent Management ships past its current ComingSoon stub.
export const LOW_STOCK_REAGENTS: LowStockReagent[] = [
  {
    id: 'reag-001',
    reagentName: 'Glucose Reagent Kit',
    department: 'Biochemistry',
    stockQty: 3,
    reorderLevel: 10,
    unit: 'kits',
  },
  {
    id: 'reag-002',
    reagentName: 'PT/APTT Reagent',
    department: 'Coagulation',
    stockQty: 4,
    reorderLevel: 12,
    unit: 'kits',
  },
  {
    id: 'reag-003',
    reagentName: 'Hematology Control (QC) Level 2',
    department: 'Hematology',
    stockQty: 2,
    reorderLevel: 6,
    unit: 'vials',
  },
  {
    id: 'reag-004',
    reagentName: 'Blood Culture Bottles',
    department: 'Microbiology',
    stockQty: 12,
    reorderLevel: 30,
    unit: 'bottles',
  },
  {
    id: 'reag-005',
    reagentName: 'HIV Rapid Test Kits',
    department: 'Immunology',
    stockQty: 15,
    reorderLevel: 25,
    unit: 'kits',
  },
  {
    id: 'reag-006',
    reagentName: 'CBC Diluent',
    department: 'Hematology',
    stockQty: 8,
    reorderLevel: 20,
    unit: 'L',
  },
];

export type HandoverHistoryEntry = {
  id: string;
  shiftDateLabel: string;
  shiftType: ShiftType;
  outgoingScientist: string;
  incomingScientist: string;
  department: string;
  completedAtLabel: string;
};

function daysAgoLabel(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function daysAgoDateLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export const HANDOVER_HISTORY: HandoverHistoryEntry[] = [
  {
    id: 'h1',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Night',
    outgoingScientist: 'Chukwuemeka Achara',
    incomingScientist: OUTGOING_SCIENTIST.name,
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(1, 7, 4),
  },
  {
    id: 'h2',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Afternoon',
    outgoingScientist: 'Nneka Emeka',
    incomingScientist: 'Chukwuemeka Achara',
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(1, 15, 6),
  },
  {
    id: 'h3',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Morning',
    outgoingScientist: OUTGOING_SCIENTIST.name,
    incomingScientist: 'Nneka Emeka',
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(1, 15, 1),
  },
  {
    id: 'h4',
    shiftDateLabel: daysAgoDateLabel(2),
    shiftType: 'Night',
    outgoingScientist: 'Chukwuemeka Achara',
    incomingScientist: OUTGOING_SCIENTIST.name,
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(2, 7, 9),
  },
];
