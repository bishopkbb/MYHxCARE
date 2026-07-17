import { z } from 'zod';

import type { AllergySeverity } from '@/types/patient.types';
import type { SelectOption } from '@/features/registration/__mocks__/registerPatientOptions';

// ─── Reference data ─────────────────────────────────────────────────────────

export const ALLERGY_SEVERITY_OPTIONS: { value: AllergySeverity; label: string }[] = [
  { value: 'MILD', label: 'Mild' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'SEVERE', label: 'Severe' },
  { value: 'LIFE_THREATENING', label: 'Life-Threatening' },
];

export const CHRONIC_CONDITION_OPTIONS: SelectOption[] = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'hypertension', label: 'Hypertension' },
  { value: 'asthma', label: 'Asthma' },
  { value: 'heart-disease', label: 'Heart Disease' },
  { value: 'epilepsy', label: 'Epilepsy' },
  { value: 'sickle-cell', label: 'Sickle Cell Disease' },
  { value: 'tuberculosis', label: 'Tuberculosis' },
  { value: 'other', label: 'Other' },
];

export const DISABILITY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'visual', label: 'Visual' },
  { value: 'hearing', label: 'Hearing' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'cognitive', label: 'Cognitive' },
  { value: 'other', label: 'Other' },
];

export const PREFERRED_LANGUAGE_OPTIONS: SelectOption[] = [
  { value: 'english', label: 'English' },
  { value: 'igbo', label: 'Igbo' },
  { value: 'yoruba', label: 'Yoruba' },
  { value: 'hausa', label: 'Hausa' },
  { value: 'pidgin', label: 'Nigerian Pidgin' },
  { value: 'other', label: 'Other' },
];

export const REFERRAL_SOURCE_OPTIONS: SelectOption[] = [
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'referred-doctor', label: 'Referred by a Doctor' },
  { value: 'referred-hospital', label: 'Referred by Another Hospital' },
  { value: 'online', label: 'Online / Website' },
  { value: 'staff-student', label: 'Staff/Student Registration' },
  { value: 'word-of-mouth', label: 'Word of Mouth' },
  { value: 'other', label: 'Other' },
];

// ─── Schema ─────────────────────────────────────────────────────────────────

const allergyEntrySchema = z.object({
  substance: z.string().trim().min(1, 'Substance is required'),
  reaction: z.string().trim().min(1, 'Reaction is required'),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
});

export type AllergyEntry = z.infer<typeof allergyEntrySchema>;

const phoneNumberField = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\d{7,11}$/, 'Enter a valid phone number (7–11 digits, no spaces)');

export const additionalDetailsSchema = z
  .object({
    // Next of Kin — distinct from the Emergency Contact captured in Step 1;
    // NOK is the legal/administrative contact, Emergency Contact is who to
    // call in a crisis. The same person often fills both roles, but they're
    // recorded separately since they don't always match.
    nokName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    nokRelationship: z.string().min(1, 'Relationship is required'),
    nokPhoneCountryCode: z.string().min(1),
    nokPhoneNumber: phoneNumberField,

    // Known Allergies
    hasNoKnownAllergies: z.boolean(),
    allergies: z.array(allergyEntrySchema),

    // Medical History (brief intake screening — full history is captured
    // clinically, not at the registration desk)
    chronicConditions: z.array(z.string()),
    otherChronicCondition: z.string().trim().optional(),
    currentMedications: z.string().trim().optional(),
    pastSurgeries: z.string().trim().optional(),

    // Disability / Accessibility
    hasDisability: z.enum(['yes', 'no']),
    disabilityTypes: z.array(z.string()),
    disabilityNotes: z.string().trim().optional(),

    // Communication
    preferredLanguage: z.string().min(1, 'Preferred language is required'),

    // Referral
    referralSource: z.string().min(1, 'Referral source is required'),
    referralDetails: z.string().trim().optional(),

    // Consent & Declarations
    consentTreatment: z.boolean(),
    consentDataProcessing: z.boolean(),
    consentShareWithNok: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.hasNoKnownAllergies && values.allergies.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['allergies'],
        message: 'Add at least one allergy, or check "No known allergies"',
      });
    }
    if (values.hasDisability === 'yes' && values.disabilityTypes.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['disabilityTypes'],
        message: 'Select at least one accessibility need',
      });
    }
    if (values.chronicConditions.includes('other') && !values.otherChronicCondition) {
      ctx.addIssue({
        code: 'custom',
        path: ['otherChronicCondition'],
        message: 'Describe the other condition',
      });
    }
    if (!values.consentTreatment) {
      ctx.addIssue({
        code: 'custom',
        path: ['consentTreatment'],
        message: 'Consent to treatment is required to proceed',
      });
    }
    if (!values.consentDataProcessing) {
      ctx.addIssue({
        code: 'custom',
        path: ['consentDataProcessing'],
        message: 'Consent to data processing (NDPR) is required to proceed',
      });
    }
  });

export type AdditionalDetailsValues = z.infer<typeof additionalDetailsSchema>;

export const ADDITIONAL_DETAILS_DEFAULTS: AdditionalDetailsValues = {
  nokName: '',
  nokRelationship: '',
  nokPhoneCountryCode: '+234',
  nokPhoneNumber: '',
  hasNoKnownAllergies: false,
  allergies: [],
  chronicConditions: [],
  otherChronicCondition: '',
  currentMedications: '',
  pastSurgeries: '',
  hasDisability: 'no',
  disabilityTypes: [],
  disabilityNotes: '',
  preferredLanguage: '',
  referralSource: '',
  referralDetails: '',
  consentTreatment: false,
  consentDataProcessing: false,
  consentShareWithNok: false,
};
