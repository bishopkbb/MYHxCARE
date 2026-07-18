'use client';

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Repeat,
  Search,
  Timer,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { StatCardCompact } from '@components/shared/StatCard';
import { UserAvatar } from '@components/shared/UserAvatar';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatTime } from '@/utils/datetime';
import {
  CHECKED_IN_TODAY,
  CHECKED_IN_TREND_PERCENT,
  DEPARTMENTS,
  PATIENTS_SERVED_TODAY,
  PATIENTS_SERVED_TREND_PERCENT,
  QUEUE_ENTRIES,
  type QueueEntry,
  type QueueStatus,
} from '@/features/registration/__mocks__/queueFixtures';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const STATUS_CFG: Record<QueueStatus, { color: string; border: string; bg: string }> = {
  'New Arrival': { color: '#00B4D8', border: 'rgba(0,180,216,0.35)', bg: 'rgba(0,180,216,0.06)' },
  Waiting: { color: '#F59E0B', border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.06)' },
  'Calling Next': {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.35)',
    bg: 'rgba(139,92,246,0.06)',
  },
  'In Consultation': {
    color: '#22C55E',
    border: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.06)',
  },
  Emergency: { color: '#EF4444', border: 'rgba(239,68,68,0.35)', bg: 'rgba(239,68,68,0.06)' },
  Completed: { color: '#8A98A3', border: 'rgba(138,152,163,0.35)', bg: 'rgba(138,152,163,0.06)' },
};

function waitMinutes(arrivalTime: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(arrivalTime).getTime()) / 60_000));
}

function nextAction(status: QueueStatus, clinic: string): string {
  switch (status) {
    case 'New Arrival':
      return 'Awaiting triage';
    case 'Waiting':
      return `To be called to ${clinic}`;
    case 'Calling Next':
      return `Proceed to ${clinic}`;
    case 'In Consultation':
      return 'Currently with doctor';
    case 'Emergency':
      return 'To be seen by doctor immediately';
    case 'Completed':
      return 'Visit complete';
  }
}

const REGISTRATION_OFFICER_NAME = 'Adaobi Nwankwo';

export default function QueueManagementPage() {
  const router = useRouter();
  const toast = useToast();
  const [entries, setEntries] = useState<QueueEntry[]>(QUEUE_ENTRIES);
  const [servedToday, setServedToday] = useState(PATIENTS_SERVED_TODAY);
  const [now, setNow] = useState(() => Date.now());
  const [activeDepartment, setActiveDepartment] = useState<string>('All Departments');
  const [clinicFilter, setClinicFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(
    entries.find((e) => e.isEmergency)?.id ?? entries[0]?.id ?? null,
  );
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignDept, setReassignDept] = useState('');
  const [reassignClinic, setReassignClinic] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const activeEntries = useMemo(() => entries.filter((e) => e.status !== 'Completed'), [entries]);

  const departmentTabs = useMemo(() => ['All Departments', ...DEPARTMENTS], []);

  const clinicOptions = useMemo(() => {
    const pool =
      activeDepartment === 'All Departments'
        ? activeEntries
        : activeEntries.filter((e) => e.department === activeDepartment);
    return Array.from(new Set(pool.map((e) => e.assignedClinic))).map((c) => ({
      value: c,
      label: c,
    }));
  }, [activeEntries, activeDepartment]);

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(activeEntries.map((e) => e.status))).map((s) => ({ value: s, label: s })),
    [activeEntries],
  );

  const filteredEntries = useMemo(() => {
    return activeEntries.filter((e) => {
      if (activeDepartment !== 'All Departments' && e.department !== activeDepartment) return false;
      if (clinicFilter && e.assignedClinic !== clinicFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !e.patientName.toLowerCase().includes(q) &&
          !e.mrn.toLowerCase().includes(q) &&
          !e.queueNumber.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [activeEntries, activeDepartment, clinicFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageEntries = filteredEntries.slice(pageStart, pageStart + rowsPerPage);
  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null;
  const emergencyCount = activeEntries.filter((e) => e.isEmergency).length;
  const avgWaitMinutes =
    activeEntries.length > 0
      ? Math.round(
          activeEntries.reduce((sum, e) => sum + waitMinutes(e.arrivalTime, now), 0) /
            activeEntries.length,
        )
      : 0;

  function selectDepartment(dept: string) {
    setActiveDepartment(dept);
    setClinicFilter('');
    setCurrentPage(1);
  }

  function refreshQueue() {
    toast.success('Queue refreshed', 'Wait times and status have been updated.');
  }

  function openReassign(entry: QueueEntry) {
    setReassignDept(entry.department);
    setReassignClinic(entry.assignedClinic);
    setReassignOpen(true);
  }

  function confirmReassign() {
    if (!selectedEntry || !reassignClinic) return;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === selectedEntry.id
          ? {
              ...e,
              department: reassignDept,
              assignedClinic: reassignClinic,
              history: [
                ...e.history,
                {
                  time: new Date().toISOString(),
                  label: `Reassigned to ${reassignClinic}`,
                  by: REGISTRATION_OFFICER_NAME,
                },
              ],
            }
          : e,
      ),
    );
    toast.success('Queue reassigned', `${selectedEntry.patientName} moved to ${reassignClinic}.`);
    setReassignOpen(false);
  }

  function prioritizeEmergency(entry: QueueEntry) {
    if (entry.isEmergency) return;
    const nextNum = `E00${emergencyCount + 1}`;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? {
              ...e,
              isEmergency: true,
              status: 'Emergency',
              queueNumber: nextNum,
              history: [
                ...e.history,
                {
                  time: new Date().toISOString(),
                  label: 'Marked as Emergency Priority',
                  by: REGISTRATION_OFFICER_NAME,
                },
              ],
            }
          : e,
      ),
    );
    toast.success('Marked as emergency', `${entry.patientName} moved to high-priority queue.`);
  }

  function completeCheckIn(entry: QueueEntry) {
    if (entry.status === 'Completed') return;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? {
              ...e,
              status: 'Completed',
              history: [
                ...e.history,
                {
                  time: new Date().toISOString(),
                  label: 'Check-in completed',
                  by: REGISTRATION_OFFICER_NAME,
                },
              ],
            }
          : e,
      ),
    );
    setServedToday((n) => n + 1);
    toast.success('Check-in complete', `${entry.patientName} marked as served.`);
    setSelectedId((id) => (id === entry.id ? null : id));
  }

  function requireSelection(action: (entry: QueueEntry) => void) {
    if (!selectedEntry) {
      toast.info('Select a patient', 'Choose a patient from the queue first.');
      return;
    }
    action(selectedEntry);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.registration)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Patient Management</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Queue Management
            </span>
          </nav>

          <h1
            className="font-display mt-2 font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Queue Management
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Monitor patient queues, manage flow and prioritize urgent cases
          </p>

          {/* ── Stats ─────────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCardCompact
              icon={ClipboardList}
              iconBg="rgba(0,180,216,0.12)"
              iconColor="#00B4D8"
              label="Total Patients in Queue"
              value={String(activeEntries.length)}
              info="Across all departments"
              infoColor="#4A7080"
            />
            <StatCardCompact
              icon={UserCheck}
              iconBg="rgba(34,197,94,0.12)"
              iconColor="#22C55E"
              label="Checked-In Today"
              value={String(CHECKED_IN_TODAY)}
              info={`+${CHECKED_IN_TREND_PERCENT}% vs yesterday`}
              infoColor="#22C55E"
            />
            <StatCardCompact
              icon={Timer}
              iconBg="rgba(245,158,11,0.12)"
              iconColor="#F59E0B"
              label="Average Wait Time"
              value={`${avgWaitMinutes} mins`}
              info="Across all clinics"
              infoColor="#4A7080"
            />
            <StatCardCompact
              icon={Users}
              iconBg="rgba(139,92,246,0.12)"
              iconColor="#8B5CF6"
              label="Patients Served Today"
              value={String(servedToday)}
              info={`+${PATIENTS_SERVED_TREND_PERCENT}% vs yesterday`}
              infoColor="#22C55E"
            />
            <StatCardCompact
              icon={AlertTriangle}
              iconBg="rgba(239,68,68,0.12)"
              iconColor="#EF4444"
              label="Emergency Patients"
              value={String(emergencyCount)}
              info="High priority"
              infoColor="#EF4444"
            />
          </div>

          {/* ── Department tabs ───────────────────────────────────────────── */}
          <div
            className="mt-5 flex gap-1 overflow-x-auto scroll-smooth rounded-[12px] bg-white p-1.5"
            style={{ border: '1px solid rgba(0,100,130,0.12)' }}
          >
            {departmentTabs.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => selectDepartment(dept)}
                className="shrink-0 rounded-[8px] px-3.5 py-2 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  fontSize: 14,
                  color: activeDepartment === dept ? '#FFFFFF' : '#4A7080',
                  background: activeDepartment === dept ? '#00B4D8' : 'transparent',
                }}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* ── Filters ───────────────────────────────────────────────────── */}
          <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="w-full sm:w-44">
              <FormSelect
                id="filter-clinic"
                value={clinicFilter}
                onChange={setClinicFilter}
                options={clinicOptions}
                placeholder="All Clinics"
              />
            </div>
            <div className="w-full sm:w-44">
              <FormSelect
                id="filter-status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                placeholder="All Status"
              />
            </div>
            <div className="relative w-full sm:min-w-0 sm:flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                style={{ width: 16, height: 16, color: '#8A98A3' }}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search queue by patient name, MRN or queue number..."
                className="h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>
            <button
              type="button"
              onClick={refreshQueue}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
            >
              <RefreshCw style={{ width: 15, height: 15 }} />
              Refresh Queue
            </button>
          </div>

          {/* ── Table + detail panel ─────────────────────────────────────── */}
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
            <div
              className="min-w-0 flex-1 rounded-[12px] bg-white p-4"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  Current Queue
                </p>
                <span
                  className="rounded-full px-2 py-0.5 font-sans font-semibold"
                  style={{ fontSize: 14, color: '#00B4D8', background: 'rgba(0,180,216,0.1)' }}
                >
                  {filteredEntries.length}
                </span>
              </div>

              <div className="mt-3 overflow-x-auto scroll-smooth">
                <div className="min-w-[1080px]">
                  <div
                    className="flex items-center rounded-t-[8px]"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    {[
                      ['Queue No.', 'w-24 pl-4'],
                      ['Patient Name', 'min-w-[170px] flex-1'],
                      ['Department', 'w-36'],
                      ['Assigned Clinic', 'w-40'],
                      ['Arrival Time', 'w-24'],
                      ['Wait Time', 'w-24'],
                      ['Status', 'w-32'],
                    ].map(([label, width]) => (
                      <div key={label} className={`${width} shrink-0 py-3 pr-3`}>
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                    <div className="w-32 shrink-0 py-3 pr-4 text-right">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Actions
                      </span>
                    </div>
                  </div>

                  {pageEntries.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div
                        className="flex size-14 items-center justify-center rounded-full"
                        style={{ background: 'rgba(226,237,241,0.6)' }}
                      >
                        <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No patients in this queue
                        </p>
                        <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                          Try a different department, clinic or status filter
                        </p>
                      </div>
                      {(activeDepartment !== 'All Departments' ||
                        clinicFilter ||
                        statusFilter ||
                        search) && (
                        <button
                          type="button"
                          onClick={() => {
                            selectDepartment('All Departments');
                            setStatusFilter('');
                            setSearch('');
                          }}
                          className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}

                  {pageEntries.map((entry) => {
                    const cfg = STATUS_CFG[entry.status];
                    const isSelected = selectedId === entry.id;
                    const wait = waitMinutes(entry.arrivalTime, now);
                    return (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedId(entry.id)}
                        className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: '1px solid rgba(0,100,130,0.08)',
                          background: isSelected
                            ? '#E6F8FD'
                            : entry.isEmergency
                              ? 'rgba(239,68,68,0.04)'
                              : 'transparent',
                        }}
                      >
                        <div className="w-24 shrink-0 py-3 pr-3 pl-4">
                          <span
                            className="inline-block rounded-[6px] px-2 py-0.5 font-sans font-semibold"
                            style={{
                              fontSize: 14,
                              color: entry.isEmergency ? '#EF4444' : '#0D2630',
                              border: `1px solid ${entry.isEmergency ? 'rgba(239,68,68,0.35)' : 'rgba(0,100,130,0.18)'}`,
                              background: entry.isEmergency
                                ? 'rgba(239,68,68,0.06)'
                                : 'transparent',
                            }}
                          >
                            {entry.queueNumber}
                          </span>
                        </div>
                        <div className="flex min-w-[170px] flex-1 items-center gap-2.5 py-3 pr-3">
                          <div
                            className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                            style={{ background: entry.isEmergency ? '#EF4444' : '#00B4D8' }}
                          >
                            {entry.patientName
                              .split(' ')
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {entry.patientName}
                            </p>
                            <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                              {entry.mrn}
                            </p>
                          </div>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-3">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {entry.department}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-3">
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {entry.assignedClinic}
                          </p>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {entry.attendingDoctor}
                          </p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-3">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatTime(entry.arrivalTime)}
                          </p>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-3">
                          <p
                            className="font-sans font-semibold"
                            style={{ fontSize: 14, color: wait > 30 ? '#EF4444' : '#0D2630' }}
                          >
                            {wait} mins
                          </p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-3">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              color: cfg.color,
                              border: `1px solid ${cfg.border}`,
                              background: cfg.bg,
                            }}
                          >
                            {entry.status}
                          </span>
                        </div>
                        <div
                          className="flex w-32 shrink-0 items-center justify-end gap-1 py-3 pr-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(entry.id);
                                openReassign(entry);
                              }}
                              aria-label={`Reassign ${entry.patientName}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Repeat style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => prioritizeEmergency(entry)}
                              disabled={entry.isEmergency}
                              aria-label={`Prioritize ${entry.patientName} as emergency`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <AlertTriangle style={{ width: 15, height: 15, color: '#EF4444' }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => completeCheckIn(entry)}
                              aria-label={`Complete check-in for ${entry.patientName}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <CheckCircle2 style={{ width: 15, height: 15, color: '#22C55E' }} />
                            </button>
                          </PermissionGate>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Bottom bar: showing + pagination + rows-per-page ─────────── */}
              {filteredEntries.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Showing {pageStart + 1} to{' '}
                    {Math.min(pageStart + rowsPerPage, filteredEntries.length)} of{' '}
                    {filteredEntries.length} patients
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce<(number | 'ellipsis')[]>((acc, p) => {
                        if (acc.length > 0 && typeof acc[acc.length - 1] === 'number') {
                          const prev = acc[acc.length - 1] as number;
                          if (p - prev > 1) acc.push('ellipsis');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === 'ellipsis' ? (
                          <span
                            key={`e-${i}`}
                            style={{ fontSize: 14, color: '#8A98A3' }}
                            className="px-1"
                          >
                            …
                          </span>
                        ) : (
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
                        ),
                      )}
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
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-9 rounded-[8px] px-2 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    >
                      {ROWS_PER_PAGE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* ── Queue Details panel ───────────────────────────────────── */}
            {selectedEntry && (
              <div
                className="w-full shrink-0 rounded-[12px] bg-white p-4 xl:w-[340px]"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Queue Details
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Close queue details"
                    className="flex size-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  >
                    <X style={{ width: 16, height: 16, color: '#8A98A3' }} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="inline-block rounded-[6px] px-2 py-0.5 font-sans font-semibold"
                    style={{
                      fontSize: 14,
                      color: selectedEntry.isEmergency ? '#EF4444' : '#0D2630',
                      border: `1px solid ${selectedEntry.isEmergency ? 'rgba(239,68,68,0.35)' : 'rgba(0,100,130,0.18)'}`,
                      background: selectedEntry.isEmergency
                        ? 'rgba(239,68,68,0.06)'
                        : 'transparent',
                    }}
                  >
                    {selectedEntry.queueNumber}
                  </span>
                  {selectedEntry.isEmergency && (
                    <span
                      style={{ fontSize: 14, color: '#EF4444' }}
                      className="font-sans font-medium"
                    >
                      Emergency Patient
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <UserAvatar
                    initials={selectedEntry.patientName
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')}
                    size={48}
                    bg={selectedEntry.isEmergency ? '#EF4444' : '#00B4D8'}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-display truncate font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      {selectedEntry.patientName}
                    </p>
                    <p style={{ fontSize: 14, color: '#00B4D8' }}>{selectedEntry.mrn}</p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {selectedEntry.gender}, {selectedEntry.age} Yrs
                    </p>
                  </div>
                  {selectedEntry.isEmergency && (
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: '#EF4444',
                        border: '1px solid rgba(239,68,68,0.35)',
                      }}
                    >
                      High Priority
                    </span>
                  )}
                </div>

                <div
                  className="mt-4 flex flex-col gap-2.5"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 14 }}
                >
                  {[
                    ['Department', selectedEntry.department],
                    ['Assigned Clinic', selectedEntry.assignedClinic],
                    ['Attending Doctor', selectedEntry.attendingDoctor],
                    [
                      'Arrival Time',
                      `${formatTime(selectedEntry.arrivalTime)} (${waitMinutes(selectedEntry.arrivalTime, now)} mins ago)`,
                    ],
                    ['Queue Time', `${waitMinutes(selectedEntry.arrivalTime, now)} mins`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
                      <p
                        className="truncate text-right font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Status</p>
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: STATUS_CFG[selectedEntry.status].color,
                        border: `1px solid ${STATUS_CFG[selectedEntry.status].border}`,
                        background: STATUS_CFG[selectedEntry.status].bg,
                      }}
                    >
                      {selectedEntry.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Next Action</p>
                    <p
                      className="truncate text-right font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {nextAction(selectedEntry.status, selectedEntry.assignedClinic)}
                    </p>
                  </div>
                </div>

                {reassignOpen ? (
                  <div
                    className="animate-in fade-in-0 slide-in-from-top-1 mt-4 flex flex-col gap-2.5 rounded-[10px] p-3 duration-150"
                    style={{
                      border: '1px solid rgba(0,180,216,0.3)',
                      background: 'rgba(0,180,216,0.04)',
                    }}
                  >
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Reassign to
                    </p>
                    <FormSelect
                      id="reassign-department"
                      value={reassignDept}
                      onChange={(v) => {
                        setReassignDept(v);
                        setReassignClinic('');
                      }}
                      options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                      placeholder="Select department"
                    />
                    <FormSelect
                      id="reassign-clinic"
                      value={reassignClinic}
                      onChange={setReassignClinic}
                      options={Array.from(
                        new Set(
                          entries
                            .filter((e) => e.department === reassignDept)
                            .map((e) => e.assignedClinic),
                        ),
                      ).map((c) => ({ value: c, label: c }))}
                      placeholder="Select clinic"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={confirmReassign}
                        disabled={!reassignClinic}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setReassignOpen(false)}
                        className="flex h-9 flex-1 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#4A7080',
                          border: '1px solid rgba(0,100,130,0.18)',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => openReassign(selectedEntry)}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#00B4D8',
                          border: '1px solid rgba(0,180,216,0.35)',
                        }}
                      >
                        <Repeat style={{ width: 15, height: 15 }} />
                        Reassign Queue
                      </button>
                      <button
                        type="button"
                        onClick={() => prioritizeEmergency(selectedEntry)}
                        disabled={selectedEntry.isEmergency}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        style={{
                          fontSize: 14,
                          color: '#EF4444',
                          border: '1px solid rgba(239,68,68,0.35)',
                        }}
                      >
                        <AlertTriangle style={{ width: 15, height: 15 }} />
                        Prioritize
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => completeCheckIn(selectedEntry)}
                      className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{ fontSize: 14, background: '#22C55E' }}
                    >
                      <CheckCircle2 style={{ width: 16, height: 16 }} />
                      Check-In Complete
                    </button>
                  </PermissionGate>
                )}

                <div
                  className="mt-4"
                  style={{ borderTop: '1px solid rgba(0,100,130,0.08)', paddingTop: 14 }}
                >
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    Queue History
                  </p>
                  <div className="mt-2.5 flex flex-col gap-3">
                    {selectedEntry.history.map((h, i) => (
                      <div key={i} className="flex gap-2.5">
                        <div className="flex w-16 shrink-0 flex-col items-end">
                          <span
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: h.pending ? '#8A98A3' : '#0D2630' }}
                          >
                            {h.time ? formatTime(h.time) : '--'}
                          </span>
                        </div>
                        <div
                          className="mt-1 size-2 shrink-0 rounded-full"
                          style={{ background: h.pending ? '#E2EDF1' : '#00B4D8' }}
                        />
                        <div className="min-w-0 flex-1 pb-1">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: h.pending ? '#8A98A3' : '#0D2630' }}
                          >
                            {h.label}
                          </p>
                          {h.by && <p style={{ fontSize: 14, color: '#8A98A3' }}>by {h.by}</p>}
                          {h.pending && <p style={{ fontSize: 14, color: '#8A98A3' }}>Pending</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Quick Actions ─────────────────────────────────────────────── */}
          <div className="mt-5">
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Quick Actions
            </p>
            <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => requireSelection(openReassign)}
                  className="flex items-center gap-3 rounded-[12px] bg-white p-4 text-left transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: 'rgba(0,180,216,0.12)' }}
                  >
                    <Repeat style={{ width: 20, height: 20, color: '#00B4D8' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Reassign Queue
                    </p>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      Move patient to another clinic
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => requireSelection(prioritizeEmergency)}
                  className="flex items-center gap-3 rounded-[12px] bg-white p-4 text-left transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: 'rgba(239,68,68,0.12)' }}
                  >
                    <AlertTriangle style={{ width: 20, height: 20, color: '#EF4444' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Prioritize Emergency
                    </p>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      Mark as high priority
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => requireSelection(completeCheckIn)}
                  className="flex items-center gap-3 rounded-[12px] bg-white p-4 text-left transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: 'rgba(34,197,94,0.12)' }}
                  >
                    <CheckCircle2 style={{ width: 20, height: 20, color: '#22C55E' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Check-In Complete
                    </p>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      Mark patient as served
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.registrationCheckIn)}
                  className="flex items-center gap-3 rounded-[12px] bg-white p-4 text-left transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: 'rgba(139,92,246,0.12)' }}
                  >
                    <UserPlus style={{ width: 20, height: 20, color: '#8B5CF6' }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                      Add Walk-in Patient
                    </p>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      Register and add to queue
                    </p>
                  </div>
                </button>
              </div>
            </PermissionGate>
          </div>

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
