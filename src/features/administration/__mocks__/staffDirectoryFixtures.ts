/**
 * Mock fixtures for Staff Management (`/admin/staff-accounts`). The
 * curated entries (first 12) exactly match the real demo login accounts in
 * `authFixtures.ts`'s `MOCK_USERS`, mapped onto the 8 organizational
 * departments in `organizationalDepartments.ts` by their real
 * `workspaceRole`, the same convention every workforce fixture in this
 * codebase already follows. The generated fill reuses the exact same
 * generic Igbo first/last-name pool already established across
 * Billing/Laboratory/Administration's own workforce fixtures, rather than
 * inventing a new one. Per-department totals (24/32/18/16/21/9/5/3) match
 * the reference `Department.png` mockup exactly, so this screen and a
 * future real Departments screen won't disagree on headcount.
 * Swap out by pointing hooks to a real staff-directory endpoint in Phase 6.
 */

import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';

export type StaffRole =
  | 'Doctor'
  | 'Nurse'
  | 'Pharmacist'
  | 'Lab Scientist'
  | 'Accountant'
  | 'IT Support'
  | 'Admin'
  | 'Records Officer'
  | 'HR Manager'
  | 'Facilities Officer'
  | 'Compliance Officer'
  | 'Administrative Officer';

export type StaffStatus = 'Active' | 'Inactive' | 'On Leave';

export type StaffMember = {
  staffId: string;
  fullName: string;
  initials: string;
  avatarBg: string;
  title: string;
  department: OrganizationalDepartment;
  role: StaffRole;
  email: string;
  phone: string;
  status: StaffStatus;
  lastLogin: string | null;
  newThisMonth: boolean;
};

export const STATUS_OPTIONS: { value: StaffStatus; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'On Leave', label: 'On Leave' },
];

export const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  'Doctor',
  'Nurse',
  'Pharmacist',
  'Lab Scientist',
  'Accountant',
  'IT Support',
  'Admin',
  'Records Officer',
  'HR Manager',
  'Facilities Officer',
  'Compliance Officer',
  'Administrative Officer',
].map((r) => ({ value: r as StaffRole, label: r }));

export const ROLE_BADGE_CFG: Record<StaffRole, { color: string; bg: string; border: string }> = {
  Doctor: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.3)' },
  Nurse: { color: '#16A34A', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.3)' },
  Pharmacist: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.3)' },
  'Lab Scientist': {
    color: '#D97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.3)',
  },
  Accountant: { color: '#00B4D8', bg: 'rgba(0,180,216,0.08)', border: 'rgba(0,180,216,0.3)' },
  'IT Support': { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.3)' },
  Admin: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.3)' },
  'Records Officer': {
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.3)',
  },
  'HR Manager': { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.3)' },
  'Facilities Officer': {
    color: '#D97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.3)',
  },
  'Compliance Officer': {
    color: '#4A7080',
    bg: 'rgba(74,112,128,0.08)',
    border: 'rgba(74,112,128,0.3)',
  },
  'Administrative Officer': {
    color: '#4A7080',
    bg: 'rgba(74,112,128,0.08)',
    border: 'rgba(74,112,128,0.3)',
  },
};

// ─── Name pools (reused verbatim from administrationWorkforceFixtures.ts) ──

const GEN_FIRST_NAMES = [
  'Chinedu',
  'Amaka',
  'Tochukwu',
  'Amarachi',
  'Ikenna',
  'Chiamaka',
  'Nnamdi',
  'Ijeoma',
  'Obiora',
  'Chinyere',
  'Kingsley',
  'Adaobi',
];
const GEN_LAST_NAMES = [
  'Okafor',
  'Eze',
  'Nwachukwu',
  'Onwuka',
  'Ibekwe',
  'Anyanwu',
  'Okoro',
  'Nnamani',
  'Uzoma',
  'Chukwuma',
  'Okereke',
  'Obi',
];
const GEN_AVATAR_BG = ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B', '#00B4D8', '#EC4899'];

function initialsOf(name: string): string {
  const parts = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Nurse|Matron)\s+/, '').split(' ');
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

function emailOf(name: string): string {
  const parts = name
    .replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Nurse|Matron)\s+/, '')
    .toLowerCase()
    .split(' ');
  return `${parts.join('.')}@unizikmedical.edu.ng`;
}

function phoneOf(seed: number): string {
  return `080${3 + (seed % 7)} ${String(100 + ((seed * 37) % 900)).padStart(3, '0')} ${String(1000 + ((seed * 91) % 9000)).padStart(4, '0')}`;
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

// ─── Curated (matches real demo login accounts in authFixtures.ts) ────────

type CuratedSeed = {
  fullName: string;
  title: string;
  department: OrganizationalDepartment;
  role: StaffRole;
};

const CURATED: CuratedSeed[] = [
  {
    fullName: 'Dr. Adaeze Okonkwo',
    title: 'Consultant Physician',
    department: 'Clinical / Consultation',
    role: 'Doctor',
  },
  {
    fullName: 'Nurse Chidinma Eze',
    title: 'Staff Nurse',
    department: 'Nursing / Wards',
    role: 'Nurse',
  },
  { fullName: 'Mr. Emeka Obi', title: 'Pharmacist', department: 'Pharmacy', role: 'Pharmacist' },
  {
    fullName: 'Mrs. Ngozi Asogwa',
    title: 'Medical Records Officer',
    department: 'Records',
    role: 'Records Officer',
  },
  {
    fullName: 'Dr. Chukwuemeka Nwosu',
    title: 'Emergency Physician',
    department: 'Emergency',
    role: 'Doctor',
  },
  {
    fullName: 'Mrs. Adaora Ugwu',
    title: 'Medical Laboratory Scientist',
    department: 'Laboratory',
    role: 'Lab Scientist',
  },
  {
    fullName: 'Mr. Ifeanyi Okafor',
    title: 'Billing Officer',
    department: 'Accounts & Billing',
    role: 'Accountant',
  },
  {
    fullName: 'Mrs. Amaka Nwosu',
    title: 'Ward Manager',
    department: 'Nursing / Wards',
    role: 'Nurse',
  },
  {
    fullName: 'Dr. Obiora Eze',
    title: 'Head of Department',
    department: 'Clinical / Consultation',
    role: 'Doctor',
  },
  {
    fullName: 'Mr. Kelechi Obasi',
    title: 'Systems Administrator',
    department: 'Administration',
    role: 'Admin',
  },
  {
    fullName: 'Mrs. Adaobi Nwankwo',
    title: 'Registration Officer',
    department: 'Records',
    role: 'Records Officer',
  },
  {
    fullName: 'Matron Chioma Nnaji',
    title: 'Matron',
    department: 'Nursing / Wards',
    role: 'Nurse',
  },
];

// Total headcount per org department, matching Department.png exactly.
const DEPARTMENT_TARGET: Record<OrganizationalDepartment, number> = {
  'Clinical / Consultation': 24,
  'Nursing / Wards': 32,
  Pharmacy: 18,
  Laboratory: 16,
  Emergency: 21,
  'Accounts & Billing': 9,
  Records: 5,
  Administration: 3,
};

const DEPARTMENT_ROLE_POOL: Record<OrganizationalDepartment, StaffRole[]> = {
  'Clinical / Consultation': ['Doctor'],
  'Nursing / Wards': ['Nurse'],
  Pharmacy: ['Pharmacist'],
  Laboratory: ['Lab Scientist'],
  Emergency: ['Doctor', 'Nurse'],
  'Accounts & Billing': ['Accountant'],
  Records: ['Records Officer'],
  Administration: [
    'Admin',
    'IT Support',
    'HR Manager',
    'Facilities Officer',
    'Compliance Officer',
    'Administrative Officer',
  ],
};

const DEPARTMENT_TITLE: Record<StaffRole, string> = {
  Doctor: 'Medical Officer',
  Nurse: 'Staff Nurse',
  Pharmacist: 'Pharmacy Technician',
  'Lab Scientist': 'Laboratory Technician',
  Accountant: 'Accounts Officer',
  'IT Support': 'IT Support Officer',
  Admin: 'Administrative Officer',
  'Records Officer': 'Records Assistant',
  'HR Manager': 'HR Officer',
  'Facilities Officer': 'Facilities Officer',
  'Compliance Officer': 'Compliance Officer',
  'Administrative Officer': 'Administrative Officer',
};

function buildRoster(): StaffMember[] {
  const roster: Omit<StaffMember, 'status' | 'lastLogin' | 'newThisMonth'>[] = [];
  let seq = 1;

  for (const c of CURATED) {
    roster.push({
      staffId: `STF-${String(seq).padStart(4, '0')}`,
      fullName: c.fullName,
      initials: initialsOf(c.fullName),
      avatarBg: GEN_AVATAR_BG[(seq - 1) % GEN_AVATAR_BG.length]!,
      title: c.title,
      department: c.department,
      role: c.role,
      email: emailOf(c.fullName),
      phone: phoneOf(seq),
    });
    seq += 1;
  }

  const curatedCountByDept = CURATED.reduce<Record<string, number>>((acc, c) => {
    acc[c.department] = (acc[c.department] ?? 0) + 1;
    return acc;
  }, {});

  for (const dept of Object.keys(DEPARTMENT_TARGET) as OrganizationalDepartment[]) {
    const remaining = DEPARTMENT_TARGET[dept] - (curatedCountByDept[dept] ?? 0);
    const rolePool = DEPARTMENT_ROLE_POOL[dept];
    for (let i = 0; i < remaining; i++) {
      const firstName = GEN_FIRST_NAMES[(seq + i) % GEN_FIRST_NAMES.length]!;
      const lastName = GEN_LAST_NAMES[(seq + i * 5) % GEN_LAST_NAMES.length]!;
      const fullName = `${firstName} ${lastName}`;
      const role = rolePool[i % rolePool.length]!;
      roster.push({
        staffId: `STF-${String(seq).padStart(4, '0')}`,
        fullName,
        initials: `${firstName[0]}${lastName[0]}`,
        avatarBg: GEN_AVATAR_BG[(seq - 1) % GEN_AVATAR_BG.length]!,
        title: DEPARTMENT_TITLE[role],
        department: dept,
        role,
        email: emailOf(fullName),
        phone: phoneOf(seq),
      });
      seq += 1;
    }
  }

  let inactiveCount = 0;
  let onLeaveCount = 0;
  let newThisMonthCount = 0;
  return roster.map((r, i) => {
    let status: StaffStatus = 'Active';
    if (i % 14 === 7 && inactiveCount < 9) {
      status = 'Inactive';
      inactiveCount += 1;
    } else if (i % 26 === 13 && onLeaveCount < 5) {
      status = 'On Leave';
      onLeaveCount += 1;
    }
    const newThisMonth = i % 18 === 4 && newThisMonthCount < 7;
    if (newThisMonth) newThisMonthCount += 1;
    return {
      ...r,
      status,
      lastLogin: status === 'Inactive' ? null : minutesAgo(30 + i * 47),
      newThisMonth,
    };
  });
}

export const MOCK_STAFF_ROSTER: StaffMember[] = buildRoster();

export type StaffSummary = {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  newThisMonth: number;
};

export function computeStaffSummary(rows: StaffMember[]): StaffSummary {
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === 'Active').length,
    inactive: rows.filter((r) => r.status === 'Inactive').length,
    onLeave: rows.filter((r) => r.status === 'On Leave').length,
    newThisMonth: rows.filter((r) => r.newThisMonth).length,
  };
}

export function nextStaffId(rows: StaffMember[]): string {
  const max = rows.reduce((m, r) => {
    const n = Number(r.staffId.replace('STF-', ''));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `STF-${String(max + 1).padStart(4, '0')}`;
}
