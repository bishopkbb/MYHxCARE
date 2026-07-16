'use client';

import { AlertTriangle, Info, X } from 'lucide-react';

import { ExportMenu } from '@/components/ExportMenu';
import type { ClinicalNote } from '@/features/clinical-notes/__mocks__/clinicalNoteFixtures';
import { NOTE_TYPE_CFG, STATUS_CFG, exportNoteAsPDF, exportNoteAsCSV } from './config';

// ── SOAP helpers (only needed for the structured SOAP view in this modal) ─────

const SOAP_KEYS = ['S', 'O', 'A', 'P'] as const;
type SoapKey = (typeof SOAP_KEYS)[number];

const SOAP_META: Record<
  SoapKey,
  { label: string; hint: string; color: string; bg: string; border: string }
> = {
  S: {
    label: 'Subjective',
    hint: 'What the patient reports',
    color: '#00B4D8',
    bg: 'rgba(0,180,216,0.05)',
    border: 'rgba(0,180,216,0.20)',
  },
  O: {
    label: 'Objective',
    hint: 'Examination & measurable findings',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.05)',
    border: 'rgba(99,102,241,0.18)',
  },
  A: {
    label: 'Assessment',
    hint: 'Clinical impression & diagnosis',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.05)',
    border: 'rgba(245,158,11,0.20)',
  },
  P: {
    label: 'Plan',
    hint: 'Treatment & follow-up steps',
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.05)',
    border: 'rgba(34,197,94,0.20)',
  },
};

function parseSoap(content: string): Partial<Record<SoapKey, string>> {
  const out: Partial<Record<SoapKey, string>> = {};
  const lines = content.split('\n');
  let cur: SoapKey | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (cur !== null) out[cur] = buf.join('\n').trim();
  };

  for (const line of lines) {
    const m = line.match(/^([SOAP]):\s*(.*)/);
    if (m && (SOAP_KEYS as readonly string[]).includes(m[1]!)) {
      flush();
      cur = m[1] as SoapKey;
      buf.length = 0;
      if (m[2]) buf.push(m[2]);
    } else if (cur !== null) {
      buf.push(line);
    }
  }
  flush();
  return out;
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

// ── View Full Note Modal ──────────────────────────────────────────────────────

export function ViewNoteModal({
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
  const isSoap = note.type === 'soap';
  const isEmergency = note.type === 'emergency';
  const soapSections = isSoap ? parseSoap(note.content) : null;
  const words = countWords(note.content);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col gap-5 overflow-y-auto scroll-smooth bg-white"
        style={{
          maxWidth: 700,
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
            className="shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        {/* ── Emergency callout ── */}
        {isEmergency && (
          <div
            className="flex items-start gap-3 rounded-[10px] px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <AlertTriangle
              aria-hidden
              style={{ width: 18, height: 18, color: '#EF4444', flexShrink: 0, marginTop: 2 }}
            />
            <p
              className="font-sans font-semibold"
              style={{ fontSize: 14, lineHeight: '22px', color: '#B91C1C' }}
            >
              Emergency note — review the treating physician before making any amendments.
            </p>
          </div>
        )}

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
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              {note.doctor}
            </span>
            <span style={{ color: '#8A98A3' }}>·</span>
            <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              {note.department}
            </span>
            {note.ward && (
              <>
                <span style={{ color: '#8A98A3' }}>·</span>
                <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                  {note.ward}
                </span>
              </>
            )}
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
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p
              className="font-sans font-semibold"
              style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
            >
              {isSoap ? 'SOAP Note — Structured Content' : 'Note Content'}
            </p>
            <span style={{ fontSize: 14, lineHeight: '22px', color: '#8A98A3' }}>
              {words} {words === 1 ? 'word' : 'words'}
            </span>
          </div>

          {isSoap && soapSections ? (
            <div className="flex flex-col gap-3">
              {SOAP_KEYS.map((key) => {
                const meta = SOAP_META[key];
                const text = soapSections[key];
                return (
                  <div
                    key={key}
                    style={{
                      borderTop: `1px solid ${meta.border}`,
                      borderRight: `1px solid ${meta.border}`,
                      borderBottom: `1px solid ${meta.border}`,
                      borderLeft: `3px solid ${meta.color}`,
                      borderRadius: 10,
                      background: meta.bg,
                      padding: '12px 16px',
                    }}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className="flex shrink-0 items-center justify-center font-sans font-bold"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: meta.color,
                          color: '#FFFFFF',
                          fontSize: 14,
                          lineHeight: '1',
                        }}
                      >
                        {key}
                      </span>
                      <span
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                      >
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 14, lineHeight: '22px', color: '#8A98A3' }}>
                        — {meta.hint}
                      </span>
                    </div>
                    {text ? (
                      <p
                        className="whitespace-pre-wrap"
                        style={{ fontSize: 14, lineHeight: '24px', color: '#2F3A40' }}
                      >
                        {text}
                      </p>
                    ) : (
                      <p
                        className="italic"
                        style={{ fontSize: 14, lineHeight: '24px', color: '#8A98A3' }}
                      >
                        Not documented
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="rounded-[10px] p-4"
              style={{
                background: '#FFFFFF',
                border: `1px solid ${isEmergency ? 'rgba(239,68,68,0.25)' : '#0064821F'}`,
                minHeight: 120,
              }}
            >
              <p
                className="whitespace-pre-wrap"
                style={{ fontSize: 14, lineHeight: '24px', color: '#0D2630' }}
              >
                {note.content}
              </p>
            </div>
          )}
        </div>

        {/* ── Amendment history ── */}
        {note.amendments && note.amendments.length > 0 && (
          <div>
            <p
              className="font-sans font-semibold"
              style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630', marginBottom: 10 }}
            >
              Amendment History ({note.amendments.length})
            </p>
            <div className="flex flex-col gap-2.5">
              {note.amendments.map((amendment, i) => (
                <div
                  key={i}
                  className="rounded-[10px] p-3"
                  style={{ background: '#F5FBFD', border: '1px solid #0064821F' }}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, lineHeight: '22px', color: '#0D2630' }}
                    >
                      {amendment.by}
                    </span>
                    <span style={{ color: '#8A98A3' }}>·</span>
                    <span style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                      {amendment.at}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                    {amendment.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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
          className="flex flex-wrap justify-end gap-3"
          style={{ borderTop: '1px solid #0064821F', paddingTop: 16 }}
        >
          <button
            type="button"
            onClick={onAmend}
            className="font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,180,216,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
            className="font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
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
