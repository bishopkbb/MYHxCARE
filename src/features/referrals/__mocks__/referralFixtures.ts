/**
 * Mock fixtures for patient referrals.
 * Replace with real API data in Phase 6 integration.
 */

import type { Allergy } from '@/types/patient.types';

export type ReferralPatient = {
  initials: string;
  avatarBg: string;
  name: string;
  mrn: string;
  age: string;
  gender: string;
  bloodGroup: string;
  allergies: Allergy[];
  isUrgent: boolean;
};

export const MOCK_REFERRAL_PATIENT: ReferralPatient = {
  initials: 'AO',
  avatarBg: '#EF4444',
  name: 'Adaeze Okonkwo',
  mrn: 'MRN-2024-00451',
  age: '21y',
  gender: 'Female',
  bloodGroup: 'O+',
  allergies: [
    {
      id: 'allergy-1',
      substance: 'Penicillin',
      reaction: 'Anaphylaxis',
      severity: 'LIFE_THREATENING',
      recordedAt: '2024-03-12T09:00:00Z',
      recordedBy: 'Dr. Chukwuemeka',
    },
    {
      id: 'allergy-2',
      substance: 'Sulfonamides',
      reaction: 'Skin rash, urticaria',
      severity: 'MODERATE',
      recordedAt: '2024-06-20T11:30:00Z',
      recordedBy: 'Dr. Okafor',
    },
  ],
  isUrgent: true,
};
