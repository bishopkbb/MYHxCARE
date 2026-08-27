'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { useToast } from '@/hooks/useToast';
import type { DepartmentWorkflow } from '@/features/administration/__mocks__/workflowSettingsFixtures';
import { renameWorkflow } from '@/features/administration/store/workflowSettingsStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function EditWorkflowNameModal({
  workflow,
  onClose,
}: {
  workflow: DepartmentWorkflow;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(workflow.name);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
    if (!name.trim()) {
      toast.error('Required', 'Please enter a workflow name.');
      return;
    }
    renameWorkflow(workflow.id, name.trim());
    toast.success('Workflow renamed', `Workflow is now named "${name.trim()}".`);
    onClose();
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
            Edit Workflow Name
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
          <FormField
            label="Workflow Name"
            htmlFor="edit-workflow-name"
            required
            error={submitted && !name.trim() ? 'Required' : undefined}
          >
            <FormInput
              id="edit-workflow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              hasError={submitted && !name.trim()}
            />
          </FormField>
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
            Save Name
          </button>
        </div>
      </div>
    </div>
  );
}
