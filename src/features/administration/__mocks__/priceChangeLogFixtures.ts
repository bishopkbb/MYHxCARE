/**
 * The append-only log of PUBLISHED price changes for Service & Pricing
 * (`/admin/service-pricing`). Only real `publishPendingChange()` actions
 * write here; a still-unpublished change lives on the `ServiceRecord`
 * itself (`pendingPrice`/`pendingEffectiveDate`), never in this log, so
 * there's one source of truth per change, not two. Seeded with a
 * realistic backlog; 14 entries fall in the current calendar month,
 * matching the reference mockup's "Price Changes (This Month): 14" stat.
 * Swap out by pointing hooks to a real endpoint in Phase 6.
 */

export type PriceChangeLogEntry = {
  id: string;
  serviceId: string;
  serviceName: string;
  previousPrice: number;
  newPrice: number;
  effectiveDate: string;
  changedBy: string;
  changedAt: string;
  status: 'Published';
};

function isoDateTime(y: number, m: number, d: number, h: number, min: number): string {
  return new Date(Date.UTC(y, m - 1, d, h, min)).toISOString();
}

const UPDATED_BY_POOL = ['Admin User', 'Pharmacist', 'Lab Manager', 'Accounts Manager'];

const THIS_MONTH_SERVICES: { name: string; from: number; to: number; day: number }[] = [
  { name: 'General Consultation', from: 2500, to: 3000, day: 1 },
  { name: 'Full Blood Count (FBC)', from: 5000, to: 5500, day: 3 },
  { name: 'Paracetamol 500mg', from: 100, to: 150, day: 4 },
  { name: 'Emergency Consultation', from: 7000, to: 8000, day: 5 },
  { name: 'Standard Ward (Per Day)', from: 13000, to: 15000, day: 6 },
  { name: 'Widal Test', from: 2000, to: 2200, day: 7 },
  { name: 'Amoxicillin Capsule', from: 500, to: 600, day: 8 },
  { name: 'Private Ward (Per Day)', from: 20000, to: 22000, day: 9 },
  { name: 'Follow-up Consultation', from: 2000, to: 2500, day: 10 },
  { name: 'Urinalysis', from: 1500, to: 1700, day: 12 },
  { name: 'ICU Bed (Per Day)', from: 25000, to: 28000, day: 14 },
  { name: 'Wound Dressing', from: 3000, to: 3500, day: 16 },
  { name: 'Blood Sugar (Fasting)', from: 1200, to: 1400, day: 18 },
  { name: 'Metformin Tablet', from: 400, to: 450, day: 20 },
];

const PRIOR_MONTHS_SERVICES: {
  name: string;
  from: number;
  to: number;
  month: number;
  day: number;
}[] = [
  { name: 'Anti Tetanus Injection', from: 2000, to: 2500, month: 7, day: 10 },
  { name: 'Lipid Profile', from: 3500, to: 4000, month: 7, day: 12 },
  { name: 'Liver Function Test', from: 4200, to: 4500, month: 7, day: 15 },
  { name: 'Semi-Private Ward (Per Day)', from: 16000, to: 17500, month: 7, day: 8 },
  { name: 'HIV Screening', from: 2800, to: 3000, month: 7, day: 22 },
  { name: 'Ciprofloxacin Tablet', from: 350, to: 400, month: 7, day: 25 },
  { name: 'Trauma Assessment', from: 3800, to: 4200, month: 6, day: 5 },
  { name: 'Abdominal Ultrasound', from: 6500, to: 7000, month: 6, day: 11 },
  { name: 'Insurance Claim Processing', from: 1000, to: 1200, month: 6, day: 14 },
  { name: 'Kidney Function Test', from: 4000, to: 4300, month: 6, day: 19 },
  { name: 'Medical Report Fee', from: 1500, to: 1800, month: 6, day: 23 },
  { name: 'Multivitamin Syrup', from: 800, to: 900, month: 6, day: 27 },
];

export const PRICE_CHANGE_LOG: PriceChangeLogEntry[] = [
  ...THIS_MONTH_SERVICES.map((s, i) => ({
    id: `LOG-${String(i + 1).padStart(4, '0')}`,
    serviceId: `SVC-THIS-${i + 1}`,
    serviceName: s.name,
    previousPrice: s.from,
    newPrice: s.to,
    effectiveDate: isoDateTime(2026, 8, s.day, 8, 0),
    changedBy: UPDATED_BY_POOL[i % UPDATED_BY_POOL.length]!,
    changedAt: isoDateTime(2026, 8, s.day, 9, 30),
    status: 'Published' as const,
  })),
  ...PRIOR_MONTHS_SERVICES.map((s, i) => ({
    id: `LOG-${String(THIS_MONTH_SERVICES.length + i + 1).padStart(4, '0')}`,
    serviceId: `SVC-PRIOR-${i + 1}`,
    serviceName: s.name,
    previousPrice: s.from,
    newPrice: s.to,
    effectiveDate: isoDateTime(2026, s.month, s.day, 8, 0),
    changedBy: UPDATED_BY_POOL[i % UPDATED_BY_POOL.length]!,
    changedAt: isoDateTime(2026, s.month, s.day, 9, 30),
    status: 'Published' as const,
  })),
];
