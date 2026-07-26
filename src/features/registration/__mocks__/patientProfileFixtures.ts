/**
 * Mock fixture for the Patient Profile screen — a single, richly detailed
 * sample patient (matching the patient at the top of the Patient Directory
 * list). Swap out by pointing hooks to real endpoints in Phase 6.
 */

import type { Allergy, AllergySeverity, Gender } from '@/types/patient.types';
import type { DirectoryPatient } from '@/features/registration/__mocks__/patientDirectoryFixtures';

// ─── Time helpers ────────────────────────────────────────────────────────
// Computed relative to "now" rather than hardcoded so the profile always
// reads as current activity, regardless of when the app is opened.

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const REGISTRATION_DAY_OFFSET = -21; // ~3 weeks ago

export type MedicalAlertSeverity = 'Severe' | 'Moderate' | 'Important';

export type MedicalAlert = {
  id: string;
  label: string;
  detail: string;
  severity: MedicalAlertSeverity;
};

export type RegistrationHistoryEntry = {
  id: string;
  dateTime: string; // ISO
  label: string;
  detail?: string;
};

export type PatientProfile = {
  id: string;
  mrn: string;
  patientId: string;
  studentId: string;
  fullName: string;
  status: 'Active' | 'Inactive';
  photoUrl?: string;
  gender: Gender;
  bloodGroup: string;
  maritalStatus: string;
  nationality: string;

  dateRegistered: string;
  registeredBy: string;
  lastUpdated: string;
  lastUpdatedBy: string;

  dateOfBirth: string;
  religion: string;
  occupation: string;

  phone: string;
  email: string;
  address: string;
  stateOfOrigin: string;
  lga: string;

  nextOfKin: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
    address: string;
  };

  insurance: {
    provider: string;
    type: string;
    policyId: string;
    groupNumber: string;
    validFrom: string;
    validTo: string;
  };

  student: {
    facultyDepartment: string;
    level: string;
    programme: string;
    matricNumber: string;
    admissionYear: string;
    hostel: string;
  };

  allergies: Allergy[];
  medicalAlerts: MedicalAlert[];
  alertsLastReviewed: string;
  alertsLastReviewedBy: string;

  registrationHistory: RegistrationHistoryEntry[];

  totalVisits: number;
  lastVisit: string;
  upcomingAppointment: { dateTime: string } | null;
  primaryPhysician: { name: string; role: string };
};

export const MOCK_PATIENT_PROFILE: PatientProfile = {
  id: 'dp-001',
  mrn: 'MRN-2026-00451',
  patientId: 'PT-000451',
  studentId: '202401234',
  fullName: 'Adaeze Chidinma Okonkwo',
  status: 'Active',
  gender: 'Female',
  bloodGroup: 'O+',
  maritalStatus: 'Single',
  nationality: 'Nigerian',

  dateRegistered: atOffset(REGISTRATION_DAY_OFFSET, 9, 15),
  registeredBy: 'Adaobi Nwankwo',
  lastUpdated: atOffset(-4, 14, 30),
  lastUpdatedBy: 'Adaobi Nwankwo',

  dateOfBirth: '2004-08-20',
  religion: 'Christianity',
  occupation: 'Student',

  phone: '0803 456 7890',
  email: 'adaeze.okonkwo@email.com',
  address: 'No. 12 Nnamdi Azikiwe Street, Awka, Anambra State.',
  stateOfOrigin: 'Anambra',
  lga: 'Awka South',

  nextOfKin: {
    name: 'Mr. Chinedu Okonkwo',
    relationship: 'Father',
    phone: '0806 123 4567',
    email: 'chinedu.okonkwo@email.com',
    address: 'No. 12 Nnamdi Azikiwe Street, Awka, Anambra State.',
  },

  insurance: {
    provider: 'AXA Mansard Health',
    type: 'HMO — Standard Plan',
    policyId: 'AXA-5896-7788-0012',
    groupNumber: 'UNIZIK-STAFF-2026',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
  },

  student: {
    facultyDepartment: 'Medicine and Surgery',
    level: '200 Level',
    programme: 'MBBS',
    matricNumber: '202401234',
    admissionYear: '2024/2025',
    hostel: 'Chukwuemeka Odumegwu Ojukwu Hall',
  },

  allergies: [
    {
      id: 'alg-001',
      substance: 'Penicillin',
      reaction: 'Anaphylaxis',
      severity: 'SEVERE',
      recordedAt: atOffset(REGISTRATION_DAY_OFFSET, 9, 30),
      recordedBy: 'Adaobi Nwankwo',
    },
    {
      id: 'alg-002',
      substance: 'Peanuts',
      reaction: 'Swelling, difficulty breathing',
      severity: 'SEVERE',
      recordedAt: atOffset(REGISTRATION_DAY_OFFSET, 9, 30),
      recordedBy: 'Adaobi Nwankwo',
    },
  ],

  medicalAlerts: [
    { id: 'ma-001', label: 'Allergy', detail: 'Penicillin, Peanuts', severity: 'Severe' },
    { id: 'ma-002', label: 'Chronic Condition', detail: 'Asthma', severity: 'Moderate' },
    {
      id: 'ma-003',
      label: 'Other Alert',
      detail: 'No blood transfusion (Religious)',
      severity: 'Important',
    },
  ],
  alertsLastReviewed: atOffset(-4, 14, 30),
  alertsLastReviewedBy: 'Adaobi Nwankwo',

  registrationHistory: [
    {
      id: 'rh-001',
      dateTime: atOffset(REGISTRATION_DAY_OFFSET, 9, 15),
      label: 'Patient Registered',
      detail: 'by Adaobi Nwankwo',
    },
    {
      id: 'rh-002',
      dateTime: atOffset(REGISTRATION_DAY_OFFSET, 9, 20),
      label: 'Insurance Verified',
      detail: 'NHIS',
    },
    {
      id: 'rh-003',
      dateTime: atOffset(REGISTRATION_DAY_OFFSET, 9, 25),
      label: 'Patient ID Generated',
      detail: 'PT-000451',
    },
    {
      id: 'rh-004',
      dateTime: atOffset(REGISTRATION_DAY_OFFSET, 9, 30),
      label: 'Patient Card Printed',
    },
  ],

  totalVisits: 8,
  lastVisit: atOffset(-1, 11, 0),
  upcomingAppointment: { dateTime: atOffset(7, 10, 0) },
  primaryPhysician: { name: 'Dr. Jane Ezeonu', role: 'General Practitioner' },
};

// ─── Directory patient → full profile adapter ───────────────────────────────
// Shared by every screen that needs to render an arbitrary registered
// patient in this screen's full shape (Registration's Patient Profile,
// Medical Records' Patient Medical Record view) — one adapter, not one per
// screen, so a future field addition here doesn't need updating twice.

const ALLERGY_TO_ALERT_SEVERITY: Record<AllergySeverity, MedicalAlertSeverity> = {
  LIFE_THREATENING: 'Severe',
  SEVERE: 'Severe',
  MODERATE: 'Moderate',
  MILD: 'Important',
};

/** Renders any registered patient in the full-profile shape, not just the
 * one curated demo persona. `DirectoryPatient` doesn't carry everything
 * `PatientProfile` does (next of kin, insurance policy detail, student
 * programme info, registration history, visit summary) — those sections
 * honestly show '—'/empty rather than fabricated data, exactly like every
 * other screen in this app already does for fields it doesn't have.
 * Allergies are real (carried on `DirectoryPatient` since the
 * registration-wizard fix), and are also surfaced as Medical Alerts so a
 * freshly registered patient with a reported allergy isn't blank there
 * either. */
export function directoryPatientToProfile(dp: DirectoryPatient): PatientProfile {
  const medicalAlerts: MedicalAlert[] = dp.allergies.map((a) => ({
    id: `ma-${a.id}`,
    label: 'Allergy',
    detail: `${a.substance} — ${a.reaction}`,
    severity: ALLERGY_TO_ALERT_SEVERITY[a.severity],
  }));

  return {
    id: dp.id,
    mrn: dp.mrn,
    patientId: dp.patientId,
    studentId: dp.studentId,
    fullName: dp.name,
    status: dp.status === 'Inactive' ? 'Inactive' : 'Active',
    ...(dp.photoUrl ? { photoUrl: dp.photoUrl } : {}),
    gender: dp.gender,
    bloodGroup: dp.bloodGroup,
    maritalStatus: dp.maritalStatus,
    nationality: dp.nationality,
    dateRegistered: dp.dateRegistered,
    registeredBy: '—',
    lastUpdated: dp.dateRegistered,
    lastUpdatedBy: '—',
    dateOfBirth: dp.dateOfBirth,
    religion: '',
    occupation: '',
    phone: dp.phone,
    email: dp.email,
    address: dp.address,
    stateOfOrigin: '',
    lga: '',
    nextOfKin: { name: '', relationship: '', phone: '', email: '', address: '' },
    // No policy dates on file for a directory-only record — left blank
    // rather than borrowing dateRegistered as a fake "valid from".
    insurance: {
      provider: dp.insuranceProvider,
      type: '',
      policyId: '',
      groupNumber: '',
      validFrom: '',
      validTo: '',
    },
    student: {
      facultyDepartment: dp.faculty,
      level: '',
      programme: '',
      matricNumber: dp.studentId,
      admissionYear: '',
      hostel: '',
    },
    allergies: dp.allergies,
    medicalAlerts,
    alertsLastReviewed: dp.dateRegistered,
    alertsLastReviewedBy: '—',
    registrationHistory: [
      {
        id: 'rh-auto-1',
        dateTime: `${dp.dateRegistered}T00:00:00.000Z`,
        label: 'Patient Registered',
        detail: dp.category,
      },
    ],
    totalVisits: 0,
    lastVisit: dp.dateRegistered,
    upcomingAppointment: null,
    primaryPhysician: { name: '—', role: '—' },
  };
}
