'use client';

import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  FileText,
  FlaskConical,
  ListFilter,
  LogOut,
  MoreVertical,
  Printer,
  Search,
  Share2,
  Stethoscope,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

type PatientStatCard = {
  title: string;
  icon: LucideIcon;
  count: string;
  label: string;
  accent: string;
  iconBg: string;
};

type PatientRecordStatus = 'admitted' | 'active' | 'follow-up' | 'referred' | 'discharged';

type PatientRecord = {
  id: string;
  initials: string;
  avatarBg: string;
  name: string;
  mrn: string;
  meta: string;
  complaint: string;
  allergies: string[];
  lastVisitDate: string;
  lastVisitTime: string;
  nextApptDate: string;
  nextApptTime: string;
  status: PatientRecordStatus;
  faculty: string;
};

type StatusCfg = {
  label: string;
  borderLeft: string;
  pillBorder: string;
  pillColor: string;
  pillBg: string;
};

type PanelFilterState = {
  gender: 'all' | 'male' | 'female';
  status: 'all' | 'active' | 'inactive';
};

type QuickFilters = {
  patientType: 'all' | 'assigned';
  status: 'all' | PatientRecordStatus;
  lastVisit: 'anytime' | 'today' | 'this-week' | 'this-month';
  faculty: string;
};

type QuickFilterDef = {
  key: keyof QuickFilters;
  getLabel: (qf: QuickFilters) => string;
  options: { value: string; label: string }[];
  alignRight?: boolean;
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PatientRecordStatus, StatusCfg> = {
  admitted: {
    label: 'Admitted',
    borderLeft: '#EF4444',
    pillBorder: '#EF4444',
    pillColor: '#EF4444',
    pillBg: 'transparent',
  },
  active: {
    label: 'Active',
    borderLeft: '#22C55E',
    pillBorder: '#22C55E',
    pillColor: '#22C55E',
    pillBg: 'transparent',
  },
  'follow-up': {
    label: 'Follow up',
    borderLeft: '#F59E0B',
    pillBorder: '#F59E0B',
    pillColor: '#F59E0B',
    pillBg: 'transparent',
  },
  referred: {
    label: 'Referred',
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
};

// ── Quick-filter definitions ──────────────────────────────────────────────────

const QUICK_DEFAULTS: QuickFilters = {
  patientType: 'all',
  status: 'all',
  lastVisit: 'anytime',
  faculty: 'all',
};

const QUICK_FILTER_DEFS: QuickFilterDef[] = [
  {
    key: 'patientType',
    getLabel: (qf) => (qf.patientType === 'assigned' ? 'Assigned to Me' : 'All Patients'),
    options: [
      { value: 'all', label: 'All Patients' },
      { value: 'assigned', label: 'Assigned to Me' },
    ],
  },
  {
    key: 'status',
    getLabel: (qf) =>
      qf.status === 'all'
        ? 'Status: All'
        : `Status: ${STATUS_CFG[qf.status as PatientRecordStatus]?.label ?? ''}`,
    options: [
      { value: 'all', label: 'All' },
      { value: 'admitted', label: 'Admitted' },
      { value: 'active', label: 'Active' },
      { value: 'follow-up', label: 'Follow up' },
      { value: 'referred', label: 'Referred' },
      { value: 'discharged', label: 'Discharged' },
    ],
  },
  {
    key: 'lastVisit',
    getLabel: (qf) => {
      const map: Record<string, string> = {
        anytime: 'Anytime',
        today: 'Today',
        'this-week': 'This Week',
        'this-month': 'This Month',
      };
      return `Last Visit: ${map[qf.lastVisit] ?? 'Anytime'}`;
    },
    options: [
      { value: 'anytime', label: 'Anytime' },
      { value: 'today', label: 'Today' },
      { value: 'this-week', label: 'This Week' },
      { value: 'this-month', label: 'This Month' },
    ],
  },
  {
    key: 'faculty',
    getLabel: (qf) => (qf.faculty === 'all' ? 'Faculty/Department: All' : `Faculty: ${qf.faculty}`),
    options: [
      { value: 'all', label: 'All Departments' },
      { value: 'Medicine & Surgery', label: 'Medicine & Surgery' },
      { value: 'Engineering', label: 'Engineering' },
      { value: 'Law', label: 'Law' },
      { value: 'Natural Sciences', label: 'Natural Sciences' },
      { value: 'Education', label: 'Education' },
      { value: 'Business Administration', label: 'Business Administration' },
      { value: 'Computer Science', label: 'Computer Science' },
      { value: 'Microbiology', label: 'Microbiology' },
    ],
    alignRight: true,
  },
];

// ── Doctor action menu ────────────────────────────────────────────────────────

const DOCTOR_ACTIONS: {
  key: string;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  hideFor?: PatientRecordStatus[];
}[] = [
  { key: 'view', label: 'View Patient Record', icon: Eye },
  { key: 'consult', label: 'Start Consultation', icon: Stethoscope, hideFor: ['discharged'] },
  { key: 'note', label: 'Add Clinical Note', icon: FileText },
  { key: 'lab', label: 'Request Lab Test', icon: FlaskConical, hideFor: ['discharged'] },
  { key: 'rx', label: 'Write Prescription', icon: ClipboardList, hideFor: ['discharged'] },
  { key: 'refer', label: 'Refer Patient', icon: Share2, hideFor: ['referred', 'discharged'] },
  {
    key: 'discharge',
    label: 'Discharge Patient',
    icon: LogOut,
    danger: true,
    hideFor: ['discharged'],
  },
];

// ── Mock data — will be replaced with real API data in Phase 6 ────────────────

const PATIENT_STAT_CARDS: PatientStatCard[] = [
  {
    title: 'Total Patients',
    icon: Users,
    count: '1,240',
    label: 'All time',
    accent: '#0098CC',
    iconBg: 'rgba(0,152,204,0.1)',
  },
  {
    title: 'Active Patients',
    icon: Stethoscope,
    count: '890',
    label: 'Under your care',
    accent: '#22C55E',
    iconBg: 'rgba(34,197,94,0.1)',
  },
  {
    title: 'Assigned Patients',
    icon: Stethoscope,
    count: '4',
    label: 'This week',
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.1)',
  },
  {
    title: 'Emergency',
    icon: Activity,
    count: '3',
    label: 'Chronic Care',
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.1)',
  },
  {
    title: 'Active Referrals',
    icon: Share2,
    count: '3',
    label: '2 awaiting response',
    accent: '#3B82F6',
    iconBg: 'rgba(59,130,246,0.1)',
  },
];

const MOCK_PATIENTS: PatientRecord[] = [
  {
    id: 'p1',
    initials: 'AO',
    avatarBg: '#EF4444',
    name: 'Adaeze Okonkwo',
    mrn: 'MRN-2024-00451',
    meta: '21y Female · Medicine & Surgery',
    complaint: 'Persistent headache and fever for 3 days',
    allergies: ['Penicillin', 'Sulfonamides'],
    lastVisitDate: 'Jun 28, 2026',
    lastVisitTime: '09:15am',
    nextApptDate: 'Jul 12, 2026',
    nextApptTime: '10:00am',
    status: 'admitted',
    faculty: 'Medicine & Surgery',
  },
  {
    id: 'p2',
    initials: 'IE',
    avatarBg: '#EF4444',
    name: 'Ifeanyi Eze',
    mrn: 'MRN-2024-00592',
    meta: '20y Male · Computer Science',
    complaint: 'Suspected typhoid — high fever, abdominal pain, rose spots',
    allergies: ['Penicillin'],
    lastVisitDate: 'Jun 28, 2026',
    lastVisitTime: '09:15am',
    nextApptDate: 'Jul 14, 2026',
    nextApptTime: '09:00am',
    status: 'admitted',
    faculty: 'Computer Science',
  },
  {
    id: 'p3',
    initials: 'NA',
    avatarBg: '#22C55E',
    name: 'Ngozi Adeyemi',
    mrn: 'MRN-2024-00512',
    meta: '23y Female · Law',
    complaint: 'Diffuse skin rash and itching for 5 days',
    allergies: ['Penicillin', 'Sulfonamides'],
    lastVisitDate: 'Jun 28, 2026',
    lastVisitTime: '09:15am',
    nextApptDate: 'Jul 15, 2026',
    nextApptTime: '11:00am',
    status: 'active',
    faculty: 'Law',
  },
  {
    id: 'p4',
    initials: 'BA',
    avatarBg: '#F59E0B',
    name: 'Babatunde Alade',
    mrn: 'MRN-2024-00356',
    meta: '20y Male · Business Administration',
    complaint: 'Follow-up for treated malaria — monitoring recovery',
    allergies: [],
    lastVisitDate: 'Jun 28, 2026',
    lastVisitTime: '09:15am',
    nextApptDate: 'Jul 12, 2026',
    nextApptTime: '10:00am',
    status: 'follow-up',
    faculty: 'Business Administration',
  },
  {
    id: 'p5',
    initials: 'ZB',
    avatarBg: '#3B82F6',
    name: 'Zainab Bello',
    mrn: 'MRN-2024-00571',
    meta: '20y Female · Microbiology',
    complaint: 'Suspected typhoid — awaiting Widal test results, on IV fluids',
    allergies: ['Penicillin'],
    lastVisitDate: 'Jun 28, 2026',
    lastVisitTime: '09:15am',
    nextApptDate: 'Jul 12, 2026',
    nextApptTime: '10:00am',
    status: 'referred',
    faculty: 'Microbiology',
  },
  {
    id: 'p6',
    initials: 'SA',
    avatarBg: '#3B82F6',
    name: 'Segun Adeleke',
    mrn: 'MRN-2024-00614',
    meta: '21y Male · Engineering',
    complaint: 'Orthopaedic referral — post-appendicitis follow-up',
    allergies: ['NSAIDs'],
    lastVisitDate: 'Jun 28, 2026',
    lastVisitTime: '09:15am',
    nextApptDate: 'Jul 18, 2026',
    nextApptTime: '02:30pm',
    status: 'referred',
    faculty: 'Engineering',
  },
  {
    id: 'p7',
    initials: 'CN',
    avatarBg: '#6B7280',
    name: 'Chisom Nwosu',
    mrn: 'MRN-2024-00234',
    meta: '21y Female · Education',
    complaint: 'Malaria — fully treated, fever resolved, appetite restored',
    allergies: ['Penicillin', 'Sulfonamides'],
    lastVisitDate: 'Jun 28, 2026',
    lastVisitTime: '09:15am',
    nextApptDate: 'Jul 12, 2026',
    nextApptTime: '10:00am',
    status: 'discharged',
    faculty: 'Education',
  },
];

// ── Table column definitions ──────────────────────────────────────────────────

const COLS = [
  { key: 'patient', label: 'Patient', width: 'w-[26%]', headPad: 'pl-5 pr-3' },
  { key: 'complaint', label: 'Chief Complaint', width: 'w-[26%]', headPad: 'pr-4' },
  { key: 'lastVisit', label: 'Last Visit', width: 'w-[12%]', headPad: 'pr-4' },
  { key: 'status', label: 'Status', width: 'w-[12%]', headPad: 'pr-4' },
  { key: 'nextAppt', label: 'Next Appointment', width: 'w-[16%]', headPad: 'pr-4' },
  { key: 'actions', label: 'Actions', width: 'w-[8%]', headPad: 'pr-4' },
] as const;

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<PanelFilterState>({
    gender: 'all',
    status: 'all',
  });
  const [quickFilters, setQuickFilters] = useState<QuickFilters>(QUICK_DEFAULTS);
  const [openDropdown, setOpenDropdown] = useState<keyof QuickFilters | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const quickFilterRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
      if (quickFilterRef.current && !quickFilterRef.current.contains(e.target as Node))
        setOpenDropdown(null);
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node))
        setActionMenuId(null);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const activeFilterCount = [activeFilters.gender !== 'all', activeFilters.status !== 'all'].filter(
    Boolean,
  ).length;

  const hasActiveQuickFilters = (Object.keys(QUICK_DEFAULTS) as (keyof QuickFilters)[]).some(
    (k) => quickFilters[k] !== QUICK_DEFAULTS[k],
  );

  // ── Filtered patients ─────────────────────────────────────────────────────

  const filteredPatients = MOCK_PATIENTS.filter((p) => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.mrn.toLowerCase().includes(q) &&
        !p.complaint.toLowerCase().includes(q)
      )
        return false;
    }
    if (activeFilters.gender !== 'all') {
      const isFemale = p.meta.toLowerCase().includes('female');
      if (activeFilters.gender === 'female' && !isFemale) return false;
      if (activeFilters.gender === 'male' && isFemale) return false;
    }
    if (activeFilters.status !== 'all') {
      const isActive = ['active', 'admitted', 'follow-up', 'referred'].includes(p.status);
      if (activeFilters.status === 'active' && !isActive) return false;
      if (activeFilters.status === 'inactive' && isActive) return false;
    }
    if (quickFilters.patientType === 'assigned' && !['p1', 'p2', 'p3', 'p4'].includes(p.id))
      return false;
    if (quickFilters.status !== 'all' && p.status !== quickFilters.status) return false;
    if (quickFilters.faculty !== 'all' && p.faculty !== quickFilters.faculty) return false;
    return true;
  });

  // ── Exports ───────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = [
      'Name',
      'MRN',
      'Gender',
      'Details',
      'Status',
      'Last Visit',
      'Next Appointment',
      'Allergies',
    ];
    const rows = filteredPatients.map((p) => [
      p.name,
      p.mrn,
      p.meta.includes('Female') ? 'Female' : 'Male',
      p.meta,
      STATUS_CFG[p.status].label,
      `${p.lastVisitDate} ${p.lastVisitTime}`,
      `${p.nextApptDate} ${p.nextApptTime}`,
      p.allergies.join('; '),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => window.print();

  function setQuickFilter(key: keyof QuickFilters, value: string) {
    setQuickFilters((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  }

  function clearQuickFilters() {
    setQuickFilters(QUICK_DEFAULTS);
    setOpenDropdown(null);
  }

  return (
    <div className="px-4 pt-6 pb-24 sm:px-6 lg:px-12 lg:pt-10">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display text-2xl leading-8 font-semibold" style={{ color: '#2F3A40' }}>
          Patient
        </h1>
        <p className="mt-1 text-sm leading-5.5" style={{ color: '#2F3A40' }}>
          View and manage patients under your care.
        </p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {PATIENT_STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="flex flex-col rounded-[12px] p-4"
              style={{
                background: '#FFFFFF',
                border: `1px solid ${card.accent}`,
                borderTopWidth: '3px',
                boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.05)',
              }}
            >
              <div className="flex items-start justify-between">
                <p className="text-base leading-6 font-semibold" style={{ color: '#25464D' }}>
                  {card.title}
                </p>
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-[12px]"
                  style={{ background: card.iconBg }}
                >
                  <Icon style={{ width: 24, height: 24, color: card.accent }} />
                </div>
              </div>
              <p
                className="font-display mt-1.5 text-[30px] leading-9 font-black"
                style={{ color: card.accent }}
              >
                {card.count}
              </p>
              <p className="mt-1 text-sm leading-5.5" style={{ color: '#4A7080' }}>
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Search + controls row ──────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* Search — grows to fill */}
        <div className="relative w-full min-w-0 sm:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-[10px] -translate-y-1/2"
            style={{ width: 16, height: 16, color: '#8A98A3' }}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, MRN, or diagnosis..."
            className="h-[42px] w-full rounded-[12px] pr-4 pl-9 text-base leading-6 outline-none placeholder:text-[#8A98A3] focus:ring-2 focus:ring-[#0098CC]/30"
            style={{ background: '#FFFFFF', border: '1px solid #0064821F', color: '#2F3A40' }}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* ── Filter panel ──────────────────────────────────────────── */}
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
                      onClick={() => setActiveFilters({ gender: 'all', status: 'all' })}
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
                    Status
                  </p>
                  <div className="flex gap-1.5">
                    {(['all', 'active', 'inactive'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setActiveFilters((prev) => ({ ...prev, status: s }))}
                        className="flex-1 rounded-[8px] py-1.5 text-sm font-medium capitalize transition-colors"
                        style={{
                          background:
                            activeFilters.status === s ? '#00B4D8' : 'rgba(0,100,130,0.06)',
                          color: activeFilters.status === s ? '#FFFFFF' : '#4A7080',
                        }}
                      >
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Export menu ───────────────────────────────────────────── */}
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

      {/* ── Quick-filter strip ─────────────────────────────────────────── */}
      {/*
        Figma: outer 974 px (gap 92 px), pill 765 px (bg #E6F8FD,
        border-radius 12px, p 4px), Clear Filter 117 px.
        Each dropdown button: h 36px, bg #FFFFFF, radius 8px, p 6px 12px,
        DM Sans 500 12px/18px #25464D, chevron 24×24.
        Clear Filter: h 40px, 1px solid #00B4D8, DM Sans 500 14px/22px #00B4D8.
      */}
      <div
        ref={quickFilterRef}
        className="mt-4 flex flex-wrap items-center gap-3 lg:flex-nowrap lg:gap-[92px]"
      >
        {/* Dropdown pill container */}
        <div
          className="flex flex-1 flex-wrap items-center gap-3 rounded-[12px] p-1"
          style={{ background: '#E6F8FD' }}
        >
          {QUICK_FILTER_DEFS.map((def) => {
            const isOpen = openDropdown === def.key;
            const isActive = quickFilters[def.key] !== QUICK_DEFAULTS[def.key];
            return (
              <div key={def.key} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(isOpen ? null : def.key)}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] px-3 transition-colors"
                  style={{
                    background: '#FFFFFF',
                    boxShadow:
                      '0px 1px 2px -1px rgba(0,0,0,0.10), 0px 1px 3px 0px rgba(0,0,0,0.10)',
                    border: isOpen ? '1px solid #00B4D8' : '1px solid transparent',
                    color: isActive ? '#00B4D8' : '#25464D',
                  }}
                >
                  <span className="text-xs leading-[18px] font-medium">
                    {def.getLabel(quickFilters)}
                  </span>
                  <ChevronDown
                    style={{
                      width: 14,
                      height: 14,
                      color: isActive ? '#00B4D8' : '#25464D',
                      transition: 'transform 150ms',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {isOpen && (
                  <div
                    className={`absolute top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-[12px] bg-white py-1.5 ${def.alignRight ? 'right-0' : 'left-0'}`}
                    style={{
                      border: '1px solid rgba(0,100,130,0.12)',
                      boxShadow: '0px 4px 16px rgba(0,0,0,0.08)',
                    }}
                  >
                    {def.options.map((opt) => {
                      const selected = (quickFilters[def.key] as string) === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setQuickFilter(def.key, opt.value)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm leading-5.5 transition-colors hover:bg-[#E6F8FD]"
                          style={{
                            color: selected ? '#00B4D8' : '#2F3A40',
                            fontWeight: selected ? 600 : 400,
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Clear Filter button */}
        <button
          type="button"
          onClick={clearQuickFilters}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-[8px] px-3 transition-colors hover:bg-[#E6F8FD]"
          style={{
            background: '#FFFFFF',
            border: '1px solid #00B4D8',
            color: '#00B4D8',
            opacity: hasActiveQuickFilters ? 1 : 0.5,
          }}
        >
          <ListFilter style={{ width: 13, height: 13, color: '#00B4D8' }} />
          <span className="text-sm leading-[22px] font-medium">Clear Filter</span>
        </button>
      </div>

      {/* ── Mobile card view — visible below lg ──────────────────────────── */}
      <div className="mt-6 space-y-3 lg:hidden">
        {filteredPatients.length === 0 ? (
          <div
            className="flex min-h-[180px] items-center justify-center rounded-[12px]"
            style={{ background: 'rgba(226,237,241,0.25)' }}
          >
            <p className="text-base leading-6" style={{ color: '#8A98A3' }}>
              No patients match this filter.
            </p>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const cfg = STATUS_CFG[patient.status];
            return (
              <div
                key={patient.id}
                className="overflow-hidden rounded-[12px] bg-white"
                style={{
                  border: '1px solid rgba(0,100,130,0.08)',
                  borderLeft: `4px solid ${cfg.borderLeft}`,
                  boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {/* Identity + status */}
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
                    className="ml-2 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
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
                        style={{ width: 12, height: 12, color: '#F59E0B' }}
                      />
                      <p className="text-xs leading-5">
                        <span style={{ color: '#EF4444' }}>ALLERGY: </span>
                        <span style={{ color: '#00B4D8' }}>{patient.allergies.join(', ')}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Last visit + next appointment */}
                <div
                  className="flex items-center justify-between border-t px-3 py-2"
                  style={{
                    borderColor: 'rgba(0,100,130,0.06)',
                    background: 'rgba(226,237,241,0.25)',
                  }}
                >
                  <div>
                    <p className="text-xs font-bold uppercase" style={{ color: '#4A7080' }}>
                      Last Visit
                    </p>
                    <p className="text-xs leading-5" style={{ color: '#25464D' }}>
                      {patient.lastVisitDate}
                    </p>
                    <p className="text-xs leading-5" style={{ color: '#4A7080' }}>
                      {patient.lastVisitTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase" style={{ color: '#4A7080' }}>
                      Next Appointment
                    </p>
                    <p className="text-xs leading-5" style={{ color: '#25464D' }}>
                      {patient.nextApptDate}
                    </p>
                    <p className="text-xs leading-5" style={{ color: '#4A7080' }}>
                      {patient.nextApptTime}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-2 border-t px-3 py-2.5"
                  style={{ borderColor: 'rgba(0,100,130,0.06)' }}
                >
                  <button
                    type="button"
                    aria-label={`View ${patient.name}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-opacity hover:opacity-75"
                    style={{ background: '#E2EDF1' }}
                  >
                    <Eye style={{ width: 14, height: 14, color: '#4A7080' }} />
                  </button>
                  {patient.status !== 'discharged' && (
                    <button
                      type="button"
                      className="flex-1 rounded-[8px] py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ background: '#00B4D8' }}
                    >
                      Start Consultation
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop table — visible at lg+ ───────────────────────────────── */}
      <div className="mt-6 hidden overflow-x-auto lg:block">
        <div>
          {/* Table header */}
          <div
            className="flex"
            style={{ background: 'rgba(226,237,241,0.4)', borderBottom: '1px solid #E6F8FD' }}
          >
            {COLS.map((col) => (
              <div key={col.key} className={`${col.width} ${col.headPad} py-2`}>
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
          {filteredPatients.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-base leading-6" style={{ color: '#8A98A3' }}>
                No patients match this filter.
              </p>
            </div>
          ) : (
            filteredPatients.map((patient, idx) => {
              const cfg = STATUS_CFG[patient.status];
              const isLast = idx === filteredPatients.length - 1;

              return (
                <div
                  key={patient.id}
                  className="flex min-h-[95px] items-center bg-white"
                  style={{
                    borderLeft: `3px solid ${cfg.borderLeft}`,
                    borderBottom: isLast ? undefined : `2px solid ${cfg.borderLeft}`,
                  }}
                >
                  {/* ── PATIENT ── */}
                  <div className="flex w-[26%] items-start gap-3 py-4 pr-3 pl-5">
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

                  {/* ── LAST VISIT ── */}
                  <div className="w-[12%] py-4 pr-4 text-center">
                    <p className="text-sm leading-5.5 font-medium" style={{ color: '#25464D' }}>
                      {patient.lastVisitDate}
                    </p>
                    <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                      {patient.lastVisitTime}
                    </p>
                  </div>

                  {/* ── STATUS ── */}
                  <div className="w-[12%] py-4 pr-4">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        border: `1px solid ${cfg.pillBorder}`,
                        color: cfg.pillColor,
                        background: cfg.pillBg,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* ── NEXT APPOINTMENT ── */}
                  <div className="w-[16%] py-4 pr-4 text-center">
                    <p className="text-sm leading-5.5 font-medium" style={{ color: '#25464D' }}>
                      {patient.nextApptDate}
                    </p>
                    <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                      {patient.nextApptTime}
                    </p>
                  </div>

                  {/* ── ACTIONS ── */}
                  <div className="flex w-[8%] items-center gap-2 py-4 pr-4">
                    {/* View record */}
                    <button
                      type="button"
                      aria-label={`View ${patient.name}`}
                      className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-[#E6F8FD]"
                      style={{ color: '#4A7080' }}
                    >
                      <Eye style={{ width: 16, height: 16 }} />
                    </button>

                    {/* Context menu */}
                    <div
                      className="relative"
                      ref={actionMenuId === patient.id ? actionMenuRef : undefined}
                    >
                      <button
                        type="button"
                        aria-label={`More actions for ${patient.name}`}
                        onClick={() =>
                          setActionMenuId((prev) => (prev === patient.id ? null : patient.id))
                        }
                        className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-[#E6F8FD]"
                        style={{ color: '#4A7080' }}
                      >
                        <MoreVertical style={{ width: 16, height: 16 }} />
                      </button>

                      {actionMenuId === patient.id && (
                        <div
                          className="absolute top-full right-0 z-30 mt-1 w-52 overflow-hidden rounded-[12px] bg-white py-1.5"
                          style={{
                            border: '1px solid rgba(0,100,130,0.12)',
                            boxShadow: '0px 4px 16px rgba(0,0,0,0.08)',
                          }}
                        >
                          {DOCTOR_ACTIONS.filter(
                            (action) => !action.hideFor?.includes(patient.status),
                          ).map((action) => {
                            const ActionIcon = action.icon;
                            return (
                              <button
                                key={action.key}
                                type="button"
                                onClick={() => setActionMenuId(null)}
                                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm leading-5.5 transition-colors hover:bg-[#E6F8FD]"
                                style={{ color: action.danger ? '#EF4444' : '#2F3A40' }}
                              >
                                <ActionIcon
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color: action.danger ? '#EF4444' : '#00B4D8',
                                  }}
                                />
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
