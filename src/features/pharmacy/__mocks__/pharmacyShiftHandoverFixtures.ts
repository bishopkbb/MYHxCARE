/**
 * Mock fixtures for the Shift Handover page (pharmacy workspace).
 * Mirrors nursing's shiftHandoverFixtures.ts shape and conventions for the
 * shift/personnel/checklist/history data, which is inherently per-shift
 * authored content. Unlike the nursing version, the Dispensing Summary,
 * Pending Verification Queue, Priority Follow-ups, Controlled Drugs Pending
 * Approval, and Low Stock Medicines panels are NOT fixtures here — the
 * workspace reads those live from pharmacyDispensingStore.ts and
 * inventoryStore.ts, so a handover always reflects the real queue/stock state
 * at hand-off time, not a stale snapshot.
 * Replace with real API data in Phase 6 integration.
 */

import { PHARMACY_LOCATIONS } from '@/constants/pharmacyLocations';

export type ShiftType = 'Morning' | 'Afternoon' | 'Night';

export type HandoverShiftInfo = {
  shiftDateLabel: string;
  shiftType: ShiftType;
  shiftTimeRange: string;
  handoverTimeLabel: string;
};

export type HandoverPharmacist = {
  name: string;
  staffId: string;
  email: string;
  phone: string;
  avatarBg: string;
};

// The same recurring pharmacist roster used across ADR Reports, Dispensing
// Report, Queue Monitor, and My Schedule's Campus Coverage panel.
export const OUTGOING_PHARMACIST: HandoverPharmacist = {
  name: 'Pharm. Adaeze',
  staffId: 'PHM-0186',
  email: 'adaeze.p@myhxcare.ng',
  phone: '+234 803 224 6610',
  avatarBg: '#F59E0B',
};

export const INCOMING_PHARMACIST: HandoverPharmacist = {
  name: 'Pharm. Victoria',
  staffId: 'PHM-0223',
  email: 'victoria.p@myhxcare.ng',
  phone: '+234 805 771 3392',
  avatarBg: '#1A3D4D',
};

const PRIMARY_LOCATION = PHARMACY_LOCATIONS[0]!;

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

export type CampusHandoverInfo = {
  name: string;
  campusCode: string;
  operatingHours: string;
  pharmacistInCharge: string;
};

export const CAMPUS_INFO: CampusHandoverInfo = {
  name: `${PRIMARY_LOCATION.shortName} Pharmacy`,
  campusCode: PRIMARY_LOCATION.id,
  operatingHours: PRIMARY_LOCATION.openingHours,
  pharmacistInCharge: OUTGOING_PHARMACIST.name,
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
    category: 'Controlled Drug Reconciliation',
    description: 'Confirm Schedule II count reconciliation — Morphine Sulfate 10mg',
    done: false,
  },
  {
    id: 't2',
    category: 'Controlled Drug Reconciliation',
    description: 'Countersign pending controlled dispense — Oxycodone 5mg',
    done: false,
  },
  {
    id: 't3',
    category: 'Controlled Drug Reconciliation',
    description: 'Countersign pending controlled dispense — Diazepam 5mg',
    done: false,
  },
  {
    id: 't4',
    category: 'Stock & Inventory',
    description: 'Confirm reorder submitted for Paracetamol 500mg',
    done: false,
  },
  {
    id: 't5',
    category: 'Stock & Inventory',
    description: 'Follow up on delayed delivery — Amoxicillin 500mg',
    done: false,
  },
  {
    id: 't6',
    category: 'Stock & Inventory',
    description: 'Quarantine check on batch flagged for QA review',
    done: false,
  },
  {
    id: 't7',
    category: 'Safety Follow-ups',
    description: 'Review ADR report submitted this shift — awaiting causality assessment',
    done: false,
  },
  {
    id: 't8',
    category: 'Safety Follow-ups',
    description: 'Confirm allergy hold resolved before releasing prescription',
    done: false,
  },
  {
    id: 't9',
    category: 'Procurement',
    description: 'Chase pending procurement approval — antibiotics restock',
    done: false,
  },
  {
    id: 't10',
    category: 'Procurement',
    description: 'Confirm supplier delivery window for tomorrow',
    done: false,
  },
  {
    id: 't11',
    category: 'Patient Counselling',
    description: 'Inhaler technique demonstration — pending patient callback',
    done: false,
  },
  {
    id: 't12',
    category: 'Patient Counselling',
    description: 'Dosage adjustment counselling — awaiting prescriber confirmation',
    done: false,
  },
];

export type HandoverHistoryEntry = {
  id: string;
  shiftDateLabel: string;
  shiftType: ShiftType;
  outgoingPharmacist: string;
  incomingPharmacist: string;
  campus: string;
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
    hour12: true,
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
    outgoingPharmacist: 'Pharm. John',
    incomingPharmacist: OUTGOING_PHARMACIST.name,
    campus: CAMPUS_INFO.name,
    completedAtLabel: daysAgoLabel(1, 7, 4),
  },
  {
    id: 'h2',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Afternoon',
    outgoingPharmacist: 'Pharm. Grace',
    incomingPharmacist: 'Pharm. John',
    campus: CAMPUS_INFO.name,
    completedAtLabel: daysAgoLabel(1, 15, 6),
  },
  {
    id: 'h3',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Morning',
    outgoingPharmacist: OUTGOING_PHARMACIST.name,
    incomingPharmacist: 'Pharm. Grace',
    campus: CAMPUS_INFO.name,
    completedAtLabel: daysAgoLabel(1, 15, 1),
  },
  {
    id: 'h4',
    shiftDateLabel: daysAgoDateLabel(2),
    shiftType: 'Night',
    outgoingPharmacist: 'Pharm. John',
    incomingPharmacist: OUTGOING_PHARMACIST.name,
    campus: CAMPUS_INFO.name,
    completedAtLabel: daysAgoLabel(2, 7, 9),
  },
];
