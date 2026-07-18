/**
 * Mock fixtures for the Check-In screen. One searchable sample patient
 * (matching the Patient Profile / Patient Directory persona) with a single
 * scheduled appointment for today.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import type { SelectOption } from '@/features/registration/__mocks__/registerPatientOptions';

function todayAt(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysAgoAt(n: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type CoverageStatus = 'Valid' | 'Expired' | 'Pending';

export type CheckInPatient = {
  id: string;
  mrn: string;
  patientId: string;
  fullName: string;
  initials: string;
  status: 'Active' | 'Inactive';
  age: number;
  gender: string;
  bloodGroup: string;
  maritalStatus: string;
  nationality: string;
  phone: string;
  insurance: {
    provider: string;
    policyNumber: string;
    coverageStatus: CoverageStatus;
    validTill: string;
  };
};

export type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Cancelled';

export type CheckInAppointment = {
  id: string;
  patientId: string;
  dateTime: string;
  status: AppointmentStatus;
  department: string;
  physician: string;
  purpose: string;
  bookedBy: string;
  bookedOn: string;
};

// The one searchable sample patient — matches the Patient Directory /
// Patient Profile persona so all three screens tell the same story.
export const MOCK_CHECKIN_PATIENT: CheckInPatient = {
  id: 'dp-001',
  mrn: 'MRN-2026-00451',
  patientId: 'PT-000451',
  fullName: 'Adaeze Chidinma Okonkwo',
  initials: 'AO',
  status: 'Active',
  age: 21,
  gender: 'Female',
  bloodGroup: 'O+',
  maritalStatus: 'Single',
  nationality: 'Nigerian',
  phone: '0803 456 7890',
  insurance: {
    provider: 'NHIS',
    policyNumber: 'NHIS-2026-0056789',
    coverageStatus: 'Valid',
    validTill: '2026-12-31',
  },
};

// The search keys a user could plausibly type to find the sample patient.
export const CHECKIN_PATIENT_SEARCH_KEYS = [
  'adaeze',
  'okonkwo',
  'mrn-2026-00451',
  'pt-000451',
  '0803 456 7890',
  '08034567890',
];

export const MOCK_CHECKIN_APPOINTMENT: CheckInAppointment = {
  id: 'APT-2026-01458',
  patientId: 'dp-001',
  dateTime: todayAt(10, 0),
  status: 'Scheduled',
  department: 'General Outpatient Clinic',
  physician: 'Dr. Jane Ezeonu (GP)',
  purpose: 'General Consultation',
  bookedBy: 'Adaobi Nwankwo (Staff)',
  bookedOn: daysAgoAt(5, 9, 20),
};

export const VISIT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'outpatient', label: 'Outpatient' },
  { value: 'inpatient', label: 'Inpatient' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'follow-up', label: 'Follow-up' },
];

export const DEPARTMENT_OPTIONS: SelectOption[] = [
  { value: 'general-opd', label: 'General Outpatient Clinic' },
  { value: 'emergency', label: 'Emergency Department' },
  { value: 'antenatal', label: 'Antenatal Clinic' },
  { value: 'pediatric', label: 'Pediatric Clinic' },
  { value: 'dental', label: 'Dental Clinic' },
  { value: 'eye', label: 'Eye Clinic' },
  { value: 'ent', label: 'ENT Clinic' },
  { value: 'physiotherapy', label: 'Physiotherapy Unit' },
];

export const PURPOSE_OF_VISIT_OPTIONS: SelectOption[] = [
  { value: 'general-consultation', label: 'General Consultation' },
  { value: 'follow-up-visit', label: 'Follow-up Visit' },
  { value: 'routine-checkup', label: 'Routine Checkup' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'antenatal-care', label: 'Antenatal Care' },
  { value: 'emergency-care', label: 'Emergency Care' },
  { value: 'specialist-referral', label: 'Specialist Referral' },
];

export const PHYSICIAN_OPTIONS: SelectOption[] = [
  { value: 'dr-jane-ezeonu', label: 'Dr. Jane Ezeonu (GP)' },
  { value: 'dr-michael-obi', label: 'Dr. Michael Obi (Surgeon)' },
  { value: 'dr-ngozi-okafor', label: 'Dr. Ngozi Okafor (Peds)' },
  { value: 'dr-ada-chukwu', label: 'Dr. Ada Chukwu (GP)' },
  { value: 'dr-chinedu-a', label: 'Dr. Chinedu A. (Cardio)' },
];

export const CONSULTING_ROOM_OPTIONS: SelectOption[] = [
  { value: 'room-1', label: 'Room 1' },
  { value: 'room-2', label: 'Room 2' },
  { value: 'room-3', label: 'Room 3' },
  { value: 'room-4', label: 'Room 4' },
  { value: 'room-5', label: 'Room 5' },
];

export const QUEUE_PREFIX = 'OPD';
export const TODAYS_QUEUE_COUNT_BEFORE_ASSIGNMENT = 22;
export const TOTAL_PATIENTS_IN_QUEUE = 8;
export const ESTIMATED_WAIT_MINUTES = 25;
