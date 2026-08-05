import { z } from 'zod';

import type { AllergySeverity, BloodGroup } from '@/types/patient.types';
import type { SelectOption } from '@/features/registration/__mocks__/registerPatientOptions';
import { optionalPhoneNumberField } from '@/features/registration/schemas/registerPatientSchema';

// ─── Reference data ─────────────────────────────────────────────────────────

export const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'] as const;
export type Genotype = (typeof GENOTYPES)[number];

export const GENOTYPE_OPTIONS: { value: Genotype; label: string }[] = GENOTYPES.map((g) => ({
  value: g,
  label: g,
}));

export const BLOOD_GROUP_OPTIONS: { value: BloodGroup; label: string }[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
].map((g) => ({ value: g as BloodGroup, label: g }));

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
    // Next of Kin — the patient's one legal/administrative contact, per
    // UNIZIK Medical Records' registration spec (Name, Phone, Relationship).
    // Alternate phone and address are optional extras, not part of that
    // spec, kept because the registration desk already captured them.
    nokName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
    nokRelationship: z.string().min(1, 'Relationship is required'),
    nokPhoneCountryCode: z.string().min(1),
    nokPhoneNumber: phoneNumberField,
    nokAltPhoneCountryCode: z.string().min(1),
    nokAltPhoneNumber: optionalPhoneNumberField,
    nokAddress: z.string().trim().optional(),

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

    // Clinical Profile — optional at registration for every patient class
    // (UNIZIK's own spec: "these could be optional so they can be updated
    // when the information is available"), captured here rather than Step 1
    // since they're clinical, not identifying, information.
    height: z.string().trim().optional(),
    weight: z.string().trim().optional(),
    bloodGroup: z.string().optional(),
    genotype: z.string().optional(),

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
  nokAltPhoneCountryCode: '+234',
  nokAltPhoneNumber: '',
  nokAddress: '',
  hasNoKnownAllergies: false,
  allergies: [],
  chronicConditions: [],
  otherChronicCondition: '',
  currentMedications: '',
  pastSurgeries: '',
  height: '',
  weight: '',
  bloodGroup: '',
  genotype: '',
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
