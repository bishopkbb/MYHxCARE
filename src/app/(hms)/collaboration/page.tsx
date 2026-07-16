'use client';

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  FileText,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Stethoscope,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { formatTime } from '@/utils/datetime';
import {
  MESSAGE_TEMPLATES,
  MOCK_CONVERSATIONS,
  MOCK_DOCTOR_DIRECTORY,
  type ChatMessage,
  type Conversation,
  type DirectoryDoctor,
} from '@/features/messages/__mocks__/messageFixtures';
import { MOCK_PATIENTS, type PatientRecord } from '@/features/patients/__mocks__/patientFixtures';

const WAT_TZ = 'Africa/Lagos';
const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** "28 Jun" — WAT-pinned, assembled from explicit parts (never en-US). A fixed
 * calendar label rather than the relative word "Today" so it never goes stale. */
function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: WAT_TZ, day: '2-digit' }).format(d);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone: WAT_TZ, month: 'short' }).format(d);
  return `${day} ${month}`;
}

function groupMessagesByDay(
  messages: ChatMessage[],
): { dayLabel: string; messages: ChatMessage[] }[] {
  const groups: { dayLabel: string; messages: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const label = formatDayLabel(msg.sentAt);
    const last = groups[groups.length - 1];
    if (last && last.dayLabel === label) last.messages.push(msg);
    else groups.push({ dayLabel: label, messages: [msg] });
  }
  return groups;
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({
  initials,
  bg,
  online,
  size = 40,
}: {
  initials: string;
  bg: string;
  online?: boolean;
  size?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-sans font-medium text-white"
        style={{ background: bg, fontSize: 14 }}
      >
        {initials}
      </div>
      {online && (
        <span
          className="absolute right-0 bottom-0 rounded-full"
          style={{
            width: Math.max(10, size * 0.28),
            height: Math.max(10, size * 0.28),
            background: '#22C55E',
            border: '2px solid #FFFFFF',
          }}
        />
      )}
    </div>
  );
}

// ── Skeletons ──────────────────────────────────────────────────────────────────

function SkeletonConversationRow() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
        <div className="h-3.5 w-44 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function SkeletonBubble({ align }: { align: 'left' | 'right' }) {
  return (
    <div className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      <div className="h-16 w-64 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CollaborationPage() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeId, setActiveId] = useState(MOCK_CONVERSATIONS[1]!.id);
  const [search, setSearch] = useState('');
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [draft, setDraft] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');

  const newMenuRef = useRef<HTMLDivElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0]!;

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.doctorName.toLowerCase().includes(q) || c.department.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  // Close popovers on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node))
        setNewMenuOpen(false);
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node))
        setChatMenuOpen(false);
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node))
        setTemplateMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Demo typing-indicator cycle for the active conversation — shows the
  // roaming gradient border, then hides, on repeat, so the effect is
  // actually visible rather than a permanent fixture.
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    function cycle(delay: number, next: boolean) {
      timeoutId = setTimeout(() => {
        if (!mounted) return;
        setIsOtherTyping(next);
        cycle(next ? 4000 : 9000, !next);
      }, delay);
    }
    cycle(6000, true);
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      // Resets on unmount and right before the next run (activeId change) —
      // avoids a synchronous setState in the effect body.
      setIsOtherTyping(false);
    };
  }, [activeId]);

  // Auto-scroll to the newest message / typing indicator.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeId, activeConversation.messages.length, isOtherTyping]);

  function selectConversation(id: string) {
    setActiveId(id);
    setShowChatOnMobile(true);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
  }

  function handleSend() {
    const text = draft.trim();
    if (!text && !attachedFileName) return;
    const finalText = attachedFileName ? `${text ? `${text}\n` : ''}📎 ${attachedFileName}` : text;
    const newMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      sender: 'me',
      text: finalText,
      sentAt: new Date().toISOString(),
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessagePreview: finalText,
              lastMessageAt: newMsg.sentAt,
            }
          : c,
      ),
    );
    setDraft('');
    setAttachedFileName(null);
    if (textareaRef.current) textareaRef.current.style.height = '42px';
  }

  function handleDraftKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleDraftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(120, Math.max(42, el.scrollHeight))}px`;
  }

  function insertTemplate(template: string) {
    setDraft((prev) => (prev ? `${prev}\n${template}` : template));
    setTemplateMenuOpen(false);
    textareaRef.current?.focus();
  }

  function insertPatientContext() {
    if (!activeConversation.patientContext) {
      // Nothing to reference yet — send the doctor straight to the picker
      // instead of a dead-end toast.
      openPatientPicker();
      return;
    }
    const { name, mrn } = activeConversation.patientContext;
    setDraft((prev) => `Re: ${name} · ${mrn} — ${prev}`);
    textareaRef.current?.focus();
  }

  function openPatientPicker() {
    setChatMenuOpen(false);
    setPatientSearch('');
    setPatientPickerOpen(true);
  }

  function linkPatientContext(patient: PatientRecord) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, patientContext: { name: patient.name, mrn: patient.mrn } }
          : c,
      ),
    );
    setPatientPickerOpen(false);
    toast.success('Patient context linked', `${patient.name} is now linked to this conversation.`);
  }

  function removePatientContext() {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, patientContext: null } : c)),
    );
    setChatMenuOpen(false);
    setPatientPickerOpen(false);
    toast.info('Patient context removed', 'This conversation is no longer linked to a patient.');
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAttachedFileName(file.name);
    e.target.value = '';
  }

  function handleCall() {
    toast.info(
      `Calling ${activeConversation.doctorName}…`,
      'Voice calls connect through the MYHxCare desktop app.',
    );
  }

  function toggleMute() {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(activeConversation.id)) next.delete(activeConversation.id);
      else next.add(activeConversation.id);
      return next;
    });
    setChatMenuOpen(false);
  }

  function markAsUnread() {
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, unreadCount: 1 } : c)),
    );
    setChatMenuOpen(false);
  }

  function startNewConversation(doctor: DirectoryDoctor) {
    const existing = conversations.find((c) => c.doctorName === doctor.doctorName);
    if (existing) {
      selectConversation(existing.id);
      setNewMenuOpen(false);
      return;
    }
    const id = `conv-${doctor.doctorName.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    const newConv: Conversation = {
      id,
      doctorName: doctor.doctorName,
      department: doctor.department,
      initials: doctor.initials,
      avatarBg: doctor.avatarBg,
      online: doctor.online,
      unreadCount: 0,
      lastMessagePreview: 'No messages yet',
      lastMessageAt: new Date().toISOString(),
      patientContext: null,
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    selectConversation(id);
    setNewMenuOpen(false);
    toast.success('Conversation started', `You can now message ${doctor.doctorName}.`);
  }

  const hasActiveSearch = search.trim().length > 0;
  const messageGroups = groupMessagesByDay(activeConversation.messages);
  const directoryAvailable = MOCK_DOCTOR_DIRECTORY.filter(
    (d) => !conversations.some((c) => c.doctorName === d.doctorName),
  );

  const filteredPatientPicker = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return MOCK_PATIENTS;
    return MOCK_PATIENTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q),
    );
  }, [patientSearch]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex flex-1 overflow-hidden" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 gap-4 overflow-hidden p-4 sm:gap-5 sm:p-6">
          {/* ══ CONVERSATION LIST ══════════════════════════════════════════ */}
          <div
            className={`flex w-full flex-col overflow-hidden lg:w-[380px] lg:shrink-0 ${
              showChatOnMobile ? 'hidden lg:flex' : 'flex'
            }`}
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,180,216,0.28)',
              borderRadius: 12,
            }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-5">
              <h1
                className="font-sans font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#25464D' }}
              >
                Clinical Messages
              </h1>
              <div className="relative" ref={newMenuRef}>
                <button
                  type="button"
                  onClick={() => setNewMenuOpen((v) => !v)}
                  aria-expanded={newMenuOpen}
                  className={`flex items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ height: 36, background: '#00B4D8', fontSize: 14, lineHeight: '22px' }}
                >
                  <Plus style={{ width: 16, height: 16 }} />
                  New
                </button>
                {newMenuOpen && (
                  <div
                    className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
                    style={{
                      border: '1px solid rgba(0,100,130,0.15)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                    }}
                  >
                    <p
                      className="px-4 pt-1 pb-2 font-sans font-semibold"
                      style={{ fontSize: 14, color: '#8A98A3' }}
                    >
                      Start a conversation
                    </p>
                    {directoryAvailable.length === 0 ? (
                      <p className="px-4 py-2 font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                        You&apos;re already messaging every available doctor.
                      </p>
                    ) : (
                      directoryAvailable.map((doctor) => (
                        <button
                          key={doctor.doctorName}
                          type="button"
                          onClick={() => startNewConversation(doctor)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                        >
                          <Avatar
                            initials={doctor.initials}
                            bg={doctor.avatarBg}
                            online={doctor.online}
                            size={32}
                          />
                          <span>
                            <span
                              className="block font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {doctor.doctorName}
                            </span>
                            <span
                              className="block font-sans"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              {doctor.department}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="shrink-0 px-4 pb-3 sm:px-5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search doctors or departments…"
                  className={`h-[42px] w-full rounded-[12px] pr-4 pl-9 font-sans outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
                  style={{
                    background: '#F5FBFD',
                    border: '1px solid #0064821F',
                    color: '#2F3A40',
                    fontSize: 14,
                    lineHeight: '22px',
                  }}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto scroll-smooth">
              {pageState === 'loading' &&
                Array.from({ length: 5 }).map((_, i) => <SkeletonConversationRow key={i} />)}

              {pageState === 'error' && (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                  <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Failed to load conversations
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className={`flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                    style={{
                      height: 40,
                      borderRadius: 12,
                      padding: '0 20px',
                      background: '#00B4D8',
                      fontSize: 14,
                    }}
                  >
                    <RefreshCw style={{ width: 16, height: 16 }} />
                    Retry
                  </button>
                </div>
              )}

              {pageState === 'loaded' && filteredConversations.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Search style={{ width: 22, height: 22, color: '#8A98A3' }} />
                  </div>
                  <div>
                    <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                      No conversations found
                    </p>
                    <p className="mt-0.5 font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Try a different doctor name or department
                    </p>
                  </div>
                  {hasActiveSearch && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className={`mt-1 font-sans font-semibold transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                      style={{ fontSize: 14, color: '#00B4D8' }}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}

              {pageState === 'loaded' &&
                filteredConversations.map((c) => {
                  const isActive = c.id === activeId;
                  const isUnread = c.unreadCount > 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectConversation(c.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 sm:px-5 ${FOCUS_RING}`}
                      style={{
                        background: isActive ? '#E6F8FD' : 'transparent',
                        borderLeft: isActive ? '3px solid #00B4D8' : '3px solid transparent',
                        borderBottom: '1px solid rgba(0,100,130,0.08)',
                      }}
                    >
                      <Avatar initials={c.initials} bg={c.avatarBg} online={c.online} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="truncate font-sans font-semibold"
                            style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                          >
                            {c.doctorName}
                          </span>
                          <span
                            className="shrink-0 font-sans"
                            style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
                          >
                            {formatTime(c.lastMessageAt)}
                          </span>
                        </div>
                        <p
                          className="truncate font-sans"
                          style={{ fontSize: 14, lineHeight: '20px', color: '#4A7080' }}
                        >
                          {c.department}
                        </p>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p
                            className="truncate font-sans"
                            style={{
                              fontSize: 14,
                              lineHeight: '22px',
                              color: isUnread ? '#25464D' : '#4A7080',
                              fontWeight: isUnread ? 500 : 400,
                            }}
                          >
                            {c.lastMessagePreview}
                          </p>
                          {isUnread && (
                            <span
                              className="flex shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                              style={{ width: 22, height: 22, background: '#00B4D8', fontSize: 14 }}
                            >
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* ══ CHAT PANE ═══════════════════════════════════════════════════ */}
          <div
            className={`flex min-w-0 flex-1 flex-col overflow-hidden ${
              showChatOnMobile ? 'flex' : 'hidden lg:flex'
            }`}
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,180,216,0.28)',
              borderRadius: 12,
            }}
          >
            {pageState !== 'loaded' ? (
              <div className="flex flex-1 flex-col">
                <div
                  className="flex shrink-0 items-center gap-3 px-4 py-3 sm:px-5"
                  style={{ borderBottom: '1px solid #0064821F' }}
                >
                  <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
                    <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-end gap-3 p-5">
                  <SkeletonBubble align="left" />
                  <SkeletonBubble align="right" />
                  <SkeletonBubble align="left" />
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div
                  className="flex shrink-0 items-center gap-3 px-4 py-3 sm:px-5"
                  style={{ borderBottom: '1px solid #0064821F' }}
                >
                  <button
                    type="button"
                    onClick={() => setShowChatOnMobile(false)}
                    aria-label="Back to Messages"
                    className={`flex size-11 shrink-0 items-center justify-center lg:hidden ${FOCUS_RING}`}
                  >
                    <ChevronLeft style={{ width: 20, height: 20, color: '#4A7080' }} />
                  </button>
                  <Avatar
                    initials={activeConversation.initials}
                    bg={activeConversation.avatarBg}
                    online={activeConversation.online}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-sans font-semibold"
                      style={{ fontSize: 16, lineHeight: '24px', color: '#0D2630' }}
                    >
                      {activeConversation.doctorName}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="truncate font-sans"
                        style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                      >
                        {activeConversation.department}
                      </span>
                      {activeConversation.online && (
                        <>
                          <span
                            className="shrink-0 rounded-full"
                            style={{ width: 6, height: 6, background: '#22C55E' }}
                          />
                          <span
                            className="shrink-0 font-sans font-semibold"
                            style={{ fontSize: 14, color: '#22C55E' }}
                          >
                            Online
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCall}
                    aria-label={`Call ${activeConversation.doctorName}`}
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                  >
                    <Phone style={{ width: 20, height: 20, color: '#4A7080' }} />
                  </button>
                  <div className="relative shrink-0" ref={chatMenuRef}>
                    <button
                      type="button"
                      onClick={() => setChatMenuOpen((v) => !v)}
                      aria-expanded={chatMenuOpen}
                      aria-label="More conversation actions"
                      className={`flex size-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    >
                      <MoreVertical style={{ width: 20, height: 20, color: '#4A7080' }} />
                    </button>
                    {chatMenuOpen && (
                      <div
                        className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
                        style={{
                          border: '1px solid rgba(0,100,130,0.15)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={toggleMute}
                          className={`flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#2F3A40' }}
                        >
                          {mutedIds.has(activeConversation.id)
                            ? 'Unmute conversation'
                            : 'Mute conversation'}
                        </button>
                        <button
                          type="button"
                          onClick={markAsUnread}
                          className={`flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#2F3A40' }}
                        >
                          Mark as unread
                        </button>
                        <div className="my-1 h-px" style={{ background: 'rgba(0,100,130,0.08)' }} />
                        <button
                          type="button"
                          onClick={openPatientPicker}
                          className={`flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#2F3A40' }}
                        >
                          {activeConversation.patientContext
                            ? 'Change patient context'
                            : 'Add patient context'}
                        </button>
                        {activeConversation.patientContext && (
                          <button
                            type="button"
                            onClick={removePatientContext}
                            className={`flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] ${FOCUS_RING}`}
                            style={{ fontSize: 14, color: '#EF4444' }}
                          >
                            Remove patient context
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Patient context strip — click to change the linked patient */}
                {activeConversation.patientContext && (
                  <button
                    type="button"
                    onClick={openPatientPicker}
                    className={`group flex shrink-0 items-center gap-2 px-4 py-2 text-left transition-colors duration-150 hover:bg-[#F0FBFE] sm:px-5 ${FOCUS_RING}`}
                    style={{ background: '#FAFAFA', borderBottom: '1px solid #0064821F' }}
                  >
                    <Stethoscope
                      style={{ width: 15, height: 15, color: '#00B4D8', flexShrink: 0 }}
                    />
                    <p
                      className="min-w-0 flex-1 truncate font-sans"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
                    >
                      Patient context: {activeConversation.patientContext.name} ·{' '}
                      {activeConversation.patientContext.mrn}
                    </p>
                    <ChevronDown
                      className="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      style={{ width: 14, height: 14, color: '#00B4D8' }}
                    />
                  </button>
                )}
                {!activeConversation.patientContext && (
                  <button
                    type="button"
                    onClick={openPatientPicker}
                    className={`flex shrink-0 items-center gap-2 px-4 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] sm:px-5 ${FOCUS_RING}`}
                    style={{ background: '#FAFAFA', borderBottom: '1px solid #0064821F' }}
                  >
                    <Stethoscope
                      style={{ width: 15, height: 15, color: '#8A98A3', flexShrink: 0 }}
                    />
                    <p
                      className="font-sans"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#8A98A3' }}
                    >
                      + Add patient context
                    </p>
                  </button>
                )}

                {/* Message thread */}
                <div className="flex-1 overflow-y-auto scroll-smooth px-4 py-4 sm:px-5">
                  {activeConversation.messages.length === 0 && !isOtherTyping && (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Send style={{ width: 22, height: 22, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No messages yet
                      </p>
                      <p className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Say hello to {activeConversation.doctorName}
                      </p>
                    </div>
                  )}

                  {messageGroups.map((group) => (
                    <div key={group.dayLabel} className="mb-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div
                          className="h-px flex-1"
                          style={{ background: 'rgba(0,100,130,0.12)' }}
                        />
                        <span
                          className="shrink-0 font-sans font-medium"
                          style={{ fontSize: 14, lineHeight: '18px', color: '#4A7080' }}
                        >
                          {group.dayLabel}
                        </span>
                        <div
                          className="h-px flex-1"
                          style={{ background: 'rgba(0,100,130,0.12)' }}
                        />
                      </div>
                      <div className="flex flex-col gap-4">
                        {group.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'items-end gap-2'}`}
                          >
                            {msg.sender === 'them' && (
                              <Avatar
                                initials={activeConversation.initials}
                                bg={activeConversation.avatarBg}
                                size={32}
                              />
                            )}
                            <div
                              className="flex flex-col"
                              style={{
                                alignItems: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                              }}
                            >
                              {msg.sender === 'them' && (
                                <p
                                  className="mb-1 font-sans font-medium"
                                  style={{ fontSize: 14, color: '#25464D' }}
                                >
                                  {activeConversation.doctorName}
                                </p>
                              )}
                              <div
                                className="font-sans whitespace-pre-line"
                                style={{
                                  maxWidth: 420,
                                  padding: '10px 16px',
                                  fontSize: 14,
                                  lineHeight: '22px',
                                  color: msg.sender === 'me' ? '#FFFFFF' : '#0D2630',
                                  background: msg.sender === 'me' ? '#00B4D8' : '#FFFFFF',
                                  boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.10)',
                                  borderTopLeftRadius: 16,
                                  borderTopRightRadius: 16,
                                  borderBottomRightRadius: msg.sender === 'me' ? 4 : 16,
                                  borderBottomLeftRadius: msg.sender === 'me' ? 16 : 4,
                                }}
                              >
                                {msg.text}
                              </div>
                              <p
                                className="mt-1 font-sans"
                                style={{ fontSize: 14, lineHeight: '18px', color: '#4A7080' }}
                              >
                                {formatTime(msg.sentAt)}
                                {msg.sender === 'me' ? ' · Sent' : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator — roaming brand-gradient border while active */}
                  {isOtherTyping && (
                    <div className="mt-2 flex items-end gap-2">
                      <Avatar
                        initials={activeConversation.initials}
                        bg={activeConversation.avatarBg}
                        size={32}
                      />
                      <div
                        className="typing-gradient-border"
                        style={{ padding: 1.5, borderRadius: '4px 16px 16px 16px' }}
                      >
                        <div
                          className="relative z-[1] flex items-center gap-1.5 px-4 py-3"
                          style={{ borderRadius: 'inherit' }}
                        >
                          {[0, 0.22, 0.44].map((delay, i) => (
                            <span
                              key={i}
                              className="cs-dot rounded-full"
                              style={{
                                width: 6,
                                height: 6,
                                background: '#4A7080',
                                animationDelay: `${delay}s`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Attached file chip */}
                {attachedFileName && (
                  <div
                    className="mx-4 mb-2 flex items-center gap-2 rounded-[10px] px-3 py-2 sm:mx-5"
                    style={{ background: '#E6F8FD', border: '1px solid rgba(0,180,216,0.3)' }}
                  >
                    <Paperclip style={{ width: 14, height: 14, color: '#00B4D8', flexShrink: 0 }} />
                    <span
                      className="min-w-0 flex-1 truncate font-sans"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {attachedFileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachedFileName(null)}
                      aria-label="Remove attachment"
                      className={`relative flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150 before:absolute before:-inset-2.5 before:content-[''] hover:bg-white ${FOCUS_RING}`}
                    >
                      <X style={{ width: 14, height: 14, color: '#4A7080' }} />
                    </button>
                  </div>
                )}

                {/* Input row — icons and composer stack on mobile so the
                    textarea/send pair gets its own full-width breathing
                    room; sm+ keeps them inline as a single row. */}
                <div
                  className="flex shrink-0 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-end sm:px-5"
                  style={{ borderTop: '1px solid #0064821F' }}
                >
                  <div className="flex shrink-0 items-center gap-1 sm:pb-1">
                    <div className="relative" ref={templateMenuRef}>
                      <button
                        type="button"
                        onClick={() => setTemplateMenuOpen((v) => !v)}
                        aria-expanded={templateMenuOpen}
                        aria-label="Insert message template"
                        className={`flex size-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                      >
                        <FileText style={{ width: 18, height: 18, color: '#4A7080' }} />
                      </button>
                      {templateMenuOpen && (
                        <div
                          className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 absolute bottom-full left-0 z-30 mb-1.5 w-72 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
                          style={{
                            border: '1px solid rgba(0,100,130,0.15)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                          }}
                        >
                          {MESSAGE_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl}
                              type="button"
                              onClick={() => insertTemplate(tpl)}
                              className={`block w-full px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                              style={{ fontSize: 14, color: '#2F3A40' }}
                            >
                              {tpl}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={insertPatientContext}
                      aria-label="Insert patient context"
                      className={`flex size-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    >
                      <Stethoscope style={{ width: 18, height: 18, color: '#4A7080' }} />
                    </button>
                    <button
                      type="button"
                      onClick={handleAttachClick}
                      aria-label="Attach a file"
                      className={`flex size-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    >
                      <Paperclip style={{ width: 18, height: 18, color: '#4A7080' }} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelected}
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={handleDraftChange}
                      onKeyDown={handleDraftKeyDown}
                      rows={1}
                      placeholder={`Message ${activeConversation.doctorName}… (Enter to send · Shift+Enter for new line)`}
                      className={`min-w-0 flex-1 resize-none rounded-[12px] px-3.5 py-2.5 font-sans outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
                      style={{
                        background: '#E6F8FD',
                        color: '#0D2630',
                        fontSize: 14,
                        lineHeight: '22px',
                        minHeight: 42,
                        maxHeight: 120,
                      }}
                    />

                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!draft.trim() && !attachedFileName}
                      aria-label="Send message"
                      className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                      style={{ background: '#00B4D8' }}
                    >
                      <Send style={{ width: 18, height: 18, color: '#FFFFFF' }} />
                    </button>
                  </div>
                </div>

                {/* Governance footer */}
                <p
                  className="shrink-0 pb-3 text-center font-sans"
                  style={{ fontSize: 14, color: '#8A98A3' }}
                >
                  🔒 Secure clinical messaging · All messages are audit-logged per MYHxCare
                  governance policy
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ══ Patient context picker ═════════════════════════════════════════ */}
      {patientPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(13,38,48,0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPatientPickerOpen(false);
          }}
        >
          <div
            className="animate-in fade-in-0 zoom-in-95 flex w-full flex-col overflow-hidden bg-white duration-150"
            style={{ maxWidth: 460, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
          >
            {/* Header */}
            <div
              className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
              style={{ borderBottom: '1px solid #0064821F' }}
            >
              <div className="min-w-0">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
                >
                  {activeConversation.patientContext
                    ? 'Change Patient Context'
                    : 'Link Patient Context'}
                </h2>
                <p
                  className="mt-0.5 truncate font-sans"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  For your conversation with {activeConversation.doctorName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPatientPickerOpen(false)}
                aria-label="Close"
                className={`shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
              >
                <X style={{ width: 20, height: 20, color: '#4A7080' }} />
              </button>
            </div>

            {/* Search */}
            <div className="shrink-0 px-6 pt-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                />
                <input
                  type="text"
                  autoFocus
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Search by name or MRN…"
                  className={`h-[42px] w-full rounded-[12px] pr-4 pl-9 font-sans outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
                  style={{
                    background: '#F5FBFD',
                    border: '1px solid #0064821F',
                    color: '#2F3A40',
                    fontSize: 14,
                    lineHeight: '22px',
                  }}
                />
              </div>
            </div>

            {/* Patient list */}
            <div className="flex-1 overflow-y-auto scroll-smooth px-2 py-3">
              {filteredPatientPicker.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <div
                    className="flex size-12 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Search style={{ width: 18, height: 18, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No patients match your search
                  </p>
                </div>
              ) : (
                filteredPatientPicker.map((patient) => {
                  const isCurrent = activeConversation.patientContext?.mrn === patient.mrn;
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => linkPatientContext(patient)}
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                      style={{ background: isCurrent ? '#E6F8FD' : 'transparent' }}
                    >
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-medium text-white"
                        style={{ background: patient.avatarBg, fontSize: 14 }}
                      >
                        {patient.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {patient.name}
                        </p>
                        <p
                          className="truncate font-sans"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {patient.mrn} · {patient.meta}
                        </p>
                      </div>
                      {isCurrent && (
                        <Check style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {activeConversation.patientContext && (
              <div
                className="flex shrink-0 items-center justify-between gap-3 px-6 py-4"
                style={{ borderTop: '1px solid #0064821F' }}
              >
                <button
                  type="button"
                  onClick={removePatientContext}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#EF4444' }}
                >
                  Remove current context
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
