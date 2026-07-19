/**
 * Mock fixtures for the Patient Statistics screen.
 * Swap out by pointing hooks to a real analytics endpoint in Phase 6.
 */

import {
  Building2,
  Clock,
  GraduationCap,
  RefreshCcw,
  Stethoscope,
  User,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type TrendDirection = 'up' | 'down';

export type StatCard = {
  id: string;
  label: string;
  value: string;
  subLabel: string;
  direction?: TrendDirection;
  icon: LucideIcon;
  color: string;
  iconBg: string;
};

export const PATIENT_STATS: StatCard[] = [
  {
    id: 'total',
    label: 'Total Patients',
    value: '12,458',
    subLabel: '12.4% from last month',
    direction: 'up',
    icon: Users,
    color: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
  },
  {
    id: 'active',
    label: 'Active Patients',
    value: '9,842',
    subLabel: '10.7% from last month',
    direction: 'up',
    icon: Users,
    color: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
  },
  {
    id: 'male',
    label: 'Male',
    value: '5,846',
    subLabel: '46.9% of total',
    icon: User,
    color: '#00B4D8',
    iconBg: 'rgba(0,180,216,0.12)',
  },
  {
    id: 'female',
    label: 'Female',
    value: '6,612',
    subLabel: '53.1% of total',
    icon: UserRound,
    color: '#EC4899',
    iconBg: 'rgba(236,72,153,0.12)',
  },
  {
    id: 'students',
    label: 'Students',
    value: '10,352',
    subLabel: '83.1% of total',
    icon: GraduationCap,
    color: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
  },
  {
    id: 'staff',
    label: 'Staff',
    value: '2,106',
    subLabel: '16.9% of total',
    icon: User,
    color: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
  },
];

export type DistributionSlice = { label: string; value: number; percent: number; color: string };

export const AGE_DISTRIBUTION: DistributionSlice[] = [
  { label: '0 - 12 Years', value: Math.round(12458 * 0.08), percent: 8, color: '#3B82F6' },
  { label: '13 - 18 Years', value: Math.round(12458 * 0.18), percent: 18, color: '#22C55E' },
  { label: '19 - 25 Years', value: Math.round(12458 * 0.4), percent: 40, color: '#8B5CF6' },
  { label: '26 - 35 Years', value: Math.round(12458 * 0.17), percent: 17, color: '#F59E0B' },
  { label: '36 - 50 Years', value: Math.round(12458 * 0.11), percent: 11, color: '#00B4D8' },
  { label: '51+ Years', value: Math.round(12458 * 0.06), percent: 6, color: '#EC4899' },
];

export const GENDER_DISTRIBUTION: DistributionSlice[] = [
  { label: 'Male', value: 5846, percent: 46.9, color: '#3B82F6' },
  { label: 'Female', value: 6612, percent: 53.1, color: '#EC4899' },
];

export const FACULTY_DISTRIBUTION_STUDENTS: DistributionSlice[] = [
  { label: 'Medicine', value: Math.round(10352 * 0.26), percent: 26, color: '#00B4D8' },
  { label: 'Engineering', value: Math.round(10352 * 0.21), percent: 21, color: '#3B82F6' },
  { label: 'Management Sci.', value: Math.round(10352 * 0.18), percent: 18, color: '#8B5CF6' },
  { label: 'Law', value: Math.round(10352 * 0.12), percent: 12, color: '#F59E0B' },
  { label: 'Education', value: Math.round(10352 * 0.1), percent: 10, color: '#EC4899' },
  { label: 'Basic Medical Sci.', value: Math.round(10352 * 0.07), percent: 7, color: '#22C55E' },
  { label: 'Other', value: Math.round(10352 * 0.06), percent: 6, color: '#8A98A3' },
];

export const VISIT_FREQUENCY: DistributionSlice[] = [
  { label: '1 Visit', value: 58, percent: 58, color: '#3B82F6' },
  { label: '2 - 3 Visits', value: 24, percent: 24, color: '#22C55E' },
  { label: '4 - 5 Visits', value: 10, percent: 10, color: '#8B5CF6' },
  { label: '6+ Visits', value: 8, percent: 8, color: '#F59E0B' },
];

export type LabeledBar = { label: string; value: number };

export const TOP_DIAGNOSES: LabeledBar[] = [
  { label: 'Malaria', value: 1245 },
  { label: 'Upper Respiratory Infection', value: 987 },
  { label: 'Typhoid Fever', value: 654 },
  { label: 'Gastroenteritis', value: 532 },
  { label: 'Hypertension', value: 421 },
  { label: 'Skin Infection', value: 387 },
  { label: 'Others', value: 2125 },
];

export type TrendPoint = { label: string; value: number };

export const MONTHLY_GROWTH: TrendPoint[] = [
  { label: 'Jan', value: 320 },
  { label: 'Feb', value: 890 },
  { label: 'Mar', value: 720 },
  { label: 'Apr', value: 1180 },
  { label: 'May', value: 1080 },
  { label: 'Jun', value: 1240 },
];

export type KeyInsight = {
  id: string;
  label: string;
  value: string;
  subLabel: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
  sparkline: number[];
};

export const KEY_INSIGHTS: KeyInsight[] = [
  {
    id: 'most-visited',
    label: 'Most Visited Department',
    value: 'General Outpatient',
    subLabel: '4,215 · 33.8% of total visits',
    icon: Building2,
    color: '#22C55E',
    iconBg: 'rgba(34,197,94,0.12)',
    sparkline: [20, 24, 22, 28, 30, 29, 34, 36, 33, 40, 42, 45],
  },
  {
    id: 'most-common-complaint',
    label: 'Most Common Complaint',
    value: 'Fever',
    subLabel: '2,348 · 18.8% of total complaints',
    icon: Stethoscope,
    color: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.12)',
    sparkline: [15, 18, 16, 20, 19, 22, 21, 24, 23, 26, 25, 28],
  },
  {
    id: 'repeat-visits',
    label: 'Repeat Visits',
    value: '3,265 Patients',
    subLabel: '26.2% of total patients',
    icon: RefreshCcw,
    color: '#8B5CF6',
    iconBg: 'rgba(139,92,246,0.12)',
    sparkline: [30, 28, 32, 31, 35, 34, 38, 37, 40, 39, 43, 45],
  },
  {
    id: 'avg-visits',
    label: 'Average Visits Per Student',
    value: '1.74 Visits',
    subLabel: '9.2% from last month',
    icon: User,
    color: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.12)',
    sparkline: [40, 44, 42, 50, 48, 55, 60, 58, 65, 70, 66, 74],
  },
  {
    id: 'peak-hours',
    label: 'Peak Clinic Hours',
    value: '10:00 AM – 12:00 PM',
    subLabel: 'Highest patient flow',
    icon: Clock,
    color: '#EC4899',
    iconBg: 'rgba(236,72,153,0.12)',
    sparkline: [12, 20, 35, 48, 42, 30, 22, 15, 18, 25, 20, 14],
  },
];

export const TOTAL_PATIENTS_DISPLAY = '12,458';
export const TOTAL_STUDENTS_DISPLAY = '10,352';
