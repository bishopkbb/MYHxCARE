/**
 * Mock fixtures for Financial Reports (`/admin/reports/financial`) — the
 * financial report type catalog and Recent Financial Reports log. Confirmed
 * by research: no financial report-catalog shape (name/type/generated-at)
 * exists anywhere else in this codebase, so this is genuinely new, honestly
 * illustrative configuration data, the same category as Operational Reports'
 * own `REPORT_DEFINITIONS`/`RECENT_REPORTS` but a separate file since it's a
 * different report domain, not a reuse. The screen's actual metrics (stat
 * cards, both donuts, the trend chart, the Financial Summary table) are
 * computed live from real billing stores elsewhere, not from this file.
 *
 * Swap out by pointing hooks to a real report-catalog/scheduling endpoint in
 * Phase 6.
 */

export type FinancialReportType = {
  id: string;
  name: string;
  description: string;
};

export const FINANCIAL_REPORT_TYPES: FinancialReportType[] = [
  {
    id: 'fin-income-statement',
    name: 'Income Statement Report',
    description: 'Revenue, expenses, and net income for the period',
  },
  {
    id: 'fin-cash-flow',
    name: 'Cash Flow Statement',
    description: 'Cash collected and outstanding across the period',
  },
  {
    id: 'fin-receivables-aging',
    name: 'Receivables Aging Report',
    description: 'Outstanding balances grouped by age',
  },
  {
    id: 'fin-payment-collection',
    name: 'Payment Collection Report',
    description: 'Collections broken down by payment method',
  },
  {
    id: 'fin-expense-summary',
    name: 'Expense Summary Report',
    description: 'Estimated operating expenses for the period',
  },
];

export type RecentFinancialReportStatus = 'Completed' | 'Processing';

export type RecentFinancialReport = {
  id: string;
  name: string;
  generatedAt: string;
  status: RecentFinancialReportStatus;
  format: 'CSV' | 'PDF';
};

export const RECENT_FINANCIAL_REPORTS: RecentFinancialReport[] = [
  {
    id: 'rfr-1',
    name: 'Income Statement Report',
    generatedAt: '2026-08-20T08:00:00+01:00',
    status: 'Completed',
    format: 'PDF',
  },
  {
    id: 'rfr-2',
    name: 'Cash Flow Statement',
    generatedAt: '2026-08-20T08:00:00+01:00',
    status: 'Completed',
    format: 'CSV',
  },
  {
    id: 'rfr-3',
    name: 'Receivables Aging Report',
    generatedAt: '2026-08-19T08:00:00+01:00',
    status: 'Completed',
    format: 'PDF',
  },
  {
    id: 'rfr-4',
    name: 'Payment Collection Report',
    generatedAt: '2026-08-19T08:00:00+01:00',
    status: 'Completed',
    format: 'CSV',
  },
  {
    id: 'rfr-5',
    name: 'Expense Summary Report',
    generatedAt: '2026-08-18T08:00:00+01:00',
    status: 'Completed',
    format: 'PDF',
  },
];
