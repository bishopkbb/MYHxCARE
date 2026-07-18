/**
 * Mock fixtures for the Medical Records Reports screen.
 * Swap out by pointing hooks to real analytics endpoints in Phase 6.
 */

export type ReportPeriod = 'this-week' | 'this-month' | 'this-quarter';

export const REPORT_PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'this-quarter', label: 'This Quarter' },
];

export type TrendDirection = 'up' | 'down';

export type ReportStat = {
  label: string;
  value: string;
  delta: string;
  direction: TrendDirection;
};

export const MEDICAL_RECORDS_REPORT_STATS: Record<ReportPeriod, ReportStat[]> = {
  'this-week': [
    { label: 'Records Retrieved', value: '186', delta: '+9%', direction: 'up' },
    { label: 'Avg. Turnaround Time', value: '4.2 hrs', delta: '-11%', direction: 'up' },
    { label: 'Documents Uploaded', value: '112', delta: '+15%', direction: 'up' },
    { label: 'Pending Requests', value: '8', delta: '+3%', direction: 'down' },
  ],
  'this-month': [
    { label: 'Records Retrieved', value: '742', delta: '+7%', direction: 'up' },
    { label: 'Avg. Turnaround Time', value: '4.8 hrs', delta: '-6%', direction: 'up' },
    { label: 'Documents Uploaded', value: '486', delta: '+12%', direction: 'up' },
    { label: 'Pending Requests', value: '8', delta: '-10%', direction: 'up' },
  ],
  'this-quarter': [
    { label: 'Records Retrieved', value: '2,315', delta: '+13%', direction: 'up' },
    { label: 'Avg. Turnaround Time', value: '5.1 hrs', delta: '-4%', direction: 'up' },
    { label: 'Documents Uploaded', value: '1,540', delta: '+18%', direction: 'up' },
    { label: 'Pending Requests', value: '8', delta: '-2%', direction: 'up' },
  ],
};

// ── Records Retrieved bar chart ──────────────────────────────────────────────

export type RetrievalBucket = { label: string; count: number };

export const RECORDS_RETRIEVED: Record<ReportPeriod, RetrievalBucket[]> = {
  'this-week': [
    { label: 'Mon', count: 22 },
    { label: 'Tue', count: 31 },
    { label: 'Wed', count: 27 },
    { label: 'Thu', count: 35 },
    { label: 'Fri', count: 29 },
    { label: 'Sat', count: 12 },
    { label: 'Sun', count: 6 },
  ],
  'this-month': [
    { label: 'Wk 1', count: 168 },
    { label: 'Wk 2', count: 182 },
    { label: 'Wk 3', count: 175 },
    { label: 'Wk 4', count: 217 },
  ],
  'this-quarter': [
    { label: 'Apr', count: 690 },
    { label: 'May', count: 745 },
    { label: 'Jun', count: 880 },
  ],
};

// ── Records by Type donut chart ──────────────────────────────────────────────

export type RecordTypeSlice = { label: string; value: number; color: string };

export const RECORDS_BY_TYPE: Record<ReportPeriod, RecordTypeSlice[]> = {
  'this-week': [
    { label: 'Consultation', value: 74, color: '#00B4D8' },
    { label: 'Laboratory', value: 52, color: '#3B82F6' },
    { label: 'Prescription', value: 38, color: '#8B5CF6' },
    { label: 'Referral', value: 22, color: '#F59E0B' },
  ],
  'this-month': [
    { label: 'Consultation', value: 298, color: '#00B4D8' },
    { label: 'Laboratory', value: 211, color: '#3B82F6' },
    { label: 'Prescription', value: 156, color: '#8B5CF6' },
    { label: 'Referral', value: 77, color: '#F59E0B' },
  ],
  'this-quarter': [
    { label: 'Consultation', value: 940, color: '#00B4D8' },
    { label: 'Laboratory', value: 668, color: '#3B82F6' },
    { label: 'Prescription', value: 489, color: '#8B5CF6' },
    { label: 'Referral', value: 218, color: '#F59E0B' },
  ],
};

// ── Department activity table ────────────────────────────────────────────────

export type DepartmentActivityRow = {
  department: string;
  requestsReceived: number;
  documentsUploaded: number;
  avgTurnaround: string;
  fulfillmentRate: string;
};

export const DEPARTMENT_ACTIVITY: Record<ReportPeriod, DepartmentActivityRow[]> = {
  'this-week': [
    {
      department: 'General Outpatient Clinic',
      requestsReceived: 18,
      documentsUploaded: 34,
      avgTurnaround: '3.1 hrs',
      fulfillmentRate: '94%',
    },
    {
      department: 'Emergency Department',
      requestsReceived: 9,
      documentsUploaded: 15,
      avgTurnaround: '1.4 hrs',
      fulfillmentRate: '100%',
    },
    {
      department: 'Radiology',
      requestsReceived: 6,
      documentsUploaded: 11,
      avgTurnaround: '5.2 hrs',
      fulfillmentRate: '89%',
    },
    {
      department: 'Surgery',
      requestsReceived: 5,
      documentsUploaded: 8,
      avgTurnaround: '6.8 hrs',
      fulfillmentRate: '86%',
    },
    {
      department: 'Insurance / Legal',
      requestsReceived: 4,
      documentsUploaded: 0,
      avgTurnaround: '18.5 hrs',
      fulfillmentRate: '75%',
    },
  ],
  'this-month': [
    {
      department: 'General Outpatient Clinic',
      requestsReceived: 72,
      documentsUploaded: 140,
      avgTurnaround: '3.4 hrs',
      fulfillmentRate: '93%',
    },
    {
      department: 'Emergency Department',
      requestsReceived: 34,
      documentsUploaded: 58,
      avgTurnaround: '1.6 hrs',
      fulfillmentRate: '99%',
    },
    {
      department: 'Radiology',
      requestsReceived: 25,
      documentsUploaded: 44,
      avgTurnaround: '5.5 hrs',
      fulfillmentRate: '90%',
    },
    {
      department: 'Surgery',
      requestsReceived: 19,
      documentsUploaded: 31,
      avgTurnaround: '7.1 hrs',
      fulfillmentRate: '85%',
    },
    {
      department: 'Insurance / Legal',
      requestsReceived: 16,
      documentsUploaded: 3,
      avgTurnaround: '19.2 hrs',
      fulfillmentRate: '78%',
    },
  ],
  'this-quarter': [
    {
      department: 'General Outpatient Clinic',
      requestsReceived: 224,
      documentsUploaded: 431,
      avgTurnaround: '3.6 hrs',
      fulfillmentRate: '92%',
    },
    {
      department: 'Emergency Department',
      requestsReceived: 108,
      documentsUploaded: 176,
      avgTurnaround: '1.7 hrs',
      fulfillmentRate: '98%',
    },
    {
      department: 'Radiology',
      requestsReceived: 79,
      documentsUploaded: 138,
      avgTurnaround: '5.8 hrs',
      fulfillmentRate: '91%',
    },
    {
      department: 'Surgery',
      requestsReceived: 61,
      documentsUploaded: 97,
      avgTurnaround: '7.4 hrs',
      fulfillmentRate: '84%',
    },
    {
      department: 'Insurance / Legal',
      requestsReceived: 49,
      documentsUploaded: 9,
      avgTurnaround: '20.1 hrs',
      fulfillmentRate: '79%',
    },
  ],
};
