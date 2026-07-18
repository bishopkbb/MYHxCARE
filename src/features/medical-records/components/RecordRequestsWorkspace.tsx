'use client';

import { AlertCircle, Check, Eye, MoreVertical, Plus, RefreshCw, Search, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  RECORD_REQUESTS,
  type RecordRequest,
  type RequestStatus,
} from '@/features/medical-records/__mocks__/recordRequestFixtures';

const NewRecordRequestModal = dynamic(
  () => import('./NewRecordRequestModal').then((m) => m.NewRecordRequestModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type Tab = RequestStatus | 'All Requests';

const TABS: Tab[] = ['All Requests', 'Pending', 'Approved', 'Completed', 'Rejected'];
const ROWS_PER_PAGE = 5;

const STATUS_CFG: Record<RequestStatus, { color: string; border: string; bg: string }> = {
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  Approved: { color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
  Completed: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
  Rejected: { color: '#EF4444', border: 'rgba(239,68,68,0.40)', bg: 'rgba(239,68,68,0.06)' },
};

const RECORD_TYPE_CFG: Record<
  RecordRequest['recordType'],
  { color: string; border: string; bg: string }
> = {
  'Patient Record': {
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.30)',
    bg: 'rgba(59,130,246,0.06)',
  },
  'Visit History': {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.30)',
    bg: 'rgba(139,92,246,0.06)',
  },
  'Lab Results': { color: '#00B4D8', border: 'rgba(0,180,216,0.30)', bg: 'rgba(0,180,216,0.06)' },
};

function formatHumanDateTime(date: string): string {
  return `${formatHumanDate(date)} ${formatTime(date)}`;
}

export function RecordRequestsWorkspace() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loaded');
  const [requests, setRequests] = useState<RecordRequest[]>(RECORD_REQUESTS);
  const [tab, setTab] = useState<Tab>('All Requests');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () => (tab === 'All Requests' ? requests : requests.filter((r) => r.status === tab)),
    [requests, tab],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const selected = selectedId ? requests.find((r) => r.id === selectedId) : undefined;

  function selectTab(next: Tab) {
    setTab(next);
    setCurrentPage(1);
    setSelectedId(null);
  }

  function openRequest(r: RecordRequest) {
    setSelectedId(r.id);
    setNotesDraft(r.notes);
  }

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  function handleApprove(id: string) {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const nextStatus: RequestStatus = req.status === 'Pending' ? 'Approved' : 'Completed';
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: nextStatus, notes: notesDraft } : r)),
    );
    toast.success(
      'Request updated',
      nextStatus === 'Approved'
        ? `${req.requestNumber} approved.`
        : `${req.requestNumber} marked Completed.`,
    );
    setSelectedId(null);
  }

  function handleReject(id: string) {
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Rejected', notes: notesDraft } : r)),
    );
    toast.error('Request rejected', `${req.requestNumber} has been rejected.`);
    setSelectedId(null);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Record Requests
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage requests for patient records retrieval or access
              </p>
            </div>
            <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                New Record Request
              </button>
            </PermissionGate>
          </div>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load record requests
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
          ) : (
            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              {/* ── List pane ─────────────────────────────────────────────── */}
              <div className={`min-w-0 flex-1 ${selected ? 'hidden xl:block' : 'block'}`}>
                <div className="overflow-x-auto scroll-smooth">
                  <div
                    className="flex gap-1"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    {TABS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => selectTab(t)}
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
                  <div className="overflow-x-auto scroll-smooth">
                    <div className="min-w-[1080px]">
                      <div
                        className="flex rounded-t-[8px]"
                        style={{
                          background: 'rgba(226,237,241,0.4)',
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Request ID
                          </span>
                        </div>
                        <div className="w-36 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Patient
                          </span>
                        </div>
                        <div className="w-28 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            MRN
                          </span>
                        </div>
                        <div className="w-36 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Record Type
                          </span>
                        </div>
                        <div className="w-40 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Requested By
                          </span>
                        </div>
                        <div className="w-32 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Request Date
                          </span>
                        </div>
                        <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Purpose
                          </span>
                        </div>
                        <div className="w-28 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Status
                          </span>
                        </div>
                        <div className="w-24 shrink-0 py-2.5 pr-3 text-right">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Actions
                          </span>
                        </div>
                      </div>

                      {pageRows.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                          <div
                            className="flex size-14 items-center justify-center rounded-full"
                            style={{ background: 'rgba(226,237,241,0.6)' }}
                          >
                            <Search style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 16, color: '#4A7080' }}
                          >
                            No requests in this tab
                          </p>
                        </div>
                      )}

                      {pageRows.map((req) => {
                        const statusCfg = STATUS_CFG[req.status];
                        const typeCfg = RECORD_TYPE_CFG[req.recordType];
                        return (
                          <div
                            key={req.id}
                            onClick={() => openRequest(req)}
                            className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                            style={{
                              borderBottom: '1px solid rgba(0,100,130,0.08)',
                              background: selectedId === req.id ? '#E6F8FD' : 'transparent',
                            }}
                          >
                            <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {req.requestNumber}
                              </p>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {req.patientName}
                              </p>
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                {req.mrn}
                              </p>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2">
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  whiteSpace: 'nowrap',
                                  color: typeCfg.color,
                                  border: `1px solid ${typeCfg.border}`,
                                  background: typeCfg.bg,
                                }}
                              >
                                {req.recordType}
                              </span>
                            </div>
                            <div className="w-40 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {req.requestedBy}
                              </p>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {formatHumanDate(req.requestDate)}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatTime(req.requestDate)}
                              </p>
                            </div>
                            <div className="min-w-[160px] flex-1 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {req.purpose}
                              </p>
                            </div>
                            <div className="w-28 shrink-0 py-3 pr-2">
                              <span
                                className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  whiteSpace: 'nowrap',
                                  color: statusCfg.color,
                                  border: `1px solid ${statusCfg.border}`,
                                  background: statusCfg.bg,
                                }}
                              >
                                {req.status}
                              </span>
                            </div>
                            <div
                              className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openRequest(req)}
                                aria-label={`View request ${req.requestNumber}`}
                                className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  toast.info(
                                    'More actions',
                                    `Additional actions for ${req.requestNumber}.`,
                                  )
                                }
                                aria-label={`More actions for ${req.requestNumber}`}
                                className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {filtered.length > 0 && (
                    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                      <p style={{ fontSize: 14, color: '#4A7080' }}>
                        Showing {pageStart + 1} to{' '}
                        {Math.min(pageStart + ROWS_PER_PAGE, filtered.length)} of {filtered.length}{' '}
                        requests
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
              </div>

              {/* ── Detail pane ───────────────────────────────────────────── */}
              {selected && (
                <div
                  className="flex w-full shrink-0 flex-col overflow-hidden xl:w-[380px]"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.12)',
                    borderRadius: 12,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-2">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        {selected.requestNumber}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: STATUS_CFG[selected.status].color,
                          border: `1px solid ${STATUS_CFG[selected.status].border}`,
                          background: STATUS_CFG[selected.status].bg,
                        }}
                      >
                        {selected.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      aria-label="Close"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    >
                      <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Request Details
                    </p>
                    <div className="mt-3 flex flex-col gap-3">
                      {[
                        ['Patient', selected.patientName],
                        ['MRN', selected.mrn],
                        ['Record Type', selected.recordType],
                        ['Purpose', selected.purpose],
                        ['Requested By', selected.requestedBy],
                        ['Request Date', formatHumanDateTime(selected.requestDate)],
                        ['Priority', selected.priority],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                          <span
                            className="max-w-[200px] truncate text-right font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Notes
                      </p>
                      <textarea
                        rows={3}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Add a note about this request"
                        className="mt-2 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.18)',
                        }}
                      />
                    </div>
                  </div>

                  {(selected.status === 'Pending' || selected.status === 'Approved') && (
                    <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                      <div className="flex items-center gap-2.5 p-4 pt-0 sm:p-5 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleApprove(selected.id)}
                          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, background: '#22C55E' }}
                        >
                          <Check style={{ width: 15, height: 15 }} />
                          {selected.status === 'Pending' ? 'Approve' : 'Mark Completed'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(selected.id)}
                          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#EF4444',
                            border: '1px solid rgba(239,68,68,0.35)',
                          }}
                        >
                          <X style={{ width: 15, height: 15 }} />
                          Reject
                        </button>
                      </div>
                    </PermissionGate>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>

      {creating && (
        <NewRecordRequestModal
          onClose={() => setCreating(false)}
          onCreate={(req) => setRequests((prev) => [req, ...prev])}
        />
      )}
    </div>
  );
}
