'use client';

import { Package, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatDate } from '@/utils/datetime';
import { DRUG_INVENTORY } from '@/features/pharmacy/__mocks__/pharmacyFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Read-only inventory lookup — lazy-loaded (checklist §14). */
export function SearchMedicationModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DRUG_INVENTORY;
    return DRUG_INVENTORY.filter(
      (d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q),
    );
  }, [search]);

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
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Search Medication
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Look up stock and batch details.
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
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
              style={{ width: 16, height: 16, color: '#8A98A3' }}
            />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by drug name or category…"
              className={`h-11 w-full rounded-[10px] pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(226,237,241,0.6)' }}
              >
                <Package style={{ width: 28, height: 28, color: '#8A98A3' }} />
              </div>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                No medications found
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>Try a different name or category.</p>
            </div>
          ) : (
            <div className="mt-3.5 flex flex-col gap-2">
              {results.slice(0, 25).map((drug) => {
                const isLow = drug.currentStock <= drug.reorderLevel;
                return (
                  <div
                    key={drug.id}
                    className="flex items-center justify-between gap-3 rounded-[10px] p-3"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {drug.name}
                      </p>
                      <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                        {drug.category} · Batch {drug.batches[0]?.batchNo} · Exp{' '}
                        {drug.batches[0] ? formatDate(drug.batches[0].expiryDate) : '—'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: isLow ? '#DC2626' : '#16A34A' }}
                      >
                        {drug.currentStock} {drug.unit}
                        {drug.currentStock === 1 ? '' : 's'}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        Reorder at {drug.reorderLevel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
