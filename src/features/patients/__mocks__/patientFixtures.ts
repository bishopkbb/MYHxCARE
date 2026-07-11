/**
 * Mock fixtures for the patients domain.
 * These replace the real API responses during Phase 1–5 development.
 * Swap out by pointing the hooks to real endpoints in Phase 6.
 */

import { Activity, Share2, Stethoscope, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Allergy } from '@/types/patient.types';

// ── Patients list view ────────────────────────────────────────────────────────

export type PatientRecordStatus = 'admitted' | 'active' | 'follow-up' | 'referred' | 'discharged';

export type PatientRecord = {
  id: string;
  initials: string;
  avatarBg: string;
  name: string;
  mrn: string;
  meta: string;
  complaint: string;
  allergies: string[];
  lastVisitDate: string; // DD/MM/YYYY
  lastVisitTime: string; // HH:MM (24 h)
  nextApptDate: string; // DD/MM/YYYY
  nextApptTime: string; // HH:MM (24 h)
  status: PatientRecordStatus;
  faculty: string;
};

export type PatientStatCard = {
  title: string;
  icon: LucideIcon;
  count: string;
  label: string;
  accent: string;
  iconBg: string;
};

export const PATIENT_STAT_CARDS: PatientStatCard[] = [
  {
    title: 'Total Patients',
    icon: Users,
    count: '1,240',
    label: 'All time',
    accent: '#0098CC',
    iconBg: 'rgba(0,152,204,0.1)',
  },
  {
    title: 'Active Patients',
    icon: Stethoscope,
    count: '890',
    label: 'Under your care',
    accent: '#22C55E',
    iconBg: 'rgba(34,197,94,0.1)',
  },
  {
    title: 'Assigned Patients',
    icon: Stethoscope,
    count: '4',
    label: 'This week',
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.1)',
  },
  {
    title: 'Emergency',
    icon: Activity,
    count: '3',
    label: 'Chronic Care',
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.1)',
  },
  {
    title: 'Active Referrals',
    icon: Share2,
    count: '3',
    label: '2 awaiting response',
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.1)',
  },
];

export const MOCK_PATIENTS: PatientRecord[] = [
  {
    id: 'p1',
    initials: 'AO',
    avatarBg: '#EF4444',
    name: 'Adaeze Okonkwo',
    mrn: 'MRN-2024-00451',
    meta: '21y Female · Medicine & Surgery',
    complaint: 'Persistent headache and fever for 3 days',
    allergies: ['Penicillin', 'Sulfonamides'],
    lastVisitDate: '28/06/2026',
    lastVisitTime: '09:15',
    nextApptDate: '12/07/2026',
    nextApptTime: '10:00',
    status: 'admitted',
    faculty: 'Medicine & Surgery',
  },
  {
    id: 'p2',
    initials: 'IE',
    avatarBg: '#EF4444',
    name: 'Ifeanyi Eze',
    mrn: 'MRN-2024-00592',
    meta: '20y Male · Computer Science',
    complaint: 'Suspected typhoid — high fever, abdominal pain, rose spots',
    allergies: ['Penicillin'],
    lastVisitDate: '28/06/2026',
    lastVisitTime: '09:15',
    nextApptDate: '14/07/2026',
    nextApptTime: '09:00',
    status: 'admitted',
    faculty: 'Computer Science',
  },
  {
    id: 'p3',
    initials: 'NA',
    avatarBg: '#22C55E',
    name: 'Ngozi Adeyemi',
    mrn: 'MRN-2024-00512',
    meta: '23y Female · Law',
    complaint: 'Diffuse skin rash and itching for 5 days',
    allergies: ['Penicillin', 'Sulfonamides'],
    lastVisitDate: '28/06/2026',
    lastVisitTime: '09:15',
    nextApptDate: '15/07/2026',
    nextApptTime: '11:00',
    status: 'active',
    faculty: 'Law',
  },
  {
    id: 'p4',
    initials: 'BA',
    avatarBg: '#F59E0B',
    name: 'Babatunde Alade',
    mrn: 'MRN-2024-00356',
    meta: '20y Male · Business Administration',
    complaint: 'Follow-up for treated malaria — monitoring recovery',
    allergies: [],
    lastVisitDate: '28/06/2026',
    lastVisitTime: '09:15',
    nextApptDate: '12/07/2026',
    nextApptTime: '10:00',
    status: 'follow-up',
    faculty: 'Business Administration',
  },
  {
    id: 'p5',
    initials: 'ZB',
    avatarBg: '#3B82F6',
    name: 'Zainab Bello',
    mrn: 'MRN-2024-00571',
    meta: '20y Female · Microbiology',
    complaint: 'Suspected typhoid — awaiting Widal test results, on IV fluids',
    allergies: ['Penicillin'],
    lastVisitDate: '28/06/2026',
    lastVisitTime: '09:15',
    nextApptDate: '12/07/2026',
    nextApptTime: '10:00',
    status: 'referred',
    faculty: 'Microbiology',
  },
  {
    id: 'p6',
    initials: 'SA',
    avatarBg: '#3B82F6',
    name: 'Segun Adeleke',
    mrn: 'MRN-2024-00614',
    meta: '21y Male · Engineering',
    complaint: 'Orthopaedic referral — post-appendicitis follow-up',
    allergies: ['NSAIDs'],
    lastVisitDate: '28/06/2026',
    lastVisitTime: '09:15',
    nextApptDate: '18/07/2026',
    nextApptTime: '14:30',
    status: 'referred',
    faculty: 'Engineering',
  },
  {
    id: 'p7',
    initials: 'CN',
    avatarBg: '#6B7280',
    name: 'Chisom Nwosu',
    mrn: 'MRN-2024-00234',
    meta: '21y Female · Education',
    complaint: 'Malaria — fully treated, fever resolved, appetite restored',
    allergies: ['Penicillin', 'Sulfonamides'],
    lastVisitDate: '28/06/2026',
    lastVisitTime: '09:15',
    nextApptDate: '12/07/2026',
    nextApptTime: '10:00',
    status: 'discharged',
    faculty: 'Education',
  },
];

// ── Medical History types ─────────────────────────────────────────────────────

export type PastDiagnosis = {
  condition: string;
  dateDiagnosed: string;
  status: 'Active' | 'Resolved';
};

export type FamilyHistoryEntry = {
  condition: string;
  relationship: string;
  notes: string;
};

export type ImmunizationEntry = {
  vaccine: string;
  dateAdministered: string;
  nextDue: string | null; // null → "–"; "Completed" → verbatim
};

export type SurgicalEntry = {
  procedure: string;
  date: string;
  hospital: string;
};

export type ChronicCondition = {
  condition: string;
  date: string;
  status: string;
};

export type AllergyHistoryEntry = {
  allergen: string;
  reaction: string;
  severity: 'Severe' | 'Moderate' | 'Mild';
  notedOn: string;
};

export type MedicalHistory = {
  pastDiagnoses: PastDiagnosis[];
  familyHistory: FamilyHistoryEntry[];
  immunizationHistory: ImmunizationEntry[];
  surgicalHistory: SurgicalEntry[];
  chronicConditions: ChronicCondition[];
  allergiesHistory: AllergyHistoryEntry[];
};

// ── Vital Signs types ─────────────────────────────────────────────────────────

export type VitalKey =
  | 'blood-pressure'
  | 'pulse-rate'
  | 'temperature'
  | 'resp-rate'
  | 'spo2'
  | 'weight'
  | 'height'
  | 'bmi';

export type VitalSign = {
  key: VitalKey;
  value: string; // full display string: "132/86 mmHg", "38.7°C", "97%"
  status: 'normal' | 'abnormal'; // abnormal = red reading text + AlertTriangle
};

export type VitalSignsRecord = {
  recordedAt: string; // e.g. "09:15 AM today"
  readings: VitalSign[];
};

export type Consultation = {
  id: string;
  date: string; // "Jun 15, 2026"
  doctor: string; // "Dr. E. Obi"
  diagnosis: string;
  complaint: string;
  plan: string;
};

export type MedicationStatus = 'active' | 'discontinued' | 'completed';

export type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  route: string;
  startedDate: string; // "YYYY-MM-DD"
  prescribedBy: string;
  status: MedicationStatus;
};

export type LabResultStatus = 'critical' | 'verified' | 'pending';

export type LabResultItem = {
  name: string;
  value: string;
  flag: 'H' | 'L' | 'A' | null; // High / Low / Abnormal
  refRange: string;
  isAbnormal: boolean;
};

export type LabResult = {
  id: string;
  testName: string;
  status: LabResultStatus;
  orderedAt: string; // "Jun 30, 2026 09:30 AM"
  items: LabResultItem[];
  inlineNote: string | null; // teal row note below results
  criticalNote: string | null; // red footer box
};

// ── Patient detail view ───────────────────────────────────────────────────────

export type PatientDetailMock = {
  id: string;
  initials: string;
  name: string;
  mrn: string;
  dob: string; // YYYY-MM-DD
  age: string;
  gender: string;
  bloodGroup: string;
  faculty: string;
  level: string; // academic level e.g. "400L"
  fileNumber: string; // university file number e.g. "UZ/MED/2021/0234"
  address: string;
  phone: string;
  email: string;
  queueStatus: string; // current encounter status for display
  allergies: Allergy[];
  isUrgent: boolean;
  medicalHistory: MedicalHistory;
  vitalSigns: VitalSignsRecord;
  consultations: Consultation[];
  medications: Medication[];
  labResults: LabResult[];
};

export const MOCK_PATIENT_DETAILS: Record<string, PatientDetailMock> = {
  p1: {
    id: 'p1',
    initials: 'AO',
    name: 'Adaeze Okonkwo',
    mrn: 'MRN-2024-00451',
    dob: '2003-05-12',
    age: '21 years',
    gender: 'Female',
    bloodGroup: 'O+',
    faculty: 'Medicine & Surgery',
    level: '400L',
    fileNumber: 'UZ/MED/2021/0234',
    address: 'Block C, Room 12, Nnamdi Azikiwe Hostel',
    phone: '+234 802 345 6789',
    email: 'adaeze.okonkwo@unizik.edu.ng',
    queueStatus: 'Waiting',
    allergies: [
      {
        id: 'al-p1-1',
        substance: 'Penicillin',
        reaction: 'Anaphylaxis',
        severity: 'LIFE_THREATENING',
        recordedAt: '2024-03-12T08:30:00Z',
        recordedBy: 'Dr. A. Nwosu',
      },
      {
        id: 'al-p1-2',
        substance: 'Sulfonamides',
        reaction: 'Urticaria and angioedema',
        severity: 'SEVERE',
        recordedAt: '2024-03-12T08:30:00Z',
        recordedBy: 'Dr. A. Nwosu',
      },
    ],
    isUrgent: true,
    medicalHistory: {
      pastDiagnoses: [
        { condition: 'Migraine (Tension Type)', dateDiagnosed: 'Mar 12, 2025', status: 'Active' },
        { condition: 'Gastritis', dateDiagnosed: 'Jun 25, 2025', status: 'Resolved' },
        { condition: 'Malaria', dateDiagnosed: 'Sep 12, 2025', status: 'Resolved' },
        { condition: 'Typhoid Fever', dateDiagnosed: 'Jan 22, 2026', status: 'Resolved' },
        { condition: 'Migraine (Tension Type)', dateDiagnosed: 'Mar 24, 2026', status: 'Resolved' },
      ],
      familyHistory: [
        { condition: 'Hypertension', relationship: 'Father', notes: 'On medication' },
        { condition: 'Type 2 Diabetes', relationship: 'Mother', notes: 'On medication' },
        { condition: 'Asthma', relationship: 'Younger Sister', notes: 'Mild' },
      ],
      immunizationHistory: [
        {
          vaccine: 'COVID-19 (Booster)',
          dateAdministered: 'Nov 20, 2025',
          nextDue: 'Nov 20, 2026',
        },
        { vaccine: 'Influenza', dateAdministered: 'Dec 25, 2025', nextDue: 'Feb 20, 2026' },
        { vaccine: 'Tetanus (TT)', dateAdministered: 'Jan 15, 2026', nextDue: 'Mar 15, 2026' },
        { vaccine: 'Influenza', dateAdministered: 'May 13, 2024', nextDue: null },
        { vaccine: 'HPV (Dose 3)', dateAdministered: 'Aug 18, 2022', nextDue: 'Completed' },
      ],
      surgicalHistory: [],
      chronicConditions: [],
      allergiesHistory: [
        {
          allergen: 'Penicillin',
          reaction: 'Skin rash, itching',
          severity: 'Severe',
          notedOn: 'Nov 20, 2025',
        },
        {
          allergen: 'Sulfonamides',
          reaction: 'Nausea, Vomiting',
          severity: 'Moderate',
          notedOn: 'Nov 20, 2025',
        },
        {
          allergen: 'Latex',
          reaction: 'Skin irritation',
          severity: 'Mild',
          notedOn: 'Nov 20, 2025',
        },
      ],
    },
    vitalSigns: {
      recordedAt: '09:15 AM today',
      readings: [
        { key: 'blood-pressure', value: '132/86 mmHg', status: 'normal' },
        { key: 'pulse-rate', value: '98 bpm', status: 'normal' },
        { key: 'temperature', value: '38.7°C', status: 'abnormal' },
        { key: 'resp-rate', value: '22/min', status: 'abnormal' },
        { key: 'spo2', value: '97%', status: 'normal' },
        { key: 'weight', value: '58 kg', status: 'normal' },
        { key: 'height', value: '165 cm', status: 'normal' },
        { key: 'bmi', value: '21.3', status: 'normal' },
      ],
    },
    consultations: [
      {
        id: 'c1',
        date: 'Jun 15, 2026',
        doctor: 'Dr. E. Obi',
        diagnosis: 'Upper Respiratory Tract Infection',
        complaint: 'Sore throat, runny nose, cough',
        plan: 'Paracetamol 1000mg TDS × 5 days, rest',
      },
      {
        id: 'c2',
        date: 'Apr 03, 2026',
        doctor: 'Dr. A. Chukwu',
        diagnosis: 'Acute Gastroenteritis',
        complaint: 'Vomiting, diarrhea, cramping',
        plan: 'ORS, Metronidazole 400mg TDS × 5 days',
      },
      {
        id: 'c3',
        date: 'Jan 20, 2026',
        doctor: 'Dr. E. Obi',
        diagnosis: 'Tension Headache',
        complaint: 'Bilateral frontal headache, stress',
        plan: 'Ibuprofen 400mg TDS PRN, counselling referral',
      },
    ],
    medications: [
      {
        id: 'm1',
        name: 'Paracetamol',
        dose: '1000mg',
        frequency: 'TDS',
        route: 'Oral',
        startedDate: '2026-06-15',
        prescribedBy: 'Dr. E. Obi',
        status: 'active',
      },
      {
        id: 'm2',
        name: 'Ibuprofen',
        dose: '400mg',
        frequency: 'TDS PRN',
        route: 'Oral',
        startedDate: '2026-01-20',
        prescribedBy: 'Dr. E. Obi',
        status: 'active',
      },
      {
        id: 'm3',
        name: 'Metronidazole',
        dose: '400mg',
        frequency: 'TDS',
        route: 'Oral',
        startedDate: '2026-04-03',
        prescribedBy: 'Dr. A. Chukwu',
        status: 'completed',
      },
    ],
    labResults: [
      {
        id: 'lr1',
        testName: 'Full Blood Count (FBC)',
        status: 'critical',
        orderedAt: 'Jun 30, 2026 09:30 AM',
        items: [
          { name: 'WBC', value: '18.4 ×10³/μL', flag: 'H', refRange: '4.5–11.0', isAbnormal: true },
          { name: 'Neutrophils', value: '85%', flag: 'H', refRange: '40–70', isAbnormal: true },
          { name: 'Lymphocytes', value: '10%', flag: 'L', refRange: '20–40', isAbnormal: true },
          {
            name: 'Haemoglobin',
            value: '9.2 g/dL',
            flag: 'L',
            refRange: '12.0–16.0',
            isAbnormal: true,
          },
          {
            name: 'Platelets',
            value: '380 ×10³/μL',
            flag: null,
            refRange: '150–400',
            isAbnormal: false,
          },
        ],
        inlineNote: null,
        criticalNote:
          'CRITICAL: Elevated WBC with neutrophilia. Anaemia present. Urgent review required.',
      },
      {
        id: 'lr2',
        testName: 'Malaria Rapid Diagnostic Test (RDT)',
        status: 'verified',
        orderedAt: 'Jun 28, 2026 02:15 PM',
        items: [
          {
            name: 'P. falciparum antigen',
            value: 'Negative',
            flag: null,
            refRange: 'Negative',
            isAbnormal: false,
          },
        ],
        inlineNote: 'Malaria ruled out. Investigate other causes of fever.',
        criticalNote: null,
      },
    ],
  },
  p2: {
    id: 'p2',
    initials: 'IE',
    name: 'Ifeanyi Eze',
    mrn: 'MRN-2024-00592',
    dob: '2004-08-20',
    age: '21 years',
    gender: 'Male',
    bloodGroup: 'A+',
    faculty: 'Computer Science',
    level: '200L',
    fileNumber: 'UZ/CSC/2022/0103',
    address: 'Block A, Room 24, Okpara Hall',
    phone: '+234 803 127 4521',
    email: 'ifeanyi.eze@unizik.edu.ng',
    queueStatus: 'New Admission',
    allergies: [],
    isUrgent: false,
    medicalHistory: {
      pastDiagnoses: [
        { condition: 'Typhoid Fever', dateDiagnosed: 'Jul 05, 2026', status: 'Active' },
        { condition: 'Malaria', dateDiagnosed: 'Feb 14, 2025', status: 'Resolved' },
      ],
      familyHistory: [
        { condition: 'Sickle Cell Trait', relationship: 'Father', notes: 'Carrier (AS)' },
        { condition: 'Hypertension', relationship: 'Mother', notes: 'On medication' },
      ],
      immunizationHistory: [
        {
          vaccine: 'COVID-19 (Booster)',
          dateAdministered: 'Oct 10, 2025',
          nextDue: 'Oct 10, 2026',
        },
        {
          vaccine: 'Hepatitis B (3rd Dose)',
          dateAdministered: 'Jan 03, 2020',
          nextDue: 'Completed',
        },
        { vaccine: 'BCG', dateAdministered: 'Mar 01, 2005', nextDue: 'Completed' },
      ],
      surgicalHistory: [],
      chronicConditions: [],
      allergiesHistory: [
        {
          allergen: 'Penicillin',
          reaction: 'Skin rash',
          severity: 'Moderate',
          notedOn: 'Jul 05, 2026',
        },
      ],
    },
    vitalSigns: {
      recordedAt: '08:45 AM today',
      readings: [
        { key: 'blood-pressure', value: '118/75 mmHg', status: 'normal' },
        { key: 'pulse-rate', value: '88 bpm', status: 'normal' },
        { key: 'temperature', value: '38.2°C', status: 'abnormal' },
        { key: 'resp-rate', value: '17/min', status: 'normal' },
        { key: 'spo2', value: '98%', status: 'normal' },
        { key: 'weight', value: '72 kg', status: 'normal' },
        { key: 'height', value: '175 cm', status: 'normal' },
        { key: 'bmi', value: '23.5', status: 'normal' },
      ],
    },
    consultations: [
      {
        id: 'c1',
        date: 'Jul 05, 2026',
        doctor: 'Dr. K. Nwosu',
        diagnosis: 'Typhoid Fever',
        complaint: 'High fever, abdominal pain, generalised weakness',
        plan: 'Ciprofloxacin 500mg BD × 7 days, IV fluids, bed rest',
      },
      {
        id: 'c2',
        date: 'Feb 14, 2025',
        doctor: 'Dr. E. Obi',
        diagnosis: 'Malaria (P. falciparum)',
        complaint: 'Fever, chills, headache, joint pains',
        plan: 'Artemether-Lumefantrine 4 tabs BD × 3 days',
      },
    ],
    medications: [
      {
        id: 'm1',
        name: 'Ciprofloxacin',
        dose: '500mg',
        frequency: 'BD',
        route: 'Oral',
        startedDate: '2026-07-05',
        prescribedBy: 'Dr. K. Nwosu',
        status: 'active',
      },
      {
        id: 'm2',
        name: 'Metronidazole',
        dose: '400mg',
        frequency: 'TDS',
        route: 'Oral',
        startedDate: '2026-04-03',
        prescribedBy: 'Dr. A. Chukwu',
        status: 'completed',
      },
      {
        id: 'm3',
        name: 'Artemether-Lumefantrine',
        dose: '80/480mg',
        frequency: 'BD',
        route: 'Oral',
        startedDate: '2025-02-14',
        prescribedBy: 'Dr. E. Obi',
        status: 'completed',
      },
    ],
    labResults: [
      {
        id: 'lr1',
        testName: 'Widal Test',
        status: 'verified',
        orderedAt: 'Jul 05, 2026 08:00 AM',
        items: [
          { name: 'S. typhi O', value: '1:160', flag: 'A', refRange: '< 1:80', isAbnormal: true },
          { name: 'S. typhi H', value: '1:80', flag: 'A', refRange: '< 1:80', isAbnormal: true },
        ],
        inlineNote: 'Significant titre for Typhoid Fever. Correlate with clinical findings.',
        criticalNote: null,
      },
      {
        id: 'lr2',
        testName: 'Full Blood Count (FBC)',
        status: 'verified',
        orderedAt: 'Jul 05, 2026 08:15 AM',
        items: [
          { name: 'WBC', value: '3.2 ×10³/μL', flag: 'L', refRange: '4.5–11.0', isAbnormal: true },
          {
            name: 'Haemoglobin',
            value: '11.1 g/dL',
            flag: 'L',
            refRange: '13.0–17.0',
            isAbnormal: true,
          },
          {
            name: 'Platelets',
            value: '95 ×10³/μL',
            flag: 'L',
            refRange: '150–400',
            isAbnormal: true,
          },
        ],
        inlineNote: null,
        criticalNote: null,
      },
      {
        id: 'lr3',
        testName: 'Urinalysis (Routine)',
        status: 'pending',
        orderedAt: 'Jul 06, 2026 09:00 AM',
        items: [],
        inlineNote: null,
        criticalNote: null,
      },
    ],
  },
  p3: {
    id: 'p3',
    initials: 'NA',
    name: 'Ngozi Adeyemi',
    mrn: 'MRN-2024-00512',
    dob: '2001-11-15',
    age: '24 years',
    gender: 'Female',
    bloodGroup: 'B-',
    faculty: 'Law',
    level: '500L',
    fileNumber: 'UZ/LAW/2020/0089',
    address: 'Block D, Room 8, Odenigbo Hall',
    phone: '+234 806 512 3344',
    email: 'ngozi.adeyemi@unizik.edu.ng',
    queueStatus: 'Emergency',
    allergies: [
      {
        id: 'al-p3-1',
        substance: 'Aspirin',
        reaction: 'Bronchospasm and rhinitis',
        severity: 'SEVERE',
        recordedAt: '2024-05-18T10:00:00Z',
        recordedBy: 'Dr. C. Obi',
      },
    ],
    isUrgent: false,
    medicalHistory: {
      pastDiagnoses: [
        { condition: 'Diffuse Skin Rash', dateDiagnosed: 'Jul 10, 2026', status: 'Active' },
        { condition: 'Urinary Tract Infection', dateDiagnosed: 'Apr 20, 2025', status: 'Resolved' },
        { condition: 'Malaria', dateDiagnosed: 'Nov 05, 2024', status: 'Resolved' },
      ],
      familyHistory: [
        { condition: 'Type 2 Diabetes', relationship: 'Father', notes: 'On insulin' },
        { condition: 'Asthma', relationship: 'Mother', notes: 'Mild, seasonal' },
      ],
      immunizationHistory: [
        { vaccine: 'COVID-19 (Primary)', dateAdministered: 'Sep 14, 2022', nextDue: 'Completed' },
        { vaccine: 'Tetanus (TT)', dateAdministered: 'Jun 22, 2024', nextDue: 'Jun 22, 2029' },
        {
          vaccine: 'Hepatitis B (3rd Dose)',
          dateAdministered: 'Feb 18, 2019',
          nextDue: 'Completed',
        },
      ],
      surgicalHistory: [
        { procedure: 'Appendectomy', date: 'Mar 08, 2023', hospital: 'UNTH Enugu' },
      ],
      chronicConditions: [
        {
          condition: 'Aspirin-Exacerbated Respiratory Disease',
          date: 'Jan 15, 2024',
          status: 'Active',
        },
      ],
      allergiesHistory: [
        {
          allergen: 'Aspirin',
          reaction: 'Bronchospasm, rhinitis',
          severity: 'Severe',
          notedOn: 'May 18, 2024',
        },
      ],
    },
    vitalSigns: {
      recordedAt: '07:30 AM today',
      readings: [
        { key: 'blood-pressure', value: '116/74 mmHg', status: 'normal' },
        { key: 'pulse-rate', value: '104 bpm', status: 'abnormal' },
        { key: 'temperature', value: '37.8°C', status: 'abnormal' },
        { key: 'resp-rate', value: '18/min', status: 'normal' },
        { key: 'spo2', value: '98%', status: 'normal' },
        { key: 'weight', value: '63 kg', status: 'normal' },
        { key: 'height', value: '162 cm', status: 'normal' },
        { key: 'bmi', value: '24.0', status: 'normal' },
      ],
    },
    consultations: [
      {
        id: 'c1',
        date: 'May 21, 2026',
        doctor: 'Dr. A. Chukwu',
        diagnosis: 'Allergic Contact Dermatitis',
        complaint: 'Itchy rash on arms and torso after exposure to new detergent',
        plan: 'Chlorphenamine 4mg TDS, Hydrocortisone cream 1%, avoid trigger',
      },
      {
        id: 'c2',
        date: 'Nov 10, 2025',
        doctor: 'Dr. E. Obi',
        diagnosis: 'Acute Pharyngitis',
        complaint: 'Severe sore throat, painful swallowing, mild fever',
        plan: 'Amoxicillin 500mg TDS × 5 days, throat lozenges, warm saline gargle',
      },
      {
        id: 'c3',
        date: 'Jun 18, 2025',
        doctor: 'Dr. K. Nwosu',
        diagnosis: 'Dysmenorrhea',
        complaint: 'Severe menstrual cramps, nausea',
        plan: 'Mefenamic acid 500mg TDS PRN, heat pad, review in 2 weeks',
      },
    ],
    medications: [
      {
        id: 'm1',
        name: 'Chlorphenamine',
        dose: '4mg',
        frequency: 'TDS',
        route: 'Oral',
        startedDate: '2026-05-21',
        prescribedBy: 'Dr. A. Chukwu',
        status: 'active',
      },
      {
        id: 'm2',
        name: 'Hydrocortisone Cream 1%',
        dose: 'Apply thinly',
        frequency: 'BD',
        route: 'Topical',
        startedDate: '2026-05-21',
        prescribedBy: 'Dr. A. Chukwu',
        status: 'active',
      },
      {
        id: 'm3',
        name: 'Amoxicillin',
        dose: '500mg',
        frequency: 'TDS',
        route: 'Oral',
        startedDate: '2025-11-10',
        prescribedBy: 'Dr. E. Obi',
        status: 'completed',
      },
    ],
    labResults: [
      {
        id: 'lr1',
        testName: 'Malaria Rapid Diagnostic Test (RDT)',
        status: 'verified',
        orderedAt: 'Jun 28, 2026 02:15 PM',
        items: [
          {
            name: 'P. falciparum antigen',
            value: 'Positive',
            flag: 'A',
            refRange: 'Negative',
            isAbnormal: true,
          },
        ],
        inlineNote: 'Positive result. Treatment completed.',
        criticalNote: null,
      },
      {
        id: 'lr2',
        testName: 'Chest X-Ray (PA view)',
        status: 'pending',
        orderedAt: 'Jun 30, 2026 10:42 AM',
        items: [],
        inlineNote: null,
        criticalNote: null,
      },
      {
        id: 'lr3',
        testName: 'Urinalysis (Routine)',
        status: 'pending',
        orderedAt: 'Jun 30, 2026 09:58 AM',
        items: [],
        inlineNote: null,
        criticalNote: null,
      },
    ],
  },
};

export const FALLBACK_PATIENT_DETAIL: PatientDetailMock = {
  id: 'unknown',
  initials: '??',
  name: 'Unknown Patient',
  mrn: 'MRN-0000-00000',
  dob: '—',
  age: '—',
  gender: '—',
  bloodGroup: '—',
  faculty: '—',
  level: '—',
  fileNumber: '—',
  address: '—',
  phone: '—',
  email: '—',
  queueStatus: '—',
  allergies: [],
  isUrgent: false,
  medicalHistory: {
    pastDiagnoses: [],
    familyHistory: [],
    immunizationHistory: [],
    surgicalHistory: [],
    chronicConditions: [],
    allergiesHistory: [],
  },
  vitalSigns: {
    recordedAt: '',
    readings: [],
  },
  consultations: [],
  medications: [],
  labResults: [],
};
