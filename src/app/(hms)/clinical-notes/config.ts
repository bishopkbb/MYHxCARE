import type {
  ClinicalNote,
  NoteStatus,
  NoteType,
} from '@/features/clinical-notes/__mocks__/clinicalNoteFixtures';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';

// Shared between the notes list (page.tsx) and ViewNoteModal — kept here so
// both can import it without either owning the other's definitions.

export type NoteTypeCfg = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

export type StatusCfg = {
  label: string;
  color: string;
  border: string;
  bg: string;
};

export const NOTE_TYPE_CFG: Record<NoteType, NoteTypeCfg> = {
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

export const STATUS_CFG: Record<NoteStatus, StatusCfg> = {
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

// ── Export helpers ────────────────────────────────────────────────────────────

export function exportNoteAsPDF(note: ClinicalNote) {
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

export function exportNoteAsCSV(note: ClinicalNote) {
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
