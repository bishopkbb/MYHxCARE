/**
 * Mock fixtures for the patient registration dashboard.
 * Swap out by pointing hooks to real endpoints in Phase 6.
 */

import {
  CalendarClock,
  GraduationCap,
  Hourglass,
  Info,
  RefreshCw,
  ShieldCheck,
  Siren,
  Sparkles,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type RegistrationStat = {
  id: string;
  label: string;
  value: number;
  trendPercent: number;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
  sparkline: number[];
};

export const REGISTRATION_STATS: RegistrationStat[] = [
  {
    id: 'registered-today',
    label: 'Patients Registered Today',
    value: 68,
    trendPercent: 12,
    icon: Users,
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
    sparkline: [40, 44, 42, 50, 55, 60, 68],
  },
  {
    id: 'new-patients',
    label: 'New Patients',
    value: 24,
    trendPercent: 18,
    icon: UserPlus,
    accent: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
    sparkline: [12, 14, 15, 18, 20, 21, 24],
  },
  {
    id: 'returning-patients',
    label: 'Returning Patients',
    value: 44,
    trendPercent: 8,
    icon: RefreshCw,
    accent: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    sparkline: [30, 33, 35, 34, 38, 40, 44],
  },
  {
    id: 'waiting-checkin',
    label: 'Patients Waiting for Check-in',
    value: 15,
    trendPercent: -5,
    icon: Hourglass,
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
    sparkline: [20, 19, 22, 18, 17, 16, 15],
  },
  {
    id: 'appointments-today',
    label: "Today's Appointments",
    value: 52,
    trendPercent: 10,
    icon: CalendarClock,
    accent: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
    sparkline: [38, 41, 45, 43, 47, 49, 52],
  },
  {
    id: 'emergency-registrations',
    label: 'Emergency Registrations',
    value: 5,
    trendPercent: 25,
    icon: Siren,
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.12)',
    sparkline: [2, 3, 2, 4, 3, 4, 5],
  },
];

export type TodayAppointment = {
  id: string;
  time: string;
  patient: string;
  appointmentWith: string;
  status: 'Checked-in' | 'Scheduled' | 'Waiting';
};

export const TODAY_APPOINTMENTS: TodayAppointment[] = [
  {
    id: 'apt-1',
    time: '09:00 AM',
    patient: 'Chinedu Agbasi',
    appointmentWith: 'Dr. Jane Ezeonu (GP)',
    status: 'Checked-in',
  },
  {
    id: 'apt-2',
    time: '10:00 AM',
    patient: 'Amaka Nwosu',
    appointmentWith: 'Dr. Michael Obi (Surgeon)',
    status: 'Scheduled',
  },
  {
    id: 'apt-3',
    time: '11:00 AM',
    patient: 'Emeka Okafor',
    appointmentWith: 'Dr. Ngozi Okafor (Peds)',
    status: 'Waiting',
  },
  {
    id: 'apt-4',
    time: '01:00 PM',
    patient: 'Ibrahim Musa',
    appointmentWith: 'Dr. Ada Chukwu (GP)',
    status: 'Scheduled',
  },
  {
    id: 'apt-5',
    time: '02:00 PM',
    patient: 'Ngozi Eze',
    appointmentWith: 'Dr. Chinedu A. (Cardio)',
    status: 'Waiting',
  },
];

export type RecentRegistration = {
  id: string;
  initials: string;
  avatarBg: string;
  name: string;
  mrn: string;
  time: string;
  day: string;
};

export const RECENT_REGISTRATIONS: RecentRegistration[] = [
  {
    id: 'reg-1',
    initials: 'UC',
    avatarBg: '#3B82F6',
    name: 'Uchenna Collins',
    mrn: 'MRN-2026-00678',
    time: '10:35 AM',
    day: 'Today',
  },
  {
    id: 'reg-2',
    initials: 'DO',
    avatarBg: '#F59E0B',
    name: 'David Osei',
    mrn: 'MRN-2026-00677',
    time: '10:20 AM',
    day: 'Today',
  },
  {
    id: 'reg-3',
    initials: 'FA',
    avatarBg: '#22C55E',
    name: 'Fatima Kabir',
    mrn: 'MRN-2026-00676',
    time: '10:10 AM',
    day: 'Today',
  },
  {
    id: 'reg-4',
    initials: 'AN',
    avatarBg: '#8B5CF6',
    name: 'Amaka Nwosu',
    mrn: 'MRN-2026-00675',
    time: '09:55 AM',
    day: 'Today',
  },
  {
    id: 'reg-5',
    initials: 'BA',
    avatarBg: '#EC4899',
    name: 'Babatunde Alade',
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
