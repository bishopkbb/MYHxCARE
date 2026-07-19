/**
 * Mock fixtures for the shared Staff Messages screen (chat UI used by every
 * workspace). Swap out by pointing hooks to a real messaging endpoint/WebSocket
 * in Phase 6.
 *
 * Timestamps are ISO strings — the UI formats them via src/utils/datetime.ts
 * (24h WAT clock) rather than storing pre-formatted display strings, so the
 * clock format stays correct regardless of when this is viewed.
 */

import { MOCK_USERS } from '@/features/auth/__mocks__/authFixtures';

export type MessageSender = 'me' | 'them';

export type ChatMessage = {
  id: string;
  sender: MessageSender;
  text: string;
  sentAt: string; // ISO
};

export type Conversation = {
  id: string;
  staffName: string;
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

// ── Directory — every real staff account in the system, used by "+ New" to
// start a conversation with anyone (any workspace, any department) who isn't
// already in the current conversation list. ────────────────────────────────

export type DirectoryStaff = {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  role: string;
  department: string;
  online: boolean;
};

const AVATAR_PALETTE = [
  '#3B82F6',
  '#7C3AED',
  '#0D9488',
  '#DB2777',
  '#F59E0B',
  '#6366F1',
  '#22C55E',
  '#EF4444',
  '#8B5CF6',
  '#00B4D8',
  '#EC4899',
  '#14B8A6',
];

const HONORIFICS = new Set(['dr.', 'mr.', 'mrs.', 'miss', 'ms.', 'prof.']);

function initialsOf(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => !HONORIFICS.has(p.toLowerCase()));
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export const STAFF_DIRECTORY: DirectoryStaff[] = MOCK_USERS.map((u, i) => ({
  id: u.id,
  name: u.name,
  initials: initialsOf(u.name),
  avatarBg: AVATAR_PALETTE[i % AVATAR_PALETTE.length] as string,
  role: u.role,
  department: u.department ?? u.role,
  online: i % 3 !== 0,
}));

export function getDirectoryExcluding(selfId: string): DirectoryStaff[] {
  return STAFF_DIRECTORY.filter((s) => s.id !== selfId);
}

// ── Seeded conversations — deterministic per logged-in user, so every login
// sees a populated inbox regardless of who's signed in. ─────────────────────

function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h, 0, 0, 0);
  return d.toISOString();
}

const SEED_EXCHANGES: { first: string; reply: string }[] = [
  {
    first:
      'Hi — could you review the latest chart update for our shared patient when you get a chance?',
    reply: 'Sure, I’ll take a look this afternoon and follow up with you.',
  },
  {
    first: 'Quick question on the handover — is the patient still on the current management plan?',
    reply: 'Yes, no changes since this morning’s round.',
  },
  {
    first: 'Could you confirm availability for a joint review tomorrow?',
    reply: 'Tomorrow works — I’ll block 30 minutes after 10am.',
  },
  {
    first: 'Sending over the referral notes now — let me know if anything’s missing.',
    reply: 'Got it, thank you. Looks complete on my end.',
  },
];

export function buildSeedConversations(selfId: string): Conversation[] {
  const others = getDirectoryExcluding(selfId).slice(0, 4);
  return others.map((staff, i): Conversation => {
    const exchange = SEED_EXCHANGES[i % SEED_EXCHANGES.length]!;
    const firstAt = hoursAgo((others.length - i) * 3 + 1);
    const replyAt = hoursAgo((others.length - i) * 3);
    const messages: ChatMessage[] = [
      { id: `${staff.id}-1`, sender: 'me', text: exchange.first, sentAt: firstAt },
      { id: `${staff.id}-2`, sender: 'them', text: exchange.reply, sentAt: replyAt },
    ];
    return {
      id: `conv-${staff.id}`,
      staffName: staff.name,
      department: staff.department,
      initials: staff.initials,
      avatarBg: staff.avatarBg,
      online: staff.online,
      unreadCount: i === 0 ? 1 : 0,
      lastMessagePreview: exchange.reply,
      lastMessageAt: replyAt,
      patientContext: null,
      messages,
    };
  });
}

// ── Quick-insert templates — the toolbar's "template" action ────────────────

export const MESSAGE_TEMPLATES: string[] = [
  'Referral accepted. Appointment confirmed for [date] at [time], [department] OPD Clinic.',
  'Please review the attached results and advise on next steps.',
  'Patient stable, continuing current management plan.',
];
