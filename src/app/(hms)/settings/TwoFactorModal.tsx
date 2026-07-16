'use client';

import { Shield, X } from 'lucide-react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function TwoFactorModal({
  onClose,
  onEnabled,
}: {
  onClose: () => void;
  onEnabled: () => void;
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
        className="animate-in fade-in-0 zoom-in-95 w-full overflow-hidden bg-white duration-150"
        style={{ maxWidth: 420, borderRadius: 16 }}
      >
        <div
          className="flex items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #0064821F' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Enable Two-Factor Authentication
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-6 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(0,180,216,0.10)' }}
          >
            <Shield style={{ width: 26, height: 26, color: '#00B4D8' }} />
          </div>
          <p className="font-sans" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            You&apos;ll be asked for a one-time code from your authenticator app every time you sign
            in from a new device. This adds a second layer of protection to your account.
          </p>
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #0064821F' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center justify-center rounded-[10px] px-5 font-sans font-medium transition-colors duration-150 hover:bg-slate-50 ${FOCUS_RING}`}
            style={{
              border: '1px solid rgba(0,100,130,0.20)',
              color: '#0D2630',
              background: '#FFFFFF',
            }}
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={onEnabled}
            className={`flex h-11 items-center justify-center rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ background: '#00B4D8' }}
          >
            Enable
          </button>
        </div>
      </div>
    </div>
  );
}
