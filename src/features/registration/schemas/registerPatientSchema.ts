import { z } from 'zod';

const phoneNumberField = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\d{7,11}$/, 'Enter a valid phone number (7–11 digits, no spaces)');

const optionalPhoneNumberField = z
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

export const patientInformationSchema = z
  .object({
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
    phoneCountryCode: z.string().min(1),
    phoneNumber: phoneNumberField,
    email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
    address: z.string().trim().min(5, 'Enter a complete residential address'),
    state: z.string().min(1, 'State is required'),
    lga: z.string().min(1, 'LGA is required'),
    cityTown: z.string().trim().min(1, 'City/Town is required'),

    // Emergency Contact
    emergencyFullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    emergencyRelationship: z.string().min(1, 'Relationship is required'),
    emergencyPhoneCountryCode: z.string().min(1),
    emergencyPhoneNumber: phoneNumberField,
    emergencyAltPhoneCountryCode: z.string().min(1),
    emergencyAltPhoneNumber: optionalPhoneNumberField,
    emergencyAddress: z.string().trim().optional(),

    // Insurance Details (optional block — validated together below)
    insuranceProvider: z.string().optional(),
    policyMemberId: z.string().trim().optional(),
    groupNumber: z.string().trim().optional(),
    planType: z.string().optional(),
    policyHolderName: z.string().trim().optional(),
    insuranceValidFrom: z.string().optional().or(z.literal('')),
    insuranceValidTo: z.string().optional().or(z.literal('')),

    // Patient Category
    categoryType: z.string().min(1, 'Category type is required'),
    categoryDescription: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.insuranceProvider && !values.policyMemberId) {
      ctx.addIssue({
        code: 'custom',
        path: ['policyMemberId'],
        message: 'Policy/Member ID is required once an insurance provider is selected',
      });
    }
    if (values.insuranceValidFrom && values.insuranceValidTo) {
      const from = new Date(values.insuranceValidFrom).getTime();
      const to = new Date(values.insuranceValidTo).getTime();
      if (to < from) {
        ctx.addIssue({
          code: 'custom',
          path: ['insuranceValidTo'],
          message: 'Valid To date cannot be before Valid From date',
        });
      }
    }
  });

export type PatientInformationValues = z.infer<typeof patientInformationSchema>;

export const PATIENT_INFORMATION_DEFAULTS: PatientInformationValues = {
  firstName: '',
  middleName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  maritalStatus: '',
  nationality: '',
  occupation: '',
  phoneCountryCode: '+234',
  phoneNumber: '',
  email: '',
  address: '',
  state: '',
  lga: '',
  cityTown: '',
  emergencyFullName: '',
  emergencyRelationship: '',
  emergencyPhoneCountryCode: '+234',
  emergencyPhoneNumber: '',
  emergencyAltPhoneCountryCode: '+234',
  emergencyAltPhoneNumber: '',
  emergencyAddress: '',
  insuranceProvider: '',
  policyMemberId: '',
  groupNumber: '',
  planType: '',
  policyHolderName: '',
  insuranceValidFrom: '',
  insuranceValidTo: '',
  categoryType: '',
  categoryDescription: '',
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
