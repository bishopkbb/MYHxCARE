/**
 * Mock fixtures for Archived Records — patient records retired out of the
 * active register (graduated, transferred, deceased, duplicate, or aged out
 * under the retention policy), each restorable on request until its
 * retention window lapses. Swap out by pointing hooks to real endpoints in
 * Phase 6.
 */

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type ArchiveReason =
  | 'Graduated / Left Institution'
  | 'Transferred Out'
  | 'Deceased'
  | 'Duplicate Record'
  | 'Retention Policy';

export const ARCHIVE_REASONS: ArchiveReason[] = [
  'Graduated / Left Institution',
  'Transferred Out',
  'Deceased',
  'Duplicate Record',
  'Retention Policy',
];

export type ArchivedRecord = {
  id: string;
  patientName: string;
  mrn: string;
  studentId: string;
  faculty: string;
  reason: ArchiveReason;
  archivedBy: string;
  dateArchived: string;
  lastActivity: string;
  retentionUntil: string;
  notes?: string;
};

export const ARCHIVED_RECORDS: ArchivedRecord[] = [
  {
    id: 'arc-001',
    patientName: 'Chidi Nwankwo',
    mrn: 'MRN-2024-00812',
    studentId: '202001045',
    faculty: 'Engineering',
    reason: 'Graduated / Left Institution',
    archivedBy: 'Mrs. Ngozi Asogwa',
    dateArchived: atOffset(-14, 10, 0),
    lastActivity: atOffset(-210, 9, 0),
    retentionUntil: atOffset(1826, 0, 0),
  },
  {
    id: 'arc-002',
    patientName: 'Patience Effiong',
    mrn: 'MRN-2023-00344',
    studentId: '201905219',
    faculty: 'Medicine',
    reason: 'Graduated / Left Institution',
    archivedBy: 'Mrs. Ngozi Asogwa',
    dateArchived: atOffset(-30, 11, 20),
    lastActivity: atOffset(-320, 14, 0),
    retentionUntil: atOffset(1810, 0, 0),
  },
  {
    id: 'arc-003',
    patientName: 'Yusuf Aliyu',
    mrn: 'MRN-2026-00201',
    studentId: '202301188',
    faculty: 'Law',
    reason: 'Transferred Out',
    archivedBy: 'Mr. Chukwuemeka Nnaji',
    dateArchived: atOffset(-6, 9, 45),
    lastActivity: atOffset(-40, 10, 0),
    retentionUntil: atOffset(1819, 0, 0),
    notes: 'Transferred to Nnamdi Azikiwe University Teaching Hospital for continuity of care.',
  },
  {
    id: 'arc-004',
    patientName: 'Margaret Okoro',
    mrn: 'MRN-2022-00119',
    studentId: 'STAFF-00219',
    faculty: 'Staff — Bursary',
    reason: 'Deceased',
    archivedBy: 'Dr. Adaeze Okonkwo',
    dateArchived: atOffset(-90, 8, 30),
    lastActivity: atOffset(-92, 16, 0),
    retentionUntil: atOffset(3285, 0, 0),
    notes: 'Death certificate on file. Family notified per policy.',
  },
  {
    id: 'arc-005',
    patientName: 'Ikenna Obi (duplicate)',
    mrn: 'MRN-2026-00093-D',
    studentId: '202401077',
    faculty: 'Business',
    reason: 'Duplicate Record',
    archivedBy: 'Mrs. Ngozi Asogwa',
    dateArchived: atOffset(-3, 13, 10),
    lastActivity: atOffset(-3, 13, 0),
    retentionUntil: atOffset(90, 0, 0),
    notes: 'Merged into primary record MRN-2026-00093 — kept for audit trail only.',
  },
  {
    id: 'arc-006',
    patientName: 'Rita Nwachukwu',
    mrn: 'MRN-2020-00056',
    studentId: '201704432',
    faculty: 'Education',
    reason: 'Retention Policy',
    archivedBy: 'System (auto-archive)',
    dateArchived: atOffset(-1, 2, 0),
    lastActivity: atOffset(-1826, 9, 0),
    retentionUntil: atOffset(365, 0, 0),
    notes: 'No activity for 5+ years — auto-archived under the records retention policy.',
  },
  {
    id: 'arc-007',
    patientName: 'Godwin Etim',
    mrn: 'MRN-2024-00677',
    studentId: '202101305',
    faculty: 'Natural Sciences',
    reason: 'Graduated / Left Institution',
    archivedBy: 'Mr. Chukwuemeka Nnaji',
    dateArchived: atOffset(-45, 15, 0),
    lastActivity: atOffset(-260, 11, 0),
    retentionUntil: atOffset(1795, 0, 0),
  },
  {
    id: 'arc-008',
    patientName: 'Halima Suleiman',
    mrn: 'MRN-2026-00088',
    studentId: '202401019',
    faculty: 'Pharmacy',
    reason: 'Transferred Out',
    archivedBy: 'Mrs. Ngozi Asogwa',
    dateArchived: atOffset(-60, 9, 0),
    lastActivity: atOffset(-70, 10, 30),
    retentionUntil: atOffset(1765, 0, 0),
    notes: 'Transferred to Federal Medical Centre, Owerri.',
  },
  {
    id: 'arc-009',
    patientName: 'Emmanuel Bassey',
    mrn: 'MRN-2019-00034',
    studentId: 'STAFF-00104',
    faculty: 'Staff — Facilities',
    reason: 'Retention Policy',
    archivedBy: 'System (auto-archive)',
    dateArchived: atOffset(-5, 2, 0),
    lastActivity: atOffset(-2190, 9, 0),
    retentionUntil: atOffset(361, 0, 0),
  },
  {
    id: 'arc-010',
    patientName: 'Comfort Idika',
    mrn: 'MRN-2026-00093',
    studentId: '202401077',
    faculty: 'Business',
    reason: 'Duplicate Record',
    archivedBy: 'Mrs. Ngozi Asogwa',
    dateArchived: atOffset(-3, 13, 12),
    lastActivity: atOffset(-3, 13, 5),
    retentionUntil: atOffset(90, 0, 0),
    notes: 'Duplicate entry created at registration — same patient as MRN-2026-00093-D.',
  },
  {
    id: 'arc-011',
    patientName: 'Peter Achike',
    mrn: 'MRN-2021-00276',
    studentId: '201803356',
    faculty: 'Social Sciences',
    reason: 'Graduated / Left Institution',
    archivedBy: 'Mr. Chukwuemeka Nnaji',
    dateArchived: atOffset(-100, 10, 15),
    lastActivity: atOffset(-380, 9, 0),
    retentionUntil: atOffset(1740, 0, 0),
  },
  {
    id: 'arc-012',
    patientName: 'Ngozi Ibe',
    mrn: 'MRN-2025-00512',
    studentId: '202201211',
    faculty: 'Medicine',
    reason: 'Transferred Out',
    archivedBy: 'Mrs. Ngozi Asogwa',
    dateArchived: atOffset(-20, 14, 0),
    lastActivity: atOffset(-35, 10, 0),
    retentionUntil: atOffset(1806, 0, 0),
  },
];
