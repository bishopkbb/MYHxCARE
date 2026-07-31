export const PERMISSIONS = {
  PATIENTS_READ: 'patients:read',
  PATIENTS_WRITE: 'patients:write',

  ENCOUNTERS_READ: 'encounters:read',
  // ENCOUNTERS_WRITE gates only real encounter-lifecycle actions (consultation
  // completion, "Start Consultation"). The other clinical write actions that
  // used to share this one flag (SYS-008) now have their own permission below.
  ENCOUNTERS_WRITE: 'encounters:write',

  CLINICAL_NOTES_WRITE: 'clinical_notes:write',
  NURSING_ASSESSMENT_WRITE: 'nursing_assessment:write',
  LAB_RESULTS_WRITE: 'lab_results:write',
  VITALS_WRITE: 'vitals:write',
  MEDICATION_ADMIN_WRITE: 'medication_admin:write',
  ADMISSIONS_WRITE: 'admissions:write',
  DISCHARGES_WRITE: 'discharges:write',
  CARE_PLANS_WRITE: 'care_plans:write',
  SHIFT_HANDOVER_WRITE: 'shift_handover:write',
  ANNOUNCEMENTS_WRITE: 'announcements:write',

  PRESCRIPTIONS_WRITE: 'prescriptions:write',

  LAB_ORDERS_READ: 'lab_orders:read',
  LAB_ORDERS_WRITE: 'lab_orders:write',

  PHARMACY_READ: 'pharmacy:read',
  PHARMACY_DISPENSE: 'pharmacy:dispense',
  PHARMACY_ADR_WRITE: 'pharmacy:adr:write',

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
