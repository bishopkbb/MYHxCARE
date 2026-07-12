'use client';

import { AlertTriangle, ChevronDown, FileText, Info, Plus, Search, Send, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  MOCK_CLINICAL_NOTES,
  type ClinicalNote,
  type NoteStatus,
  type NoteType,
} from '@/features/clinical-notes/__mocks__/clinicalNoteFixtures';
import { ExportMenu } from '@/components/ExportMenu';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';

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

const NOTE_TYPE_OPTIONS: { value: NoteType; label: string }[] = [
  { value: 'soap', label: 'SOAP Note' },
  { value: 'progress', label: 'Progress Note' },
  { value: 'emergency', label: 'Emergency Note' },
  { value: 'discharge', label: 'Discharge Note' },
  { value: 'referral', label: 'Referral Note' },
];

const SOAP_SECTIONS = [
  { key: 'S', label: 'S — Subjective (patient complaint)' },
  { key: 'O', label: 'O — Objective (examination findings)' },
  { key: 'A', label: 'A — Assessment (diagnosis)' },
  { key: 'P', label: 'P — Plan (treatment)' },
] as const;

const SOAP_TEMPLATE = 'S: \nO: \nA: \nP: ';

// ── Shared style tokens ───────────────────────────────────────────────────────

const FIELD_BASE: React.CSSProperties = {
  height: 44,
  border: '1px solid #0064821F',
  borderRadius: 10,
  background: '#FFFFFF',
  color: '#0D2630',
  fontSize: 14,
  lineHeight: '22px',
  padding: '0 12px',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
};

const TEXTAREA_STYLE: React.CSSProperties = {
  border: '1px solid #0064821F',
  borderRadius: 10,
  background: '#FFFFFF',
  color: '#0D2630',
  fontSize: 14,
  lineHeight: '22px',
  padding: '12px 16px',
  width: '100%',
  outline: 'none',
  resize: 'none',
  fontFamily: 'inherit',
};

// ── Export helpers ────────────────────────────────────────────────────────────

function exportNoteAsPDF(note: ClinicalNote) {
  const typeCfg = NOTE_TYPE_CFG[note.type];
  const statusCfg = STATUS_CFG[note.status];
  const body = `
    <h1>${escapeHtml(typeCfg.label)} — ${escapeHtml(note.patientName)}</h1>
    <p class="meta">${escapeHtml(note.mrn)} · ${escapeHtml(note.date)} · ${escapeHtml(note.time)} · ${escapeHtml(note.doctor)} · Status: ${escapeHtml(statusCfg.label)}</p>
    <hr>
    <div class="content">${escapeHtml(note.content)}</div>
  `;
  downloadPDF(`${note.type}-note-${(note.patientName.split(' ')[0] ?? '').toLowerCase()}`, body);
}

function exportNoteAsCSV(note: ClinicalNote) {
  const typeCfg = NOTE_TYPE_CFG[note.type];
  const statusCfg = STATUS_CFG[note.status];
  downloadCSV(`${note.type}-note-${(note.patientName.split(' ')[0] ?? '').toLowerCase()}`, [
    ['Type', 'Patient', 'MRN', 'Date', 'Time', 'Doctor', 'Status', 'Urgent', 'Content'],
    [
      typeCfg.label,
      note.patientName,
      note.mrn,
      note.date,
      note.time,
      note.doctor,
      statusCfg.label,
      note.isUrgent ? 'Yes' : 'No',
      note.content,
    ],
  ]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUrgentPatients(notes: ClinicalNote[]) {
  return notes.filter((n) => n.isUrgent).map((n) => n.patientName);
}

// ── View Full Note Modal ──────────────────────────────────────────────────────

function ViewNoteModal({
  note,
  onClose,
  onAmend,
}: {
  note: ClinicalNote;
  onClose: () => void;
  onAmend: () => void;
}) {
  const typeCfg = NOTE_TYPE_CFG[note.type];
  const statusCfg = STATUS_CFG[note.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col gap-5 overflow-y-auto bg-white"
        style={{
          maxWidth: 680,
          maxHeight: 'calc(100vh - 64px)',
          borderRadius: 16,
          padding: 24,
        }}
      >
        {/* ── Header: badges + close ── */}
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
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1 transition-colors hover:bg-[rgba(0,0,0,0.06)]"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        {/* ── Patient info card ── */}
        <div
          className="rounded-[10px] p-4"
          style={{ background: '#F5FBFD', border: '1px solid #0064821F' }}
        >
          <p
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            {note.patientName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>{note.mrn}</span>
            <span style={{ color: '#8A98A3' }}>·</span>
            <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>{note.date}</span>
            <span style={{ color: '#8A98A3' }}>·</span>
            <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>{note.time}</span>
            <span style={{ color: '#8A98A3' }}>·</span>
            <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              {note.doctor}
            </span>
          </div>
          <div className="mt-2.5">
            <span
              className="rounded-full px-3 py-0.5 font-sans font-medium"
              style={{
                fontSize: 14,
                lineHeight: '22px',
                color: statusCfg.color,
                border: `1px solid ${statusCfg.border}`,
                background: statusCfg.bg,
              }}
            >
              {statusCfg.label}
            </span>
          </div>
        </div>

        {/* ── Note content ── */}
        <div>
          <p
            className="font-sans font-semibold"
            style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630', marginBottom: 10 }}
          >
            Note Content
          </p>
          <div
            className="rounded-[10px] p-4"
            style={{
              background: '#FFFFFF',
              border: '1px solid #0064821F',
              minHeight: 160,
            }}
          >
            <p
              className="whitespace-pre-line"
              style={{ fontSize: 14, lineHeight: '24px', color: '#0D2630' }}
            >
              {note.content}
            </p>
          </div>
        </div>

        {/* ── Audit note ── */}
        <div
          className="flex items-start gap-2.5 rounded-[10px] px-4 py-3"
          style={{ background: 'rgba(0,180,216,0.07)', border: '1px solid rgba(0,180,216,0.20)' }}
        >
          <Info
            aria-hidden
            style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0, marginTop: 3 }}
          />
          <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            This note is time-stamped and audit-logged. It cannot be deleted — only amended.
          </p>
        </div>

        {/* ── Footer actions ── */}
        <div
          className="flex flex-wrap justify-end gap-3 pt-1"
          style={{ borderTop: '1px solid #0064821F', paddingTop: 16 }}
        >
          <button
            type="button"
            onClick={onAmend}
            className="font-sans font-semibold transition-colors hover:bg-[rgba(0,180,216,0.06)]"
            style={{
              height: 40,
              borderRadius: 10,
              padding: '0 20px',
              background: '#FFFFFF',
              border: '1px solid #00B4D8',
              fontSize: 14,
              lineHeight: '22px',
              color: '#00B4D8',
            }}
          >
            Amend Note
          </button>
          <ExportMenu
            variant="button"
            onExportPDF={() => exportNoteAsPDF(note)}
            onExportCSV={() => exportNoteAsCSV(note)}
          />
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-semibold transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{
              height: 44,
              borderRadius: 12,
              padding: '0 20px',
              background: '#FFFFFF',
              border: '1px solid #0064821F',
              fontSize: 14,
              lineHeight: '22px',
              color: '#0D2630',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add New Note Modal ────────────────────────────────────────────────────────

function AddNoteModal({
  onClose,
  onSubmit,
  amendingNote,
}: {
  onClose: () => void;
  onSubmit: (note: ClinicalNote) => void;
  amendingNote?: ClinicalNote;
}) {
  const isAmendment = Boolean(amendingNote);
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [patient, setPatient] = useState(amendingNote?.patientName ?? '');
  const [noteType, setNoteType] = useState<NoteType>(amendingNote?.type ?? 'soap');
  const [content, setContent] = useState(amendingNote ? amendingNote.content : SOAP_TEMPLATE);

  function jumpToSection(key: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const searchStr = `${key}: `;
    const idx = ta.value.indexOf(searchStr);
    if (idx !== -1) {
      ta.focus();
      ta.setSelectionRange(idx + searchStr.length, idx + searchStr.length);
    }
  }

  function handleSubmit() {
    if (!patient.trim()) {
      toast.error('Required', 'Please enter a patient name or MRN.');
      return;
    }
    const contentTrimmed = content.trim();
    const isBlankSoap =
      !isAmendment && noteType === 'soap' && contentTrimmed === SOAP_TEMPLATE.trim();
    if (!contentTrimmed || isBlankSoap) {
      toast.error('Required', 'Please add note content before submitting.');
      return;
    }
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newNote: ClinicalNote = {
      id: `cn-${Date.now()}`,
      type: noteType,
      patientName: patient.trim(),
      mrn: 'MRN-PENDING',
      date: dateStr,
      time: timeStr,
      content: contentTrimmed,
      status: 'in-progress',
      doctor: 'Dr. E. Obi',
    };
    toast.success(
      isAmendment ? 'Amendment logged' : 'Note submitted',
      `${NOTE_TYPE_CFG[noteType].label} for ${patient.trim()} has been ${isAmendment ? 'amended' : 'logged'}.`,
    );
    onSubmit(newNote);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col gap-6 overflow-y-auto bg-white"
        style={{
          maxWidth: 1040,
          maxHeight: 'calc(100vh - 24px)',
          borderRadius: 16,
          padding: 32,
        }}
      >
        {/* ── Modal header ── */}
        <div className="flex items-center justify-between gap-3">
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 28, lineHeight: '36px', color: '#0D2630' }}
          >
            {isAmendment ? 'Amend Clinical Note' : 'New Clinical Note'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1 transition-colors hover:bg-[rgba(0,0,0,0.06)]"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        {/* ── Patient + Note Type ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p
              className="font-sans font-semibold"
              style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630', marginBottom: 6 }}
            >
              Patient
            </p>
            <input
              type="text"
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
              placeholder="Patient name or MRN..."
              className="transition-[border-color] placeholder:text-[#8A98A3]"
              style={FIELD_BASE}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
            />
          </div>

          <div>
            <p
              className="font-sans font-semibold"
              style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630', marginBottom: 6 }}
            >
              Note Type
            </p>
            <div className="relative">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as NoteType)}
                className="w-full appearance-none transition-[border-color]"
                style={{ ...FIELD_BASE, paddingRight: 36, cursor: 'pointer' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
              >
                {NOTE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                style={{ width: 16, height: 16, color: '#8A98A3' }}
              />
            </div>
          </div>
        </div>

        {/* ── SOAP section quick-jump buttons (soap type only) ── */}
        {noteType === 'soap' && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SOAP_SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => jumpToSection(s.key)}
                className="rounded-[10px] px-4 py-2.5 text-left font-sans font-medium transition-colors hover:bg-[rgba(0,180,216,0.06)]"
                style={{
                  fontSize: 14,
                  lineHeight: '22px',
                  color: '#4A7080',
                  background: 'rgba(138,152,163,0.10)',
                  border: '1px solid #0064821F',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Note content textarea ── */}
        <div>
          <p
            className="font-sans font-semibold"
            style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630', marginBottom: 6 }}
          >
            Note Content
          </p>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={noteType === 'soap' ? '' : 'Enter note content...'}
            className="resize-none transition-[border-color] placeholder:text-[#8A98A3]"
            style={{ ...TEXTAREA_STYLE, minHeight: 400 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
          />
        </div>

        {/* ── Audit info banner ── */}
        <div
          className="flex items-start gap-2.5 rounded-[10px] px-4 py-3"
          style={{ background: 'rgba(0,180,216,0.07)', border: '1px solid rgba(0,180,216,0.20)' }}
        >
          <Info
            aria-hidden
            style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0, marginTop: 3 }}
          />
          <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            Notes are time-stamped and audit-logged. Submitted notes cannot be deleted — only
            amended.
          </p>
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-sans font-semibold transition-colors hover:bg-[rgba(0,0,0,0.04)]"
            style={{
              height: 44,
              borderRadius: 12,
              padding: '0 20px',
              background: '#FFFFFF',
              border: '1px solid #0064821F',
              fontSize: 14,
              lineHeight: '22px',
              color: '#4A7080',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              height: 44,
              borderRadius: 12,
              padding: '0 20px',
              background: '#00B4D8',
              fontSize: 14,
              lineHeight: '22px',
            }}
          >
            <Send style={{ width: 16, height: 16, flexShrink: 0 }} />
            {isAmendment ? 'Submit Amendment' : 'Send Clinical Notes'}
          </button>
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
              {notes.length} notes · {urgentCount} requiring urgent attention
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAdd(true)}
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

        {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
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
                style={{
                  width: 40,
                  height: 40,
                  color: '#8A98A3',
                  opacity: 0.4,
                  marginBottom: 12,
                }}
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
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setViewNote(note)}
                        className="font-sans font-medium transition-opacity hover:opacity-70"
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
