'use client';

import { X } from 'lucide-react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'What to report',
    body: 'Report any suspected adverse drug reaction — expected or unexpected, mild or severe — for any medication, vaccine, or herbal product. Under-reporting is the norm; when in doubt, report it.',
  },
  {
    heading: 'Causality assessment (WHO-UMC scale)',
    body: 'Definite: clear temporal relationship, no alternative explanation, confirmed by rechallenge. Probable: reasonable time sequence, unlikely to be the underlying condition, response to dechallenge. Possible: reasonable time sequence, but could also be explained by disease or other drugs. Unlikely: temporal relationship makes a causal link improbable.',
  },
  {
    heading: 'Severity grading',
    body: 'Mild: no change in treatment needed. Moderate: requires a change in therapy or additional treatment. Severe: life-threatening, disabling, or requiring hospitalization.',
  },
  {
    heading: 'When to escalate to the NPC',
    body: 'Severe reactions must be escalated to the National Pharmacovigilance Centre (NPC) once assessment confirms severity — use "Report to NPC" on the report\'s detail view. This is in addition to, not instead of, resolving the case internally.',
  },
  {
    heading: 'Documentation',
    body: 'Always record the suspected drug(s), onset date, a clear description of the reaction, and any action taken (e.g. drug discontinued, dose adjusted). Complete records protect the patient and support future prescribing decisions.',
  },
];

/** Static reference content for ADR reporting — lazy-loaded (checklist §14)
 * since it's a full-screen modal opened by user action. */
export function ADRGuidelinesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            ADR Reporting Guidelines
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-4">
            {SECTIONS.map((section) => (
              <div key={section.heading}>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  {section.heading}
                </p>
                <p className="mt-1" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                  {section.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#0F766E' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
