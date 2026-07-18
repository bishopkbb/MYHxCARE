'use client';

import { Archive, ArchiveRestore, AlertCircle, Copy, Eye, RefreshCw, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';
import {
  ARCHIVED_RECORDS,
  ARCHIVE_REASONS,
  type ArchivedRecord,
  type ArchiveReason,
} from '@/features/medical-records/__mocks__/archivedRecordFixtures';

const RestoreRecordModal = dynamic(
  () => import('./RestoreRecordModal').then((m) => m.RestoreRecordModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';

const REASON_CFG: Record<ArchiveReason, { color: string; bg: string }> = {
  'Graduated / Left Institution': { color: '#00B4D8', bg: 'rgba(0,180,216,0.08)' },
  'Transferred Out': { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  Deceased: { color: '#4A7080', bg: 'rgba(74,112,128,0.10)' },
  'Duplicate Record': { color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  'Retention Policy': { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
};

const ROWS_PER_PAGE = 10;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

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

export function ArchivedRecordsWorkspace() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loaded');
  const [records, setRecords] = useState<ArchivedRecord[]>(ARCHIVED_RECORDS);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const nowDate = new Date(now);
    const thisMonth = records.filter((r) => {
      const d = new Date(r.dateArchived);
      return d.getMonth() === nowDate.getMonth() && d.getFullYear() === nowDate.getFullYear();
    }).length;
    const pendingDeletion = records.filter(
      (r) => new Date(r.retentionUntil).getTime() - now < NINETY_DAYS_MS,
    ).length;
    const duplicates = records.filter((r) => r.reason === 'Duplicate Record').length;
    return { total: records.length, thisMonth, pendingDeletion, duplicates };
  }, [records, now]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (reason && r.reason !== reason) return false;
      if (
        q &&
        !r.patientName.toLowerCase().includes(q) &&
        !r.mrn.toLowerCase().includes(q) &&
        !r.studentId.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [records, reason, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const restoringRecord = restoringId ? records.find((r) => r.id === restoringId) : undefined;

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  function handleRestore(id: string) {
    const record = records.find((r) => r.id === id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setRestoringId(null);
    toast.success('Record restored', `${record?.patientName} is now active again.`);
  }

  function clearFilters() {
    setReason('');
    setSearch('');
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Archived Records
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Retired patient records — restorable on request until the retention window lapses
          </p>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load archived records
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
                        <Archive style={{ width: 15, height: 15, color: '#4A7080' }} />
                        <p style={{ fontSize: 14, color: '#4A7080' }}>Total Archived</p>
                      </div>
                      <p
                        className="font-display mt-1.5 font-semibold"
                        style={{ fontSize: 26, color: '#0D2630' }}
                      >
                        {stats.total}
                      </p>
                    </div>
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Archive style={{ width: 15, height: 15, color: '#00B4D8' }} />
                        <p style={{ fontSize: 14, color: '#4A7080' }}>Archived This Month</p>
                      </div>
                      <p
                        className="font-display mt-1.5 font-semibold"
                        style={{ fontSize: 26, color: '#0D2630' }}
                      >
                        {stats.thisMonth}
                      </p>
                    </div>
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center gap-2">
                        <AlertCircle style={{ width: 15, height: 15, color: '#EF4444' }} />
                        <p style={{ fontSize: 14, color: '#4A7080' }}>Retention Expiring Soon</p>
                      </div>
                      <p
                        className="font-display mt-1.5 font-semibold"
                        style={{ fontSize: 26, color: '#0D2630' }}
                      >
                        {stats.pendingDeletion}
                      </p>
                    </div>
                    <div
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Copy style={{ width: 15, height: 15, color: '#8B5CF6' }} />
                        <p style={{ fontSize: 14, color: '#4A7080' }}>Duplicate Records</p>
                      </div>
                      <p
                        className="font-display mt-1.5 font-semibold"
                        style={{ fontSize: 26, color: '#0D2630' }}
                      >
                        {stats.duplicates}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div
                className="mt-5 rounded-[12px] p-4 sm:p-5"
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
                      placeholder="Search by name, MRN or Student ID"
                      className="h-11 w-full rounded-[10px] pr-3.5 pl-9 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.18)',
                      }}
                    />
                  </div>
                  <FormSelect
                    id="archived-reason-filter"
                    value={reason}
                    onChange={(v) => {
                      setReason(v);
                      setCurrentPage(1);
                    }}
                    options={ARCHIVE_REASONS.map((r) => ({ value: r, label: r }))}
                    placeholder="All Reasons"
                  />
                </div>

                <div className="mt-4 overflow-x-auto scroll-smooth">
                  <div className="min-w-[970px]">
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="min-w-0 flex-1 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Patient
                        </span>
                      </div>
                      <div className="w-44 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Faculty / Dept
                        </span>
                      </div>
                      <div className="w-56 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Reason
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Date Archived
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Retention Until
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-3 text-right">
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
                          <Archive style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No archived records match your filters
                        </p>
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}

                    {pageRows.map((rec) => {
                      const cfg = REASON_CFG[rec.reason];
                      return (
                        <div
                          key={rec.id}
                          className="flex items-center"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="min-w-0 flex-1 py-3 pr-2 pl-3">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {rec.patientName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                              {rec.mrn}
                            </p>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {rec.faculty}
                            </p>
                          </div>
                          <div className="w-56 shrink-0 py-3 pr-2">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: cfg.color,
                                background: cfg.bg,
                              }}
                            >
                              {rec.reason}
                            </span>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(rec.dateArchived)}
                            </p>
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(rec.retentionUntil)}
                            </p>
                          </div>
                          <div
                            className="flex w-28 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toast.info(
                                  'Viewing record',
                                  `Opening ${rec.patientName}'s archived record.`,
                                )
                              }
                              aria-label={`View ${rec.patientName}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                              <button
                                type="button"
                                onClick={() => setRestoringId(rec.id)}
                                aria-label={`Restore ${rec.patientName}`}
                                className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(34,197,94,0.10)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <ArchiveRestore
                                  style={{ width: 15, height: 15, color: '#22C55E' }}
                                />
                              </button>
                            </PermissionGate>
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
                      records
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

      {restoringRecord && (
        <RestoreRecordModal
          record={restoringRecord}
          onClose={() => setRestoringId(null)}
          onConfirm={handleRestore}
        />
      )}
    </div>
  );
}
