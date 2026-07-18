'use client';

import {
  Calendar,
  ChevronLeft,
  Droplet,
  Eye,
  Heart,
  Lock,
  Mail,
  MapPin,
  Phone,
  Printer,
  Search,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { UserAvatar } from '@components/shared/UserAvatar';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate } from '@/utils/datetime';
import {
  DIRECTORY_PATIENTS,
  type DirectoryPatient,
} from '@/features/registration/__mocks__/patientDirectoryFixtures';
import { MOCK_PATIENT_PROFILE } from '@/features/registration/__mocks__/patientProfileFixtures';
import {
  PATIENT_VISITS,
  RECORD_ACTIVITY,
  generateActivityFromVisits,
  generateVisitsForPatient,
} from '@/features/medical-records/__mocks__/medicalRecordDetailFixtures';
import { computeVisitSummary, VisitHistorySection } from './VisitHistorySection';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const CURATED_PATIENT_ID = 'dp-001';

function BannerStat({ icon: Icon, value }: { icon: typeof Calendar; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon style={{ width: 15, height: 15, color: '#8A98A3' }} />
      <span style={{ fontSize: 14, color: '#4A7080' }}>{value}</span>
    </div>
  );
}

function PatientPicker({ onSelect }: { onSelect: (patient: DirectoryPatient) => void }) {
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DIRECTORY_PATIENTS;
    return DIRECTORY_PATIENTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.studentId.toLowerCase().includes(q),
    );
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pagePatients = filtered.slice(pageStart, pageStart + rowsPerPage);

  return (
    <div
      className="rounded-[12px] bg-white p-4 sm:p-5"
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="relative">
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
          placeholder="Search by Name, MRN or Student ID..."
          className="h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
          style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
        />
      </div>

      <div className="mt-3 overflow-x-auto scroll-smooth">
        <div className="min-w-[720px]">
          <div
            className="flex rounded-t-[8px]"
            style={{ background: 'rgba(226,237,241,0.4)', borderBottom: '1px solid #E6F8FD' }}
          >
            <div className="min-w-0 flex-1 py-2.5 pr-2 pl-3">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Patient
              </span>
            </div>
            <div className="w-32 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                MRN
              </span>
            </div>
            <div className="w-40 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Faculty/Dept
              </span>
            </div>
            <div className="w-24 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Status
              </span>
            </div>
            <div className="w-20 shrink-0 py-2.5 pr-3 text-right">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                View
              </span>
            </div>
          </div>

          {pagePatients.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(226,237,241,0.6)' }}
              >
                <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
              </div>
              <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                No patients match your search
              </p>
            </div>
          )}

          {pagePatients.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelect(p)}
              className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                  style={{ background: p.avatarBg }}
                >
                  {p.initials}
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {p.name}
                  </p>
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {p.phone}
                  </p>
                </div>
              </div>
              <div className="w-32 shrink-0 py-3 pr-2">
                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                  {p.mrn}
                </p>
              </div>
              <div className="w-40 shrink-0 py-3 pr-2">
                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                  {p.faculty}
                </p>
              </div>
              <div className="w-24 shrink-0 py-3 pr-2">
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: '#4A7080',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  {p.status}
                </span>
              </div>
              <div className="flex w-20 shrink-0 items-center justify-end py-3 pr-3">
                <button
                  type="button"
                  aria-label={`View visit history for ${p.name}`}
                  className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                >
                  <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Showing {pageStart + 1} to {Math.min(pageStart + rowsPerPage, filtered.length)} of{' '}
            {filtered.length} patients
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
                  <span key={`e-${i}`} style={{ fontSize: 14, color: '#8A98A3' }} className="px-1">
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
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
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
  );
}

export function VisitHistoryWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [selectedPatient, setSelectedPatient] = useState<DirectoryPatient | null>(null);

  const isCurated = selectedPatient?.id === CURATED_PATIENT_ID;
  const visits = useMemo(() => {
    if (!selectedPatient) return [];
    return isCurated ? PATIENT_VISITS : generateVisitsForPatient(selectedPatient);
  }, [selectedPatient, isCurated]);
  const activity = useMemo(() => {
    if (!selectedPatient) return [];
    return isCurated ? RECORD_ACTIVITY : generateActivityFromVisits(visits);
  }, [selectedPatient, isCurated, visits]);
  const allergies = isCurated ? MOCK_PATIENT_PROFILE.allergies : [];

  function handlePrint() {
    toast.success(
      'Preparing document',
      `${selectedPatient?.name}'s visit history is being prepared for printing.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          {/* ── Breadcrumb ────────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.medicalRecordsDashboard)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <button
              type="button"
              onClick={() => router.push(ROUTES.medicalRecords)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Medical Records
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Visit History
            </span>
          </nav>

          {/* ── Title ─────────────────────────────────────────────────────── */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Visit History
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                {selectedPatient
                  ? 'View patient encounter history and visit details'
                  : 'Select a patient to view their encounter history'}
              </p>
            </div>
            {selectedPatient && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-white focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Printer style={{ width: 15, height: 15 }} />
                  Print Record
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <ChevronLeft style={{ width: 15, height: 15 }} />
                  Change Patient
                </button>
              </div>
            )}
          </div>

          {!selectedPatient ? (
            <div className="mt-5">
              <PatientPicker onSelect={setSelectedPatient} />
            </div>
          ) : (
            <>
              {/* ── Patient banner ────────────────────────────────────────── */}
              <div
                className="mt-5 flex flex-col gap-4 rounded-[12px] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex flex-wrap items-center gap-4">
                  <UserAvatar
                    initials={selectedPatient.initials}
                    size={72}
                    textSize={24}
                    bg={selectedPatient.avatarBg}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <p
                        className="font-display font-semibold"
                        style={{ fontSize: 22, color: '#0D2630' }}
                      >
                        {selectedPatient.name}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                        style={{
                          fontSize: 14,
                          color: '#4A7080',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        {selectedPatient.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span style={{ fontSize: 14, color: '#00B4D8' }}>{selectedPatient.mrn}</span>
                      <span style={{ fontSize: 14, color: '#8A98A3' }}>
                        Student ID: {selectedPatient.studentId}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <BannerStat icon={Calendar} value={`${selectedPatient.age} Yrs`} />
                      <BannerStat icon={UserIcon} value={selectedPatient.gender} />
                      <BannerStat icon={Droplet} value={selectedPatient.bloodGroup} />
                      <BannerStat icon={Heart} value={selectedPatient.faculty} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
                  <div className="flex items-center gap-1.5 sm:flex-row-reverse">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Phone</span>
                    <Phone style={{ width: 14, height: 14, color: '#8A98A3' }} />
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedPatient.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:flex-row-reverse">
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>Email</span>
                    <Mail style={{ width: 14, height: 14, color: '#8A98A3' }} />
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedPatient.email}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 sm:max-w-[280px] sm:flex-row-reverse">
                    <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                      Address
                    </span>
                    <MapPin
                      style={{ width: 14, height: 14, color: '#8A98A3' }}
                      className="mt-0.5 shrink-0"
                    />
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {selectedPatient.address}
                    </span>
                  </div>
                </div>
              </div>

              <AllergyBanner allergies={allergies} className="mt-4" />

              {/* ── Content + sidebar ─────────────────────────────────────── */}
              <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0 flex-1">
                  <VisitHistorySection visits={visits} patientName={selectedPatient.name} />
                </div>

                <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Visit Summary
                    </h2>
                    <div className="mt-3 flex flex-col gap-2.5">
                      {(() => {
                        const summary = computeVisitSummary(visits);
                        return [
                          ['Total Visits', String(summary.totalVisits)],
                          [
                            'Last Visit',
                            summary.lastVisit ? formatHumanDate(summary.lastVisit) : '—',
                          ],
                          [
                            'First Visit',
                            summary.firstVisit ? formatHumanDate(summary.firstVisit) : '—',
                          ],
                          ['Unique Departments', String(summary.uniqueDepartments)],
                          ['Emergency Visits', String(summary.emergencyVisits)],
                          ['Hospitalizations', String(summary.hospitalizations)],
                        ].map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-2">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>{label}</p>
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {value}
                            </p>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Record Activity
                    </h2>
                    <div className="mt-3 flex flex-col gap-3">
                      {activity.map((act) => {
                        const Icon = act.icon;
                        return (
                          <div key={act.id} className="flex items-start gap-2.5">
                            <div
                              className="flex size-8 shrink-0 items-center justify-center rounded-full"
                              style={{ background: act.iconBg }}
                            >
                              <Icon style={{ width: 15, height: 15, color: act.iconColor }} />
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatHumanDate(act.dateTime)}
                              </p>
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {act.label}
                              </p>
                              <p style={{ fontSize: 14, color: '#4A7080' }}>{act.detail}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Quick Actions
                    </h2>
                    <div className="mt-3 grid grid-cols-1 gap-2.5">
                      {isCurated && (
                        <button
                          type="button"
                          onClick={() => router.push(ROUTES.medicalRecordsPatient)}
                          className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#00B4D8',
                            border: '1px solid rgba(0,180,216,0.35)',
                          }}
                        >
                          View Full Medical Record
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.registrationDirectory)}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#4A7080',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        View in Patient Directory
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Confidentiality notice ───────────────────────────────── */}
              <div
                className="mt-5 flex items-center gap-2.5 rounded-[10px] px-4 py-3"
                style={{
                  background: 'rgba(0,180,216,0.06)',
                  border: '1px solid rgba(0,180,216,0.2)',
                }}
              >
                <Lock style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: '#0D2630' }}>
                  Medical records are confidential and access is role-based. All activities are
                  logged for audit purposes.
                </p>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
