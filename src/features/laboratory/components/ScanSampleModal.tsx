'use client';

import { ScanLine, X } from 'lucide-react';
import { useState } from 'react';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** A real lookup, not a fabricated scanner — matches against the Sample IDs
 * already derived for orders currently in the work queue's universe. No
 * store action; this only navigates the existing list to the right row. */
export function ScanSampleModal({
  entries,
  onClose,
  onFound,
}: {
  entries: { sampleId: string; groupKey: string }[];
  onClose: () => void;
  onFound: (groupKey: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);

  function handleSubmit() {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = entries.find((e) => e.sampleId.toLowerCase() === q);
    if (match) {
      onFound(match.groupKey);
      onClose();
      return;
    }
    setNotFound(true);
  }

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
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Scan Sample
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
          <label
            htmlFor="scan-input"
            className="block font-sans font-medium"
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            Sample ID / Barcode
          </label>
          <input
            id="scan-input"
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNotFound(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="e.g. SMP260803-1234"
            className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
            style={{
              fontSize: 14,
              border: `1px solid ${notFound ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
              color: '#0D2630',
            }}
          />
          {notFound && (
            <p className="mt-2" style={{ fontSize: 14, color: '#EF4444' }}>
              No sample in the current queue matches “{query.trim()}”.
            </p>
          )}
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
            onClick={handleSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <ScanLine style={{ width: 15, height: 15 }} />
            Find Sample
          </button>
        </div>
      </div>
    </div>
  );
}
