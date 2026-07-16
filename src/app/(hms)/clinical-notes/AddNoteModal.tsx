'use client';

import { ChevronDown, Info, Send, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import type {
  ClinicalNote,
  NoteType,
} from '@/features/clinical-notes/__mocks__/clinicalNoteFixtures';
import { NOTE_TYPE_CFG } from './config';

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

// ── Add New Note Modal ────────────────────────────────────────────────────────

export function AddNoteModal({
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
    const dateStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(now);
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);
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
      department: 'General Medicine',
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
        className="flex w-full flex-col gap-6 overflow-y-auto scroll-smooth bg-white"
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
            className="shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
                className="rounded-[10px] px-4 py-2.5 text-left font-sans font-medium transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
            className="font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
            className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
