/**
 * Mock fixtures for the Nurse Dashboard screen.
 * Swap out by pointing hooks to real ward/encounter endpoints in Phase 6.
 */

import {
  AlertTriangle,
  BedDouble,
  ClipboardList,
  Pill,
  Siren,
  Users,
  type LucideIcon,
} from 'lucide-react';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type TrendDirection = 'up' | 'down';

export type NurseStat = {
  id: string;
  label: string;
  value: string;
  subLabel: string;
  direction?: TrendDirection;
  goodDirection?: TrendDirection;
  icon: LucideIcon;
  color: string;
  iconBg: string;
};

export const NURSE_DASHBOARD_STATS: NurseStat[] = [
  {
    id: 'my-patients',
    label: 'Patients Under My Care',
    value: '18',
    subLabel: 'Currently assigned',
    icon: Users,
    color: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'medication-due',
    label: 'Medication Due',
    value: '9',
    subLabel: 'Next administration',
    icon: Pill,
    color: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
  },
  {
    id: 'admissions-today',
    label: 'Admissions Today',
    value: '4',
    subLabel: 'Awaiting nursing assessment',
    icon: ClipboardList,
    color: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 'pending-vitals',
    label: 'Pending Vital Signs',
    value: '7',
    subLabel: 'Patients awaiting observation',
    icon: AlertTriangle,
    color: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
  },
  {
    id: 'critical-alerts',
    label: 'Critical Alerts',
    value: '2',
    subLabel: 'Requires immediate attention',
    direction: 'up',
    goodDirection: 'down',
    icon: Siren,
    color: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
  },
  {
    id: 'shift-ends',
    label: 'Shift Ends',
    value: '15:00',
    subLabel: 'Remaining time: 3h 45m',
    icon: BedDouble,
    color: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
  },
];

export const CURRENT_SHIFT = {
  name: 'Morning Shift',
  startTime: '07:00',
  endTime: '15:00',
};

// ─── My Patients ────────────────────────────────────────────────────────────

export type PatientCondition = 'Stable' | 'Fair' | 'Critical';

export type NursePatientRow = {
  id: string;
  patientName: string;
  initials: string;
  avatarBg: string;
  mrn: string;
  ward: string;
  bed: string;
  condition: PatientCondition;
  lastActivity: string;
  lastActivityLabel: string;
};

export const MY_PATIENTS: NursePatientRow[] = [
  {
    id: 'np-001',
    patientName: 'Chidinma Okafor',
    initials: 'CO',
    avatarBg: '#3B82F6',
    mrn: 'MRN-2026-0148',
    ward: 'Female Ward',
    bed: 'Bed 12',
    condition: 'Stable',
    lastActivity: atOffset(0, 8, 15),
    lastActivityLabel: 'Vitals recorded',
  },
  {
    id: 'np-002',
    patientName: 'Ifeanyi Nwosu',
    initials: 'IN',
    avatarBg: '#F59E0B',
    mrn: 'MRN-2026-00987',
    ward: 'Male Ward',
    bed: 'Bed 5',
    condition: 'Fair',
    lastActivity: atOffset(0, 7, 50),
    lastActivityLabel: 'Medication given',
  },
  {
    id: 'np-003',
    patientName: 'Maryam Usman',
    initials: 'MU',
    avatarBg: '#22C55E',
    mrn: 'MRN-2026-00765',
    ward: 'Female Ward',
    bed: 'Bed 3',
    condition: 'Stable',
    lastActivity: atOffset(0, 8, 10),
    lastActivityLabel: 'Vitals recorded',
  },
  {
    id: 'np-004',
    patientName: 'Daniel Eze',
    initials: 'DE',
    avatarBg: '#EF4444',
    mrn: 'MRN-2026-00187',
    ward: 'Male Ward',
    bed: 'Bed 8',
    condition: 'Critical',
    lastActivity: atOffset(0, 8, 5),
    lastActivityLabel: 'Doctor notified',
  },
  {
    id: 'np-005',
    patientName: 'Grace Adebayo',
    initials: 'GA',
    avatarBg: '#8B5CF6',
    mrn: 'MRN-2026-00421',
    ward: 'Female Ward',
    bed: 'Bed 15',
    condition: 'Fair',
    lastActivity: atOffset(0, 7, 45),
    lastActivityLabel: 'Vitals recorded',
  },
];

export const TOTAL_PATIENTS_UNDER_CARE = 18;

// ─── Medication Due ─────────────────────────────────────────────────────────

export type MedicationDueRow = {
  id: string;
  time: string;
  patientName: string;
  medication: string;
  route: string;
  overdue: boolean;
};

export const MEDICATION_DUE: MedicationDueRow[] = [
  {
    id: 'md-001',
    time: atOffset(0, 9, 0),
    patientName: 'Daniel Eze',
    medication: 'Paracetamol 1g',
    route: 'PO',
    overdue: true,
  },
  {
    id: 'md-002',
    time: atOffset(0, 9, 15),
    patientName: 'Ifeanyi Nwosu',
    medication: 'Ceftriaxone 1g',
    route: 'IV',
    overdue: false,
  },
  {
    id: 'md-003',
    time: atOffset(0, 9, 30),
    patientName: 'Maryam Usman',
    medication: 'Amlodipine 5mg',
    route: 'PO',
    overdue: false,
  },
  {
    id: 'md-004',
    time: atOffset(0, 10, 0),
    patientName: 'Chidinma Okafor',
    medication: 'Metformin 500mg',
    route: 'PO',
    overdue: false,
  },
  {
    id: 'md-005',
    time: atOffset(0, 10, 30),
    patientName: 'Grace Adebayo',
    medication: 'Salbutamol 2.5mg',
    route: 'Neb',
    overdue: false,
  },
];

export const TOTAL_MEDICATIONS_DUE = 9;

// ─── Alerts & Notifications ─────────────────────────────────────────────────

export type AlertSeverity = 'high' | 'warning' | 'info';

export type NurseAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
};

export const NURSE_ALERTS: NurseAlert[] = [
  {
    id: 'al-001',
    severity: 'high',
    title: 'High Priority',
    description: 'Daniel Eze (Bed 8) — BP 180/110 mmHg',
    time: atOffset(0, 8, 5),
    icon: AlertTriangle,
  },
  {
    id: 'al-002',
    severity: 'warning',
    title: 'Medication Overdue',
    description: 'Paracetamol 1g for Daniel Eze is overdue',
    time: atOffset(0, 8, 0),
    icon: Pill,
  },
  {
    id: 'al-003',
    severity: 'warning',
    title: 'Pending Vitals',
    description: '7 patients awaiting vital signs',
    time: atOffset(0, 7, 55),
    icon: ClipboardList,
  },
  {
    id: 'al-004',
    severity: 'info',
    title: 'New Admission',
    description: '4 new admissions awaiting assessment',
    time: atOffset(0, 7, 30),
    icon: BedDouble,
  },
];

// ─── Today's Admissions ─────────────────────────────────────────────────────

export type AdmissionStatus = 'Pending Assessment' | 'Assessed';

export type TodayAdmissionRow = {
  id: string;
  time: string;
  patientName: string;
  ward: string;
  bed: string;
  status: AdmissionStatus;
};

export const TODAYS_ADMISSIONS: TodayAdmissionRow[] = [
  {
    id: 'ad-001',
    time: atOffset(0, 7, 15),
    patientName: 'Amina Yusuf',
    ward: 'Female Ward',
    bed: 'Bed 16',
    status: 'Pending Assessment',
  },
  {
    id: 'ad-002',
    time: atOffset(0, 8, 0),
    patientName: 'Tunde Stephen',
    ward: 'Male Ward',
    bed: 'Bed 9',
    status: 'Pending Assessment',
  },
  {
    id: 'ad-003',
    time: atOffset(0, 8, 20),
    patientName: 'Rita Eze',
    ward: 'Female Ward',
    bed: 'Bed 11',
    status: 'Pending Assessment',
  },
  {
    id: 'ad-004',
    time: atOffset(0, 9, 5),
    patientName: 'Peter Obi',
    ward: 'Male Ward',
    bed: 'Bed 13',
    status: 'Pending Assessment',
  },
];

// ─── Ward Census ─────────────────────────────────────────────────────────────

export type DistributionSlice = { label: string; value: number; percent: number; color: string };

export const WARD_CENSUS: DistributionSlice[] = [
  { label: 'Occupied', value: 24, percent: 75, color: '#3B82F6' },
  { label: 'Available', value: 6, percent: 19, color: '#22C55E' },
  { label: 'Reserved', value: 2, percent: 6, color: '#F59E0B' },
];

export const TOTAL_BEDS = 32;

// ─── Upcoming Tasks ─────────────────────────────────────────────────────────

export type UpcomingTask = {
  id: string;
  time: string;
  label: string;
  done: boolean;
};

export const UPCOMING_TASKS: UpcomingTask[] = [
  { id: 'tk-001', time: '09:00', label: 'Medication Round', done: false },
  { id: 'tk-002', time: '10:00', label: 'Ward Rounds with Doctor', done: false },
  { id: 'tk-003', time: '11:00', label: 'Vitals Round', done: false },
  { id: 'tk-004', time: '14:00', label: 'IV Medication Round', done: false },
  { id: 'tk-005', time: '14:30', label: 'Prepare Shift Handover', done: false },
];
