/**
 * Procurement Requests — the one canonical "we need to buy this" pipeline
 * for the Laboratory module. A quick reorder raised from Laboratory
 * Inventory's Stock Alerts tab and a formal multi-item request raised here
 * are the same underlying record, just entered from different starting
 * points — never two disconnected "request to purchase" systems.
 */

import { DEPARTMENT_OPTIONS } from '@/features/laboratory/__mocks__/equipmentFixtures';

export type ProcurementPriority = 'High' | 'Medium' | 'Low';

export type ProcurementStatus =
  'Pending Approval' | 'Approved' | 'In Procurement' | 'Received' | 'Rejected' | 'Cancelled';

export type ProcurementCategory = 'Reagents' | 'Consumables' | 'Equipment / Others';

export type ProcurementLineItem = {
  id: string;
  name: string;
  category: ProcurementCategory;
  quantity: number;
  estimatedUnitCost: number;
  itemId?: string;
};

export type ApprovalRole = 'Department Head' | 'Laboratory Manager' | 'Procurement Officer';
export type ApprovalStepStatus = 'Pending' | 'Approved' | 'Rejected' | 'Skipped';

export type ApprovalStep = {
  role: ApprovalRole;
  status: ApprovalStepStatus;
  actor?: string;
  at?: string;
};

export type ProcurementOrigin = 'Manual' | 'Stock Alert';

export type ProcurementRequest = {
  id: string;
  requestDate: string;
  department: string;
  requestedBy: string;
  priority: ProcurementPriority;
  lineItems: ProcurementLineItem[];
  /** The formally quoted/estimated total for the whole request — a real
   * procurement estimate is usually one rounded top-level figure from
   * finance/procurement, not a strict bottom-up sum of each line's
   * individually-priced estimate, so this is its own authoritative field
   * rather than something derived from `lineItems` at render time. */
  estimatedAmount: number;
  status: ProcurementStatus;
  lastUpdated: string;
  estimatedDeliveryDate: string | null;
  approvalSteps: ApprovalStep[];
  origin: ProcurementOrigin;
  notes: string;
};

function isoOffset(days: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

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

export const APPROVAL_ROLES: ApprovalRole[] = [
  'Department Head',
  'Laboratory Manager',
  'Procurement Officer',
];

export const CATEGORY_OPTIONS: ProcurementCategory[] = [
  'Reagents',
  'Consumables',
  'Equipment / Others',
];

export const PRIORITY_OPTIONS: ProcurementPriority[] = ['High', 'Medium', 'Low'];

const REQUESTERS = ['Mary Nwankwo', 'Emeka Okoro', 'Ibrahim Musa', 'Chinedu Ajao'];

/** Approval steps that reflect how far a request has actually progressed —
 * never a static "all pending" placeholder regardless of real status. */
function approvalStepsFor(
  status: ProcurementStatus,
  requestedBy: string,
  requestDate: string,
): ApprovalStep[] {
  const approvedThrough =
    status === 'Pending Approval' ? 0 : status === 'Rejected' ? 1 : status === 'Cancelled' ? 0 : 3;
  return APPROVAL_ROLES.map((role, i) => {
    if (i < approvedThrough) {
      return {
        role,
        status: 'Approved' as ApprovalStepStatus,
        actor: requestedBy,
        at: isoOffset(
          Math.round((new Date(requestDate).getTime() - Date.now()) / 86_400_000) + i + 1,
        ),
      };
    }
    if (status === 'Rejected' && i === approvedThrough) {
      return {
        role,
        status: 'Rejected' as ApprovalStepStatus,
        actor: requestedBy,
        at: isoOffset(Math.round((new Date(requestDate).getTime() - Date.now()) / 86_400_000) + 1),
      };
    }
    if (status === 'Cancelled') {
      return { role, status: 'Skipped' as ApprovalStepStatus };
    }
    return { role, status: 'Pending' as ApprovalStepStatus };
  });
}

// ── Named "hero" requests — the exact rows shown in the reference design ───

type HeroDef = {
  id: string;
  dayOffset: number;
  updatedOffset: number;
  updatedHour: number;
  updatedMinute: number;
  department: string;
  requestedBy: string;
  priority: ProcurementPriority;
  status: ProcurementStatus;
  amount: number;
  lineItems: ProcurementLineItem[];
};

const HERO_DEFS: HeroDef[] = [
  {
    id: 'PR-2026-00048',
    dayOffset: 0,
    updatedOffset: 0,
    updatedHour: 9,
    updatedMinute: 15,
    department: 'Hematology',
    requestedBy: 'Mary Nwankwo',
    priority: 'High',
    status: 'Pending Approval',
    amount: 719605,
    lineItems: [
      {
        id: 'li-1',
        name: 'RBC Diluent',
        category: 'Reagents',
        quantity: 20,
        estimatedUnitCost: 45000,
        itemId: 'inv-hero-001',
      },
      {
        id: 'li-2',
        name: 'Lyse Reagent',
        category: 'Reagents',
        quantity: 10,
        estimatedUnitCost: 28500,
        itemId: 'inv-hero-002',
      },
      {
        id: 'li-3',
        name: 'Control Level 1',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 12000,
        itemId: 'inv-hero-003',
      },
      {
        id: 'li-4',
        name: 'Control Level 2',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 12000,
        itemId: 'inv-hero-004',
      },
      {
        id: 'li-5',
        name: 'Glucose Reagent',
        category: 'Reagents',
        quantity: 4,
        estimatedUnitCost: 18500,
      },
      {
        id: 'li-6',
        name: 'Blood Collection Tube (EDTA)',
        category: 'Consumables',
        quantity: 5,
        estimatedUnitCost: 8500,
        itemId: 'inv-hero-010',
      },
      {
        id: 'li-7',
        name: 'Plain Tube (Red Top)',
        category: 'Consumables',
        quantity: 4,
        estimatedUnitCost: 3000,
        itemId: 'inv-hero-011',
      },
      {
        id: 'li-8',
        name: 'Centrifuge (Refrigerated) Service Kit',
        category: 'Equipment / Others',
        quantity: 1,
        estimatedUnitCost: 45000,
      },
    ],
  },
  {
    id: 'PR-2026-00047',
    dayOffset: 1,
    updatedOffset: 1,
    updatedHour: 14,
    updatedMinute: 45,
    department: 'Biochemistry',
    requestedBy: 'Emeka Okoro',
    priority: 'Medium',
    status: 'Approved',
    amount: 456200,
    lineItems: [
      {
        id: 'li-1',
        name: 'Total Protein Reagent',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 18000,
      },
      {
        id: 'li-2',
        name: 'Albumin Reagent',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 18500,
      },
      {
        id: 'li-3',
        name: 'Cholesterol Reagent',
        category: 'Reagents',
        quantity: 4,
        estimatedUnitCost: 20500,
      },
      {
        id: 'li-4',
        name: 'Serum Separator Tube',
        category: 'Consumables',
        quantity: 10,
        estimatedUnitCost: 8200,
      },
      {
        id: 'li-5',
        name: 'Micropipette Tips (100-1000µL)',
        category: 'Consumables',
        quantity: 6,
        estimatedUnitCost: 5600,
      },
      {
        id: 'li-6',
        name: 'Nitrile Examination Gloves (M)',
        category: 'Consumables',
        quantity: 4,
        estimatedUnitCost: 3800,
      },
    ],
  },
  {
    id: 'PR-2026-00046',
    dayOffset: 2,
    updatedOffset: 2,
    updatedHour: 11,
    updatedMinute: 30,
    department: 'Microbiology',
    requestedBy: 'Ibrahim Musa',
    priority: 'High',
    status: 'In Procurement',
    amount: 1256750,
    lineItems: [
      {
        id: 'li-1',
        name: 'Culture Media - Blood Agar',
        category: 'Consumables',
        quantity: 30,
        estimatedUnitCost: 1800,
      },
      {
        id: 'li-2',
        name: 'Culture Media - MacConkey Agar',
        category: 'Consumables',
        quantity: 20,
        estimatedUnitCost: 1800,
      },
      {
        id: 'li-3',
        name: 'Culture Media - Chocolate Agar',
        category: 'Consumables',
        quantity: 20,
        estimatedUnitCost: 2100,
      },
      {
        id: 'li-4',
        name: 'Gram Stain Kit',
        category: 'Reagents',
        quantity: 8,
        estimatedUnitCost: 15500,
      },
      {
        id: 'li-5',
        name: 'Blood Culture Bottle (Aerobic)',
        category: 'Consumables',
        quantity: 60,
        estimatedUnitCost: 4200,
      },
      {
        id: 'li-6',
        name: 'Blood Culture Bottle (Anaerobic)',
        category: 'Consumables',
        quantity: 60,
        estimatedUnitCost: 4200,
      },
      {
        id: 'li-7',
        name: 'CO2 Incubator Filter Set',
        category: 'Equipment / Others',
        quantity: 2,
        estimatedUnitCost: 32000,
      },
      {
        id: 'li-8',
        name: 'Autoclave Indicator Strips',
        category: 'Consumables',
        quantity: 10,
        estimatedUnitCost: 4500,
      },
      {
        id: 'li-9',
        name: 'Biohazard Bags',
        category: 'Consumables',
        quantity: 15,
        estimatedUnitCost: 2800,
      },
      {
        id: 'li-10',
        name: 'Sharps Disposal Container',
        category: 'Equipment / Others',
        quantity: 6,
        estimatedUnitCost: 3200,
      },
      {
        id: 'li-11',
        name: 'Face Masks (Surgical)',
        category: 'Consumables',
        quantity: 10,
        estimatedUnitCost: 2200,
      },
      {
        id: 'li-12',
        name: 'Alcohol Swabs',
        category: 'Consumables',
        quantity: 10,
        estimatedUnitCost: 1200,
      },
    ],
  },
  {
    id: 'PR-2026-00045',
    dayOffset: 3,
    updatedOffset: 3,
    updatedHour: 16,
    updatedMinute: 20,
    department: 'Immunology',
    requestedBy: 'Mary Nwankwo',
    priority: 'Medium',
    status: 'Approved',
    amount: 342500,
    lineItems: [
      {
        id: 'li-1',
        name: 'HIV 1/2 Rapid Test',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 32000,
        itemId: 'inv-hero-008',
      },
      {
        id: 'li-2',
        name: 'HBsAg Rapid Test',
        category: 'Reagents',
        quantity: 4,
        estimatedUnitCost: 29500,
        itemId: 'inv-hero-009',
      },
      {
        id: 'li-3',
        name: 'Hepatitis C Rapid Test',
        category: 'Reagents',
        quantity: 2,
        estimatedUnitCost: 31000,
      },
      {
        id: 'li-4',
        name: 'Blood Group Antisera (Anti-D)',
        category: 'Reagents',
        quantity: 3,
        estimatedUnitCost: 17500,
      },
      {
        id: 'li-5',
        name: 'Microscope Slides',
        category: 'Consumables',
        quantity: 10,
        estimatedUnitCost: 2400,
      },
    ],
  },
  {
    id: 'PR-2026-00044',
    dayOffset: 5,
    updatedOffset: 0,
    updatedHour: 8,
    updatedMinute: 40,
    department: 'Blood Bank',
    requestedBy: 'Chinedu Ajao',
    priority: 'High',
    status: 'Received',
    amount: 529800,
    lineItems: [
      {
        id: 'li-1',
        name: 'Cross-Match Gel Cards',
        category: 'Consumables',
        quantity: 40,
        estimatedUnitCost: 2600,
      },
      {
        id: 'li-2',
        name: 'Coombs Serum',
        category: 'Reagents',
        quantity: 8,
        estimatedUnitCost: 22000,
      },
      {
        id: 'li-3',
        name: 'Blood Group Antisera (Anti-A)',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 16500,
      },
      {
        id: 'li-4',
        name: 'Blood Group Antisera (Anti-B)',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 16500,
      },
      {
        id: 'li-5',
        name: 'Plain Tube (Red Top)',
        category: 'Consumables',
        quantity: 20,
        estimatedUnitCost: 3000,
        itemId: 'inv-hero-011',
      },
      {
        id: 'li-6',
        name: 'Blood Bank Refrigerator Shelf Kit',
        category: 'Equipment / Others',
        quantity: 1,
        estimatedUnitCost: 65000,
      },
      {
        id: 'li-7',
        name: 'Biohazard Bags',
        category: 'Consumables',
        quantity: 8,
        estimatedUnitCost: 2800,
      },
    ],
  },
  {
    id: 'PR-2026-00043',
    dayOffset: 6,
    updatedOffset: 6,
    updatedHour: 15,
    updatedMinute: 10,
    department: 'Chemical Pathology',
    requestedBy: 'Emeka Okoro',
    priority: 'Low',
    status: 'Pending Approval',
    amount: 875400,
    lineItems: [
      {
        id: 'li-1',
        name: 'Urea Reagent',
        category: 'Reagents',
        quantity: 8,
        estimatedUnitCost: 17200,
        itemId: 'inv-hero-006',
      },
      {
        id: 'li-2',
        name: 'Creatinine Reagent',
        category: 'Reagents',
        quantity: 8,
        estimatedUnitCost: 19800,
        itemId: 'inv-hero-007',
      },
      {
        id: 'li-3',
        name: 'ALT Reagent',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 21000,
      },
      {
        id: 'li-4',
        name: 'AST Reagent',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 21000,
      },
      {
        id: 'li-5',
        name: 'Amylase Reagent',
        category: 'Reagents',
        quantity: 4,
        estimatedUnitCost: 26000,
      },
      {
        id: 'li-6',
        name: 'Sodium Chloride Reagent',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 12000,
      },
      {
        id: 'li-7',
        name: 'Potassium Reagent',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 13500,
      },
      {
        id: 'li-8',
        name: 'Chloride Reagent',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 12500,
      },
      {
        id: 'li-9',
        name: 'Serum Separator Tube',
        category: 'Consumables',
        quantity: 15,
        estimatedUnitCost: 8200,
      },
      {
        id: 'li-10',
        name: 'Nitrile Examination Gloves (L)',
        category: 'Consumables',
        quantity: 6,
        estimatedUnitCost: 3800,
      },
    ],
  },
  {
    id: 'PR-2026-00042',
    dayOffset: 7,
    updatedOffset: 6,
    updatedHour: 10,
    updatedMinute: 5,
    department: 'Hematology',
    requestedBy: 'Mary Nwankwo',
    priority: 'Medium',
    status: 'Rejected',
    amount: 210000,
    lineItems: [
      {
        id: 'li-1',
        name: 'Slide Stainer Reagent Set',
        category: 'Reagents',
        quantity: 4,
        estimatedUnitCost: 32000,
      },
      {
        id: 'li-2',
        name: 'Microscope Slides',
        category: 'Consumables',
        quantity: 20,
        estimatedUnitCost: 2400,
      },
      {
        id: 'li-3',
        name: 'Cover Slips',
        category: 'Consumables',
        quantity: 20,
        estimatedUnitCost: 1600,
      },
      {
        id: 'li-4',
        name: 'Coagulation PT Reagent',
        category: 'Reagents',
        quantity: 2,
        estimatedUnitCost: 42000,
      },
    ],
  },
  {
    id: 'PR-2026-00041',
    dayOffset: 8,
    updatedOffset: 7,
    updatedHour: 9,
    updatedMinute: 50,
    department: 'Microbiology',
    requestedBy: 'Ibrahim Musa',
    priority: 'High',
    status: 'In Procurement',
    amount: 642150,
    lineItems: [
      {
        id: 'li-1',
        name: 'Malaria Rapid Test',
        category: 'Reagents',
        quantity: 10,
        estimatedUnitCost: 18500,
      },
      {
        id: 'li-2',
        name: 'Widal Test Kit',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 15000,
      },
      {
        id: 'li-3',
        name: 'Syphilis (RPR) Test Kit',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 21000,
      },
      {
        id: 'li-4',
        name: 'Nasopharyngeal Swab',
        category: 'Consumables',
        quantity: 100,
        estimatedUnitCost: 350,
      },
      {
        id: 'li-5',
        name: 'Culture Media - Blood Agar',
        category: 'Consumables',
        quantity: 30,
        estimatedUnitCost: 1800,
      },
      {
        id: 'li-6',
        name: 'Alcohol Swabs',
        category: 'Consumables',
        quantity: 20,
        estimatedUnitCost: 1200,
      },
      {
        id: 'li-7',
        name: 'Face Masks (Surgical)',
        category: 'Consumables',
        quantity: 10,
        estimatedUnitCost: 2200,
      },
      {
        id: 'li-8',
        name: 'Sharps Disposal Container',
        category: 'Equipment / Others',
        quantity: 4,
        estimatedUnitCost: 3200,
      },
      {
        id: 'li-9',
        name: 'PCR Master Mix',
        category: 'Reagents',
        quantity: 3,
        estimatedUnitCost: 85000,
      },
    ],
  },
  {
    id: 'PR-2026-00040',
    dayOffset: 10,
    updatedOffset: 8,
    updatedHour: 13,
    updatedMinute: 15,
    department: 'Chemical Pathology',
    requestedBy: 'Chinedu Ajao',
    priority: 'Medium',
    status: 'Approved',
    amount: 389600,
    lineItems: [
      {
        id: 'li-1',
        name: 'Total Bilirubin Reagent',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 19500,
      },
      {
        id: 'li-2',
        name: 'Triglycerides Reagent',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 20500,
      },
      {
        id: 'li-3',
        name: 'HDL Cholesterol Reagent',
        category: 'Reagents',
        quantity: 4,
        estimatedUnitCost: 24000,
      },
      {
        id: 'li-4',
        name: 'CRP Reagent',
        category: 'Reagents',
        quantity: 4,
        estimatedUnitCost: 34000,
      },
      {
        id: 'li-5',
        name: 'Plain Vacutainer Tube',
        category: 'Consumables',
        quantity: 10,
        estimatedUnitCost: 6800,
      },
      {
        id: 'li-6',
        name: 'Sodium Citrate Tube',
        category: 'Consumables',
        quantity: 6,
        estimatedUnitCost: 7400,
      },
    ],
  },
  {
    id: 'PR-2026-00039',
    dayOffset: 11,
    updatedOffset: 9,
    updatedHour: 11,
    updatedMinute: 40,
    department: 'Immunology',
    requestedBy: 'Mary Nwankwo',
    priority: 'Low',
    status: 'Received',
    amount: 156200,
    lineItems: [
      {
        id: 'li-1',
        name: 'Pregnancy Rapid Test (hCG)',
        category: 'Reagents',
        quantity: 6,
        estimatedUnitCost: 9500,
      },
      {
        id: 'li-2',
        name: 'ELISA Reader Wash Buffer',
        category: 'Reagents',
        quantity: 4,
        estimatedUnitCost: 18000,
      },
      {
        id: 'li-3',
        name: 'Fluoride Oxalate Tube',
        category: 'Consumables',
        quantity: 8,
        estimatedUnitCost: 7600,
      },
    ],
  },
];

const HERO_REQUESTS: ProcurementRequest[] = HERO_DEFS.map((h) => ({
  id: h.id,
  requestDate: isoOffset(-h.dayOffset, 9, 0),
  department: h.department,
  requestedBy: h.requestedBy,
  priority: h.priority,
  lineItems: h.lineItems,
  estimatedAmount: h.amount,
  status: h.status,
  lastUpdated: isoOffset(-h.updatedOffset, h.updatedHour, h.updatedMinute),
  estimatedDeliveryDate:
    h.status === 'Rejected' || h.status === 'Cancelled' ? null : isoOffset(-h.dayOffset + 8, 9, 0),
  approvalSteps: approvalStepsFor(h.status, h.requestedBy, isoOffset(-h.dayOffset)),
  origin: 'Manual',
  notes: '',
}));

// ── Bulk-generated remainder — deterministic, reaches the standing 48-total
// / 20 Approved / 12 Pending Approval / 8 In Procurement / 6 Received /
// 1 Rejected / 1 Cancelled breakdown (10 of those come from the requests
// above). ─────────────────────────────────────────────────────────────────

const GEN_ITEM_NAMES: { name: string; category: ProcurementCategory; basePrice: number }[] = [
  { name: 'Sodium Chloride Reagent', category: 'Reagents', basePrice: 12000 },
  { name: 'Potassium Reagent', category: 'Reagents', basePrice: 13500 },
  { name: 'Amylase Reagent', category: 'Reagents', basePrice: 26000 },
  { name: 'CRP Reagent', category: 'Reagents', basePrice: 34000 },
  { name: 'Coagulation APTT Reagent', category: 'Reagents', basePrice: 42000 },
  { name: 'Gram Stain Kit', category: 'Reagents', basePrice: 15500 },
  { name: 'Malaria Rapid Test', category: 'Reagents', basePrice: 18500 },
  { name: 'Widal Test Kit', category: 'Reagents', basePrice: 15000 },
  { name: 'Blood Culture Bottle (Aerobic)', category: 'Consumables', basePrice: 4200 },
  { name: 'Serum Separator Tube', category: 'Consumables', basePrice: 8200 },
  { name: 'Micropipette Tips (10-100µL)', category: 'Consumables', basePrice: 5200 },
  { name: 'Microscope Slides', category: 'Consumables', basePrice: 2400 },
  { name: 'Nitrile Examination Gloves (M)', category: 'Consumables', basePrice: 3800 },
  { name: 'Alcohol Swabs', category: 'Consumables', basePrice: 1200 },
  { name: 'Culture Media - Blood Agar', category: 'Consumables', basePrice: 1800 },
  { name: 'PCR Machine Maintenance Kit', category: 'Equipment / Others', basePrice: 65000 },
  { name: 'Centrifuge Rotor Seal Kit', category: 'Equipment / Others', basePrice: 38000 },
  { name: 'Sharps Disposal Container', category: 'Equipment / Others', basePrice: 3200 },
  { name: 'Biohazard Bags', category: 'Consumables', basePrice: 2800 },
  { name: 'Pipette Calibration Service', category: 'Equipment / Others', basePrice: 25000 },
];

const GEN_TOTAL = 38;
const GEN_STATUS_PLAN: { status: ProcurementStatus; count: number }[] = [
  { status: 'Approved', count: 17 },
  { status: 'Pending Approval', count: 10 },
  { status: 'In Procurement', count: 6 },
  { status: 'Received', count: 4 },
  { status: 'Cancelled', count: 1 },
];

function buildStatusSequence(): ProcurementStatus[] {
  const seq: ProcurementStatus[] = [];
  for (const { status, count } of GEN_STATUS_PLAN) {
    for (let i = 0; i < count; i++) seq.push(status);
  }
  return seq;
}

function generateBulkRequests(): ProcurementRequest[] {
  const statusSeq = buildStatusSequence();
  const departments = [...DEPARTMENT_OPTIONS];
  const requests: ProcurementRequest[] = [];

  for (let i = 0; i < GEN_TOTAL; i++) {
    const status = statusSeq[i]!;
    const department = departments[i % departments.length]!;
    const requestedBy = REQUESTERS[i % REQUESTERS.length]!;
    const seedKey = `procurement-${i}-${department}`;
    const rand = mulberry32(hashSeed(seedKey));
    const dayOffset = 12 + i * 2 + Math.floor(rand() * 3);

    const lineCount = 2 + Math.floor(rand() * 4);
    const lineItems: ProcurementLineItem[] = Array.from({ length: lineCount }, (_, li) => {
      const template = GEN_ITEM_NAMES[(i + li) % GEN_ITEM_NAMES.length]!;
      const quantity = 2 + Math.floor(rand() * 12);
      const estimatedUnitCost =
        Math.round((template.basePrice * (0.85 + rand() * 0.3)) / 100) * 100;
      return {
        id: `li-${li + 1}`,
        name: template.name,
        category: template.category,
        quantity,
        estimatedUnitCost,
      };
    });

    const priority: ProcurementPriority = rand() > 0.66 ? 'High' : rand() > 0.33 ? 'Medium' : 'Low';

    const updatedOffset =
      status === 'Pending Approval'
        ? dayOffset
        : Math.max(0, dayOffset - 1 - Math.floor(rand() * 3));

    requests.push({
      id: `PR-2026-${String(38 - i).padStart(5, '0')}`,
      requestDate: isoOffset(-dayOffset, 9, 0),
      department,
      requestedBy,
      priority,
      lineItems,
      estimatedAmount: Math.round((lineItemTotal(lineItems) * (1.03 + rand() * 0.06)) / 100) * 100,
      status,
      lastUpdated: isoOffset(-updatedOffset, 10 + (i % 6), (i * 7) % 60),
      estimatedDeliveryDate:
        status === 'Rejected' || status === 'Cancelled' ? null : isoOffset(-dayOffset + 9, 9, 0),
      approvalSteps: approvalStepsFor(status, requestedBy, isoOffset(-dayOffset)),
      origin: 'Manual',
      notes: '',
    });
  }

  return requests;
}

export const PROCUREMENT_REQUESTS: ProcurementRequest[] = [
  ...HERO_REQUESTS,
  ...generateBulkRequests(),
];

export function getProcurementRequest(id: string): ProcurementRequest | undefined {
  return PROCUREMENT_REQUESTS.find((r) => r.id === id);
}

export function lineItemTotal(items: ProcurementLineItem[]): number {
  return items.reduce((sum, li) => sum + li.quantity * li.estimatedUnitCost, 0);
}

export function categoryBreakdown(
  items: ProcurementLineItem[],
): { category: ProcurementCategory; count: number }[] {
  return CATEGORY_OPTIONS.map((category) => ({
    category,
    count: items.filter((li) => li.category === category).length,
  })).filter((c) => c.count > 0);
}
