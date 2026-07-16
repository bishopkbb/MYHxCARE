export const ROUTES = {
  // Public
  login: '/login',
  passwordReset: '/password-reset',

  // HMS — top-level
  dashboard: '/dashboard',
  patients: '/patients',
  clinicalNotes: '/clinical-notes',
  reports: '/reports',
  profile: '/profile',
  encounters: '/encounters',
  pharmacy: '/pharmacy',
  lab: '/lab',
  billing: '/billing',
  emergency: '/emergency',
  wards: '/wards',
  dutyRoster: '/duty-roster',
  admin: '/admin',
  notifications: '/notifications',
  collaboration: '/collaboration',
  referrals: '/referrals',
  mySchedule: '/my-schedule',

  // Patients sub-routes
  patientProfile: (id: string) => `/patients/${id}`,
  patientFolder: (id: string) => `/patients/${id}/folder`,
  patientTimeline: (id: string) => `/patients/${id}/timeline`,
  patientReferral: (id: string) => `/patients/${id}/referral`,
  patientLabOrder: (id: string) => `/patients/${id}/lab-order`,
  patientPrescription: (id: string) => `/patients/${id}/prescription`,

  // Encounters sub-routes
  encounterWorkspace: (id: string) => `/encounters/${id}`,
  encounterNotes: (id: string) => `/encounters/${id}/notes`,
  encounterPrescriptions: (id: string) => `/encounters/${id}/prescriptions`,
  encounterOrders: (id: string) => `/encounters/${id}/orders`,

  // Pharmacy sub-routes
  pharmacyDispense: '/pharmacy/dispense',
  pharmacyInventory: '/pharmacy/inventory',
  pharmacyTransfers: '/pharmacy/transfers',

  // Lab sub-routes
  labOrders: '/lab/orders',
  labSamples: '/lab/samples',
  labResults: '/lab/results',
  labBloodBank: '/lab/blood-bank',

  // Billing sub-routes
  billingCharges: '/billing/charges',
  billingInvoices: '/billing/invoices',
  billingPayments: '/billing/payments',

  // Ward sub-routes
  wardBeds: (wardId: string) => `/wards/${wardId}/beds`,
  wardOccupancy: (wardId: string) => `/wards/${wardId}/occupancy`,

  // Settings
  settings: '/settings',
  settingsSessions: '/settings/sessions',
  settingsDevices: '/settings/devices',
  settingsAuditLog: '/settings/audit-log',
} as const;
