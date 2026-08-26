/**
 * Mock fixtures for Service & Pricing (`/admin/service-pricing`). Department
 * reuses the same 8-value `OrganizationalDepartment` this session's whole
 * Administration build already shares (Staff Management / Roles &
 * Permissions / Departments), not a new or the unrelated 28-value clinical-
 * specialty list. The reference mockup's one outlier row (Chest X-Ray under
 * "Radiology") is seeded under Laboratory instead, category stays Imaging,
 * same "reuse the established 8" call already made for the other
 * Administration screens this session.
 *
 * Models the real two-stage publish workflow the reference mockup's own
 * "Pricing Update Workflow" panel describes: a service's `currentPrice`/
 * `effectiveDate` is what's live, and an edit creates a separate
 * `pendingPrice`/`pendingEffectiveDate` awaiting review, never overwriting
 * the published figure directly ("published prices cannot be edited").
 * Swap out by pointing hooks to a real services/pricing endpoint in Phase 6.
 */

import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';
import type { PriceChangeLogEntry } from '@/features/administration/__mocks__/priceChangeLogFixtures';

export type ServiceCategory =
  | 'Consultation'
  | 'Lab Test'
  | 'Medication'
  | 'Room Charge'
  | 'Procedure'
  | 'Imaging'
  | 'Administrative Fee';

export const CATEGORY_OPTIONS: { value: ServiceCategory; label: string }[] = [
  'Consultation',
  'Lab Test',
  'Medication',
  'Room Charge',
  'Procedure',
  'Imaging',
  'Administrative Fee',
].map((c) => ({ value: c as ServiceCategory, label: c }));

export type ServiceStatus = 'Active' | 'Pending' | 'Inactive';

export const STATUS_OPTIONS: { value: ServiceStatus; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Inactive', label: 'Inactive' },
];

export type ServiceRecord = {
  id: string;
  name: string;
  department: OrganizationalDepartment;
  category: ServiceCategory;
  currentPrice: number;
  effectiveDate: string;
  pendingPrice: number | null;
  pendingEffectiveDate: string | null;
  status: ServiceStatus;
  /** The status a Pending service should revert to if its pending change is
   * rejected, Active or Inactive, whichever it was before the edit. Null
   * whenever status isn't Pending. */
  previousStatus: ServiceStatus | null;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
};

function isoDate(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d)).toISOString();
}

// ─── Curated rows, matching the reference mockup's own exact values ───────

const CURATED: Omit<ServiceRecord, 'id'>[] = [
  {
    name: 'General Consultation',
    department: 'Clinical / Consultation',
    category: 'Consultation',
    currentPrice: 3000,
    effectiveDate: isoDate(2026, 8, 1),
    pendingPrice: null,
    pendingEffectiveDate: null,
    status: 'Active',
    previousStatus: null,
    lastUpdatedAt: isoDate(2026, 8, 10),
    lastUpdatedBy: 'Admin User',
  },
  {
    name: 'Malaria Test',
    department: 'Laboratory',
    category: 'Lab Test',
    currentPrice: 3500,
    effectiveDate: isoDate(2026, 7, 1),
    pendingPrice: 4000,
    pendingEffectiveDate: isoDate(2026, 8, 15),
    status: 'Pending',
    previousStatus: 'Active',
    lastUpdatedAt: isoDate(2026, 8, 18),
    lastUpdatedBy: 'Admin User',
  },
  {
    name: 'Paracetamol 500mg',
    department: 'Pharmacy',
    category: 'Medication',
    currentPrice: 150,
    effectiveDate: isoDate(2026, 8, 1),
    pendingPrice: null,
    pendingEffectiveDate: null,
    status: 'Active',
    previousStatus: null,
    lastUpdatedAt: isoDate(2026, 8, 5),
    lastUpdatedBy: 'Pharmacist',
  },
  {
    name: 'Full Blood Count (FBC)',
    department: 'Laboratory',
    category: 'Lab Test',
    currentPrice: 5500,
    effectiveDate: isoDate(2026, 7, 20),
    pendingPrice: null,
    pendingEffectiveDate: null,
    status: 'Active',
    previousStatus: null,
    lastUpdatedAt: isoDate(2026, 7, 20),
    lastUpdatedBy: 'Admin User',
  },
  {
    name: 'Emergency Consultation',
    department: 'Emergency',
    category: 'Consultation',
    currentPrice: 8000,
    effectiveDate: isoDate(2026, 8, 1),
    pendingPrice: null,
    pendingEffectiveDate: null,
    status: 'Active',
    previousStatus: null,
    lastUpdatedAt: isoDate(2026, 8, 1),
    lastUpdatedBy: 'Admin User',
  },
  {
    name: 'Standard Ward (Per Day)',
    department: 'Nursing / Wards',
    category: 'Room Charge',
    currentPrice: 15000,
    effectiveDate: isoDate(2026, 8, 1),
    pendingPrice: null,
    pendingEffectiveDate: null,
    status: 'Active',
    previousStatus: null,
    lastUpdatedAt: isoDate(2026, 8, 2),
    lastUpdatedBy: 'Admin User',
  },
  {
    name: 'Anti Tetanus Injection',
    department: 'Pharmacy',
    category: 'Procedure',
    currentPrice: 2500,
    effectiveDate: isoDate(2026, 7, 10),
    pendingPrice: null,
    pendingEffectiveDate: null,
    status: 'Inactive',
    previousStatus: null,
    lastUpdatedAt: isoDate(2026, 7, 10),
    lastUpdatedBy: 'Admin User',
  },
  {
    name: 'Chest X-Ray',
    department: 'Laboratory',
    category: 'Imaging',
    currentPrice: 6000,
    effectiveDate: isoDate(2026, 7, 1),
    pendingPrice: 7000,
    pendingEffectiveDate: isoDate(2026, 8, 5),
    status: 'Pending',
    previousStatus: 'Active',
    lastUpdatedAt: isoDate(2026, 8, 19),
    lastUpdatedBy: 'Admin User',
  },
];

// ─── Generated fill, 78 more rows to reach 86 total ────────────────────────

type Template = { name: string; category: ServiceCategory };

const DEPT_TEMPLATES: Record<OrganizationalDepartment, Template[]> = {
  'Clinical / Consultation': [
    { name: 'Follow-up Consultation', category: 'Consultation' },
    { name: 'Specialist Consultation', category: 'Consultation' },
    { name: 'New Patient Consultation', category: 'Consultation' },
    { name: 'Telemedicine Consultation', category: 'Consultation' },
    { name: 'Second Opinion Consultation', category: 'Consultation' },
    { name: 'Home Visit Consultation', category: 'Consultation' },
    { name: 'Antenatal Consultation', category: 'Consultation' },
    { name: 'Paediatric Consultation', category: 'Consultation' },
    { name: 'Surgical Consultation', category: 'Consultation' },
    { name: 'Psychiatric Consultation', category: 'Consultation' },
    { name: 'Dermatology Consultation', category: 'Consultation' },
    { name: 'ENT Consultation', category: 'Consultation' },
  ],
  'Nursing / Wards': [
    { name: 'Private Ward (Per Day)', category: 'Room Charge' },
    { name: 'Semi-Private Ward (Per Day)', category: 'Room Charge' },
    { name: 'ICU Bed (Per Day)', category: 'Room Charge' },
    { name: 'Maternity Ward (Per Day)', category: 'Room Charge' },
    { name: 'Isolation Ward (Per Day)', category: 'Room Charge' },
    { name: 'Paediatric Ward (Per Day)', category: 'Room Charge' },
    { name: 'Post-Surgical Ward (Per Day)', category: 'Room Charge' },
    { name: 'Observation Bed (Per Day)', category: 'Room Charge' },
  ],
  Pharmacy: [
    { name: 'Amoxicillin Capsule', category: 'Medication' },
    { name: 'Artemether-Lumefantrine', category: 'Medication' },
    { name: 'Metronidazole Tablet', category: 'Medication' },
    { name: 'Vitamin C Tablet', category: 'Medication' },
    { name: 'ORS Sachet', category: 'Medication' },
    { name: 'Folic Acid Tablet', category: 'Medication' },
    { name: 'Ibuprofen Tablet', category: 'Medication' },
    { name: 'Ampiclox Capsule', category: 'Medication' },
    { name: 'Ciprofloxacin Tablet', category: 'Medication' },
    { name: 'Antimalarial Injection', category: 'Medication' },
    { name: 'IV Fluids (Normal Saline)', category: 'Medication' },
    { name: 'Multivitamin Syrup', category: 'Medication' },
    { name: 'Cough Syrup', category: 'Medication' },
    { name: 'Antihistamine Tablet', category: 'Medication' },
    { name: 'Diclofenac Injection', category: 'Medication' },
    { name: 'Omeprazole Capsule', category: 'Medication' },
    { name: 'Metformin Tablet', category: 'Medication' },
    { name: 'Amlodipine Tablet', category: 'Medication' },
    { name: 'Cetirizine Tablet', category: 'Medication' },
    { name: 'Chloroquine Tablet', category: 'Medication' },
  ],
  Laboratory: [
    { name: 'Widal Test', category: 'Lab Test' },
    { name: 'Urinalysis', category: 'Lab Test' },
    { name: 'Blood Sugar (Fasting)', category: 'Lab Test' },
    { name: 'Lipid Profile', category: 'Lab Test' },
    { name: 'Liver Function Test', category: 'Lab Test' },
    { name: 'Kidney Function Test', category: 'Lab Test' },
    { name: 'HIV Screening', category: 'Lab Test' },
    { name: 'Hepatitis B Screening', category: 'Lab Test' },
    { name: 'Stool Microscopy', category: 'Lab Test' },
    { name: 'Pregnancy Test', category: 'Lab Test' },
    { name: 'ESR Test', category: 'Lab Test' },
    { name: 'Genotype Test', category: 'Lab Test' },
    { name: 'Blood Grouping', category: 'Lab Test' },
    { name: 'Abdominal Ultrasound', category: 'Imaging' },
    { name: 'Pelvic Ultrasound', category: 'Imaging' },
    { name: 'Electrocardiogram (ECG)', category: 'Imaging' },
    { name: 'Sputum Test', category: 'Lab Test' },
    { name: 'Semen Analysis', category: 'Lab Test' },
  ],
  Emergency: [
    { name: 'Trauma Assessment', category: 'Procedure' },
    { name: 'Wound Dressing', category: 'Procedure' },
    { name: 'Splinting', category: 'Procedure' },
    { name: 'Cardiopulmonary Resuscitation (CPR)', category: 'Procedure' },
    { name: 'Emergency Triage', category: 'Consultation' },
    { name: 'Ambulance Transfer', category: 'Procedure' },
  ],
  'Accounts & Billing': [
    { name: 'Statement Processing Fee', category: 'Administrative Fee' },
    { name: 'Insurance Claim Processing', category: 'Administrative Fee' },
    { name: 'Payment Plan Setup Fee', category: 'Administrative Fee' },
    { name: 'Account Reconciliation Fee', category: 'Administrative Fee' },
    { name: 'Refund Processing Fee', category: 'Administrative Fee' },
  ],
  Records: [
    { name: 'Medical Report Fee', category: 'Administrative Fee' },
    { name: 'Records Duplication Fee', category: 'Administrative Fee' },
    { name: 'Referral Letter Fee', category: 'Administrative Fee' },
    { name: 'Discharge Summary Fee', category: 'Administrative Fee' },
    { name: 'Medical Certificate Fee', category: 'Administrative Fee' },
  ],
  Administration: [
    { name: 'ID Card Replacement Fee', category: 'Administrative Fee' },
    { name: 'Administrative Processing Fee', category: 'Administrative Fee' },
    { name: 'Document Notarization Fee', category: 'Administrative Fee' },
    { name: 'Late Payment Processing Fee', category: 'Administrative Fee' },
  ],
};

// How many generated rows to draw from each department, totalling 78.
const DEPT_QUOTA: Record<OrganizationalDepartment, number> = {
  'Clinical / Consultation': 12,
  'Nursing / Wards': 8,
  Pharmacy: 20,
  Laboratory: 18,
  Emergency: 6,
  'Accounts & Billing': 5,
  Records: 5,
  Administration: 4,
};

const CATEGORY_PRICE_RANGE: Record<ServiceCategory, [number, number]> = {
  Consultation: [2500, 10000],
  'Lab Test': [1500, 8000],
  Medication: [100, 3000],
  'Room Charge': [8000, 30000],
  Procedure: [1500, 12000],
  Imaging: [4000, 15000],
  'Administrative Fee': [500, 5000],
};

const UPDATED_BY_POOL = ['Admin User', 'Pharmacist', 'Lab Manager', 'Accounts Manager'];

function priceFor(category: ServiceCategory, seed: number): number {
  const [min, max] = CATEGORY_PRICE_RANGE[category];
  const span = max - min;
  const step = (seed * 137) % (span + 1);
  return Math.round((min + step) / 50) * 50;
}

function buildGenerated(): Omit<ServiceRecord, 'id'>[] {
  const rows: Omit<ServiceRecord, 'id'>[] = [];
  let globalIndex = 0;

  (Object.keys(DEPT_QUOTA) as OrganizationalDepartment[]).forEach((dept) => {
    const templates = DEPT_TEMPLATES[dept];
    const quota = DEPT_QUOTA[dept];
    for (let i = 0; i < quota; i++) {
      const template = templates[i % templates.length]!;
      const price = priceFor(template.category, globalIndex + 1);
      const dayOfMonth = 1 + (globalIndex % 27);
      rows.push({
        name: template.name,
        department: dept,
        category: template.category,
        currentPrice: price,
        effectiveDate: isoDate(2026, 7 + (globalIndex % 2), dayOfMonth),
        pendingPrice: null,
        pendingEffectiveDate: null,
        status: 'Active',
        previousStatus: null,
        lastUpdatedAt: isoDate(2026, 7 + (globalIndex % 2), dayOfMonth),
        lastUpdatedBy: UPDATED_BY_POOL[globalIndex % UPDATED_BY_POOL.length]!,
      });
      globalIndex += 1;
    }
  });

  // Exact, deterministic status split: 7 Inactive, 4 Pending, rest (67)
  // Active, chosen so neither modulo collides with the other.
  let inactiveLeft = 7;
  let pendingLeft = 4;
  return rows.map((row, i) => {
    if (inactiveLeft > 0 && i % 11 === 3) {
      inactiveLeft -= 1;
      return { ...row, status: 'Inactive' as ServiceStatus };
    }
    if (pendingLeft > 0 && i % 19 === 7) {
      pendingLeft -= 1;
      const bump = Math.round((row.currentPrice * 1.1) / 50) * 50;
      return {
        ...row,
        status: 'Pending' as ServiceStatus,
        previousStatus: 'Active' as ServiceStatus,
        pendingPrice: bump,
        pendingEffectiveDate: isoDate(2026, 8, 20 + (i % 8)),
      };
    }
    return row;
  });
}

export const SERVICE_RECORDS: ServiceRecord[] = [...CURATED, ...buildGenerated()].map((row, i) => ({
  ...row,
  id: `SVC-${String(i + 1).padStart(4, '0')}`,
}));

export type ServiceStats = {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  priceChangesThisMonth: number;
};

export function computeServiceStats(
  services: ServiceRecord[],
  log: PriceChangeLogEntry[],
): ServiceStats {
  const now = new Date();
  const priceChangesThisMonth = log.filter((entry) => {
    const d = new Date(entry.changedAt);
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }).length;
  return {
    total: services.length,
    active: services.filter((s) => s.status === 'Active').length,
    pending: services.filter((s) => s.status === 'Pending').length,
    inactive: services.filter((s) => s.status === 'Inactive').length,
    priceChangesThisMonth,
  };
}

export function nextServiceId(services: ServiceRecord[]): string {
  const max = services.reduce((m, s) => {
    const n = Number(s.id.replace('SVC-', ''));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `SVC-${String(max + 1).padStart(4, '0')}`;
}
