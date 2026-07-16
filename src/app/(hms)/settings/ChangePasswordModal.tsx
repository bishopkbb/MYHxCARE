'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function ChangePasswordModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!current || !next || !confirm) {
      setError('Please fill in every field.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setError(null);
    onSaved();
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid #0064821F',
    fontSize: 14,
    lineHeight: '22px',
    color: '#0D2630',
    background: '#FFFFFF',
    height: 44,
    borderRadius: 10,
  };

  const rows: { label: string; value: string; setValue: (v: string) => void }[] = [
    { label: 'Current Password', value: current, setValue: setCurrent },
    { label: 'New Password', value: next, setValue: setNext },
    { label: 'Confirm New Password', value: confirm, setValue: setConfirm },
  ];

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
        style={{ maxWidth: 440, borderRadius: 16 }}
      >
        <div
          className="flex items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #0064821F' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Change Password
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

        <div className="flex flex-col gap-4 px-6 py-5">
          {rows.map((row) => (
            <div key={row.label}>
              <label
                className="mb-1.5 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {row.label}
              </label>
              <input
                type="password"
                value={row.value}
                onChange={(e) => row.setValue(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#00B4D8';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#0064821F';
                }}
                className={`w-full px-4 transition-[border-color] duration-150 outline-none ${FOCUS_RING}`}
                style={inputStyle}
              />
            </div>
          ))}
          {error && (
            <p className="font-sans" style={{ fontSize: 14, color: '#EF4444' }}>
              {error}
            </p>
          )}
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`flex h-11 items-center justify-center rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ background: '#00B4D8' }}
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
