/**
 * Mock fixtures for the nurse-scoped Notifications screen — clinical and
 * ward-operational alerts (critical results, medication due, patient
 * assignment, vitals, care plans, discharge, handover) rather than the
 * administrative alerts Registration/Medical Records see (see
 * staffNotificationFixtures.ts for that).
 * Swap out by pointing hooks to a real notifications endpoint/WebSocket in
 * Phase 6.
 */

import {
  ArrowLeftRight,
  ClipboardCheck,
  FlaskConical,
  HeartPulse,
  LogOut,
  Megaphone,
  Pill,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { WARDS } from '@/features/nursing/__mocks__/wardCensusFixtures';

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}
function hoursAgo(hrs: number): string {
  return minutesAgo(hrs * 60);
}

export type NurseNotificationCategory =
  | 'Critical Lab Result'
  | 'Medication Due'
  | 'Patient Assigned'
  | 'Vitals Alert'
  | 'Care Plan Update'
  | 'Discharge Ready'
  | 'Shift Handover Reminder'
  | 'System Announcement';

export const NOTIFICATION_CATEGORIES: NurseNotificationCategory[] = [
  'Critical Lab Result',
  'Medication Due',
  'Patient Assigned',
  'Vitals Alert',
  'Care Plan Update',
  'Discharge Ready',
  'Shift Handover Reminder',
  'System Announcement',
];

export const CATEGORY_CFG: Record<
  NurseNotificationCategory,
  { icon: LucideIcon; color: string; bg: string; route: string }
> = {
  'Critical Lab Result': {
    icon: FlaskConical,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    route: ROUTES.nurseLaboratory,
  },
  'Medication Due': {
    icon: Pill,
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.12)',
    route: ROUTES.nurseMedicationAdministration,
  },
  'Patient Assigned': {
    icon: UserPlus,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
    route: ROUTES.nurseMyPatients,
  },
  'Vitals Alert': {
    icon: HeartPulse,
    color: '#F97316',
    bg: 'rgba(249,115,22,0.12)',
    route: ROUTES.nurseVitalSigns,
  },
  'Care Plan Update': {
    icon: ClipboardCheck,
    color: '#0891B2',
    bg: 'rgba(8,145,178,0.12)',
    route: ROUTES.nurseCarePlans,
  },
  'Discharge Ready': {
    icon: LogOut,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.12)',
    route: ROUTES.nurseDischarges,
  },
  'Shift Handover Reminder': {
    icon: ArrowLeftRight,
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.12)',
    route: ROUTES.nurseShiftHandover,
  },
  'System Announcement': {
    icon: Megaphone,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
    route: ROUTES.nurseAnnouncements,
  },
};

export type NotificationPriority = 'Normal' | 'High' | 'Critical';

export const PRIORITY_OPTIONS: { value: NotificationPriority; label: string }[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

const WARD_COLORS = ['#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6'];

export const WARD_CFG: Record<string, { color: string; border: string; bg: string }> =
  Object.fromEntries(
    WARDS.map((w, i) => {
      const color = WARD_COLORS[i % WARD_COLORS.length]!;
      return [w.name, { color, border: `${color}4D`, bg: `${color}0F` }];
    }),
  );

export type NurseNotification = {
  id: string;
  category: NurseNotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  patientName?: string;
  mrn?: string;
  ward: string;
};

export const NURSE_NOTIFICATIONS: NurseNotification[] = [
  {
    id: 'nn-01',
    category: 'Critical Lab Result',
    priority: 'Critical',
    title: 'Critical Lab Result',
    body: 'Blessing John — Blood Culture: Critical. Immediate review required.',
    timestamp: minutesAgo(4),
    read: false,
    patientName: 'Blessing John',
    mrn: 'MRN-2026-00812',
    ward: 'Female Ward',
  },
  {
    id: 'nn-02',
    category: 'Medication Due',
    priority: 'High',
    title: 'Medication Due',
    body: 'Ceftriaxone 1g (IV) due for Maryam Usman at 07:00 PM.',
    timestamp: minutesAgo(20),
    read: false,
    patientName: 'Maryam Usman',
    mrn: 'MRN-2026-00765',
    ward: 'Female Ward',
  },
  {
    id: 'nn-03',
    category: 'Patient Assigned',
    priority: 'Normal',
    title: 'Patient Assigned',
    body: 'You have been assigned to Daniel Eze (Pneumonia) on Male Ward, Bed 8.',
    timestamp: hoursAgo(1),
    read: false,
    patientName: 'Daniel Eze',
    mrn: 'MRN-2026-00187',
    ward: 'Male Ward',
  },
  {
    id: 'nn-04',
    category: 'Vitals Alert',
    priority: 'High',
    title: 'Vitals Alert',
    body: 'Amina Yusuf — BP 160/95, HR 104. Outside normal range.',
    timestamp: hoursAgo(1),
    read: false,
    patientName: 'Amina Yusuf',
    mrn: 'MRN-2026-01544',
    ward: 'Female Ward',
  },
  {
    id: 'nn-05',
    category: 'Care Plan Update',
    priority: 'Normal',
    title: 'Care Plan Update',
    body: "Dr. Onyedika Umeh updated Maryam Usman's care plan — Infection Prevention marked complete.",
    timestamp: hoursAgo(2),
    read: false,
    patientName: 'Maryam Usman',
    mrn: 'MRN-2026-00765',
    ward: 'Female Ward',
  },
  {
    id: 'nn-06',
    category: 'Discharge Ready',
    priority: 'Normal',
    title: 'Discharge Ready',
    body: 'Grace Adebayo has been cleared for discharge by Dr. Onyedika Umeh.',
    timestamp: hoursAgo(2),
    read: false,
    patientName: 'Grace Adebayo',
    mrn: 'MRN-2026-00421',
    ward: 'Female Ward',
  },
  {
    id: 'nn-07',
    category: 'Shift Handover Reminder',
    priority: 'Normal',
    title: 'Shift Handover Reminder',
    body: 'Day shift handover for Female Medical Ward begins at 06:30 PM.',
    timestamp: hoursAgo(3),
    read: false,
    ward: 'Female Ward',
  },
  {
    id: 'nn-08',
    category: 'System Announcement',
    priority: 'Normal',
    title: 'System Announcement',
    body: 'Scheduled system maintenance tonight from 11:00 PM to 1:00 AM.',
    timestamp: hoursAgo(3),
    read: false,
    ward: 'Administration',
  },
  {
    id: 'nn-09',
    category: 'Critical Lab Result',
    priority: 'Critical',
    title: 'Critical Lab Result',
    body: 'Rukayya Musa — Electrolytes (U&E): Critical potassium level.',
    timestamp: hoursAgo(4),
    read: true,
    patientName: 'Rukayya Musa',
    mrn: 'MRN-2024-00987',
    ward: 'Male Ward',
  },
  {
    id: 'nn-10',
    category: 'Medication Due',
    priority: 'Normal',
    title: 'Medication Due',
    body: 'Metformin 500mg (PO) due for James Daniel at 07:30 PM.',
    timestamp: hoursAgo(4),
    read: true,
    patientName: 'James Daniel',
    mrn: 'MRN-2026-00932',
    ward: 'Male Ward',
  },
  {
    id: 'nn-11',
    category: 'Patient Assigned',
    priority: 'Normal',
    title: 'Patient Assigned',
    body: 'You have been assigned to Ifeanyi Nwosu (Typhoid Fever) on Male Ward, Bed 5.',
    timestamp: hoursAgo(5),
    read: true,
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    ward: 'Male Ward',
  },
  {
    id: 'nn-12',
    category: 'Vitals Alert',
    priority: 'Normal',
    title: 'Vitals Alert',
    body: 'Tunde Oladipo — Temperature trending down, now within normal range.',
    timestamp: hoursAgo(6),
    read: true,
    patientName: 'Tunde Oladipo',
    mrn: 'MRN-2024-00876',
    ward: 'Male Ward',
  },
  {
    id: 'nn-13',
    category: 'Discharge Ready',
    priority: 'Normal',
    title: 'Discharge Ready',
    body: 'Peter Obi has been cleared for discharge by Dr. Samuel A.',
    timestamp: hoursAgo(7),
    read: true,
    patientName: 'Peter Obi',
    mrn: 'MRN-2026-00932',
    ward: 'Male Ward',
  },
  {
    id: 'nn-14',
    category: 'Care Plan Update',
    priority: 'Normal',
    title: 'Care Plan Update',
    body: "Dr. Jane Ezeonu updated Amina Yusuf's care plan — Fluid Restriction added.",
    timestamp: hoursAgo(8),
    read: true,
    patientName: 'Amina Yusuf',
    mrn: 'MRN-2026-01544',
    ward: 'Female Ward',
  },
  {
    id: 'nn-15',
    category: 'Shift Handover Reminder',
    priority: 'Normal',
    title: 'Shift Handover Reminder',
    body: 'Night shift handover for Male Ward completed by outgoing team.',
    timestamp: hoursAgo(14),
    read: true,
    ward: 'Male Ward',
  },
  {
    id: 'nn-16',
    category: 'System Announcement',
    priority: 'Normal',
    title: 'System Announcement',
    body: 'New infection-control protocol published — review before your next shift.',
    timestamp: hoursAgo(20),
    read: true,
    ward: 'Administration',
  },
];
