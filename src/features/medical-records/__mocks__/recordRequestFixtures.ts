/**
 * Mock fixtures for the Record Requests workflow — requests for a patient
 * record's retrieval or access, worked through Pending -> Approved ->
 * Completed (or Rejected). Swap out by pointing hooks to real endpoints in
 * Phase 6.
 */

import type { ArchivedRecordType } from './archivedRecordFixtures';

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type RequestStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected';
export type RequestPriority = 'Normal' | 'Urgent';

export const REQUEST_STATUSES: RequestStatus[] = ['Pending', 'Approved', 'Completed', 'Rejected'];

export type RecordRequest = {
  id: string;
  requestNumber: string;
  patientName: string;
  initials: string;
  avatarBg: string;
  mrn: string;
  recordType: ArchivedRecordType;
  requestedBy: string;
  requestDate: string;
  purpose: string;
  status: RequestStatus;
  priority: RequestPriority;
  notes: string;
};

export const RECORD_REQUESTS: RecordRequest[] = [
  {
    id: 'req-001',
    requestNumber: 'REQ-2026-00071',
    patientName: 'Chidinma Okafor',
    initials: 'CO',
    avatarBg: '#3B82F6',
    mrn: 'MRN-2025-00124',
    recordType: 'Patient Record',
    requestedBy: 'Dr. Jane Ezeonu (GP)',
    requestDate: atOffset(0, 10, 20),
    purpose: 'Continuation of care',
    status: 'Pending',
    priority: 'Normal',
    notes: 'Patient referred for further management.',
  },
  {
    id: 'req-002',
    requestNumber: 'REQ-2026-00070',
    patientName: 'Ifeanyi Nwosu',
    initials: 'IN',
    avatarBg: '#F59E0B',
    mrn: 'MRN-2024-00987',
    recordType: 'Visit History',
    requestedBy: 'Dr. Samuel A.',
    requestDate: atOffset(0, 9, 15),
    purpose: 'Transfer to another facility',
    status: 'Approved',
    priority: 'Normal',
    notes: 'Approved for transfer — awaiting physical handover.',
  },
  {
    id: 'req-003',
    requestNumber: 'REQ-2026-00069',
    patientName: 'Maryam Usman',
    initials: 'MU',
    avatarBg: '#8B5CF6',
    mrn: 'MRN-2024-00765',
    recordType: 'Lab Results',
    requestedBy: 'Dr. Ifeanyi Okafor',
    requestDate: atOffset(-1, 16, 30),
    purpose: 'Specialist review',
    status: 'Completed',
    priority: 'Normal',
    notes: 'Results shared with the specialist on referral.',
  },
  {
    id: 'req-004',
    requestNumber: 'REQ-2026-00068',
    patientName: 'Emeka Obi',
    initials: 'EO',
    avatarBg: '#22C55E',
    mrn: 'MRN-2023-00543',
    recordType: 'Patient Record',
    requestedBy: 'Dr. Jane Ezeonu (GP)',
    requestDate: atOffset(-1, 15, 10),
    purpose: 'Legal documentation',
    status: 'Rejected',
    priority: 'Urgent',
    notes: 'Missing patient consent authorization — returned to requester.',
  },
  {
    id: 'req-005',
    requestNumber: 'REQ-2026-00067',
    patientName: 'Grace Adebayo',
    initials: 'GA',
    avatarBg: '#EC4899',
    mrn: 'MRN-2023-00421',
    recordType: 'Visit History',
    requestedBy: 'Dr. Onyedika Umeh',
    requestDate: atOffset(-1, 11, 45),
    purpose: 'Insurance claims',
    status: 'Pending',
    priority: 'Normal',
    notes: 'Awaiting insurer reference number before processing.',
  },
  {
    id: 'req-006',
    requestNumber: 'REQ-2026-00066',
    patientName: 'Chidi Nwankwo',
    initials: 'CN',
    avatarBg: '#00B4D8',
    mrn: 'MRN-2024-00812',
    recordType: 'Patient Record',
    requestedBy: 'NHIA Insurance',
    requestDate: atOffset(-2, 9, 0),
    purpose: 'Claim verification',
    status: 'Approved',
    priority: 'Normal',
    notes: 'Claim reference confirmed — release scheduled.',
  },
  {
    id: 'req-007',
    requestNumber: 'REQ-2026-00065',
    patientName: 'Patience Effiong',
    initials: 'PE',
    avatarBg: '#3B82F6',
    mrn: 'MRN-2023-00344',
    recordType: 'Patient Record',
    requestedBy: 'Patience Effiong',
    requestDate: atOffset(-2, 13, 20),
    purpose: 'Personal copy for relocation',
    status: 'Completed',
    priority: 'Normal',
    notes: 'Copy issued directly to patient with ID verification.',
  },
  {
    id: 'req-008',
    requestNumber: 'REQ-2026-00064',
    patientName: 'Yusuf Aliyu',
    initials: 'YA',
    avatarBg: '#F59E0B',
    mrn: 'MRN-2026-00201',
    recordType: 'Visit History',
    requestedBy: 'Nnamdi Azikiwe Chambers',
    requestDate: atOffset(-3, 10, 0),
    purpose: 'Subpoena — court proceeding',
    status: 'Pending',
    priority: 'Urgent',
    notes: 'Awaiting legal office confirmation of authorization letter.',
  },
  {
    id: 'req-009',
    requestNumber: 'REQ-2026-00063',
    patientName: 'Margaret Okoro',
    initials: 'MO',
    avatarBg: '#8B5CF6',
    mrn: 'MRN-2022-00119',
    recordType: 'Patient Record',
    requestedBy: 'AXA Mansard Health',
    requestDate: atOffset(-3, 14, 40),
    purpose: 'Pre-authorization for procedure',
    status: 'Rejected',
    priority: 'Normal',
    notes: 'Missing patient consent form — returned to requester.',
  },
  {
    id: 'req-010',
    requestNumber: 'REQ-2026-00062',
    patientName: 'Halima Suleiman',
    initials: 'HS',
    avatarBg: '#22C55E',
    mrn: 'MRN-2026-00088',
    recordType: 'Lab Results',
    requestedBy: 'Dr. Samuel A.',
    requestDate: atOffset(-4, 9, 30),
    purpose: 'Emergency discharge follow-up',
    status: 'Completed',
    priority: 'Urgent',
    notes: 'Sent directly to GP for continuity of care.',
  },
  {
    id: 'req-011',
    requestNumber: 'REQ-2026-00061',
    patientName: 'Peter Achike',
    initials: 'PA',
    avatarBg: '#EC4899',
    mrn: 'MRN-2021-00276',
    recordType: 'Patient Record',
    requestedBy: 'Reliance HMO',
    requestDate: atOffset(-4, 15, 10),
    purpose: 'Annual wellness claim documentation',
    status: 'Pending',
    priority: 'Normal',
    notes: 'Standard annual documentation request.',
  },
  {
    id: 'req-012',
    requestNumber: 'REQ-2026-00060',
    patientName: 'Ngozi Ibe',
    initials: 'NI',
    avatarBg: '#00B4D8',
    mrn: 'MRN-2025-00512',
    recordType: 'Visit History',
    requestedBy: 'Dr. Mary Uche',
    requestDate: atOffset(-5, 10, 0),
    purpose: 'Radiology comparison imaging',
    status: 'Approved',
    priority: 'Normal',
    notes: 'Historical imaging queued for retrieval.',
  },
];
