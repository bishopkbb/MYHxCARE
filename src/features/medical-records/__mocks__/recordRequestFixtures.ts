/**
 * Mock fixtures for the Record Requests workflow — internal, external,
 * insurance, legal, and patient self-requests for copies of a medical
 * record. Swap out by pointing hooks to real endpoints in Phase 6.
 */

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type RequestType = 'Internal' | 'External' | 'Insurance' | 'Legal' | 'Patient Self-Request';
export type RequestStatus = 'Pending' | 'In Progress' | 'Fulfilled' | 'Rejected';
export type RequestPriority = 'Routine' | 'Urgent';

export type RecordRequest = {
  id: string;
  requestNumber: string;
  patientName: string;
  mrn: string;
  requestedBy: string;
  requesterType: RequestType;
  purpose: string;
  priority: RequestPriority;
  status: RequestStatus;
  dateRequested: string;
  dateNeeded: string;
  dateFulfilled?: string;
  department: string;
  notes?: string;
};

export const REQUEST_TYPES: RequestType[] = [
  'Internal',
  'External',
  'Insurance',
  'Legal',
  'Patient Self-Request',
];

export const REQUEST_STATUSES: RequestStatus[] = [
  'Pending',
  'In Progress',
  'Fulfilled',
  'Rejected',
];

export const RECORD_REQUESTS: RecordRequest[] = [
  {
    id: 'req-001',
    requestNumber: 'REQ-2026-0341',
    patientName: 'Chinedu Agbasi',
    mrn: 'MRN-2026-00678',
    requestedBy: 'Dr. Jane Ezeonu',
    requesterType: 'Internal',
    purpose: 'Referral to Cardiology — needs full consultation history',
    priority: 'Urgent',
    status: 'Pending',
    dateRequested: atOffset(0, 9, 15),
    dateNeeded: atOffset(1, 17, 0),
    department: 'General Outpatient Clinic',
  },
  {
    id: 'req-002',
    requestNumber: 'REQ-2026-0340',
    patientName: 'Amaka Nwosu',
    mrn: 'MRN-2026-00675',
    requestedBy: 'Dr. Michael Obi',
    requesterType: 'Internal',
    purpose: 'Pre-operative review before scheduled surgery',
    priority: 'Urgent',
    status: 'In Progress',
    dateRequested: atOffset(0, 9, 40),
    dateNeeded: atOffset(0, 16, 0),
    department: 'Surgery',
  },
  {
    id: 'req-003',
    requestNumber: 'REQ-2026-0339',
    patientName: 'David Osei',
    mrn: 'MRN-2026-00677',
    requestedBy: 'NHIA Insurance',
    requesterType: 'Insurance',
    purpose: 'Claim verification for admission dated 05 Jul 2026',
    priority: 'Routine',
    status: 'Fulfilled',
    dateRequested: atOffset(-1, 10, 5),
    dateNeeded: atOffset(3, 17, 0),
    dateFulfilled: atOffset(0, 10, 5),
    department: 'Medical Ward',
  },
  {
    id: 'req-004',
    requestNumber: 'REQ-2026-0338',
    patientName: 'Fatima Kabir',
    mrn: 'MRN-2026-00676',
    requestedBy: 'Dr. Ngozi Okafor',
    requesterType: 'Internal',
    purpose: 'Continuity of care — transferring to Family Medicine',
    priority: 'Routine',
    status: 'Pending',
    dateRequested: atOffset(-1, 10, 20),
    dateNeeded: atOffset(2, 17, 0),
    department: 'Family Medicine',
  },
  {
    id: 'req-005',
    requestNumber: 'REQ-2026-0337',
    patientName: 'Babatunde Alade',
    mrn: 'MRN-2026-00674',
    requestedBy: 'Dr. Ada Chukwu',
    requesterType: 'Internal',
    purpose: 'Follow-up consultation — needs latest lab results',
    priority: 'Routine',
    status: 'In Progress',
    dateRequested: atOffset(-1, 10, 45),
    dateNeeded: atOffset(1, 17, 0),
    department: 'General Outpatient Clinic',
  },
  {
    id: 'req-006',
    requestNumber: 'REQ-2026-0336',
    patientName: 'Ifeoma Nnamdi',
    mrn: 'MRN-2026-00512',
    requestedBy: 'Ifeoma Nnamdi',
    requesterType: 'Patient Self-Request',
    purpose: 'Personal copy for relocation to a new hospital',
    priority: 'Routine',
    status: 'Pending',
    dateRequested: atOffset(-2, 11, 30),
    dateNeeded: atOffset(5, 17, 0),
    department: 'Medical Records',
  },
  {
    id: 'req-007',
    requestNumber: 'REQ-2026-0335',
    patientName: 'Emeka Obiorah',
    mrn: 'MRN-2026-00498',
    requestedBy: 'Nnamdi Azikiwe Chambers',
    requesterType: 'Legal',
    purpose: 'Subpoena — full record required for court proceeding',
    priority: 'Urgent',
    status: 'In Progress',
    dateRequested: atOffset(-2, 13, 0),
    dateNeeded: atOffset(2, 17, 0),
    department: 'Medical Records',
    notes: 'Awaiting legal office confirmation of authorization letter.',
  },
  {
    id: 'req-008',
    requestNumber: 'REQ-2026-0334',
    patientName: 'Grace Adeyemi',
    mrn: 'MRN-2026-00489',
    requestedBy: 'AXA Mansard Health',
    requesterType: 'Insurance',
    purpose: 'Pre-authorization for upcoming procedure',
    priority: 'Routine',
    status: 'Rejected',
    dateRequested: atOffset(-3, 9, 0),
    dateNeeded: atOffset(-1, 17, 0),
    department: 'Medical Records',
    notes: 'Missing patient consent form — returned to requester.',
  },
  {
    id: 'req-009',
    requestNumber: 'REQ-2026-0333',
    patientName: 'Tunde Bakare',
    mrn: 'MRN-2026-00470',
    requestedBy: 'Dr. Samuel A.',
    requesterType: 'Internal',
    purpose: 'Emergency department discharge summary for GP follow-up',
    priority: 'Urgent',
    status: 'Fulfilled',
    dateRequested: atOffset(-3, 14, 20),
    dateNeeded: atOffset(-2, 17, 0),
    dateFulfilled: atOffset(-3, 16, 40),
    department: 'Emergency Department',
  },
  {
    id: 'req-010',
    requestNumber: 'REQ-2026-0332',
    patientName: 'Blessing Chukwu',
    mrn: 'MRN-2026-00455',
    requestedBy: 'Blessing Chukwu',
    requesterType: 'Patient Self-Request',
    purpose: 'Copy of immunization records for visa application',
    priority: 'Routine',
    status: 'Fulfilled',
    dateRequested: atOffset(-4, 9, 45),
    dateNeeded: atOffset(-1, 17, 0),
    dateFulfilled: atOffset(-2, 11, 15),
    department: 'Medical Records',
  },
  {
    id: 'req-011',
    requestNumber: 'REQ-2026-0331',
    patientName: 'Kelechi Eze',
    mrn: 'MRN-2026-00447',
    requestedBy: 'Reliance HMO',
    requesterType: 'Insurance',
    purpose: 'Annual wellness claim documentation',
    priority: 'Routine',
    status: 'Pending',
    dateRequested: atOffset(-4, 15, 10),
    dateNeeded: atOffset(4, 17, 0),
    department: 'Medical Records',
  },
  {
    id: 'req-012',
    requestNumber: 'REQ-2026-0330',
    patientName: 'Uchenna Collins',
    mrn: 'MRN-2026-00434',
    requestedBy: 'Dr. Mary Uche',
    requesterType: 'Internal',
    purpose: 'Radiology history for comparison imaging',
    priority: 'Routine',
    status: 'In Progress',
    dateRequested: atOffset(-5, 10, 0),
    dateNeeded: atOffset(0, 17, 0),
    department: 'Radiology',
  },
  {
    id: 'req-013',
    requestNumber: 'REQ-2026-0329',
    patientName: 'Sandra Okafor',
    mrn: 'MRN-2026-00421',
    requestedBy: 'Sandra Okafor',
    requesterType: 'Patient Self-Request',
    purpose: 'Full record copy requested for second opinion abroad',
    priority: 'Routine',
    status: 'Pending',
    dateRequested: atOffset(-5, 13, 25),
    dateNeeded: atOffset(6, 17, 0),
    department: 'Medical Records',
  },
  {
    id: 'req-014',
    requestNumber: 'REQ-2026-0328',
    patientName: 'Michael Ofori',
    mrn: 'MRN-2026-00409',
    requestedBy: 'Dr. Onyedika Umeh',
    requesterType: 'Internal',
    purpose: 'Dental history prior to oral surgery',
    priority: 'Urgent',
    status: 'Fulfilled',
    dateRequested: atOffset(-6, 9, 10),
    dateNeeded: atOffset(-4, 17, 0),
    dateFulfilled: atOffset(-5, 12, 30),
    department: 'Dental Clinic',
  },
  {
    id: 'req-015',
    requestNumber: 'REQ-2026-0327',
    patientName: 'Esther Chinedu',
    mrn: 'MRN-2026-00398',
    requestedBy: 'Leadway Assurance',
    requesterType: 'Insurance',
    purpose: 'Discharge summary for hospitalization claim',
    priority: 'Routine',
    status: 'Rejected',
    dateRequested: atOffset(-7, 11, 0),
    dateNeeded: atOffset(-5, 17, 0),
    department: 'Medical Records',
    notes: 'Claim reference number did not match any admission on file.',
  },
  {
    id: 'req-016',
    requestNumber: 'REQ-2026-0326',
    patientName: 'Ibrahim Kalu',
    mrn: 'MRN-2026-00387',
    requestedBy: 'Mrs. Ngozi A.',
    requesterType: 'Internal',
    purpose: 'Physiotherapy progress notes for care plan review',
    priority: 'Routine',
    status: 'In Progress',
    dateRequested: atOffset(-8, 14, 45),
    dateNeeded: atOffset(-1, 17, 0),
    department: 'Physiotherapy',
  },
];
