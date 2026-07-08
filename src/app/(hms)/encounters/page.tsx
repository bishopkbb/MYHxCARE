'use client';

import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  Heart,
  ListFilter,
  Search,
  Thermometer,
} from 'lucide-react';
import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type QueueTab = {
  id: string;
  label: string;
  count: number;
  badgeBg: string;
  badgeColor: string;
};

type PatientStatus = 'waiting' | 'in-consultation' | 'emergency' | 'completed';

type PatientRow = {
  id: string;
  initials: string;
  avatarBg: string;
  name: string;
  mrn: string;
  meta: string;
  complaint: string;
  allergies: string[];
  hr: number;
  temp: number;
  bp: string;
  waitDisplay: string | null; // null → "In progress"
  completedAt: string | null; // e.g. "09:45"
  status: PatientStatus;
};

type StatusCfg = {
  label: string;
  borderLeft: string;
  pillBorder: string;
  pillColor: string;
  pillBg: string;
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
};

// ── Mock data — will be replaced with real API data in Phase 6 ─────────────────

const QUEUE_TABS: QueueTab[] = [
  {
    id: 'all',
    label: 'All Patients',
    count: 8,
    badgeBg: 'rgba(0,180,216,0.12)',
    badgeColor: '#00B4D8',
  },
  {
    id: 'waiting',
    label: 'Waiting',
    count: 3,
    badgeBg: 'rgba(245,158,11,0.12)',
    badgeColor: '#F59E0B',
  },
  {
    id: 'in-consultation',
    label: 'In Consultation',
    count: 2,
    badgeBg: 'rgba(0,180,216,0.12)',
    badgeColor: '#00B4D8',
  },
  {
    id: 'completed',
    label: 'Completed',
    count: 2,
    badgeBg: 'rgba(34,197,94,0.12)',
    badgeColor: '#22C55E',
  },
  {
    id: 'emergency',
    label: 'Emergency',
    count: 1,
    badgeBg: 'rgba(239,68,68,0.12)',
    badgeColor: '#EF4444',
  },
  {
    id: 'follow-up',
    label: 'Follow-up Needed',
    count: 4,
    badgeBg: 'rgba(245,158,11,0.12)',
    badgeColor: '#F59E0B',
  },
  {
    id: 'new-admissions',
    label: 'New Admissions',
    count: 5,
    badgeBg: 'rgba(59,130,246,0.12)',
    badgeColor: '#3B82F6',
  },
  {
    id: 'discharged',
    label: 'Discharged',
    count: 6,
    badgeBg: 'rgba(107,114,128,0.12)',
    badgeColor: '#6B7280',
  },
  {
    id: 'under-observation',
    label: 'Under Observation',
    count: 3,
    badgeBg: 'rgba(139,92,246,0.12)',
    badgeColor: '#8B5CF6',
  },
];

const MOCK_QUEUE: PatientRow[] = [
  {
    id: 'q1',
    initials: 'AO',
    avatarBg: '#F59E0B',
    name: 'Adaeze Okonkwo',
    mrn: 'MRN-2024-00451',
    meta: '21y Female · Medicine & Surgery',
    complaint: 'Persistent headache and fever for 3 days',
    allergies: ['Penicillin', 'Sulfonamides'],
    hr: 98,
    temp: 38.7,
    bp: '132/86',
    waitDisplay: '47 min',
    completedAt: null,
    status: 'waiting',
  },
  {
    id: 'q2',
    initials: 'CE',
    avatarBg: '#00B4D8',
    name: 'Chukwuemeka Eze',
    mrn: 'MRN-2024-00389',
    meta: '19y Male · Engineering',
    complaint: 'Abdominal pain and nausea since yesterday',
    allergies: [],
    hr: 84,
    temp: 37.2,
    bp: '118/75',
    waitDisplay: null,
    completedAt: null,
    status: 'in-consultation',
  },
  {
    id: 'q3',
    initials: 'NA',
    avatarBg: '#EF4444',
    name: 'Ngozi Adeyemi',
    mrn: 'MRN-2024-00512',
    meta: '23y Female · Law',
    complaint: 'Chest pain and difficulty breathing — sudden onset',
    allergies: ['Aspirin', 'Codeine'],
    hr: 118,
    temp: 37.8,
    bp: '158/102',
    waitDisplay: '12 min',
    completedAt: null,
    status: 'emergency',
  },
  {
    id: 'q4',
    initials: 'IM',
    avatarBg: '#0098CC',
    name: 'Ibrahim Musa',
    mrn: 'MRN-2024-00301',
    meta: '20y Male · Natural Sciences',
    complaint: 'Routine checkup and malaria prophylaxis refill',
    allergies: [],
    hr: 72,
    temp: 36.8,
    bp: '116/72',
    waitDisplay: null,
    completedAt: '09:45',
    status: 'completed',
  },
  {
    id: 'q5',
    initials: 'CO',
    avatarBg: '#25464D',
    name: 'Chinwe Okafor',
    mrn: 'MRN-2024-00467',
    meta: '22y Female · Medicine & Surgery',
    complaint: 'Diffuse skin rash and itching for 5 days',
    allergies: ['Latex'],
    hr: 76,
    temp: 37.0,
    bp: '110/70',
    waitDisplay: '31 min',
    completedAt: null,
    status: 'waiting',
  },
  {
    id: 'q6',
    initials: 'DO',
    avatarBg: '#F59E0B',
    name: 'David Osei',
    mrn: 'MRN-2024-00398',
    meta: '24y Male · Environmental Sciences',
    complaint: 'Severe throbbing headache, photophobia, neck stiffness',
    allergies: ['Tetracycline'],
    hr: 104,
    temp: 39.1,
    bp: '140/90',
    waitDisplay: '58 min',
    completedAt: null,
    status: 'waiting',
  },
  {
    id: 'q7',
    initials: 'AN',
    avatarBg: '#00B4D8',
    name: 'Amaka Nwosu',
    mrn: 'MRN-2024-00489',
    meta: '21y Female · Education',
    complaint: 'Irregular menstrual cycle and pelvic pain',
    allergies: ['NSAIDs'],
    hr: 80,
    temp: 37.1,
    bp: '108/68',
    waitDisplay: null,
    completedAt: null,
    status: 'in-consultation',
  },
  {
    id: 'q8',
    initials: 'BA',
    avatarBg: '#0098CC',
    name: 'Babatunde Alade',
    mrn: 'MRN-2024-00356',
    meta: '20y Male · Business Administration',
    complaint: 'Follow-up for treated malaria — feeling better',
    allergies: [],
    hr: 78,
    temp: 36.9,
    bp: '120/78',
    waitDisplay: null,
    completedAt: '10:20',
    status: 'completed',
  },
];

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

// ── Tab → status mapping ──────────────────────────────────────────────────────

const TAB_STATUS_MAP: Partial<Record<string, PatientStatus>> = {
  waiting: 'waiting',
  'in-consultation': 'in-consultation',
  completed: 'completed',
  emergency: 'emergency',
};

function getTabCount(tabId: string): number {
  if (tabId === 'all') return MOCK_QUEUE.length;
  const status = TAB_STATUS_MAP[tabId];
  if (!status) return 0;
  return MOCK_QUEUE.filter((p) => p.status === status).length;
}

// ── Column definitions (header + body share these widths) ─────────────────────

const COLS = [
  { key: 'patient', label: 'Patient', width: 'w-[21%]', headerPad: 'pl-5 pr-3' },
  { key: 'complaint', label: 'Chief Complaint', width: 'w-[26%]', headerPad: 'pr-4' },
  { key: 'vitals', label: 'Vitals', width: 'w-[13%]', headerPad: 'pr-4' },
  { key: 'wait', label: 'Wait Time', width: 'w-[12%]', headerPad: 'pr-4' },
  { key: 'status', label: 'Status', width: 'w-[13%]', headerPad: 'pr-4' },
  { key: 'actions', label: 'Actions', width: 'w-[15%]', headerPad: 'pr-4' },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EncountersPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const filteredQueue = MOCK_QUEUE.filter((patient) => {
    if (activeTab !== 'all') {
      const status = TAB_STATUS_MAP[activeTab];
      if (!status || patient.status !== status) return false;
    }
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

  return (
    <div className="px-12 pt-10 pb-24">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display text-2xl leading-8 font-semibold"
            style={{ color: '#2F3A40' }}
          >
            Patient Queue
          </h1>
          <p className="mt-0.5 text-base leading-6" style={{ color: '#2F3A40' }}>
            {formatQueueDate()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-10 items-center gap-1.5 rounded-[8px] px-3 text-base leading-6 font-medium transition-colors hover:bg-gray-50"
            style={{ background: '#FFFFFF', border: '1px solid #0064821F', color: '#2F3A40' }}
          >
            <ListFilter style={{ width: 16, height: 16, color: '#00B4D8' }} />
            Filter
          </button>
          <button
            type="button"
            className="flex h-10 items-center gap-1.5 rounded-[8px] px-3 text-base leading-6 font-medium transition-colors hover:bg-gray-50"
            style={{ background: '#FFFFFF', border: '1px solid #0064821F', color: '#2F3A40' }}
          >
            <Download style={{ width: 16, height: 16, color: '#00B4D8' }} />
            Export
          </button>
        </div>
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <div className="relative mt-14">
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
        className="mt-8 flex flex-wrap items-center gap-1 rounded-[12px] p-1"
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
                className="inline-flex items-center justify-center rounded-full text-xs leading-[18px] font-bold"
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

      {/* ── Patient table ────────────────────────────────────────────────── */}
      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Table header */}
          <div
            className="flex"
            style={{ background: 'rgba(226,237,241,0.4)', borderBottom: '1px solid #E6F8FD' }}
          >
            {COLS.map((col) => (
              <div key={col.key} className={`${col.width} ${col.headerPad} py-2`}>
                <span
                  className="text-xs leading-[18px] font-bold uppercase"
                  style={{ color: '#25464D' }}
                >
                  {col.label}
                </span>
              </div>
            ))}
          </div>

          {/* Table rows */}
          {filteredQueue.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-base leading-6" style={{ color: '#8A98A3' }}>
                No patients match this filter.
              </p>
            </div>
          ) : (
            filteredQueue.map((patient, idx) => {
              const cfg = STATUS_CFG[patient.status];
              const isLast = idx === filteredQueue.length - 1;

              return (
                <div
                  key={patient.id}
                  className="flex min-h-[95px] items-center bg-white"
                  style={{
                    borderLeft: `3px solid ${cfg.borderLeft}`,
                    borderBottom: isLast ? undefined : '1px solid rgba(0,100,130,0.06)',
                  }}
                >
                  {/* ── PATIENT ── */}
                  <div className="flex w-[21%] items-start gap-3 py-4 pr-3 pl-3">
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

                  {/* ── CHIEF COMPLAINT ── */}
                  <div className="w-[26%] py-4 pr-4">
                    <p className="text-base leading-6" style={{ color: '#2F3A40' }}>
                      {patient.complaint}
                    </p>
                    {patient.allergies.length > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        <AlertTriangle
                          className="shrink-0"
                          style={{ width: 13, height: 13, color: '#F59E0B' }}
                        />
                        <p className="text-sm leading-5.5">
                          <span style={{ color: '#EF4444' }}>ALLERGY: </span>
                          <span style={{ color: '#00B4D8' }}>{patient.allergies.join(', ')}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── VITALS ── */}
                  <div className="w-[13%] space-y-0.5 py-4 pr-4">
                    <div className="flex items-center gap-1.5">
                      <Heart
                        className="shrink-0"
                        style={{ width: 13, height: 13, fill: '#EF4444', stroke: 'none' }}
                      />
                      <span className="text-sm leading-5.5" style={{ color: '#25464D' }}>
                        {patient.hr} bpm
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Thermometer
                        className="shrink-0"
                        style={{ width: 13, height: 13, color: '#F59E0B' }}
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
                        style={{ width: 13, height: 13, color: '#00B4D8' }}
                      />
                      <span className="text-sm leading-5.5" style={{ color: '#25464D' }}>
                        {patient.bp} mmHg
                      </span>
                    </div>
                  </div>

                  {/* ── WAIT TIME ── */}
                  <div className="w-[12%] py-4 pr-4">
                    {patient.completedAt !== null ? (
                      <div className="flex items-start gap-1.5">
                        <Clock
                          className="mt-[3px] shrink-0"
                          style={{ width: 14, height: 14, color: '#8A98A3' }}
                        />
                        <div>
                          <p className="text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                            Completed
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
                  <div className="w-[13%] py-4 pr-4">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-sm leading-5.5 font-medium"
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
                  <div className="flex w-[15%] items-center gap-1.5 py-4 pr-4">
                    <button
                      type="button"
                      className="flex shrink-0 items-center justify-center rounded-[8px] transition-opacity hover:opacity-75"
                      style={{ width: 26, height: 28, background: '#E2EDF1' }}
                      aria-label={`View details for ${patient.name}`}
                    >
                      <Eye style={{ width: 14, height: 14, color: '#4A7080' }} />
                    </button>
                    <button
                      type="button"
                      disabled={patient.status === 'completed'}
                      className="shrink-0 rounded-[8px] px-3 py-1.5 text-center text-sm leading-5.5 font-medium text-white transition-opacity disabled:cursor-default"
                      style={{
                        width: 115,
                        height: 56,
                        background: patient.status === 'completed' ? '#9CA3AF' : '#00B4D8',
                      }}
                    >
                      Start Consultation
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
