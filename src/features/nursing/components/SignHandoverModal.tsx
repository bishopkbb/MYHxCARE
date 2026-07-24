'use client';

import { useState } from 'react';
import { PenLine, X } from 'lucide-react';

import type { HandoverNurse } from '@/features/nursing/__mocks__/shiftHandoverFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function SignHandoverModal({
  nurse,
  onConfirm,
  onClose,
}: {
  nurse: HandoverNurse;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center gap-2.5">
            <PenLine style={{ width: 20, height: 20, color: '#00B4D8' }} />
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Sign as Incoming Nurse
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5">
          <div
            className="flex items-center gap-3 rounded-[10px] p-3.5"
            style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.1)' }}
          >
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
              style={{ background: nurse.avatarBg, fontSize: 14 }}
            >
              {nurse.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                {nurse.name}
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>{nurse.staffId}</p>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded"
              style={{ accentColor: '#00B4D8' }}
            />
            <span style={{ fontSize: 14, color: '#2F3A40', lineHeight: '22px' }}>
              I, {nurse.name}, confirm I have reviewed this shift handover and am accepting care of
              the patients listed above.
            </span>
          </label>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ border: '1px solid rgba(0,100,130,0.15)', color: '#0D2630', fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!acknowledged}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            style={{ background: '#00B4D8', fontSize: 14 }}
          >
            Confirm &amp; Sign
          </button>
        </div>
      </div>
    </div>
  );
}
