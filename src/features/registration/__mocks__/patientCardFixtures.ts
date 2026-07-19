/**
 * Mock fixtures for the Patient Card Printing screen.
 * Swap out by pointing hooks to a real card-issuance endpoint in
 * Phase 6.
 */

import { Archive, Clock, CreditCard, FileText, RefreshCw, type LucideIcon } from 'lucide-react';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function atDayOffset(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

export type CardType = 'Student' | 'Staff' | 'Dependent' | 'Visitor';
export type CardStatus = 'Printed' | 'Pending' | 'Reprint Requested' | 'Expired' | 'Lost/Damaged';

export const CARD_TYPE_OPTIONS: { value: CardType; label: string }[] = [
  { value: 'Student', label: 'Student' },
  { value: 'Staff', label: 'Staff' },
  { value: 'Dependent', label: 'Dependent' },
  { value: 'Visitor', label: 'Visitor' },
];

export const CARD_STATUS_OPTIONS: { value: CardStatus; label: string }[] = [
  { value: 'Printed', label: 'Printed' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Reprint Requested', label: 'Reprint Requested' },
  { value: 'Expired', label: 'Expired' },
  { value: 'Lost/Damaged', label: 'Lost/Damaged' },
];

export const BLOOD_GROUP_OPTIONS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export type CardTemplate = {
  id: string;
  cardType: CardType;
  name: string;
  description: string;
  accent: string;
};

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'tpl-student',
    cardType: 'Student',
    name: 'Student ID Card',
    description: 'Standard template for enrolled students, includes faculty and matric number.',
    accent: '#00B4D8',
  },
  {
    id: 'tpl-staff',
    cardType: 'Staff',
    name: 'Staff ID Card',
    description: 'For university and hospital staff, includes department and role.',
    accent: '#8B5CF6',
  },
  {
    id: 'tpl-dependent',
    cardType: 'Dependent',
    name: 'Dependent Card',
    description: 'For staff dependents covered under the staff health scheme.',
    accent: '#22C55E',
  },
  {
    id: 'tpl-visitor',
    cardType: 'Visitor',
    name: 'Visitor Card',
    description: 'Short-validity card for non-affiliated patients and visitors.',
    accent: '#F59E0B',
  },
];

export type PatientCard = {
  id: string; // CARD-2026-0001
  patientName: string;
  mrn: string;
  patientId: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  bloodGroup: string;
  cardType: CardType;
  issueDate: string; // ISO
  expiryDate: string; // YYYY-MM-DD
  status: CardStatus;
  printCount: number;
  lastPrintedBy: string;
};

const CURATED_CARDS: PatientCard[] = [
  {
    id: 'CARD-2026-0148',
    patientName: 'Chidinma Okafor',
    mrn: 'MRN-2025-00124',
    patientId: 'PT-000124',
    gender: 'Female',
    dateOfBirth: '2004-05-10',
    bloodGroup: 'O+',
    cardType: 'Student',
    issueDate: atOffset(0, 9, 40),
    expiryDate: atDayOffset(365),
    status: 'Printed',
    printCount: 1,
    lastPrintedBy: 'Adaobi Nwankwo',
  },
  {
    id: 'CARD-2026-0147',
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    patientId: 'PT-000987',
    gender: 'Male',
    dateOfBirth: '1996-11-02',
    bloodGroup: 'A+',
    cardType: 'Staff',
    issueDate: atOffset(-1, 14, 15),
    expiryDate: atDayOffset(700),
    status: 'Reprint Requested',
    printCount: 1,
    lastPrintedBy: 'Adaobi Nwankwo',
  },
  {
    id: 'CARD-2026-0146',
    patientName: 'Maryam Usman',
    mrn: 'MRN-2024-00765',
    patientId: 'PT-000765',
    gender: 'Female',
    dateOfBirth: '1990-03-18',
    bloodGroup: 'B+',
    cardType: 'Student',
    issueDate: atOffset(-2, 10, 5),
    expiryDate: atDayOffset(-5),
    status: 'Expired',
    printCount: 2,
    lastPrintedBy: 'Mary Uche',
  },
  {
    id: 'CARD-2026-0145',
    patientName: 'Emeka Obi',
    mrn: 'MRN-2023-00543',
    patientId: 'PT-000543',
    gender: 'Male',
    dateOfBirth: '1985-07-24',
    bloodGroup: 'AB+',
    cardType: 'Dependent',
    issueDate: atOffset(-2, 15, 30),
    expiryDate: atDayOffset(365),
    status: 'Printed',
    printCount: 1,
    lastPrintedBy: 'Jane Ezeonu',
  },
  {
    id: 'CARD-2026-0144',
    patientName: 'Grace Adebayo',
    mrn: 'MRN-2023-00421',
    patientId: 'PT-000421',
    gender: 'Female',
    dateOfBirth: '1992-01-30',
    bloodGroup: 'O-',
    cardType: 'Visitor',
    issueDate: atOffset(-3, 11, 10),
    expiryDate: atDayOffset(30),
    status: 'Pending',
    printCount: 0,
    lastPrintedBy: '—',
  },
  {
    id: 'CARD-2026-0143',
    patientName: 'Seyi Adewale',
    mrn: 'MRN-2023-00311',
    patientId: 'PT-000311',
    gender: 'Male',
    dateOfBirth: '1978-09-12',
    bloodGroup: 'A-',
    cardType: 'Staff',
    issueDate: atOffset(-3, 9, 45),
    expiryDate: atDayOffset(700),
    status: 'Printed',
    printCount: 1,
    lastPrintedBy: 'Adaobi Nwankwo',
  },
  {
    id: 'CARD-2026-0142',
    patientName: 'Favour Bassey',
    mrn: 'MRN-2024-01002',
    patientId: 'PT-001002',
    gender: 'Female',
    dateOfBirth: '1999-04-05',
    bloodGroup: 'B-',
    cardType: 'Student',
    issueDate: atOffset(-4, 16, 20),
    expiryDate: atDayOffset(365),
    status: 'Lost/Damaged',
    printCount: 1,
    lastPrintedBy: 'Mary Uche',
  },
  {
    id: 'CARD-2026-0141',
    patientName: 'Daniel Eze',
    mrn: 'MRN-2023-00187',
    patientId: 'PT-000187',
    gender: 'Male',
    dateOfBirth: '1988-12-21',
    bloodGroup: 'O+',
    cardType: 'Visitor',
    issueDate: atOffset(-4, 8, 55),
    expiryDate: atDayOffset(30),
    status: 'Printed',
    printCount: 1,
    lastPrintedBy: 'Jane Ezeonu',
  },
];

const GEN_FIRST_NAMES = [
  'Ngozi',
  'Tunde',
  'Aisha',
  'Peter',
  'Victoria',
  'Chukwuemeka',
  'Musa',
  'Blessing',
  'Kelechi',
  'Halima',
  'Chinedu',
  'Grace',
  'Ikenna',
  'Ronke',
  'Segun',
  'Patience',
];
const GEN_LAST_NAMES = [
  'Nwachukwu',
  'Balogun',
  'Suleiman',
  'Achike',
  'Bassey',
  'Etim',
  'Idika',
  'Aliyu',
  'Okoro',
  'Ibe',
  'Effiong',
  'Nwankwo',
  'Umeh',
  'Adewale',
  'Bello',
  'Okoye',
];
const GEN_CARD_TYPES: CardType[] = ['Student', 'Staff', 'Dependent', 'Visitor'];
const GEN_OFFICERS = ['Adaobi Nwankwo', 'Mary Uche', 'Jane Ezeonu'];

function statusForIndex(i: number): CardStatus {
  if (i % 11 === 0) return 'Lost/Damaged';
  if (i % 7 === 0) return 'Expired';
  if (i % 5 === 0) return 'Reprint Requested';
  if (i % 4 === 0) return 'Pending';
  return 'Printed';
}

const GENERATED_CARDS: PatientCard[] = Array.from({ length: 24 }, (_, idx) => {
  const i = idx + 1; // CARD-2026-0001 .. 0024
  const cardType = GEN_CARD_TYPES[i % GEN_CARD_TYPES.length] as CardType;
  const status = statusForIndex(i);
  const validityDays = cardType === 'Visitor' ? 30 : cardType === 'Staff' ? 700 : 365;
  return {
    id: `CARD-2026-${String(i).padStart(4, '0')}`,
    patientName: `${GEN_FIRST_NAMES[i % GEN_FIRST_NAMES.length]} ${GEN_LAST_NAMES[(i * 3) % GEN_LAST_NAMES.length]}`,
    mrn: `MRN-${2020 + (i % 7)}-${String(100 + i * 3).padStart(5, '0')}`,
    patientId: `PT-${String(100 + i * 3).padStart(6, '0')}`,
    gender: i % 2 === 0 ? 'Female' : ('Male' as const),
    dateOfBirth: `${1975 + (i % 30)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`,
    bloodGroup: BLOOD_GROUP_OPTIONS[i % BLOOD_GROUP_OPTIONS.length] as string,
    cardType,
    issueDate: atOffset(-(5 + (24 - i)), 8 + (i % 9), (i * 13) % 60),
    expiryDate: atDayOffset(validityDays - i * 3),
    status,
    printCount: status === 'Pending' ? 0 : 1 + (i % 3),
    lastPrintedBy: status === 'Pending' ? '—' : (GEN_OFFICERS[i % GEN_OFFICERS.length] as string),
  };
});

export const PATIENT_CARDS: PatientCard[] = [...CURATED_CARDS, ...GENERATED_CARDS];

// ─── Stat cards ──────────────────────────────────────────────────────────────
export const CARD_STATS: {
  id: string;
  label: string;
  value: string;
  trendLabel: string;
  trendPercent: number;
  trendDirection: 'up' | 'down';
  icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
  {
    id: 'printed-today',
    label: 'Cards Printed Today',
    value: '18',
    trendLabel: 'from yesterday',
    trendPercent: 12,
    trendDirection: 'up',
    icon: CreditCard,
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.12)',
  },
  {
    id: 'total-issued',
    label: 'Total Cards Issued',
    value: '2,458',
    trendLabel: 'from last month',
    trendPercent: 9,
    trendDirection: 'up',
    icon: FileText,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'pending',
    label: 'Pending Print Requests',
    value: '14',
    trendLabel: 'from yesterday',
    trendPercent: 4,
    trendDirection: 'down',
    icon: Clock,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'expiring-soon',
    label: 'Expiring Within 30 Days',
    value: '32',
    trendLabel: 'from last month',
    trendPercent: 6,
    trendDirection: 'up',
    icon: Archive,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
  },
  {
    id: 'reprints',
    label: 'Reprints This Month',
    value: '9',
    trendLabel: 'from last month',
    trendPercent: 2,
    trendDirection: 'down',
    icon: RefreshCw,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
  },
];
