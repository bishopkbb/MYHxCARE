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

// Full detail content shown when a record is opened from the records list —
// deliberately a flexible summary + key/value fields + optional note rather
// than four rigid per-type schemas, since a mock record set doesn't need
// that much structure to read as genuinely complete.
export type MedicalRecordDetail = {
  summary: string;
  fields: { label: string; value: string }[];
  notes?: string;
};

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
  detail: MedicalRecordDetail;
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
    detail: {
      summary:
        'Patient presented with persistent headache and fever for 3 days. Temperature 38.7°C on examination.',
      fields: [
        { label: 'Chief Complaint', value: 'Persistent headache and fever (3 days)' },
        { label: 'Diagnosis', value: 'Suspected viral syndrome, rule out malaria' },
        { label: 'Vitals', value: 'Temp 38.7°C · BP 132/86 mmHg' },
        { label: 'Plan', value: 'FBC and Malaria RDT ordered; Paracetamol 1000mg TDS' },
      ],
      notes: 'Patient advised to return if fever persists beyond 48 hours or symptoms worsen.',
    },
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
    detail: {
      summary:
        'Full Blood Count reveals elevated white cell count with neutrophilia, consistent with an acute bacterial process.',
      fields: [
        { label: 'WBC', value: '18.4 ×10³/μL — HIGH (ref 4.5–11.0)' },
        { label: 'Neutrophils', value: '85% — HIGH (ref 40–70)' },
        { label: 'Haemoglobin', value: '9.2 g/dL — LOW (ref 12.0–16.0)' },
        { label: 'Platelets', value: '380 ×10³/μL — Normal' },
      ],
      notes:
        'CRITICAL: Elevated WBC with neutrophilia. Anaemia present. Urgent clinical correlation required.',
    },
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
    detail: {
      summary:
        'Follow-up visit for previously treated malaria. Patient reports resolution of fever and improved appetite.',
      fields: [
        { label: 'Diagnosis', value: 'Malaria (P. falciparum) — resolved' },
        { label: 'Treatment', value: 'Artemether-Lumefantrine, full course completed' },
        { label: 'Vitals', value: 'Temp 36.8°C — stable' },
      ],
      notes: 'No further follow-up required unless symptoms recur.',
    },
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
    detail: {
      summary: 'Antimalarial combination therapy prescribed for confirmed P. falciparum malaria.',
      fields: [
        { label: 'Medication', value: 'Artemether-Lumefantrine 80/480mg' },
        { label: 'Route', value: 'Oral' },
        { label: 'Frequency', value: 'Twice daily (BD)' },
        { label: 'Duration', value: '3 days' },
        { label: 'Dispensed', value: 'Main Pharmacy' },
      ],
      notes:
        'Take with fatty food to improve absorption. Complete full course even if symptoms improve.',
    },
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
    detail: {
      summary:
        'Referred to Cardiology for evaluation of intermittent palpitations and exertional chest discomfort.',
      fields: [
        { label: 'Department', value: 'Cardiology' },
        { label: 'Receiving Doctor', value: 'Dr. Chidi Anyanwu' },
        { label: 'Status', value: 'Accepted' },
        { label: 'Appointment', value: 'Jul 3, 2026' },
      ],
      notes: 'Referring doctor requests ECG and echocardiogram prior to review.',
    },
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
    detail: {
      summary: 'Glycated haemoglobin test performed for diabetes monitoring.',
      fields: [
        {
          label: 'HbA1c',
          value: '6.8% (ref <5.7% normal, 5.7–6.4% prediabetes, ≥6.5% diabetes)',
        },
        { label: 'Interpretation', value: 'Consistent with diabetes, sub-optimal control' },
      ],
      notes: 'Recommend dietary counselling and review of current hypoglycaemic regimen.',
    },
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
    detail: {
      summary:
        'Patient presents with diffuse pruritic skin rash, onset 2 days ago, suspected allergic reaction.',
      fields: [
        { label: 'Chief Complaint', value: 'Diffuse itchy rash, 2 days' },
        { label: 'Provisional Diagnosis', value: 'Allergic contact dermatitis' },
        { label: 'Plan', value: 'Antihistamine; identify and avoid trigger' },
      ],
      notes: 'Consultation in progress — full assessment pending.',
    },
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
    detail: {
      summary: 'Non-sedating antihistamine prescribed for allergic skin reaction.',
      fields: [
        { label: 'Medication', value: 'Loratadine 10mg' },
        { label: 'Route', value: 'Oral' },
        { label: 'Frequency', value: 'Once daily (OD)' },
        { label: 'Duration', value: '7 days' },
      ],
      notes: 'May cause mild drowsiness in some patients. Avoid alcohol.',
    },
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
    detail: {
      summary:
        'Urgent referral to Neurology for evaluation of severe headache with photophobia and neck stiffness.',
      fields: [
        { label: 'Department', value: 'Neurology' },
        { label: 'Receiving Doctor', value: 'Dr. Nkiru Eze' },
        { label: 'Status', value: 'Pending' },
        { label: 'Priority', value: 'Urgent' },
      ],
      notes:
        'Meningeal signs present on examination — lumbar puncture requested pending neurology review.',
    },
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
    detail: {
      summary:
        'Cerebrospinal fluid analysis requested following lumbar puncture for suspected meningitis.',
      fields: [
        { label: 'Sample', value: 'CSF (Lumbar Puncture)' },
        { label: 'Tests Requested', value: 'Cell count, protein, glucose, Gram stain, culture' },
        { label: 'Status', value: 'Pending' },
      ],
      notes:
        'Results expected within 24–48 hours. Patient on empirical antibiotics pending confirmation.',
    },
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
    detail: {
      summary:
        'Emergency presentation with acute chest pain and dyspnoea. SpO2 91% on room air. Admitted to emergency bay.',
      fields: [
        { label: 'Chief Complaint', value: 'Chest pain and difficulty breathing' },
        { label: 'SpO2', value: '91% (room air)' },
        {
          label: 'Working Diagnosis',
          value: 'Acute coronary syndrome vs. pulmonary embolism, under evaluation',
        },
      ],
      notes:
        'CRITICAL: Patient admitted to emergency bay. Cardiology and radiology consults requested urgently.',
    },
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
    detail: {
      summary:
        'Chest radiograph requested as part of emergency work-up for acute chest pain and dyspnoea.',
      fields: [
        { label: 'View', value: 'PA Erect' },
        { label: 'Clinical Indication', value: 'Acute chest pain, dyspnoea, SpO2 91%' },
        { label: 'Status', value: 'Pending' },
      ],
      notes: 'Urgent read requested given emergency presentation.',
    },
  },
];
