/**
 * Mock fixtures for the Appointment Scheduling screen. Doctor/department
 * pairings reuse the same people already seeded in queueFixtures.ts
 * (Dr. Michael Obi -> Paediatrics, Dr. Ifeanyi Okafor -> Dental Clinic,
 * "Dr. Chinedu A." -> the fuller "Dr. Chinedu Anya" for Surgery) so the
 * same clinic staff show up consistently across Queue Management and
 * Appointment Scheduling.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import type { SelectOption } from '@/features/registration/__mocks__/registerPatientOptions';

function todayAt(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysFromNowAt(n: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type AppointmentStatus =
  'Confirmed' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';

export type SchedulingDoctor = {
  id: string;
  name: string;
  department: string;
  initials: string;
};

export type ScheduledAppointment = {
  id: string;
  doctorId: string;
  patientName: string;
  visitType: string;
  dateTime: string; // ISO
  durationMinutes: number;
  baseStatus: 'Confirmed' | 'Scheduled' | 'Cancelled';
};

export const DOCTORS: SchedulingDoctor[] = [
  {
    id: 'doc-jane',
    name: 'Dr. Jane Ezeonu (GP)',
    department: 'General Outpatient Clinic',
    initials: 'JE',
  },
  { id: 'doc-michael', name: 'Dr. Michael Obi', department: 'Paediatrics', initials: 'MO' },
  { id: 'doc-chinedu', name: 'Dr. Chinedu Anya', department: 'Surgery', initials: 'CA' },
  { id: 'doc-ifeanyi', name: 'Dr. Ifeanyi Okafor', department: 'Dental Clinic', initials: 'IO' },
  { id: 'doc-ngozi', name: 'Dr. Ngozi A. Umeh', department: 'Physiotherapy', initials: 'NU' },
  { id: 'doc-chika', name: 'Dr. Chika Nnamdi', department: 'Radiology', initials: 'CN' },
];

export const DEPARTMENT_OPTIONS: SelectOption[] = [
  { value: 'General Outpatient Clinic', label: 'General Outpatient Clinic' },
  { value: 'Paediatrics', label: 'Paediatrics' },
  { value: 'Surgery', label: 'Surgery' },
  { value: 'Dental Clinic', label: 'Dental Clinic' },
  { value: 'Physiotherapy', label: 'Physiotherapy' },
  { value: 'Radiology', label: 'Radiology' },
];

export const VISIT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'General Consultation', label: 'General Consultation' },
  { value: 'Follow-up Visit', label: 'Follow-up Visit' },
  { value: 'Routine Checkup', label: 'Routine Checkup' },
  { value: 'Vaccination', label: 'Vaccination' },
  { value: 'Specialist Referral', label: 'Specialist Referral' },
  { value: 'Minor Procedure', label: 'Minor Procedure' },
];

export const APPOINTMENT_MODE_OPTIONS: SelectOption[] = [
  { value: 'In-Person', label: 'In-Person' },
  { value: 'Virtual Consultation', label: 'Virtual Consultation' },
  { value: 'Phone Call', label: 'Phone Call' },
];

export const DURATION_OPTIONS: SelectOption[] = [
  { value: '15', label: '15 mins' },
  { value: '20', label: '20 mins' },
  { value: '30', label: '30 mins' },
  { value: '45', label: '45 mins' },
  { value: '60', label: '60 mins' },
];

export const FEE_BY_VISIT_TYPE: Record<string, number> = {
  'General Consultation': 2500,
  'Follow-up Visit': 1500,
  'Routine Checkup': 2000,
  Vaccination: 3000,
  'Specialist Referral': 5000,
  'Minor Procedure': 7500,
};

export const SEED_APPOINTMENTS: ScheduledAppointment[] = [
  // Dr. Jane Ezeonu (GP) — General Outpatient Clinic
  {
    id: 'apt-001',
    doctorId: 'doc-jane',
    patientName: 'Melissa Eze',
    visitType: 'Follow-up Visit',
    dateTime: todayAt(8, 0),
    durationMinutes: 30,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-002',
    doctorId: 'doc-jane',
    patientName: 'Chuka Nwosu',
    visitType: 'General Consultation',
    dateTime: todayAt(9, 0),
    durationMinutes: 30,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-003',
    doctorId: 'doc-jane',
    patientName: 'Grace Umeh',
    visitType: 'General Consultation',
    dateTime: todayAt(11, 0),
    durationMinutes: 30,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-004',
    doctorId: 'doc-jane',
    patientName: 'John Okoro',
    visitType: 'Routine Checkup',
    dateTime: todayAt(14, 0),
    durationMinutes: 30,
    baseStatus: 'Scheduled',
  },

  // Dr. Michael Obi — Paediatrics
  {
    id: 'apt-005',
    doctorId: 'doc-michael',
    patientName: 'Ifeoma Anayo',
    visitType: 'Vaccination',
    dateTime: todayAt(9, 30),
    durationMinutes: 20,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-006',
    doctorId: 'doc-michael',
    patientName: 'Daniel Obasi',
    visitType: 'General Consultation',
    dateTime: todayAt(11, 0),
    durationMinutes: 30,
    baseStatus: 'Cancelled',
  },
  {
    id: 'apt-007',
    doctorId: 'doc-michael',
    patientName: 'Emeka Obi',
    visitType: 'Follow-up Visit',
    dateTime: todayAt(13, 30),
    durationMinutes: 30,
    baseStatus: 'Scheduled',
  },

  // Dr. Chinedu Anya — Surgery
  {
    id: 'apt-008',
    doctorId: 'doc-chinedu',
    patientName: 'Peter Nnamdi',
    visitType: 'Specialist Referral',
    dateTime: todayAt(8, 30),
    durationMinutes: 45,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-009',
    doctorId: 'doc-chinedu',
    patientName: 'Victoria Etim',
    visitType: 'General Consultation',
    dateTime: todayAt(10, 30),
    durationMinutes: 30,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-010',
    doctorId: 'doc-chinedu',
    patientName: 'Samuel Adigwe',
    visitType: 'Follow-up Visit',
    dateTime: todayAt(13, 0),
    durationMinutes: 30,
    baseStatus: 'Scheduled',
  },
  {
    id: 'apt-011',
    doctorId: 'doc-chinedu',
    patientName: 'Kingsley Obiora',
    visitType: 'General Consultation',
    dateTime: todayAt(15, 0),
    durationMinutes: 30,
    baseStatus: 'Scheduled',
  },

  // Dr. Ifeanyi Okafor — Dental Clinic
  {
    id: 'apt-012',
    doctorId: 'doc-ifeanyi',
    patientName: 'Amaka Nwosu',
    visitType: 'Routine Checkup',
    dateTime: todayAt(9, 0),
    durationMinutes: 30,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-013',
    doctorId: 'doc-ifeanyi',
    patientName: 'Tobi Adeyemi',
    visitType: 'Minor Procedure',
    dateTime: todayAt(12, 0),
    durationMinutes: 45,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-014',
    doctorId: 'doc-ifeanyi',
    patientName: 'Chioma Duru',
    visitType: 'Follow-up Visit',
    dateTime: todayAt(14, 30),
    durationMinutes: 30,
    baseStatus: 'Scheduled',
  },

  // Dr. Ngozi A. Umeh — Physiotherapy
  {
    id: 'apt-015',
    doctorId: 'doc-ngozi',
    patientName: 'Blessing Okoye',
    visitType: 'Follow-up Visit',
    dateTime: todayAt(10, 0),
    durationMinutes: 30,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-016',
    doctorId: 'doc-ngozi',
    patientName: 'Emmanuel Bassey',
    visitType: 'Routine Checkup',
    dateTime: todayAt(13, 0),
    durationMinutes: 30,
    baseStatus: 'Scheduled',
  },

  // Dr. Chika Nnamdi — Radiology
  {
    id: 'apt-017',
    doctorId: 'doc-chika',
    patientName: 'Ngozi Ibe',
    visitType: 'Specialist Referral',
    dateTime: todayAt(9, 0),
    durationMinutes: 30,
    baseStatus: 'Confirmed',
  },
  {
    id: 'apt-018',
    doctorId: 'doc-chika',
    patientName: 'Aisha Lawal',
    visitType: 'General Consultation',
    dateTime: todayAt(12, 30),
    durationMinutes: 30,
    baseStatus: 'Scheduled',
  },
];

export type UpcomingAppointment = {
  id: string;
  dateTime: string;
  department: string;
  doctorName: string;
};

// The selected patient's own upcoming appointments — same persona used in
// Patient Profile / Check-In (MRN-2026-00451).
export const PATIENT_UPCOMING_APPOINTMENTS: UpcomingAppointment[] = [
  {
    id: 'apt-upcoming-1',
    dateTime: daysFromNowAt(18, 10, 0),
    department: 'General Outpatient Clinic',
    doctorName: 'Dr. Jane Ezeonu (GP)',
  },
  {
    id: 'apt-upcoming-2',
    dateTime: daysFromNowAt(25, 11, 30),
    department: 'Dental Clinic',
    doctorName: 'Dr. Ifeanyi Okafor',
  },
];

export const CALENDAR_START_HOUR = 8;
export const CALENDAR_END_HOUR = 17;
