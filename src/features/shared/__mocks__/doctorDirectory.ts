/**
 * The one doctor roster every feature should import — not invent its own.
 * Two entries (`usr_001`, `usr_005`) share an id with a real login account in
 * `features/auth/__mocks__/authFixtures.ts` (`MOCK_USERS`), so `doctorId ===
 * useAuth().user.id` resolves directly with no separate mapping layer: log in
 * as Dr. Adaeze Okonkwo or Dr. Chukwuemeka Nwosu and "my queue" filters work
 * out of the box. The rest (`doc-*`) are specialty-clinic doctors referenced
 * by Registration's Queue Management and Appointment Scheduling that don't
 * have a login account yet.
 * Swap out by pointing hooks to a real staff-directory endpoint in Phase 6.
 */

export type Doctor = {
  id: string;
  name: string;
  department: string;
  initials: string;
};

export const DOCTORS: Doctor[] = [
  { id: 'usr_001', name: 'Dr. Adaeze Okonkwo', department: 'Internal Medicine', initials: 'AO' },
  {
    id: 'usr_005',
    name: 'Dr. Chukwuemeka Nwosu',
    department: 'Accident & Emergency',
    initials: 'CN',
  },
  {
    id: 'doc-jane',
    name: 'Dr. Jane Ezeonu (GP)',
    department: 'General Outpatient Clinic',
    initials: 'JE',
  },
  { id: 'doc-michael', name: 'Dr. Michael Obi', department: 'Paediatrics', initials: 'MO' },
  { id: 'doc-chinedu', name: 'Dr. Chinedu Anya', department: 'Surgery', initials: 'CA' },
  { id: 'doc-ifeanyi', name: 'Dr. Ifeanyi Okafor', department: 'Dental Clinic', initials: 'IO' },
  { id: 'doc-ngozi', name: 'Dr. Ngozi A. Umeh', department: 'Physiotherapy', initials: 'NU' },
  { id: 'doc-chika', name: 'Dr. Chika Nnamdi', department: 'Radiology', initials: 'CK' },
  // On-call roster doctors (`workforce/__mocks__/workforceFixtures.ts`'s
  // TODAY_ON_CALL) — added here so a walk-in routed to "whoever's on duty"
  // resolves to a real roster entry, not just a free-text name. None have a
  // login account yet (unlike usr_001/usr_005 above).
  {
    id: 'oncall-samuel',
    name: 'Dr. Samuel Ade',
    department: 'Emergency Medicine',
    initials: 'SA',
  },
  { id: 'oncall-femi', name: 'Dr. Femi Balogun', department: 'Surgery', initials: 'FB' },
  {
    id: 'oncall-blessing',
    name: 'Dr. Blessing Obi',
    department: 'Obs & Gynaecology',
    initials: 'BO',
  },
  { id: 'oncall-ibrahim', name: 'Dr. Ibrahim Musa', department: 'Anaesthesia', initials: 'IM' },
  {
    id: 'oncall-ngoziadeyemi',
    name: 'Dr. Ngozi Adeyemi',
    department: 'Paediatrics',
    initials: 'NA',
  },
];

export function getDoctorById(id: string): Doctor | undefined {
  return DOCTORS.find((d) => d.id === id);
}

/** Transitional helper for matching legacy free-text doctor-name strings during migration. */
export function getDoctorByName(name: string): Doctor | undefined {
  return DOCTORS.find((d) => d.name === name);
}
