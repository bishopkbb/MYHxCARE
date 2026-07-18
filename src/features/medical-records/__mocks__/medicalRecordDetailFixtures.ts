/**
 * Mock fixtures for the single-patient Medical Record page. Demographics
 * are NOT duplicated here — the page imports MOCK_PATIENT_PROFILE directly
 * so this screen always agrees with Patient Profile / Check-In on who this
 * patient is (MRN-2026-00451).
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import {
  ClipboardEdit,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Pill,
  Plus,
  type LucideIcon,
} from 'lucide-react';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ─── Medical summary fields not already on PatientProfile ──────────────────

export const MEDICAL_SUMMARY_EXTRA = {
  genotype: 'AA',
  height: '165 cm',
  weight: '62 kg',
  bmi: '22.8',
  medications: 'Salbutamol (PRN)',
  recordVisibility: 'Care Team',
};

// ─── Documents & Files ───────────────────────────────────────────────────────

export type DocumentType = 'Clinical Note' | 'Lab Result' | 'Prescription' | 'Imaging' | 'Other';

export const DOCUMENT_TYPE_CFG: Record<
  DocumentType,
  { icon: LucideIcon; iconColor: string; badgeColor: string; badgeBorder: string; badgeBg: string }
> = {
  'Clinical Note': {
    icon: FileText,
    iconColor: '#EF4444',
    badgeColor: '#EF4444',
    badgeBorder: 'rgba(239,68,68,0.3)',
    badgeBg: 'rgba(239,68,68,0.06)',
  },
  'Lab Result': {
    icon: FlaskConical,
    iconColor: '#3B82F6',
    badgeColor: '#3B82F6',
    badgeBorder: 'rgba(59,130,246,0.3)',
    badgeBg: 'rgba(59,130,246,0.06)',
  },
  Prescription: {
    icon: Pill,
    iconColor: '#8B5CF6',
    badgeColor: '#8B5CF6',
    badgeBorder: 'rgba(139,92,246,0.3)',
    badgeBg: 'rgba(139,92,246,0.06)',
  },
  Imaging: {
    icon: ImageIcon,
    iconColor: '#F59E0B',
    badgeColor: '#F59E0B',
    badgeBorder: 'rgba(245,158,11,0.3)',
    badgeBg: 'rgba(245,158,11,0.06)',
  },
  Other: {
    icon: FileText,
    iconColor: '#22C55E',
    badgeColor: '#22C55E',
    badgeBorder: 'rgba(34,197,94,0.3)',
    badgeBg: 'rgba(34,197,94,0.06)',
  },
};

export type MedicalDocument = {
  id: string;
  name: string;
  subtitle?: string;
  type: DocumentType;
  uploadedBy: string;
  dateUploaded: string; // ISO
  visitDate: string; // ISO
};

const FEATURED_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'doc-001',
    name: 'Consultation Note - 25 Jun 2026',
    subtitle: 'Visit Note',
    type: 'Clinical Note',
    uploadedBy: 'Dr. Jane Ezeonu (GP)',
    dateUploaded: atOffset(-1, 9, 20),
    visitDate: atOffset(-1, 9, 0),
  },
  {
    id: 'doc-002',
    name: 'Lab Result - FBC',
    subtitle: 'Complete Blood Count',
    type: 'Lab Result',
    uploadedBy: 'Dr. Ifeanyi Okafor',
    dateUploaded: atOffset(-1, 11, 5),
    visitDate: atOffset(-1, 9, 0),
  },
  {
    id: 'doc-003',
    name: 'Prescription - 25 Jun 2026',
    type: 'Prescription',
    uploadedBy: 'Dr. Jane Ezeonu (GP)',
    dateUploaded: atOffset(-1, 9, 25),
    visitDate: atOffset(-1, 9, 0),
  },
  {
    id: 'doc-004',
    name: 'Chest X-Ray Report',
    type: 'Imaging',
    uploadedBy: 'Radiology Dept.',
    dateUploaded: atOffset(-6, 14, 15),
    visitDate: atOffset(-6, 13, 0),
  },
  {
    id: 'doc-005',
    name: 'Immunization Record',
    type: 'Other',
    uploadedBy: 'System',
    dateUploaded: atOffset(-21, 16, 30),
    visitDate: atOffset(-21, 9, 0),
  },
];

const EXTRA_TYPES: DocumentType[] = [
  'Clinical Note',
  'Lab Result',
  'Prescription',
  'Clinical Note',
  'Other',
  'Lab Result',
  'Imaging',
  'Prescription',
  'Clinical Note',
  'Lab Result',
  'Other',
  'Prescription',
  'Clinical Note',
];

const EXTRA_NAMES: Record<DocumentType, string[]> = {
  'Clinical Note': ['Follow-up Consultation', 'Routine Checkup Note', 'Antenatal Visit Note'],
  'Lab Result': ['Lab Result - Urinalysis', 'Lab Result - Malaria Parasite', 'Lab Result - HbA1c'],
  Prescription: ['Prescription - Refill', 'Prescription - Antibiotics'],
  Imaging: ['Abdominal Ultrasound Report'],
  Other: ['Vaccination Certificate', 'Referral Letter'],
};

const UPLOADERS = [
  'Dr. Jane Ezeonu (GP)',
  'Dr. Ifeanyi Okafor',
  'Dr. Michael Obi',
  'Adaobi Nwankwo',
  'Radiology Dept.',
];

const EXTRA_DOCUMENTS: MedicalDocument[] = EXTRA_TYPES.map((type, i) => {
  const pool = EXTRA_NAMES[type];
  const name = pool[i % pool.length] as string;
  const dayOffset = -(10 + i * 8);
  return {
    id: `doc-extra-${i}`,
    name,
    type,
    uploadedBy: UPLOADERS[i % UPLOADERS.length] as string,
    dateUploaded: atOffset(dayOffset, 10, 0),
    visitDate: atOffset(dayOffset, 9, 0),
  };
});

export const MOCK_DOCUMENTS: MedicalDocument[] = [...FEATURED_DOCUMENTS, ...EXTRA_DOCUMENTS];

// ─── Record Activity ─────────────────────────────────────────────────────────

export type RecordActivityEntry = {
  id: string;
  dateTime: string; // ISO
  label: string;
  detail: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
};

export const RECORD_ACTIVITY: RecordActivityEntry[] = [
  {
    id: 'act-001',
    dateTime: atOffset(-1, 9, 21),
    label: 'Record updated',
    detail: 'by Dr. Jane Ezeonu (GP)',
    icon: ClipboardEdit,
    iconColor: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
  },
  {
    id: 'act-002',
    dateTime: atOffset(-1, 9, 20),
    label: 'Document uploaded',
    detail: 'Consultation Note - 25 Jun 2026',
    icon: FileText,
    iconColor: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
  },
  {
    id: 'act-003',
    dateTime: atOffset(-1, 9, 10),
    label: 'Lab result added',
    detail: 'FBC',
    icon: FlaskConical,
    iconColor: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'act-004',
    dateTime: atOffset(-6, 14, 15),
    label: 'Document uploaded',
    detail: 'Chest X-Ray Report',
    icon: ImageIcon,
    iconColor: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'act-005',
    dateTime: atOffset(-21, 10, 30),
    label: 'Record created',
    detail: 'by Adaobi Nwankwo',
    icon: Plus,
    iconColor: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
  },
];

// ─── Record Access ────────────────────────────────────────────────────────────

export type RecordAccessEntry = {
  id: string;
  name: string;
  dateTime: string; // ISO
};

export const RECORD_ACCESS: RecordAccessEntry[] = [
  { id: 'acc-001', name: 'Dr. Jane Ezeonu (GP)', dateTime: atOffset(-1, 9, 21) },
  { id: 'acc-002', name: 'Dr. Ifeanyi Okafor', dateTime: atOffset(-1, 11, 5) },
  { id: 'acc-003', name: 'Radiology Dept.', dateTime: atOffset(-6, 14, 15) },
  { id: 'acc-004', name: 'Nurse Mary Uche', dateTime: atOffset(-6, 12, 5) },
  { id: 'acc-005', name: 'Lab Dept.', dateTime: atOffset(-21, 17, 0) },
];
