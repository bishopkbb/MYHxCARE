/**
 * Mock fixtures for the cross-department Staff Inbox — the Messages screen
 * used by non-clinical workspaces (Registration, Medical Records) where
 * communication is department-to-department memo/notice traffic rather than
 * the doctor's 1:1 patient-context chat (see messageFixtures.ts /
 * collaboration page for that). Swap out by pointing hooks to a real
 * messaging endpoint in Phase 6.
 */

function atOffset(dayOffset: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export type StaffDepartment =
  'Doctors' | 'Laboratory' | 'Pharmacy' | 'Nursing' | 'Finance' | 'Administration' | 'Records';

export const DEPARTMENT_CFG: Record<
  StaffDepartment,
  { color: string; bg: string; border: string }
> = {
  Doctors: { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.30)' },
  Laboratory: { color: '#00B4D8', bg: 'rgba(0,180,216,0.08)', border: 'rgba(0,180,216,0.30)' },
  Pharmacy: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.30)' },
  Nursing: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.30)' },
  Finance: { color: '#4A7080', bg: 'rgba(74,112,128,0.08)', border: 'rgba(74,112,128,0.30)' },
  Administration: {
    color: '#4A7080',
    bg: 'rgba(74,112,128,0.08)',
    border: 'rgba(74,112,128,0.30)',
  },
  Records: { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.30)' },
};

export type MessageStatus = 'Unread' | 'Read' | 'Archived';

export type ThreadMessage = {
  id: string;
  from: 'me' | 'them';
  text: string;
  sentAt: string;
  read: boolean;
};

export type Attachment = { id: string; name: string; sizeKB: number };

export type ReadReceipt = { name: string; seenAt: string };

export type InboxMessage = {
  id: string;
  senderName: string;
  senderInitials: string;
  senderAvatarBg: string;
  department: StaffDepartment;
  online: boolean;
  subject: string;
  preview: string;
  sentAt: string;
  status: MessageStatus;
  thread: ThreadMessage[];
  attachments: Attachment[];
  readReceipts: ReadReceipt[];
};

export type DraftMessage = {
  id: string;
  to: string;
  subject: string;
  preview: string;
  savedAt: string;
};

// ── Inbox ────────────────────────────────────────────────────────────────────

export const INBOX_MESSAGES: InboxMessage[] = [
  {
    id: 'msg-001',
    senderName: 'Dr. Samuel A.',
    senderInitials: 'SA',
    senderAvatarBg: '#3B82F6',
    department: 'Doctors',
    online: true,
    subject: 'Patient in Emergency Room',
    preview: 'We have a patient that needs immediate attention in ER. Kindly review and advise.',
    sentAt: atOffset(0, 10, 20),
    status: 'Unread',
    thread: [
      {
        id: 'msg-001-t1',
        from: 'them',
        text: 'We have a patient that needs immediate attention in ER. Kindly review and advise.',
        sentAt: atOffset(0, 10, 20),
        read: true,
      },
      {
        id: 'msg-001-t2',
        from: 'me',
        text: 'On it. Please share patient details and vitals.',
        sentAt: atOffset(0, 10, 22),
        read: true,
      },
      {
        id: 'msg-001-t3',
        from: 'them',
        text: 'MRN: 2026-0148\nPatient: Chidinma Okafor\nVitals attached.',
        sentAt: atOffset(0, 10, 25),
        read: true,
      },
      {
        id: 'msg-001-t4',
        from: 'me',
        text: 'Received. I will review and update shortly.',
        sentAt: atOffset(0, 10, 27),
        read: true,
      },
    ],
    attachments: [
      { id: 'att-1', name: 'Vitals_Summary.pdf', sizeKB: 154 },
      { id: 'att-2', name: 'Lab_Results.pdf', sizeKB: 227 },
    ],
    readReceipts: [
      { name: 'Dr. Samuel A.', seenAt: atOffset(0, 10, 22) },
      { name: 'Mary Uche', seenAt: atOffset(0, 10, 25) },
    ],
  },
  {
    id: 'msg-002',
    senderName: 'Mary Uche',
    senderInitials: 'MU',
    senderAvatarBg: '#00B4D8',
    department: 'Laboratory',
    online: true,
    subject: 'Lab Results for MRN-2026-0142',
    preview: 'Please review the lab results and advise on next steps.',
    sentAt: atOffset(0, 9, 55),
    status: 'Read',
    thread: [
      {
        id: 'msg-002-t1',
        from: 'them',
        text: 'Please review the lab results and advise on next steps.',
        sentAt: atOffset(0, 9, 55),
        read: true,
      },
    ],
    attachments: [{ id: 'att-3', name: 'CBC_Result.pdf', sizeKB: 98 }],
    readReceipts: [{ name: 'Mrs. Ngozi Asogwa', seenAt: atOffset(0, 10, 0) }],
  },
  {
    id: 'msg-003',
    senderName: 'Pharmacy Dept.',
    senderInitials: 'P',
    senderAvatarBg: '#8B5CF6',
    department: 'Pharmacy',
    online: false,
    subject: 'Medication Stock Update',
    preview: 'Update on current stock levels for essential medications.',
    sentAt: atOffset(0, 9, 40),
    status: 'Read',
    thread: [
      {
        id: 'msg-003-t1',
        from: 'them',
        text: 'Update on current stock levels for essential medications. Amoxicillin and Paracetamol are running low — reorder requested.',
        sentAt: atOffset(0, 9, 40),
        read: true,
      },
    ],
    attachments: [{ id: 'att-4', name: 'Stock_Levels.xlsx', sizeKB: 44 }],
    readReceipts: [{ name: 'Mrs. Ngozi Asogwa', seenAt: atOffset(0, 9, 50) }],
  },
  {
    id: 'msg-004',
    senderName: 'Nurse Grace',
    senderInitials: 'NG',
    senderAvatarBg: '#F59E0B',
    department: 'Nursing',
    online: true,
    subject: 'Patient Update',
    preview: 'Please check on patient in Ward 3B and update the chart.',
    sentAt: atOffset(0, 8, 40),
    status: 'Unread',
    thread: [
      {
        id: 'msg-004-t1',
        from: 'them',
        text: 'Please check on patient in Ward 3B and update the chart.',
        sentAt: atOffset(0, 8, 40),
        read: false,
      },
    ],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'msg-005',
    senderName: 'Finance Dept.',
    senderInitials: 'F',
    senderAvatarBg: '#4A7080',
    department: 'Finance',
    online: false,
    subject: 'Monthly Budget Report',
    preview: 'Kindly review the attached budget summary.',
    sentAt: atOffset(0, 7, 40),
    status: 'Read',
    thread: [
      {
        id: 'msg-005-t1',
        from: 'them',
        text: 'Kindly review the attached budget summary for records-department expenditure this month.',
        sentAt: atOffset(0, 7, 40),
        read: true,
      },
    ],
    attachments: [{ id: 'att-5', name: 'Budget_Summary_Jul.pdf', sizeKB: 312 }],
    readReceipts: [{ name: 'Mrs. Ngozi Asogwa', seenAt: atOffset(0, 8, 0) }],
  },
  {
    id: 'msg-006',
    senderName: 'Dr. Jane Ezeonu',
    senderInitials: 'JE',
    senderAvatarBg: '#3B82F6',
    department: 'Doctors',
    online: true,
    subject: 'Consultation Request',
    preview: 'Requesting your input on a complex case in Clinic 2.',
    sentAt: atOffset(0, 6, 40),
    status: 'Read',
    thread: [
      {
        id: 'msg-006-t1',
        from: 'them',
        text: 'Requesting your input on a complex case in Clinic 2 — need last visit history pulled for the chart.',
        sentAt: atOffset(0, 6, 40),
        read: true,
      },
    ],
    attachments: [],
    readReceipts: [{ name: 'Mrs. Ngozi Asogwa', seenAt: atOffset(0, 7, 0) }],
  },
  {
    id: 'msg-007',
    senderName: 'Admin Office',
    senderInitials: 'A',
    senderAvatarBg: '#4A7080',
    department: 'Administration',
    online: false,
    subject: 'System Maintenance Notice',
    preview: 'There will be a system update tonight from 11:00 PM.',
    sentAt: atOffset(0, 5, 40),
    status: 'Unread',
    thread: [
      {
        id: 'msg-007-t1',
        from: 'them',
        text: 'There will be a system update tonight from 11:00 PM to 2:00 AM. Please save your work before then.',
        sentAt: atOffset(0, 5, 40),
        read: false,
      },
    ],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'msg-008',
    senderName: 'Laboratory Dept.',
    senderInitials: 'L',
    senderAvatarBg: '#00B4D8',
    department: 'Laboratory',
    online: false,
    subject: 'Sample Collection Schedule',
    preview: 'Please see attached schedule for tomorrow’s collection.',
    sentAt: atOffset(0, 4, 40),
    status: 'Read',
    thread: [
      {
        id: 'msg-008-t1',
        from: 'them',
        text: 'Please see attached schedule for tomorrow’s collection round across all wards.',
        sentAt: atOffset(0, 4, 40),
        read: true,
      },
    ],
    attachments: [{ id: 'att-6', name: 'Collection_Schedule.pdf', sizeKB: 76 }],
    readReceipts: [{ name: 'Mrs. Ngozi Asogwa', seenAt: atOffset(0, 5, 0) }],
  },
  {
    id: 'msg-009',
    senderName: 'Dr. Onyedika Umeh',
    senderInitials: 'OU',
    senderAvatarBg: '#3B82F6',
    department: 'Doctors',
    online: false,
    subject: 'Dental Records Needed',
    preview: 'Could you pull dental history for a patient ahead of surgery?',
    sentAt: atOffset(-1, 15, 10),
    status: 'Read',
    thread: [
      {
        id: 'msg-009-t1',
        from: 'them',
        text: 'Could you pull dental history for a patient ahead of scheduled oral surgery tomorrow?',
        sentAt: atOffset(-1, 15, 10),
        read: true,
      },
    ],
    attachments: [],
    readReceipts: [{ name: 'Mrs. Ngozi Asogwa', seenAt: atOffset(-1, 15, 30) }],
  },
  {
    id: 'msg-010',
    senderName: 'Records Dept.',
    senderInitials: 'R',
    senderAvatarBg: '#22C55E',
    department: 'Records',
    online: false,
    subject: 'Archive Backlog Cleared',
    preview: 'This week’s archive backlog has been fully processed.',
    sentAt: atOffset(-1, 12, 0),
    status: 'Read',
    thread: [
      {
        id: 'msg-010-t1',
        from: 'them',
        text: 'This week’s archive backlog has been fully processed — 12 records moved, 2 restored on request.',
        sentAt: atOffset(-1, 12, 0),
        read: true,
      },
    ],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'msg-011',
    senderName: 'NHIA Insurance',
    senderInitials: 'NH',
    senderAvatarBg: '#4A7080',
    department: 'Administration',
    online: false,
    subject: 'Claim Documentation Follow-up',
    preview: 'Following up on the requested claim documentation.',
    sentAt: atOffset(-1, 10, 30),
    status: 'Read',
    thread: [
      {
        id: 'msg-011-t1',
        from: 'them',
        text: 'Following up on the requested claim documentation for David Osei — any update?',
        sentAt: atOffset(-1, 10, 30),
        read: true,
      },
    ],
    attachments: [],
    readReceipts: [{ name: 'Mrs. Ngozi Asogwa', seenAt: atOffset(-1, 11, 0) }],
  },
  {
    id: 'msg-012',
    senderName: 'Mrs. Ngozi A. (Physiotherapy)',
    senderInitials: 'NA',
    senderAvatarBg: '#F59E0B',
    department: 'Nursing',
    online: true,
    subject: 'Physiotherapy Notes Attached',
    preview: 'Progress notes for this week’s physiotherapy sessions.',
    sentAt: atOffset(-1, 9, 10),
    status: 'Read',
    thread: [
      {
        id: 'msg-012-t1',
        from: 'them',
        text: 'Progress notes for this week’s physiotherapy sessions attached for filing.',
        sentAt: atOffset(-1, 9, 10),
        read: true,
      },
    ],
    attachments: [{ id: 'att-7', name: 'Physio_Notes_Wk28.pdf', sizeKB: 61 }],
    readReceipts: [],
  },
  {
    id: 'msg-013',
    senderName: 'Dr. Mary Uche (Radiology)',
    senderInitials: 'MU',
    senderAvatarBg: '#3B82F6',
    department: 'Doctors',
    online: false,
    subject: 'Imaging Report Ready',
    preview: 'Chest X-ray report is ready for collection.',
    sentAt: atOffset(-2, 14, 0),
    status: 'Read',
    thread: [
      {
        id: 'msg-013-t1',
        from: 'them',
        text: 'Chest X-ray report is ready for collection and has been added to the patient record.',
        sentAt: atOffset(-2, 14, 0),
        read: true,
      },
    ],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'msg-014',
    senderName: 'Pharmacy Dept.',
    senderInitials: 'P',
    senderAvatarBg: '#8B5CF6',
    department: 'Pharmacy',
    online: false,
    subject: 'Controlled Drug Register Audit',
    preview: 'Quarterly controlled drug register audit is due this week.',
    sentAt: atOffset(-2, 11, 20),
    status: 'Read',
    thread: [
      {
        id: 'msg-014-t1',
        from: 'them',
        text: 'Quarterly controlled drug register audit is due this week — please confirm a convenient time.',
        sentAt: atOffset(-2, 11, 20),
        read: true,
      },
    ],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'msg-015',
    senderName: 'Admin Office',
    senderInitials: 'A',
    senderAvatarBg: '#4A7080',
    department: 'Administration',
    online: false,
    subject: 'Staff Training Reminder',
    preview: 'Weekly staff training holds Friday at 2:00 PM.',
    sentAt: atOffset(-3, 9, 0),
    status: 'Read',
    thread: [
      {
        id: 'msg-015-t1',
        from: 'them',
        text: 'Weekly staff training holds Friday at 2:00 PM in the training room. Attendance is compulsory.',
        sentAt: atOffset(-3, 9, 0),
        read: true,
      },
    ],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'msg-016',
    senderName: 'Dr. Ada Chukwu',
    senderInitials: 'AC',
    senderAvatarBg: '#3B82F6',
    department: 'Doctors',
    online: false,
    subject: 'Follow-up Records Request',
    preview: 'Need last three visit summaries ahead of tomorrow’s clinic.',
    sentAt: atOffset(-3, 13, 45),
    status: 'Read',
    thread: [
      {
        id: 'msg-016-t1',
        from: 'them',
        text: 'Need the last three visit summaries pulled ahead of tomorrow’s follow-up clinic.',
        sentAt: atOffset(-3, 13, 45),
        read: true,
      },
    ],
    attachments: [],
    readReceipts: [],
  },
];

// ── Sent ─────────────────────────────────────────────────────────────────────

export const SENT_MESSAGES: InboxMessage[] = [
  {
    id: 'sent-001',
    senderName: 'Dr. Samuel A.',
    senderInitials: 'SA',
    senderAvatarBg: '#3B82F6',
    department: 'Doctors',
    online: true,
    subject: 'Re: Patient in Emergency Room',
    preview: 'Received. I will review and update shortly.',
    sentAt: atOffset(0, 10, 27),
    status: 'Read',
    thread: [],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'sent-002',
    senderName: 'Finance Dept.',
    senderInitials: 'F',
    senderAvatarBg: '#4A7080',
    department: 'Finance',
    online: false,
    subject: 'Records Retrieval Charges — July',
    preview: 'Attached is the itemized retrieval charge sheet for July.',
    sentAt: atOffset(-1, 16, 0),
    status: 'Read',
    thread: [],
    attachments: [{ id: 'att-8', name: 'Retrieval_Charges_Jul.pdf', sizeKB: 88 }],
    readReceipts: [],
  },
  {
    id: 'sent-003',
    senderName: 'Dr. Jane Ezeonu',
    senderInitials: 'JE',
    senderAvatarBg: '#3B82F6',
    department: 'Doctors',
    online: true,
    subject: 'Re: Consultation Request',
    preview: 'Visit history for Clinic 2 has been retrieved and attached.',
    sentAt: atOffset(-1, 8, 0),
    status: 'Read',
    thread: [],
    attachments: [],
    readReceipts: [],
  },
];

// ── Drafts ───────────────────────────────────────────────────────────────────

export const DRAFT_MESSAGES: DraftMessage[] = [
  {
    id: 'draft-001',
    to: 'Dr. Onyedika Umeh',
    subject: 'Re: Dental Records Needed',
    preview: 'Attaching the dental history you requested — please confirm...',
    savedAt: atOffset(0, 9, 5),
  },
  {
    id: 'draft-002',
    to: 'Pharmacy Dept.',
    subject: 'Stock request follow-up',
    preview: 'Following up on last week’s reorder request for...',
    savedAt: atOffset(-1, 14, 20),
  },
  {
    id: 'draft-003',
    to: 'NHIA Insurance',
    subject: 'Claim documentation attached',
    preview: 'Please find attached the requested claim documentation for...',
    savedAt: atOffset(-2, 10, 0),
  },
];

// ── Archived ─────────────────────────────────────────────────────────────────

export const ARCHIVED_MESSAGES: InboxMessage[] = [
  {
    id: 'arc-msg-001',
    senderName: 'Admin Office',
    senderInitials: 'A',
    senderAvatarBg: '#4A7080',
    department: 'Administration',
    online: false,
    subject: 'Q2 Records Audit — Closed',
    preview: 'The Q2 records audit has been closed with no outstanding items.',
    sentAt: atOffset(-40, 9, 0),
    status: 'Archived',
    thread: [],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'arc-msg-002',
    senderName: 'Dr. Ifeanyi Okafor',
    senderInitials: 'IO',
    senderAvatarBg: '#3B82F6',
    department: 'Doctors',
    online: false,
    subject: 'Old Referral Thread',
    preview: 'Referral accepted and completed — thread closed.',
    sentAt: atOffset(-55, 11, 0),
    status: 'Archived',
    thread: [],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'arc-msg-003',
    senderName: 'Finance Dept.',
    senderInitials: 'F',
    senderAvatarBg: '#4A7080',
    department: 'Finance',
    online: false,
    subject: 'Q1 Budget Summary',
    preview: 'Superseded by the Q2 summary — kept for reference only.',
    sentAt: atOffset(-70, 9, 0),
    status: 'Archived',
    thread: [],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'arc-msg-004',
    senderName: 'Laboratory Dept.',
    senderInitials: 'L',
    senderAvatarBg: '#00B4D8',
    department: 'Laboratory',
    online: false,
    subject: 'April Collection Schedule',
    preview: 'Schedule expired — superseded by newer rounds.',
    sentAt: atOffset(-85, 9, 0),
    status: 'Archived',
    thread: [],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'arc-msg-005',
    senderName: 'Pharmacy Dept.',
    senderInitials: 'P',
    senderAvatarBg: '#8B5CF6',
    department: 'Pharmacy',
    online: false,
    subject: 'Stock Update — Resolved',
    preview: 'Reorder completed and stock levels restored.',
    sentAt: atOffset(-95, 9, 0),
    status: 'Archived',
    thread: [],
    attachments: [],
    readReceipts: [],
  },
  {
    id: 'arc-msg-006',
    senderName: 'Nurse Grace',
    senderInitials: 'NG',
    senderAvatarBg: '#F59E0B',
    department: 'Nursing',
    online: false,
    subject: 'Ward 3B Update — Closed',
    preview: 'Patient discharged — no further action needed.',
    sentAt: atOffset(-100, 9, 0),
    status: 'Archived',
    thread: [],
    attachments: [],
    readReceipts: [],
  },
];
