/**
 * Mock fixtures for the Clinical Messages screen.
 * Swap out by pointing hooks to a real messaging endpoint/WebSocket in Phase 6.
 *
 * Timestamps are ISO strings — the UI formats them via src/utils/datetime.ts
 * (24h WAT clock) rather than storing pre-formatted display strings, so the
 * clock format stays correct regardless of when this is viewed.
 */

export type MessageSender = 'me' | 'them';

export type ChatMessage = {
  id: string;
  sender: MessageSender;
  text: string;
  sentAt: string; // ISO
};

export type Conversation = {
  id: string;
  doctorName: string;
  department: string;
  initials: string;
  avatarBg: string;
  online: boolean;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: string; // ISO
  patientContext: { name: string; mrn: string } | null;
  messages: ChatMessage[];
};

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-kemi-okafor',
    doctorName: 'Dr. Kemi Okafor',
    department: 'Dermatology',
    initials: 'KO',
    avatarBg: '#7C3AED',
    online: false,
    unreadCount: 1,
    lastMessagePreview:
      'Please review the dermatology consult notes for Chinwe Okafor before her follow-up.',
    lastMessageAt: '2026-06-30T10:15:00+01:00',
    patientContext: { name: 'Chinwe Okafor', mrn: 'MRN-2024-00467' },
    messages: [
      {
        id: 'kemi-1',
        sender: 'them',
        text: 'Please review the dermatology consult notes for Chinwe Okafor before her follow-up.',
        sentAt: '2026-06-30T10:15:00+01:00',
      },
    ],
  },
  {
    id: 'conv-chidi-anyanwu',
    doctorName: 'Dr. Chidi Anyanwu',
    department: 'Cardiology',
    initials: 'CA',
    avatarBg: '#3B82F6',
    online: true,
    unreadCount: 0,
    lastMessagePreview:
      'I have accepted the referral for Ibrahim Musa. Appointment confirmed: July 3, 2026.',
    lastMessageAt: '2026-06-30T13:18:00+01:00',
    patientContext: { name: 'Ibrahim Musa', mrn: 'MRN-2024-00301' },
    messages: [
      {
        id: 'ca-1',
        sender: 'me',
        text: "Hi Dr. Anyanwu. I'm referring Ibrahim Musa, 20M, for cardiac evaluation. He's been reporting intermittent palpitations over the past 3 months. Baseline ECG here shows sinus rhythm with occasional PVCs. Referral letter attached.",
        sentAt: '2026-06-28T11:00:00+01:00',
      },
      {
        id: 'ca-2',
        sender: 'them',
        text: 'Thank you Dr. Obi. PVCs in a young patient warrant thorough investigation. I’ll arrange a 24-hour Holter monitor and transthoracic echocardiogram. Please advise moderate activity restriction in the interim.',
        sentAt: '2026-06-28T14:30:00+01:00',
      },
      {
        id: 'ca-3',
        sender: 'me',
        text: "Appreciated. He's been cleared of competitive sports for now. I'll advise him at review.",
        sentAt: '2026-06-28T14:45:00+01:00',
      },
      {
        id: 'ca-4',
        sender: 'them',
        text: 'I have accepted the referral for Ibrahim Musa. Appointment confirmed: July 3, 2026 at 10:00, Cardiology OPD Clinic. Please advise the patient to bring all previous ECG tracings and any prior cardiac reports.',
        sentAt: '2026-06-30T13:18:00+01:00',
      },
    ],
  },
  {
    id: 'conv-nkiru-eze',
    doctorName: 'Dr. Nkiru Eze',
    department: 'Neurology',
    initials: 'NE',
    avatarBg: '#0D9488',
    online: true,
    unreadCount: 0,
    lastMessagePreview: 'Please send the CSF result for David Osei as soon as it verifies.',
    lastMessageAt: '2026-06-30T10:22:00+01:00',
    patientContext: { name: 'David Osei', mrn: 'MRN-2024-00398' },
    messages: [
      {
        id: 'nkiru-1',
        sender: 'them',
        text: 'Please send the CSF result for David Osei as soon as it verifies. Meningeal signs were present on my exam.',
        sentAt: '2026-06-30T10:20:00+01:00',
      },
      {
        id: 'nkiru-2',
        sender: 'me',
        text: "Understood — he's on empirical antibiotics pending confirmation. I'll flag it to you the moment it's verified.",
        sentAt: '2026-06-30T10:22:00+01:00',
      },
    ],
  },
  {
    id: 'conv-blessing-obi',
    doctorName: 'Dr. Blessing Obi',
    department: 'Obs & Gynaecology',
    initials: 'BO',
    avatarBg: '#DB2777',
    online: true,
    unreadCount: 0,
    lastMessagePreview:
      "Understood. I'll arrange pelvic USS here. Could you send her last cycle date?",
    lastMessageAt: '2026-06-30T11:00:00+01:00',
    patientContext: null,
    messages: [
      {
        id: 'blessing-1',
        sender: 'me',
        text: 'Referring a patient with severe dysmenorrhea for pelvic ultrasound review — history of recurrent cramping and nausea.',
        sentAt: '2026-06-30T10:55:00+01:00',
      },
      {
        id: 'blessing-2',
        sender: 'them',
        text: "Understood. I'll arrange pelvic USS here. Could you send her last cycle date?",
        sentAt: '2026-06-30T11:00:00+01:00',
      },
    ],
  },
  {
    id: 'conv-emergency-unit',
    doctorName: 'Emergency Unit',
    department: 'Emergency Department',
    initials: 'EU',
    avatarBg: '#EF4444',
    online: true,
    unreadCount: 0,
    lastMessagePreview: 'Latest: SpO2 96% on 2L O2 via nasal prongs. Repeat ABG pending.',
    lastMessageAt: '2026-06-30T11:00:00+01:00',
    patientContext: { name: 'Ngozi Adeyemi', mrn: 'MRN-2024-00512' },
    messages: [
      {
        id: 'eu-1',
        sender: 'them',
        text: 'Latest: SpO2 96% on 2L O2 via nasal prongs. Repeat ABG pending. Cardiology and radiology consults requested.',
        sentAt: '2026-06-30T11:00:00+01:00',
      },
    ],
  },
];

// ── Directory — used by "+ New" to start conversations not yet in the list ──

export type DirectoryDoctor = {
  doctorName: string;
  department: string;
  initials: string;
  avatarBg: string;
  online: boolean;
};

export const MOCK_DOCTOR_DIRECTORY: DirectoryDoctor[] = [
  {
    doctorName: 'Dr. Ijeoma Nwachukwu',
    department: 'Psychiatry',
    initials: 'IN',
    avatarBg: '#F59E0B',
    online: true,
  },
  {
    doctorName: 'Dr. Uche Eze',
    department: 'Orthopaedics',
    initials: 'UE',
    avatarBg: '#6366F1',
    online: false,
  },
];

// ── Quick-insert templates — the toolbar's "template" action ────────────────

export const MESSAGE_TEMPLATES: string[] = [
  'Referral accepted. Appointment confirmed for [date] at [time], [department] OPD Clinic.',
  'Please review the attached results and advise on next steps.',
  'Patient stable, continuing current management plan.',
];
