'use client';

import { NotebookPen, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function AddClinicalNoteModal({
  patientName,
  testName,
  onClose,
  onSave,
}: {
  patientName: string;
  testName: string;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSave = text.trim() !== '';

  function handleSubmit() {
    setSubmitted(true);
    if (!canSave) {
      toast.error('Required', 'Write a note before saving.');
      return;
    }
    onSave(text.trim());
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
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Add Clinical Note
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {testName} — {patientName}
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
          <label
            htmlFor="note-text"
            className="block font-sans font-medium"
            style={{ fontSize: 14, color: '#0D2630' }}
          >
            Note
          </label>
          <textarea
            id="note-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            rows={5}
            maxLength={500}
            placeholder="e.g. Discussed result with patient. Repeat U&E in 48 hours."
            className={`mt-1.5 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
            style={{
              fontSize: 14,
              border: `1px solid ${submitted && !canSave ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
              color: '#0D2630',
            }}
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
            onClick={handleSubmit}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <NotebookPen style={{ width: 15, height: 15 }} />
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
