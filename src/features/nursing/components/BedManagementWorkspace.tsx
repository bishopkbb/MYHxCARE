'use client';

import {
  ArrowLeftRight,
  Bed as BedIcon,
  BedDouble,
  Biohazard,
  CalendarPlus,
  CheckCircle2,
  LayoutGrid,
  List,
  Minus,
  MoreVertical,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/utils/datetime';
import { getEffectiveRoster } from '@/features/nursing/store/nursingWorkflowStore';
import type { NursePatient } from '@/features/nursing/__mocks__/myPatientsFixtures';
import {
  BED_STATUS_CFG,
  WARD_LAYOUTS,
  type BedSlot,
  type BedStatus,
  type WardLayout,
} from '@/features/nursing/__mocks__/bedManagementFixtures';

const TransferPatientModal = dynamic(
  () => import('./TransferPatientModal').then((m) => m.TransferPatientModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type ResolvedBed = {
  id: string;
  bedCode: string;
  room: string;
  isIsolation?: boolean;
  status: BedStatus;
  patientName?: string;
  mrn?: string;
  diagnosis?: string;
  doctorName?: string;
  admittedAt?: string;
};

type ViewMode = 'ward' | 'list';
type StatusFilter = 'All' | BedStatus;

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'All', label: 'All Bed Status' },
  { value: 'Occupied', label: 'Occupied' },
  { value: 'Available', label: 'Available' },
  { value: 'Reserved', label: 'Reserved' },
  { value: 'Cleaning Required', label: 'Cleaning Required' },
  { value: 'Out of Service', label: 'Out of Service' },
];

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return h >>> 0;
}

function syntheticAdmittedAt(patientId: string): string {
  const daysAgo = 1 + (hashSeed(patientId) % 6);
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(9, 30, 0, 0);
  return d.toISOString();
}

function resolveWardBeds(layout: WardLayout, roster: NursePatient[]): ResolvedBed[] {
  const wardRosterPatients = layout.rosterWardName
    ? roster.filter((p) => p.ward === layout.rosterWardName)
    : [];
  let rosterIdx = 0;

  return layout.beds.map((slot: BedSlot) => {
    if (slot.rosterSlot) {
      const patient = wardRosterPatients[rosterIdx++];
      if (patient) {
        return {
          id: patient.id,
          bedCode: slot.bedCode,
          room: slot.room,
          status: 'Occupied',
          patientName: patient.patientName,
          mrn: patient.mrn,
          diagnosis: patient.diagnosis,
          doctorName: patient.doctorName,
          admittedAt: syntheticAdmittedAt(patient.id),
        };
      }
      return {
        id: `${layout.id}-${slot.bedCode}`,
        bedCode: slot.bedCode,
        room: slot.room,
        status: 'Available',
      };
    }
    const resolved: ResolvedBed = {
      id: `${layout.id}-${slot.bedCode}`,
      bedCode: slot.bedCode,
      room: slot.room,
      status: slot.status,
    };
    if (slot.isIsolation) resolved.isIsolation = true;
    if (slot.patientName) resolved.patientName = slot.patientName;
    if (slot.mrn) resolved.mrn = slot.mrn;
    if (slot.diagnosis) resolved.diagnosis = slot.diagnosis;
    if (slot.doctorName) resolved.doctorName = slot.doctorName;
    if (slot.admittedAt) resolved.admittedAt = slot.admittedAt;
    return resolved;
  });
}

function countBeds(beds: ResolvedBed[]) {
  return {
    occupied: beds.filter((b) => b.status === 'Occupied').length,
    available: beds.filter((b) => b.status === 'Available').length,
    reserved: beds.filter((b) => b.status === 'Reserved').length,
    cleaning: beds.filter((b) => b.status === 'Cleaning Required').length,
    outOfService: beds.filter((b) => b.status === 'Out of Service').length,
    isolation: beds.filter((b) => b.isIsolation).length,
    total: beds.length,
  };
}

function lengthOfStayDays(admittedAt: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - new Date(admittedAt).getTime()) / 86_400_000));
}

function BedCard({
  bed,
  isSelected,
  onSelect,
  onReserve,
  onMarkAvailable,
  onTransfer,
}: {
  bed: ResolvedBed;
  isSelected: boolean;
  onSelect: () => void;
  onReserve: () => void;
  onMarkAvailable: () => void;
  onTransfer: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cfg = BED_STATUS_CFG[bed.status];

  useEffect(() => {
    if (!menuOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [menuOpen]);

  return (
    <div
      ref={rootRef}
      className={`relative flex w-full min-w-[150px] flex-col rounded-[10px] p-3 text-left transition-colors duration-150 ${FOCUS_RING}`}
      style={{
        background: cfg.bg,
        border: `1.5px solid ${isSelected ? '#00B4D8' : cfg.border}`,
        cursor: 'pointer',
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect();
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1">
          <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            {bed.bedCode}
          </p>
          {bed.isIsolation && (
            <Biohazard style={{ width: 13, height: 13, color: '#F59E0B', flexShrink: 0 }} />
          )}
        </div>
        <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
          <button
            type="button"
            aria-label={`More actions for ${bed.bedCode}`}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className={`flex size-6 shrink-0 items-center justify-center rounded-[6px] transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <MoreVertical style={{ width: 14, height: 14, color: '#4A7080' }} />
          </button>
        </PermissionGate>
      </div>

      {bed.status === 'Occupied' ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          <BedDouble style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
              {bed.patientName}
            </p>
            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
              {bed.mrn}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-1.5">
          {bed.status === 'Cleaning Required' ? (
            <Sparkles style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
          ) : bed.status === 'Out of Service' ? (
            <XCircle style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
          ) : (
            <BedDouble style={{ width: 14, height: 14, color: cfg.color, flexShrink: 0 }} />
          )}
          <p style={{ fontSize: 14, color: cfg.color }}>{bed.status}</p>
        </div>
      )}

      {menuOpen && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-2 z-30 mt-1 w-44 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {bed.status === 'Occupied' && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onTransfer();
              }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <ArrowLeftRight style={{ width: 15, height: 15, color: '#00B4D8' }} />
              Transfer Patient
            </button>
          )}
          {bed.status === 'Available' && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onReserve();
              }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <CalendarPlus style={{ width: 15, height: 15, color: '#8B5CF6' }} />
              Reserve Bed
            </button>
          )}
          {bed.status !== 'Available' && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onMarkAvailable();
              }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              <CheckCircle2 style={{ width: 15, height: 15, color: '#22C55E' }} />
              Mark Available
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function BedManagementWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [bedsByWard, setBedsByWard] = useState<Record<string, ResolvedBed[]>>(() => {
    const roster = getEffectiveRoster();
    const map: Record<string, ResolvedBed[]> = {};
    for (const layout of WARD_LAYOUTS) map[layout.id] = resolveWardBeds(layout, roster);
    return map;
  });

  const [selectedWardId, setSelectedWardId] = useState<string>(WARD_LAYOUTS[0]!.id);
  const [viewMode, setViewMode] = useState<ViewMode>('ward');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [isolationOnly, setIsolationOnly] = useState(false);
  const [cleaningOnly, setCleaningOnly] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [transferTargetBedId, setTransferTargetBedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);

  const selectedWard = WARD_LAYOUTS.find((w) => w.id === selectedWardId) ?? WARD_LAYOUTS[0]!;
  const wardBeds = useMemo(() => bedsByWard[selectedWard.id] ?? [], [bedsByWard, selectedWard.id]);
  const counts = useMemo(() => countBeds(wardBeds), [wardBeds]);
  const selectedBed = wardBeds.find((b) => b.id === selectedBedId) ?? null;

  const filteredBeds = useMemo(() => {
    return wardBeds.filter((b) => {
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (isolationOnly && !b.isIsolation) return false;
      if (cleaningOnly && b.status !== 'Cleaning Required') return false;
      return true;
    });
  }, [wardBeds, statusFilter, isolationOnly, cleaningOnly]);

  const roomGroups = useMemo(() => {
    const map = new Map<string, ResolvedBed[]>();
    for (const bed of filteredBeds) {
      if (!map.has(bed.room)) map.set(bed.room, []);
      map.get(bed.room)!.push(bed);
    }
    return Array.from(map.entries());
  }, [filteredBeds]);

  const mainRooms = roomGroups.filter(([room]) => room !== 'Isolation Room');
  const isolationRoom = roomGroups.find(([room]) => room === 'Isolation Room');

  const totalPages = Math.max(1, Math.ceil(filteredBeds.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filteredBeds.slice(pageStart, pageStart + rowsPerPage);

  function selectWard(id: string) {
    setSelectedWardId(id);
    setSelectedBedId(null);
    setCurrentPage(1);
  }

  function setBedStatus(wardId: string, bedId: string, status: BedStatus) {
    setBedsByWard((prev) => ({
      ...prev,
      [wardId]: prev[wardId]!.map((b) => (b.id === bedId ? { ...b, status } : b)),
    }));
  }

  function clearBedToAvailable(wardId: string, bedId: string) {
    setBedsByWard((prev) => ({
      ...prev,
      [wardId]: prev[wardId]!.map((b) => {
        if (b.id !== bedId) return b;
        const {
          patientName: _p,
          mrn: _m,
          diagnosis: _d,
          doctorName: _doc,
          admittedAt: _a,
          ...rest
        } = b;
        return { ...rest, status: 'Available' };
      }),
    }));
  }

  function occupyBed(
    wardId: string,
    bedId: string,
    patient: {
      patientName?: string | undefined;
      mrn?: string | undefined;
      diagnosis?: string | undefined;
      doctorName?: string | undefined;
      admittedAt?: string | undefined;
    },
  ) {
    setBedsByWard((prev) => ({
      ...prev,
      [wardId]: prev[wardId]!.map((b) => {
        if (b.id !== bedId) return b;
        return {
          ...b,
          status: 'Occupied',
          ...(patient.patientName ? { patientName: patient.patientName } : {}),
          ...(patient.mrn ? { mrn: patient.mrn } : {}),
          ...(patient.diagnosis ? { diagnosis: patient.diagnosis } : {}),
          ...(patient.doctorName ? { doctorName: patient.doctorName } : {}),
          ...(patient.admittedAt ? { admittedAt: patient.admittedAt } : {}),
        };
      }),
    }));
  }

  function requireSelection(action: (bed: ResolvedBed) => void) {
    if (!selectedBed) {
      toast.info('Select a bed', 'Choose a bed from the layout below first.');
      return;
    }
    action(selectedBed);
  }

  function reserveBed(bed: ResolvedBed) {
    if (bed.status !== 'Available') {
      toast.info('Bed not available', `${bed.bedCode} is not currently available to reserve.`);
      return;
    }
    setBedStatus(selectedWard.id, bed.id, 'Reserved');
    toast.success('Bed reserved', `${bed.bedCode} has been reserved.`);
  }

  function markAvailable(bed: ResolvedBed) {
    if (bed.status === 'Available') {
      toast.info('Already available', `${bed.bedCode} is already marked available.`);
      return;
    }
    clearBedToAvailable(selectedWard.id, bed.id);
    toast.success('Bed marked available', `${bed.bedCode} is now available.`);
  }

  function openTransfer(bed: ResolvedBed) {
    if (bed.status !== 'Occupied') {
      toast.info('No patient to transfer', `${bed.bedCode} has no patient assigned.`);
      return;
    }
    setTransferTargetBedId(bed.id);
  }

  function confirmTransfer(destinationBedId: string) {
    const source = wardBeds.find((b) => b.id === transferTargetBedId);
    if (!source) return;
    const destination = wardBeds.find((b) => b.id === destinationBedId);
    if (!destination) return;
    occupyBed(selectedWard.id, destinationBedId, {
      patientName: source.patientName,
      mrn: source.mrn,
      diagnosis: source.diagnosis,
      doctorName: source.doctorName,
      admittedAt: source.admittedAt,
    });
    clearBedToAvailable(selectedWard.id, source.id);
    toast.success(
      'Patient transferred',
      `${source.patientName} moved from ${source.bedCode} to ${destination.bedCode}.`,
    );
    setTransferTargetBedId(null);
    setSelectedBedId(destinationBedId);
  }

  const transferSourceBed = transferTargetBedId
    ? (wardBeds.find((b) => b.id === transferTargetBedId) ?? null)
    : null;
  const availableBedsForTransfer = wardBeds
    .filter((b) => b.status === 'Available')
    .map((b) => ({ id: b.id, bedCode: b.bedCode, room: b.room }));

  const wardOptions = WARD_LAYOUTS.map((w) => ({ value: w.id, label: w.name }));

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
              Ward Management
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Bed Management
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Bed Management
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Visualize ward layout and manage bed status.
              </p>
            </div>
            <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => requireSelection(openTransfer)}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.15)',
                    color: '#0D2630',
                    fontSize: 14,
                  }}
                >
                  <ArrowLeftRight style={{ width: 16, height: 16 }} />
                  Transfer Patient
                </button>
                <button
                  type="button"
                  onClick={() => requireSelection(reserveBed)}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.15)',
                    color: '#0D2630',
                    fontSize: 14,
                  }}
                >
                  <CalendarPlus style={{ width: 16, height: 16 }} />
                  Reserve Bed
                </button>
                <button
                  type="button"
                  onClick={() => requireSelection(markAvailable)}
                  className={`flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ background: '#22C55E', fontSize: 14 }}
                >
                  <CheckCircle2 style={{ width: 16, height: 16 }} />
                  Mark Available
                </button>
              </div>
            </PermissionGate>
          </div>

          {/* ── Filters ─────────────────────────────────────────────────── */}
          <div
            className="mt-4 flex flex-wrap items-end gap-4 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="w-full sm:w-56">
              <p
                className="mb-1.5 font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Select Ward
              </p>
              <FormSelect
                id="select-ward"
                value={selectedWardId}
                onChange={selectWard}
                options={wardOptions}
                placeholder="Select ward"
              />
            </div>
            <div>
              <p
                className="mb-1.5 font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                View
              </p>
              <div
                className="flex items-center gap-1 rounded-[10px] p-1"
                style={{ background: '#F5FBFD' }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('ward')}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    background: viewMode === 'ward' ? '#00B4D8' : 'transparent',
                    color: viewMode === 'ward' ? '#FFFFFF' : '#4A7080',
                  }}
                >
                  <LayoutGrid style={{ width: 15, height: 15 }} />
                  Ward View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    background: viewMode === 'list' ? '#00B4D8' : 'transparent',
                    color: viewMode === 'list' ? '#FFFFFF' : '#4A7080',
                  }}
                >
                  <List style={{ width: 15, height: 15 }} />
                  List View
                </button>
              </div>
            </div>
            <div className="w-full sm:w-52">
              <p
                className="mb-1.5 font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Filter Beds
              </p>
              <FormSelect
                id="filter-beds"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={STATUS_FILTER_OPTIONS}
                placeholder="All Bed Status"
              />
            </div>
            <label className="flex h-11 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isolationOnly}
                onChange={(e) => setIsolationOnly(e.target.checked)}
                className="size-4 shrink-0 cursor-pointer rounded"
                style={{ accentColor: '#00B4D8' }}
              />
              <span style={{ fontSize: 14, color: '#4A7080' }}>Show Isolation Only</span>
            </label>
            <label className="flex h-11 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={cleaningOnly}
                onChange={(e) => setCleaningOnly(e.target.checked)}
                className="size-4 shrink-0 cursor-pointer rounded"
                style={{ accentColor: '#00B4D8' }}
              />
              <span style={{ fontSize: 14, color: '#4A7080' }}>Show Cleaning Required</span>
            </label>
          </div>

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {(
              [
                {
                  label: 'Occupied',
                  value: counts.occupied,
                  color: '#16A34A',
                  bg: 'rgba(34,197,94,0.1)',
                  icon: BedDouble,
                },
                {
                  label: 'Available',
                  value: counts.available,
                  color: '#3B82F6',
                  bg: 'rgba(59,130,246,0.1)',
                  icon: BedIcon,
                },
                {
                  label: 'Reserved',
                  value: counts.reserved,
                  color: '#8B5CF6',
                  bg: 'rgba(139,92,246,0.1)',
                  icon: BedDouble,
                },
                {
                  label: 'Cleaning Required',
                  value: counts.cleaning,
                  color: '#F59E0B',
                  bg: 'rgba(245,158,11,0.1)',
                  icon: Sparkles,
                },
                {
                  label: 'Out of Service',
                  value: counts.outOfService,
                  color: '#EF4444',
                  bg: 'rgba(239,68,68,0.1)',
                  icon: XCircle,
                },
                {
                  label: 'Isolation',
                  value: counts.isolation,
                  color: '#F59E0B',
                  bg: 'rgba(245,158,11,0.1)',
                  icon: Biohazard,
                },
                {
                  label: 'Total Beds',
                  value: counts.total,
                  color: '#0D2630',
                  bg: 'rgba(0,100,130,0.08)',
                  icon: BedDouble,
                },
              ] as {
                label: string;
                value: number;
                color: string;
                bg: string;
                icon: typeof BedDouble;
              }[]
            ).map((s) => (
              <div
                key={s.label}
                className="rounded-[12px] p-3.5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: s.bg }}
                  >
                    <s.icon style={{ width: 16, height: 16, color: s.color }} />
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
              </div>
            ))}
          </div>

          {viewMode === 'ward' ? (
            <div
              className="mt-4 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 18, color: '#0D2630' }}
                >
                  {selectedWard.name} – {selectedWard.floor}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(60, z - 10))}
                    aria-label="Zoom out"
                    className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.18)' }}
                  >
                    <Minus style={{ width: 15, height: 15, color: '#4A7080' }} />
                  </button>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630', minWidth: 44, textAlign: 'center' }}
                  >
                    {zoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(150, z + 10))}
                    aria-label="Zoom in"
                    className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.18)' }}
                  >
                    <Plus style={{ width: 15, height: 15, color: '#4A7080' }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(100)}
                    className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#4A7080',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  >
                    <RotateCcw style={{ width: 14, height: 14 }} />
                    Reset View
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-auto scroll-smooth" style={{ maxHeight: 640 }}>
                <div
                  className="flex flex-col gap-4 sm:flex-row sm:items-start"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                    transition: 'transform 150ms',
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-5" style={{ minWidth: 560 }}>
                    {mainRooms.length === 0 && (
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
                          No beds match this filter
                        </p>
                      </div>
                    )}
                    {mainRooms.map(([room, beds]) => (
                      <div key={room}>
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {room}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                          {beds.map((bed) => (
                            <BedCard
                              key={bed.id}
                              bed={bed}
                              isSelected={selectedBedId === bed.id}
                              onSelect={() => setSelectedBedId(bed.id)}
                              onReserve={() => reserveBed(bed)}
                              onMarkAvailable={() => markAvailable(bed)}
                              onTransfer={() => openTransfer(bed)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isolationRoom && (
                    <div
                      className="w-full shrink-0 rounded-[10px] p-3 sm:w-[220px]"
                      style={{
                        background: 'rgba(245,158,11,0.04)',
                        border: '1px solid rgba(245,158,11,0.25)',
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Biohazard style={{ width: 15, height: 15, color: '#F59E0B' }} />
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          Isolation Room
                        </p>
                      </div>
                      <div className="mt-2 flex flex-col gap-2.5">
                        {isolationRoom[1].map((bed) => (
                          <BedCard
                            key={bed.id}
                            bed={bed}
                            isSelected={selectedBedId === bed.id}
                            onSelect={() => setSelectedBedId(bed.id)}
                            onReserve={() => reserveBed(bed)}
                            onMarkAvailable={() => markAvailable(bed)}
                            onTransfer={() => openTransfer(bed)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="mt-4 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
                {selectedWard.name} – {selectedWard.floor}
              </h2>
              <div className="mt-3 overflow-x-auto scroll-smooth">
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
                        ['Room', 'w-24'],
                        ['Status', 'w-40'],
                        ['Patient', 'min-w-[160px] flex-1'],
                        ['Doctor', 'w-36'],
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

                  {pageRows.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <BedDouble style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No beds match this filter
                      </p>
                    </div>
                  )}

                  {pageRows.map((bed) => {
                    const cfg = BED_STATUS_CFG[bed.status];
                    const isSelected = selectedBedId === bed.id;
                    return (
                      <div
                        key={bed.id}
                        onClick={() => setSelectedBedId(bed.id)}
                        className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: '1px solid rgba(0,100,130,0.08)',
                          background: isSelected ? '#E6F8FD' : 'transparent',
                        }}
                      >
                        <div className="w-20 shrink-0 py-3 pr-1.5 pl-3">
                          <div className="flex items-center gap-1">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {bed.bedCode}
                            </p>
                            {bed.isIsolation && (
                              <Biohazard style={{ width: 13, height: 13, color: '#F59E0B' }} />
                            )}
                          </div>
                        </div>
                        <div className="w-24 shrink-0 py-3 pr-1.5">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {bed.room}
                          </p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-1.5">
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
                        <div className="min-w-[160px] flex-1 py-3 pr-1.5">
                          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                            {bed.patientName ?? '—'}
                          </p>
                          {bed.mrn && (
                            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                              {bed.mrn}
                            </p>
                          )}
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-1.5">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {bed.doctorName ?? '—'}
                          </p>
                        </div>
                        <div
                          className="sticky right-0 z-10 flex w-32 shrink-0 items-center justify-end py-3 pr-3"
                          style={{ background: isSelected ? '#E6F8FD' : '#FFFFFF' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                            {bed.status === 'Occupied' ? (
                              <button
                                type="button"
                                onClick={() => openTransfer(bed)}
                                className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  color: '#00B4D8',
                                  border: '1px solid rgba(0,180,216,0.35)',
                                }}
                              >
                                Transfer
                              </button>
                            ) : bed.status === 'Available' ? (
                              <button
                                type="button"
                                onClick={() => reserveBed(bed)}
                                className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  color: '#8B5CF6',
                                  border: '1px solid rgba(139,92,246,0.35)',
                                }}
                              >
                                Reserve
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => markAvailable(bed)}
                                className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                                style={{
                                  fontSize: 14,
                                  color: '#22C55E',
                                  border: '1px solid rgba(34,197,94,0.35)',
                                }}
                              >
                                Mark Ready
                              </button>
                            )}
                          </PermissionGate>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {filteredBeds.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Showing {pageStart + 1} to{' '}
                    {Math.min(pageStart + rowsPerPage, filteredBeds.length)} of{' '}
                    {filteredBeds.length} beds
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
          )}

          {/* ── Bed Details / Actions / Legend ─────────────────────────── */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Bed Details
              </h2>
              {!selectedBed ? (
                <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                  Select a bed above to view its details.
                </p>
              ) : (
                <div className="mt-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-[8px]"
                      style={{ background: BED_STATUS_CFG[selectedBed.status].bg }}
                    >
                      <BedDouble
                        style={{
                          width: 16,
                          height: 16,
                          color: BED_STATUS_CFG[selectedBed.status].color,
                        }}
                      />
                    </div>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      {selectedBed.bedCode}
                    </p>
                    <span
                      className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: BED_STATUS_CFG[selectedBed.status].color,
                        border: `1px solid ${BED_STATUS_CFG[selectedBed.status].border}`,
                        background: BED_STATUS_CFG[selectedBed.status].bg,
                      }}
                    >
                      {selectedBed.status}
                    </span>
                  </div>
                  {selectedBed.status === 'Occupied' ? (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>Patient</p>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selectedBed.patientName}
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>{selectedBed.mrn}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>Diagnosis</p>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selectedBed.diagnosis ?? '—'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>Assigned Doctor</p>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selectedBed.doctorName ?? '—'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>Length of Stay</p>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {selectedBed.admittedAt
                            ? `${lengthOfStayDays(selectedBed.admittedAt, nowMs)} days`
                            : '—'}
                        </p>
                        {selectedBed.admittedAt && (
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatDateTime(selectedBed.admittedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3" style={{ fontSize: 14, color: '#4A7080' }}>
                      {selectedBed.room}
                      {selectedBed.isIsolation ? ' · Isolation bed' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Actions
              </h2>
              <PermissionGate
                permission={PERMISSIONS.ENCOUNTERS_WRITE}
                fallback={
                  <p className="mt-2" style={{ fontSize: 14, color: '#8A98A3' }}>
                    You don&apos;t have permission to manage beds.
                  </p>
                }
              >
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => requireSelection(openTransfer)}
                    className={`flex h-11 items-center gap-2.5 rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#0D2630', background: 'rgba(0,180,216,0.1)' }}
                  >
                    <ArrowLeftRight style={{ width: 17, height: 17, color: '#00B4D8' }} />
                    Transfer Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => requireSelection(reserveBed)}
                    className={`flex h-11 items-center gap-2.5 rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#0D2630', background: 'rgba(139,92,246,0.1)' }}
                  >
                    <CalendarPlus style={{ width: 17, height: 17, color: '#8B5CF6' }} />
                    Reserve Bed
                  </button>
                  <button
                    type="button"
                    onClick={() => requireSelection(markAvailable)}
                    className={`flex h-11 items-center gap-2.5 rounded-[10px] px-3.5 font-sans font-medium transition-opacity duration-150 hover:opacity-85 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#166534', background: 'rgba(34,197,94,0.12)' }}
                  >
                    <CheckCircle2 style={{ width: 17, height: 17 }} />
                    Mark Available
                  </button>
                </div>
              </PermissionGate>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert style={{ width: 16, height: 16, color: '#00B4D8' }} />
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Legend
                </h2>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(Object.keys(BED_STATUS_CFG) as BedStatus[]).map((status) => (
                  <div key={status} className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: BED_STATUS_CFG[status].color }}
                    />
                    <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {status}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Biohazard style={{ width: 13, height: 13, color: '#F59E0B' }} />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>Isolation</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>
      </main>

      {transferSourceBed && transferSourceBed.patientName && (
        <TransferPatientModal
          patientName={transferSourceBed.patientName}
          sourceBedCode={transferSourceBed.bedCode}
          availableBeds={availableBedsForTransfer}
          onClose={() => setTransferTargetBedId(null)}
          onConfirm={confirmTransfer}
        />
      )}
    </div>
  );
}
