/**
 * Mock fixtures for the Settings screen.
 * Swap out by pointing hooks to real preference/security endpoints in Phase 6.
 */

import {
  AlertTriangle,
  Calendar,
  FlaskConical,
  MessageSquare,
  Share2,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { PERMISSIONS, type Permission } from '@/constants/permissions';

// ── Notification preferences ─────────────────────────────────────────────────

export type NotificationPrefKey =
  | 'newPatientAssigned'
  | 'labResultReady'
  | 'referralResponse'
  | 'emergencyAlerts'
  | 'clinicalMessages'
  | 'appointmentReminders';

export type NotificationPrefDef = {
  key: NotificationPrefKey;
  icon: LucideIcon;
  label: string;
  description: string;
  defaultOn: boolean;
};

export const NOTIFICATION_PREF_DEFS: NotificationPrefDef[] = [
  {
    key: 'newPatientAssigned',
    icon: Users,
    label: 'New Patient Assigned',
    description: 'Notify when a patient is assigned to you',
    defaultOn: true,
  },
  {
    key: 'labResultReady',
    icon: FlaskConical,
    label: 'Lab Result Ready',
    description: 'Alert when laboratory results are published',
    defaultOn: true,
  },
  {
    key: 'referralResponse',
    icon: Share2,
    label: 'Referral Response',
    description: 'Notify when a specialist accepts or declines your referral',
    defaultOn: true,
  },
  {
    key: 'emergencyAlerts',
    icon: AlertTriangle,
    label: 'Emergency Alerts',
    description: 'Receive Code Red and emergency notifications (recommended ON)',
    defaultOn: true,
  },
  {
    key: 'clinicalMessages',
    icon: MessageSquare,
    label: 'Clinical Messages',
    description: 'Alert when you receive a clinical message from a colleague',
    defaultOn: true,
  },
  {
    key: 'appointmentReminders',
    icon: Calendar,
    label: 'Appointment Reminders',
    description: 'Receive pre-appointment reminders for scheduled consultations',
    defaultOn: false,
  },
];

// ── Display & clinical preferences ───────────────────────────────────────────

export type DisplayPrefKey =
  'compactView' | 'patientAvatarInitials' | 'autoSaveDrafts' | 'soundAlerts' | 'highContrast';

export type DisplayPrefDef = {
  key: DisplayPrefKey;
  label: string;
  description: string;
  defaultOn: boolean;
};

export const DISPLAY_PREF_DEFS: DisplayPrefDef[] = [
  {
    key: 'compactView',
    label: 'Compact View Mode',
    description: 'Condense list items and tables for more information density',
    defaultOn: false,
  },
  {
    key: 'patientAvatarInitials',
    label: 'Patient Avatar Initials',
    description: 'Show patient initial avatars in queue and profile screens',
    defaultOn: true,
  },
  {
    key: 'autoSaveDrafts',
    label: 'Auto-Save Consultation Drafts',
    description: 'Automatically save consultation drafts every 2 minutes',
    defaultOn: true,
  },
  {
    key: 'soundAlerts',
    label: 'Sound Alerts for Critical Events',
    description: 'Play audio for emergency and critical lab result notifications',
    defaultOn: true,
  },
  {
    key: 'highContrast',
    label: 'High Contrast Mode',
    description: 'Increase text and border contrast for better readability',
    defaultOn: false,
  },
];

export type SettingsPrefs = {
  notifications: Record<NotificationPrefKey, boolean>;
  display: Record<DisplayPrefKey, boolean>;
  twoFactorEnabled: boolean;
};

export function buildDefaultPrefs(): SettingsPrefs {
  return {
    notifications: Object.fromEntries(
      NOTIFICATION_PREF_DEFS.map((d) => [d.key, d.defaultOn]),
    ) as Record<NotificationPrefKey, boolean>,
    display: Object.fromEntries(DISPLAY_PREF_DEFS.map((d) => [d.key, d.defaultOn])) as Record<
      DisplayPrefKey,
      boolean
    >,
    twoFactorEnabled: false,
  };
}

// ── Role permissions — dynamic against whoever is actually logged in ────────

export type RolePermissionItem = { label: string; permission: Permission };

export const ROLE_PERMISSION_ITEMS: RolePermissionItem[] = [
  { label: 'View Patient Records', permission: PERMISSIONS.PATIENTS_READ },
  { label: 'Update Patient Records', permission: PERMISSIONS.PATIENTS_WRITE },
  { label: 'Create Consultation', permission: PERMISSIONS.ENCOUNTERS_WRITE },
  { label: 'Prescribe Medication', permission: PERMISSIONS.PRESCRIPTIONS_WRITE },
  { label: 'Request Laboratory Tests', permission: PERMISSIONS.LAB_ORDERS_WRITE },
  { label: 'Refer Patients', permission: PERMISSIONS.REFERRALS_WRITE },
  { label: 'Dispense Medication', permission: PERMISSIONS.PHARMACY_DISPENSE },
  { label: 'Adjust Ward Bed Assignments', permission: PERMISSIONS.WARDS_WRITE },
  { label: 'Post Payments', permission: PERMISSIONS.BILLING_WRITE },
  { label: 'Create Patient Invoices', permission: PERMISSIONS.BILLING_WRITE },
  { label: 'Respond to Emergency Alerts', permission: PERMISSIONS.EMERGENCY_WRITE },
  { label: 'Manage Staff Accounts', permission: PERMISSIONS.ADMIN_WRITE },
];

// ── About MyHxCare HMS ────────────────────────────────────────────────────────

export const ABOUT_APP_INFO = {
  version: 'MYHxCARE HMS v2.4.1',
  platform: 'Web Application · Next.js PWA',
  institution: 'Nnamdi Azikiwe University Medical Centre',
  supportEmail: 'support@myhxcare.ng',
  lastUpdated: '2026-06-30',
};
