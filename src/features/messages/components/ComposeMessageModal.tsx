'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import {
  DEPARTMENT_CFG,
  type StaffDepartment,
} from '@/features/messages/__mocks__/staffInboxFixtures';

const DEPARTMENT_OPTIONS = (Object.keys(DEPARTMENT_CFG) as StaffDepartment[]).map((d) => ({
  value: d,
  label: d,
}));

export function ComposeMessageModal({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (to: string, subject: string) => void;
}) {
  const [department, setDepartment] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isValid = to.trim() && subject.trim() && body.trim();

  function handleSend() {
    setSubmitted(true);
    if (!isValid) return;
    onSend(to.trim(), subject.trim());
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
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Compose Message
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Department" htmlFor="compose-department">
                <FormSelect
                  id="compose-department"
                  value={department}
                  onChange={setDepartment}
                  options={DEPARTMENT_OPTIONS}
                  placeholder="Select department"
                />
              </FormField>
              <FormField
                label="To"
                htmlFor="compose-to"
                required
                error={submitted && !to.trim() ? 'Required' : undefined}
              >
                <FormInput
                  id="compose-to"
                  placeholder="Recipient name"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  hasError={submitted && !to.trim()}
                />
              </FormField>
            </div>
            <FormField
              label="Subject"
              htmlFor="compose-subject"
              required
              error={submitted && !subject.trim() ? 'Required' : undefined}
            >
              <FormInput
                id="compose-subject"
                placeholder="Message subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                hasError={submitted && !subject.trim()}
              />
            </FormField>
            <FormField
              label="Message"
              htmlFor="compose-body"
              required
              error={submitted && !body.trim() ? 'Required' : undefined}
            >
              <textarea
                id="compose-body"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message..."
                className="w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  fontSize: 14,
                  color: '#0D2630',
                  border: `1px solid ${submitted && !body.trim() ? '#EF4444' : 'rgba(0,100,130,0.18)'}`,
                }}
              />
            </FormField>
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
