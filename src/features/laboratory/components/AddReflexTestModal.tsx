'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { LAB_CATEGORIES } from '@/features/laboratory/__mocks__/labOrderFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

/** Result Entry's "Add Reflex Test" — a follow-up test run directly off the
 * specimen already at the bench, not a fresh draw. Reuses the same
 * `LAB_CATEGORIES` picker `WalkInCollectionModal` uses to create orders, but
 * single-select (one reflex test at a time) and with no patient/priority
 * step — this order's own patient and priority already apply. */
export function AddReflexTestModal({
  patientName,
  mrn,
  onClose,
  onConfirm,
}: {
  patientName: string;
  mrn: string;
  onClose: () => void;
  onConfirm: (testId: string) => void;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<string | undefined>(undefined);

  function handleSubmit() {
    if (!selected) {
      toast.error('No test selected', 'Choose a test to add as a reflex test.');
      return;
    }
    onConfirm(selected);
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
              Add Reflex Test
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              For {patientName} · {mrn} — runs directly off the sample already at the bench
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
          <div className="flex flex-col gap-3">
            {LAB_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className="overflow-hidden rounded-[10px]"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="px-3.5 py-2" style={{ background: 'rgba(226,237,241,0.4)' }}>
                  <span
                    className="font-sans font-semibold"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {category.title}
                  </span>
                </div>
                <div className="flex flex-col p-1.5">
                  {category.tests.map((test) => {
                    const isChecked = selected === test.id;
                    return (
                      <label
                        key={test.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 transition-colors duration-150"
                        style={{ background: isChecked ? 'rgba(0,180,216,0.06)' : 'transparent' }}
                      >
                        <input
                          type="radio"
                          name="reflex-test"
                          checked={isChecked}
                          onChange={() => setSelected(test.id)}
                          className="size-4 shrink-0 accent-[#00B4D8]"
                        />
                        <span style={{ fontSize: 14, color: '#0D2630' }}>{test.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
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
            <Plus style={{ width: 15, height: 15 }} />
            Add Test
          </button>
        </div>
      </div>
    </div>
  );
}
