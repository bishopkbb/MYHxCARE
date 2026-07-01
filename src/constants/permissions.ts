export const PERMISSIONS = {
  PATIENTS_READ: 'patients:read',
  PATIENTS_WRITE: 'patients:write',

  ENCOUNTERS_READ: 'encounters:read',
  ENCOUNTERS_WRITE: 'encounters:write',

  PRESCRIPTIONS_WRITE: 'prescriptions:write',

  LAB_ORDERS_READ: 'lab_orders:read',
  LAB_ORDERS_WRITE: 'lab_orders:write',

  PHARMACY_READ: 'pharmacy:read',
  PHARMACY_DISPENSE: 'pharmacy:dispense',

  EMERGENCY_READ: 'emergency:read',
  EMERGENCY_WRITE: 'emergency:write',

  WARDS_READ: 'wards:read',
  WARDS_WRITE: 'wards:write',

  BILLING_READ: 'billing:read',
  BILLING_WRITE: 'billing:write',

  REFERRALS_WRITE: 'referrals:write',

  DUTY_ROSTER_READ: 'duty_roster:read',
  DUTY_ROSTER_WRITE: 'duty_roster:write',

  NOTIFICATIONS_READ: 'notifications:read',

  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
