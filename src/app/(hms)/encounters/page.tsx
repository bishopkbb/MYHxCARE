'use client';

import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  FileText,
  Heart,
  ListFilter,
  Printer,
  Search,
  Thermometer,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { MOCK_QUEUE, type PatientStatus } from '@/features/encounters/__mocks__/encounterFixtures';
import { useToast } from '@/hooks/useToast';

// ── Types ─────────────────────────────────────────────────────────────────────

type QueueTab = {
  id: string;
  label: string;
  count: number;
  badgeBg: string;
  badgeColor: string;
};

type StatusCfg = {
  label: string;
  borderLeft: string;
  pillBorder: string;
  pillColor: string;
  pillBg: string;
};

type FilterState = {
  gender: 'all' | 'male' | 'female';
  allergies: 'all' | 'yes' | 'no';
};

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PatientStatus, StatusCfg> = {
  waiting: {
    label: 'Waiting',
    borderLeft: '#D97706',
    pillBorder: '#D97706',
    pillColor: '#D97706',
    pillBg: 'transparent',
  },
  'in-consultation': {
    label: 'In Consultation',
    borderLeft: '#00B4D8',
    pillBorder: '#00B4D8',
    pillColor: '#00B4D8',
    pillBg: 'transparent',
  },
  emergency: {
    label: 'Emergency',
    borderLeft: '#EF4444',
    pillBorder: '#EF4444',
    pillColor: '#EF4444',
    pillBg: 'rgba(239,68,68,0.06)',
  },
  completed: {
    label: 'Completed',
    borderLeft: '#22C55E',
    pillBorder: '#22C55E',
    pillColor: '#22C55E',
    pillBg: 'transparent',
  },
  'follow-up': {
    label: 'Follow-up',
    borderLeft: '#F59E0B',
    pillBorder: '#F59E0B',
    pillColor: '#F59E0B',
    pillBg: 'rgba(245,158,11,0.06)',
  },
  'new-admissions': {
    label: 'New Admission',
    borderLeft: '#3B82F6',
    pillBorder: '#3B82F6',
    pillColor: '#3B82F6',
    pillBg: 'transparent',
  },
  discharged: {
    label: 'Discharged',
    borderLeft: '#6B7280',
    pillBorder: '#6B7280',
    pillColor: '#6B7280',
    pillBg: 'transparent',
  },
  'under-observation': {
    label: 'Under Obs.',
    borderLeft: '#8B5CF6',
    pillBorder: '#8B5CF6',
    pillColor: '#8B5CF6',
    pillBg: 'rgba(139,92,246,0.06)',
  },
};

// ── UI config ─────────────────────────────────────────────────────────────────

const QUEUE_TABS: QueueTab[] = [
  {
    id: 'all',
    label: 'All Patients',
    count: 0,
    badgeBg: 'rgba(0,180,216,0.12)',
    badgeColor: '#00B4D8',
  },
  {
    id: 'waiting',
    label: 'Waiting',
    count: 0,
    badgeBg: 'rgba(245,158,11,0.12)',
    badgeColor: '#F59E0B',
  },
  {
    id: 'in-consultation',
    label: 'In Consultation',
    count: 0,
    badgeBg: 'rgba(0,180,216,0.12)',
    badgeColor: '#00B4D8',
  },
  {
    id: 'completed',
    label: 'Completed',
    count: 0,
    badgeBg: 'rgba(34,197,94,0.12)',
    badgeColor: '#22C55E',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    count: 0,
    badgeBg: 'rgba(239,68,68,0.12)',
    badgeColor: '#EF4444',
  },
  {
    id: 'follow-up',
    label: 'Follow-up Needed',
    count: 0,
    badgeBg: 'rgba(245,158,11,0.12)',
    badgeColor: '#F59E0B',
  },
  {
    id: 'new-admissions',
    label: 'New Admissions',
    count: 0,
    badgeBg: 'rgba(59,130,246,0.12)',
    badgeColor: '#3B82F6',
  },
  {
    id: 'discharged',
    label: 'Discharged',
    count: 0,
    badgeBg: 'rgba(107,114,128,0.12)',
    badgeColor: '#6B7280',
  },
  {
    id: 'under-observation',
    label: 'Under Observation',
    count: 0,
    badgeBg: 'rgba(139,92,246,0.12)',
    badgeColor: '#8B5CF6',
  },
];

// ── Column definitions (header + body share these widths) ─────────────────────

const COLS = [
  { key: 'patient', label: 'Patient', width: 'w-[22%] xl:w-[21%]', headerPad: 'pl-5 pr-3' },
  { key: 'complaint', label: 'Chief Complaint', width: 'w-[35%] xl:w-[26%]', headerPad: 'pr-4' },
  { key: 'vitals', label: 'Vitals', width: 'hidden xl:block xl:w-[13%]', headerPad: 'pr-4' },
  { key: 'wait', label: 'Wait Time', width: 'hidden xl:block xl:w-[12%]', headerPad: 'pr-4' },
  { key: 'status', label: 'Status', width: 'w-[18%] xl:w-[13%]', headerPad: 'pr-4' },
  { key: 'actions', label: 'Actions', width: 'w-[25%] xl:w-[15%]', headerPad: 'pr-4' },
] as const;

// ── Tab → status mapping ──────────────────────────────────────────────────────

const TAB_STATUS_MAP: Partial<Record<string, PatientStatus>> = {
  waiting: 'waiting',
  'in-consultation': 'in-consultation',
  completed: 'completed',
  emergency: 'emergency',
  'follow-up': 'follow-up',
  'new-admissions': 'new-admissions',
  discharged: 'discharged',
  'under-observation': 'under-observation',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatQueueDate(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  return `Today — ${weekday}, ${month} ${now.getDate()}, ${now.getFullYear()}`;
}

function getTempColor(temp: number): string {
  if (temp >= 38.0) return '#EF4444';
  if (temp >= 37.5) return '#F59E0B';
  return '#25464D';
}

function getTabCount(tabId: string): number {
  if (tabId === 'all') return MOCK_QUEUE.length;
  const status = TAB_STATUS_MAP[tabId];
  if (!status) return 0;
  return MOCK_QUEUE.filter((p) => p.status === status).length;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EncountersPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    gender: 'all',
    allergies: 'all',
  });
  const [isLoading, setIsLoading] = useState(true);
  const filterRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const activeFilterCount = [
    activeFilters.gender !== 'all',
    activeFilters.allergies !== 'all',
  ].filter(Boolean).length;

  const filteredQueue = MOCK_QUEUE.filter((patient) => {
    if (activeTab !== 'all') {
      const status = TAB_STATUS_MAP[activeTab];
      if (!status || patient.status !== status) return false;
    }
    if (activeFilters.gender !== 'all') {
      const isFemale = patient.meta.toLowerCase().includes('female');
      if (activeFilters.gender === 'female' && !isFemale) return false;
      if (activeFilters.gender === 'male' && isFemale) return false;
    }
    if (activeFilters.allergies === 'yes' && patient.allergies.length === 0) return false;
    if (activeFilters.allergies === 'no' && patient.allergies.length > 0) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        patient.name.toLowerCase().includes(q) ||
        patient.mrn.toLowerCase().includes(q) ||
        patient.complaint.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const headers = [
      'Name',
      'MRN',
      'Patient Info',
      'Chief Complaint',
      'Allergies',
      'Heart Rate',
      'Temperature (°C)',
      'Blood Pressure',
      'Status',
      'Wait / Completion',
    ];
    const rows = filteredQueue.map((p) => [
      p.name,
      p.mrn,
      p.meta,
      p.complaint,
      p.allergies.join('; ') || 'None',
      `${p.hr} bpm`,
      `${p.temp}`,
      `${p.bp} mmHg`,
      STATUS_CFG[p.status].label,
      p.completedAt
        ? `${p.status === 'discharged' ? 'Discharged' : 'Completed'} ${p.completedAt}`
        : (p.waitDisplay ?? 'In progress'),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export ready', `${filteredQueue.length} queue records downloaded as CSV.`);
  };

  const exportPDF = () => {
    toast.info('Opening print view', 'Use your browser print dialog to save as PDF.');
    window.print();
  };

  return (
    <div className="px-4 pt-6 pb-24 sm:px-6 lg:px-12 lg:pt-10">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-y-3 sm:items-center">
        <div>
          <h1
            className="font-display text-3xl leading-10 font-semibold"
            style={{ color: '#2F3A40' }}
          >
            Patient Queue
          </h1>
          <p className="mt-1 text-base leading-6" style={{ color: '#4A7080' }}>
            {formatQueueDate()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* ── Filter button + panel ─────────────────────────────────── */}
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="flex h-10 items-center gap-1.5 rounded-[8px] px-3 text-base leading-6 font-medium transition-colors hover:bg-gray-50"
              style={{
                background: filterOpen ? '#E6F8FD' : '#FFFFFF',
                border: `1px solid ${filterOpen ? '#00B4D8' : '#0064821F'}`,
                color: '#2F3A40',
              }}
            >
              <ListFilter style={{ width: 16, height: 16, color: '#00B4D8' }} />
              Filter
              {activeFilterCount > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ width: 18, height: 18, background: '#00B4D8' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div
                className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-20 mt-2 w-72 rounded-[12px] bg-white p-4 duration-150"
                style={{
                  border: '1px solid rgba(0,100,130,0.12)',
                  boxShadow: '0px 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="font-display text-base font-semibold"
                    style={{ color: '#2F3A40' }}
                  >
                    Filters
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveFilters({ gender: 'all', allergies: 'all' })}
                      className="text-sm font-medium"
                      style={{ color: '#00B4D8' }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-sm font-bold uppercase" style={{ color: '#4A7080' }}>
                    Gender
                  </p>
                  <div className="flex gap-1.5">
                    {(['all', 'male', 'female'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setActiveFilters((prev) => ({ ...prev, gender: g }))}
                        className="flex-1 rounded-[8px] py-1.5 text-sm font-medium capitalize transition-colors"
                        style={{
                          background:
                            activeFilters.gender === g ? '#00B4D8' : 'rgba(0,100,130,0.06)',
                          color: activeFilters.gender === g ? '#FFFFFF' : '#4A7080',
                        }}
                      >
                        {g === 'all' ? 'All' : g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-bold uppercase" style={{ color: '#4A7080' }}>
                    Allergies
                  </p>
                  <div className="flex gap-1.5">
                    {(['all', 'yes', 'no'] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setActiveFilters((prev) => ({ ...prev, allergies: a }))}
                        className="flex-1 rounded-[8px] py-1.5 text-sm font-medium transition-colors"
                        style={{
                          background:
                            activeFilters.allergies === a ? '#00B4D8' : 'rgba(0,100,130,0.06)',
                          color: activeFilters.allergies === a ? '#FFFFFF' : '#4A7080',
                        }}
                      >
                        {a === 'all' ? 'Any' : a === 'yes' ? 'Has Allergy' : 'None'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Export button + menu ──────────────────────────────────── */}
          <div ref={exportRef} className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="flex h-10 items-center gap-1.5 rounded-[8px] px-3 text-base leading-6 font-medium transition-colors hover:bg-gray-50"
              style={{
                background: exportOpen ? '#E6F8FD' : '#FFFFFF',
                border: `1px solid ${exportOpen ? '#00B4D8' : '#0064821F'}`,
                color: '#2F3A40',
              }}
            >
              <Download style={{ width: 16, height: 16, color: '#00B4D8' }} />
              Export
            </button>

            {exportOpen && (
              <div
                className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-20 mt-2 w-52 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
                style={{
                  border: '1px solid rgba(0,100,130,0.12)',
                  boxShadow: '0px 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    exportCSV();
                    setExportOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-base leading-6 transition-colors hover:bg-[#E6F8FD]"
                  style={{ color: '#2F3A40' }}
                >
                  <FileText style={{ width: 16, height: 16, color: '#00B4D8' }} />
                  Export as CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportPDF();
                    setExportOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-base leading-6 transition-colors hover:bg-[#E6F8FD]"
                  style={{ color: '#2F3A40' }}
                >
                  <Printer style={{ width: 16, height: 16, color: '#00B4D8' }} />
                  Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <div className="relative mt-6 lg:mt-14">
        <Search
          className="pointer-events-none absolute top-1/2 left-[10px] -translate-y-1/2"
          style={{ width: 16, height: 16, color: '#8A98A3' }}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, MRN, or chief complaint..."
          className="h-[42px] w-full rounded-[12px] pr-4 pl-9 text-base leading-6 outline-none placeholder:text-[#8A98A3] focus:ring-2 focus:ring-[#0098CC]/30"
          style={{ background: '#FFFFFF', border: '1px solid #0064821F', color: '#2F3A40' }}
        />
      </div>

      {/* ── Quick-filter tab strip ───────────────────────────────────────── */}
      <div
        className="mt-4 flex flex-wrap items-center gap-1 rounded-[12px] p-1 lg:mt-8"
        style={{ background: '#E6F8FD' }}
      >
        {QUEUE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-base leading-6 font-medium transition-colors"
              style={{
                background: isActive ? '#FFFFFF' : 'transparent',
                color: '#2F3A40',
                boxShadow: isActive
                  ? '0px 1px 2px -1px rgba(0,0,0,0.10), 0px 1px 3px 0px rgba(0,0,0,0.10)'
                  : undefined,
              }}
            >
              {tab.label}
              <span
                className="inline-flex items-center justify-center rounded-full text-sm leading-[22px] font-bold"
                style={{
                  minWidth: 20,
                  height: 22,
                  paddingLeft: 6,
                  paddingRight: 6,
                  background: tab.badgeBg,
                  color: tab.badgeColor,
                }}
              >
                {getTabCount(tab.id)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Mobile card view — visible below lg ─────────────────────────── */}
      <div className="mt-6 space-y-3 lg:hidden">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-[12px] bg-white"
                style={{
                  border: '1px solid rgba(0,100,130,0.08)',
                  borderLeft: '4px solid #E2EDF1',
                  boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div className="flex items-start justify-between p-3">
                  <div className="flex items-start gap-3">
                    <div className="size-10 shrink-0 rounded-full bg-slate-100" />
                    <div className="space-y-2.5 pt-0.5">
                      <div className="h-4 w-36 rounded-md bg-slate-100" />
                      <div className="h-3.5 w-28 rounded-md bg-slate-100" />
                      <div className="h-3.5 w-44 rounded-md bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-6 w-20 rounded-full bg-slate-100" />
                </div>
                <div
                  className="border-t px-3 py-2.5"
                  style={{ borderColor: 'rgba(0,100,130,0.06)' }}
                >
                  <div className="h-4 w-full rounded-md bg-slate-100" />
                  <div className="mt-2 h-3.5 w-24 rounded-md bg-slate-100" />
                </div>
                <div
                  className="flex items-center justify-between border-t px-3 py-2"
                  style={{
                    borderColor: 'rgba(0,100,130,0.06)',
                    background: 'rgba(226,237,241,0.25)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-14 rounded-md bg-slate-100" />
                    <div className="h-3 w-14 rounded-md bg-slate-100" />
                    <div className="h-3 w-14 rounded-md bg-slate-100" />
                  </div>
                  <div className="h-3 w-16 rounded-md bg-slate-100" />
                </div>
                <div
                  className="flex items-center gap-2 border-t px-3 py-3"
                  style={{ borderColor: 'rgba(0,100,130,0.06)' }}
                >
                  <div className="size-11 rounded-[8px] bg-slate-100" />
                  <div className="h-11 flex-1 rounded-[8px] bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredQueue.length === 0 ? (
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
                No patients in this queue
              </p>
              <p className="mt-0.5 text-sm leading-5" style={{ color: '#8A98A3' }}>
                Adjust your search or change the active tab
              </p>
            </div>
          </div>
        ) : (
          filteredQueue.map((patient) => {
            const cfg = STATUS_CFG[patient.status];
            return (
              <div
                key={patient.id}
                className="overflow-hidden rounded-[12px] bg-white transition-shadow duration-150 hover:shadow-md"
                style={{
                  border: '1px solid rgba(0,100,130,0.08)',
                  borderLeft: `4px solid ${cfg.borderLeft}`,
                  boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {/* Identity + status pill */}
                <div className="flex items-start justify-between p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ background: patient.avatarBg }}
                    >
                      {patient.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base leading-6 font-semibold" style={{ color: '#2F3A40' }}>
                        {patient.name}
                      </p>
                      <p className="text-sm leading-5.5" style={{ color: '#00B4D8' }}>
                        {patient.mrn}
                      </p>
                      <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                        {patient.meta}
                      </p>
                    </div>
                  </div>
                  <span
                    className="ml-2 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-sm font-medium"
                    style={{
                      border: `1px solid ${cfg.pillBorder}`,
                      color: cfg.pillColor,
                      background: cfg.pillBg,
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Complaint + allergy */}
                <div
                  className="border-t px-3 py-2.5"
                  style={{ borderColor: 'rgba(0,100,130,0.06)' }}
                >
                  <p className="text-sm leading-5.5" style={{ color: '#2F3A40' }}>
                    {patient.complaint}
                  </p>
                  {patient.allergies.length > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      <AlertTriangle
                        className="shrink-0"
                        style={{ width: 14, height: 14, color: '#F59E0B' }}
                      />
                      <p className="text-sm leading-5">
                        <span style={{ color: '#EF4444' }}>ALLERGY: </span>
                        <span style={{ color: '#00B4D8' }}>{patient.allergies.join(', ')}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Vitals + wait time */}
                <div
                  className="flex items-center justify-between border-t px-3 py-2"
                  style={{
                    borderColor: 'rgba(0,100,130,0.06)',
                    background: 'rgba(226,237,241,0.25)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Heart
                        className="shrink-0"
                        style={{ width: 14, height: 14, fill: '#EF4444', stroke: 'none' }}
                      />
                      <span className="text-sm" style={{ color: '#25464D' }}>
                        {patient.hr} bpm
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Thermometer
                        className="shrink-0"
                        style={{ width: 14, height: 14, color: '#F59E0B' }}
                      />
                      <span className="text-sm" style={{ color: getTempColor(patient.temp) }}>
                        {patient.temp}°C
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity
                        className="shrink-0"
                        style={{ width: 14, height: 14, color: '#00B4D8' }}
                      />
                      <span className="text-sm" style={{ color: '#25464D' }}>
                        {patient.bp}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock
                      className="shrink-0"
                      style={{ width: 14, height: 14, color: '#8A98A3' }}
                    />
                    <span
                      className="text-sm"
                      style={{
                        color:
                          patient.completedAt !== null || patient.waitDisplay === null
                            ? '#8A98A3'
                            : '#25464D',
                      }}
                    >
                      {patient.completedAt !== null
                        ? `${patient.status === 'discharged' ? 'Discharged' : 'Completed'} ${patient.completedAt}`
                        : (patient.waitDisplay ?? 'In progress')}
                    </span>
                  </div>
                </div>

                {/* Actions — touch targets ≥ 44px per WCAG 2.1 AA */}
                <div
                  className="flex items-center gap-2 border-t px-3 py-3"
                  style={{ borderColor: 'rgba(0,100,130,0.06)' }}
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/patients/${patient.patientId ?? patient.id}`)}
                    className="flex shrink-0 items-center justify-center rounded-[8px] transition-opacity hover:opacity-75"
                    style={{ width: 44, height: 44, background: '#E2EDF1' }}
                    aria-label={`View details for ${patient.name}`}
                  >
                    <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                  </button>
                  <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                    <button
                      type="button"
                      disabled={patient.status === 'completed'}
                      onClick={() =>
                        router.push(`/patients/${patient.patientId ?? patient.id}/consultation`)
                      }
                      className="flex min-h-[44px] flex-1 items-center justify-center rounded-[8px] text-sm font-medium text-white transition-opacity disabled:cursor-default disabled:opacity-60"
                      style={{
                        background: patient.status === 'completed' ? '#9CA3AF' : '#00B4D8',
                      }}
                    >
                      Start Consultation
                    </button>
                  </PermissionGate>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Patient table — visible at lg+ ───────────────────────────────── */}
      <div className="mt-6 hidden overflow-x-auto lg:block">
        <div>
          {/* Table header */}
          <div
            className="flex"
            style={{ background: 'rgba(226,237,241,0.4)', borderBottom: '1px solid #E6F8FD' }}
          >
            {COLS.map((col) => (
              <div key={col.key} className={`${col.width} ${col.headerPad} py-3.5`}>
                <span
                  className="text-sm leading-[22px] font-bold tracking-wider uppercase"
                  style={{ color: '#4A7080' }}
                >
                  {col.label}
                </span>
              </div>
            ))}
          </div>

          {/* Table rows */}
          {isLoading ? (
            <div className="flex flex-col gap-2 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex min-h-[110px] animate-pulse items-center bg-white"
                  style={{ borderLeft: '5px solid #E2EDF1', borderBottom: '3px solid #E2EDF1' }}
                >
                  <div className="flex w-[22%] items-start gap-3 py-5 pr-3 pl-5 xl:w-[21%]">
                    <div className="size-10 shrink-0 rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2.5 pt-0.5">
                      <div className="h-4 w-32 rounded-md bg-slate-100" />
                      <div className="h-3.5 w-24 rounded-md bg-slate-100" />
                      <div className="h-3.5 w-40 rounded-md bg-slate-100" />
                    </div>
                  </div>
                  <div className="w-[35%] space-y-2.5 py-5 pr-4 xl:w-[26%]">
                    <div className="h-4 w-44 rounded-md bg-slate-100" />
                    <div className="h-3.5 w-28 rounded-md bg-slate-100" />
                  </div>
                  <div className="hidden w-[13%] space-y-2 py-5 pr-4 xl:block">
                    <div className="h-3.5 w-16 rounded-md bg-slate-100" />
                    <div className="h-3.5 w-16 rounded-md bg-slate-100" />
                    <div className="h-3.5 w-20 rounded-md bg-slate-100" />
                  </div>
                  <div className="hidden w-[12%] py-5 pr-4 xl:block">
                    <div className="h-3.5 w-16 rounded-md bg-slate-100" />
                  </div>
                  <div className="w-[18%] py-5 pr-4 xl:w-[13%]">
                    <div className="h-7 w-24 rounded-full bg-slate-100" />
                  </div>
                  <div className="flex w-[25%] items-center gap-2 py-5 pr-4 xl:w-[15%]">
                    <div className="size-9 rounded-[8px] bg-slate-100" />
                    <div className="h-9 flex-1 rounded-[8px] bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-10 text-center">
              <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(226,237,241,0.6)' }}
              >
                <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
              </div>
              <div>
                <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                  No patients in this queue
                </p>
                <p className="mt-0.5 text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                  Try changing the tab or clearing any active filters
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              {filteredQueue.map((patient) => {
                const cfg = STATUS_CFG[patient.status];

                return (
                  <div
                    key={patient.id}
                    className="flex min-h-[110px] items-center bg-white transition-colors duration-100 hover:bg-[#F5FBFD]"
                    style={{
                      borderLeft: `5px solid ${cfg.borderLeft}`,
                      borderBottom: `3px solid ${cfg.borderLeft}`,
                    }}
                  >
                    {/* ── PATIENT ── */}
                    <div className="flex w-[22%] items-start gap-3 py-5 pr-3 pl-5 xl:w-[21%]">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ background: patient.avatarBg }}
                      >
                        {patient.initials}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-base leading-6 font-semibold"
                          style={{ color: '#2F3A40' }}
                        >
                          {patient.name}
                        </p>
                        <p className="text-sm leading-5.5" style={{ color: '#00B4D8' }}>
                          {patient.mrn}
                        </p>
                        <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                          {patient.meta}
                        </p>
                      </div>
                    </div>

                    {/* ── CHIEF COMPLAINT ── */}
                    <div className="w-[35%] py-5 pr-4 xl:w-[26%]">
                      <p className="text-base leading-6" style={{ color: '#2F3A40' }}>
                        {patient.complaint}
                      </p>
                      {patient.allergies.length > 0 && (
                        <div className="mt-1 flex items-center gap-1">
                          <AlertTriangle
                            className="shrink-0"
                            style={{ width: 14, height: 14, color: '#F59E0B' }}
                          />
                          <p className="text-sm leading-5.5">
                            <span style={{ color: '#EF4444' }}>ALLERGY: </span>
                            <span style={{ color: '#00B4D8' }}>{patient.allergies.join(', ')}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── VITALS ── */}
                    <div className="hidden w-[13%] space-y-1 py-5 pr-4 xl:block">
                      <div className="flex items-center gap-1.5">
                        <Heart
                          className="shrink-0"
                          style={{ width: 14, height: 14, fill: '#EF4444', stroke: 'none' }}
                        />
                        <span className="text-sm leading-5.5" style={{ color: '#25464D' }}>
                          {patient.hr} bpm
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Thermometer
                          className="shrink-0"
                          style={{ width: 14, height: 14, color: '#F59E0B' }}
                        />
                        <span
                          className="text-sm leading-5.5"
                          style={{ color: getTempColor(patient.temp) }}
                        >
                          {patient.temp}°C
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity
                          className="shrink-0"
                          style={{ width: 14, height: 14, color: '#00B4D8' }}
                        />
                        <span className="text-sm leading-5.5" style={{ color: '#25464D' }}>
                          {patient.bp} mmHg
                        </span>
                      </div>
                    </div>

                    {/* ── WAIT TIME ── */}
                    <div className="hidden w-[12%] py-5 pr-4 xl:block">
                      {patient.completedAt !== null ? (
                        <div className="flex items-start gap-1.5">
                          <Clock
                            className="mt-[3px] shrink-0"
                            style={{ width: 14, height: 14, color: '#8A98A3' }}
                          />
                          <div>
                            <p className="text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                              {patient.status === 'discharged' ? 'Discharged' : 'Completed'}
                            </p>
                            <p className="text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                              {patient.completedAt}
                            </p>
                          </div>
                        </div>
                      ) : patient.waitDisplay === null ? (
                        <div className="flex items-center gap-1.5">
                          <Clock
                            className="shrink-0"
                            style={{ width: 14, height: 14, color: '#8A98A3' }}
                          />
                          <span className="text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                            In progress
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Clock
                            className="shrink-0"
                            style={{ width: 14, height: 14, color: '#8A98A3' }}
                          />
                          <span className="text-sm leading-5.5" style={{ color: '#25464D' }}>
                            {patient.waitDisplay}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── STATUS ── */}
                    <div className="w-[18%] py-5 pr-4 xl:w-[13%]">
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1.5 text-sm leading-5.5 font-medium"
                        style={{
                          border: `1px solid ${cfg.pillBorder}`,
                          color: cfg.pillColor,
                          background: cfg.pillBg,
                        }}
                      >
                        {cfg.label}
                      </span>
                    </div>

                    {/* ── ACTIONS ── */}
                    <div className="flex w-[25%] items-center gap-2 py-5 pr-4 xl:w-[15%]">
                      <button
                        type="button"
                        onClick={() => router.push(`/patients/${patient.patientId ?? patient.id}`)}
                        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[8px] transition-opacity hover:opacity-75"
                        style={{ background: '#E2EDF1' }}
                        aria-label={`View details for ${patient.name}`}
                      >
                        <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                      </button>
                      <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
                        <button
                          type="button"
                          disabled={patient.status === 'completed'}
                          onClick={() =>
                            router.push(`/patients/${patient.patientId ?? patient.id}/consultation`)
                          }
                          className="flex-1 cursor-pointer rounded-[8px] px-3 py-2 text-center text-sm leading-5.5 font-medium text-white transition-opacity disabled:cursor-default disabled:opacity-60"
                          style={{
                            background: patient.status === 'completed' ? '#9CA3AF' : '#00B4D8',
                          }}
                        >
                          Start Consultation
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
