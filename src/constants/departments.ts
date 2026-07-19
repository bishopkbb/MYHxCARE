/**
 * Canonical list of every clinical/operational department at the centre.
 * Single source of truth for every "Department" filter, dropdown, and
 * generator across Registration and Medical Records -- update here, not
 * per-feature, so every screen shows the same complete roster.
 */

export const HOSPITAL_DEPARTMENTS = [
  'General Outpatient Clinic',
  'Family Medicine',
  'Internal Medicine',
  'Emergency Department',
  'Surgery',
  'Orthopedics',
  'Cardiology',
  'Neurology',
  'Nephrology',
  'Gastroenterology',
  'Pulmonology',
  'Endocrinology',
  'Oncology',
  'Hematology',
  'Pediatrics',
  'Obstetrics & Gynaecology',
  'Dermatology',
  'Psychiatry',
  'Ophthalmology',
  'ENT Clinic',
  'Dental Clinic',
  'Urology',
  'Radiology',
  'Laboratory',
  'Pharmacy',
  'Physiotherapy',
  'Anaesthesia',
  'Intensive Care Unit (ICU)',
] as const;

export type HospitalDepartment = (typeof HOSPITAL_DEPARTMENTS)[number];

export const HOSPITAL_DEPARTMENT_OPTIONS: { value: string; label: string }[] =
  HOSPITAL_DEPARTMENTS.map((d) => ({ value: d, label: d }));
