/**
 * Mock fixture for the My Profile screen.
 * Swap out by pointing hooks to the real /users/me endpoint in Phase 6.
 *
 * Reuses the "Dr. Jane Ezeonu" identity already established as the
 * PRESCRIBING_DOCTOR in the prescriptions module, so the mock narrative
 * stays consistent across screens rather than introducing an unrelated name.
 */

import type { WorkspaceId } from '@/types/auth.types';

export type DoctorProfile = {
  initials: string;
  avatarBg: string;
  name: string;
  role: string;
  platform: string;
  licenseNo: string;
  facility: string;
  specialization: string;
  medicalCouncilNo: string;
  department: string;
  experience: string;
  phone: string;
  email: string;
};

export const MOCK_DOCTOR_PROFILE: DoctorProfile = {
  initials: 'JE',
  avatarBg: '#00B4D8',
  name: 'Dr. Jane Ezeonu',
  role: 'General Practitioner',
  platform: 'MyHxCare HMS',
  licenseNo: 'MD/2018/0042',
  facility: 'UniZik Medical Centre',
  specialization: 'General Practice & Family Medicine',
  medicalCouncilNo: 'MDCN/2020/0891',
  department: 'General Outpatient Department',
  experience: '6 years clinical practice',
  phone: '+234 803 000 1111',
  email: 'j.ezeonu@unizikmedical.ng',
};

// ─── Rich, workspace-aware "My Profile" schema ──────────────────────────────
// Powers the tabbed Profile screen (Overview / Personal / Professional /
// Change Password / Preferences). Identity fields that already exist on the
// real session (name, role, department, email) are read from useAuth() in
// the component so the page always matches what's shown in the sidebar/
// topbar for whichever demo account is logged in — this fixture only supplies
// the richer HR-style fields the User type doesn't carry (staff ID,
// qualification, ward/unit, shift, supervisor, recent activity, etc.).

export type RecentActivityItem = {
  id: string;
  icon: 'login' | 'note' | 'medication' | 'shift-start' | 'record' | 'checkin' | 'referral';
  title: string;
  timestampIso: string;
  category: string;
};

export type StaffProfile = {
  staffId: string;
  /** Default self-service phone number — seeds useContactDetails until the user edits it. */
  phone: string;
  employmentType: string;
  dateJoinedIso: string;
  onDutyStatus: 'On Duty' | 'Off Duty' | 'On Leave';
  personal: {
    dobIso: string;
    gender: string;
    address: string;
    emergencyContact: string;
    bloodGroup: string;
    maritalStatus: string;
  };
  professional: {
    unitLabel: string;
    unitValue: string;
    subUnitLabel: string;
    subUnitValue: string;
    qualification: string;
    licenseLabel: string;
    licenseValue: string;
    yearsOfExperience: string;
  };
  work: {
    currentShiftLabel: string;
    nextShiftLabel: string;
    reportingLocation: string;
    supervisor: string;
    daysOff: string;
    leaveBalance: string;
  };
  /** Right-side "Today" card on Overview. Omitted where no shift/roster concept applies yet. */
  todaySchedule: {
    shiftLabel: string;
    timeRange: string;
    locationLabel: string;
    locationValue: string;
  } | null;
  /** Nav label to resolve this workspace's schedule route via findWorkspaceRoute(). Null hides "View My Schedule". */
  scheduleNavLabel: string | null;
  lastLoginIso: string;
  recentActivity: RecentActivityItem[];
};

// Ward reused from nurseScheduleFixtures.MOCK_NURSE/MOCK_ACTIVE_SHIFT and
// staff ID reused from shiftHandoverFixtures.OUTGOING_NURSE — same nurse
// identity's static facts, not re-invented, so Profile agrees with My
// Schedule and Shift Handover for whichever nurse is logged in.
export const NURSE_STAFF_PROFILE: StaffProfile = {
  staffId: 'NUR-0248',
  phone: '+234 803 123 4567',
  employmentType: 'Full-Time',
  dateJoinedIso: '2022-03-15',
  onDutyStatus: 'On Duty',
  personal: {
    dobIso: '1994-08-22',
    gender: 'Female',
    address: '14 Amansea Road, Awka, Anambra State',
    emergencyContact: 'Ifeoma Eze (Sister) · +234 806 220 9931',
    bloodGroup: 'O+',
    maritalStatus: 'Single',
  },
  professional: {
    unitLabel: 'Ward',
    unitValue: 'Male Medical Ward',
    subUnitLabel: 'Unit / Bed Area',
    subUnitValue: 'Beds 1–18',
    qualification: 'BSc Nursing Science (BNSc)',
    licenseLabel: 'Professional License',
    licenseValue: 'NMCN/RN/2019/00482',
    yearsOfExperience: '5 years',
  },
  work: {
    currentShiftLabel: 'Morning Shift',
    nextShiftLabel: 'Afternoon Shift · Tue, Jul 1',
    reportingLocation: 'Male Medical Ward Nursing Station',
    supervisor: 'Matron Chioma Nnaji',
    daysOff: 'Wednesdays',
    leaveBalance: '12 days remaining',
  },
  todaySchedule: {
    shiftLabel: 'Morning Shift',
    timeRange: '07:00 – 15:00',
    locationLabel: 'Ward',
    locationValue: 'Male Medical Ward',
  },
  scheduleNavLabel: 'My Schedule',
  lastLoginIso: '2026-07-24T06:52:00+01:00',
  recentActivity: [
    {
      id: 'act-1',
      icon: 'login',
      title: 'Logged in',
      timestampIso: '2026-07-24T06:52:00+01:00',
      category: 'Account',
    },
    {
      id: 'act-2',
      icon: 'note',
      title: 'Updated nursing notes for bed 6',
      timestampIso: '2026-07-24T08:10:00+01:00',
      category: 'Documentation',
    },
    {
      id: 'act-3',
      icon: 'medication',
      title: 'Administered medication — Ceftriaxone 1g',
      timestampIso: '2026-07-24T09:05:00+01:00',
      category: 'Medication',
    },
    {
      id: 'act-4',
      icon: 'shift-start',
      title: 'Started Morning Shift',
      timestampIso: '2026-07-24T07:00:00+01:00',
      category: 'Shift',
    },
  ],
};

export const DOCTOR_STAFF_PROFILE: StaffProfile = {
  staffId: 'DOC-0091',
  phone: MOCK_DOCTOR_PROFILE.phone,
  employmentType: 'Full-Time',
  dateJoinedIso: '2019-09-01',
  onDutyStatus: 'On Duty',
  personal: {
    dobIso: '1988-11-04',
    gender: 'Female',
    address: '9 Regina Caeli Road, Awka, Anambra State',
    emergencyContact: 'Chuka Ezeonu (Spouse) · +234 802 441 7723',
    bloodGroup: 'A+',
    maritalStatus: 'Married',
  },
  professional: {
    unitLabel: 'Consulting Room',
    unitValue: 'OPD Room 4',
    subUnitLabel: 'Clinic',
    subUnitValue: 'General Outpatient Clinic',
    qualification: 'MBBS, MWACP',
    licenseLabel: 'Medical Council No.',
    licenseValue: MOCK_DOCTOR_PROFILE.medicalCouncilNo,
    yearsOfExperience: MOCK_DOCTOR_PROFILE.experience,
  },
  work: {
    currentShiftLabel: 'Morning Clinic',
    nextShiftLabel: 'Afternoon Ward Round',
    reportingLocation: 'General Outpatient Department',
    supervisor: 'Dr. Obiora Eze (HOD, Internal Medicine)',
    daysOff: 'Sundays',
    leaveBalance: '18 days remaining',
  },
  todaySchedule: {
    shiftLabel: 'Morning Clinic',
    timeRange: '08:00 – 14:00',
    locationLabel: 'Clinic',
    locationValue: 'OPD Room 4',
  },
  scheduleNavLabel: 'My Schedule',
  lastLoginIso: '2026-07-24T07:40:00+01:00',
  recentActivity: [
    {
      id: 'act-1',
      icon: 'login',
      title: 'Logged in',
      timestampIso: '2026-07-24T07:40:00+01:00',
      category: 'Account',
    },
    {
      id: 'act-2',
      icon: 'record',
      title: 'Completed consultation note',
      timestampIso: '2026-07-24T08:55:00+01:00',
      category: 'Documentation',
    },
    {
      id: 'act-3',
      icon: 'referral',
      title: 'Referred patient to Cardiology',
      timestampIso: '2026-07-24T09:20:00+01:00',
      category: 'Referral',
    },
    {
      id: 'act-4',
      icon: 'shift-start',
      title: 'Started Morning Clinic',
      timestampIso: '2026-07-24T08:00:00+01:00',
      category: 'Shift',
    },
  ],
};

export const REGISTRATION_STAFF_PROFILE: StaffProfile = {
  staffId: 'REG-0114',
  phone: '+234 809 442 7710',
  employmentType: 'Full-Time',
  dateJoinedIso: '2021-02-08',
  onDutyStatus: 'On Duty',
  personal: {
    dobIso: '1992-05-30',
    gender: 'Female',
    address: '22 Zik Avenue, Awka, Anambra State',
    emergencyContact: 'Uche Nwankwo (Spouse) · +234 807 552 1290',
    bloodGroup: 'B+',
    maritalStatus: 'Married',
  },
  professional: {
    unitLabel: 'Front Desk',
    unitValue: 'Main Registration Desk',
    subUnitLabel: 'Counter',
    subUnitValue: 'Counter 2',
    qualification: 'HND Health Records Management',
    licenseLabel: 'Staff Certification No.',
    licenseValue: 'HRO/2021/00877',
    yearsOfExperience: '4 years',
  },
  work: {
    currentShiftLabel: 'Morning Desk',
    nextShiftLabel: 'Afternoon Desk',
    reportingLocation: 'Patient Registration Front Desk',
    supervisor: 'Head, Patient Registration',
    daysOff: 'Sundays',
    leaveBalance: '15 days remaining',
  },
  todaySchedule: null,
  scheduleNavLabel: null,
  lastLoginIso: '2026-07-24T07:15:00+01:00',
  recentActivity: [
    {
      id: 'act-1',
      icon: 'login',
      title: 'Logged in',
      timestampIso: '2026-07-24T07:15:00+01:00',
      category: 'Account',
    },
    {
      id: 'act-2',
      icon: 'checkin',
      title: 'Checked in 6 patients',
      timestampIso: '2026-07-24T09:30:00+01:00',
      category: 'Registration',
    },
    {
      id: 'act-3',
      icon: 'record',
      title: 'Registered a new patient record',
      timestampIso: '2026-07-24T10:05:00+01:00',
      category: 'Registration',
    },
    {
      id: 'act-4',
      icon: 'shift-start',
      title: 'Started Morning Desk',
      timestampIso: '2026-07-24T07:00:00+01:00',
      category: 'Shift',
    },
  ],
};

export const RECORDS_STAFF_PROFILE: StaffProfile = {
  staffId: 'REC-0059',
  phone: '+234 810 664 2205',
  employmentType: 'Full-Time',
  dateJoinedIso: '2020-06-22',
  onDutyStatus: 'On Duty',
  personal: {
    dobIso: '1990-01-17',
    gender: 'Female',
    address: '5 Nnamdi Azikiwe Street, Awka, Anambra State',
    emergencyContact: 'Amara Asogwa (Sister) · +234 809 213 6644',
    bloodGroup: 'AB+',
    maritalStatus: 'Married',
  },
  professional: {
    unitLabel: 'Section',
    unitValue: 'Medical Records Archive',
    subUnitLabel: 'Shelf Range',
    subUnitValue: 'A1 – D6',
    qualification: 'BSc Health Information Management',
    licenseLabel: 'Staff Certification No.',
    licenseValue: 'HIM/2020/00312',
    yearsOfExperience: '6 years',
  },
  work: {
    currentShiftLabel: 'Day Shift',
    nextShiftLabel: 'Day Shift · Tomorrow',
    reportingLocation: 'Medical Records Archive Office',
    supervisor: 'Head, Medical Records',
    daysOff: 'Sundays',
    leaveBalance: '14 days remaining',
  },
  todaySchedule: null,
  scheduleNavLabel: null,
  lastLoginIso: '2026-07-24T07:05:00+01:00',
  recentActivity: [
    {
      id: 'act-1',
      icon: 'login',
      title: 'Logged in',
      timestampIso: '2026-07-24T07:05:00+01:00',
      category: 'Account',
    },
    {
      id: 'act-2',
      icon: 'record',
      title: 'Archived a discharged patient file',
      timestampIso: '2026-07-24T09:00:00+01:00',
      category: 'Archiving',
    },
    {
      id: 'act-3',
      icon: 'checkin',
      title: 'Fulfilled a record request',
      timestampIso: '2026-07-24T10:15:00+01:00',
      category: 'Requests',
    },
    {
      id: 'act-4',
      icon: 'shift-start',
      title: 'Started Day Shift',
      timestampIso: '2026-07-24T07:00:00+01:00',
      category: 'Shift',
    },
  ],
};

const STAFF_PROFILE_BY_WORKSPACE: Partial<Record<WorkspaceId, StaffProfile>> = {
  nursing: NURSE_STAFF_PROFILE,
  clinical: DOCTOR_STAFF_PROFILE,
  registration: REGISTRATION_STAFF_PROFILE,
  records: RECORDS_STAFF_PROFILE,
};

/**
 * Single lookup point for "the rich HR-style facts for this workspace" —
 * used by both the Profile page and Settings (for its default phone number),
 * so the two screens never disagree about a role's static professional data.
 */
export function getStaffProfile(
  workspaceId: WorkspaceId,
  role: string,
  department: string,
): StaffProfile {
  return STAFF_PROFILE_BY_WORKSPACE[workspaceId] ?? buildGenericStaffProfile(role, department, '');
}

/**
 * Generic fallback for workspaces without a dedicated staff-profile fixture
 * yet (ward-management, pharmacy, laboratory, finance, emergency,
 * administration). Keeps the tabbed layout genuinely usable — no blank
 * fields — until each workspace grows its own StaffProfile like the four
 * above.
 */
export function buildGenericStaffProfile(
  role: string,
  department: string,
  phone: string,
): StaffProfile {
  return {
    staffId: '—',
    phone,
    employmentType: 'Full-Time',
    dateJoinedIso: '2023-01-01',
    onDutyStatus: 'On Duty',
    personal: {
      dobIso: '1990-01-01',
      gender: '—',
      address: 'Not yet on file',
      emergencyContact: 'Not yet on file',
      bloodGroup: '—',
      maritalStatus: '—',
    },
    professional: {
      unitLabel: 'Department',
      unitValue: department,
      subUnitLabel: 'Role',
      subUnitValue: role,
      qualification: 'Not yet on file',
      licenseLabel: 'Staff Certification No.',
      licenseValue: '—',
      yearsOfExperience: '—',
    },
    work: {
      currentShiftLabel: '—',
      nextShiftLabel: '—',
      reportingLocation: department,
      supervisor: '—',
      daysOff: '—',
      leaveBalance: '—',
    },
    todaySchedule: null,
    scheduleNavLabel: null,
    lastLoginIso: new Date().toISOString(),
    recentActivity: [],
  };
}
