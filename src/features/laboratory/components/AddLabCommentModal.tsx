'use client';

import { X } from 'lucide-react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Shared "Add Comment" modal for Result Verification and Critical Results —
 * both call the same `addNote()` on `labResultStore.ts`, so this is one real
 * component, not two near-identical inline copies (previously defined
 * inline in each workspace file as an ungated, non-lazy-loaded `fixed
 * inset-0 z-50` block — see docs/api-contracts/06-laboratory G-LAB-02). */
export function AddLabCommentModal({
  value,
  onChange,
  onClose,
  onSave,
  placeholder = 'Add a note about this result…',
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  placeholder?: string;
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
        style={{ maxWidth: 440, borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2 className="font-display font-semibold" style={{ fontSize: 20, color: '#0D2630' }}>
            Add Comment
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
        <div className="px-6 py-5">
          <textarea
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className={`w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.18)' }}
          />
        </div>
        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!value.trim()}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 ${value.trim() ? 'hover:opacity-90' : 'cursor-not-allowed opacity-50'} ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Save Comment
          </button>
        </div>
      </div>
    </div>
  );
}
