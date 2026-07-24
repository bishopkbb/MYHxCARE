'use client';

import { useState } from 'react';
import { Megaphone, X } from 'lucide-react';

import { FormField } from '@components/shared/FormField';
import { FormSelect } from '@components/shared/FormSelect';
import { useAuth } from '@hooks/useAuth';
import {
  DEPARTMENT_OPTIONS,
  TARGET_AUDIENCE_OPTIONS,
  type Announcement,
  type AnnouncementPriority,
  type AnnouncementScope,
} from '@/features/nursing/__mocks__/announcementFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const INPUT_CLASS =
  'h-11 w-full rounded-[10px] px-3.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40';
const INPUT_STYLE = { fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' };

export function NewAnnouncementModal({
  onCreate,
  onClose,
}: {
  onCreate: (announcement: Announcement) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scope, setScope] = useState<AnnouncementScope>('Departmental');
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0]!);
  const [priority, setPriority] = useState<AnnouncementPriority>('Normal');
  const [pinned, setPinned] = useState(false);
  const [audience, setAudience] = useState<string[]>(['All Nursing Staff']);
  const [submitted, setSubmitted] = useState(false);

  const isValid = title.trim() !== '' && body.trim() !== '' && audience.length > 0;

  function toggleAudience(a: string) {
    setAudience((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;
    onCreate({
      id: `an-${Date.now()}`,
      title: title.trim(),
      scope,
      department: scope === 'System Wide' ? 'Administration' : department,
      author: user?.name ?? 'Staff Nurse',
      category: 'Administration',
      priority,
      pinned,
      read: true,
      publishedAt: new Date().toISOString(),
      preview: body.trim().slice(0, 120),
      body: [body.trim()],
      targetAudience: audience,
      totalRecipients: 62,
      readCount: 1,
    });
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
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center gap-2.5">
            <Megaphone style={{ width: 20, height: 20, color: '#00B4D8' }} />
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              New Announcement
            </h2>
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
            <FormField
              label="Title"
              htmlFor="ann-title"
              required
              error={submitted && !title.trim() ? 'Title is required' : undefined}
            >
              <input
                id="ann-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Medication Safety Protocol"
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Scope" htmlFor="ann-scope">
                <FormSelect
                  id="ann-scope"
                  value={scope}
                  onChange={(v) => setScope(v as AnnouncementScope)}
                  options={[
                    { value: 'Departmental', label: 'Departmental' },
                    { value: 'System Wide', label: 'System Wide' },
                  ]}
                  placeholder="Select scope"
                />
              </FormField>
              <FormField label="Priority" htmlFor="ann-priority">
                <FormSelect
                  id="ann-priority"
                  value={priority}
                  onChange={(v) => setPriority(v as AnnouncementPriority)}
                  options={[
                    { value: 'Normal', label: 'Normal' },
                    { value: 'High Priority', label: 'High Priority' },
                  ]}
                  placeholder="Select priority"
                />
              </FormField>
            </div>

            {scope === 'Departmental' && (
              <FormField label="Department" htmlFor="ann-department">
                <FormSelect
                  id="ann-department"
                  value={department}
                  onChange={setDepartment}
                  options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
                  placeholder="Select department"
                />
              </FormField>
            )}

            <FormField
              label="Message"
              htmlFor="ann-body"
              required
              error={submitted && !body.trim() ? 'Message is required' : undefined}
            >
              <textarea
                id="ann-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the announcement message…"
                rows={4}
                className="w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </FormField>

            <FormField
              label="Target Audience"
              htmlFor="ann-audience"
              required
              error={
                submitted && audience.length === 0 ? 'Select at least one audience' : undefined
              }
            >
              <div className="flex flex-wrap gap-2">
                {TARGET_AUDIENCE_OPTIONS.map((a) => {
                  const active = audience.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAudience(a)}
                      aria-pressed={active}
                      className={`rounded-full px-3 py-1.5 font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                      style={
                        active
                          ? {
                              background: '#00B4D8',
                              border: '1px solid #00B4D8',
                              color: '#FFFFFF',
                              fontSize: 14,
                            }
                          : {
                              background: '#FFFFFF',
                              border: '1px solid rgba(0,100,130,0.2)',
                              color: '#0D2630',
                              fontSize: 14,
                            }
                      }
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </FormField>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="size-4.5 shrink-0 cursor-pointer rounded"
                style={{ accentColor: '#00B4D8' }}
              />
              <span style={{ fontSize: 14, color: '#2F3A40' }}>
                Pin this announcement to the top
              </span>
            </label>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ border: '1px solid rgba(0,100,130,0.15)', color: '#0D2630', fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ background: '#00B4D8', fontSize: 14 }}
          >
            Post Announcement
          </button>
        </div>
      </div>
    </div>
  );
}
