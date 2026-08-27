/**
 * Mock fixtures for the five non-mockup tabs of Workflow Settings (Queue
 * Settings, Appointment Settings, Notification Rules, Escalation Settings,
 * Approval Workflows). Each reuses vocabulary that already exists elsewhere
 * in the app rather than inventing parallel concepts:
 *
 * - Queue Settings' fields mirror `QueueMonitorSettingsModal.tsx` /
 *   `QueueSettingsModal.tsx` (Pharmacy).
 * - Escalation Settings' rows reuse the severity / communicated /
 *   acknowledged vocabulary already established by
 *   `laboratory/__mocks__/labResultFixtures.ts`'s critical-result handling,
 *   Nursing's "Escalate Patient" action, and Pharmacy's ADR-to-NPC reporting.
 * - Approval Workflows lists the 6 approval-gated flows that are genuinely
 *   already enforced elsewhere (`servicePricingStore.ts`, Laboratory and
 *   Pharmacy procurement, Billing refunds, plus the two settings already on
 *   `departmentSettingsStore.ts` / `permissionSettingsStore.ts`), rather than
 *   inventing fictional workflow types.
 *
 * Appointment Settings is the one tab with no prior config to reuse
 * (`appointmentStore.ts` has only per-appointment fields, no global
 * defaults). Its values here are real, editable, persisted config, honestly
 * scoped: this pass does not rewire `appointmentStore.ts`'s own booking
 * validation to read them, the same boundary already drawn for Medical
 * Centre Settings' branding colors.
 *
 * Swap out by pointing hooks to real configuration endpoints in Phase 6.
 */

import { ROUTES } from '@/constants/routes';

// ─── Queue Settings ─────────────────────────────────────────────────────

export type QueueSortOrder = 'priority' | 'fifo' | 'wait-time';

export type QueueSettings = {
  autoRefreshInterval: 15 | 30 | 60 | 0;
  defaultSortOrder: QueueSortOrder;
  showCancelledEntries: boolean;
  highlightAllergyFlagged: boolean;
};

export const DEFAULT_QUEUE_SETTINGS: QueueSettings = {
  autoRefreshInterval: 30,
  defaultSortOrder: 'priority',
  showCancelledEntries: false,
  highlightAllergyFlagged: true,
};

export const AUTO_REFRESH_OPTIONS: { value: string; label: string }[] = [
  { value: '15', label: 'Every 15 seconds' },
  { value: '30', label: 'Every 30 seconds' },
  { value: '60', label: 'Every 60 seconds' },
  { value: '0', label: 'Off' },
];

export const SORT_ORDER_OPTIONS: { value: QueueSortOrder; label: string }[] = [
  { value: 'priority', label: 'Priority First' },
  { value: 'fifo', label: 'First In, First Out' },
  { value: 'wait-time', label: 'Estimated Wait Time' },
];

export type ActiveQueue = {
  id: string;
  name: string;
  route: string;
};

export const ACTIVE_QUEUES: ActiveQueue[] = [
  { id: 'q-registration', name: 'Registration Check-in Queue', route: ROUTES.registrationCheckIn },
  { id: 'q-nursing', name: 'Nursing Patient Queue', route: ROUTES.nursePatientQueue },
  {
    id: 'q-pharmacy-prescriptions',
    name: 'Pharmacy Prescription Queue',
    route: ROUTES.pharmacyPrescriptionQueue,
  },
  { id: 'q-pharmacy-pickup', name: 'Pharmacy Pickup Queue', route: ROUTES.pharmacyPickupQueue },
  {
    id: 'q-laboratory',
    name: 'Laboratory Sample Reception',
    route: ROUTES.laboratorySampleReception,
  },
  { id: 'q-emergency', name: 'Emergency Patient Queue', route: ROUTES.emergencyPatientQueue },
];

// ─── Appointment Settings ───────────────────────────────────────────────

export type AppointmentSettings = {
  defaultDurationMinutes: 15 | 20 | 30 | 45 | 60;
  bufferMinutes: 0 | 5 | 10 | 15;
  bookingWindowDays: 7 | 14 | 30 | 60;
  allowSameDayBooking: boolean;
  cancellationNoticeHours: 1 | 2 | 6 | 24;
  requireCancellationReason: boolean;
  autoReleaseSlotOnCancellation: boolean;
  reminder24HoursBefore: boolean;
  reminderSameDay: boolean;
};

export const DEFAULT_APPOINTMENT_SETTINGS: AppointmentSettings = {
  defaultDurationMinutes: 30,
  bufferMinutes: 10,
  bookingWindowDays: 30,
  allowSameDayBooking: true,
  cancellationNoticeHours: 2,
  requireCancellationReason: true,
  autoReleaseSlotOnCancellation: true,
  reminder24HoursBefore: true,
  reminderSameDay: false,
};

export const DURATION_OPTIONS = [15, 20, 30, 45, 60].map((v) => ({
  value: String(v),
  label: `${v} minutes`,
}));

export const BUFFER_OPTIONS = [0, 5, 10, 15].map((v) => ({
  value: String(v),
  label: v === 0 ? 'No buffer' : `${v} minutes`,
}));

export const BOOKING_WINDOW_OPTIONS = [7, 14, 30, 60].map((v) => ({
  value: String(v),
  label: `Up to ${v} days ahead`,
}));

export const CANCELLATION_NOTICE_OPTIONS = [1, 2, 6, 24].map((v) => ({
  value: String(v),
  label: v === 1 ? '1 hour' : `${v} hours`,
}));

// ─── Notification Rules ─────────────────────────────────────────────────

export type NotificationRuleId =
  | 'nr-new-registration'
  | 'nr-appointment-reminder'
  | 'nr-queue-update'
  | 'nr-critical-lab-result'
  | 'nr-consent-pending'
  | 'nr-insurance-verification'
  | 'nr-emergency-alert';

export type NotificationRule = {
  id: NotificationRuleId;
  event: string;
  notifyRole: string;
  email: boolean;
  inApp: boolean;
  enabled: boolean;
};

export const NOTIFY_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Registration Officer', label: 'Registration Officer' },
  { value: 'Assigned Doctor', label: 'Assigned Doctor' },
  { value: 'Department Head', label: 'Department Head' },
  { value: 'Nurse on Duty', label: 'Nurse on Duty' },
  { value: 'Pharmacist', label: 'Pharmacist' },
  { value: 'Records Officer', label: 'Records Officer' },
  { value: 'Billing Officer', label: 'Billing Officer' },
  { value: 'System Administrator', label: 'System Administrator' },
];

export const DEFAULT_NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: 'nr-new-registration',
    event: 'New Patient Registration',
    notifyRole: 'Registration Officer',
    email: true,
    inApp: true,
    enabled: true,
  },
  {
    id: 'nr-appointment-reminder',
    event: 'Appointment Reminder',
    notifyRole: 'Assigned Doctor',
    email: true,
    inApp: false,
    enabled: true,
  },
  {
    id: 'nr-queue-update',
    event: 'Queue Update',
    notifyRole: 'Nurse on Duty',
    email: false,
    inApp: true,
    enabled: true,
  },
  {
    id: 'nr-critical-lab-result',
    event: 'Critical Lab Result',
    notifyRole: 'Assigned Doctor',
    email: true,
    inApp: true,
    enabled: true,
  },
  {
    id: 'nr-consent-pending',
    event: 'Consent Pending',
    notifyRole: 'Records Officer',
    email: false,
    inApp: true,
    enabled: true,
  },
  {
    id: 'nr-insurance-verification',
    event: 'Insurance Verification',
    notifyRole: 'Billing Officer',
    email: true,
    inApp: true,
    enabled: false,
  },
  {
    id: 'nr-emergency-alert',
    event: 'Emergency Alert',
    notifyRole: 'Department Head',
    email: true,
    inApp: true,
    enabled: true,
  },
];

// ─── Escalation Settings ────────────────────────────────────────────────

export type EscalationMinutes = 15 | 30 | 60 | 0;

export type EscalationRule = {
  id: string;
  title: string;
  department: string;
  notifies: string[];
  acknowledgmentRequired: boolean;
  escalateAfterMinutes: EscalationMinutes;
};

export const ESCALATION_MINUTES_OPTIONS: { value: string; label: string }[] = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '60 minutes' },
  { value: '0', label: 'Off' },
];

export const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    id: 'esc-critical-lab-result',
    title: 'Critical Lab Result Escalation',
    department: 'Laboratory',
    notifies: ['Ordering Doctor', 'Department Head'],
    acknowledgmentRequired: true,
    escalateAfterMinutes: 15,
  },
  {
    id: 'esc-nursing-urgent-review',
    title: 'Urgent Nursing Review Escalation',
    department: 'Nursing / Wards',
    notifies: ['Assigned Doctor'],
    acknowledgmentRequired: true,
    escalateAfterMinutes: 30,
  },
  {
    id: 'esc-pharmacy-adr',
    title: 'Adverse Drug Reaction Escalation',
    department: 'Pharmacy',
    notifies: ['Chief Pharmacist', 'National Pharmacovigilance Centre'],
    acknowledgmentRequired: true,
    escalateAfterMinutes: 60,
  },
  {
    id: 'esc-emergency-critical-alert',
    title: 'Emergency Critical Alert Escalation',
    department: 'Emergency',
    notifies: ['On-Call Physician'],
    acknowledgmentRequired: false,
    escalateAfterMinutes: 15,
  },
];

// ─── Approval Workflows ──────────────────────────────────────────────────

export type ApprovalWorkflowKind = 'linked-department' | 'linked-permissions' | 'standalone';

export type ApprovalWorkflowType = {
  id: string;
  name: string;
  description: string;
  approverRole: string;
  kind: ApprovalWorkflowKind;
  /** For 'standalone' kinds only — a static fact, not a toggle, since this
   * pass doesn't own the enforcement logic for these flows. */
  alwaysRequiresApproval?: boolean;
};

export const APPROVER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Department Head', label: 'Department Head' },
  { value: 'Finance Manager', label: 'Finance Manager' },
  { value: 'Laboratory Manager', label: 'Laboratory Manager' },
  { value: 'Pharmacy Manager', label: 'Pharmacy Manager' },
  { value: 'Procurement Officer', label: 'Procurement Officer' },
  { value: 'System Administrator', label: 'System Administrator' },
];

export const DEFAULT_APPROVAL_WORKFLOW_TYPES: ApprovalWorkflowType[] = [
  {
    id: 'apw-service-price-changes',
    name: 'Service Price Changes',
    description: 'A new price is never live until published through review.',
    approverRole: 'Department Head',
    kind: 'standalone',
    alwaysRequiresApproval: true,
  },
  {
    id: 'apw-lab-procurement',
    name: 'Laboratory Procurement Requests',
    description:
      'Sequential sign-off: Department Head, then Laboratory Manager, then Procurement Officer.',
    approverRole: 'Laboratory Manager',
    kind: 'standalone',
    alwaysRequiresApproval: true,
  },
  {
    id: 'apw-pharmacy-procurement',
    name: 'Pharmacy Procurement Requests',
    description: 'Every purchase request starts Pending Approval before ordering.',
    approverRole: 'Pharmacy Manager',
    kind: 'standalone',
    alwaysRequiresApproval: true,
  },
  {
    id: 'apw-billing-refunds',
    name: 'Billing Refunds & Adjustments',
    description: 'Refunds are processed only after Finance Manager approval.',
    approverRole: 'Finance Manager',
    kind: 'standalone',
    alwaysRequiresApproval: true,
  },
  {
    id: 'apw-department-status',
    name: 'Department Status Changes',
    description: 'Configured on the Departments screen.',
    approverRole: 'System Administrator',
    kind: 'linked-department',
  },
  {
    id: 'apw-admin-role-assignment',
    name: 'Admin-Tier Role Assignment',
    description: 'Configured on the Roles & Permissions screen.',
    approverRole: 'System Administrator',
    kind: 'linked-permissions',
  },
];
