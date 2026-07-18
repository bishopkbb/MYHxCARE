'use client';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';
import {
  RECORD_REQUESTS,
  REQUEST_TYPES,
  type RecordRequest,
  type RequestStatus,
} from '@/features/medical-records/__mocks__/recordRequestFixtures';

const RecordRequestModal = dynamic(
  () => import('./RecordRequestModal').then((m) => m.RecordRequestModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const NewRecordRequestModal = dynamic(
  () => import('./NewRecordRequestModal').then((m) => m.NewRecordRequestModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';

const STATUS_TABS: { value: RequestStatus | 'All'; label: string }[] = [
  { value: 'All', label: 'All Requests' },
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Fulfilled', label: 'Fulfilled' },
  { value: 'Rejected', label: 'Rejected' },
];

const STATUS_CFG: Record<RequestStatus, { color: string; border: string; bg: string }> = {
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  'In Progress': { color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
  Fulfilled: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
  Rejected: { color: '#EF4444', border: 'rgba(239,68,68,0.40)', bg: 'rgba(239,68,68,0.06)' },
};

const PRIORITY_CFG: Record<RecordRequest['priority'], { color: string; bg: string }> = {
  Routine: { color: '#4A7080', bg: 'rgba(74,112,128,0.08)' },
  Urgent: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
};

const ROWS_PER_PAGE = 10;

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-7 w-12 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export function RecordRequestsWorkspace() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loaded');
  const [requests, setRequests] = useState<RecordRequest[]>(RECORD_REQUESTS);
  const [status, setStatus] = useState<RequestStatus | 'All'>('All');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => {
    const c: Record<RequestStatus, number> = {
      Pending: 0,
      'In Progress': 0,
      Fulfilled: 0,
      Rejected: 0,
    };
    requests.forEach((r) => {
      c[r.status] += 1;
    });
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (status !== 'All' && r.status !== status) return false;
      if (type && r.requesterType !== type) return false;
      if (
        q &&
        !r.patientName.toLowerCase().includes(q) &&
        !r.mrn.toLowerCase().includes(q) &&
        !r.requestNumber.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [requests, status, type, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const viewingRequest = viewingId ? requests.find((r) => r.id === viewingId) : undefined;

  function selectStatus(v: RequestStatus | 'All') {
    setStatus(v);
    setCurrentPage(1);
  }

  function handleAdvance(id: string) {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.status === 'Pending') return { ...r, status: 'In Progress' };
        if (r.status === 'In Progress')
          return { ...r, status: 'Fulfilled', dateFulfilled: new Date().toISOString() };
        return r;
      }),
    );
    const req = requests.find((r) => r.id === id);
    toast.success(
      'Request updated',
      req?.status === 'Pending'
        ? `${req.requestNumber} moved to In Progress.`
        : `${req?.requestNumber} marked Fulfilled.`,
    );
    setViewingId(null);
  }

  function handleReject(id: string) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'Rejected' } : r)));
    const req = requests.find((r) => r.id === id);
    toast.error('Request rejected', `${req?.requestNumber} has been rejected.`);
    setViewingId(null);
  }

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Record Requests
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Track and manage internal and external requests for patient record copies
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
                New Request
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
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {pageState === 'loading' ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
                ) : (
                  <>
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Clock style={{ width: 15, height: 15, color: '#F59E0B' }} />
                        <p style={{ fontSize: 14, color: '#4A7080' }}>Pending</p>
                      </div>
                      <p
                        className="font-display mt-1.5 font-semibold"
                        style={{ fontSize: 26, color: '#0D2630' }}
                      >
                        {counts.Pending}
                      </p>
                    </div>
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw style={{ width: 15, height: 15, color: '#00B4D8' }} />
                        <p style={{ fontSize: 14, color: '#4A7080' }}>In Progress</p>
                      </div>
                      <p
                        className="font-display mt-1.5 font-semibold"
                        style={{ fontSize: 26, color: '#0D2630' }}
                      >
                        {counts['In Progress']}
                      </p>
                    </div>
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 style={{ width: 15, height: 15, color: '#22C55E' }} />
                        <p style={{ fontSize: 14, color: '#4A7080' }}>Fulfilled</p>
                      </div>
                      <p
                        className="font-display mt-1.5 font-semibold"
                        style={{ fontSize: 26, color: '#0D2630' }}
                      >
                        {counts.Fulfilled}
                      </p>
                    </div>
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center gap-2">
                        <XCircle style={{ width: 15, height: 15, color: '#EF4444' }} />
                        <p style={{ fontSize: 14, color: '#4A7080' }}>Rejected</p>
                      </div>
                      <p
                        className="font-display mt-1.5 font-semibold"
                        style={{ fontSize: 26, color: '#0D2630' }}
                      >
                        {counts.Rejected}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-5 overflow-x-auto scroll-smooth">
                <div
                  className="flex gap-1"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                >
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => selectStatus(tab.value)}
                      className="shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: status === tab.value ? '#00B4D8' : '#4A7080',
                        borderBottom:
                          status === tab.value ? '2px solid #00B4D8' : '2px solid transparent',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="mt-4 rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="relative">
                    <Search
                      style={{ width: 15, height: 15, color: '#8A98A3' }}
                      className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by patient, MRN or request #"
                      className="h-11 w-full rounded-[10px] pr-3.5 pl-9 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.18)',
                      }}
                    />
                  </div>
                  <FormSelect
                    id="req-filter-type"
                    value={type}
                    onChange={(v) => {
                      setType(v);
                      setCurrentPage(1);
                    }}
                    options={REQUEST_TYPES.map((t) => ({ value: t, label: t }))}
                    placeholder="All Requester Types"
                  />
                </div>

                <div className="mt-4 overflow-x-auto scroll-smooth">
                  <div className="min-w-[920px]">
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Request #
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Patient
                        </span>
                      </div>
                      <div className="w-44 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Requested By
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Priority
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Date Requested
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2">
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
                          No requests match your filters
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            selectStatus('All');
                            setType('');
                            setSearch('');
                          }}
                          className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}

                    {pageRows.map((req) => {
                      const statusCfg = STATUS_CFG[req.status];
                      const priorityCfg = PRIORITY_CFG[req.priority];
                      return (
                        <div
                          key={req.id}
                          className="flex items-center"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {req.requestNumber}
                            </p>
                          </div>
                          <div className="min-w-0 flex-1 py-3 pr-2">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {req.patientName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                              {req.mrn}
                            </p>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {req.requestedBy}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {req.requesterType}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: priorityCfg.color,
                                background: priorityCfg.bg,
                              }}
                            >
                              {req.priority}
                            </span>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(req.dateRequested)}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
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
                          <div className="flex w-24 shrink-0 items-center justify-end py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => setViewingId(req.id)}
                              aria-label={`View request ${req.requestNumber}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
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
                  </div>
                )}
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>

      {viewingRequest && (
        <RecordRequestModal
          request={viewingRequest}
          onClose={() => setViewingId(null)}
          onAdvance={handleAdvance}
          onReject={handleReject}
        />
      )}
      {creating && (
        <NewRecordRequestModal
          onClose={() => setCreating(false)}
          onCreate={(req) => setRequests((prev) => [req, ...prev])}
        />
      )}
    </div>
  );
}
