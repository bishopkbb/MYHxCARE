/**
 * Mock fixtures for the Administration Shift Handover page. Adapted from
 * billingShiftHandoverFixtures.ts's own shape and conventions — same shift/
 * personnel/department/checklist/history shape, since that part is
 * inherently per-shift authored content, not something a live store
 * produces.
 *
 * Unlike Billing's own handover (which derives a live financial backlog
 * summary from `buildAllInvoices()`/`buildAllPayments()`/`buildAllRefunds()`),
 * Administration has no equivalent real cross-module data source to
 * summarize — no live user-account-request queue or system-ticket store
 * exists yet. Rather than fabricate one, this handover's "domain summary" is
 * computed directly from `OUTSTANDING_TASKS` below (see
 * `AdministrationShiftHandoverWorkspace.tsx`'s task-category stat tiles) —
 * an honest, smaller scope than Billing's, not a placeholder for a store
 * that doesn't exist.
 *
 * Replace with real API data in Phase 6 integration.
 */

export type ShiftType = 'Morning' | 'Afternoon' | 'Night';

export type HandoverShiftInfo = {
  shiftDateLabel: string;
  shiftType: ShiftType;
  shiftTimeRange: string;
  handoverTimeLabel: string;
};

export type HandoverStaff = {
  name: string;
  staffId: string;
  email: string;
  phone: string;
  avatarBg: string;
};

// Kelechi Obasi is the same SYSTEM_ADMIN persona the login screen's dev
// identifier comment block maps to ADM-001 (see authFixtures.ts) — reused
// here as the outgoing officer so the handover reads as this session's own
// logged-in user handing off, same convention as Billing/Laboratory's own
// recurring roster reuse.
export const OUTGOING_OFFICER: HandoverStaff = {
  name: 'Kelechi Obasi',
  staffId: 'ADM-001',
  email: 'kelechi.obasi@unizikmedical.edu.ng',
  phone: '+234 802 441 3367',
  avatarBg: '#00B4D8',
};

export const INCOMING_OFFICER: HandoverStaff = {
  name: 'Chidinma Obasi',
  staffId: 'ADM-014',
  email: 'chidinma.obasi@unizikmedical.edu.ng',
  phone: '+234 803 552 7719',
  avatarBg: '#8B5CF6',
};

export const SHIFT_INFO: HandoverShiftInfo = {
  shiftDateLabel: new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date()),
  shiftType: 'Morning',
  shiftTimeRange: '08:00 - 16:00',
  handoverTimeLabel: '15:45',
};

export type DepartmentHandoverInfo = {
  name: string;
  departmentCode: string;
  operatingHours: string;
  officerInCharge: string;
};

export const DEPARTMENT_INFO: DepartmentHandoverInfo = {
  name: 'Administration Department',
  departmentCode: 'ADM',
  operatingHours: '08:00 - 17:00, Mon - Fri',
  officerInCharge: OUTGOING_OFFICER.name,
};

export type HandoverTask = {
  id: string;
  category: string;
  description: string;
  done: boolean;
};

export const OUTSTANDING_TASKS: HandoverTask[] = [
  {
    id: 't1',
    category: 'Staff Account Requests',
    description: 'Approve new staff account request for the Laboratory department',
    done: false,
  },
  {
    id: 't2',
    category: 'Staff Account Requests',
    description: 'Deactivate access for a staff member who resigned this week',
    done: false,
  },
  {
    id: 't3',
    category: 'System & IT Issues',
    description: 'Follow up with IT on the reported login-timeout issue in Pharmacy',
    done: false,
  },
  {
    id: 't4',
    category: 'System & IT Issues',
    description: 'Confirm scheduled system maintenance window was communicated to all workspaces',
    done: false,
  },
  {
    id: 't5',
    category: 'Facilities Reports',
    description: 'Escalate a reported plumbing issue at the Nnewi campus to Facilities',
    done: false,
  },
  {
    id: 't6',
    category: 'Facilities Reports',
    description: 'Confirm generator maintenance was completed at the Awka campus',
    done: false,
  },
  {
    id: 't7',
    category: 'Compliance & Audit',
    description: 'Review flagged audit log entries from the overnight shift',
    done: false,
  },
  {
    id: 't8',
    category: 'Compliance & Audit',
    description: 'Confirm the weekly compliance report was sent to the HOD',
    done: false,
  },
];

export type HandoverHistoryEntry = {
  id: string;
  shiftDateLabel: string;
  shiftType: ShiftType;
  outgoingOfficer: string;
  incomingOfficer: string;
  department: string;
  completedAtLabel: string;
};

function daysAgoLabel(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function daysAgoDateLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export const HANDOVER_HISTORY: HandoverHistoryEntry[] = [
  {
    id: 'h1',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Night',
    outgoingOfficer: 'Obinna Obasi',
    incomingOfficer: OUTGOING_OFFICER.name,
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(1, 8, 4),
  },
  {
    id: 'h2',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Afternoon',
    outgoingOfficer: 'Ngozi Obasi',
    incomingOfficer: 'Obinna Obasi',
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(1, 16, 6),
  },
  {
    id: 'h3',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Morning',
    outgoingOfficer: OUTGOING_OFFICER.name,
    incomingOfficer: 'Ngozi Obasi',
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(1, 16, 1),
  },
  {
    id: 'h4',
    shiftDateLabel: daysAgoDateLabel(2),
    shiftType: 'Night',
    outgoingOfficer: 'Obinna Obasi',
    incomingOfficer: OUTGOING_OFFICER.name,
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(2, 8, 9),
  },
];
