'use client';

import { AlertCircle, CheckCircle2, Inbox, RefreshCw, Search, Share2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { DOCTORS } from '@/features/shared/__mocks__/doctorDirectory';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  MOCK_PATIENTS,
  type PatientRecord,
  type PatientRecordStatus,
} from '@/features/patients/__mocks__/patientFixtures';
import {
  OUR_DEPARTMENT,
  REFERRALS,
  type Referral,
  type ReferralStatus,
} from '@/features/registration/__mocks__/referralFixtures';

// ── Types ──────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';
type StatusFilter = 'all' | PatientRecordStatus;

type StatusCfg = { label: string; color: string };

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PatientRecordStatus, StatusCfg> = {
  admitted: { label: 'Admitted', color: '#EF4444' },
  active: { label: 'Active', color: '#22C55E' },
  'follow-up': { label: 'Follow up', color: '#F59E0B' },
  referred: { label: 'Referred', color: '#3B82F6' },
  discharged: { label: 'Discharged', color: '#6B7280' },
};

// Pill filter row — same visual family as the Clinical Timeline patient
// picker, so patient-selection screens across the app read consistently.
const STATUS_FILTERS: { key: StatusFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All Patients', color: '#25464D' },
  { key: 'admitted', label: 'Admitted', color: '#EF4444' },
  { key: 'active', label: 'Active', color: '#22C55E' },
  { key: 'follow-up', label: 'Follow up', color: '#F59E0B' },
  { key: 'referred', label: 'Referred', color: '#3B82F6' },
  { key: 'discharged', label: 'Discharged', color: '#6B7280' },
];

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// ── Skeletons ──────────────────────────────────────────────────────────────────

function SkeletonDesktopRow({ isLast }: { isLast: boolean }) {
  return (
    <div
      className="flex animate-pulse items-center bg-white"
      style={{ borderBottom: isLast ? undefined : '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 py-4 pr-3 pl-5">
        <div className="size-10 shrink-0 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 rounded-md bg-slate-100" />
          <div className="h-3.5 w-24 rounded-md bg-slate-100" />
        </div>
      </div>
      <div className="w-32 shrink-0 py-4 pr-4">
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="w-40 shrink-0 space-y-2 py-4 pr-4">
        <div className="h-3.5 w-20 rounded-md bg-slate-100" />
        <div className="h-3.5 w-14 rounded-md bg-slate-100" />
      </div>
      <div className="w-24 shrink-0 py-4 pr-5">
        <div className="h-11 w-full rounded-[8px] bg-slate-100" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-[12px] bg-white"
      style={{
        border: '1px solid rgba(0,100,130,0.08)',
        boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="size-10 shrink-0 rounded-full bg-slate-100" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-md bg-slate-100" />
            <div className="h-3.5 w-20 rounded-md bg-slate-100" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-slate-100" />
      </div>
      <div
        className="flex items-center justify-between border-t px-4 py-3"
        style={{ borderColor: 'rgba(0,100,130,0.06)' }}
      >
        <div className="h-3.5 w-24 rounded-md bg-slate-100" />
        <div className="h-11 w-24 rounded-[8px] bg-slate-100" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type ReferralsTab = 'refer' | 'incoming';

export default function ReferralsIndexPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeTab, setActiveTab] = useState<ReferralsTab>('refer');
  const [referrals, setReferrals] = useState<Referral[]>(REFERRALS);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_PATIENTS.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesSearch =
        q === '' || p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter]);

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  function openReferral(patient: PatientRecord) {
    router.push(ROUTES.patientReferral(patient.id));
  }

  // ── Incoming referrals — referrals other departments have sent to us,
  // previously only visible/actionable from Registration's Referral
  // Management screen. Accept/Complete mirror that screen's own transitions.
  // Filtered to the logged-in doctor's own referrals when they're a
  // recognized roster doctor (same fallback convention as encounters'
  // getDoctorQueue — shows everyone's when the account isn't in DOCTORS).
  const isKnownReceivingDoctor = DOCTORS.some((d) => d.id === user?.id);
  const incomingReferrals = referrals.filter((r) => {
    if (r.direction !== 'Incoming') return false;
    if (!isKnownReceivingDoctor) return true;
    return r.receivingDoctorId === user?.id;
  });
  const incomingCount = incomingReferrals.filter((r) => r.status === 'Pending').length;

  function setReferralStatus(id: string, status: ReferralStatus) {
    const referral = referrals.find((r) => r.id === id);
    setReferrals((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (referral) {
      toast.success(
        status === 'Accepted' ? 'Referral accepted' : 'Referral completed',
        `${referral.patientName}'s referral marked ${status.toLowerCase()}.`,
      );
    }
  }

  return (
    <div className="px-4 pt-6 pb-24 sm:px-6 lg:px-12 lg:pt-10">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-3xl leading-10 font-semibold" style={{ color: '#2F3A40' }}>
          Referrals
        </h1>
        <p className="mt-1 text-base leading-6" style={{ color: '#4A7080' }}>
          {activeTab === 'refer'
            ? 'Select a patient to refer them to a specialist department.'
            : 'Referrals other departments have sent to us, waiting to be accepted.'}
        </p>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div
        className="mt-5 flex gap-1 rounded-[12px] bg-white p-1.5"
        style={{ border: '1px solid rgba(0,100,130,0.12)', width: 'fit-content' }}
      >
        {(
          [
            { key: 'refer', label: 'Refer a Patient' },
            { key: 'incoming', label: 'Incoming Referrals' },
          ] as { key: ReferralsTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-[8px] px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
            style={{
              color: activeTab === tab.key ? '#FFFFFF' : '#4A7080',
              background: activeTab === tab.key ? '#00B4D8' : 'transparent',
            }}
          >
            {tab.label}
            {tab.key === 'incoming' && incomingCount > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-sm font-semibold"
                style={{
                  color: activeTab === 'incoming' ? '#FFFFFF' : '#00B4D8',
                  background:
                    activeTab === 'incoming' ? 'rgba(255,255,255,0.25)' : 'rgba(0,180,216,0.1)',
                }}
              >
                {incomingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'refer' && (
        <>
          {/* ── Search ─────────────────────────────────────────────────────── */}
          <div className="relative mt-6 w-full sm:max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-[10px] -translate-y-1/2"
              style={{ width: 16, height: 16, color: '#8A98A3' }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or MRN…"
              className={`h-[42px] w-full rounded-[12px] pr-4 pl-9 text-base leading-6 outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
              style={{ background: '#FFFFFF', border: '1px solid #0064821F', color: '#2F3A40' }}
            />
          </div>

          {/* ── Status filter pills ────────────────────────────────────────── */}
          <div className="mt-4 flex [scrollbar-width:none] flex-nowrap gap-3 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden">
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm leading-5.5 font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                  style={
                    active
                      ? { background: f.color, border: `1px solid ${f.color}`, color: '#FFFFFF' }
                      : { background: '#FFFFFF', border: `1px solid ${f.color}66`, color: f.color }
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* ── Desktop table — visible at lg+ ───────────────────────────────── */}
          <div className="mt-6 hidden overflow-hidden rounded-[12px] lg:block">
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}>
              {/* Header row */}
              <div
                className="flex"
                style={{ background: 'rgba(226,237,241,0.4)', borderBottom: '1px solid #E6F8FD' }}
              >
                <span
                  className="min-w-0 flex-1 py-3.5 pr-3 pl-5 text-sm leading-[22px] font-bold tracking-wider uppercase"
                  style={{ color: '#4A7080' }}
                >
                  Patient
                </span>
                <span
                  className="w-32 shrink-0 py-3.5 pr-4 text-sm leading-[22px] font-bold tracking-wider uppercase"
                  style={{ color: '#4A7080' }}
                >
                  Status
                </span>
                <span
                  className="w-40 shrink-0 py-3.5 pr-4 text-sm leading-[22px] font-bold tracking-wider uppercase"
                  style={{ color: '#4A7080' }}
                >
                  Last Visit
                </span>
                <span
                  className="w-24 shrink-0 py-3.5 pr-5 text-sm leading-[22px] font-bold tracking-wider uppercase"
                  style={{ color: '#4A7080' }}
                >
                  Refer
                </span>
              </div>

              {pageState === 'loading' ? (
                <div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonDesktopRow key={i} isLast={i === 5} />
                  ))}
                </div>
              ) : pageState === 'error' ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-10 text-center">
                  <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Failed to load patients
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
                      lineHeight: '22px',
                    }}
                  >
                    <RefreshCw style={{ width: 16, height: 16 }} />
                    Retry
                  </button>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-10 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
                  </div>
                  <div>
                    <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                      No patients match this filter
                    </p>
                    <p className="mt-0.5 text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                      Try adjusting your search or clearing the filters
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className={`mt-1 text-sm font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                      style={{ color: '#00B4D8' }}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {filteredPatients.map((patient, idx) => {
                    const cfg = STATUS_CFG[patient.status];
                    const isLast = idx === filteredPatients.length - 1;
                    return (
                      <div
                        key={patient.id}
                        className="flex items-center bg-white transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: isLast ? undefined : '1px solid rgba(0,100,130,0.08)',
                        }}
                      >
                        {/* Patient */}
                        <div className="flex min-w-0 flex-1 items-center gap-3 py-4 pr-3 pl-5">
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                            style={{ background: patient.avatarBg }}
                          >
                            {patient.initials}
                          </div>
                          <div className="min-w-0">
                            <p
                              className="truncate text-base leading-6 font-semibold"
                              style={{ color: '#2F3A40' }}
                            >
                              {patient.name}
                            </p>
                            <p className="text-sm leading-5.5" style={{ color: '#00B4D8' }}>
                              {patient.mrn}
                            </p>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="w-32 shrink-0 py-4 pr-4">
                          <span
                            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap"
                            style={{ borderColor: cfg.color, color: cfg.color }}
                          >
                            {cfg.label}
                          </span>
                        </div>

                        {/* Last visit */}
                        <div className="w-40 shrink-0 py-4 pr-4">
                          <p
                            className="text-sm leading-5.5 font-medium whitespace-nowrap"
                            style={{ color: '#25464D' }}
                          >
                            {patient.lastVisitDate}
                          </p>
                          <p
                            className="text-sm leading-5.5 whitespace-nowrap"
                            style={{ color: '#4A7080' }}
                          >
                            {patient.lastVisitTime}
                          </p>
                        </div>

                        {/* Refer */}
                        <div className="w-24 shrink-0 py-4 pr-5">
                          <button
                            type="button"
                            aria-label={`Refer ${patient.name}`}
                            onClick={() => openReferral(patient)}
                            className={`flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] text-sm font-medium whitespace-nowrap transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                            style={{ background: '#E6F8FD', color: '#00B4D8' }}
                          >
                            <Share2 style={{ width: 15, height: 15 }} />
                            Refer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Mobile card view — visible below lg ──────────────────────────── */}
          <div className="mt-6 space-y-3 lg:hidden">
            {pageState === 'loading' ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : pageState === 'error' ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[12px] py-10 text-center">
                <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  Failed to load patients
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
                    lineHeight: '22px',
                  }}
                >
                  <RefreshCw style={{ width: 16, height: 16 }} />
                  Retry
                </button>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div
                className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[12px] py-10 text-center"
                style={{ background: 'rgba(226,237,241,0.25)' }}
              >
                <div
                  className="flex size-12 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Users style={{ width: 22, height: 22, color: '#8A98A3' }} />
                </div>
                <div>
                  <p className="text-sm leading-5.5 font-medium" style={{ color: '#4A7080' }}>
                    No patients match this filter
                  </p>
                  <p className="mt-0.5 text-sm leading-5" style={{ color: '#8A98A3' }}>
                    Adjust your search or clear filters
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`mt-1 text-sm font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ color: '#00B4D8' }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              filteredPatients.map((patient) => {
                const cfg = STATUS_CFG[patient.status];
                return (
                  <div
                    key={patient.id}
                    className="overflow-hidden rounded-[12px] bg-white transition-shadow duration-150 hover:shadow-md"
                    style={{
                      border: '1px solid rgba(0,100,130,0.08)',
                      boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                          style={{ background: patient.avatarBg }}
                        >
                          {patient.initials}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="truncate text-base leading-6 font-semibold"
                            style={{ color: '#2F3A40' }}
                          >
                            {patient.name}
                          </p>
                          <p className="text-sm leading-5.5" style={{ color: '#00B4D8' }}>
                            {patient.mrn}
                          </p>
                        </div>
                      </div>
                      <span
                        className="ml-2 inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap"
                        style={{ borderColor: cfg.color, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    <div
                      className="flex items-center justify-between border-t px-4 py-3"
                      style={{ borderColor: 'rgba(0,100,130,0.06)' }}
                    >
                      <div>
                        <p className="text-sm leading-5.5" style={{ color: '#25464D' }}>
                          {patient.lastVisitDate}
                        </p>
                        <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                          {patient.lastVisitTime}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Refer ${patient.name}`}
                        onClick={() => openReferral(patient)}
                        className={`flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[8px] px-4 text-sm font-medium whitespace-nowrap transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                        style={{ background: '#E6F8FD', color: '#00B4D8' }}
                      >
                        <Share2 style={{ width: 15, height: 15 }} />
                        Refer
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'incoming' && (
        <div className="mt-6 overflow-hidden rounded-[12px]">
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}>
            <div
              className="flex"
              style={{ background: 'rgba(226,237,241,0.4)', borderBottom: '1px solid #E6F8FD' }}
            >
              {[
                ['Patient', 'min-w-0 flex-1 pl-5'],
                ['From Department', 'w-44'],
                ['Referred By', 'w-40'],
                ['Priority', 'w-24'],
                ['Status', 'w-28'],
              ].map(([label, width]) => (
                <span
                  key={label}
                  className={`${width} shrink-0 py-3.5 pr-3 text-sm leading-[22px] font-bold tracking-wider uppercase`}
                  style={{ color: '#4A7080' }}
                >
                  {label}
                </span>
              ))}
              <span
                className="w-56 shrink-0 py-3.5 pr-5 text-right text-sm leading-[22px] font-bold tracking-wider uppercase"
                style={{ color: '#4A7080' }}
              >
                Actions
              </span>
            </div>

            {incomingReferrals.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-10 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <Inbox style={{ width: 24, height: 24, color: '#8A98A3' }} />
                </div>
                <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                  No incoming referrals
                </p>
                <p className="mt-0.5 text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                  Referrals other departments send to {OUR_DEPARTMENT} will show up here.
                </p>
              </div>
            ) : (
              incomingReferrals.map((referral, idx) => {
                const isLast = idx === incomingReferrals.length - 1;
                return (
                  <div
                    key={referral.id}
                    className="flex items-center bg-white transition-colors duration-100 hover:bg-[#F5FBFD]"
                    style={{ borderBottom: isLast ? undefined : '1px solid rgba(0,100,130,0.08)' }}
                  >
                    <div className="min-w-0 flex-1 py-4 pr-3 pl-5">
                      <p
                        className="truncate text-base leading-6 font-semibold"
                        style={{ color: '#2F3A40' }}
                      >
                        {referral.patientName}
                      </p>
                      <p className="text-sm leading-5.5" style={{ color: '#00B4D8' }}>
                        {referral.mrn}
                      </p>
                    </div>
                    <div className="w-44 shrink-0 py-4 pr-3">
                      <p className="truncate text-sm leading-5.5" style={{ color: '#25464D' }}>
                        {referral.fromDepartment}
                      </p>
                    </div>
                    <div className="w-40 shrink-0 py-4 pr-3">
                      <p className="truncate text-sm leading-5.5" style={{ color: '#25464D' }}>
                        {referral.referredBy}
                      </p>
                    </div>
                    <div className="w-24 shrink-0 py-4 pr-3">
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap"
                        style={
                          referral.priority === 'Urgent'
                            ? { borderColor: '#EF4444', color: '#EF4444' }
                            : { borderColor: '#8A98A3', color: '#4A7080' }
                        }
                      >
                        {referral.priority}
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-4 pr-3">
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap"
                        style={
                          referral.status === 'Pending'
                            ? { borderColor: '#F59E0B', color: '#F59E0B' }
                            : referral.status === 'Accepted'
                              ? { borderColor: '#3B82F6', color: '#3B82F6' }
                              : referral.status === 'Completed'
                                ? { borderColor: '#22C55E', color: '#22C55E' }
                                : { borderColor: '#6B7280', color: '#6B7280' }
                        }
                      >
                        {referral.status}
                      </span>
                    </div>
                    <div className="flex w-56 shrink-0 items-center justify-end gap-2 py-4 pr-5">
                      <PermissionGate permission={PERMISSIONS.REFERRALS_WRITE}>
                        {referral.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => setReferralStatus(referral.id, 'Accepted')}
                            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[8px] px-3 text-sm font-medium whitespace-nowrap transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                            style={{ background: '#E6F8FD', color: '#00B4D8' }}
                          >
                            <CheckCircle2 style={{ width: 15, height: 15 }} />
                            Accept
                          </button>
                        )}
                        {referral.status === 'Accepted' && (
                          <button
                            type="button"
                            onClick={() => setReferralStatus(referral.id, 'Completed')}
                            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[8px] px-3 text-sm font-medium whitespace-nowrap transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                            style={{ background: '#00B4D8', color: '#FFFFFF' }}
                          >
                            <CheckCircle2 style={{ width: 15, height: 15 }} />
                            Mark Completed
                          </button>
                        )}
                      </PermissionGate>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
