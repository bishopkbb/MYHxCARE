// Core patient entity types — referenced across admission, clinical,
// billing, pharmacy, lab, and ward screens.

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';

export type InsuranceScheme = 'NHIA' | 'PRIVATE' | 'SELF_PAY' | 'CORPORATE';

export type InsuranceConfidence = 'VERIFIED' | 'PENDING' | 'STALE';

// ─── Sub-entities ──────────────────────────────────────────────────────────

export type Allergy = {
  id: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  recordedAt: string; // ISO 8601
  recordedBy: string; // staff display name
};

export type Insurance = {
  scheme: InsuranceScheme;
  memberNumber?: string;
  confidence: InsuranceConfidence;
  lastCheckedAt?: string; // ISO 8601 — stale after 24 h per clinical standards
};

export type NextOfKin = {
  name: string;
  relationship: string;
  phone: string;
};

export type PatientDependent = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO 8601
  gender: Gender;
  relationship: string;
};

// ─── Patient shapes ────────────────────────────────────────────────────────

/**
 * Lightweight shape returned in list views, search results, and context
 * headers. Does NOT include allergies, full address, or next of kin.
 */
export type PatientSummary = {
  id: string;
  fileNumber: string; // UniZik hospital file number
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string; // ISO 8601 — display via formatDate()
  gender: Gender;
  phoneNumber: string;
  insurance?: Insurance;
};

/**
 * Full patient record returned by GET /api/v1/patients/{id}.
 * Always show allergies — AllergyBanner must be rendered on every
 * clinical screen when allergies.length > 0.
 */
export type Patient = PatientSummary & {
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;
  nextOfKin?: NextOfKin;
  allergies: Allergy[];
  registeredAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};

// ─── Derived helpers ───────────────────────────────────────────────────────

export function patientDisplayName(p: PatientSummary): string {
  return [p.lastName, p.firstName, p.middleName].filter(Boolean).join(', ');
}

export function patientAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function hasCriticalAllergies(allergies: Allergy[]): boolean {
  return allergies.some((a) => a.severity === 'LIFE_THREATENING');
}
