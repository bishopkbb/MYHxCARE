'use client';

import {
  Activity,
  Download,
  FileText,
  ListFilter,
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

type FilterState = {
  gender: 'all' | 'male' | 'female';
  status: 'all' | 'active' | 'inactive';
};

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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    gender: 'all',
    status: 'all',
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

  const activeFilterCount = [activeFilters.gender !== 'all', activeFilters.status !== 'all'].filter(
    Boolean,
  ).length;

  // CSV export — rows will be populated when the patient table section is built
  const exportCSV = () => {
    const headers = ['Name', 'MRN', 'Gender', 'Age', 'Status', 'Assigned Doctor', 'Last Visit'];
    const rows: string[][] = []; // will be replaced with filtered patient data
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

  return (
    <div className="px-4 pt-6 pb-24 sm:px-6 lg:px-12 lg:pt-10">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-y-3 sm:items-center">
        <div>
          <h1
            className="font-display text-2xl leading-8 font-semibold"
            style={{ color: '#2F3A40' }}
          >
            Patient
          </h1>
          <p className="mt-1 text-sm leading-5.5" style={{ color: '#2F3A40' }}>
            View and manage patients under your care.
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
                      onClick={() => setActiveFilters({ gender: 'all', status: 'all' })}
                      className="text-sm font-medium"
                      style={{ color: '#00B4D8' }}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Gender */}
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

                {/* Status */}
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

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      {/*
        Grid breakpoints:
          default → 1 col   (mobile)
          sm      → 2 cols  (640 px+)
          lg      → 3 cols  (1024 px+)
          2xl     → 5 cols  (1536 px+ — ~219 px/card with sidebar + padding)
        xl skipped: 904 px content / 5 cols = ~168 px/card, too narrow for
        "Assigned Patients" title + icon without wrapping.
      */}
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
              {/* Title row: label left, icon right */}
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

              {/* Count — Outfit Black 30 / 36, accent colour */}
              <p
                className="font-display mt-1.5 text-[30px] leading-9 font-black"
                style={{ color: card.accent }}
              >
                {card.count}
              </p>

              {/* Sub-label — DM Sans Regular 14 / 22, muted */}
              <p className="mt-1 text-sm leading-5.5" style={{ color: '#4A7080' }}>
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div className="relative mt-6">
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
    </div>
  );
}
