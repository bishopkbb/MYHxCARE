/**
 * Mock fixtures for the Notifications screen used by non-clinical
 * workspaces (Registration, Medical Records) — operational/administrative
 * alerts (registrations, queue, consent, insurance, records requests)
 * rather than the clinical workspace's patient-context alerts (see
 * notificationFixtures.ts / the /notifications page for that).
 * Swap out by pointing hooks to a real notifications endpoint/WebSocket in
 * Phase 6.
 */

import {
  AlertTriangle,
  Calendar,
  FileText,
  FolderOpen,
  Megaphone,
  ShieldCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}
function hoursAgo(hrs: number): string {
  return minutesAgo(hrs * 60);
}

export type NotificationCategory =
  | 'New Registration'
  | 'Appointment Reminder'
  | 'Queue Update'
  | 'Record Request'
  | 'Consent Pending'
  | 'Insurance Verification'
  | 'Emergency Alert'
  | 'System Announcement';

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'New Registration',
  'Appointment Reminder',
  'Queue Update',
  'Record Request',
  'Consent Pending',
  'Insurance Verification',
  'Emergency Alert',
  'System Announcement',
];

export const CATEGORY_CFG: Record<
  NotificationCategory,
  { icon: LucideIcon; color: string; bg: string }
> = {
  'New Registration': { icon: UserPlus, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  'Appointment Reminder': { icon: Calendar, color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  'Queue Update': { icon: Users, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  'Record Request': { icon: FolderOpen, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  'Consent Pending': { icon: FileText, color: '#EAB308', bg: 'rgba(234,179,8,0.12)' },
  'Insurance Verification': { icon: ShieldCheck, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  'Emergency Alert': { icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  'System Announcement': { icon: Megaphone, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
};

export type NotificationPriority = 'Normal' | 'High' | 'Critical';

export const PRIORITY_OPTIONS: { value: NotificationPriority; label: string }[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

export const DEPARTMENT_CFG: Record<string, { color: string; border: string; bg: string }> = {
  Registration: { color: '#3B82F6', border: 'rgba(59,130,246,0.30)', bg: 'rgba(59,130,246,0.06)' },
  'Outpatient Clinic': {
    color: '#22C55E',
    border: 'rgba(34,197,94,0.30)',
    bg: 'rgba(34,197,94,0.06)',
  },
  'Medical Records': {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.30)',
    bg: 'rgba(139,92,246,0.06)',
  },
  Surgery: { color: '#F59E0B', border: 'rgba(245,158,11,0.30)', bg: 'rgba(245,158,11,0.06)' },
  'Insurance Unit': {
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.30)',
    bg: 'rgba(0,180,216,0.06)',
  },
  Emergency: { color: '#EF4444', border: 'rgba(239,68,68,0.30)', bg: 'rgba(239,68,68,0.06)' },
  Administration: {
    color: '#4A7080',
    border: 'rgba(74,112,128,0.30)',
    bg: 'rgba(74,112,128,0.06)',
  },
};

export type StaffNotification = {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  patientName?: string;
  mrn?: string;
  department: string;
};

export const STAFF_NOTIFICATIONS: StaffNotification[] = [
  {
    id: 'sn-01',
    category: 'New Registration',
    priority: 'Normal',
    title: 'New Registration',
    body: 'A new patient, Chidinma Okafor, has been registered.',
    timestamp: minutesAgo(3),
    read: false,
    patientName: 'Chidinma Okafor',
    mrn: 'MRN-2026-0148',
    department: 'Registration',
  },
  {
    id: 'sn-02',
    category: 'Appointment Reminder',
    priority: 'Normal',
    title: 'Appointment Reminder',
    body: 'Patient Maryam Usman has an appointment with Dr. Jane Ezeonu on Jul 1, 2026 at 09:00 AM.',
    timestamp: hoursAgo(1),
    read: false,
    patientName: 'Maryam Usman',
    mrn: 'MRN-2024-00765',
    department: 'Outpatient Clinic',
  },
  {
    id: 'sn-03',
    category: 'Queue Update',
    priority: 'Normal',
    title: 'Queue Update',
    body: 'New patient is next in queue at General Outpatient Clinic.',
    timestamp: hoursAgo(1),
    read: false,
    patientName: 'Ifeanyi Nwosu',
    mrn: 'MRN-2024-00987',
    department: 'Outpatient Clinic',
  },
  {
    id: 'sn-04',
    category: 'Record Request',
    priority: 'High',
    title: 'Record Request',
    body: 'Mary Uche requested access to patient records.',
    timestamp: hoursAgo(2),
    read: false,
    patientName: 'Grace Adebayo',
    mrn: 'MRN-2023-00421',
    department: 'Medical Records',
  },
  {
    id: 'sn-05',
    category: 'Consent Pending',
    priority: 'Normal',
    title: 'Consent Pending',
    body: 'Consent form for Surgery is pending signature.',
    timestamp: hoursAgo(2),
    read: false,
    patientName: 'Daniel Eze',
    mrn: 'MRN-2023-00187',
    department: 'Surgery',
  },
  {
    id: 'sn-06',
    category: 'Insurance Verification',
    priority: 'Normal',
    title: 'Insurance Verification',
    body: 'Insurance verification completed for patient Seyi Adewale.',
    timestamp: hoursAgo(3),
    read: false,
    patientName: 'Seyi Adewale',
    mrn: 'MRN-2023-00311',
    department: 'Insurance Unit',
  },
  {
    id: 'sn-07',
    category: 'Emergency Alert',
    priority: 'Critical',
    title: 'Emergency Alert',
    body: 'Emergency case admitted in Emergency Department.',
    timestamp: hoursAgo(3),
    read: false,
    department: 'Emergency',
  },
  {
    id: 'sn-08',
    category: 'System Announcement',
    priority: 'Normal',
    title: 'System Announcement',
    body: 'System maintenance scheduled tonight from 11:00 PM to 1:00 AM.',
    timestamp: hoursAgo(3),
    read: false,
    department: 'Administration',
  },
  {
    id: 'sn-09',
    category: 'New Registration',
    priority: 'Normal',
    title: 'New Registration',
    body: 'A new patient, Emeka Obi, has been registered.',
    timestamp: hoursAgo(4),
    read: true,
    patientName: 'Emeka Obi',
    mrn: 'MRN-2023-00543',
    department: 'Registration',
  },
  {
    id: 'sn-10',
    category: 'New Registration',
    priority: 'Normal',
    title: 'New Registration',
    body: 'A new patient, Halima Suleiman, has been registered.',
    timestamp: hoursAgo(5),
    read: true,
    patientName: 'Halima Suleiman',
    mrn: 'MRN-2026-00088',
    department: 'Registration',
  },
  {
    id: 'sn-11',
    category: 'Appointment Reminder',
    priority: 'Normal',
    title: 'Appointment Reminder',
    body: 'Patient Favour Bassey has an appointment with Dr. Onyedika Umeh on Jul 1, 2026 at 10:30 AM.',
    timestamp: hoursAgo(5),
    read: true,
    patientName: 'Favour Bassey',
    mrn: 'MRN-2024-01002',
    department: 'Outpatient Clinic',
  },
  {
    id: 'sn-12',
    category: 'Appointment Reminder',
    priority: 'Normal',
    title: 'Appointment Reminder',
    body: 'Patient Peter Achike has an appointment with Dr. Samuel A. on Jul 1, 2026 at 11:15 AM.',
    timestamp: hoursAgo(6),
    read: true,
    patientName: 'Peter Achike',
    mrn: 'MRN-2021-00276',
    department: 'Outpatient Clinic',
  },
  {
    id: 'sn-13',
    category: 'Appointment Reminder',
    priority: 'Normal',
    title: 'Appointment Reminder',
    body: 'Patient Ngozi Ibe has an appointment with Dr. Mary Uche on Jul 2, 2026 at 09:45 AM.',
    timestamp: hoursAgo(7),
    read: true,
    patientName: 'Ngozi Ibe',
    mrn: 'MRN-2025-00512',
    department: 'Outpatient Clinic',
  },
  {
    id: 'sn-14',
    category: 'Queue Update',
    priority: 'Normal',
    title: 'Queue Update',
    body: 'Patient called for consultation at Radiology.',
    timestamp: hoursAgo(8),
    read: true,
    patientName: 'Yusuf Aliyu',
    mrn: 'MRN-2026-00201',
    department: 'Outpatient Clinic',
  },
  {
    id: 'sn-15',
    category: 'Queue Update',
    priority: 'Normal',
    title: 'Queue Update',
    body: 'Queue reordered — emergency case prioritized at General Outpatient Clinic.',
    timestamp: hoursAgo(9),
    read: true,
    department: 'Outpatient Clinic',
  },
  {
    id: 'sn-16',
    category: 'Queue Update',
    priority: 'Normal',
    title: 'Queue Update',
    body: 'Patient Margaret Okoro is next in queue at Laboratory.',
    timestamp: hoursAgo(10),
    read: true,
    patientName: 'Margaret Okoro',
    mrn: 'MRN-2022-00119',
    department: 'Outpatient Clinic',
  },
  {
    id: 'sn-17',
    category: 'Record Request',
    priority: 'Normal',
    title: 'Record Request',
    body: 'Dr. Samuel A. requested visit history for Chidi Nwankwo.',
    timestamp: hoursAgo(11),
    read: true,
    patientName: 'Chidi Nwankwo',
    mrn: 'MRN-2024-00812',
    department: 'Medical Records',
  },
  {
    id: 'sn-18',
    category: 'Record Request',
    priority: 'Normal',
    title: 'Record Request',
    body: 'NHIA Insurance requested claim documentation for Patience Effiong.',
    timestamp: hoursAgo(12),
    read: true,
    patientName: 'Patience Effiong',
    mrn: 'MRN-2023-00344',
    department: 'Medical Records',
  },
  {
    id: 'sn-19',
    category: 'Consent Pending',
    priority: 'Normal',
    title: 'Consent Pending',
    body: 'Consent form for Radiology is pending signature.',
    timestamp: hoursAgo(13),
    read: true,
    patientName: 'Rita Nwachukwu',
    mrn: 'MRN-2020-00056',
    department: 'Surgery',
  },
  {
    id: 'sn-20',
    category: 'Consent Pending',
    priority: 'Normal',
    title: 'Consent Pending',
    body: 'Consent form for Dental Procedure is pending signature.',
    timestamp: hoursAgo(15),
    read: true,
    patientName: 'Godwin Etim',
    mrn: 'MRN-2024-00677',
    department: 'Surgery',
  },
  {
    id: 'sn-21',
    category: 'Insurance Verification',
    priority: 'Normal',
    title: 'Insurance Verification',
    body: 'Insurance verification pending for patient Comfort Idika.',
    timestamp: hoursAgo(18),
    read: true,
    patientName: 'Comfort Idika',
    mrn: 'MRN-2026-00088',
    department: 'Insurance Unit',
  },
  {
    id: 'sn-22',
    category: 'System Announcement',
    priority: 'Normal',
    title: 'System Announcement',
    body: 'New feature: Document Upload now supports scanned TIFF files.',
    timestamp: hoursAgo(20),
    read: true,
    department: 'Administration',
  },
  {
    id: 'sn-23',
    category: 'System Announcement',
    priority: 'Normal',
    title: 'System Announcement',
    body: 'Weekly staff training holds every Friday at 2:00 PM in the training room.',
    timestamp: hoursAgo(22),
    read: true,
    department: 'Administration',
  },
  {
    id: 'sn-24',
    category: 'Emergency Alert',
    priority: 'Critical',
    title: 'Emergency Alert',
    body: 'Code Red activated in Ward B. All available staff report immediately.',
    timestamp: hoursAgo(24),
    read: true,
    department: 'Emergency',
  },
  {
    id: 'sn-25',
    category: 'System Announcement',
    priority: 'Normal',
    title: 'System Announcement',
    body: 'Data backup completed successfully.',
    timestamp: hoursAgo(26),
    read: true,
    department: 'Administration',
  },
  {
    id: 'sn-26',
    category: 'System Announcement',
    priority: 'Normal',
    title: 'System Announcement',
    body: 'Scheduled downtime this weekend for server upgrades.',
    timestamp: hoursAgo(30),
    read: true,
    department: 'Administration',
  },
  {
    id: 'sn-27',
    category: 'System Announcement',
    priority: 'Normal',
    title: 'System Announcement',
    body: 'New records retention policy takes effect next month.',
    timestamp: hoursAgo(34),
    read: true,
    department: 'Administration',
  },
];
