'use client';

import { X } from 'lucide-react';
import { useMemo } from 'react';

import {
  RETURN_REASON_OPTIONS,
  type MedicationReturn,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Live breakdown of every individual return reason — lazy-loaded (checklist
 * §14). Distinct from the sidebar donut, which only shows the 5 named
 * categories; this lists every specific reason string with a real count. */
export function ReturnReasonsModal({
  returns,
  onClose,
}: {
  returns: MedicationReturn[];
  onClose: () => void;
}) {
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of returns) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
    return RETURN_REASON_OPTIONS.map((opt) => ({
      reason: opt.label,
      count: counts.get(opt.value) ?? 0,
    })).sort((a, b) => b.count - a.count);
  }, [returns]);

  const total = returns.length;

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
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="min-w-0">
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Return Reasons Management
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Every return reason and how often it&apos;s been used.
            </p>
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <div key={r.reason} className="flex items-center justify-between gap-3 py-1">
                <span style={{ fontSize: 14, color: '#0D2630' }}>{r.reason}</span>
                <span
                  className="shrink-0 font-sans font-medium"
                  style={{ fontSize: 14, color: '#4A7080' }}
                >
                  {r.count} ({total > 0 ? ((r.count / total) * 100).toFixed(1) : 0}%)
                </span>
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
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
