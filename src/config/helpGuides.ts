/**
 * Route-keyed user-guide registry for the HelpBeacon.
 *
 * Every HMS screen registers a guide describing its core features. The
 * HelpBeacon (bottom-right "?" launcher) resolves the guide for the current
 * pathname via resolveHelpGuide(). Screens without a specific guide fall
 * back to the general navigation guide — but every NEW screen should add
 * its own entry here as part of the definition of done.
 */

export type HelpGuideSection = {
  heading: string;
  body: string;
  steps?: string[];
};

export type HelpGuide = {
  id: string;
  title: string;
  intro: string;
  sections: HelpGuideSection[];
};

const GENERAL_GUIDE: HelpGuide = {
  id: 'general',
  title: 'Getting Around',
  intro:
    'MyHxCare HMS organises your work into modules listed in the left sidebar. What you see is determined by your permissions.',
  sections: [
    {
      heading: 'Navigation',
      body: 'Use the sidebar to move between modules. On desktop you can collapse it to an icon rail with the round toggle on its edge; on mobile open it with the menu button in the top bar.',
    },
    {
      heading: 'Search',
      body: 'The top-bar search finds patients, records, and results from anywhere in the application.',
    },
    {
      heading: 'Notifications',
      body: 'The bell icon shows unread alerts. Critical clinical alerts also appear directly on your dashboard.',
    },
    {
      heading: 'Time and dates',
      body: 'All times are shown in West Africa Time (WAT) using the 24-hour clock, and dates follow the DD/MM/YYYY format.',
    },
  ],
};

const DASHBOARD_GUIDE: HelpGuide = {
  id: 'dashboard',
  title: 'Clinical Dashboard',
  intro:
    'Your dashboard is the entry point for the clinical day — everything urgent surfaces here first.',
  sections: [
    {
      heading: 'Emergency banner',
      body: 'When an emergency patient is assigned to you, a red banner appears at the top. "Open Record" takes you straight to the patient.',
    },
    {
      heading: 'Quick actions',
      body: 'One-tap shortcuts to your most frequent tasks: start a consultation, write a clinical note, create a prescription, or request a laboratory test.',
    },
    {
      heading: 'Patient queue',
      body: 'Patients assigned to you, ordered by status. Emergency rows are red, waiting rows amber. Use "Consult" to begin, or "View All" to open the full queue.',
    },
    {
      heading: 'Alerts',
      body: 'Critical lab results, new assignments, referral responses, and clinical messages. Unread alerts show a cyan dot; "View All" opens the notification centre.',
    },
    {
      heading: "Today's shift",
      body: 'Your current shift, location, and acknowledgement status. "View My Schedule" opens the duty roster.',
    },
  ],
};

const EMERGENCY_DASHBOARD_GUIDE: HelpGuide = {
  id: 'emergency-dashboard',
  title: 'Emergency Dashboard',
  intro:
    'A real-time overview of emergency department operations — patient flow, bed status, and anything that needs immediate attention.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Patients Waiting, Occupied Beds, Critical Patients, Under Observation, Pending Results, and Discharged Today. Click any card to open the matching screen for more detail.',
    },
    {
      heading: 'Quick actions',
      body: 'One-tap shortcuts for the most frequent emergency-department tasks — registering a new patient, starting triage, assigning a bed, opening a patient chart, or ordering labs, imaging, and medications.',
    },
    {
      heading: 'Live Emergency Queue',
      body: 'Every emergency patient currently checked in, sorted by triage priority. Priority follows the standard Immediate/Urgent/Less Urgent/Non-Urgent classification.',
    },
    {
      heading: 'Triage Distribution & Bed Status',
      body: 'Donut charts summarising the current queue by priority and the department by bed status (Available, Occupied, Cleaning, Isolation, Reserved).',
    },
    {
      heading: 'Observation, Orders, Admissions, and Alerts',
      body: 'The panels below the fold track patients under observation, pending lab/radiology/medication/procedure orders, recent admissions, and any critical alerts needing immediate attention.',
    },
  ],
};

const BILLING_DASHBOARD_GUIDE: HelpGuide = {
  id: 'billing-dashboard',
  title: 'Accounts & Billing Dashboard',
  intro: "An overview of the department's billing, payments, revenue, and outstanding accounts.",
  sections: [
    {
      heading: 'Stat cards',
      body: "Today's Billing, Payments Received, Outstanding Invoices, and Pending Refunds, each with a trend vs. yesterday.",
    },
    {
      heading: 'Revenue Overview',
      body: 'Switch between Today, This Week, This Month, and This Year to change the chart granularity. Hover the chart for exact values. Filters narrow the total by date, department, service, or payment method.',
    },
    {
      heading: 'Revenue by Payment Method',
      body: 'A donut breakdown of collected revenue by POS, Bank Transfer, Cash, Card, and Online — filter to a single method from the filter row to isolate it.',
    },
    {
      heading: 'Outstanding Invoices Summary & Top Departments',
      body: 'Unpaid invoices grouped by age (0–30, 31–60, 61–90, 90+ days) and the departments generating the most revenue today.',
    },
    {
      heading: 'Quick Actions & Recent Activity',
      body: 'Shortcuts to create an invoice, post a payment, view a patient account, reconcile payments, or process a refund — plus a live feed of the latest billing events.',
    },
  ],
};

const BILLING_ACCOUNTS_GUIDE: HelpGuide = {
  id: 'billing-accounts',
  title: 'Billing Accounts',
  intro: 'Search, filter, and manage every patient financial account and balance.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Accounts, Total Billed, Total Paid, Outstanding Balance, and Overdue Accounts — all computed live from the current account list.',
    },
    {
      heading: 'Search & Filter',
      body: 'Search by patient name, MRN, phone, or a secondary ID. Narrow by Department or Account Status, or open More Filters to narrow by how long a balance has been outstanding.',
    },
    {
      heading: 'Account status',
      body: 'Paid (fully settled), Partial (a balance remains but is within 30 days), or Overdue (outstanding balance older than 30 days).',
    },
    {
      heading: 'Patient Account Overview',
      body: 'Select a row to open the account panel — billed/paid/outstanding totals, and shortcuts to Invoice History, Payment History, Refunds, Create Invoice, and Post Payment.',
    },
    {
      heading: 'New Account',
      body: 'Creates a new billing account for a patient with an optional opening balance.',
    },
  ],
};

const BILLING_OUTSTANDING_ACCOUNTS_GUIDE: HelpGuide = {
  id: 'billing-outstanding-accounts',
  title: 'Outstanding Accounts',
  intro: 'Track and manage unpaid invoices and patient balances.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Outstanding, the four aging buckets (0-30/31-60/61-90/90+ Days), and the number of patients with a balance due — all computed live from real unpaid invoices.',
    },
    {
      heading: 'Aging tabs & filters',
      body: 'Switch between All and each aging bucket. Narrow by Department, Service, Status (Issued/Partially Paid/Overdue), or search by patient/invoice number.',
    },
    {
      heading: 'Outstanding Accounts table',
      body: 'Every unpaid invoice with its original amount, amount paid, balance, days outstanding, and aging status. Select a row for details, or use the row menu to record a payment, send a reminder, or view the full account.',
    },
    {
      heading: 'Aging Summary & Top Departments',
      body: 'A donut breakdown of outstanding balance by age, and the departments carrying the most outstanding balance.',
    },
    {
      heading: 'Quick Actions',
      body: 'Send a payment reminder to every patient with a balance due, jump to Payments or Invoices, or export the current outstanding list.',
    },
  ],
};

const BILLING_REPORTS_GUIDE: HelpGuide = {
  id: 'billing-reports',
  title: 'Billing Reports',
  intro: 'Comprehensive billing and collections insights for better decision making.',
  sections: [
    {
      heading: 'Tabs',
      body: 'Overview shows the full report below. Invoices, Payments, Outstanding, Ageing, and Refunds jump to their own full screens; Collections is coming soon.',
    },
    {
      heading: 'Stat cards',
      body: 'Total Billed, Total Collected, Outstanding Amount, Overdue Amount, Collection Rate, and Average Days to Pay for the selected period, each compared against the prior period of equal length.',
    },
    {
      heading: 'Filters',
      body: 'Narrow by Report Type, Department, Service, Payment Method, and Date Range, then select Apply Filters. Report Type also filters the Recent Reports list below.',
    },
    {
      heading: 'Billing Trend & Revenue by Department',
      body: "A 5-week rolling trend of billed, collected, and outstanding amounts, and a donut breakdown of the selected period's billed revenue by department.",
    },
    {
      heading: 'Top Invoices, Aging Summary & Report Summary',
      body: 'The highest-value invoices in the period, a breakdown of outstanding balance by age, and counts of invoices/credit notes/refunds for the period.',
    },
    {
      heading: 'Recent Reports',
      body: 'Previously generated reports, with actions to view, download, email, or delete each one, plus Schedule Report and Export for the current view.',
    },
  ],
};

const BILLING_PAYMENT_REPORTS_GUIDE: HelpGuide = {
  id: 'billing-payment-reports',
  title: 'Payment Reports',
  intro: 'Analyze payment transactions and performance metrics.',
  sections: [
    {
      heading: 'Tabs',
      body: 'Overview shows the full report below. Transactions and Reconciliation jump to their own full screens; Payment Methods, Payers, Trends, and Export History are coming soon.',
    },
    {
      heading: 'Stat cards',
      body: 'Total Payments, Successful Payments, Failed Payments, Refunds Issued, Average Payment, and Payment Success Rate for the selected period.',
    },
    {
      heading: 'Filters',
      body: 'Narrow by Report Type, Department, Payment Method, and Date Range, then select Apply Filters.',
    },
    {
      heading: 'Payments Over Time & Payment Methods Breakdown',
      body: "A 5-week rolling trend of amount collected and transaction count, and a donut breakdown of the selected period's payments by method.",
    },
    {
      heading: 'Top Payment Transactions, Payments by Department & Summary',
      body: 'The highest-value payments in the period, a breakdown by department, and totals including net payments, transaction counts, and highest/lowest payment.',
    },
    {
      heading: 'Available Payment Reports',
      body: 'Shortcuts to generate a Payment Summary, Payment Method, Payer, Daily Payment, Failed Payments, or Refunds report, plus Schedule Report and Export for the current view.',
    },
  ],
};

const BILLING_REVENUE_REPORTS_GUIDE: HelpGuide = {
  id: 'billing-revenue-reports',
  title: 'Revenue Reports',
  intro: 'Track and analyze revenue performance across departments, services and time periods.',
  sections: [
    {
      heading: 'Tabs',
      body: 'Overview shows the full report below. By Department and By Service jump to their own full screens; By Payment Method, Trends, and Comparisons are coming soon.',
    },
    {
      heading: 'Stat cards',
      body: 'Total Revenue, Net Revenue, Total Services, Avg. Revenue / Day, Total Transactions, and Growth Rate for the selected period.',
    },
    {
      heading: 'Filters',
      body: 'Narrow by Report Type, Department, Service, Payment Method, and Date Range, then select Apply Filters.',
    },
    {
      heading: 'Revenue Over Time & Revenue by Department',
      body: "This period's revenue plotted against the equivalent stretch of the prior period, and a donut breakdown of the selected period's revenue by department.",
    },
    {
      heading: 'Top Revenue Generating Services, Revenue by Payment Method & Key Insights',
      body: 'The highest-earning services in the period, a donut breakdown by how payments were collected, and automatically computed highlights.',
    },
    {
      heading: 'Available Revenue Reports',
      body: 'Shortcuts to generate a Revenue Summary, Revenue by Department, Revenue by Service, Revenue Trend, Revenue Comparison, or Revenue & Collection report, plus Schedule Report and Export for the current view.',
    },
  ],
};

const BILLING_WORKFORCE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'billing-workforce-management',
  title: 'Workforce Management',
  intro: 'Manage Finance Department staff schedules, duty rosters, and team coverage.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Staff on Duty, Today’s Shifts, On-Call Staff, Shift Acknowledgement, Coverage Status, and Cancelled Shifts summarize the roster at a glance.',
    },
    {
      heading: "Today's Roster",
      body: 'Search by staff name or filter by shift type, role, and status. Each row shows the team, shift time, and acknowledgement state.',
    },
    {
      heading: 'Create and edit shifts',
      body: 'Create Shift opens a form for staff name, role, team, shift type, and status. The pencil icon on a row reopens the same form pre-filled for editing.',
    },
    {
      heading: 'Coverage and acknowledgement',
      body: 'The Coverage Overview panel tracks team coverage by shift. Pending Shift Acknowledgement lists staff who haven’t confirmed their shift yet, with a one-tap reminder.',
    },
    {
      heading: 'Connected to the Dashboard',
      body: 'The Dashboard’s "Staff on Duty" card and Quick Actions read this same roster live — creating, cancelling, or acknowledging a shift here updates the Dashboard immediately.',
    },
  ],
};

const BILLING_MY_SCHEDULE_GUIDE: HelpGuide = {
  id: 'billing-my-schedule',
  title: 'My Schedule',
  intro: 'Your personal shift calendar, upcoming assignments, and on-call rota.',
  sections: [
    {
      heading: "Today's Active Shift",
      body: 'Shows your current shift, time range, and team. Acknowledge Shift confirms you have seen it; a progress bar tracks time remaining.',
    },
    {
      heading: 'This Week',
      body: 'A day-by-day strip of your shifts for the current week, colour-coded by shift type, with an acknowledgement indicator on each day.',
    },
    {
      heading: 'Upcoming Shifts',
      body: 'Lists your next shifts with time and team. Shifts awaiting your response show Confirm Shift and Cannot Attend actions.',
    },
    {
      heading: 'Finance Team On-Call Rota',
      body: 'Shows who is covering on-call across the week, highlighting whoever is currently on duty and your own on-call slots.',
    },
    {
      heading: 'Monthly Overview',
      body: 'Totals your morning, afternoon, night, and on-call shifts for the current month.',
    },
  ],
};

const BILLING_SHIFT_HANDOVER_GUIDE: HelpGuide = {
  id: 'billing-shift-handover',
  title: 'Shift Handover',
  intro: 'Structured shift handover notes between outgoing and incoming Finance Department staff.',
  sections: [
    {
      heading: 'Billing Summary',
      body: 'Unpaid Invoices, Pending Refund Approvals, Payments Posted Today, and Unreconciled Payments counts summarize the billing backlog at hand-off, with a preview of refunds still awaiting approval.',
    },
    {
      heading: 'Outstanding Tasks and Overdue Invoices',
      body: 'Outstanding Tasks tracks a per-shift checklist by category. Overdue Invoices lists the accounts furthest past due that the incoming officer needs to follow up on.',
    },
    {
      heading: 'Unreconciled Payments',
      body: 'Flags payments not yet matched in reconciliation, so the incoming shift knows what to investigate.',
    },
    {
      heading: 'Signatures and completing handover',
      body: 'The incoming officer signs to accept responsibility for the billing backlog and reconciliation queue. Save as Draft preserves progress; Complete Handover finalizes the transfer once signed.',
    },
  ],
};

const BILLING_PAYMENT_RECONCILIATION_GUIDE: HelpGuide = {
  id: 'billing-payment-reconciliation',
  title: 'Payment Reconciliation',
  intro: 'Reconcile system payments with actual bank, POS, and online transactions.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Transactions, Matched, Unmatched, Pending, Exceptions, and Total Amount — all computed live from the current reconciliation list.',
    },
    {
      heading: 'Statuses',
      body: 'Matched (a source transaction and a system payment agree), Pending (a system payment is awaiting reconciliation), Exception (the source and system amounts disagree), and Unmatched (a bank/POS/online transaction with no corresponding system payment).',
    },
    {
      heading: 'Filters & tabs',
      body: 'Narrow by Payment Method, Source, Status, a date range, or search by reference/invoice/patient. The tabs mirror the Status filter with live counts.',
    },
    {
      heading: 'Row actions',
      body: 'View Details opens a side-by-side comparison. Mark as Matched resolves a Pending or Exception row. Flag Exception raises a Matched row for review. Link to Payment matches an Unmatched bank transaction to a Pending system payment.',
    },
    {
      heading: 'Quick Actions',
      body: "Auto Match resolves every Pending transaction at once. Reconcile Manually resolves the rows you've checked. Import Bank Statement brings in new transactions for review.",
    },
  ],
};

const BILLING_REVENUE_BY_SERVICE_GUIDE: HelpGuide = {
  id: 'billing-revenue-by-service',
  title: 'Revenue by Service',
  intro: 'Analyze revenue performance across all services.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Revenue, active service count, the Top Service by revenue, Average Revenue per Service, and when the numbers were last updated — all computed live from posted payments.',
    },
    {
      heading: 'Comparison Period',
      body: 'Compare the selected date range against the previous month, the previous 3 months, or the same month last year. Real deltas fall back to "not enough data to compare" rather than a misleading percentage when the comparison period has too little volume.',
    },
    {
      heading: 'Revenue by Service chart',
      body: 'Switch between a vertical bar chart and horizontal bars. The Service Contribution donut shows each service’s share of the total.',
    },
    {
      heading: 'Revenue by Service Summary',
      body: 'This period vs. the comparison period, change, % of total, transaction count, and average revenue per transaction for every service, with its department.',
    },
    {
      heading: 'Top Services by Growth & Lowest Revenue Services',
      body: 'The fastest-growing services by percentage change, and the lowest-earning services for the selected period.',
    },
  ],
};

const BILLING_REVENUE_BY_DEPARTMENT_GUIDE: HelpGuide = {
  id: 'billing-revenue-by-department',
  title: 'Revenue by Department',
  intro: 'Analyze revenue performance across all departments.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Revenue, active department count, the Top Department by revenue, Average Revenue per Department, and when the numbers were last updated — all computed live from posted payments.',
    },
    {
      heading: 'Comparison Period',
      body: 'Compare the selected date range against the previous month, the previous 3 months, or the same month last year. Real deltas fall back to "not enough data to compare" rather than a misleading percentage when the comparison period has too little volume.',
    },
    {
      heading: 'Revenue by Department chart',
      body: 'Switch between a vertical bar chart and horizontal bars. The Department Contribution donut shows each department’s share of the total.',
    },
    {
      heading: 'Revenue by Department Summary',
      body: 'This period vs. the comparison period, change, % of total, transaction count, and average revenue per day for every department.',
    },
    {
      heading: 'Top & Lowest Performing Departments',
      body: 'The highest- and lowest-earning departments for the selected period, ranked by revenue.',
    },
  ],
};

const BILLING_REVENUE_OVERVIEW_GUIDE: HelpGuide = {
  id: 'billing-revenue-overview',
  title: 'Revenue Overview',
  intro: 'Track and analyze revenue performance across departments and services.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Revenue for Today, This Week, This Month, and This Year, plus Average Daily Revenue — all computed live from posted payments, with real period-over-period comparisons where enough history exists.',
    },
    {
      heading: 'Revenue Trend',
      body: 'Switch between Today, This Week, This Month, and This Year to change the chart granularity. The legend chips below the chart break the period total down by payment method.',
    },
    {
      heading: 'Revenue by Department & by Payment Method',
      body: 'Donut breakdowns of the selected period’s revenue, each with a "View Details" link into the dedicated report.',
    },
    {
      heading: 'Top Services by Revenue',
      body: 'The highest-billing services across all invoices, narrowed by the Department/Service filters above the charts.',
    },
    {
      heading: 'Summary & Highlights',
      body: 'Outstanding Invoices, Refunds & Adjustments, Payments Received, and Average Collection Time — cross-referenced from the same live invoice and payment data used across Billing.',
    },
  ],
};

const BILLING_REFUNDS_ADJUSTMENTS_GUIDE: HelpGuide = {
  id: 'billing-refunds-adjustments',
  title: 'Refunds & Adjustments',
  intro: 'Manage patient refunds and financial adjustments across every account.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Pending, Approved, Processed, and Rejected Refunds — all computed live from the current refund list.',
    },
    {
      heading: 'Refunds tab',
      body: 'Every refund request, its invoice, amount, reason, and status. Select a row to open the Refund Details panel — its full Status History timeline, plus Approve, Reject, or Mark as Processed depending on where it is in its lifecycle.',
    },
    {
      heading: 'Adjustments tab',
      body: 'Discounts, write-offs, and corrections applied to invoices, with the invoice and reason each is tied to.',
    },
    {
      heading: 'Search & Filter',
      body: 'Search by invoice number, patient name, MRN, or reference. Narrow by Status/Type, Department, or a date range.',
    },
    {
      heading: 'Process Refund & Add Adjustment',
      body: 'Submit a new refund request against a paid invoice, or record a new discount, write-off, or correction against any invoice.',
    },
  ],
};

const BILLING_PAYMENTS_GUIDE: HelpGuide = {
  id: 'billing-payments',
  title: 'Payments',
  intro: 'Record, manage and track every payment received against a patient invoice.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Payments Today, This Week, This Month, Refunds This Month, and Unreconciled — all computed live from the current payment and refund records. "View reconciliation" jumps to Payment Reconciliation.',
    },
    {
      heading: 'Payment method tabs',
      body: 'Switch between All Payments and each method — Cash, POS, Bank Transfer, Card, Online Payment.',
    },
    {
      heading: 'Search & Filter',
      body: 'Search by invoice number, patient name, MRN, or transaction reference. Narrow by Department, Payment Method, Payment Status, or a date range.',
    },
    {
      heading: 'Payment Details',
      body: 'Select a row to open the payment panel — the invoice it was posted against, its current balance, and the payment method, reference, and staff who posted it.',
    },
    {
      heading: 'Record Payment & Record Refund',
      body: 'Post a new payment against any patient’s outstanding invoice, or record a refund against an existing payment.',
    },
  ],
};

const BILLING_ACCOUNT_DETAIL_GUIDE: HelpGuide = {
  id: 'billing-account-detail',
  title: 'Billing Account',
  intro:
    "A single patient's full billing account — balances, invoices, payments, adjustments, refunds, and documents.",
  sections: [
    {
      heading: 'Summary',
      body: 'Total Billed, Total Paid, and Outstanding Balance for this account, plus its active/inactive and payment status.',
    },
    {
      heading: 'Invoice & Payment History',
      body: 'Every invoice and payment on the account, each exportable as CSV independently of the other tabs.',
    },
    {
      heading: 'Adjustments & Refunds',
      body: 'Discounts, write-offs, corrections, and any refunds issued against this account.',
    },
    {
      heading: 'Documents',
      body: 'Invoices, receipts, claim forms, and statements on file — select the download icon on any row.',
    },
  ],
};

const BILLING_INVOICES_GUIDE: HelpGuide = {
  id: 'billing-invoices',
  title: 'Invoices',
  intro: 'Create, manage, and track every patient invoice across the department.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Invoices, Total Billed, Total Paid, Outstanding, and Overdue Invoices — all computed live from the current invoice list.',
    },
    {
      heading: 'Status tabs',
      body: 'Switch between All Invoices and each lifecycle stage — Draft, Issued, Partially Paid, Paid, Overdue, Cancelled. Each tab shows a live count.',
    },
    {
      heading: 'Search & Filter',
      body: 'Search by invoice number, patient name, or MRN. Narrow by Department, Service, Status, or a date range. "Clear all filters" appears whenever a filter is hiding every row.',
    },
    {
      heading: 'Invoice Details',
      body: 'Select a row to open the invoice panel — amount/paid/balance, due date, and shortcuts to view, print, or post a payment against the invoice.',
    },
    {
      heading: 'Quick Actions',
      body: 'Send a payment reminder, download the invoice, view its payment history, cancel it, or view its audit trail.',
    },
    {
      heading: 'Create Invoice',
      body: 'Creates a new invoice for a patient with a service, amount, and due date.',
    },
  ],
};

const EMERGENCY_PATIENT_QUEUE_GUIDE: HelpGuide = {
  id: 'emergency-patient-queue',
  title: 'Patient Queue',
  intro:
    'The full, real-time list of patients waiting for triage and emergency care, with filters and a quick-view panel.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total in Queue, Longest Wait Time, Average Wait Time, and how many patients are still Awaiting Triage vs Triage Completed.',
    },
    {
      heading: 'Tabs',
      body: 'Switch between All Patients and each stage of the queue — Awaiting Triage, Triage Completed, In Treatment, Admitted, Discharged. Each tab shows a live count.',
    },
    {
      heading: 'Filters and search',
      body: 'Narrow the list by triage priority or arrival source, or search by patient name/MRN. "Clear all filters" appears whenever a filter is hiding every row.',
    },
    {
      heading: 'Patient Quick View',
      body: 'Select any row to open a docked panel with arrival details, chief complaint, and queue status — with one-tap actions to start triage or open the full patient chart.',
    },
  ],
};

const TRIAGE_ASSESSMENT_GUIDE: HelpGuide = {
  id: 'emergency-triage-assessment',
  title: 'Triage Assessment',
  intro:
    'A 5-step Manchester Triage assessment that assigns a clinical priority and next steps for one emergency patient.',
  sections: [
    {
      heading: 'Patient Identification',
      body: 'Demographics and arrival details are pre-filled from the queue entry. Add the chief complaint, onset, pain scale, and primary concern before continuing.',
    },
    {
      heading: 'Manchester Triage Assessment',
      body: 'Answer all 7 discriminator questions. The Manchester Triage Priority Reference in the sidebar explains each of the five clinical tiers — this app assigns one of the four standard priority levels (Immediate/Urgent/Less Urgent/Non-Urgent).',
    },
    {
      heading: 'Vital Signs',
      body: 'Record blood pressure, pulse, respiratory rate, temperature, SpO₂, and consciousness (AVPU).',
    },
    {
      heading: 'Priority & Disposition',
      body: 'Review the computed priority and recommended actions, then confirm the assigned doctor and triage nurse.',
    },
    {
      heading: 'Review & Complete',
      body: '"Save & Complete Triage" writes the result to the shared queue — Patient Queue and the Dashboard update immediately. "Proceed to Bed Assignment" carries the patient forward.',
    },
  ],
};

const BED_ASSIGNMENT_GUIDE: HelpGuide = {
  id: 'emergency-bed-assignment',
  title: 'Bed Assignment',
  intro:
    'Assign a triaged patient to an appropriate emergency bed based on priority, clinical need, and current bed availability.',
  sections: [
    {
      heading: 'Patient to Assign',
      body: 'Shows the next triaged patient without a bed, pulled from their completed Triage Assessment — priority, chief complaint, and a warning banner for life-threatening cases.',
    },
    {
      heading: 'Bed Requirements',
      body: 'The recommended bed type and special requirements (e.g. Cardiac Monitor, Oxygen) are pre-filled from the triage assessment — adjust them as needed.',
    },
    {
      heading: 'Available Beds',
      body: 'Filter by bed type or zone, then select "Assign" on a bed to preview the assignment. The Bed Type Legend explains each bed type and equipment icon.',
    },
    {
      heading: 'Confirm, Hold, or Cancel',
      body: '"Confirm Bed Assignment" finalises the assignment and updates Patient Queue immediately. "Hold Bed" reserves a bed for 5 minutes without finalising. "Cancel" clears the current selection.',
    },
  ],
};

const EMERGENCY_TRACKING_BOARD_GUIDE: HelpGuide = {
  id: 'emergency-tracking-board',
  title: 'Emergency Tracking Board',
  intro:
    'A real-time, whiteboard-style overview of every patient currently in the emergency department, across every stage of care.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Patients, In Triage, In Treatment, Under Observation, Ready for Disposition, and Discharged Today — a live census of the department.',
    },
    {
      heading: 'Filters and search',
      body: 'Narrow the board by zone, physician, or status, search by patient name/MRN, or toggle "Alerts Only" to see patients needing attention.',
    },
    {
      heading: 'The table',
      body: 'Every row shows priority, location/bed, assigned physician, status, time in ED, and pending orders. Select a row to open its Patient Snapshot.',
    },
    {
      heading: 'Patient Snapshot',
      body: 'Chief complaint, arrival/assignment details, an Orders Summary, and Recent Notes for the selected patient, with a shortcut to open their full chart.',
    },
  ],
};

const OBSERVATION_UNIT_GUIDE: HelpGuide = {
  id: 'emergency-observation-unit',
  title: 'Observation Unit',
  intro:
    'Monitor and manage every patient currently held for observation, with live review timers and disposition tools.',
  sections: [
    {
      heading: 'Stat cards and tabs',
      body: 'Total in Observation, New Today, Due for Review, Overdue Review, Ready for Disposition, and Discharged from Obs update live as review times pass — a patient automatically moves from Monitoring to Due for Review to Overdue.',
    },
    {
      heading: 'Add Patient to Observation',
      body: 'Admits a patient into an available bed or seat, with a reason, observing physician, and review interval.',
    },
    {
      heading: 'Selected Patient panel',
      body: 'Select any row to see full details, a Vital Signs Trend, and Observation Tools — add a nursing note, record vitals, add an order, or discharge/transfer the patient.',
    },
    {
      heading: 'Discharge / Transfer',
      body: 'Records the disposition (discharged home, admitted to a ward, or transferred), frees the bed/seat immediately, and logs it under Recent Dispositions.',
    },
    {
      heading: 'Bed / Seat Status',
      body: 'A live map of every bay showing which beds/seats are occupied and their review status at a glance.',
    },
  ],
};

const EMERGENCY_MEDICATION_ORDERS_GUIDE: HelpGuide = {
  id: 'emergency-medication-orders',
  title: 'Emergency Medication Orders',
  intro:
    'Place, view, and manage medication orders for the current emergency patient, with real-time drug interaction and lab-result checks.',
  sections: [
    {
      heading: 'Tabs and filters',
      body: 'Switch between Active, Completed, Discontinued, and All Orders, or filter by status, type, route, and priority.',
    },
    {
      heading: 'New Medication Order',
      body: 'Search the medication catalog, set dose/route/frequency/priority, or check "STAT / One Time Dose" for an urgent single dose. Placing an order adds it to Active Orders immediately.',
    },
    {
      heading: 'Order actions',
      body: 'The eye icon expands full order details inline. The ⋮ menu lets you mark an order Completed or Discontinue it (a reason is required for audit purposes).',
    },
    {
      heading: 'Safety checks',
      body: "Drug Interactions checks the patient's active orders against known interacting pairs live. Pending Lab Results Affecting Medications flags labs relevant to safe dosing.",
    },
    {
      heading: 'Nursing administration',
      body: '"Medication Administration (Nursing)" opens the nurse\'s Medication Administration Record, where ordered medications are actually given to the patient.',
    },
  ],
};

const EMERGENCY_PROCEDURES_GUIDE: HelpGuide = {
  id: 'emergency-procedures',
  title: 'Emergency Procedures',
  intro: 'Perform and document emergency procedures for the current patient.',
  sections: [
    {
      heading: 'Procedure List',
      body: 'Every procedure logged for this patient, with status, who performed it, and where. Filter by status, type, or date, or search by name.',
    },
    {
      heading: 'New Procedure and templates',
      body: '"New Procedure" logs a custom procedure. "Procedure Templates" jumps to the Common Emergency Procedures grid — tapping a template opens the same form pre-filled with its name and type.',
    },
    {
      heading: 'Procedure Details',
      body: "Shows the selected procedure's status, timing, and (for the common procedures) a reference protocol — indications, equipment, steps, and risks. Status can be advanced or the procedure cancelled from here.",
    },
    {
      heading: 'Post-Procedure Orders',
      body: 'Medication orders placed for this patient after the selected procedure started, read live from Emergency Medication Orders.',
    },
    {
      heading: 'Complications & Notes, and Documents',
      body: 'Log a note or complication against the selected procedure, or attach a document reference (e.g. a consent form) to it.',
    },
  ],
};

const EMERGENCY_CLINICAL_NOTES_GUIDE: HelpGuide = {
  id: 'emergency-clinical-notes',
  title: 'Clinical Notes',
  intro: 'Document patient encounter, assessment, and plan for the current emergency patient.',
  sections: [
    {
      heading: 'SOAP editor',
      body: 'Switch between Subjective, Objective, Assessment, Plan, and Free Text sections on the left. The toolbar formats the active section; "Insert SmartText" inserts a canned phrase at the cursor.',
    },
    {
      heading: 'Templates and Voice Dictation',
      body: '"Templates" fills the SOAP sections from a starter template. "Voice Dictation" transcribes speech into the active section where the browser supports it.',
    },
    {
      heading: 'Assessment & Plan',
      body: "Working Diagnosis and Plan are structured separately from the SOAP narrative, so they can drive the patient's recorded diagnosis elsewhere (e.g. Emergency Procedures' Active Diagnoses).",
    },
    {
      heading: 'Save Draft vs Sign & Save Note',
      body: 'A draft can be edited or discarded any time. Signing locks the note — start a new note for further documentation rather than editing a signed one.',
    },
    {
      heading: 'Note History and Attachments',
      body: "Note History lists every note for this patient — click one to load it. Attachments aggregates every document attached across this patient's notes.",
    },
  ],
};

const EMERGENCY_DIAGNOSTIC_REQUESTS_GUIDE: HelpGuide = {
  id: 'emergency-diagnostic-requests',
  title: 'Diagnostic Requests',
  intro: 'Request lab tests and imaging, and track results, for the current emergency patient.',
  sections: [
    {
      heading: 'New Request',
      body: 'Set a priority (STAT/Urgent/Routine), select one or more tests from the catalog, add clinical notes for the laboratory, then send. STAT tests are processed immediately.',
    },
    {
      heading: 'My Requests',
      body: 'Every requisition placed for this patient, with an overall status (as advanced as its least-progressed test). Expand a row to see each test individually.',
    },
    {
      heading: 'Real, shared requests',
      body: "Requests placed here write to the same laboratory system every other screen reads — a test ordered from Emergency appears immediately on the Laboratory workspace and the doctor's own Lab Results screen.",
    },
    {
      heading: 'Reviewing results',
      body: 'Once a test is Resulted, "Mark Reviewed" and "Verify Result" sign off on it. Critical results surface in the sidebar until reviewed.',
    },
  ],
};

const EMERGENCY_RESULTS_REVIEW_GUIDE: HelpGuide = {
  id: 'emergency-results-review',
  title: 'Results Review',
  intro: 'View and review diagnostic and imaging results for the current emergency patient.',
  sections: [
    {
      heading: 'Tabs and filters',
      body: 'Switch between All Results, Laboratory, Imaging, Cardiology, and Microbiology, or filter by status, test, and date.',
    },
    {
      heading: 'Latest Results and detail panel',
      body: 'Select a result from the list to see its full detail on the right — parameter values, reference ranges, and notes once available, or its current workflow status if the result is still pending.',
    },
    {
      heading: 'Result Trends and Recent Reports',
      body: "Result Trends plots a parameter across this patient's past resulted tests. Recent Reports lists the latest imaging/cardiology/microbiology reports.",
    },
    {
      heading: 'Compare Results and Print',
      body: '"Compare Results" shows the two most recent results of the same test side by side. "Print" exports the selected result as a PDF.',
    },
    {
      heading: 'Real, shared results',
      body: 'This reads the same live laboratory data every other screen does — a test ordered from Diagnostic Requests appears here the moment it has a result.',
    },
  ],
};

const EMERGENCY_CRITICAL_ALERTS_GUIDE: HelpGuide = {
  id: 'emergency-critical-alerts',
  title: 'Critical Alerts',
  intro:
    'Monitor and act on critical laboratory and imaging alerts across every patient currently in the Emergency Department.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Critical, High Priority, and Moderate Priority count unacknowledged alerts by severity. Acknowledged and Resolved (Today) track follow-up. Click "View Alerts" on any card to jump straight to that filter.',
    },
    {
      heading: 'Alerts table',
      body: 'Every abnormal or critical result for a patient currently in the ED, sorted unacknowledged-first by severity. Select a row (or use the ⋮ menu) to see full detail below.',
    },
    {
      heading: 'Alert Details and Acknowledge',
      body: 'The selected alert\'s full detail, including a recommended-action checklist. "Acknowledge Alert" marks it reviewed — this is the same review step used on Diagnostic Requests and Results Review.',
    },
    {
      heading: 'Export and Print',
      body: '"Export Alerts" downloads the currently filtered list as CSV. "Print Alert Summary" exports the stat counts and list as a PDF.',
    },
    {
      heading: 'Real, shared alerts',
      body: 'This reads the same live laboratory data every other Emergency diagnostics screen does — nothing here is patient-specific mock data.',
    },
  ],
};

const EMERGENCY_VISIT_HISTORY_GUIDE: HelpGuide = {
  id: 'emergency-visit-history',
  title: 'Emergency Visit History',
  intro: "View a patient's past emergency department visits and encounter details.",
  sections: [
    {
      heading: 'Stat cards',
      body: "Total ED Visits, Last Visit, Most Recent Diagnosis, Admissions, and Observations summarize this patient's emergency history at a glance.",
    },
    {
      heading: 'Visit History table',
      body: 'Every past ED visit with its chief complaint, diagnosis, disposition, provider, and visit ID. Filter by disposition or date range, or search by complaint, diagnosis, or visit ID.',
    },
    {
      heading: 'Visit details',
      body: 'The eye icon (or the ⋮ menu\'s "View Details") opens the full visit record, including vitals recorded at that visit.',
    },
    {
      heading: 'Visit Legend',
      body: 'Explains what each disposition badge means — Discharged, Admitted, Observation, Left AMA, or Transferred.',
    },
  ],
};

const EMERGENCY_CLINICAL_TIMELINE_GUIDE: HelpGuide = {
  id: 'emergency-clinical-timeline',
  title: 'Clinical Timeline',
  intro: "A comprehensive chronological view of a patient's emergency care journey.",
  sections: [
    {
      heading: 'A real, aggregated timeline',
      body: 'Every event — arrival, diagnoses, clinical notes, procedures, medication orders, and lab/imaging results — is pulled live from the same stores those screens write to, not a separate log.',
    },
    {
      heading: 'Filters and search',
      body: 'Filter by event type, provider, or date range, or search by title/summary. Timeline Quick Filters in the sidebar jump straight to a category.',
    },
    {
      heading: 'Expanding events',
      body: 'Events with extra detail show a chevron — click it to expand the full note text, discontinuation reason, or comment.',
    },
    {
      heading: 'Print Timeline',
      body: 'Exports the currently filtered events as a PDF via the same export helper used across Emergency.',
    },
  ],
};

const EMERGENCY_REPORTS_GUIDE: HelpGuide = {
  id: 'emergency-reports',
  title: 'Emergency Reports',
  intro: 'Generate, schedule, and export department-wide emergency operations reports.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total ED Visits, Admitted Patients, Left AMA, Average LOS, and Patient Satisfaction summarize department performance for the period, each with a trend vs. the prior 7 days.',
    },
    {
      heading: 'Filters and Generate Report',
      body: 'Narrow the catalog by report type, date range, location, or shift, then use Generate Report to create and download a new report from the current filters.',
    },
    {
      heading: 'Available Reports table',
      body: 'Every generated report with its author, generation time, date range, and format. The eye icon previews key metrics; the download icon exports it; the ⋮ menu also lets you delete reports you generated yourself.',
    },
    {
      heading: 'Schedule Report',
      body: 'Set up a recurring report delivered to chosen recipients on a daily, weekly, or monthly cadence.',
    },
    {
      heading: 'Sidebar',
      body: 'Report Overview and Top Metrics summarize the period at a glance; Quick Actions and Report Templates give shortcuts into common report types.',
    },
  ],
};

const EMERGENCY_WAITING_TIME_REPORTS_GUIDE: HelpGuide = {
  id: 'emergency-waiting-time-reports',
  title: 'Waiting Time Reports',
  intro: 'Analyze patient wait times across triage, treatment and discharge stages.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Average Total, Triage, Treatment and Discharge wait times, plus Total Patients Analyzed, each with a trend vs. the prior 7 days.',
    },
    {
      heading: 'Filters and Generate Report',
      body: 'Narrow the analysis by date range, location, shift, or triage acuity, then use Generate Report to download a PDF summary of the current filters.',
    },
    {
      heading: 'Average Wait Time Trend',
      body: 'Hover the chart for exact values at any point. Click a legend item to hide or show that stage, and switch between Daily and Weekly grouping.',
    },
    {
      heading: 'Average Wait Time by Triage Acuity',
      body: "A donut broken down by the department's four triage priority levels — filter to a single level from the Triage Acuity dropdown to isolate it.",
    },
    {
      heading: 'Sidebar',
      body: 'Insights highlights the busiest day, peak hours, longest wait, and week-over-week improvement. Wait Time Benchmarks flags any stage exceeding its recommended target in red.',
    },
  ],
};

const EMERGENCY_TRIAGE_PERFORMANCE_REPORTS_GUIDE: HelpGuide = {
  id: 'emergency-triage-performance-reports',
  title: 'Triage Performance Reports',
  intro: 'Monitor and evaluate triage activities, accuracy, and response times.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Patients Triaged, Average Triage Time, Triage Accuracy Rate, Re-triaged Patients, and Triage < 5 min, each with a trend vs. the prior 7 days.',
    },
    {
      heading: 'Filters and Generate Report',
      body: 'Narrow the analysis by date range, location, shift, triage nurse, or acuity level, then use Generate Report to download a PDF summary.',
    },
    {
      heading: 'Volume, time, and accuracy by acuity',
      body: "Three panels break down triage volume, average triage time, and accuracy rate across the department's four triage priority levels — filter to a single level from the Acuity Level dropdown to isolate it.",
    },
    {
      heading: 'Triage Performance by Nurse',
      body: "Per-nurse totals, average triage time overall and by acuity level, accuracy rate, re-triage rate, and the share triaged under 5 minutes. The eye icon and ⋮ menu open a profile or export that nurse's data.",
    },
    {
      heading: 'Sidebar',
      body: 'Insights highlights the busiest day, peak hour, and best performing nurse. Triage Accuracy Benchmark flags any level falling short of its recommended target in red.',
    },
  ],
};

const PATIENTS_GUIDE: HelpGuide = {
  id: 'patients',
  title: 'Patient Register',
  intro: 'Search, review, and open the records of every patient you are permitted to see.',
  sections: [
    {
      heading: 'Find a patient',
      body: 'Search by name or MRN, then narrow the list with the status, gender, and blood-group filters. Active filters appear as chips you can dismiss.',
    },
    {
      heading: 'Open a profile',
      body: 'Select the eye icon (or tap a patient card on mobile) to open the full profile with history, allergies, and records.',
    },
    {
      heading: 'Start a consultation',
      body: 'Available directly from the list for patients who are not discharged — it opens the six-step consultation workspace.',
    },
  ],
};

const PATIENT_PROFILE_GUIDE: HelpGuide = {
  id: 'patient-profile',
  title: 'Patient Profile',
  intro: 'The complete clinical picture of one patient, organised into tabs.',
  sections: [
    {
      heading: 'Allergy banner',
      body: 'Recorded allergies are always shown at the top in red — this banner never collapses and appears on every patient screen for safety.',
    },
    {
      heading: 'Tabs',
      body: 'Move between overview, history, medications, lab results, and documents. On smaller screens the tab bar scrolls sideways.',
    },
    {
      heading: 'History tables',
      body: 'Diagnoses, family history, and immunisations expand per section. Wide tables scroll horizontally — the first column stays readable.',
    },
  ],
};

const CLINICAL_TIMELINE_INDEX_GUIDE: HelpGuide = {
  id: 'clinical-timeline-index',
  title: 'Clinical Timeline',
  intro: 'Pick a patient here to open their complete chronological clinical history.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search by name or MRN, or narrow the list with the status pills — Admitted, Active, Follow up, Referred, or Discharged.',
    },
    {
      heading: 'Opening a timeline',
      body: "Select the eye icon (or tap a patient card on mobile) to open that patient's timeline.",
    },
  ],
};

const CLINICAL_TIMELINE_GUIDE: HelpGuide = {
  id: 'clinical-timeline',
  title: 'Clinical Timeline',
  intro:
    'A single chronological history of everything that has happened to this patient — consultations, lab activity, prescriptions, referrals, and emergencies.',
  sections: [
    {
      heading: 'Reading the timeline',
      body: 'Events run newest to oldest. Each entry shows its category, what happened, exactly when, and who recorded it.',
    },
    {
      heading: 'Filtering',
      body: 'Use the category pills to narrow the list to one type of event — Consultation, Laboratory, Prescription, Referral, or Emergency. "All Events" shows the complete history again.',
    },
    {
      heading: 'Emergency events',
      body: 'Emergency presentations are outlined in red so past critical episodes are never missed while reviewing history.',
    },
    {
      heading: 'Export',
      body: 'Export produces a PDF of the currently filtered timeline — useful for referral letters and case summaries.',
    },
  ],
};

const CONSULTATION_GUIDE: HelpGuide = {
  id: 'consultation',
  title: 'Consultation Workspace',
  intro: 'A six-step guided flow for documenting a complete clinical encounter.',
  sections: [
    {
      heading: 'The six steps',
      body: 'Work through the tabs in order — you can move back at any time without losing entered data.',
      steps: [
        'Chief Complaint — presenting problem, duration, onset, severity',
        'History — present illness, past medical, family, social',
        'Examination — findings per body system',
        'Diagnosis — primary, differentials, reasoning',
        'Treatment Plan — therapy and follow-up instructions',
        'Clinical Notes — free-text summary',
      ],
    },
    {
      heading: 'Patient context',
      body: 'The dark bar at the top keeps the patient identity, blood group, and allergy pills visible at all times. The red allergy banner sits above the form.',
    },
    {
      heading: 'Saving',
      body: '"Save Draft" stores your progress without finalising. "Complete Consultation" signs the encounter — completed records are immutable and corrections require an amendment.',
    },
    {
      heading: 'Referring',
      body: '"Refer Patient" opens the referral form pre-filled with this patient\'s context.',
    },
  ],
};

const ENCOUNTERS_GUIDE: HelpGuide = {
  id: 'encounters',
  title: 'OPD Queue',
  intro: 'The live outpatient queue for your department.',
  sections: [
    {
      heading: 'Queue tabs',
      body: 'Filter by status — all, waiting, in consultation, emergency, completed. Counts update as the queue moves.',
    },
    {
      heading: 'Filters and search',
      body: 'Search by name or complaint; the filter menu narrows by gender and allergy status. If a filtered view is empty, "Clear all filters" restores the full queue.',
    },
    {
      heading: 'Starting a consultation',
      body: 'Use "Consult" on a patient row to open the consultation workspace. Emergency patients are highlighted red and should be seen first.',
    },
  ],
};

const CLINICAL_NOTES_GUIDE: HelpGuide = {
  id: 'clinical-notes',
  title: 'Clinical Notes',
  intro: 'Write, review, and export clinical documentation.',
  sections: [
    {
      heading: 'Writing a note',
      body: '"Write Clinical Note" opens the editor. Choose a note type — SOAP notes pre-fill the four-section template.',
    },
    {
      heading: 'Note lifecycle',
      body: 'Notes start in progress and become final when signed. Final notes are immutable — corrections are recorded as amendments with a reason, and the version history stays visible.',
    },
    {
      heading: 'Finding notes',
      body: 'Filter by type or status, or search by patient. Urgent items are flagged in the banner at the top.',
    },
    {
      heading: 'Export',
      body: 'The Export menu produces PDF or CSV of the current filtered list.',
    },
  ],
};

const REFERRALS_INDEX_GUIDE: HelpGuide = {
  id: 'referrals-index',
  title: 'Referrals',
  intro: 'Refer a patient out, or accept a referral another department has sent to us.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'On the "Refer a Patient" tab, search by name or MRN, or narrow the list with the status pills — Admitted, Active, Follow up, Referred, or Discharged.',
    },
    {
      heading: 'Starting a referral',
      body: 'Select "Refer" (or tap a patient card on mobile) to open the referral form for that patient.',
    },
    {
      heading: 'Incoming Referrals',
      body: 'The second tab lists referrals other departments have sent to us, with a badge showing how many are still Pending. Accept a pending referral to take it on, then Mark Completed once the consultation is done.',
    },
  ],
};

const REFERRALS_GUIDE: HelpGuide = {
  id: 'referrals',
  title: 'Patient Referral',
  intro: 'Send a patient to another department with full clinical context.',
  sections: [
    {
      heading: 'Before you send',
      body: 'Confirm the patient identity in the dark context bar — allergies and urgency are shown there and in the red banner above the form.',
    },
    {
      heading: 'Completing the form',
      body: 'Select the receiving department, set urgency, and write the clinical reason. Toggle "notify doctor" to alert the receiving clinician immediately.',
      steps: [
        'Choose the receiving department',
        'Set the urgency level',
        'Document the reason for referral',
        'Send — the receiving department is notified',
      ],
    },
    {
      heading: 'After sending',
      body: 'Track acceptance in your dashboard alerts — you are notified when the receiving clinician responds.',
    },
  ],
};

const LAB_ORDERS_GUIDE: HelpGuide = {
  id: 'lab-orders',
  title: 'Laboratory Request',
  intro: 'Order laboratory investigations for the patient in context.',
  sections: [
    {
      heading: 'Priority',
      body: "STAT for life-threatening situations, Urgent for same-day, Routine otherwise. Priority drives the lab's processing order.",
    },
    {
      heading: 'Selecting tests',
      body: 'Tests are grouped by discipline (haematology, chemistry, microbiology…). Tick every test needed — the summary keeps a running count.',
    },
    {
      heading: 'Allergies',
      body: 'The red allergy banner above the form lists recorded reactions — check it before ordering tests involving contrast media or provocation.',
    },
    {
      heading: 'Submitting',
      body: 'Review the summary and send. The order appears in the laboratory queue and results return to Lab Results with a notification.',
    },
  ],
};

const PRESCRIPTIONS_GUIDE: HelpGuide = {
  id: 'prescriptions',
  title: 'Create Prescription',
  intro: 'Build a prescription for the patient in context, one medication at a time.',
  sections: [
    {
      heading: 'Adding medications',
      body: 'Search by generic or brand name, or browse the drug list, to add a medication to the table. "Add Another Medication" quickly adds the next common drug.',
    },
    {
      heading: 'Dosage & Directions',
      body: 'Select a row in the medication table to edit its dosage, route, frequency, duration, and dates in the panel below — each medication keeps its own settings.',
    },
    {
      heading: 'Safety checks',
      body: 'Active medications and recorded allergies are shown before you prescribe. The Drug Interaction Check confirms the selected medications are safe together.',
    },
    {
      heading: 'Finishing up',
      body: 'Review the live Prescription Preview at the bottom, then Save as Draft to continue later or Send Prescription to dispatch it to pharmacy.',
    },
  ],
};

const LAB_RESULTS_GUIDE: HelpGuide = {
  id: 'lab-results',
  title: 'Lab Results',
  intro: 'Review returned laboratory results for your patients.',
  sections: [
    {
      heading: 'Tabs and filters',
      body: 'Critical needs immediate attention; Pending shows orders still in the lab; Verified holds validated results. Search by patient, MRN, or test, and narrow by department or priority.',
    },
    {
      heading: 'Reading a result',
      body: 'Each result card shows every analyte with its reference range; values outside range are highlighted and flagged H (high), L (low), or A (abnormal).',
    },
    {
      heading: 'Critical values',
      body: 'A critical result is marked "Action Required" until you mark it reviewed — this is a record that you have seen and acted on it, separate from the nurse having relayed it to you.',
    },
    {
      heading: 'Reviewing and documenting',
      body: '"Mark as Reviewed" records your sign-off with a timestamp. "Add Clinical Note" attaches your own note to the result — e.g. a follow-up plan or medication change.',
    },
    {
      heading: 'Patient chart',
      body: '"View Patient Chart" opens the full record for results tied to a patient already in your roster.',
    },
  ],
};

const MEDICAL_RECORDS_GUIDE: HelpGuide = {
  id: 'medical-records',
  title: 'Medical Records',
  intro: 'The document archive for the patient in context.',
  sections: [
    {
      heading: 'Browsing',
      body: 'Records are grouped by type — consultations, discharge summaries, imaging, procedures. Filter by type or search by title.',
    },
    {
      heading: 'Critical records',
      body: 'Records flagged critical are highlighted so they are never missed during review.',
    },
    {
      heading: 'Export',
      body: 'Export the current view as PDF or CSV from the Export menu — useful for referral packs and case reviews.',
    },
  ],
};

const MEDICAL_RECORDS_DASHBOARD_GUIDE: HelpGuide = {
  id: 'medical-records-dashboard',
  title: 'Medical Records Dashboard',
  intro: 'Your daily overview of records activity — retrieval, uploads, and pending requests.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Each card tracks one metric against yesterday — records retrieved, archived records, pending requests, uploads, and visit entries.',
    },
    {
      heading: 'Quick Actions',
      body: 'Jump straight to retrieving a record, uploading a document, or browsing visit history and clinical documents.',
    },
    {
      heading: 'Recent activity',
      body: 'Recent Record Requests and Recently Retrieved show the latest activity; System Announcements carries hospital-wide notices.',
    },
  ],
};

const REGISTER_PATIENT_GUIDE: HelpGuide = {
  id: 'register-patient',
  title: 'Register Patient',
  intro: 'A 3-step wizard for adding a new patient to the system.',
  sections: [
    {
      heading: 'Patient Information',
      body: 'Basic demographics, emergency contact, and insurance details. Fields marked with * are required — State determines which LGAs are available, and Age is calculated automatically from Date of Birth.',
    },
    {
      heading: 'Medical Record Number',
      body: 'MRN and Patient ID are generated automatically once the patient is saved. Use "Generate MRN" to assign one earlier if you need it for a physical card or referral before saving.',
    },
    {
      heading: 'Patient Photograph',
      body: 'Upload a JPG, PNG, or WebP photo up to 2MB, or use "Take Photo" on a device with a camera. This step is optional and can be added later from the patient\'s profile.',
    },
    {
      heading: 'Additional Details',
      body: 'Next of Kin (the legal contact, recorded separately from Emergency Contact), known allergies, a brief medical history screening, disability/accessibility needs, preferred language, and referral source. Treatment and NDPR data-processing consent are required to proceed.',
    },
    {
      heading: 'Review & Confirm',
      body: 'A read-only summary of everything entered — use the Edit link on any section to jump back and correct it. Check the confirmation box to enable "Complete Registration," which saves the patient and shows their MRN.',
    },
    {
      heading: 'Saving progress',
      body: '"Save as Draft" keeps your progress without validating every field, so you can finish it later from Patient Directory. "Next" validates the current step before moving on.',
    },
  ],
};

const CHECK_IN_GUIDE: HelpGuide = {
  id: 'check-in',
  title: 'Check-In',
  intro: "Verify a patient's appointment, check them in, and assign a queue number.",
  sections: [
    {
      heading: 'Verify Appointment vs Walk-in Registration',
      body: "Verify Appointment looks up today's scheduled appointment for the patient you search for. Walk-in Registration skips that lookup entirely — use it for patients arriving without a prior booking.",
    },
    {
      heading: 'Finding a patient',
      body: 'Search by name, MRN, phone, or National ID, or use Scan ID to pull up a patient instantly from their card or QR code.',
    },
    {
      heading: 'Visit Details',
      body: 'In Verify Appointment mode these fields pre-fill from the matched appointment. In Walk-in Registration mode you fill them in directly — Visit Type, Department, and Purpose of Visit are required either way.',
    },
    {
      heading: 'Queue, routing, and notification',
      body: 'Assign Queue Number generates the next number for today. Route to Clinic sets which unit and room the patient is sent to. Notify Department sends an arrival alert to that unit.',
    },
    {
      heading: 'Completing check-in',
      body: 'The progress bar at the bottom tracks all five steps. Complete Check-In only unlocks once a patient is found, Visit Details are filled in, and a queue number has been assigned.',
    },
  ],
};

const APPOINTMENT_SCHEDULING_GUIDE: HelpGuide = {
  id: 'appointment-scheduling',
  title: 'Appointment Scheduling',
  intro: "Book, reschedule, or cancel a patient appointment against any doctor's calendar.",
  sections: [
    {
      heading: 'Search Patient and the booking form',
      body: 'Find the patient first, then fill in Department, Doctor, Visit Type, Date and Time — these are required before a slot can be booked. Appointment Mode and Reason for Visit are optional context.',
    },
    {
      heading: 'Doctors panel and the calendar',
      body: 'The Doctors list is a browsing aid — search by name and pick a card to jump the booking form to that doctor and department. The calendar itself always shows every provider so you can compare availability side by side.',
    },
    {
      heading: 'Reading the calendar',
      body: 'Colored blocks are existing appointments (see the legend for what each status means); a dashed "Available Slot" outline marks the exact date/time/doctor combination currently set in the form.',
    },
    {
      heading: 'Day, Week and Month views',
      body: "Day is the full schedule for one doctor's clinic. Week and Month summarize appointment counts for the doctor currently selected in the form — click any day to jump straight to its Day view.",
    },
    {
      heading: 'Reschedule and Cancel',
      body: 'Both require an existing appointment to be selected first — click any block in the calendar. Reschedule opens an inline date/time picker; Cancel marks it Cancelled without deleting its history.',
    },
  ],
};

const VISIT_HISTORY_GUIDE: HelpGuide = {
  id: 'visit-history',
  title: 'Visit History',
  intro:
    "Find any patient first, then review a filterable log of every encounter they've had, across every department.",
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search by name, MRN, or Student ID across the full patient list, or browse the paginated table directly. Selecting a patient opens their visit history; "Change Patient" returns to this search at any time.',
    },
    {
      heading: 'Filtering',
      body: 'Narrow the list by Date Range, Department, Visit Type, or Status. "Filter" confirms how many visits currently match; the table itself already updates live as you change any filter.',
    },
    {
      heading: 'Reading a visit',
      body: 'Each row shows the department, the attending provider with their credentials, the visit type, and a short diagnosis summary. The eye icon opens that visit; the second icon downloads a summary for it.',
    },
    {
      heading: 'Visit Summary',
      body: "The panel on the right totals this patient's visits, departments, and emergency presentations at a glance — recomputed from the same visits shown in the table below.",
    },
    {
      heading: 'Export',
      body: 'Export produces a CSV or PDF of exactly the visits currently passing your filters, not the full unfiltered history.',
    },
  ],
};

const CLINICAL_DOCUMENTS_GUIDE: HelpGuide = {
  id: 'clinical-documents',
  title: 'Clinical Documents',
  intro:
    'Find any patient first, then browse and organize every clinical document on their record by category.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search by name, MRN, or Student ID, or browse the paginated table directly. Selecting a patient opens their document library; "Change Patient" returns to this search at any time.',
    },
    {
      heading: 'Category tabs and Document Categories',
      body: 'The tabs above the table and the "Document Categories" panel on the right both filter by the same category — Consultation Notes, Discharge Summaries, Referral Letters, Medical Certificates, Imaging Reports, and Consent Forms. Use whichever is more convenient; they stay in sync.',
    },
    {
      heading: 'Filtering',
      body: 'Narrow further by Department or Date Range, then "Filter" to confirm the match count. "Reset" clears every filter, including the active category.',
    },
    {
      heading: 'Row actions',
      body: 'The eye icon opens a document, the download icon saves it, and the overflow menu offers renaming or sharing with the care team.',
    },
    {
      heading: 'Storage Summary',
      body: "The donut chart on the right breaks this patient's documents down by file type (PDF, Image, Other) rather than by clinical category, so you can see storage composition at a glance.",
    },
  ],
};

const MEDICAL_RECORD_PATIENT_GUIDE: HelpGuide = {
  id: 'medical-record-patient',
  title: 'Medical Record',
  intro:
    'The complete clinical record for one patient — summary, documents, activity, and access history.',
  sections: [
    {
      heading: 'Overview tab',
      body: 'Medical Summary and Record Information sit side by side, followed by Documents & Files below. The other tabs (Visit History, Medical Documents, Lab Results, and more under "More") each open a focused view of one part of this same record.',
    },
    {
      heading: 'Documents & Files',
      body: 'Filter by document type with the pills above the table, then use the row actions to view, download, rename, share, or delete a document. "Link Document" attaches an existing file to this record without a fresh upload.',
    },
    {
      heading: 'Record Activity and Access',
      body: 'Activity is a timestamped trail of everything that changed on this record. Access lists everyone who has opened it — both exist to support the audit-log requirement noted at the bottom of the page.',
    },
    {
      heading: 'Quick Actions',
      body: "Add a clinical note, request a correction to this record, jump to the full visit history, or update demographics (handled from the patient's Registration profile) — all without leaving this page.",
    },
  ],
};

const RECORD_REQUESTS_GUIDE: HelpGuide = {
  id: 'record-requests',
  title: 'Record Requests',
  intro: 'Track and act on every internal and external request for a copy of a patient record.',
  sections: [
    {
      heading: 'Status tabs',
      body: 'All Requests, Pending, In Progress, Fulfilled, and Rejected each filter the same table — the stat cards above show live counts per status.',
    },
    {
      heading: 'Filtering',
      body: 'Search by patient, MRN, or request number, or narrow by requester type (Internal, External, Insurance, Legal, Patient Self-Request).',
    },
    {
      heading: 'Working a request',
      body: 'Open the eye icon to see the full request, then Approve & Start (Pending → In Progress), Mark Fulfilled (In Progress → Fulfilled), or Reject — each transition is logged with a timestamp.',
    },
    {
      heading: 'New Request',
      body: 'Log a request on a requester’s behalf — pick the patient, who’s asking, why, and by when it’s needed.',
    },
  ],
};

const ARCHIVED_RECORDS_GUIDE: HelpGuide = {
  id: 'archived-records',
  title: 'Archived Records',
  intro:
    'Patient records retired from the active register — restorable on request until retention lapses.',
  sections: [
    {
      heading: 'Why a record is archived',
      body: 'Graduation/leaving the institution, transfer to another facility, death, a duplicate entry, or the records retention policy aging out an inactive record — the Reason column and filter cover all five.',
    },
    {
      heading: 'Retention Expiring Soon',
      body: 'This stat flags records whose retention window closes within 90 days — a signal to review before they become eligible for permanent deletion.',
    },
    {
      heading: 'Restoring a record',
      body: 'The restore icon moves a record back to the active register immediately after a confirmation step — it becomes searchable everywhere again, including Patient Directory.',
    },
  ],
};

const DOCUMENT_UPLOAD_GUIDE: HelpGuide = {
  id: 'document-upload',
  title: 'Document Upload',
  intro: 'Scan or attach a document straight into a patient’s clinical record.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search or browse the full patient list first — everything below applies to whichever patient you select.',
    },
    {
      heading: 'Adding files',
      body: 'Drag files onto the drop zone or click to browse. PDF, JPG, and PNG are accepted up to 20MB each; remove a file from the list before uploading if you added it by mistake.',
    },
    {
      heading: 'Document Type and Department',
      body: 'Both are required — Document Type determines which Clinical Documents category and tab the file lands in once uploaded.',
    },
    {
      heading: 'Link to Visit',
      body: 'Optional, but linking a visit lets clinicians find this document from that visit’s entry in Visit History rather than only from Clinical Documents.',
    },
  ],
};

const PATIENT_STATISTICS_GUIDE: HelpGuide = {
  id: 'patient-statistics',
  title: 'Patient Statistics',
  intro: 'Comprehensive overview of patient demographics and center performance.',
  sections: [
    {
      heading: 'Stat cards and exports',
      body: 'Total/Active Patients, Male/Female, and Students/Staff summarize the whole center. Dashboard Snapshot, Export Excel, and Export PDF capture this view for sharing.',
    },
    {
      heading: 'Distribution charts',
      body: 'Age, Gender, and Faculty Distribution (Students) break the total down by category. Top Diagnoses ranks the most common conditions seen this period.',
    },
    {
      heading: 'Visit Frequency and Monthly Growth',
      body: 'Visit Frequency shows how many patients return versus visit once. Monthly Growth tracks new patient registrations over time.',
    },
    {
      heading: 'Key Insights',
      body: 'Most Visited Department, Most Common Complaint, Repeat Visits, Average Visits Per Student, and Peak Clinic Hours highlight the standout numbers from this period at a glance.',
    },
  ],
};

const DAILY_ATTENDANCE_GUIDE: HelpGuide = {
  id: 'daily-attendance',
  title: 'Daily Attendance',
  intro: 'Real-time overview of patient attendance and visit status.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Patients Checked-In, Completed Visits, Waiting, No Shows, Emergencies, and Average Waiting Time all compare against yesterday.',
    },
    {
      heading: 'Filters',
      body: 'Narrow the charts and table by Date, Department, Doctor, Clinic, or Status, then Apply Filters. Reset returns to the full unfiltered view.',
    },
    {
      heading: 'Charts',
      body: "Hourly Attendance tracks footfall through the day. Department Attendance breaks down today's check-ins by department. Average Waiting Time compares wait times across departments.",
    },
    {
      heading: 'Attendance table',
      body: 'Click a row (or its eye icon) to select a patient, then use View Patient to jump to their record. Export and Print act on every row currently passing your filters.',
    },
  ],
};

const REGISTRATION_REPORTS_GUIDE: HelpGuide = {
  id: 'registration-reports',
  title: 'Registration Reports',
  intro: 'Analytics and insights on patient registrations and operational performance.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Registrations, New Patients, Returning Patients, Walk-ins, Emergency Registrations, and Appointments each compare against last month, with a mini trend line.',
    },
    {
      heading: 'Filters',
      body: 'Narrow every chart and the table below by Date Range, Department, Registration Type, Student Category, Faculty, Gender, or Age Group, then Apply Filters. Reset returns to the full unfiltered view.',
    },
    {
      heading: 'Charts',
      body: 'Registrations by Day and by Month track volume over time. Faculty Distribution and Gender Distribution break down the same total by category. Peak Registration Hours shows when registrations happen during the day.',
    },
    {
      heading: 'Registrations Details',
      body: 'Every registration, one row per patient. Export PDF, Excel, CSV, or Print exports exactly the rows currently passing your filters.',
    },
  ],
};

const PATIENT_CARD_PRINTING_GUIDE: HelpGuide = {
  id: 'patient-card-printing',
  title: 'Patient Card Printing',
  intro: 'Issue, print, and manage patient identification cards.',
  sections: [
    {
      heading: 'Card list and filters',
      body: 'Search by patient name, MRN, or card ID, then narrow by Card Type, Status, or issue date. Checkboxes let you select several cards for a batch print.',
    },
    {
      heading: 'Card Preview',
      body: 'Selecting a card shows a real preview of the printed ID card alongside print history — status, print count, and who last printed it.',
    },
    {
      heading: 'Actions',
      body: "Print and Reprint generate a printable card (opens your browser's print dialog); Download PDF saves it; Report Lost/Damaged flags the card for reissue.",
    },
    {
      heading: 'Quick Actions',
      body: "New Card Print starts a fresh card for a patient. Batch Print sends every checked card to print at once. Card Templates lets you start a new card pre-set to a template's card type.",
    },
  ],
};

const CONSENT_FORMS_GUIDE: HelpGuide = {
  id: 'consent-forms',
  title: 'Consent Forms',
  intro: 'Manage patient consent forms and treatment authorizations.',
  sections: [
    {
      heading: 'Stat cards and filters',
      body: 'The cards summarize consent volume at a glance. Search by patient, MRN, or consent ID, then narrow by Consent Type, Department, Signature Status, Doctor, Date Created, or Procedure Type.',
    },
    {
      heading: 'Consent Details panel',
      body: 'Selecting a row opens its detail panel with Overview, Timeline, and Audit Trail tabs — patient info, consent information, required signatures, and a QR verification code.',
    },
    {
      heading: 'Required Signatures',
      body: 'Click a Pending signature badge to record it as signed. Once every required signer has signed, the consent automatically moves to Signed.',
    },
    {
      heading: 'Actions',
      body: "View, Edit, Download PDF, Print, Request Signature, and Archive are available both from each row's ⋮ menu and from the detail panel.",
    },
    {
      heading: 'Quick Actions',
      body: 'New Consent Form and Generate Consent open the creation form. Request Digital Signature, Print Consent, Upload Signed Copy, and Archive Consent act on whichever consent is currently selected.',
    },
  ],
};

const INSURANCE_VERIFICATION_GUIDE: HelpGuide = {
  id: 'insurance-verification',
  title: 'Insurance Verification',
  intro:
    'Verify a patient’s insurance coverage, check eligibility, and record authorization status.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search or browse the full patient list first — everything below applies to whichever patient you select.',
    },
    {
      heading: 'Insurance Information and Verification',
      body: 'Enter the policy details, then run Real-time Eligibility Check or Manual Verification. Verify Eligibility populates the Verification Result card and adds an entry to the Activity Timeline.',
    },
    {
      heading: 'Coverage Details',
      body: 'Shows the per-category coverage percentage, copay, coinsurance, and limit that apply once eligibility is confirmed.',
    },
    {
      heading: 'Authorization',
      body: 'Record whether prior authorization was granted, its reference number, and the next review date — required before completing the verification.',
    },
    {
      heading: 'Saving',
      body: 'Save as Draft keeps your progress without finalizing; Save & Complete requires Insurance Provider, Policy Number, and Policy Holder Name.',
    },
  ],
};

const REFERRAL_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'referral-management',
  title: 'Referral Management',
  intro: 'Track and manage incoming and outgoing patient referrals between departments.',
  sections: [
    {
      heading: 'Tabs and filters',
      body: 'Switch between All, Incoming, Outgoing, Pending, Completed, and Cancelled, then narrow further with search, Type, Status, Department, and Date Range.',
    },
    {
      heading: 'Referral rows',
      body: 'Click a row or the eye icon to open its full detail. The ⋮ menu offers Accept, Mark Completed, or Cancel depending on the referral’s current status.',
    },
    {
      heading: 'New Referral',
      body: 'New Referral (and the two Quick Actions) opens the same form pre-set to Outgoing or Incoming — patient, departments, referring physician, priority, and reason are required before submitting.',
    },
    {
      heading: 'Referral Directory and Templates',
      body: 'Referral Directory lists departments and contacts for outgoing referrals. Referral Templates lets you start a new referral pre-filled from a standard letter.',
    },
    {
      heading: 'Referral Overview',
      body: 'The donut chart and Recent Activity panel summarize referral volume and the latest status changes at a glance.',
    },
  ],
};

const MEDICAL_RECORDS_REPORTS_GUIDE: HelpGuide = {
  id: 'medical-records-reports',
  title: 'Medical Records Reports',
  intro: 'Monitor record management performance and activity across every department.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Records Retrieved, Updated, New Medical Files, Archived Records, Record Requests, and Avg. Retrieval Time each compare against last month.',
    },
    {
      heading: 'Filters',
      body: 'Narrow everything below — charts and the activity table — by date range, officer, department, or record status, then Apply Filters. Reset returns to the full unfiltered view.',
    },
    {
      heading: 'Charts',
      body: 'Retrieval Trend and Archive Trend track daily volume across the selected range. Record Requests breaks down status (Pending/In Progress/Completed/Rejected). Department Usage ranks departments by records retrieved.',
    },
    {
      heading: 'Medical Records Activity',
      body: 'Every retrieval, update, and archive action, one row per event. Export PDF, Excel, or CSV exports exactly the rows currently passing your filters.',
    },
  ],
};

const STAFF_NOTIFICATIONS_GUIDE: HelpGuide = {
  id: 'staff-notifications',
  title: 'Notifications',
  intro:
    'Real-time operational alerts — registrations, queue, consent, insurance, and records activity.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Unread, Today, This Week, and Critical Alerts summarize the list below at a glance.',
    },
    {
      heading: 'Notification Categories',
      body: 'Click a category on the left (or use the Notification Type filter) to narrow the list — they stay in sync with each other.',
    },
    {
      heading: 'Filtering',
      body: 'Combine Priority, Date, Department, and Notification Type, then Filter. Reset clears everything back to the full list.',
    },
    {
      heading: 'Row actions',
      body: 'The eye icon marks a notification read and shows its full detail. The folder icon opens the related patient record when one is linked. The trash icon removes it from your list.',
    },
  ],
};

const NURSE_NOTIFICATIONS_GUIDE: HelpGuide = {
  id: 'nurse-notifications',
  title: 'Notifications',
  intro:
    'Real-time alerts for your patients, ward, and shift — critical results, medication due, vitals, and more.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Unread, Today, This Week, and Critical Alerts summarize the list below at a glance.',
    },
    {
      heading: 'Notification Categories',
      body: 'Click a category on the left (or use the Notification Type filter) to narrow the list — Critical Lab Result, Medication Due, Patient Assigned, Vitals Alert, Care Plan Update, Discharge Ready, Shift Handover Reminder, and System Announcement.',
    },
    {
      heading: 'Filtering',
      body: 'Combine Priority, Date, Ward, and Notification Type, then Filter. Reset clears everything back to the full list.',
    },
    {
      heading: 'Row actions',
      body: 'The open-arrow icon marks a notification read and takes you straight to the relevant screen — Laboratory for a critical result, Medication Administration for a dose due, and so on. The trash icon removes it from your list.',
    },
  ],
};

const ANNOUNCEMENTS_GUIDE: HelpGuide = {
  id: 'announcements',
  title: 'Announcements',
  intro: 'Hospital-wide and department-specific announcements, with read tracking and pinning.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total, Unread, and Pinned announcements, plus a Departmental vs System Wide breakdown.',
    },
    {
      heading: 'Finding an announcement',
      body: 'Use the All / Unread / Pinned pills, the Department dropdown, Filter (by priority), or search — select a row to view its full detail on the right.',
    },
    {
      heading: 'Reading an announcement',
      body: 'The detail panel shows the full message, any attachment, target audience, and read/unread recipient stats. "Mark as Read" records that you have read it; "Share Announcement" copies a link.',
    },
    {
      heading: 'Posting and managing',
      body: '"New Announcement" opens the compose form — set scope, department, priority, message, and target audience. The "⋮" menu on an open announcement lets you pin/unpin or delete it.',
    },
  ],
};

const NURSING_REPORTS_GUIDE: HelpGuide = {
  id: 'nursing-reports',
  title: 'Nursing Reports',
  intro:
    'Eight ward and clinical reports in one place, each viewable in full and exportable individually or together.',
  sections: [
    {
      heading: 'The report cards',
      body: 'Medication Administration, Shift, Ward Census, Vital Signs, Admission, Discharge, Patient Observation, and Medication Due — each shows key stats plus a preview table or chart.',
    },
    {
      heading: 'Date range and filtering',
      body: 'The date range button at the top sets the reporting period and refreshes every card. "Filter" narrows the grid down to specific report categories.',
    },
    {
      heading: 'Viewing and exporting',
      body: '"View Report" opens the full underlying data for that card. "Export" downloads a single report; "Export All" downloads every currently visible report in one file.',
    },
  ],
};

const EMERGENCY_REGISTRATION_GUIDE: HelpGuide = {
  id: 'emergency-registration',
  title: 'Emergency Registration',
  intro:
    'The fast path for an emergency arrival — minimal required fields, immediate routing to the ED.',
  sections: [
    {
      heading: 'Known vs Unknown Patient',
      body: 'Known Patient searches the existing patient record and locks Age, Gender and Date of Birth to what is already on file. Unknown Patient (the default for an unidentified arrival) leaves every field editable and assigns a new emergency MRN automatically.',
    },
    {
      heading: 'Required fields',
      body: 'Patient Name, Age, Gender, Emergency Contact (Name, Relationship, Phone), Arrival Time, Arrival By, Triage Priority and Chief Complaint must all be filled in before registration can complete — everything else is optional context for the triage nurse.',
    },
    {
      heading: 'Triage Priority',
      body: 'Red (Immediate) through Blue (Non-Urgent) sets how urgently the triage nurse should see the patient. It drives the Status shown in the Registration Summary and is visible to the ED team the moment registration completes.',
    },
    {
      heading: 'Registration Summary and Routing',
      body: 'The right-hand panel mirrors the form live, including a preview of the emergency MRN before you submit. Routing Information confirms the patient goes straight to the Emergency Department / Triage Area, and Next Steps tracks what happens after registration.',
    },
  ],
};

const PATIENT_PROFILE_REGISTRATION_GUIDE: HelpGuide = {
  id: 'patient-profile-registration',
  title: 'Patient Profile',
  intro:
    'A full administrative record for one patient — demographics, insurance, student details, and activity history.',
  sections: [
    {
      heading: 'Overview tab',
      body: "Personal Information, Contact Details, Next of Kin, Insurance, and Student Information are each editable independently via their own Edit link — changes to one section don't require re-entering the others.",
    },
    {
      heading: 'Medical Alerts',
      body: 'Allergies, chronic conditions, and other clinical alerts (e.g. religious or procedural restrictions) are reviewed periodically — "Add Alert" records a new one. The allergy banner above the tabs always reflects the same data.',
    },
    {
      heading: 'Registration History & Visit Summary',
      body: 'A timeline of everything that happened when this patient was registered, plus a running total of visits, the most recent one, and the next upcoming appointment.',
    },
    {
      heading: 'Quick Actions',
      body: 'Check the patient in, schedule an appointment, jump to their medical records, print their card, or upload a document — all without leaving this page.',
    },
  ],
};

const PATIENT_DIRECTORY_GUIDE: HelpGuide = {
  id: 'patient-directory',
  title: 'Patient Directory',
  intro: 'Search, filter, and manage every registered patient from one place.',
  sections: [
    {
      heading: 'Search and filters',
      body: 'Search by name, MRN, Student ID, National ID, phone, or email. The Filter panel narrows results by category, gender, faculty/department, registration date, appointment status, insurance provider, or status — Reset clears everything back to the full list.',
    },
    {
      heading: 'Patient details panel',
      body: 'Click any row to open that patient in the right-hand panel — full contact info, insurance, and registration history, plus Quick Actions to view their profile, check them in, print their card, or schedule an appointment.',
    },
    {
      heading: 'Bulk actions',
      body: 'Select multiple patients with the row checkboxes to export, print cards, assign a category, or archive records for the whole group at once.',
    },
    {
      heading: 'Exporting',
      body: 'Export downloads the currently filtered list as CSV or PDF. Export Selected in the bulk action bar exports only the checked rows.',
    },
  ],
};

const REGISTRATION_DASHBOARD_GUIDE: HelpGuide = {
  id: 'registration-dashboard',
  title: 'Patient Registration Dashboard',
  intro:
    'Your daily overview of registration activity — new patients, check-ins, and appointments.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Each card tracks one metric against yesterday — patients registered, new vs returning patients, check-in queue, appointments, and emergency registrations.',
    },
    {
      heading: 'Quick Actions',
      body: 'Jump straight to registering a patient, finding an existing one, checking someone in, scheduling an appointment, printing a patient card, or starting an emergency registration.',
    },
    {
      heading: 'Recent activity',
      body: "Today's Appointments and Recent Patient Registrations show the latest activity; System Announcements carries hospital-wide notices.",
    },
  ],
};

const PRESCRIPTION_DETAILS_GUIDE: HelpGuide = {
  id: 'prescription-details',
  title: 'Prescription Details',
  intro: 'The full record for one prescription — patient, medication, alerts, and actions.',
  sections: [
    {
      heading: 'Patient Information and Clinical Alerts',
      body: "Patient Information shows who the prescription is for. Clinical Alerts surfaces an allergy match, a real drug interaction against the patient's active medications, and any prescriber notes — only when they apply.",
    },
    {
      heading: 'Prescription Status',
      body: 'A step tracker for where this prescription is in the pipeline. While it awaits verification, a live countdown shows time remaining against its priority-based SLA; once dispensed, collected, or cancelled, that space shows the timestamp instead.',
    },
    {
      heading: 'Prescription Items and Stock Availability',
      body: 'The medication, strength, dose, duration, and quantity, with a matching Stock Availability check against current inventory.',
    },
    {
      heading: 'Notes and Attachments',
      body: 'Add or edit a pharmacist note directly on this prescription — it saves immediately and shows up in the Audit Trail. Attachments lists supporting documents with a real download.',
    },
    {
      heading: 'Before Verification Checklist and Actions',
      body: 'Before a pending prescription can be verified, confirm each item in the checklist. Actions adapts to the current stage: Verify/Dispense, Mark Collected, Hold/Resume, or Reject — only the ones that make sense from where the prescription is now.',
    },
  ],
};

const MEDICATION_REFILL_REQUESTS_GUIDE: HelpGuide = {
  id: 'medication-refill-requests',
  title: 'Medication Refill Requests',
  intro: 'Review and manage patient-initiated requests to refill an existing prescription.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Requests, Pending Review, Approved, Dispensed, and Denied summarize the queue. Click a card to filter the table to that status.',
    },
    {
      heading: 'Approving a request',
      body: "Approve Request creates a real, dispensable prescription in the Prescription Queue — it isn't just a label change. Once that prescription is actually dispensed, this request automatically updates to Dispensed.",
    },
    {
      heading: 'Denying a request',
      body: 'Deny Request marks the request as not approved. Both actions are only available while a request is still Pending Review.',
    },
    {
      heading: 'Refill Request Overview and Request Sources',
      body: 'The donut chart breaks down every request by status. Request Sources shows where requests came from — the Patient Portal, the mobile app, a doctor, or a walk-in/phone request.',
    },
  ],
};

const LOW_STOCK_ALERTS_GUIDE: HelpGuide = {
  id: 'low-stock-alerts',
  title: 'Low Stock Alerts',
  intro: 'Monitor medications running low and reorder on time to avoid stockouts.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Critical, Low Stock, Reorder Recommended, and All Good are clickable — each filters the table to that alert level.',
    },
    {
      heading: 'Days of Stock',
      body: 'Estimated from each batch’s reorder level (a real threshold already sized for about 30 days of typical usage), not a separate guess.',
    },
    {
      heading: 'Alert Settings',
      body: 'Adjusts the day thresholds Critical and Low Stock are computed from — changes apply immediately across the table, stat cards, and donut.',
    },
    {
      heading: 'Row actions',
      body: 'Adjust Stock corrects both quantity and reorder level. Create Purchase Order opens Procurement Requests to start a request for that medication.',
    },
  ],
};

const PROCUREMENT_REQUESTS_GUIDE: HelpGuide = {
  id: 'procurement-requests',
  title: 'Procurement Requests',
  intro: 'Create and manage requests for medication and supplies procurement.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Pending Approval, Approved, Ordered, Partially Received, and Completed are clickable — each filters the table to that status.',
    },
    {
      heading: 'New Request',
      body: 'Pick a request type first — the item picker searches medications, medical supplies, or equipment separately. Request Templates starts a request pre-filled from a common preset instead.',
    },
    {
      heading: 'Approving and ordering',
      body: 'Approve or Reject a Pending Approval request from its detail view. Marking an Approved request "Ordered" creates a real purchase order and sends it straight to Stock Receiving — it isn’t just a status change.',
    },
    {
      heading: 'Request Overview and Recent Requests',
      body: 'The donut chart breaks every request down by status. Recent Requests lists the newest five — select one to open its full detail.',
    },
  ],
};

const SUPPLIERS_GUIDE: HelpGuide = {
  id: 'suppliers',
  title: 'Suppliers',
  intro: 'Manage and maintain supplier information and performance.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Active, Preferred, Pending Approval, and Inactive are clickable — each filters the table to that status. Preferred is a tag on an Active supplier, not a separate exclusive state.',
    },
    {
      heading: 'Approving a new supplier',
      body: 'Add Supplier registers a Pending Approval entry. It only becomes selectable on other stock-movement screens (Add Stock, Drug Inventory, Procurement Requests) once approved from its row menu here.',
    },
    {
      heading: 'Row actions',
      body: 'Approve/Reject while Pending Approval. Mark as Preferred/Deactivate while Active. Reactivate while Inactive.',
    },
    {
      heading: 'Suppliers by Category and Top Suppliers by Spend',
      body: 'The donut chart breaks every supplier down by category. Top Suppliers by Spend ranks active suppliers by year-to-date spend — select one to open its full detail.',
    },
  ],
};

const ADR_GUIDE: HelpGuide = {
  id: 'adr',
  title: 'Adverse Drug Reactions (ADR)',
  intro: 'Report, monitor, and manage adverse drug reactions to improve patient safety.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Under Assessment, Serious ADRs, Resolved, and This Month are clickable — each filters or scopes the table to that subset.',
    },
    {
      heading: 'Reporting a new ADR',
      body: 'Report New ADR requires picking a real patient from the directory first, so the allergy banner and MRN are genuine. Severity, causality, and drug class are all captured at report time.',
    },
    {
      heading: 'Status lifecycle',
      body: 'A new report starts Under Assessment. From there it can be Marked as Resolved, or — for Severe cases — Reported to NPC (the National Pharmacovigilance Centre). Both are terminal, audit-safe states.',
    },
    {
      heading: 'ADR by Severity and Top Suspected Drug Classes',
      body: 'The donut chart breaks every report down by severity. Top Suspected Drug Classes ranks drug classes by how many reports name a drug in that class.',
    },
  ],
};

const DISPENSING_AUDIT_TRAIL_GUIDE: HelpGuide = {
  id: 'dispensing-audit-trail',
  title: 'Dispensing Audit Trail',
  intro:
    'Track and review all dispensing activities for accountability, compliance, and patient safety.',
  sections: [
    {
      heading: 'Stat cards',
      body: "Today's Events, Modified Records, Deleted / Voided, and Accessed Records are clickable — each filters the table to that subset.",
    },
    {
      heading: 'Immutability',
      body: 'Records here can never be edited or deleted — Void and Delete are themselves logged as new events, not erasures of the original. See Retention Policy for the full rule set.',
    },
    {
      heading: 'Live events',
      body: 'A real dispense completed on Dispense Medication, Prescription Queue, or Prescription Details appears here immediately as a new Dispense event — this log is not a separate, disconnected record.',
    },
    {
      heading: 'Audit Trail Summary and Actions by User',
      body: 'The donut chart breaks every event down by action. Actions by User ranks staff by event count for the current month.',
    },
  ],
};

const MEDICATION_RETURNS_GUIDE: HelpGuide = {
  id: 'medication-returns',
  title: 'Medication Returns',
  intro: 'Manage returned medications and update inventory accurately.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Returns This Month, Pending Processing, Completed, and Rejected are clickable — each filters or scopes the table to that subset.',
    },
    {
      heading: 'Recording a new return',
      body: 'New Return requires picking a real patient first — if they have recent dispensing history, you can select directly from it. Otherwise search the drug catalog. Either way the return is tied to real medication data, not free text.',
    },
    {
      heading: 'Completing a return',
      body: 'Completing a Pending return actually restocks the units into Drug Inventory as a new quarantined batch — unless the return type is Expired/Damaged, which is destroyed instead of resold.',
    },
    {
      heading: 'Returns by Reason and Returns by Status',
      body: 'The donut chart breaks every return down by reason category. Returns by Status ranks Completed, Pending, and Rejected by count.',
    },
  ],
};

const PHARMACY_QUEUE_MONITOR_GUIDE: HelpGuide = {
  id: 'pharmacy-queue-monitor',
  title: 'Pharmacy Queue Monitor',
  intro: 'Monitor all pharmacy queues in real-time and manage patient flow efficiently.',
  sections: [
    {
      heading: 'One live queue, four views',
      body: 'This is the same live dispensing queue Prescription Queue and Medication Pickup Queue read from — Prescription Waiting, Dispensing, Ready for Pickup, and On Hold are just different ways of looking at it, not separate data.',
    },
    {
      heading: 'Stat cards and tabs',
      body: 'Prescription Waiting, Dispensing, Ready for Pickup, and On Hold are clickable — each scopes the table to that queue. On Hold is a cross-cutting flag, so a held entry shows there instead of its underlying stage.',
    },
    {
      heading: 'Row actions',
      body: 'Move to Next Queue advances an entry one stage. Mark as Ready for Pickup jumps straight to ready and logs a real dispense — it shows up in Dispensing Audit Trail too. Put On Hold / Release Hold works at any stage.',
    },
    {
      heading: 'Queue Overview and Average Wait Time',
      body: "The donut chart breaks the live queue down by type. Average Wait Time by Queue is computed from each entry's own joined or dispensed time, not a static estimate.",
    },
  ],
};

const PRESCRIPTION_REPORT_GUIDE: HelpGuide = {
  id: 'prescription-report',
  title: 'Prescription Report',
  intro: 'Comprehensive overview of prescriptions and dispensing activities.',
  sections: [
    {
      heading: 'Stat cards and filters',
      body: 'Filters (date range, location, prescriber, department, type — More Filters adds status) are staged as you change them. Generate Report applies them to the summary panels, charts, and table together.',
    },
    {
      heading: 'Prescriptions Trend',
      body: 'Switch between Daily, Weekly, and Monthly views — Weekly is a real aggregation of the same daily figures, so the two can never disagree.',
    },
    {
      heading: 'Prescriptions by Department and the sidebar panels',
      body: 'The donut, Prescription Summary, Top Prescribers, and Top Prescribed Medications all share the same underlying totals — figures that share a total (New + Repeat, department slices) are computed from it, not entered separately.',
    },
    {
      heading: 'Row actions and exporting',
      body: 'View opens a read-only record; a Pending prescription also links straight to the live Prescription Queue. Export Report and Schedule Report both act on whatever the table currently shows.',
    },
  ],
};

const DISPENSING_REPORT_GUIDE: HelpGuide = {
  id: 'dispensing-report',
  title: 'Dispensing Report',
  intro: 'Comprehensive overview of medication dispensing activities.',
  sections: [
    {
      heading: 'Where the rows come from',
      body: "Dispensing Details is the Dispensed subset of Prescription Report's own records, enriched with the medication, quantity, and pharmacist that report has no reason to carry — the same RX shows up in both.",
    },
    {
      heading: 'Stat cards and filters',
      body: 'Filters (date range, location, pharmacist, department, dispensed by) are staged as you change them. Generate Report applies them to the summary panels, charts, and table together.',
    },
    {
      heading: 'Dispensing Trend',
      body: 'Switch between Daily, Weekly, and Monthly views — Weekly is a real aggregation of the same daily figures.',
    },
    {
      heading: 'Dispensed By and System entries',
      body: '"System" identifies auto-dispensed records with no individual pharmacist attached — the footer note about manual and system-generated records is about this same distinction.',
    },
  ],
};

const INVENTORY_REPORT_GUIDE: HelpGuide = {
  id: 'inventory-report',
  title: 'Inventory Reports',
  intro: 'Comprehensive overview of pharmacy inventory and stock status.',
  sections: [
    {
      heading: 'A live snapshot, not a history',
      body: 'Unlike Prescription and Dispensing Report, this reads the same live inventory Drug Inventory and Batch Management already show — adjust stock or complete a transfer there and the numbers here update immediately.',
    },
    {
      heading: 'What filters and what doesn’t',
      body: 'Location, Category, Supplier, and Stock Status genuinely filter the details table. Date Range is collected but batches carry no received-date field to filter against.',
    },
    {
      heading: 'Stat cards and the category donut',
      body: 'Every stat card, the donut, and the summary panel always describe the full current inventory; Generate Report’s filters scope only the table below, same as the other report screens.',
    },
    {
      heading: 'Row actions',
      body: 'View Details opens a read-only snapshot of that batch; Go to Drug Inventory is the real place to adjust stock — this report stays read-only.',
    },
  ],
};

const STOCK_MOVEMENT_REPORT_GUIDE: HelpGuide = {
  id: 'stock-movement-report',
  title: 'Stock Movement Report',
  intro: 'Every stock in, stock out, transfer, and adjustment across the pharmacy.',
  sections: [
    {
      heading: 'Four real workflows, one ledger',
      body: 'Stock Receiving, Stock Transfers, Stock Adjustments, and Medication Returns each already mutate the real inventory — this report unifies their events into one movement ledger rather than inventing a separate log.',
    },
    {
      heading: 'In vs. Out',
      body: 'A completed transfer produces two rows — an Out at the source location and an In at the destination — so total Stock In and Stock Out from transfers always balance exactly.',
    },
    {
      heading: 'Stat cards and the trend chart',
      body: 'Every stat card and the 14-day trend chart are computed from real event dates and quantities, not a decorative series — sparse days are real gaps, not a display bug.',
    },
    {
      heading: 'Filters and the details table',
      body: 'Date Range, Location, Movement Type, and Direction all genuinely filter the table. Generate Report applies them; the stat cards and sidebar always describe the full ledger.',
    },
  ],
};

const EXPIRY_REPORT_GUIDE: HelpGuide = {
  id: 'expiry-report',
  title: 'Expiry Report',
  intro: 'Track medication expiry across the pharmacy and the value at risk.',
  sections: [
    {
      heading: 'The same live batches, an expiry lens',
      body: 'Like Inventory Report, this reads live from inventoryStore.ts — the same batches Expiry Management, Batch Management, and Low Stock Alerts already show, classified with the same getExpiryBucket() helper.',
    },
    {
      heading: 'Expiry Date Range really filters',
      body: 'Unlike Location on Inventory Report, Expiry Date Range genuinely filters the details table here — batches carry a real expiryDate, so the range narrows to whatever falls inside it.',
    },
    {
      heading: 'The timeline chart',
      body: 'Expiry Timeline buckets real batch expiry dates into the next 12 months, plus a bar for what has already expired — it is not a decorative series.',
    },
    {
      heading: 'Row actions',
      body: 'View Details opens a read-only snapshot; Go to Expiry Management is the real place to mark a batch returned or transfer it — this report stays read-only.',
    },
  ],
};

const PROCUREMENT_REPORT_GUIDE: HelpGuide = {
  id: 'procurement-report',
  title: 'Procurement Report',
  intro: 'Track purchase requests from submission through to receiving.',
  sections: [
    {
      heading: 'The same real request log',
      body: 'Reads live from procurementRequestStore.ts — the same requests Procurement Requests already shows, not a parallel invented dataset.',
    },
    {
      heading: 'Where Ordered requests go',
      body: 'Marking a request Ordered creates a real purchase order in Stock Receiving, which becomes real inventory once received — that same event also feeds Stock Movement Report’s ledger.',
    },
    {
      heading: 'Stat cards and the trend chart',
      body: 'Total Requests, Pending Approval, Approved, Ordered / In Transit, and Completed always sum consistently because they come from one disjoint status partition. The 14-day trend is bucketed from real request dates.',
    },
    {
      heading: 'Row actions',
      body: 'View Details opens a read-only snapshot of the request and its line items; Go to Procurement Requests is the real place to approve, reject, or mark it ordered.',
    },
  ],
};

const ADR_REPORT_GUIDE: HelpGuide = {
  id: 'adr-report',
  title: 'ADR Report',
  intro: 'Track adverse drug reaction reports from assessment through to closure.',
  sections: [
    {
      heading: 'The same live report log',
      body: 'Reads live from adrReportStore.ts — the same reports Adverse Drug Reactions already shows, using the same severity, causality, and status colour maps for consistency.',
    },
    {
      heading: 'Stat cards and the severity donut',
      body: 'Total Reports, Under Assessment, Resolved, and Reported to NPC always describe the full log — Generate Report’s filters scope only the details table below.',
    },
    {
      heading: 'The trend chart',
      body: 'ADR Reports Trend is bucketed from real reportedAt dates over the last 14 days, not a decorative series.',
    },
    {
      heading: 'Row actions',
      body: 'View Details opens a read-only snapshot; Go to Adverse Drug Reactions is the real place to mark a case resolved or reported to NPC — this report stays read-only.',
    },
  ],
};

const EXPIRY_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'expiry-management',
  title: 'Expiry Management',
  intro:
    'Monitor medication expiry dates and take action to minimize waste and ensure patient safety.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Expired Items, Expiring Within 30 Days, and the 31–60/61–90 day buckets are clickable — each filters the table to that window.',
    },
    {
      heading: 'The Expiry Items list',
      body: 'This table only shows items that are expired or within 90 days of expiry — healthy stock beyond that lives in Drug Inventory.',
    },
    {
      heading: 'Row actions',
      body: 'Mark as Returned removes an expired batch from available stock. Adjust Stock corrects its quantity. Transfer Batch opens Stock Transfers.',
    },
    {
      heading: 'Expiry Overview and Top Items Expiring Soon',
      body: 'The donut chart breaks all stock down by expiry window. Top Items Expiring Soon ranks the most urgent batches first.',
    },
  ],
};

const BATCH_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'batch-management',
  title: 'Batch Management',
  intro:
    'A batch-lifecycle view of Drug Inventory — manufacturing, expiry, and quarantine tracking.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Active Batches, Expiring Soon, Expired Batches, and On Hold / Quarantine are clickable — each filters the table to that status.',
    },
    {
      heading: 'Status',
      body: 'On Hold takes priority over every other status. Items are marked Expired automatically once the expiry date passes — there’s no manual "mark expired" action.',
    },
    {
      heading: 'Row actions',
      body: 'Adjust Stock corrects a batch’s quantity. Put On Hold / Release Hold quarantines a batch independent of its stock level. Transfer Batch opens Stock Transfers.',
    },
    {
      heading: 'Batch Status Overview and Expiry Calendar',
      body: 'The donut chart breaks every batch down by status. The Expiry Calendar buckets batches expiring in the next 90 days.',
    },
  ],
};

const STOCK_ADJUSTMENTS_GUIDE: HelpGuide = {
  id: 'stock-adjustments',
  title: 'Stock Adjustments',
  intro:
    'Correct stock quantities due to a physical count, damage, expiry, or another documented reason.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Increase and Decrease are clickable — each filters the table to that adjustment type. The rest summarize this month’s activity.',
    },
    {
      heading: 'Recording an adjustment',
      body: 'New Adjustment picks items from the chosen location’s actual tracked stock. A Decrease can never exceed what’s really on hand there. Confirming applies the change straight to Drug Inventory.',
    },
    {
      heading: 'Reasons',
      body: 'Expired Items, Damaged Items, and Spillage are always write-offs. Stock Count Adjustment, Received (Unrecorded), Patient Return, and Correction of Entry Error can go either direction.',
    },
    {
      heading: 'Adjustment Reasons and Value Impact',
      body: 'The donut chart breaks every adjustment down by reason. Value Impact shows this month’s total increase, decrease, and net effect on inventory value.',
    },
  ],
};

const STOCK_TRANSFERS_GUIDE: HelpGuide = {
  id: 'stock-transfers',
  title: 'Stock Transfers',
  intro: 'Transfer stock between pharmacy locations and track each transfer through to completion.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Pending Transfers and In Transit are clickable — each filters the table to that status. Completed and Cancelled/Rejected summarize this month’s activity.',
    },
    {
      heading: 'Requesting a transfer',
      body: 'New Transfer picks items from the source location’s actual current stock, so you can never request more than is really on hand there.',
    },
    {
      heading: 'Approving and completing',
      body: 'Approve & Dispatch moves a request to In Transit. Mark Completed is the real stock movement — it deducts the quantity from the source location and adds it to the destination in Drug Inventory.',
    },
    {
      heading: 'Transfer Overview and Top Transfer Destinations',
      body: 'The donut chart breaks this month’s transfers down by status. Top Transfer Destinations ranks locations by how many transfers were sent there.',
    },
  ],
};

const STOCK_RECEIVING_GUIDE: HelpGuide = {
  id: 'stock-receiving',
  title: 'Stock Receiving',
  intro: 'Receive stock from suppliers against a purchase order and update inventory levels.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Pending Receipts counts purchase orders still awaiting delivery. Items Receiving Today and Total Items/Value Received summarize this month’s actual receipts.',
    },
    {
      heading: 'Selecting a purchase order',
      body: 'Choosing a Purchase Order loads its supplier and line items automatically. View Purchase Orders lists every order, open or already received, and lets you pick one to receive.',
    },
    {
      heading: 'Items to Receive',
      body: 'Adjust the batch number, expiry date, and Received Qty for each line as you check the physical delivery. Add Item records something the supplier included that wasn’t on the original order.',
    },
    {
      heading: 'Confirming a receipt',
      body: 'Confirm & Save Receipt marks the purchase order Received (or Partial if any line was short), and adds every received item straight into Drug Inventory as new stock — a real event, not just a form.',
    },
  ],
};

const DRUG_INVENTORY_GUIDE: HelpGuide = {
  id: 'drug-inventory',
  title: 'Drug Inventory',
  intro:
    'Monitor stock levels, track expiry dates, and manage inventory across all pharmacy locations.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Items and Total Stock Value summarize the full inventory. Low Stock Items, Expiring Soon, and Out of Stock are clickable — each filters the table to that status.',
    },
    {
      heading: 'Status',
      body: 'Out of Stock takes priority, then Expiring Soon (within 60 days), then Low Stock (at or below reorder level) — every batch lands in exactly one status.',
    },
    {
      heading: 'Add Stock and Import Stock',
      body: 'Add Stock records a new batch received into inventory — it appears in the table and stat cards immediately. Import Stock accepts a CSV file for bulk intake.',
    },
    {
      heading: 'Adjusting a batch',
      body: 'The eye icon or Adjust Stock opens a batch’s full detail and lets you correct its on-hand quantity — a real, shared update, not a local edit.',
    },
    {
      heading: 'Inventory Overview and Top Categories by Value',
      body: 'The donut chart breaks every batch down by status. Top Categories by Value ranks medication categories by their total stock value.',
    },
  ],
};

const CONTROLLED_DRUGS_GUIDE: HelpGuide = {
  id: 'controlled-drugs',
  title: 'Controlled Drugs',
  intro:
    'Monitor and audit every controlled-substance (Schedule II-IV) dispense, stock level, and expiry.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Controlled Dispenses, Dispensed Today, Low Stock Alerts, Pending Approvals, and Expiring Soon summarize the controlled-drug log. Click a card to filter the table.',
    },
    {
      heading: 'Pending Approval',
      body: 'A controlled-substance dispense requires a second pharmacist’s sign-off before it counts as Completed. Approve Record countersigns it — this uses the same PHARMACY_DISPENSE permission as any other dispense.',
    },
    {
      heading: 'Schedule',
      body: 'C-II through C-V mirror real-world controlled-substance scheduling (opioids and benzodiazepines shown here fall in II-IV) — higher schedules carry tighter dispensing controls.',
    },
    {
      heading: 'Controlled Drugs Overview and Low Stock Alerts',
      body: 'The donut chart breaks every record down by schedule. Low Stock Alerts and Expiring Soon list the controlled inventory items nearest to needing reorder or replacement.',
    },
    {
      heading: 'Audit Trail and Export',
      body: 'Audit Trail opens the full activity log for compliance review. Export Report downloads the current filtered list as CSV.',
    },
  ],
};

const DISPENSING_HISTORY_GUIDE: HelpGuide = {
  id: 'dispensing-history',
  title: 'Dispensing History',
  intro: 'A searchable, exportable record of every dispensed medication and transaction.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Dispensed, This Week, This Month, and Unique Patients summarize the full history. Dispensed Today, This Week, and This Month are clickable — each filters the table to that date range.',
    },
    {
      heading: 'Filters and export',
      body: 'Search by patient, Rx number, or medication, or filter by date range, status, department, and (under More Filters) prescriber. Export downloads the current filtered list as CSV; Print prints the page.',
    },
    {
      heading: 'Status',
      body: 'Completed is a normal dispense. Partial, Returned, and Cancelled cover the exceptions — a partial fill, a medication returned to stock, or a dispense that was cancelled after the fact.',
    },
    {
      heading: 'Dispensing Overview and Top Medications',
      body: 'The donut chart breaks down every record by status. Top Medications Dispensed ranks the most frequently dispensed medications across the full history.',
    },
  ],
};

const MEDICATION_PICKUP_QUEUE_GUIDE: HelpGuide = {
  id: 'medication-pickup-queue',
  title: 'Medication Pickup Queue',
  intro: 'Manage and prepare medications that are ready for patient pickup.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Ready for Pickup, Due for Pickup Today, Overdue, Collected Today, and Will Call / On Hold summarize the queue. Click a card to filter the table to that status.',
    },
    {
      heading: 'Status',
      body: 'Ready means still within the pickup window. Overdue means it has been ready more than 4 hours. On Hold means a pharmacist paused the release — both are independent of how much time has passed.',
    },
    {
      heading: 'Pickup Type and Notes',
      body: 'Self Pickup, Will Call, and Family Pickup track how the patient collects their medication. Notes shows dosing instructions, or a hold/will-call reason when that applies.',
    },
    {
      heading: 'Actions',
      body: 'The printer icon prints a pickup label. The row menu opens full details, marks an item collected, or holds/resumes it — the same hold used on the Prescription Details and Dispense Medication screens.',
    },
    {
      heading: 'Pickup Queue Overview and Next Pickup',
      body: 'The donut chart breaks down Ready/Overdue/On Hold. Next Pickup surfaces the most urgent items — overdue pickups and Will Call/On Hold items — each linking straight to the filtered table.',
    },
  ],
};

const DISPENSE_MEDICATION_GUIDE: HelpGuide = {
  id: 'dispense-medication',
  title: 'Dispense Medication',
  intro:
    'A guided, checklist-gated wizard for verifying and dispensing a single pending prescription.',
  sections: [
    {
      heading: 'Steps',
      body: 'Verify Prescription, Select Items, Dispense & Label, and Complete track your progress. Confirm & Continue advances to the next step once its requirements are met.',
    },
    {
      heading: 'Clinical Alerts and Safety Checklist',
      body: 'A real allergy or drug-interaction alert appears when it applies. The Safety Checklist in the sidebar must be fully checked — including a real stock-sufficiency check — before you can continue past Verify Prescription.',
    },
    {
      heading: 'Stock & Batch Selection',
      body: 'Choose the batch, confirm the expiry date, and set the quantity to dispense. Add to Dispense List once the batch and quantity are confirmed — this is required before moving to Dispense & Label.',
    },
    {
      heading: 'Notes, counselling, and attachments',
      body: 'Dispense Notes and Counselling Provided are optional documentation. Upload File attaches a real local file (PDF, JPG, or PNG, max 5MB) to this dispense.',
    },
    {
      heading: 'Actions',
      body: 'Hold Prescription pauses it without changing its stage. Reject Prescription cancels it. Completing all three steps calls the same dispensing action used by the Prescription Queue and Details screens, so the change is live everywhere.',
    },
  ],
};

const ACTIVE_PRESCRIPTIONS_GUIDE: HelpGuide = {
  id: 'active-prescriptions',
  title: 'Active Prescriptions',
  intro: 'A hospital-wide view of every dispensed prescription patients are currently on.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Active Prescriptions and Patients on Medications summarize the full list. Ending Soon, Requires Review, and Overdue / Missed are clickable — each filters the table to that status.',
    },
    {
      heading: 'Filters, sort, and export',
      body: 'Search by patient, Rx number, or medication, or filter by status, department, prescriber, and (under More Filters) medication. Sort by date prescribed, end date, or patient name. Export downloads the current filtered list as CSV.',
    },
    {
      heading: 'Status',
      body: 'Active means the course still has time left. Ending Soon is within 3 days of the end date. Requires Review flags a real allergy or drug-interaction concern. Overdue / Missed means the course window has passed without a follow-up.',
    },
    {
      heading: 'Patient Summary',
      body: "Selecting a row updates the sidebar with that patient's allergies, chronic conditions, current medications, and relevant alerts and reminders — the same docked-panel pattern used elsewhere in the app.",
    },
  ],
};

const PRESCRIPTION_QUEUE_GUIDE: HelpGuide = {
  id: 'prescription-queue',
  title: 'Prescription Queue',
  intro:
    'Review and verify new prescriptions — check patient details, allergies, interactions, and stock availability before dispensing.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Pending Verification, In Progress, Ready for Dispense, Ready for Pickup, and Cancelled track every prescription currently in the pipeline. Click a card to filter the table to that status.',
    },
    {
      heading: 'Filters and search',
      body: 'Search by patient, Rx number, or medication, or filter by status, priority, prescriber, or department. More Filters adds an allergy-alerts-only toggle. Clear Filters resets everything.',
    },
    {
      heading: 'The queue table',
      body: 'Select rows with the checkboxes to cancel several prescriptions at once. The eye icon or "View Details" opens the full prescription record, including the allergy banner. The row menu also offers Verify & Dispense for pending prescriptions.',
    },
    {
      heading: 'Queue Overview and alerts',
      body: 'The donut chart in the sidebar breaks down the queue by status. High Priority, Allergy Alerts, and Stock Alerts summarize prescriptions needing attention, each with a link that filters or navigates straight to it.',
    },
    {
      heading: 'Queue Settings and Refresh',
      body: 'Queue Settings controls the default page size, whether cancelled prescriptions stay visible, and whether allergy-alert rows are highlighted. Refresh Queue reloads the latest data.',
    },
  ],
};

const PHARMACY_DASHBOARD_GUIDE: HelpGuide = {
  id: 'pharmacy-dashboard',
  title: 'Pharmacy Dashboard',
  intro: 'Your prescription dispensing, inventory, and safety overview for the pharmacy.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Pending Prescriptions and Ready for Pickup are live counts from the dispensing queue. Prescriptions Dispensed Today, Low Stock Medicines, Expiring Batches, and Transfers Pending Approval summarize the rest of the day at a glance.',
    },
    {
      heading: 'Quick Actions',
      body: 'Verify Prescription and Dispense Medication open the same verify-and-dispense flow, starting from the pending queue or a direct search. Search Medication looks up stock and batch details. Receive Stock, Stock Adjustment, and Transfer Stock jump to the relevant inventory screens.',
    },
    {
      heading: 'Prescription Queue and Ready Pickup Queue',
      body: "The Prescription Queue lists prescriptions awaiting verification — select one to review the patient's allergy profile before dispensing. Once dispensed, a prescription moves to the Ready Pickup Queue until marked collected.",
    },
    {
      heading: 'Inventory and safety panels',
      body: 'Low Stock Medicines, the Expiring Batch List, and Pending Stock Transfers highlight items needing attention. Inventory Snapshot summarizes total stock; Safety Alerts flags drug interactions, allergy conflicts, and other dispensing risks caught this session.',
    },
    {
      heading: 'Notifications and Recent Activity',
      body: 'Notifications & Announcements merges hospital-wide announcements with pharmacy-specific alerts. Recent Dispensing Activity is a live log of every prescription verified and dispensed this session.',
    },
  ],
};

const NURSE_DASHBOARD_GUIDE: HelpGuide = {
  id: 'nurse-dashboard',
  title: 'Nurse Dashboard',
  intro: 'Your patient care overview for the shift — assigned patients, medications, and alerts.',
  sections: [
    {
      heading: 'Stat cards and current shift',
      body: 'Patients under your care, medication due, admissions today, pending vital signs, and critical alerts summarize the shift at a glance. The shift chip on the right shows your current shift and its time range.',
    },
    {
      heading: 'Quick Actions',
      body: 'Jump straight to recording vitals, administering medication, adding a nursing note, admitting a patient, starting a shift handover, or raising an emergency response.',
    },
    {
      heading: 'My Patients and Medication Due',
      body: 'My Patients lists everyone currently assigned to you with ward, bed, and condition. Medication Due shows the next doses in order, with overdue times highlighted in red.',
    },
    {
      heading: 'Alerts, Admissions, and Ward Census',
      body: "Alerts & Notifications surfaces anything requiring immediate attention. Today's Admissions tracks new patients awaiting assessment. Ward Census Summary shows bed occupancy for the ward.",
    },
    {
      heading: 'Upcoming Tasks',
      body: 'A checklist of scheduled rounds and tasks for the rest of your shift — tick items off as you complete them, or open your full duty schedule.',
    },
  ],
};

const LABORATORY_TEST_WORK_QUEUE_GUIDE: HelpGuide = {
  id: 'laboratory-test-work-queue',
  title: 'Test Work Queue',
  intro: 'The bench-side worklist — claim, start, and pause the tests waiting to be run.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Tests in Queue, High Priority, In Progress, Completed Today, Overdue, and Avg TAT (All) summarize the bench workload at a glance.',
    },
    {
      heading: 'Filters and tabs',
      body: 'Search by patient, MRN, order ID, or sample ID, then narrow by Date Range, Department, or Priority. The tab strip switches between All Tests, High Priority, In Progress, On Hold, and Completed Today.',
    },
    {
      heading: 'Starting and pausing a test',
      body: 'Start Test claims a test and moves it to In Progress. Continue opens Result Entry once work has begun. Put On Hold pauses a test with a reason; Resume brings it back into progress.',
    },
    {
      heading: 'Order details',
      body: 'Click a row to open its detail panel: patient and order information, every test on the requisition with its own real status, and a Current Status stepper from Collected through Published.',
    },
    {
      heading: 'Scan Sample',
      body: 'Type or scan a Sample ID to jump straight to that specimen’s row, without hunting through the list.',
    },
  ],
};

const LABORATORY_RESULT_ENTRY_GUIDE: HelpGuide = {
  id: 'laboratory-result-entry',
  title: 'Result Entry',
  intro: 'Structured, reference-range-aware entry for a test that has been started at the bench.',
  sections: [
    {
      heading: 'Getting here',
      body: 'Open from Test Work Queue’s Continue button, from Scan Another Sample, or by picking an in-progress order from the list shown when no order is selected yet.',
    },
    {
      heading: 'Entering a result',
      body: 'Each test lists its own parameters with units, reference range, and previous result for comparison. The Flag column updates live as you type, and turns red for a value outside the safe critical threshold.',
    },
    {
      heading: 'Saving your work',
      body: 'Save as Draft keeps everything you have entered without finalizing — come back later and it is still there. Finalize & Send for Verification requires every parameter filled in, then moves the tests to Result Verification.',
    },
    {
      heading: 'Add Reflex Test',
      body: 'Adds another test run directly off the same sample, without a new draw — it appears in the entry list immediately.',
    },
    {
      heading: 'Comments',
      body: 'Use the comment icon next to any parameter, or the Add Comment box at the bottom, to record an observation that will travel with the finalized result.',
    },
  ],
};

const LABORATORY_RESULT_VERIFICATION_GUIDE: HelpGuide = {
  id: 'laboratory-result-verification',
  title: 'Result Verification',
  intro: 'The lab’s own second-reviewer sign-off on a result before it moves forward.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Awaiting Verification, Verified Today, Critical Results, Avg TAT (Pending), and Overdue summarize how much sign-off work is waiting and how long it has been waiting.',
    },
    {
      heading: 'Filters and tabs',
      body: 'Search by patient, MRN, order ID, or sample ID, then narrow by Date Range, Department, or Sample Type. All, Critical, and Overdue switch between views of the same queue.',
    },
    {
      heading: 'Reviewing a result',
      body: 'Select a row to preview it on the right, including a live Verification Checklist. Review & Verify Result opens the full read-only values for a final look before signing off.',
    },
    {
      heading: 'The checklist',
      body: 'All results entered and Critical values reviewed must both be satisfied before a result can be verified — the other items display honestly but do not block.',
    },
    {
      heading: 'Comments',
      body: 'Add Comment records a note against every test on the order, visible wherever that result is reviewed next.',
    },
  ],
};

const LABORATORY_PUBLISHED_RESULTS_GUIDE: HelpGuide = {
  id: 'laboratory-published-results',
  title: 'Published Results',
  intro: 'A searchable archive of every result a doctor has verified.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Published Today, Results This Week, This Month, Critical Results Reported, and Avg TAT (Published) summarize the published archive at a glance.',
    },
    {
      heading: 'Filters and tabs',
      body: 'Search by patient, MRN, order ID, or sample ID, then narrow by Date Range, Department, or Sample Type. All Published and Critical Results switch between views of the same archive.',
    },
    {
      heading: 'Result Summary',
      body: 'Select a row to preview it on the right, including patient and order information, every published test, and who verified it.',
    },
    {
      heading: 'Reports',
      body: 'View Full Report opens a read-only report of every test’s final values. Print Report generates a printable version — for one result or, from the header, for the whole filtered list.',
    },
  ],
};

const LABORATORY_CRITICAL_RESULTS_GUIDE: HelpGuide = {
  id: 'laboratory-critical-results',
  title: 'Critical Results',
  intro: 'The lab’s own notification log for every flagged critical value.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Critical Results, Awaiting Review, Communicated, Acknowledged, and Avg Response Time summarize how quickly critical values are being acted on.',
    },
    {
      heading: 'Filters and tabs',
      body: 'Search by patient, MRN, order ID, or sample ID, then narrow by Date Range, Department, or Sample Type. All Critical, High Priority, Pending Communication, and Acknowledged switch between views of the same log.',
    },
    {
      heading: 'Acknowledge & Communicate',
      body: 'Records that the lab called or paged the ward about this value. It does not acknowledge on the clinical team’s behalf — that happens separately once the ward confirms receipt, and shows up here automatically once it does.',
    },
    {
      heading: 'Critical Result Details',
      body: 'Select a row to preview the full result, its critical range, and response history on the right, including View Full Result and Add Comment.',
    },
  ],
};

const LABORATORY_WORKFORCE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'laboratory-workforce-management',
  title: 'Workforce Management',
  intro: 'Manage laboratory staff schedules, duty rosters, and department coverage.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Staff on Duty, Today’s Shifts, On-Call Staff, Shift Acknowledgement, Coverage Status, and Shift Changes summarize the roster at a glance.',
    },
    {
      heading: "Today's Roster",
      body: 'Search by staff name or filter by shift type, role, and status. Each row shows the department, shift time, and acknowledgement state.',
    },
    {
      heading: 'Create and edit shifts',
      body: 'Create Shift opens a form for staff name, role, department, shift type, and status. The pencil icon on a row reopens the same form pre-filled for editing.',
    },
    {
      heading: 'Coverage and acknowledgement',
      body: 'The Coverage Overview panel tracks department coverage by shift. Pending Shift Acknowledgement lists staff who haven’t confirmed their shift yet, with a one-tap reminder.',
    },
  ],
};

const LABORATORY_MY_SCHEDULE_GUIDE: HelpGuide = {
  id: 'laboratory-my-schedule',
  title: 'My Schedule',
  intro: 'Your personal shift calendar, upcoming assignments, and on-call rota.',
  sections: [
    {
      heading: "Today's Active Shift",
      body: 'Shows your current shift, time range, and department. Acknowledge Shift confirms you have seen it; a progress bar tracks time remaining.',
    },
    {
      heading: 'This Week',
      body: 'A day-by-day strip of your shifts for the current week, colour-coded by shift type, with an acknowledgement indicator on each day.',
    },
    {
      heading: 'Upcoming Shifts',
      body: 'Lists your next shifts with time and department. Shifts awaiting your response show Confirm Shift and Cannot Attend actions.',
    },
    {
      heading: 'Department On-Call Rota',
      body: 'Shows who is covering on-call across the week, highlighting the scientist currently on duty and your own on-call slots.',
    },
    {
      heading: 'Monthly Overview',
      body: 'Totals your morning, afternoon, night, and on-call shifts for the current month.',
    },
  ],
};

const LABORATORY_SHIFT_HANDOVER_GUIDE: HelpGuide = {
  id: 'laboratory-shift-handover',
  title: 'Shift Handover',
  intro: 'Structured shift handover notes between outgoing and incoming laboratory staff.',
  sections: [
    {
      heading: 'Testing Summary',
      body: 'Pending Result Entry, Awaiting Verification, Published Today, and On Hold counts summarize the test pipeline at hand-off, with a preview of tests still awaiting verification.',
    },
    {
      heading: 'Outstanding Tasks and Priority Follow-ups',
      body: 'Outstanding Tasks tracks a per-shift checklist by category. Priority Follow-ups lists critical results not yet communicated to the ward that the incoming scientist needs to review.',
    },
    {
      heading: 'Low Stock Reagents',
      body: 'Flags reagents below reorder level, so the incoming shift knows what to watch or reorder.',
    },
    {
      heading: 'Signatures and completing handover',
      body: 'The incoming scientist signs to accept responsibility for the pipeline and reagent stock. Save as Draft preserves progress; Complete Handover finalizes the transfer once signed.',
    },
  ],
};

const LABORATORY_HISTORY_GUIDE: HelpGuide = {
  id: 'laboratory-history',
  title: 'Laboratory History',
  intro: 'A patient’s full laboratory order history, searchable by name or MRN.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search by name or MRN to select a patient. The most recently ordered patients appear first when the search is empty.',
    },
    {
      heading: 'Patient summary',
      body: 'Once a patient is selected, the banner and right-rail Patient Summary show their identity, contact details, blood group, and allergies — Change Patient returns to search.',
    },
    {
      heading: 'Filters and tabs',
      body: 'Narrow by Date Range, Order Status, or Department. All Orders, Completed, Pending, and Cancelled switch between views of the same history.',
    },
    {
      heading: 'Viewing and printing',
      body: 'The eye icon opens a read-only report for that order; the row menu prints it directly. Print History and Export cover the whole filtered list.',
    },
  ],
};

const LABORATORY_QUALITY_CONTROL_GUIDE: HelpGuide = {
  id: 'laboratory-quality-control',
  title: 'Quality Control (QC)',
  intro: 'Log, review, and act on instrument control runs across every analyzer.',
  sections: [
    {
      heading: 'Stat cards and filters',
      body: "The six cards summarize today's runs, pass/fail counts, in-progress runs, active control lots, and the next run due. Narrow the QC Runs list by Date, Department, Instrument, Test Group, QC Type, or Status.",
    },
    {
      heading: 'Logging a run',
      body: "New QC Run evaluates every entered value against its test's target range automatically — Passed, Failed, or flagged with a Westgard rule (1-2s, 1-3s, 2-2s). Save as In Progress to log results later.",
    },
    {
      heading: 'QC Runs and Levey-Jennings',
      body: "Select a run to see its full Control Results in the side panel, or View Chart to plot that test's history on the Levey-Jennings tab with ±1/2/3 SD bands.",
    },
    {
      heading: 'Westgard Rules, QC Lots, Corrective Actions',
      body: 'Westgard Rules lists every flagged result across all runs. QC Lots tracks control lot inventory and expiry. Corrective Actions are raised automatically for failed runs — select one to record a root cause and mark it resolved.',
    },
  ],
};

const LABORATORY_PROCUREMENT_REQUESTS_GUIDE: HelpGuide = {
  id: 'laboratory-procurement-requests',
  title: 'Procurement Requests',
  intro:
    'Every request to buy reagents, consumables, or equipment — from raising it to receiving it.',
  sections: [
    {
      heading: 'Stat cards, tabs, and filters',
      body: 'The six cards summarize every stage of the pipeline — click one to jump to that tab. Narrow the list by Department, Status, Priority, a Request Date range, or search by request number, requester, or department.',
    },
    {
      heading: 'Raising a request',
      body: 'New Procurement Request adds as many line items as needed, each with its own category, quantity, and estimated unit cost. Every new request starts Pending Approval. A quick reorder raised from Laboratory Inventory’s Stock Alerts tab creates the same kind of request here automatically.',
    },
    {
      heading: 'Request Details and the Approval Workflow',
      body: 'Select a row to see its details, category breakdown, and approval workflow in the right-hand panel — the external-link icon or View Full Details opens the complete itemized view. Approval moves through Department Head, Laboratory Manager, and Procurement Officer in order; the last approval moves the request to Approved.',
    },
    {
      heading: 'Advancing a request',
      body: 'Once Approved, Move to Procurement and Mark as Received advance the request from its row menu. Pending requests can be rejected; Approved or In Procurement requests can be cancelled.',
    },
  ],
};

const LABORATORY_REPORTS_GUIDE: HelpGuide = {
  id: 'laboratory-reports',
  title: 'Laboratory Reports',
  intro: 'Testing volume, department mix, TAT performance, and workload trends in one place.',
  sections: [
    {
      heading: 'Stat cards and period',
      body: 'The seven cards summarize the selected period against the one before it. Every chart and dropdown labeled with a period (This Month, Last Month, This Quarter, This Year) shares the same selection, so the whole page always tells one consistent story.',
    },
    {
      heading: 'Test Volume Trend, Tests by Category, TAT Performance',
      body: 'Hover the trend line for the exact count on any day. Tests by Category is the same department totals shown as a donut. TAT Performance shows on-time vs delayed results against the average-turnaround target.',
    },
    {
      heading: 'Report Summary and Top 5 Most Ordered Tests',
      body: 'The department table’s eye icon opens a full breakdown for that department, including its sample rejection rate. Top 5 Most Ordered Tests ranks by share of total tests for the selected period.',
    },
    {
      heading: 'Generating, exporting, and scheduling',
      body: 'Generate Report and Export both produce a CSV or PDF of the current summary. Schedule Report sets up a recurring emailed report.',
    },
    {
      heading: 'The other tabs',
      body: 'Sample Reports, Published Results, Critical Results, Rejected Samples, Quality Control, Inventory, Staff, and Department Performance each have their own dedicated view — Critical Results additionally shows a live unacknowledged queue, and Quality Control links out to its own full report.',
    },
  ],
};

const LABORATORY_TAT_REPORTS_GUIDE: HelpGuide = {
  id: 'laboratory-tat-reports',
  title: 'Turnaround Time (TAT) Reports',
  intro: 'How long tests actually take, department by department, against their SLA target.',
  sections: [
    {
      heading: 'Stat cards and period',
      body: 'The six cards summarize the selected period — Overall Avg TAT, TAT Compliance, Within Target, Delayed Results, Longest TAT, and Total Tests. The period dropdown next to the tab strip controls the whole Overview.',
    },
    {
      heading: 'Average TAT Trend and Compliance Rate',
      body: 'Hover the trend line for the exact average TAT on any day, compared against the same day last month. The Compliance Rate donut splits every test into Within Target or Delayed.',
    },
    {
      heading: 'TAT by Department and Filters',
      body: 'The department table breaks down total tests, average TAT, compliance rate, longest TAT, and the trend versus last month. The Filters panel narrows by department, test, sample type, priority, and TAT status — Apply Filters confirms what’s showing.',
    },
    {
      heading: 'TAT Targets and Quick Reports',
      body: 'TAT Targets (SLA) shows the compliance rate against each priority’s target turnaround — STAT, Routine, and Low. Quick Reports jumps straight to the relevant tab. The other tabs across the top are being built next.',
    },
  ],
};

const LABORATORY_SUPPLIERS_GUIDE: HelpGuide = {
  id: 'laboratory-suppliers',
  title: 'Suppliers',
  intro: 'The vendor directory for every reagent, kit, equipment, and consumables supplier.',
  sections: [
    {
      heading: 'Stat cards and filters',
      body: 'The six cards summarize the whole directory — Total, Active, Preferred, Pending Evaluation, Blacklisted, and Total Spend (YTD). Click a status card to jump straight to that filter. Narrow the list further by Status, Category, Rating, or Location, or search by name, contact person, phone, or email.',
    },
    {
      heading: 'Adding a supplier',
      body: 'Add New Supplier records the vendor’s contact, location, payment terms, and credit limit. Every new supplier starts Pending Evaluation until approved from its row menu.',
    },
    {
      heading: 'Supplier Details and performance',
      body: 'Select a row to see its contact details, rating, and a Performance Summary — total orders, on-time delivery rate, quality rating, and total spend, all for the year to date — plus its most recent orders in the right-hand panel. The external-link icon or View Full Profile opens the complete profile.',
    },
    {
      heading: 'Managing status',
      body: 'A row’s menu can approve a pending supplier, mark or remove Preferred status on an active one, blacklist a supplier, or reactivate one that was blacklisted or inactive.',
    },
  ],
};

const LABORATORY_STOCK_RECEIVING_GUIDE: HelpGuide = {
  id: 'laboratory-stock-receiving',
  title: 'Stock Receiving',
  intro: 'Receive a delivery and update Laboratory Inventory stock — no separate re-entry.',
  sections: [
    {
      heading: 'Delivery Information',
      body: 'Record who delivered what — supplier, delivery note, invoice, vehicle and driver details, and the temperature on arrival, which flags Within Range or Out of Range against the 2–8°C cold-chain window.',
    },
    {
      heading: 'Received Items',
      body: 'Add Item or Scan Barcode both open the same picker — search or scan a catalog number, then set lot/batch, expiry, and quantities. Received, Accepted, and Rejected quantities and Unit Cost are editable inline; Status derives automatically from them.',
    },
    {
      heading: 'Completing the GRN',
      body: 'Complete Receiving applies every accepted line to Laboratory Inventory’s live stock and logs it there as a Received movement — this is the real write, not a disconnected form. Once completed, the GRN locks and Start New Receiving opens a fresh session.',
    },
    {
      heading: 'GRN Summary, Checklist, Attachments, Activity Log',
      body: 'The right column tracks the running total (with tax), a receiving checklist you can expand for detail, delivery paperwork attachments, and a timestamped log of everything that happened on this GRN.',
    },
  ],
};

const LABORATORY_INVENTORY_GUIDE: HelpGuide = {
  id: 'laboratory-inventory',
  title: 'Laboratory Inventory',
  intro: 'Every reagent, kit, consumable, and supply in one place — stock, expiry, and reorders.',
  sections: [
    {
      heading: 'Stat cards and filters',
      body: 'The six cards summarize total items, stock status, and total inventory value — click Low Stock, Expiring Soon, or Expired to jump straight to the relevant tab. Narrow the Inventory Items list by Department, Category, Status, or Location, or search by item name, catalog no., or lot no.',
    },
    {
      heading: 'Inventory Items and details',
      body: 'Select a row to open its Item Details in the right column, alongside a Stock Summary donut for the whole inventory and Quick Actions to jump to Stock Alerts, add an item, generate a report, or view the reorder list.',
    },
    {
      heading: 'Batch Tracking and Expiry Monitoring',
      body: 'Batch Tracking lists every batch received against its remaining quantity. Expiry Monitoring lists everything expiring within 30 days or already expired, soonest first.',
    },
    {
      heading: 'Consumption Analytics and Stock Alerts',
      body: 'Consumption Analytics ranks the most-used items from the movement history. Stock Alerts lists everything at or below minimum stock — Create Reorder Request raises a request that appears immediately in Reorder Management.',
    },
    {
      heading: 'Reorder Management and Inventory History',
      body: 'Reorder Management tracks every request from Pending through Ordered to Received. Inventory History is the full, read-only log of every stock movement — received, consumed, adjusted, or disposed.',
    },
  ],
};

const LABORATORY_EQUIPMENT_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'laboratory-equipment-management',
  title: 'Equipment Management',
  intro: 'Every analyzer and instrument in one place — status, calibration, and service history.',
  sections: [
    {
      heading: 'Stat cards and filters',
      body: 'The six cards summarize total equipment, operational status, and calibration due/overdue counts — click Due for Calibration or Overdue to jump to the Calibration tab. Narrow the Equipment List by Department, Equipment Type, Status, or Location, or search by name, ID, model, or serial number.',
    },
    {
      heading: 'Equipment List and details',
      body: 'Select a row to open its Equipment Details panel on the right, with full specs and any upcoming calibration or maintenance. View Full Profile opens the complete record, including service history, downtime, and error log for that instrument.',
    },
    {
      heading: 'Calibration, Maintenance, Service History',
      body: 'Calibration lists everything due or overdue, with a one-click Record Calibration. Maintenance shows scheduled work orders; Service History logs completed service, maintenance, and calibration events — Add Service / Maintenance from the details panel or row menu writes to whichever one applies.',
    },
    {
      heading: 'Downtime Log and Error Logs',
      body: 'Downtime Log tracks every out-of-service incident and its duration. Error Logs lists fault codes reported by equipment, with severity and resolution status.',
    },
  ],
};

const ADMIN_STAFF_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'admin-staff-management',
  title: 'Staff Management',
  intro: 'Every staff account across the medical centre, in one directory.',
  sections: [
    {
      heading: 'Stat cards and filters',
      body: 'The five cards summarize total, active, inactive, on-leave, and newly-added staff. Click Active Staff, Inactive Staff, or On Leave to filter the list by that status. Narrow the list further by Department, Role, or Status, or search by name, email, phone, or staff ID.',
    },
    {
      heading: 'Staff list and details',
      body: 'Select a row (or its eye icon) to open the Staff Details panel on the right, with contact info, department, role, and status. The row menu (⋮) also offers Edit Staff, Reset Password, and Deactivate/Reactivate.',
    },
    {
      heading: 'Add, import, and export',
      body: '+ Add New Staff opens a form for a single account. Import Staff bulk-adds accounts from a CSV file (Full Name, Email, Phone, Department, Role columns). Export downloads the currently filtered list as a CSV.',
    },
  ],
};

const LABORATORY_QUALITY_CONTROL_REPORTS_GUIDE: HelpGuide = {
  id: 'laboratory-quality-control-reports',
  title: 'Quality Control Reports',
  intro:
    'Pass/fail trends and Westgard-rule violations across every QC run, filterable by date and instrument.',
  sections: [
    {
      heading: 'Filters',
      body: 'Narrow the whole report — stat cards, trend chart, breakdown, and table — by date range and instrument.',
    },
    {
      heading: 'Stat cards and trend',
      body: 'Total QC Runs, Pass Rate, Failed Runs, and Open Corrective Actions summarize the filtered range. The Pass Rate Trend chart plots the daily pass rate across concluded runs.',
    },
    {
      heading: 'Westgard breakdown and performance table',
      body: 'Westgard Rule Violations counts 1-2s, 1-3s, and 2-2s flags across the range. Performance by Instrument breaks totals, pass/fail, pass rate, and open corrective actions down per analyzer.',
    },
    {
      heading: 'Export',
      body: 'Print, Export CSV, and Export PDF cover the current filtered view of the performance table.',
    },
  ],
};

const LABORATORY_CLINICAL_TIMELINE_GUIDE: HelpGuide = {
  id: 'laboratory-clinical-timeline',
  title: 'Clinical Timeline',
  intro:
    'Every laboratory event for a patient, merged across all their orders into one chronological feed.',
  sections: [
    {
      heading: 'Finding a patient',
      body: 'Search by name or MRN to select a patient, same as Laboratory History. Change Patient returns to search.',
    },
    {
      heading: 'Reading the timeline',
      body: 'Each row is one real event — order created, sample collected, analysis started, result entered, verified, and published — with its timestamp and the person responsible. Rows with extra detail have a chevron to expand; Expand All opens every row at once.',
    },
    {
      heading: 'Filters and pagination',
      body: 'Narrow by Date Range, Event Type, or Department. Load More Events reveals older events without loading the entire history at once.',
    },
    {
      heading: 'Right rail',
      body: 'Patient Summary mirrors the banner; Current Order Summary and Tests cover the most recent order, with a link back to the full Laboratory History for this patient.',
    },
  ],
};

const LABORATORY_SAMPLE_TRACKING_GUIDE: HelpGuide = {
  id: 'laboratory-sample-tracking',
  title: 'Sample Tracking',
  intro: 'Every specimen in one place — where it is right now, from collection to publication.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Collected, Received, In Analysis, Awaiting Verification, Published, and Rejected summarize where every specimen currently sits.',
    },
    {
      heading: 'Filters and tabs',
      body: 'Search by patient, MRN, order ID, or sample ID, then narrow by Date Range, Department, or Sample Type. The tab strip switches between All Samples and each individual stage.',
    },
    {
      heading: 'The tracking table',
      body: 'Each row is one specimen, showing its current status and current location at a glance. The row menu offers View Details or Print Label.',
    },
    {
      heading: 'The Tracking Timeline',
      body: 'Click a row to open its detail panel: patient and sample information, plus a chain-of-custody timeline from Collected through Published, with real timestamps at each stage that has been reached.',
    },
  ],
};

const LABORATORY_SAMPLE_RECEPTION_GUIDE: HelpGuide = {
  id: 'laboratory-sample-reception',
  title: 'Sample Reception',
  intro:
    'Log incoming specimens at the bench — receive them into the lab or reject them on inspection.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Awaiting Reception, Received Today, Rejected Today, In Transit, Pending Verification, and Overdue (Not Received) summarize the incoming queue at a glance.',
    },
    {
      heading: 'Filters and tabs',
      body: 'Search by patient, MRN, order ID, or sample ID, then narrow by Date Range, Department, Collection Point, or Priority. The tab strip switches between Awaiting Reception, Received, Rejected, Pending Verification, and All Samples.',
    },
    {
      heading: 'Receiving a specimen',
      body: 'Receive opens a checklist confirming volume, temperature, and specimen integrity before logging it into the lab pipeline. Reject records a reason and flags the specimen for recollection.',
    },
    {
      heading: 'Specimen details',
      body: 'Click a row to open its detail panel: patient and order information, every test on the requisition, and Sample Details (sample id/type, collected and received timestamps).',
    },
    {
      heading: 'Bulk actions',
      body: 'Select rows with the checkbox, then use Receive Samples to log in every selected specimen at once, or Print Labels to print specimen labels for the current filtered list.',
    },
  ],
};

const LABORATORY_SAMPLE_COLLECTION_GUIDE: HelpGuide = {
  id: 'laboratory-sample-collection',
  title: 'Sample Collection',
  intro: "Today's phlebotomy worklist — from a placed order to a drawn, labelled specimen.",
  sections: [
    {
      heading: 'Stat cards',
      body: 'Pending Collection, Collection In Progress, Collected Today, Collection Overdue, and Collection Rejected summarize the queue at a glance.',
    },
    {
      heading: 'Filters and tabs',
      body: 'Search by patient, MRN, or order ID, then narrow by Date Range, Department, or Priority. The tab strip switches between the five collection stages.',
    },
    {
      heading: 'Collecting a sample',
      body: "Collect (or Recollect, after a rejection) opens a checklist of the requisition's tests — uncheck any test you are not drawing now to leave it pending for a later draw.",
    },
    {
      heading: 'Order details',
      body: 'Click a row to open its detail panel: patient and order information, every test on the requisition, and Collection Details (sample type, status, collected by/at, sample id).',
    },
    {
      heading: 'Walk-in Collection',
      body: 'Creates a new requisition for a patient with no prior doctor order — pick a patient, choose tests and priority, and it lands in Pending Collection like any other order.',
    },
  ],
};

const LABORATORY_ORDERS_GUIDE: HelpGuide = {
  id: 'laboratory-orders',
  title: 'Laboratory Orders',
  intro: 'Every test requisition from order to verification, grouped by the doctor who placed it.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total Orders, New Orders, In Progress, Completed Today, Critical, and Average TAT summarize the incoming worklist at a glance.',
    },
    {
      heading: 'Filters and tabs',
      body: 'Search by patient, MRN, or order ID, then narrow by Date Range, Priority, or Department. The tab strip switches between New, In Progress, Awaiting Result Entry, Awaiting Verification, Completed, and Rejected orders.',
    },
    {
      heading: 'The order table',
      body: 'Each row is one requisition — one or more tests ordered together for the same patient at the same time. Select rows with the checkbox to receive samples or export in bulk; use the row menu for single-order actions.',
    },
    {
      heading: 'Order details and workflow status',
      body: 'Click a row to open its detail panel: patient and order information, every test on the requisition, and a Workflow Status stepper tracking progress from Ordered through Published.',
    },
    {
      heading: 'Actions',
      body: 'Receive Sample logs specimen receipt against every pending test on the order. Print Label prints a specimen label. Add Note records a comment on the order.',
    },
  ],
};

const LABORATORY_DASHBOARD_GUIDE: HelpGuide = {
  id: 'laboratory-dashboard',
  title: 'Laboratory Dashboard',
  intro: 'Your testing pipeline, turnaround time, and quality overview for the laboratory.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Pending Orders, Samples Awaiting Collection, Samples Received Today, Results Awaiting Entry, Results Awaiting Verification, Critical Results, Average TAT, and Active Equipment summarize the lab at a glance.',
    },
    {
      heading: 'Quick Actions',
      body: 'Receive Sample, Print Sample Label, Enter Test Result, Verify Result, Publish Result, Report Critical Value, Perform QC Check, and Receive Stock jump straight to each task.',
    },
    {
      heading: 'Work Queues and TAT',
      body: 'Work Queues shows pending and urgent counts per stage of the pipeline. Turnaround Time Overview breaks down average TAT by department.',
    },
    {
      heading: 'Critical Results and Sample Status',
      body: 'Critical Results lists flagged values needing attention. Sample Status Overview and Tests by Department show today’s testing volume.',
    },
    {
      heading: 'Quality Control and Equipment',
      body: 'Quality Control (QC) Today tracks pass/fail/pending counts for daily runs. Equipment Status shows which analyzers are online, due for maintenance, or offline.',
    },
  ],
};

const PHARMACY_WORKFORCE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'pharmacy-workforce-management',
  title: 'Workforce Management',
  intro: 'Manage pharmacy staff schedules, duty rosters, and campus coverage.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Staff on Duty, Today’s Shifts, On-Call Staff, Shift Acknowledgement, Coverage Status, and Shift Changes summarize the roster at a glance.',
    },
    {
      heading: "Today's Roster",
      body: 'Search by staff name or filter by shift type, role, and status. Each row shows the campus location, shift time, and acknowledgement state.',
    },
    {
      heading: 'Create and edit shifts',
      body: 'Create Shift opens a form for staff name, role, location, shift type, and status. The pencil icon on a row reopens the same form pre-filled for editing.',
    },
    {
      heading: 'Coverage and acknowledgement',
      body: 'The Coverage Overview panel tracks campus coverage by shift. Pending Shift Acknowledgement lists staff who haven’t confirmed their shift yet, with a one-tap reminder.',
    },
  ],
};

const PHARMACY_MY_SCHEDULE_GUIDE: HelpGuide = {
  id: 'pharmacy-my-schedule',
  title: 'My Schedule',
  intro: 'Your personal shift calendar, upcoming assignments, and on-call rota.',
  sections: [
    {
      heading: "Today's Active Shift",
      body: 'Shows your current shift, time range, and location. Acknowledge Shift confirms you have seen it; a progress bar tracks time remaining.',
    },
    {
      heading: 'This Week',
      body: 'A day-by-day strip of your shifts for the current week, colour-coded by shift type, with an acknowledgement indicator on each day.',
    },
    {
      heading: 'Upcoming Shifts',
      body: 'Lists your next shifts with time and location. Shifts awaiting your response show Confirm Shift and Cannot Attend actions.',
    },
    {
      heading: 'Campus On-Call Rota',
      body: 'Shows who is covering on-call across the week, highlighting the pharmacist currently on duty and your own on-call slots.',
    },
    {
      heading: 'Monthly Overview',
      body: 'Totals your morning, afternoon, night, and on-call shifts for the current month.',
    },
  ],
};

const PHARMACY_SHIFT_HANDOVER_GUIDE: HelpGuide = {
  id: 'pharmacy-shift-handover',
  title: 'Shift Handover',
  intro: 'Structured shift handover notes between outgoing and incoming pharmacy staff.',
  sections: [
    {
      heading: 'Dispensing Summary',
      body: 'Pending Verification, Ready for Pickup, Dispensed Today, and On Hold counts summarize the queue at hand-off, with a preview of prescriptions still awaiting verification.',
    },
    {
      heading: 'Outstanding Tasks and Priority Follow-ups',
      body: 'Outstanding Tasks tracks a per-shift checklist by category. Priority Follow-ups lists prescriptions currently on hold that the incoming pharmacist needs to review.',
    },
    {
      heading: 'Controlled Drugs and Low Stock',
      body: 'Controlled Drugs Pending Approval lists dispenses awaiting a second pharmacist countersignature. Low Stock Medicines flags items below reorder level.',
    },
    {
      heading: 'Signatures and completing handover',
      body: 'The incoming pharmacist signs to accept responsibility for the queue and stock. Save as Draft preserves progress; Complete Handover finalizes the transfer once signed.',
    },
  ],
};

const NURSE_WORKFORCE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'nurse-workforce-management',
  title: 'Workforce Management',
  intro:
    'Manage nursing staff schedules, duty rosters, and shift coverage. Visible only to the ward Matron.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Nurses on Duty, Today’s Shifts, On-Call Nurses, Shift Acknowledgement, Coverage Status, and Shift Changes summarize the roster at a glance.',
    },
    {
      heading: "Today's Roster",
      body: 'Search by nurse name or filter by ward, shift type, role, and status. Each row shows the ward, shift time, and acknowledgement state.',
    },
    {
      heading: 'Create and edit shifts',
      body: 'Create Shift opens a form for staff name, role, ward, shift type, and status. The pencil icon on a row reopens the same form pre-filled for editing.',
    },
    {
      heading: 'Coverage and acknowledgement',
      body: 'The Coverage Overview panel tracks ward coverage by shift. Pending Shift Acknowledgement lists nurses who haven’t confirmed their shift yet, with a one-tap reminder.',
    },
  ],
};

const REGISTRATION_WORKFORCE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'registration-workforce-management',
  title: 'Workforce Management',
  intro:
    'Manage registration desk schedules, duty rosters, and shift coverage. Visible only to the registration supervisor.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Staff on Duty, Today’s Shifts, On-Call Staff, Shift Acknowledgement, Coverage Status, and Shift Changes summarize the roster at a glance.',
    },
    {
      heading: "Today's Roster",
      body: 'Search by staff name or filter by shift type, role, and status. Each row shows the station, shift time, and acknowledgement state.',
    },
    {
      heading: 'Create and edit shifts',
      body: 'Create Shift opens a form for staff name, role, station, shift type, and status. The pencil icon on a row reopens the same form pre-filled for editing.',
    },
    {
      heading: 'Coverage and acknowledgement',
      body: 'The Coverage Overview panel tracks desk coverage by shift. Pending Shift Acknowledgement lists staff who haven’t confirmed their shift yet, with a one-tap reminder.',
    },
  ],
};

const REGISTRATION_MY_SHIFT_GUIDE: HelpGuide = {
  id: 'registration-my-shift',
  title: 'My Shift',
  intro: 'Your own shift assignment for today, and who else is currently on duty.',
  sections: [
    {
      heading: 'Your shift',
      body: 'The card at the top shows your station, role, shift time, and status — pulled from the same roster your supervisor manages in Workforce Management, so both screens always agree.',
    },
    {
      heading: 'Acknowledging your shift',
      body: '"Acknowledge Shift" appears when your shift hasn\'t been confirmed yet. Acknowledging it is available to you directly — no supervisor permission is needed to confirm your own shift.',
    },
    {
      heading: 'No shift assigned',
      body: 'If nothing shows here, no shift has been assigned to your account yet — check with your supervisor.',
    },
    {
      heading: 'Team on Duty Now',
      body: 'A live list of everyone else currently marked On Duty on the registration roster, with their station and shift time.',
    },
  ],
};

const RECORDS_WORKFORCE_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'records-workforce-management',
  title: 'Workforce Management',
  intro:
    'Manage medical records staff schedules, duty rosters, and shift coverage. Visible only to the records supervisor.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Staff on Duty, Today’s Shifts, On-Call Staff, Shift Acknowledgement, Coverage Status, and Shift Changes summarize the roster at a glance.',
    },
    {
      heading: "Today's Roster",
      body: 'Search by staff name or filter by shift type, role, and status. Each row shows the station, shift time, and acknowledgement state.',
    },
    {
      heading: 'Create and edit shifts',
      body: 'Create Shift opens a form for staff name, role, station, shift type, and status. The pencil icon on a row reopens the same form pre-filled for editing.',
    },
    {
      heading: 'Coverage and acknowledgement',
      body: 'The Coverage Overview panel tracks station coverage by shift. Pending Shift Acknowledgement lists staff who haven’t confirmed their shift yet, with a one-tap reminder.',
    },
  ],
};

const PATIENT_RECORD_GUIDE: HelpGuide = {
  id: 'patient-record',
  title: 'Patient Record',
  intro: 'The full clinical chart for one patient, organised into tabs.',
  sections: [
    {
      heading: 'Header',
      body: 'Demographics, ward/bed, admission date, length of stay, and assigned doctor sit alongside risk level, allergies, code status, and the current diagnosis.',
    },
    {
      heading: 'Allergy banner',
      body: 'Recorded allergies always show at the top in red — this banner never collapses and appears on every patient screen for safety.',
    },
    {
      heading: 'Overview tab',
      body: 'Key Information, Latest Vitals, Alerts, Diagnosis & Clinical Summary, Care Plan Summary, and Intake & Output summarize the patient at a glance. The sidebar tracks Care Plan Progress, the next medication due, upcoming nursing tasks, and recent nursing notes.',
    },
    {
      heading: 'Other tabs',
      body: 'Vitals, Medication, Nursing Notes, Care Plan, Laboratory, Radiology, Clinical Timeline, and Documents each open a dedicated view — some are still being built out.',
    },
    {
      heading: 'Print Record',
      body: 'Generates a printable summary of the patient’s key information, diagnosis, and latest vitals.',
    },
  ],
};

const MY_PATIENTS_GUIDE: HelpGuide = {
  id: 'my-patients',
  title: 'My Patients',
  intro: 'The full roster of patients assigned to you during this shift.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total My Patients, High Risk Patients, Due Medications, Due Observations, and Stable Patients summarize your assigned roster.',
    },
    {
      heading: 'Filters and view',
      body: 'Narrow the roster by ward, risk level, or care status, or search by name, MRN, or diagnosis. Switch between Card View and List View with the toggle on the right.',
    },
    {
      heading: 'Patient cards',
      body: 'Each card shows risk level, ward/bed, diagnosis, assigned doctor, latest vitals, and the next medication due, plus the current care status.',
    },
    {
      heading: 'Actions',
      body: 'View Record opens full details in the side panel. Record Observation and Add Nursing Note take you straight into recording vitals or a note for that patient.',
    },
  ],
};

const VITAL_SIGNS_GUIDE: HelpGuide = {
  id: 'vital-signs',
  title: 'Vital Signs',
  intro: 'Monitor, record and track a patient’s vital signs and Early Warning Score.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their vitals — search by name or MRN. "Change Patient" at the top of the header returns you to the picker.',
    },
    {
      heading: 'Stat tiles',
      body: 'Blood Pressure, Pulse, Respiratory Rate, Temperature, SpO₂, Pain Score, and Blood Sugar each show a High/Low/Normal badge; Weight and Height are recorded less often and show when they were last updated.',
    },
    {
      heading: 'Trend charts',
      body: 'Six charts track each vital over the selected window — 6 Hours, 24 Hours, 7 Days, or 30 Days.',
    },
    {
      heading: 'Early Warning Score (NEWS2)',
      body: 'A standard clinical score computed from the latest reading. Medium and High risk show an alert with the recommended monitoring level.',
    },
    {
      heading: 'Recording vitals',
      body: '"Record New Vitals" opens a form for every measurement at once; the new reading immediately updates the stat tiles, trend charts, and NEWS2 score.',
    },
    {
      heading: 'Actions',
      body: 'Escalate Patient notifies the assigned doctor for urgent review. Print Report downloads a PDF of recent readings.',
    },
  ],
};

const NURSE_LABORATORY_GUIDE: HelpGuide = {
  id: 'nurse-laboratory',
  title: 'Laboratory',
  intro:
    'View laboratory tests and results, and manage specimen collection. No result editing is allowed.',
  sections: [
    {
      heading: 'Tabs and stat cards',
      body: 'Pending Tests, Completed Results, Critical Results, and Doctor Requests — click a tab or its stat card to jump straight to it. Rows are sorted with STAT priority first.',
    },
    {
      heading: 'Collecting a sample',
      body: 'From Doctor Requests, "Collect Sample" requires confirming the patient’s identity with two identifiers (name and MRN) before the sample counts as collected — and confirming fasting status first for tests that require it.',
    },
    {
      heading: 'Rejected samples',
      body: 'If the laboratory rejects a sample, it appears in Pending Tests with the reason shown — "Recollect Sample" repeats the same identity-check flow.',
    },
    {
      heading: 'Critical results',
      body: 'A critical result must be read back and acknowledged — "Acknowledge & Notify Doctor" records which doctor was notified and when. Unacknowledged critical results are flagged in the sidebar.',
    },
    {
      heading: 'Overdue tests',
      body: 'A test still pending past its expected turnaround time is flagged Overdue, with a "Follow Up with Lab" action to chase it.',
    },
  ],
};

const NURSE_CLINICAL_TIMELINE_GUIDE: HelpGuide = {
  id: 'nurse-clinical-timeline',
  title: 'Clinical Timeline',
  intro:
    'A single chronological history of one patient’s care — registration, assessments, vitals, medication, laboratory activity, notes, transfers, and discharge.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their timeline — search by name or MRN. "Change Patient" at the top returns you to the picker.',
    },
    {
      heading: 'Reading the timeline',
      body: 'Events run oldest to newest, exactly as care unfolded. Each entry shows its category, what happened, exactly when, and who recorded it — "View Details" opens the full record.',
    },
    {
      heading: 'Filtering',
      body: 'Use the category pills to narrow the list to one type of event, or "Filter" to set a date range. "View as List" switches to a compact table of the same events.',
    },
    {
      heading: 'Export',
      body: '"Export Timeline" produces a PDF of the currently filtered events — useful for handover notes and case summaries.',
    },
    {
      heading: 'Read-only',
      body: 'This screen never edits clinical data — use the Quick Actions panel to jump to Nursing Notes, the full Patient Record, Care Plan, Laboratory Results, or Discharges to make changes.',
    },
  ],
};

const OBSERVATION_CHARTS_GUIDE: HelpGuide = {
  id: 'observation-charts',
  title: 'Observation Charts',
  intro: 'Continuous patient monitoring and trends across every recorded observation.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their charts — search by name or MRN. "Change Patient" at the top of the header returns you to the picker.',
    },
    {
      heading: 'Time range',
      body: 'Last 6 Hours, 12 Hours, 24 Hours, 3 Days, or 7 Days — every chart, the observation table, and the trends summary all update to the selected window.',
    },
    {
      heading: 'Charts',
      body: 'Temperature, Pulse, Respiration, Blood Pressure, Fluid Intake, Fluid Output, Pain Score, and Blood Sugar each show a trend over the selected window. "View Table" switches to a row-by-row table of the same data; "Export" downloads it as a PDF.',
    },
    {
      heading: 'Early Warning Score (NEWS2)',
      body: 'A standard clinical score computed from the latest reading. "View EWS History" shows how the score has changed across the selected window.',
    },
    {
      heading: 'Recording observations',
      body: '"Add New Observation" records a full new reading. "Input Fluid Balance" logs intake and output without a full observation. "Calculate EWS" recalculates the score from the latest reading.',
    },
  ],
};

const NURSING_ASSESSMENT_GUIDE: HelpGuide = {
  id: 'nursing-assessment',
  title: 'Nursing Assessment',
  intro: 'Complete a comprehensive nursing assessment for a patient, section by section.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to start their assessment — search by name or MRN. "Change Patient" returns you to the picker.',
    },
    {
      heading: 'Assessment sections',
      body: 'Chief Complaint, Initial (ABCDE) and Physical Assessment, Pain, Fall Risk, Pressure Injury Risk, Nutrition Screening, Mental Status, Mobility, Fluid Balance, and an overall Assessment Summary — each section is scored or described independently.',
    },
    {
      heading: 'Risk scores',
      body: 'Fall Risk, Pressure Injury Risk, and Nutrition Risk each carry a Low/Moderate/High-style badge that colors to match severity, alongside the specific risk factors or interventions checked.',
    },
    {
      heading: 'Save as Draft vs. Submit',
      body: 'Save as Draft keeps your progress without finalizing it. Submit Assessment requires the Chief Complaint and Overall Assessment to be filled in, then adds the assessment to the patient record.',
    },
    {
      heading: 'Assessment Checklist',
      body: 'A running checklist of documentation steps — required fields, abnormal findings, care plan review, patient education, and follow-up — toggle each as you complete it.',
    },
  ],
};

const MEDICATION_ADMINISTRATION_GUIDE: HelpGuide = {
  id: 'medication-administration',
  title: 'Medication Administration (MAR)',
  intro: 'View and administer scheduled medications safely, with the 5 Rights front and center.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their medication record — search by name or MRN. "Change Patient" returns you to the picker.',
    },
    {
      heading: 'Allergies and 5 Rights',
      body: 'Allergies show in the patient header, the full allergy banner, and the 5 Rights checklist reminds you to verify patient, medication, dose, route, and time before every administration.',
    },
    {
      heading: 'Scheduled, PRN, and Continuous tabs',
      body: 'Scheduled Medications are fixed-time doses; PRN Medications are as-needed; Continuous Infusions run ongoing. Filter any tab by Overdue, Due Now, Upcoming, or Completed, and toggle "Show Held Medications".',
    },
    {
      heading: 'Row actions',
      body: 'Administer records the dose as given. Overdue doses switch to Missed Dose. The ⋮ menu on each row also offers Hold Medication and Document Reaction.',
    },
    {
      heading: 'Administration Actions',
      body: 'The sidebar mirrors the row actions for whichever medication is currently selected — select a row first.',
    },
  ],
};

const NURSING_NOTES_GUIDE: HelpGuide = {
  id: 'nursing-notes',
  title: 'Nursing Notes',
  intro: 'View and add chronological nursing documentation for a patient.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their nursing notes — search by name or MRN. "Change Patient" returns you to the picker.',
    },
    {
      heading: 'Tabs and filters',
      body: 'Notes List shows everything; My Notes filters to your own entries; the remaining tabs jump straight to a single note type. Search, Note Type, Date Range, and Author narrow the list further.',
    },
    {
      heading: 'Adding a note',
      body: 'Fill in Note Type, Date & Time, and Observation / Note (required), plus optional Intervention and Patient Response. Save as Draft keeps it editable; Save Note finalizes it. Add to Care Plan links the note to a care goal.',
    },
    {
      heading: 'Quick Note Templates',
      body: 'Click a template to pre-fill the note type and starter text. Manage Templates lets you add, edit, or remove templates.',
    },
    {
      heading: 'Editing and deleting',
      body: 'The ⋮ menu on each note row offers Edit Note (loads it back into the form) and Delete Note.',
    },
  ],
};

const CARE_PLANS_GUIDE: HelpGuide = {
  id: 'care-plans',
  title: 'Care Plans',
  intro: 'View and manage individualized nursing care plans for a patient.',
  sections: [
    {
      heading: 'Selecting a patient',
      body: 'Pick a patient from your assigned roster to open their care plans — search by name or MRN. "Change Patient" returns you to the picker.',
    },
    {
      heading: 'Tabs',
      body: 'Active Care Plans, All Care Plans, and Completed Plans filter the table by status. Care Plan History shows every progress entry across every plan, most recent first.',
    },
    {
      heading: 'Care plan table',
      body: 'Each row shows the problem, goal, start date, next review countdown, status, and assigned nurse. View Plan opens it in the detail panel below; the ⋮ menu offers Edit, Mark Complete, and Discontinue.',
    },
    {
      heading: 'Care Plan Details panel',
      body: 'Overview summarizes the problem, goal, interventions, and evaluation. Interventions lets you check off completed items and add new ones. Progress Notes lets you log a new entry. Evaluations lets you update the status and note. Timeline shows every progress entry for that plan. Documents lists attached files.',
    },
    {
      heading: 'Creating a care plan',
      body: 'Create New Care Plan (or a Quick Template) opens a form for the problem, goal, dates, assigned nurse, and interventions.',
    },
  ],
};

const WARD_CENSUS_GUIDE: HelpGuide = {
  id: 'ward-census',
  title: 'Ward Census',
  intro:
    'A live per-ward occupancy summary — occupied, available, and reserved beds, with patient acuity mix.',
  sections: [
    {
      heading: 'Facility stat cards',
      body: 'Total Beds, Occupied, Available, Reserved, and Cleaning summarize occupancy across every ward.',
    },
    {
      heading: 'Ward cards',
      body: 'Each card shows a ward’s nurse in charge, occupied/total beds, a stacked occupancy bar, and the occupancy percentage. Click a card to view that ward’s bed-level detail below.',
    },
    {
      heading: 'Bed-level table',
      body: 'Every bed in the selected ward, with its status, patient (if occupied), assigned doctor, acuity, and admission date. View Patient opens the full patient record for beds on your own roster.',
    },
    {
      heading: 'Ward Alerts',
      body: 'Flags capacity or housekeeping concerns for a specific ward — selecting an alert jumps straight to that ward.',
    },
    {
      heading: 'Refresh and print',
      body: 'Refresh reloads the current occupancy snapshot. Print Census Report opens your browser’s print dialog for the current view.',
    },
  ],
};

const BED_MANAGEMENT_GUIDE: HelpGuide = {
  id: 'bed-management',
  title: 'Bed Management',
  intro: 'Visualize ward layout and manage bed status.',
  sections: [
    {
      heading: 'Selecting a ward and view',
      body: 'Select Ward switches between wards. Ward View shows a visual room layout; List View shows a sortable table of the same beds.',
    },
    {
      heading: 'Filtering',
      body: 'Filter Beds narrows by status. Show Isolation Only and Show Cleaning Required narrow further to just those beds.',
    },
    {
      heading: 'Bed cards',
      body: 'Each bed is colored by status and shows the patient and MRN when occupied. Click a bed to view its details below; the ⋮ menu offers Transfer Patient, Reserve Bed, or Mark Available depending on its current status.',
    },
    {
      heading: 'Zoom',
      body: 'The − / + controls zoom the ward layout in and out; Reset View returns to 100%.',
    },
    {
      heading: 'Bed Details, Actions, and Legend',
      body: 'Bed Details shows the selected bed’s patient, diagnosis, doctor, and length of stay. Actions repeats the three status-changing actions for the selected bed. Legend maps each color to its bed status.',
    },
  ],
};

const ADMISSIONS_GUIDE: HelpGuide = {
  id: 'admissions',
  title: 'Admissions',
  intro: 'Track and manage newly admitted patients through the 7-step admission workflow.',
  sections: [
    {
      heading: 'Admission Workflow stepper',
      body: 'Registration, Doctor Assessment, Nursing Assessment, Assign Bed, Vital Signs, Care Plan, and Medication. Click a step to filter the table to admissions currently at that step; click again to clear it.',
    },
    {
      heading: 'Tabs',
      body: 'Current Admissions shows patients actively moving through the workflow or scheduled to arrive. Pending Admissions and Completed Today are filtered by status; All Admissions shows every record regardless of status.',
    },
    {
      heading: 'Filters',
      body: 'Search by patient name or MRN, and narrow by Status, Ward, or Admission Type. Filter applies the current search and dropdown selections.',
    },
    {
      heading: 'Table and actions',
      body: 'Each row shows the patient, MRN, admission date and time, ward, type, current step, and status. The ⋮ menu opens the patient record (once a bed is assigned), advances the workflow to the next step, or cancels the admission.',
    },
    {
      heading: 'Sidebar',
      body: 'Admissions Overview summarizes today’s totals by status. Workflow Progress shows how many admissions have reached each step. Recent Completed lists the latest finished admissions. Quick Actions starts a New Admission, opens Bed Availability, Admission Reports, or the Admission Checklist.',
    },
  ],
};

const DISCHARGES_GUIDE: HelpGuide = {
  id: 'discharges',
  title: 'Discharges',
  intro: 'Plan, track, and complete patient discharges through the 7-step discharge workflow.',
  sections: [
    {
      heading: 'Discharge Workflow stepper',
      body: 'Discharge Order, Medication Reconciliation, Patient Education, Pending Results, Discharge Summary, Follow-up & Transport, and Bed Released. Click a step to filter the table to plans currently at that step; click again to clear it.',
    },
    {
      heading: 'Tabs',
      body: 'Active Discharge Plans shows patients still working through earlier steps. Ready for Discharge shows patients at the last step before their bed is released. Discharged Today and All Discharges show completed and every record respectively.',
    },
    {
      heading: 'Filters',
      body: 'Search by patient name or MRN, and narrow by Status, Ward, or Discharge Type. Filter applies the current search and dropdown selections.',
    },
    {
      heading: 'Table and actions',
      body: 'Each row shows the patient, MRN, ward and bed, planned discharge date and time, discharge type, current step, and status. The ⋮ menu opens the patient record, advances the plan to the next step (or completes the discharge at the final step), or cancels the plan.',
    },
    {
      heading: 'Sidebar',
      body: 'Discharges Overview summarizes plans by status. Workflow Progress shows how many plans have reached each step. Recently Discharged lists the latest patients to leave. Quick Actions starts a new Plan Discharge, opens Bed Management, Discharge Reports, or the Discharge Checklist.',
    },
  ],
};

const PATIENT_QUEUE_GUIDE: HelpGuide = {
  id: 'patient-queue',
  title: 'Patient Queue',
  intro:
    'Every patient waiting on a nurse — from Registration check-in and triage through to medication, dressing, and observation for admitted patients.',
  sections: [
    {
      heading: 'Stat cards',
      body: 'Total in Queue, Overdue Tasks, Due Within 30 Min, Completed Today, Patients Under My Care, and Awaiting Triage summarize your workload at a glance.',
    },
    {
      heading: 'Filters',
      body: 'Narrow the list by ward, priority, task type, assigned doctor, or status, or search by patient name, MRN, or task.',
    },
    {
      heading: 'Task rows',
      body: 'Each row shows the patient, ward/bed, assigned doctor, the next nursing task, and how much time is left — overdue times are shown in red.',
    },
    {
      heading: 'Actions',
      body: 'Select the eye icon (or the row) to open task details in the side panel. Use the checkmark to mark a task complete, or the panel’s buttons to move it to In Progress or Complete.',
    },
    {
      heading: 'Awaiting Triage rows',
      body: 'Patients fresh from Registration check-in, not yet claimed by any nurse. Reassign moves them to another department/clinic, Mark Emergency flags high-priority cases, and Start Triage claims the patient into your caseload and opens Vital Signs immediately to record their first reading.',
    },
  ],
};

const DUTY_ROSTER_GUIDE: HelpGuide = {
  id: 'duty-roster',
  title: 'Workforce Management',
  intro: 'Manage doctor schedules, duty rosters, on-call coverage, and workforce operations.',
  sections: [
    {
      heading: 'Today’s Roster',
      body: 'Search by doctor name or filter by shift, role, and status. Each row shows the doctor’s shift, ward, current status, and whether they’ve acknowledged the assignment.',
    },
    {
      heading: 'Creating and editing shifts',
      body: 'Use "Create Shift" to add a new assignment, or the pencil icon on any row to edit one. The three-dot menu can duplicate or cancel a shift.',
    },
    {
      heading: 'Coverage and acknowledgements',
      body: 'The Coverage Overview card tracks staffing percentage by shift window. The Pending Acknowledgement card lists doctors who haven’t confirmed their shift yet — send a reminder directly from there.',
    },
    {
      heading: 'Publishing a roster',
      body: 'Generate Roster and Create Weekly Roster open the roster calendar. Publish Roster/Publish Schedule notifies all doctors of the current roster.',
    },
  ],
};

const DUTY_ROSTER_CALENDAR_GUIDE: HelpGuide = {
  id: 'duty-roster-calendar',
  title: 'Duty Roster Calendar',
  intro: 'A full calendar view of shift patterns and staff availability.',
  sections: [
    {
      heading: 'Switching views',
      body: 'Use the Day, Week, Month, and Timeline tabs to change how the roster is displayed. Prev/next and Today move you through the calendar.',
    },
    {
      heading: 'Reading the colour coding',
      body: 'The legend at the top maps each colour to a shift window — Morning, Afternoon, Night, and On-Call. Use the Filter button to isolate a single shift type.',
    },
    {
      heading: 'Creating a shift',
      body: 'Create Shift opens the same shift form used on the main Workforce Management page, so new assignments stay consistent across both views.',
    },
  ],
};

const SHIFT_TEMPLATES_GUIDE: HelpGuide = {
  id: 'shift-templates',
  title: 'Shift Templates',
  intro: 'Reusable shift patterns that speed up roster creation.',
  sections: [
    {
      heading: 'Building a template',
      body: 'A template groups shift slots — time window, required role, and headcount — under one reusable name, scoped to a department.',
    },
    {
      heading: 'Applying a template',
      body: '"Apply to Roster" generates the shifts defined in the template directly onto today\'s roster in one action, instead of creating each shift by hand.',
    },
    {
      heading: 'Managing templates',
      body: 'Duplicate a template to start a variation without editing the original. Inactive templates stay saved but are excluded from quick application.',
    },
  ],
};

const ON_CALL_GUIDE: HelpGuide = {
  id: 'on-call',
  title: 'On-Call Schedule',
  intro: 'On-call rota, emergency cover, and escalation chains by department.',
  sections: [
    {
      heading: 'Escalation chain',
      body: 'Each department shows a Primary, Secondary, and Consultant Backup on-call doctor — escalate down the chain if the primary contact is unavailable.',
    },
    {
      heading: 'Reaching an on-call doctor',
      body: 'The call icon dials the doctor directly. Availability badges (Available, Busy, Unavailable) update as doctors report their status.',
    },
    {
      heading: 'Reassigning on-call duty',
      body: 'Use Reassign on any on-call slot to hand the duty to a different doctor and update their contact number.',
    },
    {
      heading: 'Weekly schedule',
      body: "The table below shows the full week's on-call rotation by department and level — filter by department or escalation level to narrow it down.",
    },
  ],
};

const STAFF_ASSIGNMENTS_GUIDE: HelpGuide = {
  id: 'staff-assignments',
  title: 'Assign Doctors',
  intro: 'Ward and department allocation, with duty hand-off notes for incoming doctors.',
  sections: [
    {
      heading: 'Doctor pool',
      body: 'Every doctor shows their current ward and assignment status. Unassigned and on-leave doctors are flagged so gaps are easy to spot.',
    },
    {
      heading: 'Assigning a doctor',
      body: 'Assign or Reassign opens a form to pick a ward, an effective date, and optional hand-off notes for the incoming doctor.',
    },
    {
      heading: 'Duty hand-off log',
      body: 'Hand-off notes entered during an assignment are recorded here — a running log of what each incoming doctor was told about their ward.',
    },
  ],
};

const WORKFORCE_ANALYTICS_GUIDE: HelpGuide = {
  id: 'workforce-analytics',
  title: 'Workforce Analytics',
  intro: 'Staff utilisation, shift coverage, and overtime tracking.',
  sections: [
    {
      heading: 'Choosing a period',
      body: 'Switch between This Week, This Month, and This Quarter to change the range for every stat and chart on the page.',
    },
    {
      heading: 'Reading the charts',
      body: 'Utilization Trend shows staffing percentage over time. Department Coverage breaks down shift volume by department.',
    },
    {
      heading: 'Overtime tracking',
      body: 'Doctors are listed with total overtime hours and shift count for the selected period — hours at or above 30 are flagged in red.',
    },
  ],
};

const MY_SCHEDULE_GUIDE: HelpGuide = {
  id: 'my-schedule',
  title: 'My Schedule',
  intro: 'Your personal shift calendar and on-call assignments.',
  sections: [
    {
      heading: "Today's shift",
      body: 'The card at the top shows your current or next shift with its time, location, and supervisor.',
    },
    {
      heading: 'Acknowledging shifts',
      body: 'Newly published shifts require acknowledgement — the button appears on the shift card and your confirmation is recorded.',
    },
    {
      heading: 'Calendar views',
      body: 'Switch between week and month views. Shift blocks are colour-coded by type; on-call dates are listed separately.',
    },
  ],
};

const NURSE_MY_SCHEDULE_GUIDE: HelpGuide = {
  id: 'nurse-my-schedule',
  title: 'My Schedule',
  intro: 'Your personal shift calendar, ward coverage, and monthly shift summary.',
  sections: [
    {
      heading: "Today's shift",
      body: 'The card at the top shows your current or next shift with its time, ward, and remaining duration.',
    },
    {
      heading: 'Acknowledging shifts',
      body: 'Newly published shifts require acknowledgement — "Confirm Shift" or "Cannot Attend" appears on shifts awaiting your response, and your choice is recorded immediately.',
    },
    {
      heading: 'This Week',
      body: 'A day-by-day strip of your shifts — colour-coded by type (Morning, Afternoon, Night, On-Call), with a checkmark once acknowledged.',
    },
    {
      heading: 'Ward On-Call Rota',
      body: 'Shows who is covering your ward now and over the next 7 days, with your own on-call assignments highlighted.',
    },
  ],
};

const SHIFT_HANDOVER_GUIDE: HelpGuide = {
  id: 'shift-handover',
  title: 'Shift Handover',
  intro:
    'A structured record of ward status, tasks, and patients handed from one shift to the next.',
  sections: [
    {
      heading: 'Patient Summary',
      body: 'Ward occupancy and a snapshot of every patient — bed, diagnosis, length of stay, condition, and handover notes. "View All Patients" opens the full roster.',
    },
    {
      heading: 'Outstanding Tasks and Critical Patients',
      body: '"View All Tasks" opens a checklist you can tick off as you brief the incoming nurse. "View All Critical Patients" lets you mark each one reviewed at handover.',
    },
    {
      heading: 'Medication Due and Pending Investigations',
      body: 'What needs attention in the next few hours. "View All" on either card opens the full Medication Administration or Laboratory screen.',
    },
    {
      heading: 'Signatures and completing handover',
      body: 'The incoming nurse must "Sign as Incoming Nurse" before "Complete Handover" becomes available — this formally transfers responsibility for the ward. "Save as Draft" keeps your progress without completing it.',
    },
  ],
};

const REPORTS_GUIDE: HelpGuide = {
  id: 'reports',
  title: 'Clinical Reports',
  intro:
    'Your clinical activity at a glance — consultations, lab orders, prescriptions, and referrals.',
  sections: [
    {
      heading: 'Period filter',
      body: 'Switch between This Week, This Month, and This Quarter — the stat cards and both charts update to match.',
    },
    {
      heading: 'Charts',
      body: 'Daily/weekly/monthly consultations show as a bar chart; Diagnosis Distribution shows the split of diagnoses recorded in the period as a donut chart.',
    },
    {
      heading: 'Referral report',
      body: 'Every referral you have made, with its current status — Accepted, Pending, or Declined.',
    },
    {
      heading: 'Export',
      body: "Export downloads the current period's report as a CSV.",
    },
  ],
};

const COLLABORATION_GUIDE: HelpGuide = {
  id: 'collaboration',
  title: 'Messages',
  intro:
    'Direct messaging with any staff member across departments — coordination, quick questions, case handoffs.',
  sections: [
    {
      heading: 'Conversations',
      body: 'Select a colleague from the list to open the thread. Unread conversations show a cyan count badge; search narrows the list by name or department.',
    },
    {
      heading: 'Starting a conversation',
      body: 'The "+ New" button lists every staff member captured in the system who isn\'t already in your conversation list — pick anyone, from any department, to start chatting.',
    },
    {
      heading: 'Patient context',
      body: "When a conversation relates to a referral or shared case, the patient's name and MRN appear in a strip below the recipient's name — check it before you write.",
    },
    {
      heading: 'Composing',
      body: 'Enter sends, Shift+Enter adds a new line. The toolbar can insert a quick template, reference the current patient context, or attach a file.',
      steps: [
        'Template icon — insert a canned phrase',
        'Stethoscope icon — insert the patient context reference',
        'Paperclip icon — attach a file',
      ],
    },
    {
      heading: 'Conversation actions',
      body: 'Use the call icon to start a voice call, or the "⋮" menu to mute notifications or mark a conversation unread.',
    },
  ],
};

const NOTIFICATIONS_GUIDE: HelpGuide = {
  id: 'notifications',
  title: 'Notifications',
  intro: 'Every alert, assignment, and clinical message in one place, newest first.',
  sections: [
    {
      heading: 'Unread indicator',
      body: 'A cyan dot next to the title marks an unread notification. "Mark all as read" clears every dot at once.',
    },
    {
      heading: 'Opening a notification',
      body: 'Selecting a notification marks it read and takes you straight to the relevant patient, referral, schedule, or conversation.',
    },
    {
      heading: 'Types',
      body: 'Colour-coded by kind — red for critical/emergency alerts, green for clinical updates, purple for referrals, amber for schedule, blue for messages.',
    },
  ],
};

const PROFILE_GUIDE: HelpGuide = {
  id: 'profile',
  title: 'My Profile',
  intro:
    'Your professional identity as it appears across MyHxCare — content is tailored to your role (nursing, clinical, registration, medical records, and beyond).',
  sections: [
    {
      heading: 'Overview',
      body: 'Everything at a glance: personal and professional details, work schedule, account security, and your recent activity feed.',
    },
    {
      heading: 'Personal & Professional Information',
      body: 'Dedicated tabs for the same details as Overview. "Edit" next to Personal Information updates your phone and email — other fields are managed by your administrator.',
    },
    {
      heading: 'Change Password',
      body: 'Update your login password directly from this tab — no need to leave the page.',
    },
    {
      heading: 'Notification & display preferences',
      body: "Managed from Settings, not here — open it from the sidebar to change what you're notified about or how screens display.",
    },
  ],
};

const SETTINGS_GUIDE: HelpGuide = {
  id: 'settings',
  title: 'Settings',
  intro: 'Manage your account, notification and display preferences, and security.',
  sections: [
    {
      heading: 'Account Information',
      body: 'Your name, role, and credentials are shown for reference — "Edit" next to Email or Phone updates just those two fields; "Edit Profile" opens the full profile page (including your photo).',
    },
    {
      heading: 'Preferences',
      body: 'Notification and Display toggles take effect immediately, but only persist once you select "Save Changes" at the top of the page.',
    },
    {
      heading: 'Security & Access',
      body: 'Change your password, enable two-factor authentication, review active sessions, or open the Clinical Audit Log from here.',
    },
    {
      heading: 'Role Permissions',
      body: 'A read-only summary of what your current role can and cannot do — set by your administrator, not editable here.',
    },
  ],
};

const AUDIT_LOG_GUIDE: HelpGuide = {
  id: 'audit-log',
  title: 'Clinical Audit Log',
  intro: 'A chronological record of your clinical and account activity.',
  sections: [
    {
      heading: 'Reading the log',
      body: 'Entries are grouped by day, newest first. Each entry is colour-coded by category — consultation, laboratory, prescription, referral, emergency, or account.',
    },
  ],
};

const APPOINTMENTS_GUIDE: HelpGuide = {
  id: 'appointments',
  title: 'Appointments',
  intro: "Today's booked appointments at a glance.",
  sections: [
    {
      heading: 'Status badges',
      body: 'Confirmed (green), Urgent (red), Pending (amber), Cancelled (grey). Urgent appointments should be reviewed first.',
    },
    {
      heading: 'Details',
      body: 'Each card shows the patient, time, and reason for visit — select one to open the patient context.',
    },
  ],
};

/**
 * Resolve the guide for the current pathname. Order matters — more specific
 * routes are tested before their parents.
 */
export function resolveHelpGuide(pathname: string): HelpGuide {
  if (pathname.startsWith('/clinical-timeline')) return CLINICAL_TIMELINE_INDEX_GUIDE;
  if (/^\/patients\/[^/]+\/consultation/.test(pathname)) return CONSULTATION_GUIDE;
  if (/^\/patients\/[^/]+\/timeline/.test(pathname)) return CLINICAL_TIMELINE_GUIDE;
  if (/^\/patients\/[^/]+\/referral/.test(pathname)) return REFERRALS_GUIDE;
  if (/^\/patients\/[^/]+\/lab-order/.test(pathname)) return LAB_ORDERS_GUIDE;
  if (/^\/patients\/[^/]+\/prescription/.test(pathname)) return PRESCRIPTIONS_GUIDE;
  if (/^\/patients\/[^/]+/.test(pathname)) return PATIENT_PROFILE_GUIDE;
  if (pathname.startsWith('/patients')) return PATIENTS_GUIDE;
  if (pathname.startsWith('/dashboard')) return DASHBOARD_GUIDE;
  if (pathname.startsWith('/emergency/patient-queue')) return EMERGENCY_PATIENT_QUEUE_GUIDE;
  if (pathname.startsWith('/emergency/triage-assessment')) return TRIAGE_ASSESSMENT_GUIDE;
  if (pathname.startsWith('/emergency/bed-assignment')) return BED_ASSIGNMENT_GUIDE;
  if (pathname.startsWith('/emergency/tracking-board')) return EMERGENCY_TRACKING_BOARD_GUIDE;
  if (pathname.startsWith('/emergency/observation-unit')) return OBSERVATION_UNIT_GUIDE;
  if (pathname.startsWith('/emergency/medication-orders')) return EMERGENCY_MEDICATION_ORDERS_GUIDE;
  if (pathname.startsWith('/emergency/procedures')) return EMERGENCY_PROCEDURES_GUIDE;
  if (pathname.startsWith('/emergency/clinical-notes')) return EMERGENCY_CLINICAL_NOTES_GUIDE;
  if (pathname.startsWith('/emergency/diagnostic-requests'))
    return EMERGENCY_DIAGNOSTIC_REQUESTS_GUIDE;
  if (pathname.startsWith('/emergency/results-review')) return EMERGENCY_RESULTS_REVIEW_GUIDE;
  if (pathname.startsWith('/emergency/critical-alerts')) return EMERGENCY_CRITICAL_ALERTS_GUIDE;
  if (pathname.startsWith('/emergency/visit-history')) return EMERGENCY_VISIT_HISTORY_GUIDE;
  if (pathname.startsWith('/emergency/clinical-timeline')) return EMERGENCY_CLINICAL_TIMELINE_GUIDE;
  if (pathname.startsWith('/emergency/reports/waiting-time'))
    return EMERGENCY_WAITING_TIME_REPORTS_GUIDE;
  if (pathname.startsWith('/emergency/reports/triage-performance'))
    return EMERGENCY_TRIAGE_PERFORMANCE_REPORTS_GUIDE;
  if (pathname.startsWith('/emergency/reports')) return EMERGENCY_REPORTS_GUIDE;
  if (pathname.startsWith('/emergency')) return EMERGENCY_DASHBOARD_GUIDE;
  if (/^\/billing\/accounts\/[^/]+/.test(pathname)) return BILLING_ACCOUNT_DETAIL_GUIDE;
  if (pathname.startsWith('/billing/accounts')) return BILLING_ACCOUNTS_GUIDE;
  if (pathname.startsWith('/billing/invoices')) return BILLING_INVOICES_GUIDE;
  if (pathname.startsWith('/billing/payments')) return BILLING_PAYMENTS_GUIDE;
  if (pathname.startsWith('/billing/refunds')) return BILLING_REFUNDS_ADJUSTMENTS_GUIDE;
  if (pathname.startsWith('/billing/reconciliation')) return BILLING_PAYMENT_RECONCILIATION_GUIDE;
  if (pathname.startsWith('/billing/outstanding')) return BILLING_OUTSTANDING_ACCOUNTS_GUIDE;
  if (pathname.startsWith('/billing/workforce-management'))
    return BILLING_WORKFORCE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/billing/my-schedule')) return BILLING_MY_SCHEDULE_GUIDE;
  if (pathname.startsWith('/billing/shift-handover')) return BILLING_SHIFT_HANDOVER_GUIDE;
  if (pathname.startsWith('/billing/reports/payments')) return BILLING_PAYMENT_REPORTS_GUIDE;
  if (pathname.startsWith('/billing/reports/revenue')) return BILLING_REVENUE_REPORTS_GUIDE;
  // Exact match, not startsWith — guards against swallowing any future
  // /billing/reports/* sub-route that doesn't have its own guide yet.
  if (pathname === '/billing/reports' || pathname.startsWith('/billing/reports?'))
    return BILLING_REPORTS_GUIDE;
  if (pathname.startsWith('/billing/revenue/by-department'))
    return BILLING_REVENUE_BY_DEPARTMENT_GUIDE;
  if (pathname.startsWith('/billing/revenue/by-service')) return BILLING_REVENUE_BY_SERVICE_GUIDE;
  if (pathname.startsWith('/billing/revenue')) return BILLING_REVENUE_OVERVIEW_GUIDE;
  if (pathname.startsWith('/billing')) return BILLING_DASHBOARD_GUIDE;
  if (pathname.startsWith('/encounters/prescriptions')) return PRESCRIPTIONS_GUIDE;
  if (pathname.startsWith('/encounters')) return ENCOUNTERS_GUIDE;
  if (pathname.startsWith('/clinical-notes')) return CLINICAL_NOTES_GUIDE;
  if (pathname.startsWith('/referrals')) return REFERRALS_INDEX_GUIDE;
  if (pathname.startsWith('/lab/orders')) return LAB_ORDERS_GUIDE;
  if (pathname.startsWith('/lab/results')) return LAB_RESULTS_GUIDE;
  if (pathname.startsWith('/laboratory/orders')) return LABORATORY_ORDERS_GUIDE;
  if (pathname.startsWith('/laboratory/sample-collection'))
    return LABORATORY_SAMPLE_COLLECTION_GUIDE;
  if (pathname.startsWith('/laboratory/sample-reception')) return LABORATORY_SAMPLE_RECEPTION_GUIDE;
  if (pathname.startsWith('/laboratory/sample-tracking')) return LABORATORY_SAMPLE_TRACKING_GUIDE;
  if (pathname.startsWith('/laboratory/test-work-queue')) return LABORATORY_TEST_WORK_QUEUE_GUIDE;
  if (pathname.startsWith('/laboratory/result-entry')) return LABORATORY_RESULT_ENTRY_GUIDE;
  if (pathname.startsWith('/laboratory/result-verification'))
    return LABORATORY_RESULT_VERIFICATION_GUIDE;
  if (pathname.startsWith('/laboratory/published-results'))
    return LABORATORY_PUBLISHED_RESULTS_GUIDE;
  if (pathname.startsWith('/laboratory/critical-results')) return LABORATORY_CRITICAL_RESULTS_GUIDE;
  if (pathname.startsWith('/laboratory/workforce-management'))
    return LABORATORY_WORKFORCE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/laboratory/my-schedule')) return LABORATORY_MY_SCHEDULE_GUIDE;
  if (pathname.startsWith('/laboratory/shift-handover')) return LABORATORY_SHIFT_HANDOVER_GUIDE;
  if (pathname.startsWith('/laboratory/clinical-timeline'))
    return LABORATORY_CLINICAL_TIMELINE_GUIDE;
  if (pathname.startsWith('/laboratory/history')) return LABORATORY_HISTORY_GUIDE;
  if (pathname.startsWith('/laboratory/reports/quality-control'))
    return LABORATORY_QUALITY_CONTROL_REPORTS_GUIDE;
  if (pathname.startsWith('/laboratory/reports/turnaround-time'))
    return LABORATORY_TAT_REPORTS_GUIDE;
  if (pathname.startsWith('/laboratory/reports')) return LABORATORY_REPORTS_GUIDE;
  if (pathname.startsWith('/laboratory/quality-control')) return LABORATORY_QUALITY_CONTROL_GUIDE;
  if (pathname.startsWith('/laboratory/equipment-management'))
    return LABORATORY_EQUIPMENT_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/laboratory/procurement-requests'))
    return LABORATORY_PROCUREMENT_REQUESTS_GUIDE;
  if (pathname.startsWith('/laboratory/stock-receiving')) return LABORATORY_STOCK_RECEIVING_GUIDE;
  if (pathname.startsWith('/laboratory/suppliers')) return LABORATORY_SUPPLIERS_GUIDE;
  if (pathname.startsWith('/laboratory/inventory')) return LABORATORY_INVENTORY_GUIDE;
  if (pathname.startsWith('/laboratory')) return LABORATORY_DASHBOARD_GUIDE;
  if (pathname.startsWith('/medical-records/dashboard')) return MEDICAL_RECORDS_DASHBOARD_GUIDE;
  if (pathname.startsWith('/medical-records/visit-history')) return VISIT_HISTORY_GUIDE;
  if (pathname.startsWith('/medical-records/clinical-documents')) return CLINICAL_DOCUMENTS_GUIDE;
  if (pathname.startsWith('/medical-records/patient')) return MEDICAL_RECORD_PATIENT_GUIDE;
  if (pathname.startsWith('/medical-records/requests')) return RECORD_REQUESTS_GUIDE;
  if (pathname.startsWith('/medical-records/archived')) return ARCHIVED_RECORDS_GUIDE;
  if (pathname.startsWith('/medical-records/document-upload')) return DOCUMENT_UPLOAD_GUIDE;
  if (pathname.startsWith('/medical-records/messages')) return COLLABORATION_GUIDE;
  if (pathname.startsWith('/medical-records/notifications')) return STAFF_NOTIFICATIONS_GUIDE;
  if (pathname.startsWith('/medical-records/announcements')) return ANNOUNCEMENTS_GUIDE;
  if (pathname.startsWith('/medical-records/reports')) return MEDICAL_RECORDS_REPORTS_GUIDE;
  if (pathname.startsWith('/medical-records/patient-statistics')) return PATIENT_STATISTICS_GUIDE;
  if (pathname.startsWith('/medical-records/workforce-management'))
    return RECORDS_WORKFORCE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/medical-records')) return MEDICAL_RECORDS_GUIDE;
  if (pathname.startsWith('/registration/register')) return REGISTER_PATIENT_GUIDE;
  if (pathname.startsWith('/registration/directory')) return PATIENT_DIRECTORY_GUIDE;
  if (pathname.startsWith('/registration/profile')) return PATIENT_PROFILE_REGISTRATION_GUIDE;
  if (pathname.startsWith('/registration/check-in')) return CHECK_IN_GUIDE;
  if (pathname.startsWith('/registration/appointments')) return APPOINTMENT_SCHEDULING_GUIDE;
  if (pathname.startsWith('/registration/emergency')) return EMERGENCY_REGISTRATION_GUIDE;
  if (pathname.startsWith('/registration/insurance')) return INSURANCE_VERIFICATION_GUIDE;
  if (pathname.startsWith('/registration/referrals')) return REFERRAL_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/registration/consent-forms')) return CONSENT_FORMS_GUIDE;
  if (pathname.startsWith('/registration/card-printing')) return PATIENT_CARD_PRINTING_GUIDE;
  if (pathname.startsWith('/registration/reports')) return REGISTRATION_REPORTS_GUIDE;
  if (pathname.startsWith('/registration/attendance')) return DAILY_ATTENDANCE_GUIDE;
  if (pathname.startsWith('/registration/messages')) return COLLABORATION_GUIDE;
  if (pathname.startsWith('/registration/notifications')) return STAFF_NOTIFICATIONS_GUIDE;
  if (pathname.startsWith('/registration/announcements')) return ANNOUNCEMENTS_GUIDE;
  if (pathname.startsWith('/registration/workforce-management'))
    return REGISTRATION_WORKFORCE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/registration/my-shift')) return REGISTRATION_MY_SHIFT_GUIDE;
  if (pathname.startsWith('/registration')) return REGISTRATION_DASHBOARD_GUIDE;
  if (pathname.startsWith('/nurse/vital-signs')) return VITAL_SIGNS_GUIDE;
  if (pathname.startsWith('/nurse/observation-charts')) return OBSERVATION_CHARTS_GUIDE;
  if (pathname.startsWith('/nurse/laboratory')) return NURSE_LABORATORY_GUIDE;
  if (pathname.startsWith('/nurse/clinical-timeline')) return NURSE_CLINICAL_TIMELINE_GUIDE;
  if (pathname.startsWith('/nurse/my-schedule')) return NURSE_MY_SCHEDULE_GUIDE;
  if (pathname.startsWith('/nurse/shift-handover')) return SHIFT_HANDOVER_GUIDE;
  if (pathname.startsWith('/nurse/notifications')) return NURSE_NOTIFICATIONS_GUIDE;
  if (pathname.startsWith('/nurse/announcements')) return ANNOUNCEMENTS_GUIDE;
  if (pathname.startsWith('/nurse/nursing-assessment')) return NURSING_ASSESSMENT_GUIDE;
  if (pathname.startsWith('/nurse/medication-administration'))
    return MEDICATION_ADMINISTRATION_GUIDE;
  if (pathname.startsWith('/nurse/nursing-notes')) return NURSING_NOTES_GUIDE;
  if (pathname.startsWith('/nurse/care-plans')) return CARE_PLANS_GUIDE;
  if (pathname.startsWith('/nurse/ward-census')) return WARD_CENSUS_GUIDE;
  if (pathname.startsWith('/nurse/patient-queue')) return PATIENT_QUEUE_GUIDE;
  if (/^\/nurse\/my-patients\/[^/]+/.test(pathname)) return PATIENT_RECORD_GUIDE;
  if (pathname.startsWith('/nurse/my-patients')) return MY_PATIENTS_GUIDE;
  if (pathname.startsWith('/nurse/workforce-management')) return NURSE_WORKFORCE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/pharmacy/workforce')) return PHARMACY_WORKFORCE_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/pharmacy/my-schedule')) return PHARMACY_MY_SCHEDULE_GUIDE;
  if (pathname.startsWith('/pharmacy/shift-handover')) return PHARMACY_SHIFT_HANDOVER_GUIDE;
  if (pathname.startsWith('/nurse/messages')) return COLLABORATION_GUIDE;
  if (pathname.startsWith('/nurse/reports')) return NURSING_REPORTS_GUIDE;
  if (pathname.startsWith('/nurse/admissions')) return ADMISSIONS_GUIDE;
  if (pathname.startsWith('/nurse/discharges')) return DISCHARGES_GUIDE;
  if (pathname.startsWith('/nurse')) return NURSE_DASHBOARD_GUIDE;
  if (pathname.startsWith('/wards')) return BED_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/pharmacy/low-stock-alerts')) return LOW_STOCK_ALERTS_GUIDE;
  if (pathname.startsWith('/pharmacy/procurement-requests')) return PROCUREMENT_REQUESTS_GUIDE;
  if (pathname.startsWith('/pharmacy/suppliers')) return SUPPLIERS_GUIDE;
  if (pathname.startsWith('/pharmacy/adr')) return ADR_GUIDE;
  if (pathname.startsWith('/pharmacy/audit-trail')) return DISPENSING_AUDIT_TRAIL_GUIDE;
  if (pathname.startsWith('/pharmacy/medication-returns')) return MEDICATION_RETURNS_GUIDE;
  if (pathname.startsWith('/pharmacy/queue-monitor')) return PHARMACY_QUEUE_MONITOR_GUIDE;
  if (pathname.startsWith('/pharmacy/reports/prescriptions')) return PRESCRIPTION_REPORT_GUIDE;
  if (pathname.startsWith('/pharmacy/reports/dispensing')) return DISPENSING_REPORT_GUIDE;
  if (pathname.startsWith('/pharmacy/reports/inventory')) return INVENTORY_REPORT_GUIDE;
  if (pathname.startsWith('/pharmacy/reports/stock-movement')) return STOCK_MOVEMENT_REPORT_GUIDE;
  if (pathname.startsWith('/pharmacy/reports/expiry')) return EXPIRY_REPORT_GUIDE;
  if (pathname.startsWith('/pharmacy/reports/procurement')) return PROCUREMENT_REPORT_GUIDE;
  if (pathname.startsWith('/pharmacy/reports/adr')) return ADR_REPORT_GUIDE;
  if (pathname.startsWith('/pharmacy/expiry')) return EXPIRY_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/pharmacy/batch-management')) return BATCH_MANAGEMENT_GUIDE;
  if (pathname.startsWith('/pharmacy/stock-adjustments')) return STOCK_ADJUSTMENTS_GUIDE;
  if (pathname.startsWith('/pharmacy/transfers')) return STOCK_TRANSFERS_GUIDE;
  if (pathname.startsWith('/pharmacy/stock-receiving')) return STOCK_RECEIVING_GUIDE;
  if (pathname.startsWith('/pharmacy/inventory')) return DRUG_INVENTORY_GUIDE;
  if (pathname.startsWith('/pharmacy/controlled-drugs')) return CONTROLLED_DRUGS_GUIDE;
  if (pathname.startsWith('/pharmacy/refill-requests')) return MEDICATION_REFILL_REQUESTS_GUIDE;
  if (pathname.startsWith('/pharmacy/dispensing-history')) return DISPENSING_HISTORY_GUIDE;
  if (pathname.startsWith('/pharmacy/pickup-queue')) return MEDICATION_PICKUP_QUEUE_GUIDE;
  if (pathname.startsWith('/pharmacy/dispense')) return DISPENSE_MEDICATION_GUIDE;
  if (pathname.startsWith('/pharmacy/prescriptions/active')) return ACTIVE_PRESCRIPTIONS_GUIDE;
  if (pathname.startsWith('/pharmacy/prescriptions/details')) return PRESCRIPTION_DETAILS_GUIDE;
  if (pathname.startsWith('/pharmacy/prescriptions/queue')) return PRESCRIPTION_QUEUE_GUIDE;
  if (pathname.startsWith('/pharmacy')) return PHARMACY_DASHBOARD_GUIDE;
  if (pathname.startsWith('/my-schedule')) return MY_SCHEDULE_GUIDE;
  if (pathname.startsWith('/duty-roster/roster')) return DUTY_ROSTER_CALENDAR_GUIDE;
  if (pathname.startsWith('/duty-roster/templates')) return SHIFT_TEMPLATES_GUIDE;
  if (pathname.startsWith('/duty-roster/on-call')) return ON_CALL_GUIDE;
  if (pathname.startsWith('/duty-roster/assignments')) return STAFF_ASSIGNMENTS_GUIDE;
  if (pathname.startsWith('/duty-roster/analytics')) return WORKFORCE_ANALYTICS_GUIDE;
  if (pathname.startsWith('/duty-roster')) return DUTY_ROSTER_GUIDE;
  if (pathname.startsWith('/appointments')) return APPOINTMENTS_GUIDE;
  if (pathname.startsWith('/messages')) return COLLABORATION_GUIDE;
  if (pathname.startsWith('/reports')) return REPORTS_GUIDE;
  if (pathname.startsWith('/notifications')) return NOTIFICATIONS_GUIDE;
  if (pathname.startsWith('/announcements')) return ANNOUNCEMENTS_GUIDE;
  if (pathname.startsWith('/profile')) return PROFILE_GUIDE;
  if (pathname.startsWith('/settings/audit-log')) return AUDIT_LOG_GUIDE;
  if (pathname.startsWith('/settings')) return SETTINGS_GUIDE;
  if (pathname.startsWith('/admin/staff-accounts')) return ADMIN_STAFF_MANAGEMENT_GUIDE;
  return GENERAL_GUIDE;
}
