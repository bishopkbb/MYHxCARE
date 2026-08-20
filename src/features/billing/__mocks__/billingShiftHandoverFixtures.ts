/**
 * Mock fixtures for the Billing Shift Handover page. Adapted from
 * laboratoryShiftHandoverFixtures.ts's own shape and conventions — same
 * shift/personnel/department/checklist/history shape, since that part is
 * inherently per-shift authored content, not something a live store
 * produces.
 *
 * Unlike a purely-fixture handover, the Billing Summary, Pending Refund
 * Approvals, Overdue Invoices, and Unreconciled Payments panels are NOT
 * fixtures here — the workspace derives those live from
 * `buildAllInvoices()` / `buildAllPayments()` / `buildAllRefunds()`
 * (`billingAccountDetailFixtures.ts`), so a handover always reflects the
 * real billing backlog at hand-off time, not a stale snapshot.
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

// Ifeanyi Okafor is the same BILLING_OFFICER persona the login screen's dev
// identifier comment block maps to BIL-001 (see authFixtures.ts) — reused
// here as the outgoing officer so the handover reads as this session's own
// logged-in user handing off, same convention as Laboratory's own recurring
// roster reuse.
export const OUTGOING_OFFICER: HandoverStaff = {
  name: 'Ifeanyi Okafor',
  staffId: 'BIL-001',
  email: 'ifeanyi.okafor@myhxcare.ng',
  phone: '+234 802 441 3367',
  avatarBg: '#00B4D8',
};

export const INCOMING_OFFICER: HandoverStaff = {
  name: 'Chioma Okafor',
  staffId: 'BIL-014',
  email: 'chioma.okafor@myhxcare.ng',
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
  name: 'Finance Department',
  departmentCode: 'FIN',
  operatingHours: '08:00 - 18:00, Mon - Sat',
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
    category: 'Payment Follow-ups',
    description: 'Confirm POS terminal settlement for today’s transactions',
    done: false,
  },
  {
    id: 't2',
    category: 'Payment Follow-ups',
    description: 'Follow up with cashier on a suspected duplicate payment',
    done: false,
  },
  {
    id: 't3',
    category: 'Refunds & Adjustments',
    description: 'Escalate refund request pending Finance Manager approval',
    done: false,
  },
  {
    id: 't4',
    category: 'Refunds & Adjustments',
    description: 'Confirm write-off adjustment was communicated to the patient',
    done: false,
  },
  {
    id: 't5',
    category: 'Outstanding Accounts',
    description: 'Call patient about an overdue balance flagged for collections',
    done: false,
  },
  {
    id: 't6',
    category: 'Outstanding Accounts',
    description: 'Send payment reminder batch for 90+ day accounts',
    done: false,
  },
  {
    id: 't7',
    category: 'Reconciliation',
    description: 'Investigate an unmatched bank transfer from this morning',
    done: false,
  },
  {
    id: 't8',
    category: 'Reconciliation',
    description: 'Confirm reconciliation report was sent to the Finance Manager',
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
    outgoingOfficer: 'Emeka Okafor',
    incomingOfficer: OUTGOING_OFFICER.name,
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(1, 8, 4),
  },
  {
    id: 'h2',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Afternoon',
    outgoingOfficer: 'Blessing Okafor',
    incomingOfficer: 'Emeka Okafor',
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(1, 16, 6),
  },
  {
    id: 'h3',
    shiftDateLabel: daysAgoDateLabel(1),
    shiftType: 'Morning',
    outgoingOfficer: OUTGOING_OFFICER.name,
    incomingOfficer: 'Blessing Okafor',
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(1, 16, 1),
  },
  {
    id: 'h4',
    shiftDateLabel: daysAgoDateLabel(2),
    shiftType: 'Night',
    outgoingOfficer: 'Emeka Okafor',
    incomingOfficer: OUTGOING_OFFICER.name,
    department: DEPARTMENT_INFO.name,
    completedAtLabel: daysAgoLabel(2, 8, 9),
  },
];
