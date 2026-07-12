/**
 * Mock fixtures for patient referrals.
 * Replace with real API data in Phase 6 integration.
 */

export type ReferralPatient = {
  initials: string;
  avatarBg: string;
  name: string;
  mrn: string;
  age: string;
  gender: string;
  bloodGroup: string;
  allergies: string[];
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
  allergies: ['Penicillin', 'Sulfonamides'],
  isUrgent: true,
};
