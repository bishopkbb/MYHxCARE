'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useToast } from '@/hooks/useToast';
import {
  ORG_DEPARTMENT_OPTIONS,
  type OrganizationalDepartment,
} from '@/constants/organizationalDepartments';
import { CheckCircle2, UserPlus } from 'lucide-react';
import type { DepartmentWorkflow } from '@/features/administration/__mocks__/workflowSettingsFixtures';
import { addWorkflow } from '@/features/administration/store/workflowSettingsStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function AddWorkflowModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (workflow: DepartmentWorkflow) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<OrganizationalDepartment | ''>('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
    if (!name.trim() || !department) {
      toast.error('Required', 'Please enter a workflow name and choose a department.');
      return;
    }
    const id = `wf-custom-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const workflow: DepartmentWorkflow = {
      id,
      department,
      name: name.trim(),
      description: description.trim() || 'Configure the process flow for this workflow.',
      status: 'Active',
      workflowType: 'Custom',
      stages: [
        {
          id: `${id}-stg-1`,
          order: 1,
          title: 'Start',
          description: 'Workflow begins',
          icon: UserPlus,
          requirement: 'required',
          autoComplete: false,
        },
        {
          id: `${id}-stg-2`,
          order: 2,
          title: 'Complete',
          description: 'Workflow closed',
          icon: CheckCircle2,
          requirement: 'required',
          autoComplete: true,
        },
      ],
      settings: {
        allowStageReversion: false,
        requireCompletionInOrder: true,
        allowDraftSave: true,
        autoAssignNextStage: true,
      },
      createdBy: 'Admin User',
      createdAt: now,
      updatedAt: now,
      updatedBy: 'Admin User',
      performance: { totalExecutions: 0, completed: 0, inProgress: 0, cancelled: 0 },
    };
    addWorkflow(workflow);
    toast.success('Workflow added', `${workflow.name} has been created.`);
    onSubmit(workflow);
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
        style={{ maxWidth: 520, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Add New Workflow
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

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col gap-4">
            <FormField
              label="Workflow Name"
              htmlFor="new-workflow-name"
              required
              error={submitted && !name.trim() ? 'Required' : undefined}
            >
              <FormInput
                id="new-workflow-name"
                placeholder="e.g. COVID Triage Workflow"
                value={name}
                onChange={(e) => setName(e.target.value)}
                hasError={submitted && !name.trim()}
              />
            </FormField>

            <FormField
              label="Department"
              htmlFor="new-workflow-department"
              required
              error={submitted && !department ? 'Required' : undefined}
            >
              <FormSelect
                id="new-workflow-department"
                value={department}
                onChange={(v) => setDepartment(v as OrganizationalDepartment)}
                options={ORG_DEPARTMENT_OPTIONS}
                placeholder="Select department"
                hasError={submitted && !department}
              />
            </FormField>

            <FormField label="Description" htmlFor="new-workflow-description">
              <FormInput
                id="new-workflow-description"
                placeholder="What does this workflow cover?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            Add Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
