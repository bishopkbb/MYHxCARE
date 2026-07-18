/**
 * Mock fixtures for the Insurance Verification screen.
 * Swap out by pointing hooks to a real insurer eligibility endpoint in
 * Phase 6.
 */

import { CheckCircle2, FileEdit, ShieldCheck, UserCheck, type LucideIcon } from 'lucide-react';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type InsuranceStatus = 'Active' | 'Inactive' | 'Expired';
export type EligibilityStatus = 'Eligible' | 'Not Eligible' | 'Pending' | 'Not Verified';
export type AuthorizationStatus = 'Authorized' | 'Pending' | 'Denied' | 'Not Required';
export type VerificationMethod = 'realtime' | 'manual';
export type RelationshipToPatient = 'Self' | 'Spouse' | 'Child' | 'Parent' | 'Other';

export const INSURANCE_PROVIDER_OPTIONS = [
  'AXA Mansard Health',
  'NHIS',
  'Hygeia HMO',
  'Reliance HMO',
  'Leadway Assurance',
  'AIICO Insurance',
  'UNIZIK Staff Health Scheme',
].map((p) => ({ value: p, label: p }));

export const PLAN_OPTIONS = ['Standard Plan', 'Premium Plan', 'Basic Plan', 'Family Plan'].map(
  (p) => ({ value: p, label: p }),
);

export const RELATIONSHIP_OPTIONS: { value: RelationshipToPatient; label: string }[] = [
  { value: 'Self', label: 'Self' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Child', label: 'Child' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Other', label: 'Other' },
];

export const AUTHORIZATION_STATUS_OPTIONS: { value: AuthorizationStatus; label: string }[] = [
  { value: 'Authorized', label: 'Authorized' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Denied', label: 'Denied' },
  { value: 'Not Required', label: 'Not Required' },
];

export type CoverageRow = {
  category: string;
  coveragePercent: number;
  copay: number;
  coinsurancePercent: number;
  limit: string;
  covered: boolean;
};

export type ActivityEntry = {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  label: string;
  dateTime: string;
  actor: string;
};

export type InsuranceRecord = {
  status: InsuranceStatus;
  provider: string;
  policyNumber: string;
  plan: string;
  policyHolderName: string;
  relationshipToPatient: RelationshipToPatient;
  groupNumber: string;
  policyStartDate: string;
  policyEndDate: string;
  copayAmount: number;
  isVip: boolean;
  verificationMethod: VerificationMethod;
  eligibilityStatus: EligibilityStatus;
  coverageActive: boolean;
  benefitType: string;
  authorizationRequired: boolean;
  coverageLimit: number;
  usedAmount: number;
  verificationReference: string;
  verifiedOn: string;
  verifiedBy: string;
  authorizationStatus: AuthorizationStatus;
  authorizationNumber: string;
  authorizedOn: string;
  authorizedBy: string;
  nextReviewDate: string;
  remarks: string;
  coverageDetails: CoverageRow[];
  activity: ActivityEntry[];
};

const CURATED_COVERAGE: CoverageRow[] = [
  {
    category: 'Consultation',
    coveragePercent: 100,
    copay: 2000,
    coinsurancePercent: 0,
    limit: '₦500,000.00 / Visit',
    covered: true,
  },
  {
    category: 'Laboratory Tests',
    coveragePercent: 90,
    copay: 1000,
    coinsurancePercent: 10,
    limit: '₦200,000.00 / Year',
    covered: true,
  },
  {
    category: 'Imaging (X-Ray, Ultrasound)',
    coveragePercent: 80,
    copay: 2000,
    coinsurancePercent: 20,
    limit: '₦300,000.00 / Year',
    covered: true,
  },
  {
    category: 'Prescription Drugs',
    coveragePercent: 80,
    copay: 1500,
    coinsurancePercent: 20,
    limit: '₦150,000.00 / Year',
    covered: true,
  },
  {
    category: 'Surgery',
    coveragePercent: 70,
    copay: 10000,
    coinsurancePercent: 30,
    limit: '₦1,000,000.00 / Year',
    covered: true,
  },
  {
    category: 'Emergency Services',
    coveragePercent: 100,
    copay: 0,
    coinsurancePercent: 0,
    limit: '₦500,000.00 / Visit',
    covered: true,
  },
];

export const CURATED_INSURANCE_RECORD: InsuranceRecord = {
  status: 'Active',
  provider: 'AXA Mansard Health',
  policyNumber: 'AXA-5896-7788-0012',
  plan: 'Standard Plan',
  policyHolderName: 'Adaeze Chidinma Okonkwo',
  relationshipToPatient: 'Self',
  groupNumber: 'UNIZIK-STAFF-2026',
  policyStartDate: '2026-01-01',
  policyEndDate: '2026-12-31',
  copayAmount: 2000,
  isVip: false,
  verificationMethod: 'realtime',
  eligibilityStatus: 'Eligible',
  coverageActive: true,
  benefitType: 'Outpatient',
  authorizationRequired: false,
  coverageLimit: 1000000,
  usedAmount: 125000,
  verificationReference: 'AXA-2026-0630-1045',
  verifiedOn: atOffset(0, 10, 45),
  verifiedBy: 'Adaobi Nwankwo',
  authorizationStatus: 'Authorized',
  authorizationNumber: 'AUTH-2026-0630-8891',
  authorizedOn: atOffset(0, 10, 45),
  authorizedBy: 'Adaobi Nwankwo',
  nextReviewDate: '2026-12-31',
  remarks: 'Coverage confirmed for outpatient services.',
  coverageDetails: CURATED_COVERAGE,
  activity: [
    {
      id: 'ivt-1',
      icon: CheckCircle2,
      iconColor: '#22C55E',
      iconBg: 'rgba(34,197,94,0.12)',
      label: 'Eligibility verified successfully',
      dateTime: atOffset(0, 10, 45),
      actor: 'Adaobi Nwankwo',
    },
    {
      id: 'ivt-2',
      icon: ShieldCheck,
      iconColor: '#22C55E',
      iconBg: 'rgba(34,197,94,0.12)',
      label: 'Authorization approved',
      dateTime: atOffset(0, 10, 45),
      actor: 'Adaobi Nwankwo',
    },
    {
      id: 'ivt-3',
      icon: FileEdit,
      iconColor: '#3B82F6',
      iconBg: 'rgba(59,130,246,0.12)',
      label: 'Insurance information updated',
      dateTime: atOffset(0, 10, 40),
      actor: 'Adaobi Nwankwo',
    },
    {
      id: 'ivt-4',
      icon: UserCheck,
      iconColor: '#8B5CF6',
      iconBg: 'rgba(139,92,246,0.12)',
      label: 'Patient record accessed',
      dateTime: atOffset(0, 10, 38),
      actor: 'Adaobi Nwankwo',
    },
  ],
};

const GENERIC_PROVIDERS = [
  'NHIS',
  'Hygeia HMO',
  'Reliance HMO',
  'Leadway Assurance',
  'AIICO Insurance',
];
const GENERIC_PLANS = ['Standard Plan', 'Basic Plan', 'Premium Plan'];
const GENERIC_BENEFIT_TYPES = ['Outpatient', 'Inpatient', 'Outpatient & Inpatient'];

function seedFromId(id: string): number {
  const digits = id.replace(/\D/g, '');
  return parseInt(digits, 10) || 1;
}

/** Every patient other than the curated persona gets a stable, plausible
 * insurance record derived from their id — same patient always produces the
 * same result, no randomness between renders. */
export function generateInsuranceRecordForPatient(patient: {
  id: string;
  name: string;
}): InsuranceRecord {
  const seed = seedFromId(patient.id);
  const provider = GENERIC_PROVIDERS[seed % GENERIC_PROVIDERS.length] as string;
  const plan = GENERIC_PLANS[seed % GENERIC_PLANS.length] as string;
  const eligible = seed % 5 !== 0;
  const authRequired = seed % 3 === 0;
  const coverageLimit = 300000 + (seed % 8) * 100000;
  const usedAmount = Math.round(coverageLimit * ((seed % 40) / 100));
  const copay = 500 + (seed % 6) * 250;

  return {
    status: 'Active',
    provider,
    policyNumber: `${provider.slice(0, 3).toUpperCase()}-${1000 + seed}-${String(seed).padStart(4, '0')}`,
    plan,
    policyHolderName: patient.name,
    relationshipToPatient: 'Self',
    groupNumber: `UNIZIK-STU-${2020 + (seed % 6)}`,
    policyStartDate: '2026-01-01',
    policyEndDate: '2026-12-31',
    copayAmount: copay,
    isVip: false,
    verificationMethod: 'realtime',
    eligibilityStatus: eligible ? 'Eligible' : 'Not Verified',
    coverageActive: eligible,
    benefitType: GENERIC_BENEFIT_TYPES[seed % GENERIC_BENEFIT_TYPES.length] as string,
    authorizationRequired: authRequired,
    coverageLimit,
    usedAmount,
    verificationReference: eligible
      ? `${provider.slice(0, 3).toUpperCase()}-2026-${String(1000 + seed)}`
      : '',
    verifiedOn: eligible ? atOffset(-(seed % 20), 9 + (seed % 6), (seed * 7) % 60) : '',
    verifiedBy: 'Adaobi Nwankwo',
    authorizationStatus: !authRequired ? 'Not Required' : eligible ? 'Authorized' : 'Pending',
    authorizationNumber: authRequired && eligible ? `AUTH-2026-${String(2000 + seed)}` : '',
    authorizedOn:
      authRequired && eligible ? atOffset(-(seed % 20), 9 + (seed % 6), (seed * 3) % 60) : '',
    authorizedBy: authRequired && eligible ? 'Adaobi Nwankwo' : '',
    nextReviewDate: '2026-12-31',
    remarks: '',
    coverageDetails: CURATED_COVERAGE.map((c, i) => ({
      ...c,
      coveragePercent: Math.max(50, c.coveragePercent - ((seed + i * 5) % 20)),
    })),
    activity: [
      {
        id: 'gen-1',
        icon: eligible ? CheckCircle2 : ShieldCheck,
        iconColor: eligible ? '#22C55E' : '#F59E0B',
        iconBg: eligible ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
        label: eligible ? 'Eligibility verified successfully' : 'Verification pending',
        dateTime: atOffset(-(seed % 20), 9, 0),
        actor: 'Adaobi Nwankwo',
      },
    ],
  };
}
