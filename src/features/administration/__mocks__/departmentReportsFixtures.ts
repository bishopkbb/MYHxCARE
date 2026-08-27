/**
 * Mock fixtures for Department Reports (`/admin/reports/department`) — the
 * department report catalog, Recent Department Reports log, and illustrative
 * Patient Satisfaction scores. Confirmed by research: no per-department
 * patient satisfaction concept exists anywhere in this codebase (the only
 * other satisfaction figure in the app is Emergency Reports' own static 88%
 * placeholder), so these ratings are honest illustrative data, the same
 * category as that precedent. The screen's other metrics (stat cards, Visits
 * by Department, Revenue by Department, % Change) are computed live from
 * real stores elsewhere, not from this file.
 *
 * Swap out by pointing hooks to a real report-catalog/scheduling endpoint and
 * a real patient-feedback store in Phase 6.
 */

export type DepartmentReportType = 'Performance' | 'Clinical' | 'Revenue' | 'Activity';

export type DepartmentReportDefinition = {
  id: string;
  name: string;
};

export const DEPARTMENT_REPORT_TYPES: DepartmentReportDefinition[] = [
  { id: 'dept-performance', name: 'Department Performance Report' },
  { id: 'dept-clinical-summary', name: 'Clinical Department Summary' },
  { id: 'dept-revenue', name: 'Revenue by Department Report' },
  { id: 'dept-activity', name: 'Department Activity Report' },
];

export type RecentDepartmentReportStatus = 'Completed' | 'Processing';

export type RecentDepartmentReport = {
  id: string;
  name: string;
  generatedAt: string;
  status: RecentDepartmentReportStatus;
  format: 'CSV' | 'PDF';
  reportType: DepartmentReportType;
};

export const RECENT_DEPARTMENT_REPORTS: RecentDepartmentReport[] = [
  {
    id: 'rdr-1',
    name: 'Department Performance Report',
    generatedAt: '2026-08-20T08:00:00+01:00',
    status: 'Completed',
    format: 'PDF',
    reportType: 'Performance',
  },
  {
    id: 'rdr-2',
    name: 'Clinical Department Summary',
    generatedAt: '2026-08-20T08:00:00+01:00',
    status: 'Completed',
    format: 'CSV',
    reportType: 'Clinical',
  },
  {
    id: 'rdr-3',
    name: 'Revenue by Department Report',
    generatedAt: '2026-08-19T08:00:00+01:00',
    status: 'Completed',
    format: 'PDF',
    reportType: 'Revenue',
  },
  {
    id: 'rdr-4',
    name: 'Department Activity Report',
    generatedAt: '2026-08-18T08:00:00+01:00',
    status: 'Completed',
    format: 'CSV',
    reportType: 'Activity',
  },
];

/** Illustrative only — no patient-feedback store exists anywhere in this
 * codebase to derive a real per-department rating from. */
export const ILLUSTRATIVE_SATISFACTION: Record<string, number> = {
  'Clinical / Consultation': 4.6,
  Pharmacy: 4.4,
  Laboratory: 4.2,
  'Nursing / Wards': 4.3,
  Emergency: 4.7,
  Radiology: 4.1,
  'Other Services': 4.2,
};
