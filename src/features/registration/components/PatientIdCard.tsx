'use client';

import { getInitials } from '@lib/utils';
import { computeAge } from '@/features/registration/schemas/registerPatientSchema';
import { formatHumanDate } from '@/utils/datetime';
import type { PatientCard } from '@/features/registration/__mocks__/patientCardFixtures';

const ACCENT_BY_TYPE: Record<string, string> = {
  Student: '#00B4D8',
  Staff: '#8B5CF6',
  Dependent: '#22C55E',
  Visitor: '#F59E0B',
};

// Deterministic decorative barcode — visual only, not a real scannable code.
function Barcode({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const bars = Array.from({ length: 36 }, (_, i) => {
    const bit = (hash >> (i % 24)) & 1;
    return bit ? 3 : 1;
  });
  return (
    <div className="flex h-8 items-stretch gap-[1.5px]" aria-hidden="true">
      {bars.map((w, i) => (
        <div key={i} style={{ width: w, background: '#0D2630' }} />
      ))}
    </div>
  );
}

export function PatientIdCard({ card }: { card: PatientCard }) {
  const accent = ACCENT_BY_TYPE[card.cardType] ?? '#00B4D8';
  const age = card.dateOfBirth ? computeAge(card.dateOfBirth) : null;

  return (
    <div
      className="mx-auto w-full overflow-hidden"
      style={{
        maxWidth: 340,
        borderRadius: 16,
        border: '1px solid rgba(0,100,130,0.15)',
        boxShadow: '0 8px 24px rgba(13,38,48,0.08)',
        background: '#FFFFFF',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${accent}, #0D2630)` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20">
            <span className="font-display font-bold text-white" style={{ fontSize: 14 }}>
              U
            </span>
          </div>
          <span className="truncate font-sans font-semibold text-white" style={{ fontSize: 14 }}>
            UNIZIK Medical Centre
          </span>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium text-white"
          style={{ fontSize: 14, background: 'rgba(255,255,255,0.22)', whiteSpace: 'nowrap' }}
        >
          {card.cardType}
        </span>
      </div>

      <div className="flex items-start gap-3 px-4 py-4">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
          style={{ background: accent, fontSize: 20 }}
        >
          {getInitials(card.patientName)}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="font-display truncate font-semibold"
            style={{ fontSize: 16, color: '#0D2630' }}
          >
            {card.patientName}
          </p>
          <p style={{ fontSize: 14, color: '#00B4D8' }}>{card.mrn}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5">
            <span style={{ fontSize: 14, color: '#8A98A3' }}>ID: {card.patientId}</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>{card.gender}</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>
              {card.dateOfBirth
                ? `${formatHumanDate(card.dateOfBirth)}${age !== null ? ` (${age})` : ''}`
                : 'DOB —'}
            </span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Blood: {card.bloodGroup}</span>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }}
      >
        <Barcode seed={card.mrn} />
        <span className="shrink-0 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
          Valid till {formatHumanDate(card.expiryDate)}
        </span>
      </div>
    </div>
  );
}
