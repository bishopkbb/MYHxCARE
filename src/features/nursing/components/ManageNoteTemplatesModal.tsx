'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import {
  NOTE_TYPES,
  type NoteType,
  type QuickNoteTemplate,
} from '@/features/nursing/__mocks__/nursingNotesFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const NOTE_TYPE_OPTIONS = NOTE_TYPES.map((t) => ({ value: t, label: t }));

function newTemplate(): QuickNoteTemplate {
  return {
    id: `tpl-${Date.now()}`,
    label: 'New Template',
    noteType: 'General Note',
    starterText: '',
  };
}

export function ManageNoteTemplatesModal({
  templates,
  onSave,
  onClose,
}: {
  templates: QuickNoteTemplate[];
  onSave: (next: QuickNoteTemplate[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<QuickNoteTemplate[]>(templates);

  function update(id: string, patch: Partial<QuickNoteTemplate>) {
    setDraft((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function remove(id: string) {
    setDraft((prev) => prev.filter((t) => t.id !== id));
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
        style={{ maxWidth: 640, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
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
              Manage Note Templates
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              These quick templates appear as shortcuts when adding a nursing note.
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
          <div className="flex flex-col gap-4">
            {draft.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-[12px] p-4"
                style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <FormField
                    label="Template Name"
                    htmlFor={`tpl-label-${tpl.id}`}
                    className="flex-1"
                  >
                    <input
                      id={`tpl-label-${tpl.id}`}
                      type="text"
                      value={tpl.label}
                      onChange={(e) => update(tpl.id, { label: e.target.value })}
                      className={`h-11 w-full rounded-[10px] bg-white px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                  </FormField>
                  <button
                    type="button"
                    onClick={() => remove(tpl.id)}
                    aria-label={`Delete ${tpl.label} template`}
                    className={`mt-6 flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.1)] ${FOCUS_RING}`}
                  >
                    <Trash2 style={{ width: 16, height: 16, color: '#EF4444' }} />
                  </button>
                </div>
                <div className="mt-3">
                  <FormField label="Note Type" htmlFor={`tpl-type-${tpl.id}`}>
                    <FormSelect
                      id={`tpl-type-${tpl.id}`}
                      value={tpl.noteType}
                      onChange={(v) => update(tpl.id, { noteType: v as NoteType })}
                      options={NOTE_TYPE_OPTIONS}
                      placeholder="Select note type"
                    />
                  </FormField>
                </div>
                <div className="mt-3">
                  <FormField label="Starter Text" htmlFor={`tpl-text-${tpl.id}`}>
                    <textarea
                      id={`tpl-text-${tpl.id}`}
                      value={tpl.starterText}
                      onChange={(e) => update(tpl.id, { starterText: e.target.value })}
                      rows={2}
                      className={`w-full resize-none rounded-[10px] bg-white px-3.5 py-2.5 font-sans transition-colors duration-150 outline-none focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                  </FormField>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setDraft((prev) => [...prev, newTemplate()])}
              className={`flex h-11 items-center justify-center gap-2 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8', border: '1px dashed rgba(0,180,216,0.4)' }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Add Template
            </button>
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
            onClick={() => onSave(draft)}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
