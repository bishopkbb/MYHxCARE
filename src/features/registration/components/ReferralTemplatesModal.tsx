'use client';

import { FileText, X } from 'lucide-react';

import { REFERRAL_TEMPLATES } from '@/features/registration/__mocks__/referralFixtures';

export function ReferralTemplatesModal({
  onClose,
  onUseTemplate,
}: {
  onClose: () => void;
  onUseTemplate: (templateName: string, description: string) => void;
}) {
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
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Referral Templates
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Start a new referral pre-filled from a standard letter.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-2.5">
            {REFERRAL_TEMPLATES.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 rounded-[10px] px-4 py-3"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(0,180,216,0.12)' }}
                >
                  <FileText style={{ width: 16, height: 16, color: '#00B4D8' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {t.name}
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>{t.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onUseTemplate(t.name, t.description)}
                  className="flex h-9 shrink-0 items-center justify-center rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  style={{
                    fontSize: 14,
                    color: '#00B4D8',
                    border: '1px solid rgba(0,180,216,0.35)',
                  }}
                >
                  Use
                </button>
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
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
