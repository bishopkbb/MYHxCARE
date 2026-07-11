/**
 * Mock fixtures for the clinical notes domain.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

export type NoteType = 'soap' | 'progress' | 'emergency' | 'discharge' | 'referral';

export type NoteStatus = 'completed' | 'in-progress' | 'urgent' | 'draft';

export type ClinicalNote = {
  id: string;
  type: NoteType;
  isUrgent?: boolean;
  patientName: string;
  mrn: string;
  date: string;
  time: string;
  content: string;
  status: NoteStatus;
  doctor: string;
};

export const MOCK_CLINICAL_NOTES: ClinicalNote[] = [
  {
    id: 'cn-001',
    type: 'soap',
    patientName: 'Adaeze Okonkwo',
    mrn: 'MRN-2024-00451',
    date: 'Jun 30, 2026',
    time: '09:45 AM',
    content:
      'S: 3-day history of headache (7/10) and fever. No cough. No vomiting.\nO: Temp 38.7°C, BP 132/86, Pulse 98 bpm. Throat: mildly erythematous. No exudate.\nA: Possible viral URTI with secondary bacterial component. R/O malaria.',
    status: 'completed',
    doctor: 'Dr. E. Obi',
  },
  {
    id: 'cn-002',
    type: 'progress',
    patientName: 'Chukwuemeka Eze',
    mrn: 'MRN-2024-00389',
    date: 'Jun 30, 2026',
    time: '10:15 AM',
    content:
      'Patient presents with epigastric pain (6/10) onset 24hrs ago. Associated nausea, no vomiting. No fever. Bowel sounds present and active. Abdomen soft, mildly tender in epigastric region. Awaiting urinalysis and abdominal USS. Differential: PUD, gastritis, appendicitis.',
    status: 'in-progress',
    doctor: 'Dr. E. Obi',
  },
  {
    id: 'cn-003',
    type: 'emergency',
    isUrgent: true,
    patientName: 'Ngozi Adeyemi',
    mrn: 'MRN-2024-00512',
    date: 'Jun 30, 2026',
    time: '10:40 AM',
    content:
      'EMERGENCY ADMISSION: Acute onset chest pain and severe dyspnoea. Known asthmatic on Salbutamol PRN. SpO2 91% on air, RR 28/min, BP 158/102. Salbutamol 2.5mg via nebuliser administered. SpO2 improved to 94% post-nebulisation. Chest X-Ray requested urgently. Patient admitted to emergency bay under close monitoring.',
    status: 'urgent',
    doctor: 'Dr. E. Obi',
  },
  {
    id: 'cn-004',
    type: 'soap',
    patientName: 'Chinwe Okafor',
    mrn: 'MRN-2024-00467',
    date: 'Jun 30, 2026',
    time: '09:58 AM',
    content:
      'S: Generalised itchy rash × 5 days, worsening with heat exposure. Known latex allergy.\nO: Diffuse erythematous maculopapular rash, predominantly on trunk and limbs. Afebrile.\nA: Allergic contact dermatitis. Possible latex sensitisation flare.',
    status: 'completed',
    doctor: 'Dr. E. Obi',
  },
  {
    id: 'cn-005',
    type: 'progress',
    isUrgent: true,
    patientName: 'David Osei',
    mrn: 'MRN-2024-00398',
    date: 'Jun 30, 2026',
    time: '09:00 AM',
    content:
      "Severe throbbing headache (9/10), photophobia and neck stiffness since last night. Temperature 39.1°C. Kernig's sign positive. Brudzinski's sign positive. Clinical suspicion: bacterial meningitis. CSF analysis ordered urgently. Empirical IV Ceftriaxone 2g commenced pending culture results. Neurology referral sent — URGENT.",
    status: 'urgent',
    doctor: 'Dr. E. Obi',
  },
  {
    id: 'cn-006',
    type: 'discharge',
    patientName: 'Babatunde Alade',
    mrn: 'MRN-2024-00356',
    date: 'Jun 28, 2026',
    time: '02:45 PM',
    content:
      'Patient discharged following successful completion of 3-day Artemether-Lumefantrine course for P. falciparum malaria. Clinical status: improved. Temp 36.9°C on discharge. Haemoglobin 10.2g/dL — mild anaemia. Advised iron supplementation. Dietary advice given. Follow-up in 2 weeks for repeat FBC. Patient educated on malaria prevention.',
    status: 'completed',
    doctor: 'Dr. E. Obi',
  },
  {
    id: 'cn-007',
    type: 'referral',
    patientName: 'Ibrahim Musa',
    mrn: 'MRN-2024-00301',
    date: 'Jun 28, 2026',
    time: '11:30 AM',
    content:
      'Referral to Cardiology for further evaluation of persistent hypertension and exertional chest tightness. Patient has poorly controlled BP (158/98) on current ACE inhibitor therapy. Echo and stress ECG requested. Cardiology OPD appointment booked for 2 weeks. Patient counselled on medication adherence and dietary salt restriction.',
    status: 'completed',
    doctor: 'Dr. E. Obi',
  },
  {
    id: 'cn-008',
    type: 'soap',
    patientName: 'Emeka Nwosu',
    mrn: 'MRN-2024-00523',
    date: 'Jun 25, 2026',
    time: '08:20 AM',
    content:
      'S: 2-week history of productive cough, fever and night sweats. Weight loss of 4kg over 1 month.\nO: Temp 38.2°C, RR 22/min, SpO2 96%. Crackles at right upper zone. CXR shows right upper lobe consolidation with cavitation.\nA: Pulmonary TB suspected. Sputum for AFB × 3 requested. Isolation precautions in place.',
    status: 'draft',
    doctor: 'Dr. E. Obi',
  },
];
