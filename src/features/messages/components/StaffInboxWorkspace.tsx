'use client';

import {
  Archive,
  ChevronLeft,
  Download,
  Edit3,
  Filter,
  Mail,
  MailWarning,
  MoreVertical,
  Paperclip,
  Send as SendIcon,
  Smile,
  Trash2,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  ARCHIVED_MESSAGES,
  DEPARTMENT_CFG,
  DRAFT_MESSAGES,
  INBOX_MESSAGES,
  SENT_MESSAGES,
  type InboxMessage,
  type StaffDepartment,
  type ThreadMessage,
} from '@/features/messages/__mocks__/staffInboxFixtures';

const ComposeMessageModal = dynamic(
  () => import('./ComposeMessageModal').then((m) => m.ComposeMessageModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type Tab = 'Inbox' | 'Sent' | 'Drafts' | 'Archived';
const ROWS_PER_PAGE = 8;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function DeptBadge({ department }: { department: StaffDepartment }) {
  const cfg = DEPARTMENT_CFG[department];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
      style={{
        fontSize: 14,
        whiteSpace: 'nowrap',
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {department}
    </span>
  );
}

export function StaffInboxWorkspace() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('Inbox');
  const [inbox, setInbox] = useState<InboxMessage[]>(INBOX_MESSAGES);
  const [archived, setArchived] = useState<InboxMessage[]>(ARCHIVED_MESSAGES);
  const [search, setSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const listForTab: InboxMessage[] =
    tab === 'Inbox' ? inbox : tab === 'Sent' ? SENT_MESSAGES : archived;

  const staffOptions = useMemo(
    () =>
      Array.from(new Set(listForTab.map((m) => m.senderName))).map((n) => ({ value: n, label: n })),
    [listForTab],
  );
  const deptOptions = useMemo(
    () =>
      Array.from(new Set(listForTab.map((m) => m.department))).map((d) => ({ value: d, label: d })),
    [listForTab],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listForTab.filter((m) => {
      if (staffFilter && m.senderName !== staffFilter) return false;
      if (deptFilter && m.department !== deptFilter) return false;
      if (q && !m.subject.toLowerCase().includes(q) && !m.senderName.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [listForTab, search, staffFilter, deptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const selected = listForTab.find((m) => m.id === selectedId) ?? null;

  const counts = {
    inbox: inbox.length,
    unread: inbox.filter((m) => m.status === 'Unread').length,
    sent: SENT_MESSAGES.length,
    drafts: DRAFT_MESSAGES.length,
    archived: archived.length,
  };

  function switchTab(next: Tab) {
    setTab(next);
    setCurrentPage(1);
    setSearch('');
    setStaffFilter('');
    setDeptFilter('');
    setSelectedId(null);
    setShowDetailOnMobile(false);
  }

  function resetFilters() {
    setSearch('');
    setStaffFilter('');
    setDeptFilter('');
    setCurrentPage(1);
    toast.info('Filters cleared', 'Showing every message in this tab.');
  }

  function openMessage(m: InboxMessage) {
    setSelectedId(m.id);
    setShowDetailOnMobile(true);
    setMoreMenuOpen(false);
    if (tab === 'Inbox' && m.status === 'Unread') {
      setInbox((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: 'Read' } : x)));
    }
  }

  function handleArchive(id: string) {
    const msg = inbox.find((m) => m.id === id);
    if (!msg) return;
    setInbox((prev) => prev.filter((m) => m.id !== id));
    setArchived((prev) => [{ ...msg, status: 'Archived' }, ...prev]);
    setSelectedId(null);
    setShowDetailOnMobile(false);
    setMoreMenuOpen(false);
    toast.success('Message archived', `"${msg.subject}" moved to Archived.`);
  }

  function handleMarkUnread(id: string) {
    setInbox((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'Unread' } : m)));
    setMoreMenuOpen(false);
    toast.info('Marked as unread', 'This message will show as unread in your inbox.');
  }

  function handleDelete(id: string) {
    setInbox((prev) => prev.filter((m) => m.id !== id));
    setSelectedId(null);
    setShowDetailOnMobile(false);
    setMoreMenuOpen(false);
    toast.success('Message deleted', 'The message has been removed from your inbox.');
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAttachedFileName(file.name);
    e.target.value = '';
  }

  function insertEmoji() {
    setReply((prev) => `${prev}🙂`);
  }

  function clearDraft() {
    setReply('');
    setAttachedFileName(null);
  }

  function handleSendReply() {
    if (!selected || (!reply.trim() && !attachedFileName)) return;
    const text = attachedFileName
      ? `${reply.trim() ? `${reply.trim()}\n` : ''}📎 ${attachedFileName}`
      : reply.trim();
    const newMsg: ThreadMessage = {
      id: `reply-${Date.now()}`,
      from: 'me',
      text,
      sentAt: new Date().toISOString(),
      read: true,
    };
    const applyReply = (list: InboxMessage[]) =>
      list.map((m) => (m.id === selected.id ? { ...m, thread: [...m.thread, newMsg] } : m));
    if (tab === 'Inbox') setInbox(applyReply);
    else if (tab === 'Archived') setArchived(applyReply);
    setReply('');
    setAttachedFileName(null);
    toast.success('Reply sent', `Your reply to ${selected.senderName} has been sent.`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Messages
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Internal communication across all departments and staff.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              {
                label: 'Inbox',
                value: counts.inbox,
                icon: Mail,
                color: '#00B4D8',
                bg: 'rgba(0,180,216,0.12)',
              },
              {
                label: 'Unread Messages',
                value: counts.unread,
                icon: MailWarning,
                color: '#EF4444',
                bg: 'rgba(239,68,68,0.12)',
              },
              {
                label: 'Sent',
                value: counts.sent,
                icon: SendIcon,
                color: '#22C55E',
                bg: 'rgba(34,197,94,0.12)',
              },
              {
                label: 'Drafts',
                value: counts.drafts,
                icon: Edit3,
                color: '#F59E0B',
                bg: 'rgba(245,158,11,0.12)',
              },
              {
                label: 'Archived',
                value: counts.archived,
                icon: Archive,
                color: '#8B5CF6',
                bg: 'rgba(139,92,246,0.12)',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: s.bg }}
                  >
                    <s.icon style={{ width: 16, height: 16, color: s.color }} />
                  </div>
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {s.label}
                  </p>
                </div>
                <p
                  className="font-display mt-2 font-semibold"
                  style={{ fontSize: 26, color: '#0D2630' }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
            {/* ══ LIST PANE ══════════════════════════════════════════════ */}
            <div className={`min-w-0 flex-1 ${showDetailOnMobile ? 'hidden xl:block' : 'block'}`}>
              <div className="overflow-x-auto scroll-smooth">
                <div
                  className="flex gap-1"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {(['Inbox', 'Sent', 'Drafts', 'Archived'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => switchTab(t)}
                      className="shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: tab === t ? '#00B4D8' : '#4A7080',
                        borderBottom: tab === t ? '2px solid #00B4D8' : '2px solid transparent',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="mt-4 rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                {tab === 'Drafts' ? (
                  <>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setComposeOpen(true)}
                        className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        <Edit3 style={{ width: 15, height: 15 }} />
                        Compose Message
                      </button>
                    </div>
                    <div className="mt-4 flex flex-col gap-2.5">
                      {DRAFT_MESSAGES.map((d) => (
                        <div
                          key={d.id}
                          className="rounded-[10px] px-4 py-3"
                          style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              To: {d.to}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatHumanDate(d.savedAt)}
                            </p>
                          </div>
                          <p
                            className="mt-1 font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {d.subject}
                          </p>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {d.preview}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search messages..."
                        className="h-11 w-full rounded-[10px] px-3.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.18)',
                        }}
                      />
                      <FormSelect
                        id="inbox-staff-filter"
                        value={staffFilter}
                        onChange={(v) => {
                          setStaffFilter(v);
                          setCurrentPage(1);
                        }}
                        options={staffOptions}
                        placeholder="All Staff"
                      />
                      <FormSelect
                        id="inbox-dept-filter"
                        value={deptFilter}
                        onChange={(v) => {
                          setDeptFilter(v);
                          setCurrentPage(1);
                        }}
                        options={deptOptions}
                        placeholder="All Departments"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={resetFilters}
                          aria-label="Reset filters"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ border: '1px solid rgba(0,100,130,0.18)' }}
                        >
                          <Filter style={{ width: 16, height: 16, color: '#4A7080' }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setComposeOpen(true)}
                          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, background: '#00B4D8' }}
                        >
                          <Edit3 style={{ width: 15, height: 15 }} />
                          Compose
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col">
                      {pageRows.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                          <div
                            className="flex size-14 items-center justify-center rounded-full"
                            style={{ background: 'rgba(226,237,241,0.6)' }}
                          >
                            <Mail style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 16, color: '#4A7080' }}
                          >
                            No messages match your filters
                          </p>
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            Clear all filters
                          </button>
                        </div>
                      )}
                      {pageRows.map((m) => {
                        const isUnread = m.status === 'Unread';
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => openMessage(m)}
                            className="flex items-center gap-3 py-3 text-left transition-colors duration-100 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              borderBottom: '1px solid rgba(0,100,130,0.08)',
                              background: selectedId === m.id ? '#E6F8FD' : 'transparent',
                            }}
                          >
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: m.senderAvatarBg }}
                            >
                              {m.senderInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {m.senderName}
                                </p>
                                <p
                                  className="shrink-0 whitespace-nowrap"
                                  style={{ fontSize: 14, color: '#8A98A3' }}
                                >
                                  {relativeTime(m.sentAt)}
                                </p>
                              </div>
                              <p
                                className="truncate"
                                style={{
                                  fontSize: 14,
                                  color: '#0D2630',
                                  fontWeight: isUnread ? 600 : 400,
                                }}
                              >
                                {m.subject}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {m.preview}
                              </p>
                            </div>
                            <div className="hidden shrink-0 sm:block">
                              <DeptBadge department={m.department} />
                            </div>
                            <span
                              className="ml-1 size-2 shrink-0 rounded-full"
                              style={{
                                background:
                                  m.status === 'Unread'
                                    ? '#EF4444'
                                    : m.status === 'Read'
                                      ? '#22C55E'
                                      : '#8A98A3',
                              }}
                              aria-hidden="true"
                            />
                          </button>
                        );
                      })}
                    </div>

                    {filtered.length > 0 && (
                      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          Showing {pageStart + 1} to{' '}
                          {Math.min(pageStart + ROWS_PER_PAGE, filtered.length)} of{' '}
                          {filtered.length} messages
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={safePage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                            style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                            aria-label="Previous page"
                          >
                            ‹
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className="flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{
                                fontSize: 14,
                                border: `1px solid ${p === safePage ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                                color: p === safePage ? '#00B4D8' : '#4A7080',
                                background: p === safePage ? '#E6F8FD' : 'transparent',
                              }}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={safePage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                            style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                            aria-label="Next page"
                          >
                            ›
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-end gap-4">
                      {[
                        { label: 'Unread', color: '#EF4444' },
                        { label: 'Read', color: '#22C55E' },
                        { label: 'Archived', color: '#8A98A3' },
                      ].map((l) => (
                        <div key={l.label} className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full" style={{ background: l.color }} />
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ══ DETAIL PANE ═══════════════════════════════════════════════ */}
            {selected && (
              <div
                className={`flex w-full shrink-0 flex-col overflow-hidden xl:w-[420px] ${
                  showDetailOnMobile ? 'flex' : 'hidden xl:flex'
                }`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.12)',
                  borderRadius: 12,
                  maxHeight: 720,
                }}
              >
                <div
                  className="flex shrink-0 items-start justify-between gap-2 px-4 py-4 sm:px-5"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.10)' }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowDetailOnMobile(false)}
                      aria-label="Back to Messages"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none xl:hidden"
                    >
                      <ChevronLeft style={{ width: 18, height: 18, color: '#4A7080' }} />
                    </button>
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                      style={{ background: selected.senderAvatarBg }}
                    >
                      {selected.senderInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          className="truncate font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          {selected.senderName}
                        </p>
                        <DeptBadge department={selected.department} />
                      </div>
                      {selected.online && (
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ background: '#22C55E' }}
                          />
                          <span style={{ fontSize: 14, color: '#22C55E' }}>Online</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="relative" ref={moreMenuRef}>
                      <button
                        type="button"
                        onClick={() => setMoreMenuOpen((v) => !v)}
                        aria-label="More message actions"
                        className="flex size-9 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      >
                        <MoreVertical style={{ width: 17, height: 17, color: '#4A7080' }} />
                      </button>
                      {moreMenuOpen && (
                        <div
                          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
                          style={{
                            border: '1px solid rgba(0,100,130,0.15)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                          }}
                        >
                          {tab === 'Inbox' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleMarkUnread(selected.id)}
                                className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                                style={{ fontSize: 14, color: '#2F3A40' }}
                              >
                                Mark as unread
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchive(selected.id)}
                                className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                                style={{ fontSize: 14, color: '#2F3A40' }}
                              >
                                Archive
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(selected.id)}
                                className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)]"
                                style={{ fontSize: 14, color: '#EF4444' }}
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {tab !== 'Inbox' && (
                            <p className="px-4 py-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                              No actions available for this tab.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(null);
                        setShowDetailOnMobile(false);
                      }}
                      aria-label="Close"
                      className="flex size-9 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    >
                      <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 py-4 sm:px-5">
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    {selected.subject}
                  </p>
                  <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                    {formatHumanDate(selected.sentAt)} {formatTime(selected.sentAt)}
                  </p>

                  <div className="mt-4 flex flex-col gap-3">
                    {(selected.thread.length > 0
                      ? selected.thread
                      : [
                          {
                            id: 'single',
                            from: 'them' as const,
                            text: selected.preview,
                            sentAt: selected.sentAt,
                            read: true,
                          },
                        ]
                    ).map((t) => (
                      <div
                        key={t.id}
                        className={`flex ${t.from === 'me' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className="flex flex-col"
                          style={{ alignItems: t.from === 'me' ? 'flex-end' : 'flex-start' }}
                        >
                          <div
                            className="font-sans whitespace-pre-line"
                            style={{
                              maxWidth: 320,
                              padding: '10px 16px',
                              fontSize: 14,
                              lineHeight: '22px',
                              color: t.from === 'me' ? '#FFFFFF' : '#0D2630',
                              background: t.from === 'me' ? '#00B4D8' : '#F5FBFD',
                              borderRadius: 14,
                            }}
                          >
                            {t.text}
                          </div>
                          <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatTime(t.sentAt)} {t.from === 'me' && t.read ? '✓✓' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selected.attachments.length > 0 && (
                    <div className="mt-5">
                      <div className="flex items-center gap-1.5">
                        <Paperclip style={{ width: 14, height: 14, color: '#4A7080' }} />
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Attachments
                        </p>
                      </div>
                      <div className="mt-2 flex flex-col gap-2">
                        {selected.attachments.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5"
                            style={{
                              background: '#F5FBFD',
                              border: '1px solid rgba(0,100,130,0.12)',
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {a.name}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{a.sizeKB} KB</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                toast.success('Download started', `${a.name} is downloading.`)
                              }
                              aria-label={`Download ${a.name}`}
                              className="flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.readReceipts.length > 0 && (
                    <div className="mt-5">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#22C55E' }}
                      >
                        Read Receipt
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        Seen by {selected.readReceipts.length}
                      </p>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {selected.readReceipts.map((r) => (
                          <div key={r.name} className="flex items-center justify-between gap-2">
                            <span style={{ fontSize: 14, color: '#0D2630' }}>{r.name}</span>
                            <span style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatHumanDate(r.seenAt)} {formatTime(r.seenAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {(tab === 'Inbox' || tab === 'Archived') && (
                  <div
                    className="shrink-0 px-4 py-3 sm:px-5"
                    style={{ borderTop: '1px solid rgba(0,100,130,0.10)' }}
                  >
                    {attachedFileName && (
                      <div
                        className="mb-2 flex items-center gap-2 rounded-[10px] px-3 py-2"
                        style={{ background: '#E6F8FD', border: '1px solid rgba(0,180,216,0.3)' }}
                      >
                        <Paperclip
                          style={{ width: 14, height: 14, color: '#00B4D8', flexShrink: 0 }}
                        />
                        <span
                          className="min-w-0 flex-1 truncate"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {attachedFileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAttachedFileName(null)}
                          aria-label="Remove attachment"
                          className="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        >
                          <X style={{ width: 13, height: 13, color: '#4A7080' }} />
                        </button>
                      </div>
                    )}
                    <div className="flex items-end gap-1.5">
                      <button
                        type="button"
                        onClick={handleAttachClick}
                        aria-label="Attach a file"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      >
                        <Paperclip style={{ width: 18, height: 18, color: '#4A7080' }} />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileSelected}
                      />
                      <button
                        type="button"
                        onClick={insertEmoji}
                        aria-label="Insert emoji"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      >
                        <Smile style={{ width: 18, height: 18, color: '#4A7080' }} />
                      </button>
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        rows={1}
                        placeholder="Type a message..."
                        className="min-w-0 flex-1 resize-none rounded-[12px] px-3.5 py-2.5 font-sans outline-none placeholder:text-[#8A98A3] focus:ring-2 focus:ring-[#00B4D8]/40"
                        style={{
                          background: '#F5FBFD',
                          color: '#0D2630',
                          fontSize: 14,
                          minHeight: 44,
                          maxHeight: 120,
                        }}
                      />
                      <button
                        type="button"
                        onClick={clearDraft}
                        aria-label="Clear draft"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      >
                        <Trash2 style={{ width: 17, height: 17, color: '#EF4444' }} />
                      </button>
                      <button
                        type="button"
                        onClick={handleSendReply}
                        disabled={!reply.trim() && !attachedFileName}
                        aria-label="Send reply"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ background: '#00B4D8' }}
                      >
                        <SendIcon style={{ width: 17, height: 17 }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>
      </main>

      {composeOpen && (
        <ComposeMessageModal
          onClose={() => setComposeOpen(false)}
          onSend={(to, subject) => {
            setComposeOpen(false);
            toast.success('Message sent', `Your message to ${to} — "${subject}" — has been sent.`);
          }}
        />
      )}
    </div>
  );
}
