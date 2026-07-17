/**
 * Mock fixtures for the medical records dashboard.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import {
  Archive,
  ClipboardList,
  Files,
  GraduationCap,
  History,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  type LucideIcon,
} from 'lucide-react';

export type MedicalRecordsStat = {
  id: string;
  label: string;
  value: number;
  trendPercent: number;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  sparkline: number[];
};

export const MEDICAL_RECORDS_STATS: MedicalRecordsStat[] = [
  {
    id: 'records-retrieved',
    label: 'Records Retrieved Today',
    value: 31,
    trendPercent: 6,
    icon: Search,
    accent: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    sparkline: [22, 24, 26, 25, 28, 29, 31],
  },
  {
    id: 'archived-records',
    label: 'Archived Records',
    value: 12,
    trendPercent: -3,
    icon: Archive,
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
    sparkline: [16, 15, 14, 15, 13, 13, 12],
  },
  {
    id: 'pending-requests',
    label: 'Pending Record Requests',
    value: 8,
    trendPercent: 15,
    icon: ClipboardList,
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
    sparkline: [4, 5, 6, 5, 7, 6, 8],
  },
  {
    id: 'documents-uploaded',
    label: 'Documents Uploaded Today',
    value: 19,
    trendPercent: 15,
    icon: Upload,
    accent: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
    sparkline: [10, 12, 13, 14, 16, 17, 19],
  },
  {
    id: 'clinical-documents-week',
    label: 'Clinical Documents This Week',
    value: 214,
    trendPercent: 9,
    icon: Files,
    accent: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    sparkline: [160, 172, 180, 188, 195, 204, 214],
  },
  {
    id: 'visit-entries-today',
    label: "Today's Visit Entries",
    value: 47,
    trendPercent: 9,
    icon: History,
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
    sparkline: [32, 35, 38, 36, 41, 43, 47],
  },
];

export type RecordRequestStatus = 'Pending' | 'In Progress' | 'Fulfilled';

export type RecentRecordRequest = {
  id: string;
  requestedBy: string;
  patient: string;
  mrn: string;
  status: RecordRequestStatus;
  time: string;
};

export const RECENT_RECORD_REQUESTS: RecentRecordRequest[] = [
  {
    id: 'rr-1',
    requestedBy: 'Dr. Jane Ezeonu',
    patient: 'Chinedu Agbasi',
    mrn: 'MRN-2026-00678',
    status: 'Pending',
    time: '09:15 AM',
  },
  {
    id: 'rr-2',
    requestedBy: 'Dr. Michael Obi',
    patient: 'Amaka Nwosu',
    mrn: 'MRN-2026-00675',
    status: 'In Progress',
    time: '09:40 AM',
  },
  {
    id: 'rr-3',
    requestedBy: 'NHIA Insurance',
    patient: 'David Osei',
    mrn: 'MRN-2026-00677',
    status: 'Fulfilled',
    time: '10:05 AM',
  },
  {
    id: 'rr-4',
    requestedBy: 'Dr. Ngozi Okafor',
    patient: 'Fatima Kabir',
    mrn: 'MRN-2026-00676',
    status: 'Pending',
    time: '10:20 AM',
  },
  {
    id: 'rr-5',
    requestedBy: 'Dr. Ada Chukwu',
    patient: 'Babatunde Alade',
    mrn: 'MRN-2026-00674',
    status: 'In Progress',
    time: '10:45 AM',
  },
];

export type RetrievedRecord = {
  id: string;
  initials: string;
  avatarBg: string;
  patient: string;
  mrn: string;
  time: string;
  day: string;
};

export const RECENTLY_RETRIEVED_RECORDS: RetrievedRecord[] = [
  {
    id: 'rt-1',
    initials: 'UC',
    avatarBg: '#3B82F6',
    patient: 'Uchenna Collins',
    mrn: 'MRN-2026-00678',
    time: '10:35 AM',
    day: 'Today',
  },
  {
    id: 'rt-2',
    initials: 'DO',
    avatarBg: '#F59E0B',
    patient: 'David Osei',
    mrn: 'MRN-2026-00677',
    time: '10:20 AM',
    day: 'Today',
  },
  {
    id: 'rt-3',
    initials: 'FA',
    avatarBg: '#22C55E',
    patient: 'Fatima Kabir',
    mrn: 'MRN-2026-00676',
    time: '10:10 AM',
    day: 'Today',
  },
  {
    id: 'rt-4',
    initials: 'AN',
    avatarBg: '#8B5CF6',
    patient: 'Amaka Nwosu',
    mrn: 'MRN-2026-00675',
    time: '09:55 AM',
    day: 'Today',
  },
  {
    id: 'rt-5',
    initials: 'BA',
    avatarBg: '#EC4899',
    patient: 'Babatunde Alade',
    mrn: 'MRN-2026-00674',
    time: '09:40 AM',
    day: 'Today',
  },
];

export type SystemAnnouncement = {
  id: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  date: string;
};

export const SYSTEM_ANNOUNCEMENTS: SystemAnnouncement[] = [
  {
    id: 'ann-1',
    icon: Info,
    iconBg: 'rgba(59,130,246,0.12)',
    iconColor: '#3B82F6',
    title: 'System Maintenance Notice',
    description: 'System maintenance scheduled for Jul 20, 2026 from 12:00 AM to 4:00 AM.',
    date: 'Jul 16, 2026',
  },
  {
    id: 'ann-2',
    icon: ShieldCheck,
    iconBg: 'rgba(34,197,94,0.12)',
    iconColor: '#22C55E',
    title: 'Data Backup Completed',
    description: 'Daily data backup completed successfully.',
    date: 'Jul 16, 2026',
  },
  {
    id: 'ann-3',
    icon: Sparkles,
    iconBg: 'rgba(139,92,246,0.12)',
    iconColor: '#8B5CF6',
    title: 'New Feature Update',
    description: 'Document upload has been enhanced with faster scanning.',
    date: 'Jul 15, 2026',
  },
  {
    id: 'ann-4',
    icon: GraduationCap,
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#F59E0B',
    title: 'Training Reminder',
    description: 'Weekly staff training holds every Friday at 2:00 PM in the training room.',
    date: 'Jul 15, 2026',
  },
];
