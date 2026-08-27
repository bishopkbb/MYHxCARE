'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { PreferenceToggle } from '@components/shared/PreferenceToggle';
import { useToast } from '@/hooks/useToast';
import {
  STAGE_ICON_OPTIONS,
  type StageRequirement,
  type WorkflowStage,
} from '@/features/administration/__mocks__/workflowSettingsFixtures';
import { updateStage } from '@/features/administration/store/workflowSettingsStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const REQUIREMENT_OPTIONS: { value: StageRequirement; label: string }[] = [
  { value: 'required', label: 'Required' },
  { value: 'optional', label: 'Optional' },
];

function iconKeyFor(icon: WorkflowStage['icon']): string {
  return STAGE_ICON_OPTIONS.find((o) => o.icon === icon)?.value ?? STAGE_ICON_OPTIONS[0]!.value;
}

export function EditStageModal({
  workflowId,
  stage,
  onClose,
}: {
  workflowId: string;
  stage: WorkflowStage;
  onClose: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(stage.title);
  const [description, setDescription] = useState(stage.description);
  const [iconKey, setIconKey] = useState(iconKeyFor(stage.icon));
  const [requirement, setRequirement] = useState<StageRequirement>(stage.requirement);
  const [autoComplete, setAutoComplete] = useState(stage.autoComplete);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
    if (!title.trim()) {
      toast.error('Required', 'Please enter a stage title.');
      return;
    }
    const icon = STAGE_ICON_OPTIONS.find((o) => o.value === iconKey)?.icon ?? stage.icon;
    updateStage(workflowId, stage.id, {
      title: title.trim(),
      description: description.trim() || stage.description,
      icon,
      requirement,
      autoComplete,
    });
    toast.success('Stage updated', `"${title.trim()}" has been updated.`);
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
            Edit Stage
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
              label="Stage Title"
              htmlFor="edit-stage-title"
              required
              error={submitted && !title.trim() ? 'Required' : undefined}
            >
              <FormInput
                id="edit-stage-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                hasError={submitted && !title.trim()}
              />
            </FormField>

            <FormField label="Description" htmlFor="edit-stage-description">
              <FormInput
                id="edit-stage-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>

            <div>
              <p
                className="mb-1.5 font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                Icon
              </p>
              <div className="flex flex-wrap gap-2">
                {STAGE_ICON_OPTIONS.map((opt) => {
                  const selected = opt.value === iconKey;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      aria-label={opt.label}
                      onClick={() => setIconKey(opt.value)}
                      className={`flex size-11 items-center justify-center rounded-[10px] transition-colors duration-150 ${FOCUS_RING}`}
                      style={{
                        background: selected ? '#E6F8FD' : '#FFFFFF',
                        border: selected ? '1px solid #00B4D8' : '1px solid rgba(0,100,130,0.18)',
                      }}
                    >
                      <Icon
                        style={{ width: 18, height: 18, color: selected ? '#00B4D8' : '#4A7080' }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <FormField label="Requirement" htmlFor="edit-stage-requirement">
              <FormSelect
                id="edit-stage-requirement"
                value={requirement}
                onChange={(v) => setRequirement(v as StageRequirement)}
                options={REQUIREMENT_OPTIONS}
                placeholder="Select requirement"
              />
            </FormField>

            <div
              className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Auto-complete
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>
                  This stage closes itself once its conditions are met.
                </p>
              </div>
              <PreferenceToggle
                on={autoComplete}
                onToggle={() => setAutoComplete((v) => !v)}
                ariaLabel="Auto-complete"
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
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
