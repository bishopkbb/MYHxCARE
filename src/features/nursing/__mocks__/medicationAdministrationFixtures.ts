/**
 * Mock fixtures for the Medication Administration (MAR) screen.
 * Swap out by pointing hooks to a real MAR endpoint in Phase 6.
 */

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type MedicationCategory = 'Scheduled' | 'PRN' | 'Continuous';
export type MedicationStatus =
  'Due Now' | 'Upcoming' | 'Overdue' | 'Completed' | 'Missed' | 'Held' | 'Running';

export type MedicationOrder = {
  id: string;
  medication: string;
  dose: string;
  route: string;
  frequency: string;
  timeDue: string; // ISO
  timeDueLabel?: string; // overrides the formatted time, e.g. "08:00 PM (Prev)"
  status: MedicationStatus;
  administeredBy?: string;
  remarks?: string;
  isHighAlert?: boolean;
};

const NURSE_NAME = 'Nurse Chidinma E.';

export const SCHEDULED_MEDICATIONS: MedicationOrder[] = [
  {
    id: 'mar-001',
    medication: 'Paracetamol',
    dose: '1,000 mg',
    route: 'PO',
    frequency: 'Q6H',
    timeDue: atOffset(0, 8, 0),
    status: 'Due Now',
  },
  {
    id: 'mar-002',
    medication: 'Ceftriaxone',
    dose: '1 g',
    route: 'IV',
    frequency: 'Q12H',
    timeDue: atOffset(0, 8, 0),
    status: 'Due Now',
    isHighAlert: true,
  },
  {
    id: 'mar-003',
    medication: 'Metronidazole',
    dose: '500 mg',
    route: 'IV',
    frequency: 'Q8H',
    timeDue: atOffset(0, 9, 0),
    status: 'Upcoming',
  },
  {
    id: 'mar-004',
    medication: 'Ondansetron',
    dose: '4 mg',
    route: 'IV',
    frequency: 'Q8H PRN',
    timeDue: atOffset(0, 9, 30),
    status: 'Upcoming',
  },
  {
    id: 'mar-005',
    medication: 'Pantoprazole',
    dose: '40 mg',
    route: 'IV',
    frequency: 'Q24H',
    timeDue: atOffset(0, 10, 0),
    status: 'Upcoming',
  },
  {
    id: 'mar-006',
    medication: 'Enoxaparin',
    dose: '40 mg',
    route: 'SC',
    frequency: 'Q24H',
    timeDue: atOffset(0, 11, 0),
    status: 'Upcoming',
  },
  {
    id: 'mar-007',
    medication: 'Tramadol',
    dose: '50 mg',
    route: 'PO',
    frequency: 'Q8H PRN',
    timeDue: atOffset(0, 7, 0),
    status: 'Overdue',
  },
  {
    id: 'mar-008',
    medication: 'Ceftriaxone',
    dose: '1 g',
    route: 'IV',
    frequency: 'Q12H',
    timeDue: atOffset(-1, 20, 0),
    timeDueLabel: '08:00 PM (Prev)',
    status: 'Completed',
    administeredBy: NURSE_NAME,
    remarks: 'No reaction',
  },
  {
    id: 'mar-009',
    medication: 'Paracetamol',
    dose: '1,000 mg',
    route: 'PO',
    frequency: 'Q6H',
    timeDue: atOffset(0, 2, 0),
    timeDueLabel: '02:00 AM (Prev)',
    status: 'Completed',
    administeredBy: NURSE_NAME,
    remarks: 'Tolerated well',
  },
];

export const PRN_MEDICATIONS: MedicationOrder[] = [
  {
    id: 'mar-prn-001',
    medication: 'Ondansetron',
    dose: '4 mg',
    route: 'IV',
    frequency: 'PRN — nausea/vomiting',
    timeDue: atOffset(0, 9, 30),
    status: 'Upcoming',
  },
  {
    id: 'mar-prn-002',
    medication: 'Paracetamol',
    dose: '500 mg',
    route: 'PO',
    frequency: 'PRN — breakthrough pain',
    timeDue: atOffset(0, 12, 0),
    status: 'Upcoming',
  },
];

export const CONTINUOUS_INFUSIONS: MedicationOrder[] = [
  {
    id: 'mar-inf-001',
    medication: 'Normal Saline 0.9%',
    dose: '100 mL/hr',
    route: 'IV',
    frequency: 'Continuous',
    timeDue: atOffset(0, 6, 0),
    status: 'Running',
  },
];

export type ClinicalAlert = {
  id: string;
  title: string;
  body: string;
  time?: string;
};

export const CLINICAL_ALERTS: ClinicalAlert[] = [
  {
    id: 'ca-1',
    title: 'High Risk Medication',
    body: 'Ceftriaxone is a high alert medication.',
  },
  {
    id: 'ca-2',
    title: 'Renal Function',
    body: 'Monitor renal function while on Enoxaparin.',
  },
  {
    id: 'ca-3',
    title: 'Pain Score',
    body: 'Last recorded pain score: 6/10',
    time: '30 mins ago',
  },
];

export const FIVE_RIGHTS: { label: string; detail: string }[] = [
  { label: 'Correct Medication', detail: 'Verify medication' },
  { label: 'Correct Dose', detail: 'Verify dose' },
  { label: 'Correct Route', detail: 'Verify route' },
  { label: 'Correct Time', detail: 'Verify time' },
];
