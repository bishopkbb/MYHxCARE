'use client';

import { AlertCircle, AlertTriangle, FileText, Plus, RefreshCw, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { ExportMenu } from '@/components/ExportMenu';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import {
  MOCK_CLINICAL_NOTES,
  type ClinicalNote,
  type NoteType,
} from '@/features/clinical-notes/__mocks__/clinicalNoteFixtures';
import { NOTE_TYPE_CFG, STATUS_CFG, exportNoteAsPDF, exportNoteAsCSV } from './config';

// Opened only via "Write Clinical Note" / "View Full Note" / "Amend Note" —
// never needed for the initial paint, so their code stays out of this page's
// main bundle until then.
const ViewNoteModal = dynamic(() => import('./ViewNoteModal').then((m) => m.ViewNoteModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});
const AddNoteModal = dynamic(() => import('./AddNoteModal').then((m) => m.AddNoteModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';

type TabId = 'all' | NoteType;

type TabCfg = {
  id: TabId;
  label: string;
};

// ── Config ────────────────────────────────────────────────────────────────────

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

// ── Skeleton Note Card ────────────────────────────────────────────────────────

function SkeletonNoteCard() {
  return (
    <div
      className="flex flex-col gap-3 px-4 py-4"
      style={{
        borderRadius: 12,
        background: 'rgba(255,255,255,0.52)',
        border: '1px solid #0064821F',
      }}
    >
      {/* Row 1: type badge + patient name + date */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="animate-pulse rounded-full bg-slate-200"
            style={{ width: 90, height: 26 }}
          />
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 130, height: 20 }} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 80, height: 18 }} />
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 60, height: 16 }} />
        </div>
      </div>
      {/* Row 2: content preview lines */}
      <div className="flex flex-col gap-1.5">
        <div className="animate-pulse rounded bg-slate-200" style={{ height: 18, width: '95%' }} />
        <div className="animate-pulse rounded bg-slate-200" style={{ height: 18, width: '80%' }} />
        <div className="animate-pulse rounded bg-slate-200" style={{ height: 18, width: '60%' }} />
      </div>
      {/* Row 3: status + doctor | actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="animate-pulse rounded-full bg-slate-200"
            style={{ width: 80, height: 26 }}
          />
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 110, height: 18 }} />
        </div>
        <div className="flex items-center gap-4">
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 90, height: 18 }} />
          <div className="animate-pulse rounded bg-slate-200" style={{ width: 60, height: 18 }} />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClinicalNotesPage() {
  const [notes, setNotes] = useState<ClinicalNote[]>(MOCK_CLINICAL_NOTES);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [viewNote, setViewNote] = useState<ClinicalNote | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [amendNote, setAmendNote] = useState<ClinicalNote | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const urgentPatients = getUrgentPatients(notes);
  const urgentCount = urgentPatients.length;

  const q = search.trim().toLowerCase();
  const filtered = notes.filter((n) => {
    const matchesTab = activeTab === 'all' || n.type === activeTab;
    const matchesSearch =
      !q ||
      n.patientName.toLowerCase().includes(q) ||
      n.mrn.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      NOTE_TYPE_CFG[n.type].label.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  function handleAddSubmit(newNote: ClinicalNote) {
    setNotes((prev) => [newNote, ...prev]);
    setShowAdd(false);
    setAmendNote(null);
  }

  return (
    <>
      <main
        className="flex-1 overflow-y-auto scroll-smooth px-4 py-4 sm:px-6 sm:py-6"
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
              {notes.length} notes · {urgentCount} requiring urgent attention
            </p>
          </div>

          <PermissionGate permission={PERMISSIONS.ENCOUNTERS_WRITE}>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex shrink-0 items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
          </PermissionGate>
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

        {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
        <div
          className="mb-4 flex gap-1 overflow-x-auto scroll-smooth sm:gap-[50px]"
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
                className="flex shrink-0 items-center justify-center rounded-[9px] px-3 font-sans font-semibold whitespace-nowrap transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none sm:flex-1 sm:px-4"
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
        {pageState === 'loading' && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonNoteCard key={i} />
            ))}
          </div>
        )}
        {pageState === 'error' && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircle style={{ width: 40, height: 40, color: '#EF4444' }} />
            <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Failed to load clinical notes
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
        )}
        {pageState === 'loaded' && (
          <div className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div
                  className="flex size-14 items-center justify-center rounded-full"
                  style={{ background: 'rgba(226,237,241,0.6)' }}
                >
                  <FileText style={{ width: 28, height: 28, color: '#8A98A3' }} />
                </div>
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

                      <div className="shrink-0 text-right">
                        <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                          {note.date}
                        </p>
                        <p style={{ fontSize: 14, lineHeight: '22px', color: '#8A98A3' }}>
                          {note.time}
                        </p>
                      </div>
                    </div>

                    {/* ── Row 2: content preview ── */}
                    <p
                      className="line-clamp-3 whitespace-pre-line"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                    >
                      {note.content}
                    </p>

                    {/* ── Row 3: status + doctor + actions ── */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
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
                        <span style={{ color: '#8A98A3' }}>·</span>
                        <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                          {note.department}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setViewNote(note)}
                          className="font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
                        >
                          View Full Note
                        </button>
                        <ExportMenu
                          variant="text"
                          onExportPDF={() => exportNoteAsPDF(note)}
                          onExportCSV={() => exportNoteAsCSV(note)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="h-4" />
      </main>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {viewNote && (
        <ViewNoteModal
          note={viewNote}
          onClose={() => setViewNote(null)}
          onAmend={() => {
            setAmendNote(viewNote);
            setViewNote(null);
          }}
        />
      )}
      {(showAdd || amendNote) && (
        <AddNoteModal
          onClose={() => {
            setShowAdd(false);
            setAmendNote(null);
          }}
          onSubmit={handleAddSubmit}
          {...(amendNote ? { amendingNote: amendNote } : {})}
        />
      )}
    </>
  );
}
