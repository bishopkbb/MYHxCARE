'use client';

import { FlaskConical, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { addQcRun, useQcLots } from '@/features/laboratory/store/qcStore';
import {
  QC_INSTRUMENTS,
  getInstrument,
  type QcLevel,
  type QcRun,
  type QcType,
} from '@/features/laboratory/__mocks__/qcFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** New QC Run modal — logs a control run for an instrument/level/lot and
 * evaluates every entered value against its test's target range the same
 * way `qcFixtures.ts`'s own seed generator does (via `addQcRun`'s shared
 * Westgard evaluation), so live-logged runs score identically to history. */
export function NewQcRunModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (run: QcRun) => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const lots = useQcLots();

  const [instrumentId, setInstrumentId] = useState(QC_INSTRUMENTS[0]!.id);
  const [qcType, setQcType] = useState<QcType>('Internal');
  const [level, setLevel] = useState<QcLevel>('Level 1');
  const [runAt, setRunAt] = useState(toLocalInputValue(new Date()));
  const [comments, setComments] = useState('');
  const [observed, setObserved] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const instrument = getInstrument(instrumentId)!;
  const availableLots = useMemo(
    () =>
      lots.filter(
        (l) => l.instrumentId === instrumentId && l.status !== 'Depleted' && l.status !== 'Expired',
      ),
    [lots, instrumentId],
  );
  const [lotId, setLotId] = useState(availableLots[0]?.id ?? '');
  const activeLotId = availableLots.some((l) => l.id === lotId)
    ? lotId
    : (availableLots[0]?.id ?? '');

  function changeInstrument(id: string) {
    const inst = getInstrument(id)!;
    setInstrumentId(id);
    setObserved({});
    const nextLots = lots.filter(
      (l) => l.instrumentId === id && l.status !== 'Depleted' && l.status !== 'Expired',
    );
    setLotId(nextLots[0]?.id ?? '');
    if (!inst.tests.some((t) => level in t.levels)) setLevel('Level 1');
  }

  function submit(saveAsInProgress: boolean) {
    setSubmitted(true);
    if (!activeLotId) {
      toast.error(
        'No control lot available',
        'Add an active control lot for this instrument in QC Setup first.',
      );
      return;
    }
    if (!saveAsInProgress) {
      const missing = instrument.tests.some((t) => {
        const v = observed[t.name];
        return v === undefined || v.trim() === '' || Number.isNaN(Number(v));
      });
      if (missing) {
        toast.error(
          'Missing values',
          'Enter an observed value for every test, or save as In Progress.',
        );
        return;
      }
    }

    const observedByTest: Record<string, number> = {};
    for (const t of instrument.tests) {
      const v = observed[t.name];
      if (v !== undefined && v.trim() !== '' && !Number.isNaN(Number(v))) {
        observedByTest[t.name] = Number(v);
      }
    }

    const run = addQcRun({
      instrumentId,
      level,
      qcType,
      lotId: activeLotId,
      runAt: new Date(runAt).toISOString(),
      reviewedBy: user?.name ?? 'Unknown',
      ...(comments.trim() ? { comments: comments.trim() } : {}),
      observedByTest,
      saveAsInProgress,
    });
    onCreated(run);
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
          <div className="flex items-start gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: 'rgba(0,180,216,0.1)' }}
            >
              <FlaskConical style={{ width: 20, height: 20, color: '#00B4D8' }} />
            </div>
            <div>
              <h2
                className="font-display font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
              >
                New QC Run
              </h2>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Log a control run and evaluate it against target ranges.
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="qc-instrument"
                  className="block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Instrument
                </label>
                <select
                  id="qc-instrument"
                  value={instrumentId}
                  onChange={(e) => changeInstrument(e.target.value)}
                  className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                >
                  {QC_INSTRUMENTS.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="qc-type"
                  className="block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  QC Type
                </label>
                <select
                  id="qc-type"
                  value={qcType}
                  onChange={(e) => setQcType(e.target.value as QcType)}
                  className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                >
                  <option value="Internal">Internal</option>
                  <option value="External">External</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="qc-lot"
                  className="block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Control Lot
                </label>
                <select
                  id="qc-lot"
                  value={activeLotId}
                  onChange={(e) => setLotId(e.target.value)}
                  disabled={availableLots.length === 0}
                  className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans disabled:cursor-not-allowed disabled:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: `1px solid ${submitted && !activeLotId ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                    color: '#0D2630',
                  }}
                >
                  {availableLots.length === 0 ? (
                    <option value="">No lots available</option>
                  ) : (
                    availableLots.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label
                  htmlFor="qc-level"
                  className="block font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Level
                </label>
                <select
                  id="qc-level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as QcLevel)}
                  className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                >
                  <option value="Level 1">Level 1</option>
                  <option value="Level 2">Level 2</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="qc-run-at"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Run Date &amp; Time
              </label>
              <input
                id="qc-run-at"
                type="datetime-local"
                value={runAt}
                onChange={(e) => setRunAt(e.target.value)}
                className={`mt-1.5 h-11 w-full rounded-[10px] px-3.5 font-sans outline-none ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>

            <div>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Control Results — {instrument.name} ({level})
              </p>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                Enter the observed value for each test, or leave blank and save as In Progress.
              </p>
              <div className="mt-2 flex flex-col gap-2.5">
                {instrument.tests.map((t) => {
                  const range = t.levels[level];
                  const low = Math.round((range.mean - 2 * range.sd) * 100) / 100;
                  const high = Math.round((range.mean + 2 * range.sd) * 100) / 100;
                  const value = observed[t.name] ?? '';
                  const missing = submitted && value.trim() === '';
                  return (
                    <div key={t.name} className="flex items-center gap-2.5">
                      <div className="w-[38%] min-w-0">
                        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                          {t.name}
                        </p>
                        <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                          {low}–{high} {t.unit}
                        </p>
                      </div>
                      <input
                        type="number"
                        step="any"
                        aria-label={`Observed value for ${t.name}`}
                        value={value}
                        onChange={(e) =>
                          setObserved((prev) => ({ ...prev, [t.name]: e.target.value }))
                        }
                        className={`h-11 flex-1 rounded-[10px] px-3.5 font-sans outline-none ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          border: `1px solid ${missing ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                          color: '#0D2630',
                        }}
                        placeholder="Observed"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="qc-comments"
                className="block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Comments
              </label>
              <textarea
                id="qc-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                className={`mt-1.5 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
                placeholder="Optional notes about this run"
              />
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
            onClick={() => submit(true)}
            className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Save as In Progress
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Complete &amp; Save
          </button>
        </div>
      </div>
    </div>
  );
}
