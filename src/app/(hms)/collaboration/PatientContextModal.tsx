'use client';

import { Check, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { Conversation } from '@/features/messages/__mocks__/messageFixtures';
import { MOCK_PATIENTS, type PatientRecord } from '@/features/patients/__mocks__/patientFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// ── Patient context picker ────────────────────────────────────────────────────

export function PatientContextModal({
  activeConversation,
  onClose,
  onLink,
  onRemoveContext,
}: {
  activeConversation: Conversation;
  onClose: () => void;
  onLink: (patient: PatientRecord) => void;
  onRemoveContext: () => void;
}) {
  const [patientSearch, setPatientSearch] = useState('');

  const filteredPatientPicker = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return MOCK_PATIENTS;
    return MOCK_PATIENTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q),
    );
  }, [patientSearch]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-in fade-in-0 zoom-in-95 flex w-full flex-col overflow-hidden bg-white duration-150"
        style={{ maxWidth: 460, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #0064821F' }}
        >
          <div className="min-w-0">
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              {activeConversation.patientContext
                ? 'Change Patient Context'
                : 'Link Patient Context'}
            </h2>
            <p
              className="mt-0.5 truncate font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
            >
              For your conversation with {activeConversation.doctorName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 px-6 pt-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              style={{ width: 16, height: 16, color: '#8A98A3' }}
            />
            <input
              type="text"
              autoFocus
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search by name or MRN…"
              className={`h-[42px] w-full rounded-[12px] pr-4 pl-9 font-sans outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
              style={{
                background: '#F5FBFD',
                border: '1px solid #0064821F',
                color: '#2F3A40',
                fontSize: 14,
                lineHeight: '22px',
              }}
            />
          </div>
        </div>

        {/* Patient list */}
        <div className="flex-1 overflow-y-auto scroll-smooth px-2 py-3">
          {filteredPatientPicker.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <div
                className="flex size-12 items-center justify-center rounded-full"
                style={{ background: 'rgba(226,237,241,0.6)' }}
              >
                <Search style={{ width: 18, height: 18, color: '#8A98A3' }} />
              </div>
              <p className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
                No patients match your search
              </p>
            </div>
          ) : (
            filteredPatientPicker.map((patient) => {
              const isCurrent = activeConversation.patientContext?.mrn === patient.mrn;
              return (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => onLink(patient)}
                  className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                  style={{ background: isCurrent ? '#E6F8FD' : 'transparent' }}
                >
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-medium text-white"
                    style={{ background: patient.avatarBg, fontSize: 14 }}
                  >
                    {patient.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {patient.name}
                    </p>
                    <p className="truncate font-sans" style={{ fontSize: 14, color: '#4A7080' }}>
                      {patient.mrn} · {patient.meta}
                    </p>
                  </div>
                  {isCurrent && (
                    <Check style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {activeConversation.patientContext && (
          <div
            className="flex shrink-0 items-center justify-between gap-3 px-6 py-4"
            style={{ borderTop: '1px solid #0064821F' }}
          >
            <button
              type="button"
              onClick={onRemoveContext}
              className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#EF4444' }}
            >
              Remove current context
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
