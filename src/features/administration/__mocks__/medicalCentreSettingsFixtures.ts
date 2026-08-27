/**
 * Mock fixtures for Medical Centre Settings (`/admin/system-settings`). The
 * whole screen edits one record, not a list, so this file just seeds that
 * one `MedicalCentreSettings` object plus its option lists.
 *
 * Departments and Service Configuration sections deliberately don't
 * duplicate the real `/admin/departments` and `/admin/service-pricing`
 * screens here, they show a live summary and link out. System Preferences'
 * Timezone is locked to West Africa Time (the compliance checklist's own
 * non-negotiable WAT/24-hour rule), rendered disabled with an explanatory
 * hint rather than a real multi-timezone switch. Date Format / Time Format
 * are scoped to formatting generated documents and reports, not the live
 * application UI, which stays hard-coded WAT/24-hour/DD-MM-YYYY everywhere
 * else. Primary/Secondary Color, Document Settings, Receipt Settings, and
 * Notification Preferences are real, editable, persisted config, but
 * nothing in this pass rewires the live app's theme or Billing's actual
 * receipt renderer to read them, an honest scope boundary, not a silent
 * gap. Notification Preferences are email/in-app only, per the standing
 * "no SMS" architecture decision.
 * Swap out by pointing hooks to a real settings endpoint in Phase 6.
 */

import { TENANT_CONFIG } from '@/constants/tenant';

export type MedicalCentreSettings = {
  // General Information
  name: string;
  shortName: string;
  centreType: string;
  registrationNumber: string;
  tin: string;
  rcNumber: string;
  tagline: string;
  establishedDate: string;
  about: string;
  vision: string;
  mission: string;
  coreValues: string[];

  // Logo & Branding
  logoDataUrl: string | null;
  primaryColor: string;
  secondaryColor: string;

  // Contact Information
  phone: string;
  email: string;
  website: string;

  // Address
  addressLine1: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;

  // Operating Hours
  weekdayRange: string;
  saturdayRange: string;
  sundayOpen: boolean;
  emergencyAvailable: boolean;

  // Notification Preferences (email / in-app only, never SMS)
  notifyNewStaffAccounts: boolean;
  notifyPriceChangeApprovals: boolean;
  notifyDailyActivityDigest: boolean;
  notifySystemAlerts: boolean;

  // Document Settings
  includeLogoOnDocuments: boolean;
  includeQrCodeOnIdCards: boolean;
  documentFooterText: string;

  // Receipt Settings
  showTaxBreakdownOnReceipts: boolean;
  includeRegistrationNumberOnReceipts: boolean;
  receiptFooterText: string;

  // System Preferences
  timezone: string;
  dateFormat: string;
  timeFormat: string;

  // Backup & Data
  lastBackupAt: string;
};

export const CENTRE_TYPE_OPTIONS = [
  { value: 'University Medical Centre', label: 'University Medical Centre' },
  { value: 'General Hospital', label: 'General Hospital' },
  { value: 'Teaching Hospital', label: 'Teaching Hospital' },
  { value: 'Specialist Hospital', label: 'Specialist Hospital' },
  { value: 'Primary Health Centre', label: 'Primary Health Centre' },
];

export const TIMEZONE_OPTIONS = [
  { value: 'Africa/Lagos', label: '(UTC+01:00) West Africa Time (Lagos)' },
];

export const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 20/08/2026)' },
  { value: 'MMMM D, YYYY', label: 'Month D, YYYY (e.g. August 20, 2026)' },
];

export const TIME_FORMAT_OPTIONS = [
  { value: '24h', label: '24 Hour (13:30)' },
  { value: '12h', label: '12 Hour (01:30 PM)' },
];

export const DEFAULT_SETTINGS: MedicalCentreSettings = {
  name:
    TENANT_CONFIG.name === 'NAU Medical Centre'
      ? 'Nnamdi Azikiwe University Medical Centre'
      : TENANT_CONFIG.name,
  shortName: 'NAUMC',
  centreType: 'University Medical Centre',
  registrationNumber: 'NAUMC/REG/2020/001',
  tin: '12345678-0001',
  rcNumber: 'RC1234567',
  tagline: 'Quality Healthcare, Compassionate Care',
  establishedDate: '2020-01-15',
  about:
    'Nnamdi Azikiwe University Medical Centre is committed to providing excellent healthcare services to the university community and the general public through quality medical care, training, research and community service.',
  vision: 'To be a leading centre of excellence in healthcare delivery, training and research.',
  mission:
    'To provide high quality, patient-centred healthcare services supported by innovation, teamwork and professionalism.',
  coreValues: ['Integrity', 'Compassion', 'Excellence', 'Teamwork', 'Accountability'],

  logoDataUrl: null,
  primaryColor: '#1E3A8A',
  secondaryColor: '#059669',

  phone: '+234 806 123 4567',
  email: 'info@naumc.edu.ng',
  website: 'www.naumc.edu.ng',

  addressLine1: 'Nnamdi Azikiwe University Permanent Site',
  city: 'Awka',
  state: 'Anambra State',
  country: 'Nigeria',
  postalCode: '420110',

  weekdayRange: '8:00 AM - 6:00 PM',
  saturdayRange: '8:00 AM - 2:00 PM',
  sundayOpen: false,
  emergencyAvailable: true,

  notifyNewStaffAccounts: true,
  notifyPriceChangeApprovals: true,
  notifyDailyActivityDigest: false,
  notifySystemAlerts: true,

  includeLogoOnDocuments: true,
  includeQrCodeOnIdCards: true,
  documentFooterText: 'Nnamdi Azikiwe University Medical Centre, Awka, Nigeria',

  showTaxBreakdownOnReceipts: false,
  includeRegistrationNumberOnReceipts: true,
  receiptFooterText: 'Thank you for choosing NAU Medical Centre.',

  timezone: 'Africa/Lagos',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',

  lastBackupAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};
