/**
 * Mock fixtures for Departments (`/admin/departments`), the third screen
 * in the Staff Management / Roles & Permissions / Departments trio, all
 * keyed to the same 8 `OrganizationalDepartment` values. Each department's
 * head is a real `StaffMember.staffId` from `staffDirectoryFixtures.ts`,
 * looked up live at render time (not a separately fabricated name), picked
 * favoring the most senior real title per department among the curated
 * entries (e.g. Matron over the two more junior curated Nursing/Wards
 * entries). Staff counts are computed live from `useStaffDirectory()`
 * elsewhere, not stored here.
 *
 * Status/operating-hours/contact info have no existing real backing
 * anywhere in the codebase (no ward-census or facilities data feeds these
 * org units generically), that part is honest configuration data, not a
 * fabricated live signal. Swap out by pointing hooks to a real
 * departments endpoint in Phase 6.
 */

import {
  Beaker,
  BedDouble,
  FolderOpen,
  Pill,
  Settings,
  Siren,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';
import { ORGANIZATIONAL_DEPARTMENTS } from '@/constants/organizationalDepartments';
import type { StaffMember } from '@/features/administration/__mocks__/staffDirectoryFixtures';

export type DepartmentStatus = 'Operational' | 'Busy' | 'Inactive';

export const STATUS_OPTIONS: { value: DepartmentStatus; label: string }[] = [
  { value: 'Operational', label: 'Operational' },
  { value: 'Busy', label: 'Busy' },
  { value: 'Inactive', label: 'Inactive' },
];

export type OperatingHours = {
  is24Hours: boolean;
  weekdayRange: string | null;
  saturdayRange: string | null;
} | null;

export type DepartmentRecord = {
  id: OrganizationalDepartment;
  icon: LucideIcon;
  description: string;
  /** Real StaffMember.staffId, looked up live against useStaffDirectory(),
   * never a separately fabricated name. */
  headStaffId: string;
  contactPhone: string;
  contactEmail: string;
  status: DepartmentStatus;
  operatingHours: OperatingHours;
};

export const DEPARTMENT_ICONS: Record<OrganizationalDepartment, LucideIcon> = {
  'Clinical / Consultation': Stethoscope,
  'Nursing / Wards': BedDouble,
  Pharmacy: Pill,
  Laboratory: Beaker,
  Emergency: Siren,
  'Accounts & Billing': Wallet,
  Records: FolderOpen,
  Administration: Settings,
};

export const DEPARTMENT_RECORDS: DepartmentRecord[] = [
  {
    id: 'Clinical / Consultation',
    icon: DEPARTMENT_ICONS['Clinical / Consultation'],
    description: 'Patient consultation and treatment',
    headStaffId: 'STF-0001',
    contactPhone: '0803 123 4567',
    contactEmail: 'clinical@unizikmedical.edu.ng',
    status: 'Operational',
    operatingHours: {
      is24Hours: false,
      weekdayRange: '8:00 AM - 6:00 PM',
      saturdayRange: '8:00 AM - 2:00 PM',
    },
  },
  {
    id: 'Nursing / Wards',
    icon: DEPARTMENT_ICONS['Nursing / Wards'],
    description: 'Patient care and ward management',
    // Matron, the most senior real title among the curated nursing entries.
    headStaffId: 'STF-0012',
    contactPhone: '0803 234 5678',
    contactEmail: 'nursing@unizikmedical.edu.ng',
    status: 'Operational',
    operatingHours: { is24Hours: true, weekdayRange: null, saturdayRange: null },
  },
  {
    id: 'Pharmacy',
    icon: DEPARTMENT_ICONS.Pharmacy,
    description: 'Medication management and dispensing',
    headStaffId: 'STF-0003',
    contactPhone: '0803 345 6789',
    contactEmail: 'pharmacy@unizikmedical.edu.ng',
    status: 'Operational',
    operatingHours: {
      is24Hours: false,
      weekdayRange: '8:00 AM - 6:00 PM',
      saturdayRange: '8:00 AM - 2:00 PM',
    },
  },
  {
    id: 'Laboratory',
    icon: DEPARTMENT_ICONS.Laboratory,
    description: 'Diagnostic testing and analysis',
    headStaffId: 'STF-0006',
    contactPhone: '0803 456 7890',
    contactEmail: 'lab@unizikmedical.edu.ng',
    status: 'Operational',
    operatingHours: {
      is24Hours: false,
      weekdayRange: '7:00 AM - 6:00 PM',
      saturdayRange: '8:00 AM - 1:00 PM',
    },
  },
  {
    id: 'Emergency',
    icon: DEPARTMENT_ICONS.Emergency,
    description: 'Emergency care and triage',
    headStaffId: 'STF-0005',
    contactPhone: '0803 567 8901',
    contactEmail: 'emergency@unizikmedical.edu.ng',
    status: 'Busy',
    operatingHours: { is24Hours: true, weekdayRange: null, saturdayRange: null },
  },
  {
    id: 'Accounts & Billing',
    icon: DEPARTMENT_ICONS['Accounts & Billing'],
    description: 'Finance and billing operations',
    headStaffId: 'STF-0007',
    contactPhone: '0803 678 9012',
    contactEmail: 'accounts@unizikmedical.edu.ng',
    status: 'Operational',
    operatingHours: {
      is24Hours: false,
      weekdayRange: '8:00 AM - 5:00 PM',
      saturdayRange: '8:00 AM - 1:00 PM',
    },
  },
  {
    id: 'Records',
    icon: DEPARTMENT_ICONS.Records,
    description: 'Medical records management',
    headStaffId: 'STF-0004',
    contactPhone: '0803 789 0123',
    contactEmail: 'records@unizikmedical.edu.ng',
    status: 'Operational',
    operatingHours: {
      is24Hours: false,
      weekdayRange: '8:00 AM - 5:00 PM',
      saturdayRange: null,
    },
  },
  {
    id: 'Administration',
    icon: DEPARTMENT_ICONS.Administration,
    description: 'General administration and support',
    headStaffId: 'STF-0010',
    contactPhone: '0803 890 1234',
    contactEmail: 'admin@unizikmedical.edu.ng',
    status: 'Inactive',
    operatingHours: null,
  },
];

export type DepartmentStats = {
  total: number;
  headsAssigned: number;
  totalStaff: number;
  operational: number;
  inactive: number;
};

export function computeDepartmentStats(
  departments: DepartmentRecord[],
  staffRoster: StaffMember[],
): DepartmentStats {
  return {
    total: departments.length,
    headsAssigned: departments.filter((d) => Boolean(d.headStaffId)).length,
    totalStaff: staffRoster.length,
    operational: departments.filter((d) => d.status !== 'Inactive').length,
    inactive: departments.filter((d) => d.status === 'Inactive').length,
  };
}

export function formatOperatingHours(hours: OperatingHours): string {
  if (!hours) return 'Not set';
  if (hours.is24Hours) return 'Mon - Sun: 24 Hours';
  const parts = [`Mon - Fri: ${hours.weekdayRange ?? 'Not set'}`];
  if (hours.saturdayRange) parts.push(`Sat: ${hours.saturdayRange}`);
  return parts.join(' | ');
}

export function staffCountFor(dept: OrganizationalDepartment, staffRoster: StaffMember[]): number {
  return staffRoster.filter((s) => s.department === dept).length;
}

export const ALL_DEPARTMENTS = ORGANIZATIONAL_DEPARTMENTS;
