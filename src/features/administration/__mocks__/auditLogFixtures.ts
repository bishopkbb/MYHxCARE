/**
 * Illustrative audit log entries for `/admin/audit-log`. Confirmed by
 * research: no module in this codebase writes to a shared, cross-app audit
 * trail — the ONLY genuinely real, live-captured audit source anywhere is
 * Pharmacy's own dispensing audit trail (`auditTrailStore.ts`, bridged to
 * `pharmacyDispensingStore.ts`), which the workspace merges in separately.
 * Everything else here (login/logout, patient record views, appointment
 * creation, user management changes, billing views, lab result deletions)
 * has no real audit-capture anywhere in the app, so this file generates a
 * deterministic illustrative set instead of fabricating a single fixed
 * number of rows.
 *
 * Deterministic (index-seeded, no `Math.random()`), evaluated once at
 * module load (not inside a render/hook), spread across the last 45 days so
 * both the default date range and its previous-period comparison have real
 * distributed counts to compute a percentage change from.
 *
 * Swap out by pointing this at a real cross-module audit-event stream in
 * Phase 6.
 */

import { MOCK_USERS } from '@/features/auth/__mocks__/authFixtures';

export type IllustrativeAuditAction =
  | 'Logged in'
  | 'Logged out'
  | 'Viewed'
  | 'Created'
  | 'Updated'
  | 'Deleted'
  | 'Exported'
  | 'Login Failed';

export type IllustrativeAuditModule =
  | 'Authentication'
  | 'Patient Records'
  | 'Appointment'
  | 'Medication'
  | 'Lab Results'
  | 'Reports'
  | 'User Management'
  | 'Billing';

export type AuditStatus = 'Success' | 'Failed';
export type AuditSeverity = 'normal' | 'critical';

export type IllustrativeAuditEntry = {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: IllustrativeAuditAction;
  module: IllustrativeAuditModule;
  details: string;
  ipAddress: string;
  status: AuditStatus;
  severity: AuditSeverity;
};

const MED_NAMES = [
  'Paracetamol 500mg',
  'Amoxicillin 250mg',
  'Metformin 500mg',
  'Amlodipine 5mg',
  'Ibuprofen 400mg',
];

const IP_POOL = [
  '197.210.45.12',
  '197.210.45.15',
  '197.210.45.18',
  '197.210.45.22',
  '197.210.45.30',
  '197.210.45.41',
  '197.210.45.99',
];

type Template = {
  action: IllustrativeAuditAction;
  module: IllustrativeAuditModule;
  detail: (n: number) => string;
  status: AuditStatus;
  severity: AuditSeverity;
  unknownUser?: boolean;
};

const TEMPLATES: Template[] = [
  {
    action: 'Logged in',
    module: 'Authentication',
    detail: () => 'User logged in successfully',
    status: 'Success',
    severity: 'normal',
  },
  {
    action: 'Logged out',
    module: 'Authentication',
    detail: () => 'User logged out',
    status: 'Success',
    severity: 'normal',
  },
  {
    action: 'Viewed',
    module: 'Patient Records',
    detail: (n) => `Viewed patient record ID: PT-${String(1000 + n).padStart(7, '0')}`,
    status: 'Success',
    severity: 'normal',
  },
  {
    action: 'Created',
    module: 'Appointment',
    detail: (n) => `Created appointment APT-${String(900 + n).padStart(6, '0')}`,
    status: 'Success',
    severity: 'normal',
  },
  {
    action: 'Updated',
    module: 'Medication',
    detail: (n) => `Updated medication ${MED_NAMES[n % MED_NAMES.length]}`,
    status: 'Success',
    severity: 'normal',
  },
  {
    action: 'Deleted',
    module: 'Lab Results',
    detail: (n) => `Deleted lab result LR-${String(3000 + n).padStart(6, '0')}`,
    status: 'Success',
    severity: 'normal',
  },
  {
    action: 'Exported',
    module: 'Reports',
    detail: () => 'Exported Patient List Report, Format: PDF',
    status: 'Success',
    severity: 'normal',
  },
  {
    action: 'Login Failed',
    module: 'Authentication',
    detail: () => 'Invalid password attempt',
    status: 'Failed',
    severity: 'critical',
    unknownUser: true,
  },
  {
    action: 'Updated',
    module: 'User Management',
    detail: (n) => `Updated user role for ${MOCK_USERS[(n + 3) % MOCK_USERS.length]!.name}`,
    status: 'Success',
    severity: 'normal',
  },
  {
    action: 'Viewed',
    module: 'Billing',
    detail: (n) => `Viewed invoice INV-${String(7000 + n).padStart(7, '0')}`,
    status: 'Success',
    severity: 'normal',
  },
  {
    action: 'Login Failed',
    module: 'Authentication',
    detail: () => 'Unauthorized access attempt',
    status: 'Failed',
    severity: 'critical',
    unknownUser: true,
  },
  {
    action: 'Login Failed',
    module: 'Authentication',
    detail: () => 'Multiple failed login attempts',
    status: 'Failed',
    severity: 'critical',
    unknownUser: true,
  },
  {
    action: 'Viewed',
    module: 'Patient Records',
    detail: () => 'Invalid permission access',
    status: 'Failed',
    severity: 'critical',
  },
  {
    action: 'Created',
    module: 'Reports',
    detail: () => 'Suspicious activity detected',
    status: 'Failed',
    severity: 'critical',
  },
];

function generateEntries(): IllustrativeAuditEntry[] {
  const entries: IllustrativeAuditEntry[] = [];
  const totalDays = 45;
  const perDay = 4;
  let idx = 0;
  for (let day = 0; day < totalDays; day++) {
    for (let slot = 0; slot < perDay; slot++) {
      const template = TEMPLATES[idx % TEMPLATES.length]!;
      const user = template.unknownUser ? null : MOCK_USERS[idx % MOCK_USERS.length]!;
      const hour = 8 + ((slot * 3) % 12);
      const minute = (idx * 7) % 60;
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(hour, minute, 0, 0);
      entries.push({
        id: `aud-${String(idx + 1).padStart(5, '0')}`,
        timestamp: date.toISOString(),
        userName: user ? user.name : 'Unknown User',
        userRole: user ? user.role : 'Guest',
        action: template.action,
        module: template.module,
        details: template.detail(idx),
        ipAddress: IP_POOL[idx % IP_POOL.length]!,
        status: template.status,
        severity: template.severity,
      });
      idx += 1;
    }
  }
  return entries;
}

export const ILLUSTRATIVE_AUDIT_ENTRIES: IllustrativeAuditEntry[] = generateEntries();
