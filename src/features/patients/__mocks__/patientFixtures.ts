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
};
