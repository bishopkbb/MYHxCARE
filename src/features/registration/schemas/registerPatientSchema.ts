import { z } from 'zod';

const phoneNumberField = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\d{7,11}$/, 'Enter a valid phone number (7–11 digits, no spaces)');

/** Shared with `additionalDetailsSchema.ts` for the Next of Kin's optional alternate phone. */
export const optionalPhoneNumberField = z
  .string()
  .regex(/^\d{7,11}$/, 'Enter a valid phone number (7–11 digits, no spaces)')
  .optional()
  .or(z.literal(''));

function isNotFutureDate(dateStr: string): boolean {
  return new Date(dateStr).getTime() <= Date.now();
}

function isWithinHumanLifespan(dateStr: string): boolean {
  const years = (Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return years <= 150;
}

export const PATIENT_TYPES = ['STUDENT', 'STAFF_NHIA', 'OUTPATIENT'] as const;
export type PatientType = (typeof PATIENT_TYPES)[number];

export const patientInformationSchema = z
  .object({
    // Patient Type — the very first field of the wizard; drives which of the
    // fields below are actually required. See UNIZIK Medical Records' own
    // 3-class registration spec (Student/TISHIP, Staff/NHIA, Outpatient).
    // Plain string (like gender/nationality below), not z.enum, so it can
    // default to '' and force an explicit choice — PATIENT_TYPES/PatientType
    // above are for typed comparisons elsewhere, not the runtime shape here.
    patientType: z.string().min(1, 'Patient type is required'),

    // Basic Information
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
    middleName: z.string().trim().optional(),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
    gender: z.string().min(1, 'Gender is required'),
    dateOfBirth: z
      .string()
      .min(1, 'Date of birth is required')
      .refine(isNotFutureDate, 'Date of birth cannot be in the future')
      .refine(isWithinHumanLifespan, 'Enter a valid date of birth'),
    maritalStatus: z.string().optional(),
    nationality: z.string().min(1, 'Nationality is required'),
    occupation: z.string().trim().optional(),
    // UNIZIK physical-folder fields (Phase 2/3) — neither UNIZIK's 3-class
    // spec nor the folder review marks these as mandatory, so kept optional
    // like Occupation above.
    ethnicGroup: z.string().trim().optional(),
    religion: z.string().optional(),
    // National Identification Number — general identity field for every
    // patient type (not tied to Student/NHIA), mandatory per product
    // decision. Exactly 11 digits, no letters/hyphens/spaces; the regex
    // itself is what prevents silent truncation of a too-long value (a
    // 12-digit string simply fails the /^\d{11}$/ match rather than being
    // cut down to fit).
    nin: z
      .string()
      .trim()
      .min(1, 'National Identification Number (NIN) is required')
      .regex(/^\d{11}$/, 'NIN must be exactly 11 digits'),
    phoneCountryCode: z.string().min(1),
    phoneNumber: phoneNumberField,
    email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
    address: z.string().trim().min(5, 'Enter a complete residential address'),
    // Labelled "State of Origin" in the UI (PatientInformationStep.tsx /
    // ReviewConfirmStep.tsx) per UNIZIK's updated spec — the paper folder's
    // "Place of Origin" and UNIZIK's "State of Origin" are treated as the
    // same concept, not two fields. Field name/validation unchanged; this is
    // a display-label decision only, confirmed 2026-08-20.
    state: z.string().min(1, 'State of Origin is required'),
    lga: z.string().min(1, 'LGA is required'),
    cityTown: z.string().trim().min(1, 'City/Town is required'),

    // Student (TISHIP) — required only when patientType is STUDENT.
    // Alphanumeric on purpose: real UNIZIK reg numbers carry slashes/hyphens.
    studentRegistrationNumber: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9/-]+$/, 'Use letters, numbers, "/" or "-" only')
      .optional()
      .or(z.literal('')),
    facultyId: z.string().optional(),
    departmentId: z.string().optional(),
    // Never chosen by the user — display-only, populated from `facultyId` via
    // FACULTY_HMO_MAP (mocks "the backend determines the HMO").
    assignedHMO: z.string().optional(),

    // Staff (NHIA) — required only when patientType is STAFF_NHIA. Plain
    // string, not a number: real values look like "7082342-1".
    nhiaRegistrationNumber: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers, or "-" only')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (values.patientType === 'STUDENT') {
      if (!values.studentRegistrationNumber) {
        ctx.addIssue({
          code: 'custom',
          path: ['studentRegistrationNumber'],
          message: 'Student Registration Number is required',
        });
      }
      if (!values.facultyId) {
        ctx.addIssue({ code: 'custom', path: ['facultyId'], message: 'Faculty is required' });
      }
      if (!values.departmentId) {
        ctx.addIssue({
          code: 'custom',
          path: ['departmentId'],
          message: 'Department is required',
        });
      }
    }
    if (values.patientType === 'STAFF_NHIA' && !values.nhiaRegistrationNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['nhiaRegistrationNumber'],
        message: 'NHIA Registration Number is required',
      });
    }
  });

export type PatientInformationValues = z.infer<typeof patientInformationSchema>;

export const PATIENT_INFORMATION_DEFAULTS: PatientInformationValues = {
  patientType: '',
  firstName: '',
  middleName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  maritalStatus: '',
  nationality: '',
  occupation: '',
  ethnicGroup: '',
  religion: '',
  nin: '',
  phoneCountryCode: '+234',
  phoneNumber: '',
  email: '',
  address: '',
  state: '',
  lga: '',
  cityTown: '',
  studentRegistrationNumber: '',
  facultyId: '',
  departmentId: '',
  assignedHMO: '',
  nhiaRegistrationNumber: '',
};

/** Computes a patient's age in whole years from a WAT "today" reference. */
export function computeAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const todayWAT = new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date()),
  );
  let age = todayWAT.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    todayWAT.getMonth() > dob.getMonth() ||
    (todayWAT.getMonth() === dob.getMonth() && todayWAT.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age < 0 ? null : age;
}
