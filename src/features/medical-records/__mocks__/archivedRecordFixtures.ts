/**
 * Mock fixtures for Archived Records — patient records retired out of the
 * active register, each restorable ("Retrieve Record") until permanently
 * removed. Swap out by pointing hooks to real endpoints in Phase 6.
 */

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type ArchivedRecordType = 'Patient Record' | 'Visit History' | 'Lab Results';
export type ArchiveStatus = 'Archived' | 'Restored' | 'Pending Deletion';

export const ARCHIVED_RECORD_TYPES: ArchivedRecordType[] = [
  'Patient Record',
  'Visit History',
  'Lab Results',
];
export const ARCHIVE_STATUSES: ArchiveStatus[] = ['Archived', 'Restored', 'Pending Deletion'];

export type AuditTrailEntry = {
  dateTime: string;
  label: string;
  actor: string;
};

export type ArchivedRecord = {
  id: string;
  patientName: string;
  initials: string;
  avatarBg: string;
  mrn: string;
  recordType: ArchivedRecordType;
  department: string;
  archiveDate: string;
  reason: string;
  status: ArchiveStatus;
  archivedBy: string;
  auditTrail: AuditTrailEntry[];
};

export const ARCHIVED_RECORDS: ArchivedRecord[] = [
  {
    id: 'arc-001',
    patientName: 'Chidinma Okafor',
    initials: 'CO',
    avatarBg: '#3B82F6',
    mrn: 'MRN-2025-00124',
    recordType: 'Patient Record',
    department: 'General Outpatient Clinic',
    archiveDate: atOffset(-14, 14, 30),
    reason: 'Inactive - No visit for 3 years',
    status: 'Archived',
    archivedBy: 'Dr. Jane Ezeonu (GP)',
    auditTrail: [
      { dateTime: atOffset(-14, 14, 30), label: 'Record archived', actor: 'Dr. Jane Ezeonu (GP)' },
      { dateTime: atOffset(-14, 14, 25), label: 'Archive approved', actor: 'Dr. Samuel A.' },
      {
        dateTime: atOffset(-14, 14, 10),
        label: 'Archive requested',
        actor: 'Dr. Jane Ezeonu (GP)',
      },
    ],
  },
  {
    id: 'arc-002',
    patientName: 'Ifeanyi Nwosu',
    initials: 'IN',
    avatarBg: '#F59E0B',
    mrn: 'MRN-2024-00987',
    recordType: 'Visit History',
    department: 'Physiotherapy',
    archiveDate: atOffset(-16, 11, 20),
    reason: 'Discharged',
    status: 'Archived',
    archivedBy: 'Dr. Samuel A.',
    auditTrail: [
      { dateTime: atOffset(-16, 11, 20), label: 'Record archived', actor: 'Dr. Samuel A.' },
      { dateTime: atOffset(-16, 11, 10), label: 'Discharge confirmed', actor: 'Mrs. Ngozi A.' },
    ],
  },
  {
    id: 'arc-003',
    patientName: 'Maryam Usman',
    initials: 'MU',
    avatarBg: '#8B5CF6',
    mrn: 'MRN-2024-00765',
    recordType: 'Patient Record',
    department: 'Dental Clinic',
    archiveDate: atOffset(-19, 9, 10),
    reason: 'Transferred to another facility',
    status: 'Archived',
    archivedBy: 'Dr. Onyedika Umeh',
    auditTrail: [
      { dateTime: atOffset(-19, 9, 10), label: 'Record archived', actor: 'Dr. Onyedika Umeh' },
      {
        dateTime: atOffset(-19, 9, 0),
        label: 'Transfer letter issued',
        actor: 'Dr. Onyedika Umeh',
      },
    ],
  },
  {
    id: 'arc-004',
    patientName: 'Emeka Obi',
    initials: 'EO',
    avatarBg: '#22C55E',
    mrn: 'MRN-2023-00543',
    recordType: 'Patient Record',
    department: 'Surgery',
    archiveDate: atOffset(-24, 15, 45),
    reason: 'Inactive - No visit for 2 years',
    status: 'Archived',
    archivedBy: 'Dr. Ada Chukwu (GP)',
    auditTrail: [
      { dateTime: atOffset(-24, 15, 45), label: 'Record archived', actor: 'Dr. Ada Chukwu (GP)' },
    ],
  },
  {
    id: 'arc-005',
    patientName: 'Grace Adebayo',
    initials: 'GA',
    avatarBg: '#EC4899',
    mrn: 'MRN-2023-00421',
    recordType: 'Visit History',
    department: 'Laboratory',
    archiveDate: atOffset(-32, 13, 15),
    reason: 'Discharged',
    status: 'Archived',
    archivedBy: 'Dr. Ifeanyi Okafor',
    auditTrail: [
      { dateTime: atOffset(-32, 13, 15), label: 'Record archived', actor: 'Dr. Ifeanyi Okafor' },
    ],
  },
  {
    id: 'arc-006',
    patientName: 'Chidi Nwankwo',
    initials: 'CN',
    avatarBg: '#00B4D8',
    mrn: 'MRN-2024-00812',
    recordType: 'Patient Record',
    department: 'Family Medicine',
    archiveDate: atOffset(-45, 10, 0),
    reason: 'Graduated / left institution',
    status: 'Restored',
    archivedBy: 'Mrs. Ngozi Asogwa',
    auditTrail: [
      { dateTime: atOffset(-2, 9, 30), label: 'Record restored', actor: 'Mrs. Ngozi Asogwa' },
      { dateTime: atOffset(-45, 10, 0), label: 'Record archived', actor: 'Mrs. Ngozi Asogwa' },
    ],
  },
  {
    id: 'arc-007',
    patientName: 'Patience Effiong',
    initials: 'PE',
    avatarBg: '#3B82F6',
    mrn: 'MRN-2023-00344',
    recordType: 'Patient Record',
    department: 'Medicine',
    archiveDate: atOffset(-60, 11, 20),
    reason: 'Graduated / left institution',
    status: 'Archived',
    archivedBy: 'Mrs. Ngozi Asogwa',
    auditTrail: [
      { dateTime: atOffset(-60, 11, 20), label: 'Record archived', actor: 'Mrs. Ngozi Asogwa' },
    ],
  },
  {
    id: 'arc-008',
    patientName: 'Yusuf Aliyu',
    initials: 'YA',
    avatarBg: '#F59E0B',
    mrn: 'MRN-2026-00201',
    recordType: 'Visit History',
    department: 'Law Clinic',
    archiveDate: atOffset(-6, 9, 45),
    reason: 'Transferred to another facility',
    status: 'Archived',
    archivedBy: 'Mr. Chukwuemeka Nnaji',
    auditTrail: [
      { dateTime: atOffset(-6, 9, 45), label: 'Record archived', actor: 'Mr. Chukwuemeka Nnaji' },
    ],
  },
  {
    id: 'arc-009',
    patientName: 'Margaret Okoro',
    initials: 'MO',
    avatarBg: '#8B5CF6',
    mrn: 'MRN-2022-00119',
    recordType: 'Patient Record',
    department: 'Bursary',
    archiveDate: atOffset(-90, 8, 30),
    reason: 'Deceased',
    status: 'Pending Deletion',
    archivedBy: 'Dr. Adaeze Okonkwo',
    auditTrail: [
      { dateTime: atOffset(-90, 8, 30), label: 'Record archived', actor: 'Dr. Adaeze Okonkwo' },
      {
        dateTime: atOffset(-91, 16, 0),
        label: 'Death certificate filed',
        actor: 'Dr. Adaeze Okonkwo',
      },
    ],
  },
  {
    id: 'arc-010',
    patientName: 'Halima Suleiman',
    initials: 'HS',
    avatarBg: '#22C55E',
    mrn: 'MRN-2026-00088',
    recordType: 'Lab Results',
    department: 'Pharmacy',
    archiveDate: atOffset(-70, 9, 0),
    reason: 'Transferred to another facility',
    status: 'Archived',
    archivedBy: 'Mrs. Ngozi Asogwa',
    auditTrail: [
      { dateTime: atOffset(-70, 9, 0), label: 'Record archived', actor: 'Mrs. Ngozi Asogwa' },
    ],
  },
  {
    id: 'arc-011',
    patientName: 'Peter Achike',
    initials: 'PA',
    avatarBg: '#EC4899',
    mrn: 'MRN-2021-00276',
    recordType: 'Patient Record',
    department: 'Social Sciences',
    archiveDate: atOffset(-110, 10, 15),
    reason: 'Graduated / left institution',
    status: 'Archived',
    archivedBy: 'Mr. Chukwuemeka Nnaji',
    auditTrail: [
      {
        dateTime: atOffset(-110, 10, 15),
        label: 'Record archived',
        actor: 'Mr. Chukwuemeka Nnaji',
      },
    ],
  },
  {
    id: 'arc-012',
    patientName: 'Ngozi Ibe',
    initials: 'NI',
    avatarBg: '#00B4D8',
    mrn: 'MRN-2025-00512',
    recordType: 'Visit History',
    department: 'Medicine',
    archiveDate: atOffset(-25, 14, 0),
    reason: 'Transferred to another facility',
    status: 'Archived',
    archivedBy: 'Mrs. Ngozi Asogwa',
    auditTrail: [
      { dateTime: atOffset(-25, 14, 0), label: 'Record archived', actor: 'Mrs. Ngozi Asogwa' },
    ],
  },
  {
    id: 'arc-013',
    patientName: 'Rita Nwachukwu',
    initials: 'RN',
    avatarBg: '#3B82F6',
    mrn: 'MRN-2020-00056',
    recordType: 'Patient Record',
    department: 'Education',
    archiveDate: atOffset(-3, 2, 0),
    reason: 'Inactive - No visit for 5+ years',
    status: 'Archived',
    archivedBy: 'System (auto-archive)',
    auditTrail: [{ dateTime: atOffset(-3, 2, 0), label: 'Record auto-archived', actor: 'System' }],
  },
  {
    id: 'arc-014',
    patientName: 'Godwin Etim',
    initials: 'GE',
    avatarBg: '#F59E0B',
    mrn: 'MRN-2024-00677',
    recordType: 'Patient Record',
    department: 'Natural Sciences',
    archiveDate: atOffset(-52, 15, 0),
    reason: 'Graduated / left institution',
    status: 'Archived',
    archivedBy: 'Mr. Chukwuemeka Nnaji',
    auditTrail: [
      { dateTime: atOffset(-52, 15, 0), label: 'Record archived', actor: 'Mr. Chukwuemeka Nnaji' },
    ],
  },
];
