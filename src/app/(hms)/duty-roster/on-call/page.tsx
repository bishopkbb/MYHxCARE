'use client';

import { AlertCircle, ChevronLeft, Phone, PhoneCall, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import {
  DEPARTMENT_OPTIONS,
  ON_CALL_LEVEL_META,
  ON_CALL_SCHEDULE,
  ON_CALL_STATUS_META,
  TODAY_ON_CALL,
  type OnCallAssignment,
  type OnCallLevel,
} from '@/features/workforce/__mocks__/workforceFixtures';

const ReassignOnCallModal = dynamic(
  () => import('./ReassignOnCallModal').then((m) => m.ReassignOnCallModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';

const LEVEL_ORDER: OnCallLevel[] = ['PRIMARY', 'SECONDARY', 'CONSULTANT'];
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />;
}

export default function OnCallSchedulePage() {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [todayOnCall, setTodayOnCall] = useState<OnCallAssignment[]>(TODAY_ON_CALL);
  const [reassigning, setReassigning] = useState<OnCallAssignment | null>(null);
  const [deptFilter, setDeptFilter] = useState<string | 'ALL'>('ALL');
  const [levelFilter, setLevelFilter] = useState<OnCallLevel | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const departmentsOnCall = Array.from(new Set(todayOnCall.map((a) => a.department)));

  const filteredSchedule = ON_CALL_SCHEDULE.filter((entry) => {
    const matchesDept = deptFilter === 'ALL' || entry.department === deptFilter;
    const matchesLevel = levelFilter === 'ALL' || entry.level === levelFilter;
    return matchesDept && matchesLevel;
  });
  const totalPages = Math.max(1, Math.ceil(filteredSchedule.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginatedSchedule = filteredSchedule.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize,
  );

  function handleReassignSave(updated: OnCallAssignment) {
    setTodayOnCall((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setReassigning(null);
  }

  function handleCall(assignment: OnCallAssignment) {
    toast.info('Calling…', `Dialing ${assignment.doctorName} at ${assignment.phone}.`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.dutyRoster)}
            className="mb-3 flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Back to Workforce Management
          </button>

          <h1
            className="font-display font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            On-Call Schedule
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            On-call rota, emergency cover, and escalation chains by department.
          </p>

          {/* ── Today's On-Call ─────────────────────────────────────────────── */}
          <div className="mt-5">
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Today&apos;s On-Call
            </h2>

            {pageState === 'loading' ? (
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <SkeletonBlock className="h-4 w-32" />
                    <div className="mt-3 space-y-2">
                      <SkeletonBlock className="h-10 w-full" />
                      <SkeletonBlock className="h-10 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pageState === 'error' ? (
              <div
                className="mt-3 flex flex-col items-center justify-center gap-3 rounded-[12px] py-14 text-center"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <AlertCircle style={{ width: 32, height: 32, color: '#EF4444' }} />
                <p className="font-sans font-semibold" style={{ fontSize: 15, color: '#0D2630' }}>
                  Failed to load on-call data
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
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {departmentsOnCall.map((dept) => {
                  const rows = todayOnCall
                    .filter((a) => a.department === dept)
                    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
                  return (
                    <div
                      key={dept}
                      className="rounded-[12px] p-4"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        {dept}
                      </p>
                      <div className="mt-3 flex flex-col gap-2">
                        {rows.map((a) => {
                          const statusMeta = ON_CALL_STATUS_META[a.status];
                          const levelMeta = ON_CALL_LEVEL_META[a.level];
                          return (
                            <div
                              key={a.id}
                              className="flex flex-wrap items-center gap-3 rounded-[10px] px-3 py-2.5"
                              style={{ border: '1px solid rgba(0,100,130,0.08)' }}
                            >
                              <div
                                className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                                style={{ background: a.avatarBg }}
                              >
                                {a.initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {a.doctorName}
                                </p>
                                <p style={{ fontSize: 14, color: levelMeta.color }}>
                                  {levelMeta.label}
                                </p>
                              </div>
                              <span
                                className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                                style={{
                                  fontSize: 14,
                                  whiteSpace: 'nowrap',
                                  color: statusMeta.color,
                                  border: `1px solid ${statusMeta.border}`,
                                  background: statusMeta.bg,
                                }}
                              >
                                {statusMeta.label}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCall(a)}
                                aria-label={`Call ${a.doctorName}`}
                                className="flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <PhoneCall style={{ width: 15, height: 15, color: '#00B4D8' }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setReassigning(a)}
                                className="shrink-0 rounded-[8px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                style={{
                                  fontSize: 14,
                                  color: '#00B4D8',
                                  border: '1px solid #00B4D8',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Reassign
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Weekly On-Call Schedule ─────────────────────────────────────── */}
          <div
            className="mt-5 overflow-hidden rounded-[12px]"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="p-4 sm:p-5">
              <h2
                className="font-display font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
              >
                Weekly On-Call Schedule
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <select
                    value={deptFilter}
                    onChange={(e) => {
                      setDeptFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 appearance-none rounded-[10px] pr-9 pl-3.5 font-sans font-medium"
                    style={{
                      border: '1px solid #0064821F',
                      background: '#FFFFFF',
                      fontSize: 14,
                      color: '#0D2630',
                    }}
                  >
                    <option value="ALL">All Departments</option>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={levelFilter}
                    onChange={(e) => {
                      setLevelFilter(e.target.value as OnCallLevel | 'ALL');
                      setPage(1);
                    }}
                    className="h-11 appearance-none rounded-[10px] pr-9 pl-3.5 font-sans font-medium"
                    style={{
                      border: '1px solid #0064821F',
                      background: '#FFFFFF',
                      fontSize: 14,
                      color: '#0D2630',
                    }}
                  >
                    <option value="ALL">All Levels</option>
                    {LEVEL_ORDER.map((l) => (
                      <option key={l} value={l}>
                        {ON_CALL_LEVEL_META[l].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {pageState === 'loading' ? (
              <div className="pb-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex min-h-[56px] items-center gap-4 px-5 py-3"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <SkeletonBlock className="h-4 w-24" />
                    <SkeletonBlock className="h-4 w-36" />
                    <SkeletonBlock className="h-6 w-24" />
                    <SkeletonBlock className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : pageState === 'error' ? null : filteredSchedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Phone style={{ width: 28, height: 28, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  No on-call entries found
                </p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  Try a different department or level filter.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto scroll-smooth lg:block">
                  <div
                    className="flex"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderTop: '1px solid #0064821F',
                      borderBottom: '1px solid #0064821F',
                    }}
                  >
                    <div className="w-[16%] px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Date
                      </span>
                    </div>
                    <div className="w-[28%] px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Department
                      </span>
                    </div>
                    <div className="w-[20%] px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Level
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Doctor
                      </span>
                    </div>
                  </div>
                  {paginatedSchedule.map((entry) => {
                    const levelMeta = ON_CALL_LEVEL_META[entry.level];
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-[16%] px-4 py-3">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.date}</p>
                        </div>
                        <div className="w-[28%] px-4 py-3">
                          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                            {entry.department}
                          </p>
                        </div>
                        <div className="w-[20%] px-4 py-3">
                          <span
                            className="inline-flex rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: levelMeta.color,
                              border: `1px solid ${levelMeta.color}66`,
                              background: 'transparent',
                            }}
                          >
                            {levelMeta.label}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3">
                          <div
                            className="flex size-7 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                            style={{ background: entry.avatarBg, fontSize: 13 }}
                          >
                            {entry.initials}
                          </div>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {entry.doctorName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 px-4 py-3 lg:hidden">
                  {paginatedSchedule.map((entry) => {
                    const levelMeta = ON_CALL_LEVEL_META[entry.level];
                    return (
                      <div
                        key={entry.id}
                        className="rounded-[10px] p-3"
                        style={{ border: '1px solid rgba(0,100,130,0.10)' }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.date}</p>
                          <span
                            className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: levelMeta.color,
                              border: `1px solid ${levelMeta.color}66`,
                            }}
                          >
                            {levelMeta.label}
                          </span>
                        </div>
                        <p
                          className="mt-1 font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {entry.doctorName}
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>{entry.department}</p>
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  page={clampedPage}
                  pageSize={pageSize}
                  totalItems={filteredSchedule.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="entries"
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              </>
            )}
          </div>

          <div className="h-4" />
        </div>
      </main>

      {reassigning && (
        <ReassignOnCallModal
          assignment={reassigning}
          onClose={() => setReassigning(null)}
          onSave={handleReassignSave}
        />
      )}
    </div>
  );
}
