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
  pharmacyReportsAdr: '/pharmacy/reports/adr',

  // Lab sub-routes
  labOrders: '/lab/orders',
  labSamples: '/lab/samples',
  labResults: '/lab/results',
  labBloodBank: '/lab/blood-bank',

  // Laboratory workspace sub-routes (Lab Scientist/Technician persona — deliberately
  // /laboratory/*, distinct from the doctor-facing /lab/* routes above, per SYS-017)
  laboratory: '/laboratory',
  // Laboratory Operations
  laboratoryOrders: '/laboratory/orders',
  laboratorySampleCollection: '/laboratory/sample-collection',
  laboratorySampleReception: '/laboratory/sample-reception',
  laboratorySampleTracking: '/laboratory/sample-tracking',
  laboratoryTestWorkQueue: '/laboratory/test-work-queue',
  laboratoryResultEntry: '/laboratory/result-entry',
  laboratoryResultVerification: '/laboratory/result-verification',
  laboratoryPublishedResults: '/laboratory/published-results',
  laboratoryCriticalResults: '/laboratory/critical-results',
  // Patient Records
  laboratoryHistory: '/laboratory/history',
  laboratoryClinicalTimeline: '/laboratory/clinical-timeline',
  // Quality Management
  laboratoryQualityControl: '/laboratory/quality-control',
  laboratoryEquipmentManagement: '/laboratory/equipment-management',
  laboratoryReagentManagement: '/laboratory/reagent-management',
  // Inventory
  laboratoryInventory: '/laboratory/inventory',
  laboratoryStockReceiving: '/laboratory/stock-receiving',
  laboratoryReagentConsumption: '/laboratory/reagent-consumption',
  laboratoryBatchManagement: '/laboratory/batch-management',
  laboratoryExpiryManagement: '/laboratory/expiry-management',
  laboratoryProcurementRequests: '/laboratory/procurement-requests',
  laboratorySuppliers: '/laboratory/suppliers',
  // Reports
  laboratoryReports: '/laboratory/reports',
  laboratorySampleReports: '/laboratory/reports/samples',
  laboratoryTatReports: '/laboratory/reports/turnaround-time',
  laboratoryQcReports: '/laboratory/reports/quality-control',
  laboratoryEquipmentReports: '/laboratory/reports/equipment',

  // Emergency Department workspace sub-routes (Emergency Nurse/Doctor persona)
  // Triage & Patient Flow
  emergencyPatientQueue: '/emergency/patient-queue',
  emergencyTriageAssessment: '/emergency/triage-assessment',
  emergencyBedAssignment: '/emergency/bed-assignment',
  emergencyTrackingBoard: '/emergency/tracking-board',
  emergencyObservationUnit: '/emergency/observation-unit',
  // Emergency Care
  emergencyConsultation: '/emergency/consultation',
  emergencyMedicationOrders: '/emergency/medication-orders',
  emergencyProcedures: '/emergency/procedures',
  emergencyOrdersManagement: '/emergency/orders-management',
  emergencyClinicalNotes: '/emergency/clinical-notes',
  // Diagnostics
  emergencyDiagnosticRequests: '/emergency/diagnostic-requests',
  emergencyResultsReview: '/emergency/results-review',
  emergencyCriticalAlerts: '/emergency/critical-alerts',
  // Patient Records
  emergencyPatientSearch: '/emergency/patient-search',
  emergencyVisitHistory: '/emergency/visit-history',
  emergencyClinicalTimeline: '/emergency/clinical-timeline',
  emergencyAllergiesAlerts: '/emergency/allergies-alerts',
  // Reports
  emergencyReports: '/emergency/reports',
  emergencyWaitingTimeReports: '/emergency/reports/waiting-time',
  emergencyTriagePerformanceReports: '/emergency/reports/triage-performance',
  // Schedule & Workforce
  emergencyWorkforceManagement: '/emergency/workforce-management',
  emergencyMySchedule: '/emergency/my-schedule',
  emergencyShiftHandover: '/emergency/shift-handover',

  // Billing sub-routes
  billingCharges: '/billing/charges',
  billingAccounts: '/billing/accounts',
  billingInvoices: '/billing/invoices',
  billingPayments: '/billing/payments',
  billingRefunds: '/billing/refunds',
  billingRevenue: '/billing/revenue',
  billingRevenueByDepartment: '/billing/revenue/by-department',
  billingRevenueByService: '/billing/revenue/by-service',
  billingReconciliation: '/billing/reconciliation',
  billingOutstanding: '/billing/outstanding',
  billingReports: '/billing/reports',
  billingReportsPayments: '/billing/reports/payments',
  billingReportsRevenue: '/billing/reports/revenue',
  billingWorkforceManagement: '/billing/workforce-management',
  billingMySchedule: '/billing/my-schedule',
  billingShiftHandover: '/billing/shift-handover',

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
