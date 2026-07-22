'use client';

import {
  AlertCircle,
  AlertTriangle,
  BedDouble,
  Printer,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatDateTime } from '@/utils/datetime';
import { getEffectiveRoster } from '@/features/nursing/store/nursingWorkflowStore';
import type { NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import {
  ACUITY_CFG,
  BED_STATUS_CFG,
  STATIC_WARD_BEDS,
  WARDS,
  WARD_ALERTS,
  type Acuity,
  type BedStatus,
  type Ward,
  type WardBed,
} from '@/features/nursing/__mocks__/wardCensusFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

function riskToAcuity(risk: NursePatient['riskLevel']): Acuity {
  return risk;
}

function buildWardBeds(ward: Ward, roster: NursePatient[]): WardBed[] {
  const staticBeds = STATIC_WARD_BEDS[ward.id];
  if (staticBeds) return staticBeds;

  const occupiedByBedNum = new Map<number, NursePatient>();
  for (const p of roster) {
    if (p.ward !== ward.name) continue;
    const match = /Bed (\d+)/.exec(p.bed);
    const num = match ? parseInt(match[1]!, 10) : NaN;
    if (!Number.isNaN(num)) occupiedByBedNum.set(num, p);
  }

  const beds: WardBed[] = [];
  for (let n = 1; n <= ward.totalBeds; n++) {
    const patient = occupiedByBedNum.get(n);
    if (patient) {
      beds.push({
        id: patient.id,
        bedNumber: `Bed ${n}`,
        status: 'Occupied',
        patientName: patient.patientName,
        mrn: patient.mrn,
        doctorName: patient.doctorName,
        acuity: riskToAcuity(patient.riskLevel),
      });
    } else {
      const cycle = n % 5;
      const status: BedStatus = cycle === 0 ? 'Cleaning' : cycle === 1 ? 'Reserved' : 'Available';
      beds.push({ id: `${ward.id}-b${n}`, bedNumber: `Bed ${n}`, status });
    }
  }
  return beds;
}

function countByStatus(beds: WardBed[]) {
  return {
    occupied: beds.filter((b) => b.status === 'Occupied').length,
    available: beds.filter((b) => b.status === 'Available').length,
    reserved: beds.filter((b) => b.status === 'Reserved').length,
    cleaning: beds.filter((b) => b.status === 'Cleaning').length,
  };
}

function SkeletonStatCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="flex items-center gap-2.5">
        <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mt-2.5 h-6 w-10 animate-pulse rounded bg-slate-200" />
      <div className="mt-1.5 h-3.5 w-28 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

function SkeletonWardCard() {
  return (
    <div
      className="rounded-[12px] p-4"
      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      <div className="mt-2 h-6 w-16 animate-pulse rounded bg-slate-200" />
      <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}

export function WardCensusWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [selectedWardId, setSelectedWardId] = useState<string>(WARDS[0]!.id);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [bedsByWard] = useState<Record<string, WardBed[]>>(() => {
    const roster = getEffectiveRoster();
    const map: Record<string, WardBed[]> = {};
    for (const ward of WARDS) map[ward.id] = buildWardBeds(ward, roster);
    return map;
  });

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 700);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  function handleRefresh() {
    setPageState('loading');
    setTimeout(() => {
      setPageState('loaded');
      toast.success('Census refreshed', 'Ward occupancy data is up to date.');
    }, 700);
  }

  const facilityTotals = useMemo(() => {
    let total = 0;
    let occupied = 0;
    let available = 0;
    let reserved = 0;
    let cleaning = 0;
    for (const ward of WARDS) {
      const beds = bedsByWard[ward.id] ?? [];
      total += ward.totalBeds;
      const c = countByStatus(beds);
      occupied += c.occupied;
      available += c.available;
      reserved += c.reserved;
      cleaning += c.cleaning;
    }
    return { total, occupied, available, reserved, cleaning };
  }, [bedsByWard]);

  const occupancyRate = facilityTotals.total
    ? Math.round((facilityTotals.occupied / facilityTotals.total) * 100)
    : 0;

  const selectedWard = WARDS.find((w) => w.id === selectedWardId) ?? WARDS[0]!;
  const selectedBeds = useMemo(
    () => bedsByWard[selectedWard.id] ?? [],
    [bedsByWard, selectedWard.id],
  );
  const selectedCounts = countByStatus(selectedBeds);
  const selectedOccupancyRate = selectedWard.totalBeds
    ? Math.round((selectedCounts.occupied / selectedWard.totalBeds) * 100)
    : 0;
  const isRosterWard = !STATIC_WARD_BEDS[selectedWard.id];

  const acuityMix = useMemo(() => {
    const mix: Record<Acuity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const bed of selectedBeds) {
      if (bed.status === 'Occupied' && bed.acuity) mix[bed.acuity] += 1;
    }
    return mix;
  }, [selectedBeds]);

  const totalPages = Math.max(1, Math.ceil(selectedBeds.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = selectedBeds.slice(pageStart, pageStart + rowsPerPage);

  function selectWard(id: string) {
    setSelectedWardId(id);
    setCurrentPage(1);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.nurse)}
              className={`transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Ward Management</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Ward Census
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Ward Census
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                A live per-ward occupancy summary — occupied, available, and reserved beds, with
                patient acuity mix.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleRefresh}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.15)',
                  color: '#0D2630',
                  fontSize: 14,
                }}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ background: '#00B4D8', fontSize: 14 }}
              >
                <Printer style={{ width: 16, height: 16 }} />
                Print Census Report
              </button>
            </div>
          </div>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load ward census
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
                }}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* ── Facility stat cards ─────────────────────────────────────── */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {pageState === 'loading' ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
                ) : (
                  <>
                    {(
                      [
                        {
                          label: 'Total Beds',
                          value: facilityTotals.total,
                          sub: `${WARDS.length} wards`,
                          color: '#0D2630',
                          bg: 'rgba(0,100,130,0.08)',
                          icon: BedDouble,
                        },
                        {
                          label: 'Occupied',
                          value: facilityTotals.occupied,
                          sub: `${occupancyRate}% occupancy`,
                          color: '#3B82F6',
                          bg: 'rgba(59,130,246,0.1)',
                          icon: Users,
                        },
                        {
                          label: 'Available',
                          value: facilityTotals.available,
                          sub: 'Ready for admission',
                          color: '#22C55E',
                          bg: 'rgba(34,197,94,0.1)',
                          icon: BedDouble,
                        },
                        {
                          label: 'Reserved',
                          value: facilityTotals.reserved,
                          sub: 'Pending admission',
                          color: '#F59E0B',
                          bg: 'rgba(245,158,11,0.1)',
                          icon: AlertTriangle,
                        },
                        {
                          label: 'Cleaning',
                          value: facilityTotals.cleaning,
                          sub: 'Housekeeping turnaround',
                          color: '#8A98A3',
                          bg: 'rgba(138,152,163,0.1)',
                          icon: Sparkles,
                        },
                      ] as {
                        label: string;
                        value: number;
                        sub: string;
                        color: string;
                        bg: string;
                        icon: typeof BedDouble;
                      }[]
                    ).map((s) => (
                      <div
                        key={s.label}
                        className="rounded-[12px] p-4"
                        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-full"
                            style={{ background: s.bg }}
                          >
                            <s.icon style={{ width: 18, height: 18, color: s.color }} />
                          </div>
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {s.label}
                          </p>
                        </div>
                        <p
                          className="font-display mt-2 font-semibold"
                          style={{ fontSize: 22, color: '#0D2630' }}
                        >
                          {s.value}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.sub}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* ── Main content + sidebar ───────────────────────────────────── */}
              <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  {/* Ward cards */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pageState === 'loading'
                      ? Array.from({ length: 5 }).map((_, i) => <SkeletonWardCard key={i} />)
                      : WARDS.map((ward) => {
                          const beds = bedsByWard[ward.id] ?? [];
                          const counts = countByStatus(beds);
                          const rate = ward.totalBeds
                            ? Math.round((counts.occupied / ward.totalBeds) * 100)
                            : 0;
                          const active = ward.id === selectedWardId;
                          return (
                            <button
                              key={ward.id}
                              type="button"
                              onClick={() => selectWard(ward.id)}
                              className={`rounded-[12px] p-4 text-left transition-colors duration-150 ${FOCUS_RING}`}
                              style={{
                                background: active ? '#E6F8FD' : '#FFFFFF',
                                border: active
                                  ? '1px solid #00B4D8'
                                  : '1px solid rgba(0,100,130,0.12)',
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p
                                  className="font-display font-semibold"
                                  style={{ fontSize: 16, color: '#0D2630' }}
                                >
                                  {ward.name}
                                </p>
                                <BedDouble
                                  style={{ width: 17, height: 17, color: '#00B4D8', flexShrink: 0 }}
                                />
                              </div>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{ward.nurseInCharge}</p>
                              <p
                                className="font-display mt-2 font-semibold"
                                style={{ fontSize: 20, color: '#0D2630' }}
                              >
                                {counts.occupied}/{ward.totalBeds}
                                <span
                                  className="ml-1 font-sans font-normal"
                                  style={{ fontSize: 14, color: '#8A98A3' }}
                                >
                                  beds occupied
                                </span>
                              </p>
                              <div
                                className="mt-2 flex h-2 w-full overflow-hidden rounded-full"
                                style={{ background: 'rgba(226,237,241,0.6)' }}
                              >
                                {(
                                  [
                                    ['Occupied', counts.occupied],
                                    ['Reserved', counts.reserved],
                                    ['Cleaning', counts.cleaning],
                                  ] as [BedStatus, number][]
                                ).map(([status, count]) =>
                                  count > 0 ? (
                                    <div
                                      key={status}
                                      style={{
                                        width: `${(count / ward.totalBeds) * 100}%`,
                                        background: BED_STATUS_CFG[status].color,
                                      }}
                                    />
                                  ) : null,
                                )}
                              </div>
                              <p className="mt-1.5" style={{ fontSize: 14, color: '#4A7080' }}>
                                {rate}% occupancy
                              </p>
                            </button>
                          );
                        })}
                  </div>

                  {/* Selected ward detail */}
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2
                          className="font-display font-semibold"
                          style={{ fontSize: 18, color: '#0D2630' }}
                        >
                          {selectedWard.name}
                        </h2>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          {selectedCounts.occupied} of {selectedWard.totalBeds} beds occupied ·{' '}
                          {selectedOccupancyRate}% occupancy · Nurse in charge:{' '}
                          {selectedWard.nurseInCharge}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(Object.keys(acuityMix) as Acuity[])
                          .filter((a) => acuityMix[a] > 0)
                          .map((a) => (
                            <span
                              key={a}
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
                              style={{
                                fontSize: 14,
                                color: ACUITY_CFG[a].color,
                                border: `1px solid ${ACUITY_CFG[a].color}66`,
                                background: `${ACUITY_CFG[a].color}1A`,
                              }}
                            >
                              {a}: {acuityMix[a]}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto scroll-smooth">
                      <div className="min-w-[760px]">
                        <div
                          className="flex items-center rounded-t-[8px]"
                          style={{
                            background: 'rgba(226,237,241,0.4)',
                            borderBottom: '1px solid #E6F8FD',
                          }}
                        >
                          {(
                            [
                              ['Bed', 'w-20 pl-3'],
                              ['Status', 'w-28'],
                              ['Patient', 'min-w-[200px] flex-1'],
                              ['Doctor', 'w-36'],
                              ['Acuity', 'w-24'],
                            ] as [string, string][]
                          ).map(([label, width]) => (
                            <div key={label} className={`${width} shrink-0 py-2.5 pr-1.5`}>
                              <span
                                className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                {label}
                              </span>
                            </div>
                          ))}
                          <div
                            className="sticky right-0 z-10 w-32 shrink-0 py-2.5 pr-3 text-right"
                            style={{ background: '#E2EDF1' }}
                          >
                            <span
                              className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Actions
                            </span>
                          </div>
                        </div>

                        {pageState === 'loading' &&
                          Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className="flex min-h-[52px] animate-pulse items-center px-3"
                              style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                            >
                              <div className="h-4 w-full max-w-[500px] rounded bg-slate-100" />
                            </div>
                          ))}

                        {pageState === 'loaded' &&
                          pageRows.map((bed) => {
                            const cfg = BED_STATUS_CFG[bed.status];
                            return (
                              <div
                                key={bed.id}
                                className="flex items-start transition-colors duration-100 hover:bg-[#F5FBFD]"
                                style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                              >
                                <div className="w-20 shrink-0 py-3 pr-1.5 pl-3">
                                  <p
                                    className="font-sans font-medium"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {bed.bedNumber}
                                  </p>
                                </div>
                                <div className="w-28 shrink-0 py-3 pr-1.5">
                                  <span
                                    className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                                    style={{
                                      fontSize: 14,
                                      color: cfg.color,
                                      border: `1px solid ${cfg.border}`,
                                      background: cfg.bg,
                                    }}
                                  >
                                    {bed.status}
                                  </span>
                                </div>
                                <div className="min-w-[200px] flex-1 py-3 pr-1.5">
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#0D2630' }}
                                  >
                                    {bed.patientName ?? '—'}
                                  </p>
                                  {(bed.mrn ?? bed.admittedAt) && (
                                    <p
                                      className="truncate"
                                      style={{ fontSize: 14, color: '#8A98A3' }}
                                    >
                                      {[
                                        bed.mrn,
                                        bed.admittedAt
                                          ? `Admitted ${formatDate(bed.admittedAt)}`
                                          : null,
                                      ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                    </p>
                                  )}
                                </div>
                                <div className="w-36 shrink-0 py-3 pr-1.5">
                                  <p
                                    className="truncate"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {bed.doctorName ?? '—'}
                                  </p>
                                </div>
                                <div className="w-24 shrink-0 py-3 pr-1.5">
                                  {bed.acuity ? (
                                    <span
                                      style={{ fontSize: 14, color: ACUITY_CFG[bed.acuity].color }}
                                    >
                                      {bed.acuity}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 14, color: '#8A98A3' }}>—</span>
                                  )}
                                </div>
                                <div
                                  className="sticky right-0 z-10 flex w-32 shrink-0 items-center justify-end py-3 pr-3"
                                  style={{ background: '#FFFFFF' }}
                                >
                                  {bed.status === 'Occupied' && isRosterWard ? (
                                    <button
                                      type="button"
                                      onClick={() => router.push(ROUTES.nursePatientRecord(bed.id))}
                                      className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                      style={{
                                        fontSize: 14,
                                        color: '#00B4D8',
                                        border: '1px solid rgba(0,180,216,0.35)',
                                      }}
                                    >
                                      View Patient
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 14, color: '#8A98A3' }}>—</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                        {pageState === 'loaded' && pageRows.length === 0 && (
                          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <div
                              className="flex size-14 items-center justify-center rounded-full"
                              style={{ background: 'rgba(226,237,241,0.6)' }}
                            >
                              <BedDouble style={{ width: 24, height: 24, color: '#8A98A3' }} />
                            </div>
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 16, color: '#4A7080' }}
                            >
                              No beds recorded for this ward
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {pageState === 'loaded' && selectedBeds.length > 0 && (
                      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          Showing {pageStart + 1} to{' '}
                          {Math.min(pageStart + rowsPerPage, selectedBeds.length)} of{' '}
                          {selectedBeds.length} beds
                        </p>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                          <select
                            value={rowsPerPage}
                            onChange={(e) => {
                              setRowsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className={`h-9 rounded-[8px] px-2 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              border: '1px solid rgba(0,100,130,0.18)',
                              color: '#0D2630',
                            }}
                          >
                            {[10, 25, 50].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                        {totalPages > 1 && (
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
                                className={`flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                                style={
                                  p === safePage
                                    ? { background: '#00B4D8', color: '#FFFFFF', fontSize: 14 }
                                    : {
                                        border: '1px solid rgba(0,100,130,0.18)',
                                        color: '#4A7080',
                                        fontSize: 14,
                                      }
                                }
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
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Sidebar ───────────────────────────────────────────────── */}
                <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[280px]">
                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <h2
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Facility Occupancy
                    </h2>
                    <FacilityOccupancyDonut totals={facilityTotals} />
                  </div>

                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{
                      background: 'rgba(239,68,68,0.04)',
                      border: '1px solid rgba(239,68,68,0.25)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle style={{ width: 16, height: 16, color: '#EF4444' }} />
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Ward Alerts
                      </h2>
                    </div>
                    {WARD_ALERTS.length === 0 ? (
                      <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                        No active alerts.
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-col gap-3">
                        {WARD_ALERTS.map((alert) => {
                          const ward = WARDS.find((w) => w.id === alert.wardId);
                          return (
                            <button
                              key={alert.id}
                              type="button"
                              onClick={() => ward && selectWard(ward.id)}
                              className={`rounded-[8px] p-2 text-left transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] ${FOCUS_RING}`}
                            >
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#7F1D1D' }}
                              >
                                {alert.title}
                              </p>
                              <p style={{ fontSize: 14, color: '#4A7080' }}>{alert.body}</p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatDateTime(alert.time)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div
                    className="rounded-[12px] p-4 sm:p-5"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Stethoscope style={{ width: 16, height: 16, color: '#00B4D8' }} />
                      <h2
                        className="font-display font-semibold"
                        style={{ fontSize: 16, color: '#0D2630' }}
                      >
                        Bed Status Legend
                      </h2>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {(Object.keys(BED_STATUS_CFG) as BedStatus[]).map((status) => (
                        <div key={status} className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ background: BED_STATUS_CFG[status].color }}
                          />
                          <span style={{ fontSize: 14, color: '#4A7080' }}>{status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}

function FacilityOccupancyDonut({
  totals,
}: {
  totals: {
    total: number;
    occupied: number;
    available: number;
    reserved: number;
    cleaning: number;
  };
}) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  const segments = [
    { label: 'Occupied', value: totals.occupied, color: BED_STATUS_CFG.Occupied.color },
    { label: 'Available', value: totals.available, color: BED_STATUS_CFG.Available.color },
    { label: 'Reserved', value: totals.reserved, color: BED_STATUS_CFG.Reserved.color },
    { label: 'Cleaning', value: totals.cleaning, color: BED_STATUS_CFG.Cleaning.color },
  ];
  const sum = totals.total || 1;
  const radius = 54;
  const strokeWidth = 20;
  const circumference = 2 * Math.PI * radius;
  const gapPx = 3;

  let cumulative = 0;
  const arcs = segments.map((d) => {
    const rawLength = (d.value / sum) * circumference;
    const offset = -(cumulative / sum) * circumference;
    cumulative += d.value;
    return { ...d, length: Math.max(0, rawLength - gapPx), offset };
  });

  return (
    <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: 130, height: 130 }}
      >
        <svg
          viewBox="0 0 128 128"
          style={{ width: 130, height: 130 }}
          role="img"
          aria-label="Facility occupancy donut chart"
        >
          <g transform="rotate(-90 64 64)">
            {arcs.map((seg, i) => (
              <circle
                key={seg.label}
                cx={64}
                cy={64}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                strokeDasharray={`${animate ? seg.length : 0} ${circumference}`}
                strokeDashoffset={seg.offset}
                style={{
                  transition: `stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms`,
                }}
              />
            ))}
          </g>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display font-bold" style={{ fontSize: 20, color: '#0D2630' }}>
            {totals.total}
          </span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Beds</span>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-2">
        {segments.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                {d.label}
              </span>
            </div>
            <span
              className="shrink-0 font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
