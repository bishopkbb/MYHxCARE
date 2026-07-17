'use client';

import { AlertCircle, ChevronLeft, RefreshCw, Search, UserCog, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { ROUTES } from '@/constants/routes';
import {
  ASSIGNMENT_STATUS_META,
  DEPARTMENT_OPTIONS,
  DOCTOR_POOL,
  HANDOFF_LOG,
  type AssignableDoctor,
  type AssignmentStatus,
  type HandoffRecord,
} from '@/features/workforce/__mocks__/workforceFixtures';

const AssignDoctorModal = dynamic(
  () => import('./AssignDoctorModal').then((m) => m.AssignDoctorModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';

const STATUS_OPTIONS: { value: AssignmentStatus; label: string }[] = [
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'UNASSIGNED', label: 'Unassigned' },
  { value: 'ON_LEAVE', label: 'On Leave' },
];

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <p style={{ fontSize: 14, color: '#4A7080' }}>{label}</p>
      <p
        className="font-display mt-1.5 font-bold"
        style={{ fontSize: 26, lineHeight: '32px', color: '#0D2630' }}
      >
        {value}
      </p>
    </div>
  );
}

export default function StaffAssignmentPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [doctors, setDoctors] = useState<AssignableDoctor[]>(DOCTOR_POOL);
  const [handoffLog, setHandoffLog] = useState<HandoffRecord[]>(HANDOFF_LOG);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string | 'ALL'>('ALL');
  const [status, setStatus] = useState<AssignmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [assigning, setAssigning] = useState<AssignableDoctor | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const q = search.trim().toLowerCase();
  const filtered = doctors.filter((d) => {
    const matchesSearch = !q || d.name.toLowerCase().includes(q);
    const matchesDept = department === 'ALL' || d.department === department;
    const matchesStatus = status === 'ALL' || d.status === status;
    return matchesSearch && matchesDept && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginated = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  function handleAssignSave(doctor: AssignableDoctor, notes: string) {
    setDoctors((prev) => prev.map((d) => (d.id === doctor.id ? doctor : d)));
    if (notes) {
      setHandoffLog((prev) => [
        {
          id: `ho-${Date.now()}`,
          ward: doctor.currentWard ?? 'Unassigned',
          outgoingDoctor: '—',
          incomingDoctor: doctor.name,
          timestamp: 'Just now',
          notes,
        },
        ...prev,
      ]);
    }
    setAssigning(null);
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
            Assign Doctors
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Ward and department allocation, with duty hand-off notes for incoming doctors.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatMini label="Total Doctors" value={String(doctors.length)} />
            <StatMini
              label="Assigned"
              value={String(doctors.filter((d) => d.status === 'ASSIGNED').length)}
            />
            <StatMini
              label="Unassigned"
              value={String(doctors.filter((d) => d.status === 'UNASSIGNED').length)}
            />
            <StatMini
              label="On Leave"
              value={String(doctors.filter((d) => d.status === 'ON_LEAVE').length)}
            />
          </div>

          <div
            className="mt-5 overflow-hidden rounded-[12px]"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="p-4 sm:p-5">
              <h2
                className="font-display font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
              >
                Doctor Pool
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <div
                  className="flex h-11 min-w-[220px] flex-1 items-center gap-2.5 rounded-[10px] px-3.5"
                  style={{ border: '1px solid #0064821F', background: '#FFFFFF' }}
                >
                  <Search style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search doctor by name"
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8A98A3]"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  />
                </div>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
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
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value as AssignmentStatus | 'ALL');
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
                    <option value="ALL">All Status</option>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
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
                    className="flex min-h-[64px] items-center gap-4 px-5 py-3"
                    style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="size-9 animate-pulse rounded-full bg-slate-100" />
                    <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                    <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : pageState === 'error' ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                <AlertCircle style={{ width: 32, height: 32, color: '#EF4444' }} />
                <p className="font-sans font-semibold" style={{ fontSize: 15, color: '#0D2630' }}>
                  Failed to load doctors
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
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Users style={{ width: 28, height: 28, color: '#8A98A3' }} />
                </div>
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  No doctors found
                </p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  Try adjusting your search or filters.
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
                    <div className="w-[24%] px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Doctor
                      </span>
                    </div>
                    <div className="w-[14%] px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Role
                      </span>
                    </div>
                    <div className="w-[20%] px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Department
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Current Ward
                      </span>
                    </div>
                    <div className="w-30 shrink-0 px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
                      </span>
                    </div>
                    <div className="w-28 shrink-0 px-4 py-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Actions
                      </span>
                    </div>
                  </div>
                  {paginated.map((doctor) => {
                    const statusMeta = ASSIGNMENT_STATUS_META[doctor.status];
                    return (
                      <div
                        key={doctor.id}
                        className="flex items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="flex w-[24%] min-w-0 items-center gap-2.5 px-4 py-3">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                            style={{ background: doctor.avatarBg }}
                          >
                            {doctor.initials}
                          </div>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {doctor.name}
                          </p>
                        </div>
                        <div className="w-[14%] px-4 py-3">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {doctor.role}
                          </p>
                        </div>
                        <div className="w-[20%] px-4 py-3">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {doctor.department}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1 px-4 py-3">
                          <p
                            className="truncate"
                            style={{
                              fontSize: 14,
                              color: doctor.currentWard ? '#4A7080' : '#8A98A3',
                            }}
                          >
                            {doctor.currentWard ?? 'Not assigned'}
                          </p>
                        </div>
                        <div className="w-30 shrink-0 px-4 py-3">
                          <span
                            className="inline-flex rounded-full px-2.5 py-0.5 font-sans font-medium"
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
                        </div>
                        <div className="w-28 shrink-0 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setAssigning(doctor)}
                            className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              fontSize: 14,
                              color: '#00B4D8',
                              border: '1px solid #00B4D8',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <UserCog style={{ width: 14, height: 14 }} />
                            {doctor.status === 'UNASSIGNED' ? 'Assign' : 'Reassign'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 px-4 py-3 lg:hidden">
                  {paginated.map((doctor) => {
                    const statusMeta = ASSIGNMENT_STATUS_META[doctor.status];
                    return (
                      <div
                        key={doctor.id}
                        className="rounded-[10px] p-3"
                        style={{ border: '1px solid rgba(0,100,130,0.10)' }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div
                              className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: doctor.avatarBg }}
                            >
                              {doctor.initials}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {doctor.name}
                              </p>
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {doctor.role} · {doctor.department}
                              </p>
                            </div>
                          </div>
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              color: statusMeta.color,
                              border: `1px solid ${statusMeta.border}`,
                              background: statusMeta.bg,
                            }}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-2" style={{ fontSize: 14, color: '#4A7080' }}>
                          {doctor.currentWard ?? 'Not assigned'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setAssigning(doctor)}
                          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[8px] py-2 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
                        >
                          <UserCog style={{ width: 14, height: 14 }} />
                          {doctor.status === 'UNASSIGNED' ? 'Assign' : 'Reassign'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  page={clampedPage}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="doctors"
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              </>
            )}
          </div>

          {/* ── Duty Hand-off Log ────────────────────────────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Duty Hand-off Log
            </h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {handoffLog.length === 0 ? (
                <p style={{ fontSize: 14, color: '#8A98A3' }}>No hand-offs recorded yet.</p>
              ) : (
                handoffLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[10px] p-3.5"
                    style={{ border: '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {entry.ward}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{entry.timestamp}</p>
                    </div>
                    <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
                      {entry.outgoingDoctor} → {entry.incomingDoctor}
                    </p>
                    <p className="mt-1.5" style={{ fontSize: 14, color: '#2F3A40' }}>
                      {entry.notes}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {assigning && (
        <AssignDoctorModal
          doctor={assigning}
          onClose={() => setAssigning(null)}
          onSave={handleAssignSave}
        />
      )}
    </div>
  );
}
