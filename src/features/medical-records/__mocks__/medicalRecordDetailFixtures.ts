/**
 * Mock fixtures for the single-patient Medical Record page. Demographics
 * are NOT duplicated here — the page imports MOCK_PATIENT_PROFILE directly
 * so this screen always agrees with Patient Profile / Check-In on who this
 * patient is (MRN-2026-00451).
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import {
  ClipboardCheck,
  ClipboardEdit,
  FileBadge,
  FileSignature,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Pill,
  Plus,
  Share2,
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

// ─── Visit History ────────────────────────────────────────────────────────────

export type PatientVisit = {
  id: string;
  dateTime: string; // ISO
  department: string;
  doctor: string;
  credentials: string;
  visitType: string;
  diagnosisSummary: string;
  reason: string;
  status: 'Completed' | 'Reviewed' | 'Scheduled' | 'Cancelled';
};

export const PATIENT_VISITS: PatientVisit[] = [
  {
    id: 'visit-001',
    dateTime: atOffset(-1, 9, 0),
    department: 'General Outpatient Clinic',
    doctor: 'Dr. Jane Ezeonu (GP)',
    credentials: 'MBBS, FMCP',
    visitType: 'Consultation',
    diagnosisSummary: 'Acute upper respiratory infection, Fever',
    reason: 'Recurrent cough and mild wheezing',
    status: 'Completed',
  },
  {
    id: 'visit-002',
    dateTime: atOffset(-1, 11, 5),
    department: 'Laboratory',
    doctor: 'Dr. Ifeanyi Okafor',
    credentials: 'MBBS, FMCPath',
    visitType: 'Lab Test',
    diagnosisSummary: 'Full Blood Count, Malaria Parasite',
    reason: 'Fever and generalized body weakness',
    status: 'Completed',
  },
  {
    id: 'visit-003',
    dateTime: atOffset(-1, 11, 40),
    department: 'Pharmacy',
    doctor: 'Pharmacist Chika M.',
    credentials: 'RPh',
    visitType: 'Medication',
    diagnosisSummary: 'Paracetamol 500mg, Amoxicillin 500mg',
    reason: 'Medication dispensing',
    status: 'Completed',
  },
  {
    id: 'visit-004',
    dateTime: atOffset(-6, 14, 15),
    department: 'Radiology',
    doctor: 'Dr. Mary Uche',
    credentials: 'MBBS, FWCR',
    visitType: 'Imaging',
    diagnosisSummary: 'Chest X-Ray',
    reason: 'Chest X-ray to rule out chest infection',
    status: 'Reviewed',
  },
  {
    id: 'visit-005',
    dateTime: atOffset(-13, 10, 5),
    department: 'Dental Clinic',
    doctor: 'Dr. Onyedika Umeh',
    credentials: 'BDS',
    visitType: 'Consultation',
    diagnosisSummary: 'Dental caries',
    reason: 'Routine dental checkup',
    status: 'Completed',
  },
  {
    id: 'visit-006',
    dateTime: atOffset(-21, 9, 0),
    department: 'General Outpatient Clinic',
    doctor: 'Dr. Jane Ezeonu (GP)',
    credentials: 'MBBS, FMCP',
    visitType: 'Consultation',
    diagnosisSummary: 'Gastritis',
    reason: 'New student medical screening',
    status: 'Completed',
  },
  {
    id: 'visit-007',
    dateTime: atOffset(-45, 9, 12),
    department: 'Emergency Department',
    doctor: 'Dr. Samuel A.',
    credentials: 'MBBS, FWACS',
    visitType: 'Emergency',
    diagnosisSummary: 'Severe headache, Nausea',
    reason: 'Sudden onset severe headache',
    status: 'Completed',
  },
];

// ─── Prescriptions ────────────────────────────────────────────────────────────

export type Prescription = {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribedBy: string;
  datePrescribed: string; // ISO
  status: 'Active' | 'Completed';
};

export const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-001',
    drugName: 'Salbutamol Inhaler',
    dosage: '100mcg',
    frequency: 'As needed (PRN)',
    route: 'Inhalation',
    prescribedBy: 'Dr. Jane Ezeonu (GP)',
    datePrescribed: atOffset(-1, 9, 25),
    status: 'Active',
  },
  {
    id: 'rx-002',
    drugName: 'Paracetamol',
    dosage: '1000mg',
    frequency: 'Every 8 hours as needed',
    route: 'Oral',
    prescribedBy: 'Dr. Jane Ezeonu (GP)',
    datePrescribed: atOffset(-6, 14, 20),
    status: 'Completed',
  },
  {
    id: 'rx-003',
    drugName: 'Amoxicillin',
    dosage: '500mg',
    frequency: '3 times daily for 5 days',
    route: 'Oral',
    prescribedBy: 'Dr. Jane Ezeonu (GP)',
    datePrescribed: atOffset(-21, 9, 30),
    status: 'Completed',
  },
];

// ─── Lab Results ──────────────────────────────────────────────────────────────

export type LabResultEntry = {
  id: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: 'Normal' | 'High' | 'Low';
  dateCollected: string; // ISO
  orderedBy: string;
};

export const MOCK_LAB_RESULTS: LabResultEntry[] = [
  {
    id: 'lab-001',
    testName: 'Haemoglobin',
    result: '12.8',
    unit: 'g/dL',
    referenceRange: '12.0 - 15.5',
    flag: 'Normal',
    dateCollected: atOffset(-1, 11, 5),
    orderedBy: 'Dr. Ifeanyi Okafor',
  },
  {
    id: 'lab-002',
    testName: 'White Blood Cell Count',
    result: '11.2',
    unit: 'x10^9/L',
    referenceRange: '4.0 - 11.0',
    flag: 'High',
    dateCollected: atOffset(-1, 11, 5),
    orderedBy: 'Dr. Ifeanyi Okafor',
  },
  {
    id: 'lab-003',
    testName: 'Platelet Count',
    result: '250',
    unit: 'x10^9/L',
    referenceRange: '150 - 410',
    flag: 'Normal',
    dateCollected: atOffset(-1, 11, 5),
    orderedBy: 'Dr. Ifeanyi Okafor',
  },
];

// ─── Immunizations ────────────────────────────────────────────────────────────

export type ImmunizationEntry = {
  id: string;
  vaccine: string;
  doseLabel: string;
  dateGiven: string; // ISO
  givenBy: string;
  nextDueDate?: string; // ISO
};

export const MOCK_IMMUNIZATIONS: ImmunizationEntry[] = [
  {
    id: 'imm-001',
    vaccine: 'Hepatitis B',
    doseLabel: 'Dose 3 of 3',
    dateGiven: atOffset(-21, 16, 30),
    givenBy: 'UNIZIK Medical Centre',
  },
  {
    id: 'imm-002',
    vaccine: 'Tetanus Toxoid',
    doseLabel: 'Dose 1',
    dateGiven: atOffset(-21, 16, 30),
    givenBy: 'UNIZIK Medical Centre',
    nextDueDate: atOffset(345, 9, 0),
  },
  {
    id: 'imm-003',
    vaccine: 'COVID-19 (Booster)',
    doseLabel: 'Booster',
    dateGiven: atOffset(-90, 10, 0),
    givenBy: 'UNIZIK Medical Centre',
  },
];

// ─── Referrals ────────────────────────────────────────────────────────────────

export type ReferralEntry = {
  id: string;
  toDepartment: string;
  toProvider: string;
  reason: string;
  dateReferred: string; // ISO
  status: 'Pending' | 'Accepted' | 'Completed';
};

export const MOCK_REFERRALS: ReferralEntry[] = [
  {
    id: 'ref-001',
    toDepartment: 'Radiology',
    toProvider: 'Radiology Dept.',
    reason: 'Chest X-ray to rule out chest infection',
    dateReferred: atOffset(-6, 13, 0),
    status: 'Completed',
  },
  {
    id: 'ref-002',
    toDepartment: 'Dental Clinic',
    toProvider: 'Dr. Ifeanyi Okafor',
    reason: 'Routine dental checkup',
    dateReferred: atOffset(-21, 9, 30),
    status: 'Completed',
  },
];

// ─── Insurance Claims ─────────────────────────────────────────────────────────

export type InsuranceClaimEntry = {
  id: string;
  claimId: string;
  service: string;
  amount: number;
  dateSubmitted: string; // ISO
  status: 'Submitted' | 'Approved' | 'Rejected' | 'Paid';
};

export const MOCK_INSURANCE_CLAIMS: InsuranceClaimEntry[] = [
  {
    id: 'claim-001',
    claimId: 'CLM-2026-00451-01',
    service: 'General Consultation',
    amount: 2500,
    dateSubmitted: atOffset(-1, 10, 0),
    status: 'Approved',
  },
  {
    id: 'claim-002',
    claimId: 'CLM-2026-00451-02',
    service: 'Complete Blood Count (FBC)',
    amount: 8000,
    dateSubmitted: atOffset(-1, 11, 30),
    status: 'Submitted',
  },
  {
    id: 'claim-003',
    claimId: 'CLM-2026-00451-03',
    service: 'Chest X-Ray',
    amount: 12000,
    dateSubmitted: atOffset(-6, 15, 0),
    status: 'Paid',
  },
];

// ─── Generated visits for any patient other than the curated persona ────────
// Deterministic (seeded by patient id, never Math.random()) so the same
// patient always shows the same visits on repeat views/reloads, rather than
// reshuffling every render.

const GENERIC_VISIT_TEMPLATES: {
  department: string;
  doctor: string;
  credentials: string;
  visitType: string;
  diagnosisSummary: string;
}[] = [
  {
    department: 'General Outpatient Clinic',
    doctor: 'Dr. Jane Ezeonu (GP)',
    credentials: 'MBBS, FMCP',
    visitType: 'Consultation',
    diagnosisSummary: 'Routine checkup',
  },
  {
    department: 'General Outpatient Clinic',
    doctor: 'Dr. Ada Chukwu (GP)',
    credentials: 'MBBS, FWACP',
    visitType: 'Consultation',
    diagnosisSummary: 'Malaria',
  },
  {
    department: 'Laboratory',
    doctor: 'Dr. Ifeanyi Okafor',
    credentials: 'MBBS, FMCPath',
    visitType: 'Lab Test',
    diagnosisSummary: 'Full Blood Count',
  },
  {
    department: 'Pharmacy',
    doctor: 'Pharmacist Chika M.',
    credentials: 'RPh',
    visitType: 'Medication',
    diagnosisSummary: 'Medication refill',
  },
  {
    department: 'Dental Clinic',
    doctor: 'Dr. Onyedika Umeh',
    credentials: 'BDS',
    visitType: 'Consultation',
    diagnosisSummary: 'Dental checkup',
  },
  {
    department: 'Radiology',
    doctor: 'Dr. Mary Uche',
    credentials: 'MBBS, FWCR',
    visitType: 'Imaging',
    diagnosisSummary: 'X-Ray',
  },
  {
    department: 'Physiotherapy',
    doctor: 'Mrs. Ngozi A.',
    credentials: 'DPT',
    visitType: 'Therapy',
    diagnosisSummary: 'Physiotherapy session',
  },
];

function seedFromId(id: string): number {
  const digits = id.replace(/\D/g, '');
  return parseInt(digits, 10) || 1;
}

/** Every patient other than the curated persona (dp-001) gets a stable,
 * plausible visit history derived from their id — same patient always
 * produces the same visits, no randomness between renders. */
export function generateVisitsForPatient(patient: { id: string }): PatientVisit[] {
  const seed = seedFromId(patient.id);
  const count = 2 + (seed % 4); // 2-5 visits
  const visits: PatientVisit[] = [];
  for (let i = 0; i < count; i++) {
    const template = GENERIC_VISIT_TEMPLATES[(seed + i * 3) % GENERIC_VISIT_TEMPLATES.length]!;
    const dayOffset = -(3 + ((seed + i * 11) % 60));
    const hour = 8 + ((seed + i * 5) % 8);
    const minute = (seed * 7 + i * 13) % 60;
    visits.push({
      id: `${patient.id}-visit-${i}`,
      dateTime: atOffset(dayOffset, hour, minute),
      department: template.department,
      doctor: template.doctor,
      credentials: template.credentials,
      visitType: template.visitType,
      diagnosisSummary: template.diagnosisSummary,
      reason: template.diagnosisSummary,
      status: 'Completed',
    });
  }
  return visits;
}

/** Derives a Record Activity feed directly from a set of visits, so a
 * generic patient's activity trail always matches what's actually in
 * their visit table instead of showing another patient's leftover data. */
export function generateActivityFromVisits(visits: PatientVisit[]): RecordActivityEntry[] {
  return [...visits]
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    .slice(0, 5)
    .map((v) => ({
      id: `${v.id}-activity`,
      dateTime: v.dateTime,
      label: 'Visit completed',
      detail: `${v.department} — ${v.diagnosisSummary}`,
      icon: FileText,
      iconColor: '#00B4D8',
      iconBg: 'rgba(0,180,216,0.12)',
    }));
}

// ─── Clinical Documents ───────────────────────────────────────────────────────
// Distinct from the generic Documents & Files repository (Overview tab) —
// this is the formal clinical paperwork taxonomy specifically.

export type ClinicalDocCategory =
  | 'Consultation Note'
  | 'Discharge Summary'
  | 'Referral Letter'
  | 'Medical Certificate'
  | 'Imaging Report'
  | 'Consent Form';

export type ClinicalFileType = 'PDF' | 'Image' | 'Other';

export const CLINICAL_DOC_CATEGORIES: ClinicalDocCategory[] = [
  'Consultation Note',
  'Discharge Summary',
  'Referral Letter',
  'Medical Certificate',
  'Imaging Report',
  'Consent Form',
];

export const CLINICAL_DOC_CATEGORY_CFG: Record<
  ClinicalDocCategory,
  { icon: LucideIcon; iconColor: string; badgeColor: string; badgeBorder: string; badgeBg: string }
> = {
  'Consultation Note': {
    icon: FileText,
    iconColor: '#EF4444',
    badgeColor: '#EF4444',
    badgeBorder: 'rgba(239,68,68,0.3)',
    badgeBg: 'rgba(239,68,68,0.06)',
  },
  'Discharge Summary': {
    icon: ClipboardCheck,
    iconColor: '#22C55E',
    badgeColor: '#22C55E',
    badgeBorder: 'rgba(34,197,94,0.3)',
    badgeBg: 'rgba(34,197,94,0.06)',
  },
  'Referral Letter': {
    icon: Share2,
    iconColor: '#8B5CF6',
    badgeColor: '#8B5CF6',
    badgeBorder: 'rgba(139,92,246,0.3)',
    badgeBg: 'rgba(139,92,246,0.06)',
  },
  'Medical Certificate': {
    icon: FileBadge,
    iconColor: '#F59E0B',
    badgeColor: '#F59E0B',
    badgeBorder: 'rgba(245,158,11,0.3)',
    badgeBg: 'rgba(245,158,11,0.06)',
  },
  'Imaging Report': {
    icon: ImageIcon,
    iconColor: '#3B82F6',
    badgeColor: '#3B82F6',
    badgeBorder: 'rgba(59,130,246,0.3)',
    badgeBg: 'rgba(59,130,246,0.06)',
  },
  'Consent Form': {
    icon: FileSignature,
    iconColor: '#00B4D8',
    badgeColor: '#00B4D8',
    badgeBorder: 'rgba(0,180,216,0.3)',
    badgeBg: 'rgba(0,180,216,0.06)',
  },
};

export type ClinicalDocumentEntry = {
  id: string;
  name: string;
  subtitle: string;
  category: ClinicalDocCategory;
  fileType: ClinicalFileType;
  department: string;
  createdBy: string;
  dateCreated: string; // ISO
  visitDate: string; // ISO
};

const FEATURED_CLINICAL_DOCS: ClinicalDocumentEntry[] = [
  {
    id: 'cd-001',
    name: 'Consultation Note - Follow-up',
    subtitle: 'Visit note',
    category: 'Consultation Note',
    fileType: 'PDF',
    department: 'General Outpatient Clinic — Room 3',
    createdBy: 'Dr. Jane Ezeonu (GP)',
    dateCreated: atOffset(-1, 9, 20),
    visitDate: atOffset(-1, 9, 0),
  },
  {
    id: 'cd-002',
    name: 'Discharge Summary - Admission',
    subtitle: '3-day admission',
    category: 'Discharge Summary',
    fileType: 'PDF',
    department: 'Medical Ward — Bed 12',
    createdBy: 'Dr. Ifeanyi Okafor',
    dateCreated: atOffset(-6, 14, 15),
    visitDate: atOffset(-8, 10, 0),
  },
  {
    id: 'cd-003',
    name: 'Referral Letter - Oral Surgery',
    subtitle: 'Referred to Oral Surgery',
    category: 'Referral Letter',
    fileType: 'PDF',
    department: 'Dental Clinic — Room 2',
    createdBy: 'Dr. Onyedika Umeh',
    dateCreated: atOffset(-13, 10, 5),
    visitDate: atOffset(-13, 9, 30),
  },
  {
    id: 'cd-004',
    name: 'Medical Certificate - Sick Leave',
    subtitle: 'Sick leave certificate',
    category: 'Medical Certificate',
    fileType: 'PDF',
    department: 'General Outpatient Clinic — Room 5',
    createdBy: 'Dr. Jane Ezeonu (GP)',
    dateCreated: atOffset(-21, 11, 30),
    visitDate: atOffset(-21, 9, 0),
  },
  {
    id: 'cd-005',
    name: 'Chest X-Ray Report',
    subtitle: 'Chest X-Ray',
    category: 'Imaging Report',
    fileType: 'Image',
    department: 'Radiology — X-Ray Unit',
    createdBy: 'Dr. Mary Uche',
    dateCreated: atOffset(-28, 13, 45),
    visitDate: atOffset(-28, 13, 0),
  },
  {
    id: 'cd-006',
    name: 'Consent Form - Minor Surgery',
    subtitle: 'Procedure: Minor Surgery',
    category: 'Consent Form',
    fileType: 'PDF',
    department: 'Surgery — Theatre 1',
    createdBy: 'Dr. Samuel A.',
    dateCreated: atOffset(-35, 9, 10),
    visitDate: atOffset(-35, 8, 30),
  },
  {
    id: 'cd-007',
    name: 'Consultation Note - Emergency Visit',
    subtitle: 'Emergency visit note',
    category: 'Consultation Note',
    fileType: 'PDF',
    department: 'Emergency Department — Triage 1',
    createdBy: 'Dr. Samuel A.',
    dateCreated: atOffset(-42, 16, 50),
    visitDate: atOffset(-42, 16, 20),
  },
  {
    id: 'cd-008',
    name: 'Referral Letter - Radiology',
    subtitle: 'Referred to Radiology',
    category: 'Referral Letter',
    fileType: 'PDF',
    department: 'General Outpatient Clinic — Room 3',
    createdBy: 'Dr. Jane Ezeonu (GP)',
    dateCreated: atOffset(-49, 10, 0),
    visitDate: atOffset(-49, 9, 40),
  },
];

const EXTRA_CLINICAL_DOC_SPECS: {
  category: ClinicalDocCategory;
  name: string;
  subtitle: string;
  fileType: ClinicalFileType;
  department: string;
  createdBy: string;
  dayOffset: number;
}[] = [
  {
    category: 'Consultation Note',
    name: 'Consultation Note - Routine Checkup',
    subtitle: 'Annual health screening',
    fileType: 'PDF',
    department: 'General Outpatient Clinic — Room 1',
    createdBy: 'Dr. Ada Chukwu (GP)',
    dayOffset: -56,
  },
  {
    category: 'Consultation Note',
    name: 'Consultation Note - Follow-up Review',
    subtitle: 'Asthma review',
    fileType: 'PDF',
    department: 'General Outpatient Clinic — Room 3',
    createdBy: 'Dr. Jane Ezeonu (GP)',
    dayOffset: -70,
  },
  {
    category: 'Consultation Note',
    name: 'Consultation Note - Dental Checkup',
    subtitle: 'Routine dental checkup',
    fileType: 'PDF',
    department: 'Dental Clinic — Room 2',
    createdBy: 'Dr. Onyedika Umeh',
    dayOffset: -84,
  },
  {
    category: 'Consultation Note',
    name: 'Consultation Note - Physiotherapy',
    subtitle: 'Physiotherapy session',
    fileType: 'PDF',
    department: 'Physiotherapy — Room 1',
    createdBy: 'Mrs. Ngozi A.',
    dayOffset: -98,
  },
  {
    category: 'Consultation Note',
    name: 'Consultation Note - Lab Review',
    subtitle: 'Blood test review',
    fileType: 'PDF',
    department: 'General Outpatient Clinic — Room 5',
    createdBy: 'Dr. Jane Ezeonu (GP)',
    dayOffset: -112,
  },
  {
    category: 'Discharge Summary',
    name: 'Discharge Summary - Day Surgery',
    subtitle: 'Day case procedure',
    fileType: 'PDF',
    department: 'Surgery — Ward 2',
    createdBy: 'Dr. Samuel A.',
    dayOffset: -63,
  },
  {
    category: 'Discharge Summary',
    name: 'Discharge Summary - Observation',
    subtitle: '24-hour observation',
    fileType: 'PDF',
    department: 'Emergency Department — Ward 1',
    createdBy: 'Dr. Samuel A.',
    dayOffset: -126,
  },
  {
    category: 'Referral Letter',
    name: 'Referral Letter - Ophthalmology',
    subtitle: 'Referred to Ophthalmology',
    fileType: 'PDF',
    department: 'General Outpatient Clinic — Room 1',
    createdBy: 'Dr. Ada Chukwu (GP)',
    dayOffset: -77,
  },
  {
    category: 'Referral Letter',
    name: 'Referral Letter - Physiotherapy',
    subtitle: 'Referred to Physiotherapy',
    fileType: 'PDF',
    department: 'General Outpatient Clinic — Room 3',
    createdBy: 'Dr. Jane Ezeonu (GP)',
    dayOffset: -140,
  },
  {
    category: 'Medical Certificate',
    name: 'Medical Certificate - Fitness to Work',
    subtitle: 'Fitness to resume duties',
    fileType: 'PDF',
    department: 'General Outpatient Clinic — Room 5',
    createdBy: 'Dr. Jane Ezeonu (GP)',
    dayOffset: -91,
  },
  {
    category: 'Imaging Report',
    name: 'Abdominal Ultrasound Report',
    subtitle: 'Abdominal ultrasound',
    fileType: 'Image',
    department: 'Radiology — Ultrasound Unit',
    createdBy: 'Dr. Mary Uche',
    dayOffset: -105,
  },
  {
    category: 'Imaging Report',
    name: 'Dental X-Ray Report',
    subtitle: 'Dental X-Ray',
    fileType: 'Image',
    department: 'Dental Clinic — Room 2',
    createdBy: 'Dr. Onyedika Umeh',
    dayOffset: -119,
  },
  {
    category: 'Imaging Report',
    name: 'MRI Scan Report',
    subtitle: 'Lumbar spine MRI',
    fileType: 'Image',
    department: 'Radiology — MRI Unit',
    createdBy: 'Dr. Mary Uche',
    dayOffset: -133,
  },
  {
    category: 'Imaging Report',
    name: 'ECG Report',
    subtitle: 'Routine ECG',
    fileType: 'Other',
    department: 'General Outpatient Clinic — Room 1',
    createdBy: 'Dr. Ada Chukwu (GP)',
    dayOffset: -147,
  },
  {
    category: 'Consent Form',
    name: 'Consent Form - Blood Transfusion',
    subtitle: 'Procedure: Blood Transfusion',
    fileType: 'PDF',
    department: 'Emergency Department — Triage 1',
    createdBy: 'Dr. Samuel A.',
    dayOffset: -154,
  },
  {
    category: 'Consent Form',
    name: 'Consent Form - Imaging Procedure',
    subtitle: 'Procedure: MRI Scan',
    fileType: 'PDF',
    department: 'Radiology — MRI Unit',
    createdBy: 'Dr. Mary Uche',
    dayOffset: -161,
  },
];

export const CURATED_CLINICAL_DOCUMENTS: ClinicalDocumentEntry[] = [
  ...FEATURED_CLINICAL_DOCS,
  ...EXTRA_CLINICAL_DOC_SPECS.map((spec, i) => ({
    id: `cd-extra-${i}`,
    name: spec.name,
    subtitle: spec.subtitle,
    category: spec.category,
    fileType: spec.fileType,
    department: spec.department,
    createdBy: spec.createdBy,
    dateCreated: atOffset(spec.dayOffset, 10, 0),
    visitDate: atOffset(spec.dayOffset, 9, 30),
  })),
];

const GENERIC_CLINICAL_DOC_TEMPLATES: {
  category: ClinicalDocCategory;
  name: string;
  subtitle: string;
  fileType: ClinicalFileType;
  department: string;
  createdBy: string;
}[] = [
  {
    category: 'Consultation Note',
    name: 'Consultation Note',
    subtitle: 'Routine visit',
    fileType: 'PDF',
    department: 'General Outpatient Clinic',
    createdBy: 'Dr. Jane Ezeonu (GP)',
  },
  {
    category: 'Referral Letter',
    name: 'Referral Letter',
    subtitle: 'Specialist referral',
    fileType: 'PDF',
    department: 'General Outpatient Clinic',
    createdBy: 'Dr. Ada Chukwu (GP)',
  },
  {
    category: 'Imaging Report',
    name: 'Imaging Report',
    subtitle: 'Diagnostic imaging',
    fileType: 'Image',
    department: 'Radiology',
    createdBy: 'Dr. Mary Uche',
  },
  {
    category: 'Medical Certificate',
    name: 'Medical Certificate',
    subtitle: 'Fitness certificate',
    fileType: 'PDF',
    department: 'General Outpatient Clinic',
    createdBy: 'Dr. Jane Ezeonu (GP)',
  },
  {
    category: 'Consent Form',
    name: 'Consent Form',
    subtitle: 'Procedure consent',
    fileType: 'PDF',
    department: 'Surgery',
    createdBy: 'Dr. Samuel A.',
  },
];

/** Every patient other than the curated persona (dp-001) gets a stable,
 * plausible set of clinical documents derived from their id — same patient
 * always produces the same documents, no randomness between renders. */
export function generateClinicalDocumentsForPatient(patient: {
  id: string;
}): ClinicalDocumentEntry[] {
  const seed = seedFromId(patient.id);
  const count = 2 + (seed % 4); // 2-5 documents
  const docs: ClinicalDocumentEntry[] = [];
  for (let i = 0; i < count; i++) {
    const t =
      GENERIC_CLINICAL_DOC_TEMPLATES[(seed + i * 3) % GENERIC_CLINICAL_DOC_TEMPLATES.length]!;
    const dayOffset = -(5 + ((seed + i * 13) % 90));
    docs.push({
      id: `${patient.id}-doc-${i}`,
      name: t.name,
      subtitle: t.subtitle,
      category: t.category,
      fileType: t.fileType,
      department: t.department,
      createdBy: t.createdBy,
      dateCreated: atOffset(dayOffset, 10, 0),
      visitDate: atOffset(dayOffset, 9, 30),
    });
  }
  return docs;
}

/** Derives a Record Activity feed directly from a set of clinical documents,
 * mirroring generateActivityFromVisits so a generic patient's activity trail
 * always matches what's actually in their document table. */
export function generateDocActivityFromDocs(docs: ClinicalDocumentEntry[]): RecordActivityEntry[] {
  return [...docs]
    .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
    .slice(0, 5)
    .map((d) => {
      const cfg = CLINICAL_DOC_CATEGORY_CFG[d.category];
      return {
        id: `${d.id}-activity`,
        dateTime: d.dateCreated,
        label: 'Document uploaded',
        detail: d.name,
        icon: cfg.icon,
        iconColor: cfg.iconColor,
        iconBg: `${cfg.iconColor}1F`,
      };
    });
}
