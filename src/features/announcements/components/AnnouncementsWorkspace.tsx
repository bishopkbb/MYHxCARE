'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  Download,
  Filter as FilterIcon,
  Globe2,
  Megaphone,
  MoreVertical,
  Pin,
  Plus,
  Share2,
  Users2,
  Mail,
} from 'lucide-react';
import dynamic from 'next/dynamic';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { PERMISSIONS } from '@/constants/permissions';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  CATEGORY_CFG,
  DEPARTMENT_OPTIONS,
  type Announcement,
  type AnnouncementPriority,
} from '@/features/announcements/__mocks__/announcementFixtures';
import {
  addAnnouncement,
  deleteAnnouncement,
  markAnnouncementRead,
  toggleAnnouncementPin,
  useAnnouncements,
} from '@/features/announcements/store/announcementsStore';

const NewAnnouncementModal = dynamic(
  () => import('./NewAnnouncementModal').then((m) => m.NewAnnouncementModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const ROWS_PER_PAGE = 7;

type FilterMode = 'all' | 'unread' | 'pinned';

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function AnnouncementsWorkspace() {
  const toast = useToast();
  const announcements = useAnnouncements();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority | ''>('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(announcements[0]?.id ?? null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const departmentButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const stats = useMemo(() => {
    const total = announcements.length;
    const unread = announcements.filter((a) => !a.read).length;
    const pinned = announcements.filter((a) => a.pinned).length;
    const departmental = announcements.filter((a) => a.scope === 'Departmental').length;
    const systemWide = announcements.filter((a) => a.scope === 'System Wide').length;
    return { total, unread, pinned, departmental, systemWide };
  }, [announcements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements.filter((a) => {
      if (filterMode === 'unread' && a.read) return false;
      if (filterMode === 'pinned' && !a.pinned) return false;
      if (department && a.department !== department) return false;
      if (priority && a.priority !== priority) return false;
      if (q && !(a.title.toLowerCase().includes(q) || a.preview.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [announcements, filterMode, department, priority, search]);

  const effectiveSelectedId = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.some((a) => a.id === selectedId) ? selectedId : filtered[0]!.id;
  }, [filtered, selectedId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const selected = announcements.find((a) => a.id === effectiveSelectedId) ?? null;

  function togglePin(id: string) {
    toggleAnnouncementPin(id);
    setMoreMenuOpen(false);
  }

  function handleDelete(id: string) {
    deleteAnnouncement(id);
    setMoreMenuOpen(false);
    toast.success('Announcement deleted', 'It has been removed from the list.');
  }

  function handleShare() {
    if (!selected) return;
    const url = `https://myhxcare.ng/announcements/${selected.id}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    toast.success('Link copied', 'Announcement link copied to clipboard.');
  }

  function handleDownload(name: string) {
    toast.info('Downloading', `${name} is downloading.`);
  }

  function handleCreate(announcement: Announcement) {
    addAnnouncement(announcement);
    setSelectedId(announcement.id);
    setNewModalOpen(false);
    toast.success(
      'Announcement posted',
      `"${announcement.title}" has been published to every workspace.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1512px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Announcements
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Stay informed with important updates and information.
              </p>
            </div>
            <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
              <button
                type="button"
                onClick={() => setNewModalOpen(true)}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ background: '#00B4D8', fontSize: 14 }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                New Announcement
              </button>
            </PermissionGate>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: 'Total Announcements',
                sub: 'All time',
                value: stats.total,
                icon: Megaphone,
                color: '#2563EB',
                bg: 'rgba(37,99,235,0.1)',
              },
              {
                label: 'Unread Announcements',
                sub: 'Require your attention',
                value: stats.unread,
                icon: Mail,
                color: '#16A34A',
                bg: 'rgba(34,197,94,0.1)',
              },
              {
                label: 'Pinned Announcements',
                sub: 'Pinned to top',
                value: stats.pinned,
                icon: Bell,
                color: '#EA580C',
                bg: 'rgba(234,88,12,0.1)',
              },
              {
                label: 'Departmental',
                sub: 'Department specific',
                value: stats.departmental,
                icon: Users2,
                color: '#2563EB',
                bg: 'rgba(37,99,235,0.1)',
              },
              {
                label: 'System Wide',
                sub: 'Across all departments',
                value: stats.systemWide,
                icon: Globe2,
                color: '#7C3AED',
                bg: 'rgba(124,58,237,0.1)',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-full"
                    style={{ background: s.bg }}
                  >
                    <s.icon style={{ width: 18, height: 18, color: s.color }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>{s.label}</p>
                    <p
                      className="font-display font-bold"
                      style={{ fontSize: 24, color: '#0D2630' }}
                    >
                      {s.value}
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter pills + search ──────────────────────────────────── */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'unread', label: `Unread ${stats.unread}` },
                { key: 'pinned', label: `Pinned ${stats.pinned}` },
              ] as { key: FilterMode; label: string }[]
            ).map((f) => {
              const active = filterMode === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setFilterMode(f.key);
                    setCurrentPage(1);
                  }}
                  aria-pressed={active}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                  style={
                    active
                      ? { background: '#00B4D8', color: '#FFFFFF', fontSize: 14 }
                      : {
                          background: '#FFFFFF',
                          border: '1px solid rgba(0,100,130,0.15)',
                          color: '#0D2630',
                          fontSize: 14,
                        }
                  }
                >
                  {f.label}
                </button>
              );
            })}

            <button
              ref={departmentButtonRef}
              type="button"
              onClick={() => setDepartmentMenuOpen((v) => !v)}
              aria-pressed={department !== ''}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold whitespace-nowrap transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${department ? '#00B4D8' : 'rgba(0,100,130,0.15)'}`,
                color: department ? '#00B4D8' : '#0D2630',
                fontSize: 14,
              }}
            >
              {department || 'Department'}
              <ChevronDown style={{ width: 14, height: 14 }} />
            </button>
            <RowMenuPortal
              open={departmentMenuOpen}
              anchorRef={departmentButtonRef}
              onClose={() => setDepartmentMenuOpen(false)}
              width={240}
            >
              <button
                type="button"
                onClick={() => {
                  setDepartment('');
                  setDepartmentMenuOpen(false);
                  setCurrentPage(1);
                }}
                className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#F5FBFD]"
                style={{ fontSize: 14, color: department === '' ? '#00B4D8' : '#2F3A40' }}
              >
                All Departments
              </button>
              {DEPARTMENT_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDepartment(d);
                    setDepartmentMenuOpen(false);
                    setCurrentPage(1);
                  }}
                  className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#F5FBFD]"
                  style={{ fontSize: 14, color: department === d ? '#00B4D8' : '#2F3A40' }}
                >
                  {d}
                </button>
              ))}
            </RowMenuPortal>

            <div className="relative min-w-[220px] flex-1">
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search announcements…"
                className={`h-11 w-full rounded-[10px] pr-4 pl-4 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>

            <button
              ref={filterButtonRef}
              type="button"
              onClick={() => setFilterMenuOpen((v) => !v)}
              aria-pressed={priority !== ''}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${priority ? '#00B4D8' : 'rgba(0,100,130,0.15)'}`,
                color: priority ? '#00B4D8' : '#0D2630',
                fontSize: 14,
              }}
            >
              <FilterIcon style={{ width: 16, height: 16 }} />
              Filter
            </button>
            <RowMenuPortal
              open={filterMenuOpen}
              anchorRef={filterButtonRef}
              onClose={() => setFilterMenuOpen(false)}
              width={260}
            >
              <div className="px-4 py-3.5">
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Priority
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {(['', 'Normal', 'High Priority'] as (AnnouncementPriority | '')[]).map((p) => (
                    <button
                      key={p || 'all'}
                      type="button"
                      onClick={() => {
                        setPriority(p);
                        setCurrentPage(1);
                      }}
                      className="flex w-full items-center rounded-[6px] px-2.5 py-1.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD]"
                      style={{ fontSize: 14, color: priority === p ? '#00B4D8' : '#2F3A40' }}
                    >
                      {p || 'All Priorities'}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('')}
                    className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#4A7080' }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMenuOpen(false)}
                    className={`flex h-9 items-center rounded-[8px] px-3.5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ background: '#00B4D8', fontSize: 14 }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </RowMenuPortal>
          </div>

          {/* ── Body: list + detail ────────────────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
            {/* ── List ─────────────────────────────────────────────────── */}
            <div
              className="rounded-[12px] p-3"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {pageRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Megaphone style={{ width: 24, height: 24, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                    No announcements match your filters
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMode('all');
                      setDepartment('');
                      setPriority('');
                      setSearch('');
                      setCurrentPage(1);
                    }}
                    className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pageRows.map((a) => {
                    const cfg = CATEGORY_CFG[a.category];
                    const active = a.id === selectedId;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className={`flex items-start gap-3 rounded-[10px] p-3 text-left transition-colors duration-150 ${FOCUS_RING}`}
                        style={{
                          background: active ? 'rgba(0,180,216,0.06)' : 'transparent',
                          borderLeft: active ? '3px solid #00B4D8' : '3px solid transparent',
                        }}
                      >
                        <div
                          className="flex size-11 shrink-0 items-center justify-center rounded-full"
                          style={{ background: cfg.bg }}
                        >
                          <cfg.icon style={{ width: 18, height: 18, color: cfg.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {a.pinned && (
                              <Pin style={{ width: 13, height: 13, color: '#F59E0B' }} />
                            )}
                            <p
                              className="truncate font-sans font-semibold"
                              style={{ fontSize: 15, color: '#0D2630' }}
                            >
                              {a.title}
                            </p>
                            {a.priority === 'High Priority' && (
                              <span
                                className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                style={{
                                  fontSize: 14,
                                  color: '#EF4444',
                                  background: 'rgba(239,68,68,0.1)',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                }}
                              >
                                High Priority
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {a.scope === 'System Wide' ? 'System Wide' : a.department} · By{' '}
                            {a.author}
                          </p>
                          <p className="mt-0.5 truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                            {a.preview}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className="whitespace-nowrap"
                            style={{ fontSize: 14, color: '#8A98A3' }}
                          >
                            {relativeTime(a.publishedAt)}
                          </span>
                          <span
                            className="flex items-center gap-1 whitespace-nowrap"
                            style={{ fontSize: 14, color: a.read ? '#8A98A3' : '#00B4D8' }}
                          >
                            {!a.read && (
                              <span
                                className="size-1.5 rounded-full"
                                style={{ background: '#00B4D8' }}
                              />
                            )}
                            {a.read ? 'Read' : 'Unread'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {filtered.length > 0 && (
                <div
                  className="mt-3 flex flex-col items-center justify-between gap-3 border-t px-1 pt-3 sm:flex-row"
                  style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                >
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Showing {pageStart + 1} to{' '}
                    {Math.min(pageStart + ROWS_PER_PAGE, filtered.length)} of {filtered.length}{' '}
                    announcements
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
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
                        className={`flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
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
                      className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                      style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                      aria-label="Next page"
                    >
                      ›
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                    <select
                      value={ROWS_PER_PAGE}
                      disabled
                      className="h-9 rounded-[8px] px-2 font-sans outline-none"
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    >
                      <option value={ROWS_PER_PAGE}>{ROWS_PER_PAGE}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* ── Detail panel ─────────────────────────────────────────── */}
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {!selected ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Megaphone style={{ width: 24, height: 24, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                    Select an announcement to view its details
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                        style={{
                          fontSize: 14,
                          color: '#2563EB',
                          background: 'rgba(37,99,235,0.1)',
                          border: '1px solid rgba(37,99,235,0.3)',
                        }}
                      >
                        {selected.scope === 'System Wide' ? 'System Wide' : selected.department}
                      </span>
                      {selected.priority === 'High Priority' && (
                        <span
                          className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: '#EF4444',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                          }}
                        >
                          High Priority
                        </span>
                      )}
                      {selected.pinned && (
                        <span
                          className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: '#00B4D8',
                            background: 'rgba(0,180,216,0.1)',
                            border: '1px solid rgba(0,180,216,0.3)',
                          }}
                        >
                          <Pin style={{ width: 12, height: 12 }} />
                          Pinned
                        </span>
                      )}
                    </div>
                    <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                      <button
                        ref={moreButtonRef}
                        type="button"
                        onClick={() => setMoreMenuOpen((v) => !v)}
                        aria-label="More actions"
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      >
                        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
                      </button>
                      <RowMenuPortal
                        open={moreMenuOpen}
                        anchorRef={moreButtonRef}
                        onClose={() => setMoreMenuOpen(false)}
                        width={200}
                      >
                        <button
                          type="button"
                          onClick={() => togglePin(selected.id)}
                          className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#F5FBFD]"
                          style={{ fontSize: 14, color: '#2F3A40' }}
                        >
                          {selected.pinned ? 'Unpin Announcement' : 'Pin Announcement'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(selected.id)}
                          className="flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)]"
                          style={{ fontSize: 14, color: '#EF4444' }}
                        >
                          Delete Announcement
                        </button>
                      </RowMenuPortal>
                    </PermissionGate>
                  </div>

                  <h2
                    className="font-display mt-3 font-bold"
                    style={{ fontSize: 22, lineHeight: '30px', color: '#0D2630' }}
                  >
                    {selected.title}
                  </h2>
                  <p className="mt-1.5" style={{ fontSize: 14, color: '#4A7080' }}>
                    By {selected.author}
                    {selected.authorRole ? ` (${selected.authorRole})` : ''} ·{' '}
                    {selected.scope === 'System Wide' ? 'System Wide' : selected.department}
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    {formatHumanDate(selected.publishedAt)} · {formatTime(selected.publishedAt)}
                  </p>

                  <div
                    className="mt-4 flex flex-col gap-3"
                    style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 16 }}
                  >
                    {selected.body.map((para, i) => (
                      <p key={i} style={{ fontSize: 14, color: '#2F3A40', lineHeight: '22px' }}>
                        {para}
                      </p>
                    ))}
                    {selected.bulletPoints && selected.bulletPoints.length > 0 && (
                      <>
                        {selected.bulletHeading && (
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {selected.bulletHeading}
                          </p>
                        )}
                        <ul
                          className="flex flex-col gap-1.5 pl-4"
                          style={{ listStyleType: 'disc' }}
                        >
                          {selected.bulletPoints.map((point, i) => (
                            <li
                              key={i}
                              style={{ fontSize: 14, color: '#2F3A40', lineHeight: '22px' }}
                            >
                              {point}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {selected.bodyAfter?.map((para, i) => (
                      <p
                        key={`after-${i}`}
                        style={{ fontSize: 14, color: '#2F3A40', lineHeight: '22px' }}
                      >
                        {para}
                      </p>
                    ))}
                  </div>

                  {selected.attachment && (
                    <div
                      className="mt-4 flex items-center gap-3 rounded-[10px] p-3.5"
                      style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.1)' }}
                    >
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: 'rgba(239,68,68,0.1)' }}
                      >
                        <span
                          className="font-sans font-bold"
                          style={{ fontSize: 14, color: '#EF4444' }}
                        >
                          PDF
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selected.attachment.name}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {selected.attachment.fileType} · {selected.attachment.sizeLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(selected.attachment!.name)}
                        aria-label={`Download ${selected.attachment.name}`}
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.15)' }}
                      >
                        <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                    </div>
                  )}

                  <div className="mt-4">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Target Audience
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.targetAudience.map((a) => (
                        <span
                          key={a}
                          className="rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                          style={{
                            fontSize: 14,
                            color: '#2563EB',
                            background: 'rgba(37,99,235,0.06)',
                            border: '1px solid rgba(37,99,235,0.25)',
                          }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[10px] p-3" style={{ background: '#F5FBFD' }}>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Total Recipients</p>
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 18, color: '#0D2630' }}
                      >
                        {selected.totalRecipients}
                      </p>
                    </div>
                    <div className="rounded-[10px] p-3" style={{ background: '#F5FBFD' }}>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Read</p>
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 18, color: '#16A34A' }}
                      >
                        {selected.readCount} (
                        {Math.round((selected.readCount / selected.totalRecipients) * 100)}%)
                      </p>
                    </div>
                    <div className="rounded-[10px] p-3" style={{ background: '#F5FBFD' }}>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Unread</p>
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 18, color: '#D97706' }}
                      >
                        {selected.totalRecipients - selected.readCount} (
                        {Math.round(
                          ((selected.totalRecipients - selected.readCount) /
                            selected.totalRecipients) *
                            100,
                        )}
                        %)
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => markAnnouncementRead(selected.id)}
                      disabled={selected.read}
                      className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                      style={{
                        border: '1px solid rgba(0,100,130,0.15)',
                        color: '#0D2630',
                        fontSize: 14,
                      }}
                    >
                      <Check style={{ width: 16, height: 16, color: '#16A34A' }} />
                      {selected.read ? 'Marked as Read' : 'Mark as Read'}
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        border: '1px solid rgba(0,100,130,0.15)',
                        color: '#0D2630',
                        fontSize: 14,
                      }}
                    >
                      <Share2 style={{ width: 16, height: 16, color: '#00B4D8' }} />
                      Share Announcement
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {newModalOpen && (
        <NewAnnouncementModal onCreate={handleCreate} onClose={() => setNewModalOpen(false)} />
      )}
    </div>
  );
}
