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
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type QueueTab = {
  id: string;
  label: string;
  count: number;
  badgeBg: string;
  badgeColor: string;
};

type PatientStatus =
  | 'waiting'
  | 'in-consultation'
  | 'emergency'
  | 'completed'
  | 'follow-up'
  | 'new-admissions'
  | 'discharged'
  | 'under-observation';

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
  // ── Follow-up Needed ──────────────────────────────────────────────────────
  {
    id: 'q9',
    initials: 'EO',
    avatarBg: '#3B82F6',
    name: 'Emeka Obi',
    mrn: 'MRN-2024-00521',
    meta: '22y Male · Pharmacy',
    complaint: 'Follow-up for hypertension — BP monitoring review',
    allergies: [],
    hr: 78,
    temp: 36.9,
    bp: '128/82',
    waitDisplay: '15 min',
    completedAt: null,
    status: 'follow-up' as const,
  },
  {
    id: 'q10',
    initials: 'KA',
    avatarBg: '#EC4899',
    name: 'Kemi Adebayo',
    mrn: 'MRN-2024-00563',
    meta: '20y Female · Mass Communication',
    complaint: 'Follow-up post-UTI treatment — repeat urinalysis due',
    allergies: ['Sulfonamides'],
    hr: 72,
    temp: 36.7,
    bp: '110/68',
    waitDisplay: '22 min',
    completedAt: null,
    status: 'follow-up' as const,
  },
  {
    id: 'q11',
    initials: 'TO',
    avatarBg: '#22C55E',
    name: 'Tolu Ogundimu',
    mrn: 'MRN-2024-00478',
    meta: '23y Male · Agriculture',
    complaint: 'Follow-up wound check — laceration from lab accident',
    allergies: ['Iodine'],
    hr: 76,
    temp: 36.8,
    bp: '120/76',
    waitDisplay: '38 min',
    completedAt: null,
    status: 'follow-up' as const,
  },
  {
    id: 'q12',
    initials: 'BN',
    avatarBg: '#8B5CF6',
    name: 'Blessing Nkwuocha',
    mrn: 'MRN-2024-00534',
    meta: '21y Female · Economics',
    complaint: 'Follow-up for anaemia — repeat FBC and iron panel',
    allergies: [],
    hr: 88,
    temp: 37.0,
    bp: '104/64',
    waitDisplay: '51 min',
    completedAt: null,
    status: 'follow-up' as const,
  },
  // ── New Admissions ────────────────────────────────────────────────────────
  {
    id: 'q13',
    initials: 'IE',
    avatarBg: '#F97316',
    name: 'Ifeanyi Eze',
    mrn: 'MRN-2024-00592',
    meta: '20y Male · Computer Science',
    complaint: 'Suspected typhoid — high fever, abdominal pain, rose spots',
    allergies: ['Penicillin'],
    hr: 102,
    temp: 39.3,
    bp: '108/70',
    waitDisplay: '5 min',
    completedAt: null,
    status: 'new-admissions' as const,
  },
  {
    id: 'q14',
    initials: 'GO',
    avatarBg: '#14B8A6',
    name: 'Grace Okafor',
    mrn: 'MRN-2024-00607',
    meta: '22y Female · Nursing Science',
    complaint: 'Severe dehydration — vomiting and diarrhoea for 48 hours',
    allergies: [],
    hr: 114,
    temp: 37.4,
    bp: '98/60',
    waitDisplay: '8 min',
    completedAt: null,
    status: 'new-admissions' as const,
  },
  {
    id: 'q15',
    initials: 'SA',
    avatarBg: '#6366F1',
    name: 'Segun Adeleke',
    mrn: 'MRN-2024-00614',
    meta: '21y Male · Engineering',
    complaint: 'Suspected appendicitis — right iliac fossa pain, guarding',
    allergies: ['NSAIDs'],
    hr: 108,
    temp: 38.2,
    bp: '126/82',
    waitDisplay: '3 min',
    completedAt: null,
    status: 'new-admissions' as const,
  },
  {
    id: 'q16',
    initials: 'FH',
    avatarBg: '#A855F7',
    name: 'Fatima Hassan',
    mrn: 'MRN-2024-00628',
    meta: '19y Female · Medicine & Surgery',
    complaint: 'Severe iron-deficiency anaemia — pallor, fatigue, dyspnoea',
    allergies: [],
    hr: 110,
    temp: 36.9,
    bp: '100/62',
    waitDisplay: '11 min',
    completedAt: null,
    status: 'new-admissions' as const,
  },
  {
    id: 'q17',
    initials: 'PO',
    avatarBg: '#0EA5E9',
    name: 'Pius Onwuka',
    mrn: 'MRN-2024-00635',
    meta: '24y Male · Architecture',
    complaint: 'Severe headache, neck stiffness, photophobia — query meningitis',
    allergies: ['Sulfonamides', 'Penicillin'],
    hr: 116,
    temp: 39.6,
    bp: '144/94',
    waitDisplay: '2 min',
    completedAt: null,
    status: 'new-admissions' as const,
  },
  // ── Discharged ────────────────────────────────────────────────────────────
  {
    id: 'q18',
    initials: 'CN',
    avatarBg: '#22C55E',
    name: 'Chisom Nwosu',
    mrn: 'MRN-2024-00234',
    meta: '21y Female · Education',
    complaint: 'Malaria — fully treated, fever resolved, appetite restored',
    allergies: [],
    hr: 70,
    temp: 36.5,
    bp: '112/72',
    waitDisplay: null,
    completedAt: '07:30',
    status: 'discharged' as const,
  },
  {
    id: 'q19',
    initials: 'AG',
    avatarBg: '#D97706',
    name: 'Abdullahi Garba',
    mrn: 'MRN-2024-00267',
    meta: '22y Male · Political Science',
    complaint: 'Wound care and dressing — healed laceration on right hand',
    allergies: ['Iodine'],
    hr: 74,
    temp: 36.6,
    bp: '118/76',
    waitDisplay: null,
    completedAt: '08:15',
    status: 'discharged' as const,
  },
  {
    id: 'q20',
    initials: 'NE',
    avatarBg: '#EF4444',
    name: 'Ngozi Eke',
    mrn: 'MRN-2024-00298',
    meta: '20y Female · Biochemistry',
    complaint: 'Post-appendectomy recovery — pain controlled, wound clean',
    allergies: ['Codeine'],
    hr: 68,
    temp: 36.4,
    bp: '108/68',
    waitDisplay: null,
    completedAt: '08:50',
    status: 'discharged' as const,
  },
  {
    id: 'q21',
    initials: 'SO',
    avatarBg: '#3B82F6',
    name: 'Samuel Oladele',
    mrn: 'MRN-2024-00315',
    meta: '23y Male · Law',
    complaint: 'Viral fever — resolved after supportive treatment and rest',
    allergies: [],
    hr: 72,
    temp: 36.7,
    bp: '116/74',
    waitDisplay: null,
    completedAt: '09:10',
    status: 'discharged' as const,
  },
  {
    id: 'q22',
    initials: 'AO',
    avatarBg: '#F59E0B',
    name: 'Adaora Obiechina',
    mrn: 'MRN-2024-00322',
    meta: '22y Female · Statistics',
    complaint: 'UTI treatment complete — symptoms resolved, course finished',
    allergies: ['Sulfonamides'],
    hr: 76,
    temp: 36.6,
    bp: '110/70',
    waitDisplay: null,
    completedAt: '09:35',
    status: 'discharged' as const,
  },
  {
    id: 'q23',
    initials: 'MA',
    avatarBg: '#6B7280',
    name: 'Musa Aliyu',
    mrn: 'MRN-2024-00348',
    meta: '25y Male · Mechanical Engineering',
    complaint: 'Orthopaedic consultation — ankle sprain assessed, physio referral given',
    allergies: [],
    hr: 78,
    temp: 36.8,
    bp: '122/78',
    waitDisplay: null,
    completedAt: '10:05',
    status: 'discharged' as const,
  },
  // ── Under Observation ─────────────────────────────────────────────────────
  {
    id: 'q24',
    initials: 'ZB',
    avatarBg: '#8B5CF6',
    name: 'Zainab Bello',
    mrn: 'MRN-2024-00571',
    meta: '20y Female · Microbiology',
    complaint: 'Suspected typhoid — awaiting Widal test results, on IV fluids',
    allergies: ['Penicillin'],
    hr: 96,
    temp: 38.4,
    bp: '114/72',
    waitDisplay: null,
    completedAt: null,
    status: 'under-observation' as const,
  },
  {
    id: 'q25',
    initials: 'CK',
    avatarBg: '#0098CC',
    name: 'Chidi Okeke',
    mrn: 'MRN-2024-00584',
    meta: '23y Male · Physics',
    complaint: 'Post-procedure monitoring — minor excision, vitals stable',
    allergies: [],
    hr: 82,
    temp: 37.3,
    bp: '120/80',
    waitDisplay: null,
    completedAt: null,
    status: 'under-observation' as const,
  },
  {
    id: 'q26',
    initials: 'NN',
    avatarBg: '#F97316',
    name: 'Nkechi Nnaji',
    mrn: 'MRN-2024-00598',
    meta: '22y Female · Food Science',
    complaint: 'Allergic reaction — generalised urticaria, responding to antihistamines',
    allergies: ['NSAIDs', 'Latex'],
    hr: 92,
    temp: 37.6,
    bp: '126/80',
    waitDisplay: null,
    completedAt: null,
    status: 'under-observation' as const,
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
  'follow-up': 'follow-up',
  'new-admissions': 'new-admissions',
  discharged: 'discharged',
  'under-observation': 'under-observation',
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    gender: 'all',
    allergies: 'all',
  });
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
  };

  const exportPDF = () => window.print();

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
                  className="inline-flex items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ width: 18, height: 18, background: '#00B4D8' }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div
                className="absolute top-full right-0 z-20 mt-2 w-72 rounded-[12px] bg-white p-4"
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
                  <p className="mb-2 text-xs font-bold uppercase" style={{ color: '#4A7080' }}>
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
                  <p className="mb-2 text-xs font-bold uppercase" style={{ color: '#4A7080' }}>
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
                className="absolute top-full right-0 z-20 mt-2 w-52 overflow-hidden rounded-[12px] bg-white py-1.5"
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
                  <FileText style={{ width: 15, height: 15, color: '#00B4D8' }} />
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
                  <Printer style={{ width: 15, height: 15, color: '#00B4D8' }} />
                  Export as PDF
                </button>
              </div>
            )}
          </div>
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
