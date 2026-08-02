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
  messages: '/messages',
  announcements: '/announcements',
  referrals: '/referrals',
  mySchedule: '/my-schedule',
  medicalRecords: '/medical-records',
  registration: '/registration',

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
  // Prescription Management
  pharmacyPrescriptionQueue: '/pharmacy/prescriptions/queue',
  pharmacyPrescriptionDetails: '/pharmacy/prescriptions/details',
  pharmacyActivePrescriptions: '/pharmacy/prescriptions/active',
  pharmacyDispense: '/pharmacy/dispense',
  pharmacyPickupQueue: '/pharmacy/pickup-queue',
  pharmacyDispensingHistory: '/pharmacy/dispensing-history',
  pharmacyRefillRequests: '/pharmacy/refill-requests',
  pharmacyControlledDrugs: '/pharmacy/controlled-drugs',
  // Inventory Management
  pharmacyInventory: '/pharmacy/inventory',
  pharmacyStockReceiving: '/pharmacy/stock-receiving',
  pharmacyTransfers: '/pharmacy/transfers',
  pharmacyStockAdjustments: '/pharmacy/stock-adjustments',
  pharmacyBatchManagement: '/pharmacy/batch-management',
  pharmacyExpiry: '/pharmacy/expiry',
  pharmacyLowStockAlerts: '/pharmacy/low-stock-alerts',
  pharmacyProcurementRequests: '/pharmacy/procurement-requests',
  pharmacySuppliers: '/pharmacy/suppliers',
  // Clinical Pharmacy
  pharmacyAdr: '/pharmacy/adr',
  // Operations
  pharmacyAuditTrail: '/pharmacy/audit-trail',
  pharmacyMedicationReturns: '/pharmacy/medication-returns',
  pharmacyQueueMonitor: '/pharmacy/queue-monitor',
  // Schedule & Workforce
  pharmacyWorkforce: '/pharmacy/workforce',
  pharmacyMySchedule: '/pharmacy/my-schedule',
  pharmacyShiftHandover: '/pharmacy/shift-handover',
  // Reports
  pharmacyReportsPrescriptions: '/pharmacy/reports/prescriptions',
  pharmacyReportsDispensing: '/pharmacy/reports/dispensing',
  pharmacyReportsInventory: '/pharmacy/reports/inventory',
  pharmacyReportsStockMovement: '/pharmacy/reports/stock-movement',
  pharmacyReportsExpiry: '/pharmacy/reports/expiry',
  pharmacyReportsProcurement: '/pharmacy/reports/procurement',

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

  // Duty Roster sub-routes
  dutyRosterCalendar: '/duty-roster/roster',
  dutyRosterTemplates: '/duty-roster/templates',
  dutyRosterOnCall: '/duty-roster/on-call',
  dutyRosterAssignments: '/duty-roster/assignments',
  dutyRosterAnalytics: '/duty-roster/analytics',

  // Medical Records sub-routes
  medicalRecordsDashboard: '/medical-records/dashboard',
  medicalRecordsPatient: '/medical-records/patient',
  medicalRecordsVisitHistory: '/medical-records/visit-history',
  medicalRecordsClinicalDocuments: '/medical-records/clinical-documents',
  medicalRecordsDocumentUpload: '/medical-records/document-upload',
  medicalRecordsArchived: '/medical-records/archived',
  medicalRecordsRequests: '/medical-records/requests',
  medicalRecordsReports: '/medical-records/reports',
  medicalRecordsPatientStatistics: '/medical-records/patient-statistics',
  medicalRecordsWorkforceManagement: '/medical-records/workforce-management',
  medicalRecordsMessages: '/medical-records/messages',
  medicalRecordsNotifications: '/medical-records/notifications',
  medicalRecordsAnnouncements: '/medical-records/announcements',
  medicalRecordsAccountProfile: '/medical-records/account/profile',
  medicalRecordsAccountSettings: '/medical-records/account/settings',

  // Nurse workspace
  nurse: '/nurse',
  nurseMySchedule: '/nurse/my-schedule',
  nursePatientQueue: '/nurse/patient-queue',
  nurseMyPatients: '/nurse/my-patients',
  nursePatientRecord: (id: string) => `/nurse/my-patients/${id}`,
  nurseVitalSigns: '/nurse/vital-signs',
  nurseNursingAssessment: '/nurse/nursing-assessment',
  nurseMedicationAdministration: '/nurse/medication-administration',
  nurseNursingNotes: '/nurse/nursing-notes',
  nurseCarePlans: '/nurse/care-plans',
  nurseWardCensus: '/nurse/ward-census',
  nurseAdmissions: '/nurse/admissions',
  nurseDischarges: '/nurse/discharges',
  nurseObservationCharts: '/nurse/observation-charts',
  nurseLaboratory: '/nurse/laboratory',
  nurseClinicalTimeline: '/nurse/clinical-timeline',
  nurseShiftHandover: '/nurse/shift-handover',
  nurseWorkforceManagement: '/nurse/workforce-management',
  nurseEmergencyResponse: '/nurse/emergency-response',
  nurseMessages: '/nurse/messages',
  nurseNotifications: '/nurse/notifications',
  nurseAnnouncements: '/nurse/announcements',
  nurseReports: '/nurse/reports',
  nurseAccountProfile: '/nurse/account/profile',
  nurseAccountSettings: '/nurse/account/settings',

  // Registration sub-routes
  registrationRegister: '/registration/register',
  registrationDirectory: '/registration/directory',
  registrationProfile: '/registration/profile',
  registrationCheckIn: '/registration/check-in',
  // Queue Management moved into the nurse workspace (merged into Patient
  // Queue) — kept here pointing at its new home so Check-In/Emergency
  // Registration's existing "View Queue" links keep working unchanged.
  registrationQueue: '/nurse/patient-queue',
  registrationAppointments: '/registration/appointments',
  registrationEmergency: '/registration/emergency',
  registrationInsurance: '/registration/insurance',
  registrationReferrals: '/registration/referrals',
  registrationConsentForms: '/registration/consent-forms',
  registrationCardPrinting: '/registration/card-printing',
  registrationReports: '/registration/reports',
  registrationAttendance: '/registration/attendance',
  registrationWorkforceManagement: '/registration/workforce-management',
  registrationMyShift: '/registration/my-shift',
  registrationMessages: '/registration/messages',
  registrationNotifications: '/registration/notifications',
  registrationAnnouncements: '/registration/announcements',
  registrationAccountProfile: '/registration/account/profile',
  registrationAccountSettings: '/registration/account/settings',

  // Settings
  settings: '/settings',
  settingsSessions: '/settings/sessions',
  settingsDevices: '/settings/devices',
  settingsAuditLog: '/settings/audit-log',
} as const;
