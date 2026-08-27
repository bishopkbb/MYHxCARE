/**
 * Mock fixtures for Operational Reports (`/admin/reports`) — the report
 * catalog and Recent Reports log. Confirmed by research: nothing like a
 * report-definition (name/description/type/frequency/last-generated) shape
 * exists anywhere else in this codebase, so this is genuinely new,
 * honestly-illustrative configuration data, the same category as Quick
 * Actions or a nav menu, not a live operational signal. The screen's actual
 * metrics (stat cards, both donuts, the trend chart) are computed live from
 * real stores elsewhere, not from this file.
 *
 * Swap out by pointing hooks to a real report-catalog/scheduling endpoint in
 * Phase 6.
 */

export type ReportType = 'Patient' | 'Department' | 'Staff' | 'Service' | 'Appointment';

export const REPORT_TYPE_COLORS: Record<ReportType, { color: string; bg: string }> = {
  Patient: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Department: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Staff: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  Service: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  Appointment: { color: '#00B4D8', bg: 'rgba(0,180,216,0.1)' },
};

export type ReportFrequency = 'Daily' | 'Weekly' | 'Monthly';

export type ReportDefinition = {
  id: string;
  name: string;
  description: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  lastGeneratedAt: string;
};

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'rep-patient-volume',
    name: 'Patient Volume Report',
    description: 'Summary of patient visits and trends',
    reportType: 'Patient',
    frequency: 'Daily',
    lastGeneratedAt: '2026-08-20T08:00:00+01:00',
  },
  {
    id: 'rep-department-activity',
    name: 'Department Activity Report',
    description: 'Activity and performance by department',
    reportType: 'Department',
    frequency: 'Daily',
    lastGeneratedAt: '2026-08-20T08:00:00+01:00',
  },
  {
    id: 'rep-staff-activity',
    name: 'Staff Activity Report',
    description: 'Staff productivity and workload summary',
    reportType: 'Staff',
    frequency: 'Daily',
    lastGeneratedAt: '2026-08-20T08:00:00+01:00',
  },
  {
    id: 'rep-service-utilization',
    name: 'Service Utilization Report',
    description: 'Utilization rate of services and resources',
    reportType: 'Service',
    frequency: 'Weekly',
    lastGeneratedAt: '2026-08-19T09:00:00+01:00',
  },
  {
    id: 'rep-appointment-performance',
    name: 'Appointment Performance Report',
    description: 'Appointment status and trends',
    reportType: 'Appointment',
    frequency: 'Daily',
    lastGeneratedAt: '2026-08-20T08:00:00+01:00',
  },
  {
    id: 'rep-admissions-summary',
    name: 'Admissions Summary Report',
    description: 'Ward admissions and discharge trends',
    reportType: 'Patient',
    frequency: 'Weekly',
    lastGeneratedAt: '2026-08-18T08:00:00+01:00',
  },
  {
    id: 'rep-no-show',
    name: 'No-Show Trends Report',
    description: 'Missed appointment patterns by department',
    reportType: 'Appointment',
    frequency: 'Weekly',
    lastGeneratedAt: '2026-08-17T08:00:00+01:00',
  },
  {
    id: 'rep-staff-productivity',
    name: 'Staff Productivity Report',
    description: 'Consultations and procedures per staff member',
    reportType: 'Staff',
    frequency: 'Monthly',
    lastGeneratedAt: '2026-08-01T08:00:00+01:00',
  },
];

export type RecentReportStatus = 'Completed' | 'Processing';

export type RecentReport = {
  id: string;
  name: string;
  generatedAt: string;
  status: RecentReportStatus;
  format: 'CSV' | 'PDF';
};

export const RECENT_REPORTS: RecentReport[] = [
  {
    id: 'rr-1',
    name: 'Patient Volume Report',
    generatedAt: '2026-08-20T08:00:00+01:00',
    status: 'Completed',
    format: 'PDF',
  },
  {
    id: 'rr-2',
    name: 'Department Activity Report',
    generatedAt: '2026-08-20T08:00:00+01:00',
    status: 'Completed',
    format: 'CSV',
  },
  {
    id: 'rr-3',
    name: 'Service Utilization Report',
    generatedAt: '2026-08-18T08:00:00+01:00',
    status: 'Completed',
    format: 'PDF',
  },
  {
    id: 'rr-4',
    name: 'Appointment Performance Report',
    generatedAt: '2026-08-17T08:00:00+01:00',
    status: 'Completed',
    format: 'CSV',
  },
];
