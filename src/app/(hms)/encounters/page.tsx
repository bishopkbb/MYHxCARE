'use client';

import { Download, ListFilter, Search } from 'lucide-react';
import { useState } from 'react';

type QueueTab = {
  id: string;
  label: string;
  count: number;
  badgeBg: string;
  badgeColor: string;
};

// Mock tab counts — will be replaced with real API data in Phase 6
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

function formatQueueDate(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const day = now.getDate();
  const year = now.getFullYear();
  return `Today — ${weekday}, ${month} ${day}, ${year}`;
}

export default function EncountersPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  return (
    <div className="px-12 pt-10 pb-24">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {/* Left: title + date */}
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

        {/* Right: Filter + Export */}
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

      {/* ── Search bar ─────────────────────────────────────────────────── */}
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

      {/* ── Quick-filter tab strip ──────────────────────────────────────── */}
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
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
