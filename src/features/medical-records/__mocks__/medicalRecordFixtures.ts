/**
 * Mock fixtures for the medical records domain.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

export type RecordType = 'consultation' | 'laboratory' | 'prescription' | 'referral';

export type RecordStatus =
  | 'active'
  | 'critical'
  | 'completed'
  | 'dispensed'
  | 'accepted'
  | 'verified'
  | 'in-progress'
  | 'pending'
  | 'emergency';

export type MedicalRecord = {
  id: string;
  type: RecordType;
  title: string;
  isCritical?: boolean;
  patientName: string;
  mrn: string;
  date: string;
  provider: string;
  status: RecordStatus;
};

export const MOCK_MEDICAL_RECORDS: MedicalRecord[] = [
  {
    id: 'mr-001',
    type: 'consultation',
    title: 'Consultation — Persistent Headache & Fever',
    patientName: 'Adaeze Okonkwo',
    mrn: 'MRN-2024-00451',
    date: 'Jun 30, 2026',
    provider: 'Dr. E. Obi',
    status: 'active',
  },
  {
    id: 'mr-002',
    type: 'laboratory',
    title: 'Full Blood Count (FBC) — CRITICAL RESULT',
    isCritical: true,
    patientName: 'Adaeze Okonkwo',
    mrn: 'MRN-2024-00451',
    date: 'Jun 30, 2026',
    provider: 'Laboratory',
    status: 'critical',
  },
  {
    id: 'mr-003',
    type: 'consultation',
    title: 'Consultation — Malaria Follow-up',
    patientName: 'Babatunde Alade',
    mrn: 'MRN-2024-00356',
    date: 'Jun 28, 2026',
    provider: 'Dr. E. Obi',
    status: 'completed',
  },
  {
    id: 'mr-004',
    type: 'prescription',
    title: 'Prescription — Artemether-Lumefantrine 80/480mg',
    patientName: 'Babatunde Alade',
    mrn: 'MRN-2024-00356',
    date: 'Jun 28, 2026',
    provider: 'Dr. E. Obi',
    status: 'dispensed',
  },
  {
    id: 'mr-005',
    type: 'referral',
    title: 'Referral — Cardiology (Dr. Chidi Anyanwu)',
    patientName: 'Ibrahim Musa',
    mrn: 'MRN-2024-00301',
    date: 'Jun 28, 2026',
    provider: 'Dr. E. Obi',
    status: 'accepted',
  },
  {
    id: 'mr-006',
    type: 'laboratory',
    title: 'HbA1c — Glycated Haemoglobin',
    patientName: 'Ibrahim Musa',
    mrn: 'MRN-2024-00301',
    date: 'Jun 29, 2026',
    provider: 'Laboratory',
    status: 'verified',
  },
  {
    id: 'mr-007',
    type: 'consultation',
    title: 'Consultation — Allergic Skin Rash',
    patientName: 'Chinwe Okafor',
    mrn: 'MRN-2024-00467',
    date: 'Jun 30, 2026',
    provider: 'Dr. E. Obi',
    status: 'in-progress',
  },
  {
    id: 'mr-008',
    type: 'prescription',
    title: 'Prescription — Loratadine 10mg OD',
    patientName: 'Chinwe Okafor',
    mrn: 'MRN-2024-00467',
    date: 'Jun 25, 2026',
    provider: 'Dr. E. Obi',
    status: 'active',
  },
  {
    id: 'mr-009',
    type: 'referral',
    title: 'Referral — Neurology URGENT (Dr. Nkiru Eze)',
    patientName: 'David Osei',
    mrn: 'MRN-2024-00398',
    date: 'Jun 30, 2026',
    provider: 'Dr. E. Obi',
    status: 'pending',
  },
  {
    id: 'mr-010',
    type: 'laboratory',
    title: 'CSF Analysis (Lumbar Puncture)',
    patientName: 'David Osei',
    mrn: 'MRN-2024-00398',
    date: 'Jun 30, 2026',
    provider: 'Laboratory',
    status: 'pending',
  },
  {
    id: 'mr-011',
    type: 'consultation',
    title: 'Emergency Admission — Acute Chest Pain & Dyspnoea',
    isCritical: true,
    patientName: 'Ngozi Adeyemi',
    mrn: 'MRN-2024-00512',
    date: 'Jun 30, 2026',
    provider: 'Emergency Team',
    status: 'emergency',
  },
  {
    id: 'mr-012',
    type: 'laboratory',
    title: 'Chest X-Ray (PA Erect)',
    patientName: 'Ngozi Adeyemi',
    mrn: 'MRN-2024-00512',
    date: 'Jun 30, 2026',
    provider: 'Laboratory',
    status: 'pending',
  },
];
