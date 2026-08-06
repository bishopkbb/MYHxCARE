'use client';

import { Settings, X } from 'lucide-react';
import { useState } from 'react';

import { addQcLot } from '@/features/laboratory/store/qcStore';
import {
  QC_INSTRUMENTS,
  type QcLevel,
  type QcLot,
} from '@/features/laboratory/__mocks__/qcFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const ALL_LEVELS: QcLevel[] = ['Level 1', 'Level 2'];

/** QC Setup — adds a new control lot, which becomes immediately selectable
 * in New QC Run's own Control Lot dropdown (both read/write the same
 * `qcStore.ts`) and shows up in the QC Lots tab. */
export function QcSetupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (lot: QcLot) => void;
}) {
  const [instrumentId, setInstrumentId] = useState(QC_INSTRUMENTS[0]!.id);
  const [levels, setLevels] = useState<Set<QcLevel>>(new Set(ALL_LEVELS));
  const [manufacturer, setManufacturer] = useState('');
  const [openedAt, setOpenedAt] = useState(toDateInputValue(new Date()));
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return toDateInputValue(d);
  });
  const [submitted, setSubmitted] = useState(false);

  function toggleLevel(level: QcLevel) {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function submit() {
    setSubmitted(true);
    if (levels.size === 0 || !manufacturer.trim()) return;

    const lot = addQcLot({
      instrumentId,
      levels: ALL_LEVELS.filter((l) => levels.has(l)),
      manufacturer: manufacturer.trim(),
      openedAt: new Date(openedAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
    });
    onCreated(lot);
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
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: 'rgba(0,180,216,0.1)' }}
            >
              <Settings style={{ width: 20, height: 20, color: '#00B4D8' }} />
            </div>
            <div>
              <h2
                className="font-display font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
              >
                QC Setup
              </h2>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Add a new control lot for an instrument.
              </p>
            </div>
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
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="lot-instrument"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Instrument
              </label>
              <select
                id="lot-instrument"
                value={instrumentId}
                onChange={(e) => setInstrumentId(e.target.value)}
                className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              >
                {QC_INSTRUMENTS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Levels Included
              </p>
              <div className="mt-1.5 flex gap-4">
                {ALL_LEVELS.map((level) => (
                  <label
                    key={level}
                    className="flex cursor-pointer items-center gap-2"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    <input
                      type="checkbox"
                      checked={levels.has(level)}
                      onChange={() => toggleLevel(level)}
                      className={`size-4 rounded ${FOCUS_RING}`}
                    />
                    {level}
                  </label>
                ))}
              </div>
              {submitted && levels.size === 0 && (
                <p className="mt-1" style={{ fontSize: 14, color: '#EF4444' }}>
                  Select at least one level.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="lot-manufacturer"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Manufacturer
              </label>
              <input
                id="lot-manufacturer"
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Bio-Rad Laboratories"
                className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans outline-none ${FOCUS_RING}`}
                style={{
                  fontSize: 14,
                  border: `1px solid ${submitted && !manufacturer.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                  color: '#0D2630',
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="lot-opened"
                  className="block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Opened Date
                </label>
                <input
                  id="lot-opened"
                  type="date"
                  value={openedAt}
                  onChange={(e) => setOpenedAt(e.target.value)}
                  className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans outline-none ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="lot-expires"
                  className="block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Expiry Date
                </label>
                <input
                  id="lot-expires"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans outline-none ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Add Control Lot
          </button>
        </div>
      </div>
    </div>
  );
}
