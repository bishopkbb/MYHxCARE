/**
 * Mock fixtures for the Nursing Reports screen.
 * Swap out by pointing hooks to a real reporting endpoint in Phase 6.
 */

export type ReportCategory =
  'Medication' | 'Workforce' | 'Ward' | 'Clinical' | 'Admissions' | 'Discharges' | 'Observation';

export const CATEGORY_OPTIONS: ReportCategory[] = [
  'Medication',
  'Workforce',
  'Ward',
  'Clinical',
  'Admissions',
  'Discharges',
  'Observation',
];

export type ReportStat = { label: string; value: string };

export type TwoColRow = { label: string; value: string };

export type MedicationAdminReport = {
  id: 'medication-admin';
  category: ReportCategory;
  title: string;
  subtitle: string;
  stats: [ReportStat, ReportStat, ReportStat];
  tableTitle: string;
  columns: [string, string];
  rows: TwoColRow[];
  fullRows: TwoColRow[];
};

export type ShiftRow = {
  shift: string;
  time: string;
  staffInCharge: string;
  status: 'Completed' | 'In Progress' | 'Pending';
};

export type ShiftReport = {
  id: 'shift';
  category: ReportCategory;
  title: string;
  subtitle: string;
  stats: [ReportStat, ReportStat, ReportStat];
  tableTitle: string;
  rows: ShiftRow[];
};

export type BedStatusSlice = { label: string; count: number; percent: number; color: string };

export type WardCensusReport = {
  id: 'ward-census';
  category: ReportCategory;
  title: string;
  subtitle: string;
  stats: [ReportStat, ReportStat, ReportStat];
  chartTitle: string;
  slices: BedStatusSlice[];
};

export type VitalSignsReport = {
  id: 'vitals';
  category: ReportCategory;
  title: string;
  subtitle: string;
  stats: [ReportStat, ReportStat, ReportStat];
  tableTitle: string;
  columns: [string, string];
  rows: TwoColRow[];
};

export type WardBar = { ward: string; count: number };

export type AdmissionReport = {
  id: 'admission';
  category: ReportCategory;
  title: string;
  subtitle: string;
  stats: [ReportStat, ReportStat, ReportStat];
  chartTitle: string;
  bars: WardBar[];
};

export type DischargeReport = {
  id: 'discharge';
  category: ReportCategory;
  title: string;
  subtitle: string;
  stats: [ReportStat, ReportStat, ReportStat];
  chartTitle: string;
  bars: WardBar[];
};

export type ObservationReport = {
  id: 'observation';
  category: ReportCategory;
  title: string;
  subtitle: string;
  stats: [ReportStat, ReportStat, ReportStat];
  tableTitle: string;
  columns: [string, string];
  rows: TwoColRow[];
};

export type DueMedicationRow = { time: string; medication: string; patients: number };

export type MedicationDueReport = {
  id: 'medication-due';
  category: ReportCategory;
  title: string;
  subtitle: string;
  stats: [ReportStat, ReportStat, ReportStat];
  tableTitle: string;
  rows: DueMedicationRow[];
};

export type NursingReport =
  | MedicationAdminReport
  | ShiftReport
  | WardCensusReport
  | VitalSignsReport
  | AdmissionReport
  | DischargeReport
  | ObservationReport
  | MedicationDueReport;

export const MEDICATION_ADMIN_REPORT: MedicationAdminReport = {
  id: 'medication-admin',
  category: 'Medication',
  title: 'Medication Administration Report',
  subtitle: 'Summary of all medications administered to patients.',
  stats: [
    { label: 'Total Administered', value: '128' },
    { label: 'On Time', value: '112 (87%)' },
    { label: 'Overdue', value: '16 (13%)' },
  ],
  tableTitle: 'Top 5 Medications',
  columns: ['Medication', 'Count'],
  rows: [
    { label: 'Paracetamol 1g', value: '32' },
    { label: 'Ceftriaxone 1g', value: '28' },
    { label: 'Amlodipine 5mg', value: '18' },
    { label: 'Metformin 500mg', value: '16' },
    { label: 'Salbutamol 2.5mg', value: '14' },
  ],
  fullRows: [
    { label: 'Paracetamol 1g', value: '32' },
    { label: 'Ceftriaxone 1g', value: '28' },
    { label: 'Amlodipine 5mg', value: '18' },
    { label: 'Metformin 500mg', value: '16' },
    { label: 'Salbutamol 2.5mg', value: '14' },
    { label: 'Omeprazole 40mg', value: '9' },
    { label: 'Metronidazole 400mg', value: '7' },
    { label: 'Furosemide 40mg', value: '4' },
  ],
};

export const SHIFT_REPORT: ShiftReport = {
  id: 'shift',
  category: 'Workforce',
  title: 'Shift Report',
  subtitle: 'Summary of shift activities and handover information.',
  stats: [
    { label: 'Total Shifts', value: '3' },
    { label: 'Completed', value: '3 (100%)' },
    { label: 'Pending Handover', value: '0 (0%)' },
  ],
  tableTitle: 'Shifts',
  rows: [
    {
      shift: 'Day Shift',
      time: '07:00 AM - 03:00 PM',
      staffInCharge: 'Nurse Grace E.',
      status: 'Completed',
    },
    {
      shift: 'Evening Shift',
      time: '03:00 PM - 11:00 PM',
      staffInCharge: 'Nurse Aisha I.',
      status: 'Completed',
    },
    {
      shift: 'Night Shift',
      time: '11:00 PM - 07:00 AM',
      staffInCharge: 'Nurse Ibrahim B.',
      status: 'Completed',
    },
  ],
};

export const WARD_CENSUS_REPORT: WardCensusReport = {
  id: 'ward-census',
  category: 'Ward',
  title: 'Ward Census Report',
  subtitle: 'Overview of bed occupancy and patient distribution.',
  stats: [
    { label: 'Total Beds', value: '28' },
    { label: 'Occupied', value: '22 (78%)' },
    { label: 'Available', value: '5 (18%)' },
  ],
  chartTitle: 'Bed Status',
  slices: [
    { label: 'Occupied', count: 22, percent: 78, color: '#3B82F6' },
    { label: 'Available', count: 5, percent: 18, color: '#22C55E' },
    { label: 'Cleaning', count: 1, percent: 4, color: '#EF4444' },
  ],
};

export const VITAL_SIGNS_REPORT: VitalSignsReport = {
  id: 'vitals',
  category: 'Clinical',
  title: 'Vital Signs Report',
  subtitle: 'Summary of vital signs recorded for patients.',
  stats: [
    { label: 'Total Records', value: '156' },
    { label: 'Normal', value: '110 (70%)' },
    { label: 'Abnormal', value: '46 (30%)' },
  ],
  tableTitle: 'Vital Signs Overview',
  columns: ['Parameter', 'Avg. Value'],
  rows: [
    { label: 'Temperature', value: '37.2 °C' },
    { label: 'Pulse', value: '82 bpm' },
    { label: 'Respiration', value: '20 /min' },
    { label: 'Blood Pressure', value: '120/80 mmHg' },
    { label: 'SpO₂', value: '95 %' },
  ],
};

export const ADMISSION_REPORT: AdmissionReport = {
  id: 'admission',
  category: 'Admissions',
  title: 'Admission Report',
  subtitle: 'Summary of all patient admissions.',
  stats: [
    { label: 'Total Admissions', value: '12' },
    { label: 'Male', value: '7 (58%)' },
    { label: 'Female', value: '5 (42%)' },
  ],
  chartTitle: 'Admissions by Ward',
  bars: [
    { ward: '12-A', count: 5 },
    { ward: '12-B', count: 3 },
    { ward: '12-C', count: 2 },
    { ward: '12-D', count: 2 },
  ],
};

export const DISCHARGE_REPORT: DischargeReport = {
  id: 'discharge',
  category: 'Discharges',
  title: 'Discharge Report',
  subtitle: 'Summary of all patient discharges.',
  stats: [
    { label: 'Total Discharges', value: '8' },
    { label: 'Today', value: '2' },
    { label: 'Average LOS', value: '4.6 days' },
  ],
  chartTitle: 'Discharges by Ward',
  bars: [
    { ward: '12-A', count: 4 },
    { ward: '12-B', count: 2 },
    { ward: '12-C', count: 1 },
    { ward: '12-D', count: 1 },
  ],
};

export const OBSERVATION_REPORT: ObservationReport = {
  id: 'observation',
  category: 'Observation',
  title: 'Patient Observation Report',
  subtitle: 'Summary of patient observations and monitoring.',
  stats: [
    { label: 'Total Observations', value: '64' },
    { label: 'Completed', value: '60 (94%)' },
    { label: 'Pending', value: '4 (6%)' },
  ],
  tableTitle: 'Top Observation Types',
  columns: ['Type', 'Count'],
  rows: [
    { label: 'Pain Assessment', value: '18' },
    { label: 'Fluid Balance', value: '14' },
    { label: 'Neurological Check', value: '12' },
    { label: 'Wound Assessment', value: '10' },
    { label: 'Fall Risk Assessment', value: '10' },
  ],
};

export const MEDICATION_DUE_REPORT: MedicationDueReport = {
  id: 'medication-due',
  category: 'Medication',
  title: 'Medication Due Report',
  subtitle: 'Upcoming medications due for all patients.',
  stats: [
    { label: 'Due Now', value: '16' },
    { label: 'Due in 1 hr', value: '10' },
    { label: 'Due in 2 hr', value: '8' },
  ],
  tableTitle: 'Due Medications',
  rows: [
    { time: '08:00 AM', medication: 'Amlodipine 5mg', patients: 6 },
    { time: '08:30 AM', medication: 'Metformin 500mg', patients: 4 },
    { time: '09:00 AM', medication: 'Paracetamol 1g', patients: 8 },
    { time: '09:30 AM', medication: 'Ceftriaxone 1g', patients: 5 },
    { time: '10:00 AM', medication: 'Salbutamol 2.5mg', patients: 3 },
  ],
};

export const NURSING_REPORTS: NursingReport[] = [
  MEDICATION_ADMIN_REPORT,
  SHIFT_REPORT,
  WARD_CENSUS_REPORT,
  VITAL_SIGNS_REPORT,
  ADMISSION_REPORT,
  DISCHARGE_REPORT,
  OBSERVATION_REPORT,
  MEDICATION_DUE_REPORT,
];
