'use client';

import { AlertTriangle, Download, FileText, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  MOCK_CLINICAL_NOTES,
  type ClinicalNote,
  type NoteStatus,
  type NoteType,
} from '@/features/clinical-notes/__mocks__/clinicalNoteFixtures';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'all' | NoteType;

type TabCfg = {
  id: TabId;
  label: string;
};

type NoteTypeCfg = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

type StatusCfg = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

// ── Config ────────────────────────────────────────────────────────────────────

const NOTE_TYPE_CFG: Record<NoteType, NoteTypeCfg> = {
  soap: {
    label: 'SOAP Note',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.35)',
    bg: 'rgba(0,180,216,0.08)',
  },
  progress: {
    label: 'Progress Note',
    color: '#6366F1',
    border: 'rgba(99,102,241,0.35)',
    bg: 'rgba(99,102,241,0.08)',
  },
  emergency: {
    label: 'Emergency Note',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.08)',
  },
  discharge: {
    label: 'Discharge Note',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.08)',
  },
  referral: {
    label: 'Referral Note',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.35)',
    bg: 'rgba(245,158,11,0.08)',
  },
};

const STATUS_CFG: Record<NoteStatus, StatusCfg> = {
  completed: {
    label: 'Completed',
    color: '#22C55E',
    border: 'rgba(34,197,94,0.40)',
    bg: 'transparent',
  },
  'in-progress': {
    label: 'In Progress',
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'transparent',
  },
  urgent: {
    label: 'Urgent',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.40)',
    bg: 'rgba(239,68,68,0.06)',
  },
  draft: {
    label: 'Draft',
    color: '#6B7280',
    border: 'rgba(107,114,128,0.40)',
    bg: 'transparent',
  },
};

const TABS: TabCfg[] = [
  { id: 'all', label: 'All Types' },
  { id: 'soap', label: 'SOAP Note' },
  { id: 'progress', label: 'Progress Note' },
  { id: 'emergency', label: 'Emergency Note' },
  { id: 'discharge', label: 'Discharge Note' },
  { id: 'referral', label: 'Referral Note' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUrgentPatients(notes: ClinicalNote[]) {
  return notes.filter((n) => n.isUrgent).map((n) => n.patientName);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClinicalNotesPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');

  const allNotes = MOCK_CLINICAL_NOTES;
  const urgentPatients = getUrgentPatients(allNotes);
  const urgentCount = urgentPatients.length;

  const q = search.trim().toLowerCase();
  const filtered = allNotes.filter((n) => {
    const matchesTab = activeTab === 'all' || n.type === activeTab;
    const matchesSearch =
      !q ||
      n.patientName.toLowerCase().includes(q) ||
      n.mrn.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      NOTE_TYPE_CFG[n.type].label.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <main
      className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
      style={{ background: '#F5FBFD' }}
    >
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div
        className="mb-5 flex items-start justify-between gap-3 sm:mb-6"
        style={{ minHeight: 62 }}
      >
        <div>
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 30, lineHeight: '38px', color: '#0D2630' }}
          >
            Clinical Notes
          </h1>
          <p style={{ fontSize: 16, lineHeight: '24px', color: '#4A7080' }}>
            {allNotes.length} notes · {urgentCount} requiring urgent attention
          </p>
        </div>

        <button
          type="button"
          onClick={() => toast.info('Coming soon', 'Note writing module is being built.')}
          className="flex shrink-0 items-center gap-2 font-sans font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            height: 40,
            borderRadius: 12,
            padding: '8px 16px',
            background: '#00B4D8',
            fontSize: 14,
            lineHeight: '22px',
            whiteSpace: 'nowrap',
          }}
        >
          <Plus style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span className="hidden sm:inline">Write Clinical Note</span>
          <span className="sm:hidden">New Note</span>
        </button>
      </div>

      {/* ── Urgent banner ────────────────────────────────────────────────────── */}
      {urgentCount > 0 && (
        <div
          className="mb-5 flex items-center gap-3 sm:mb-6"
          style={{
            minHeight: 50,
            borderRadius: 12,
            border: '1px solid #FFC9C9',
            padding: 12,
            background: '#FEF2F2',
          }}
        >
          <AlertTriangle
            aria-hidden
            style={{ width: 18, height: 18, color: '#EF4444', flexShrink: 0 }}
          />
          <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#EF4444' }}>
            {urgentCount} urgent {urgentCount === 1 ? 'note requires' : 'notes require'} immediate
            attention — <span className="hidden sm:inline">{urgentPatients.join(', ')}</span>
            <span className="sm:hidden">
              {urgentPatients.length === 1
                ? urgentPatients[0]
                : `${urgentPatients[0]} +${urgentPatients.length - 1} more`}
            </span>
          </p>
        </div>
      )}

      {/* ── Search bar ───────────────────────────────────────────────────────── */}
      <div
        className="mb-3 flex items-center gap-3 px-3 sm:mb-4 sm:px-4"
        style={{
          height: 42,
          borderRadius: 10,
          border: '1px solid #0064821F',
          background: '#FFFFFF',
        }}
      >
        <Search style={{ width: 16, height: 16, color: '#8A98A3', flexShrink: 0 }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes by patient, type or content..."
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8A98A3]"
          style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
        />
      </div>

      {/* ── Tab bar — scrollable on mobile, spread on sm+ ────────────────────── */}
      <div
        className="mb-4 flex gap-1 overflow-x-auto sm:gap-[50px]"
        style={{
          borderRadius: 12,
          padding: 4,
          background: '#8A98A333',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex shrink-0 items-center justify-center rounded-[9px] px-3 font-sans font-semibold whitespace-nowrap transition-all sm:flex-1 sm:px-4"
              style={{
                fontSize: 14,
                lineHeight: '22px',
                height: 34,
                color: isActive ? '#0D2630' : '#4A7080',
                background: isActive ? '#FFFFFF' : 'transparent',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Note cards ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText
              style={{ width: 40, height: 40, color: '#8A98A3', opacity: 0.4, marginBottom: 12 }}
            />
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              No notes found
            </p>
            <p className="mt-1" style={{ fontSize: 14, color: '#4A7080' }}>
              Try adjusting your search or filter.
            </p>
          </div>
        ) : (
          filtered.map((note) => {
            const typeCfg = NOTE_TYPE_CFG[note.type];
            const statusCfg = STATUS_CFG[note.status];

            return (
              <div
                key={note.id}
                className="flex flex-col gap-3 px-4 py-4"
                style={{
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.52)',
                  borderTop: '1px solid #0064821F',
                  borderRight: '1px solid #0064821F',
                  borderBottom: '1px solid #0064821F',
                  borderLeft: note.isUrgent ? '3px solid #EF4444' : '1px solid #0064821F',
                }}
              >
                {/* ── Row 1: type badge + patient + date ── */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {/* Note type badge */}
                    <span
                      className="shrink-0 rounded-full px-3 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        lineHeight: '22px',
                        color: typeCfg.color,
                        border: `1px solid ${typeCfg.border}`,
                        background: typeCfg.bg,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {typeCfg.label}
                    </span>

                    {/* Urgent badge */}
                    {note.isUrgent && (
                      <span
                        className="shrink-0 rounded-full px-3 py-0.5 font-sans font-semibold"
                        style={{
                          fontSize: 14,
                          lineHeight: '22px',
                          color: '#EF4444',
                          border: '1px solid rgba(239,68,68,0.40)',
                          background: 'rgba(239,68,68,0.08)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        URGENT
                      </span>
                    )}

                    {/* Patient name + MRN */}
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                    >
                      {note.patientName}
                    </span>
                    <span
                      className="hidden sm:inline"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                    >
                      {note.mrn}
                    </span>
                  </div>

                  {/* Date + time — right-aligned */}
                  <div className="shrink-0 text-right">
                    <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                      {note.date}
                    </p>
                    <p style={{ fontSize: 14, lineHeight: '22px', color: '#8A98A3' }}>
                      {note.time}
                    </p>
                  </div>
                </div>

                {/* ── Row 2: note content ── */}
                <p
                  className="line-clamp-3 whitespace-pre-line"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                >
                  {note.content}
                </p>

                {/* ── Row 3: status + doctor + actions ── */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    <span
                      className="rounded-full px-3 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        lineHeight: '22px',
                        color: statusCfg.color,
                        border: `1px solid ${statusCfg.border}`,
                        background: statusCfg.bg,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {statusCfg.label}
                    </span>
                    <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                      {note.doctor}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => toast.info('Coming soon', 'Full note view is being built.')}
                      className="font-sans font-medium transition-opacity hover:opacity-70"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
                    >
                      View Full Note
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        toast.success('Export ready', `${note.patientName} note downloaded.`)
                      }
                      className="flex items-center gap-1.5 font-sans font-medium transition-opacity hover:opacity-70"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                    >
                      <Download style={{ width: 14, height: 14, flexShrink: 0 }} />
                      Export
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Scroll breathing room */}
      <div className="h-4" />
    </main>
  );
}
