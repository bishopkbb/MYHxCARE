/**
 * The hospital's 8 organizational/staff department groupings: Clinical,
 * Nursing, Pharmacy, Laboratory, Emergency, Accounts & Billing, Records,
 * Administration. Single source of truth for Staff Management and, going
 * forward, Departments / Department Monitoring once those are built for
 * real. A different concept from `HOSPITAL_DEPARTMENTS` in `departments.ts`
 * (28 clinical specialty/outpatient clinics used by Registration to route
 * patients): this is who staff report to, not where a patient is seen.
 */

export type OrganizationalDepartment =
  | 'Clinical / Consultation'
  | 'Nursing / Wards'
  | 'Pharmacy'
  | 'Laboratory'
  | 'Emergency'
  | 'Accounts & Billing'
  | 'Records'
  | 'Administration';

export const ORGANIZATIONAL_DEPARTMENTS: OrganizationalDepartment[] = [
  'Clinical / Consultation',
  'Nursing / Wards',
  'Pharmacy',
  'Laboratory',
  'Emergency',
  'Accounts & Billing',
  'Records',
  'Administration',
];

export const ORG_DEPARTMENT_OPTIONS: { value: OrganizationalDepartment; label: string }[] =
  ORGANIZATIONAL_DEPARTMENTS.map((d) => ({ value: d, label: d }));

/** The head-of-department role title shown alongside each org unit in the
 * mockup's own Departments screen, kept here so Staff Management's own
 * generated rows can plausibly draw from the same job-title vocabulary. */
export const ORG_DEPARTMENT_HEAD_ROLE: Record<OrganizationalDepartment, string> = {
  'Clinical / Consultation': 'Consultant Physician',
  'Nursing / Wards': 'Chief Nursing Officer',
  Pharmacy: 'Chief Pharmacist',
  Laboratory: 'Lab Manager',
  Emergency: 'Emergency Lead',
  'Accounts & Billing': 'Accounts Manager',
  Records: 'Records Officer',
  Administration: 'Admin Manager',
};
