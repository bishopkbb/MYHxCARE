/**
 * Mock fixture for the My Profile screen.
 * Swap out by pointing hooks to the real /users/me endpoint in Phase 6.
 *
 * Reuses the "Dr. Jane Ezeonu" identity already established as the
 * PRESCRIBING_DOCTOR in the prescriptions module, so the mock narrative
 * stays consistent across screens rather than introducing an unrelated name.
 */

export type DoctorProfile = {
  initials: string;
  avatarBg: string;
  name: string;
  role: string;
  platform: string;
  licenseNo: string;
  facility: string;
  specialization: string;
  medicalCouncilNo: string;
  department: string;
  experience: string;
  phone: string;
  email: string;
};

export const MOCK_DOCTOR_PROFILE: DoctorProfile = {
  initials: 'JE',
  avatarBg: '#00B4D8',
  name: 'Dr. Jane Ezeonu',
  role: 'General Practitioner',
  platform: 'MyHxCare HMS',
  licenseNo: 'MD/2018/0042',
  facility: 'UniZik Medical Centre',
  specialization: 'General Practice & Family Medicine',
  medicalCouncilNo: 'MDCN/2020/0891',
  department: 'General Outpatient Department',
  experience: '6 years clinical practice',
  phone: '+234 803 000 1111',
  email: 'j.ezeonu@unizikmedical.ng',
};
