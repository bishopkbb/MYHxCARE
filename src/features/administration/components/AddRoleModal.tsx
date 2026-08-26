'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useToast } from '@/hooks/useToast';
import {
  slugify,
  type AccessLevel,
  type ModuleKey,
  type RoleDefinition,
} from '@/features/administration/__mocks__/rolePermissionsFixtures';
import { addRole, useRoleDefinitions } from '@/features/administration/store/rolePermissionsStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const EMPTY_MATRIX: Record<ModuleKey, AccessLevel[]> = {
  'patients-records': ['none'],
  'clinical-work': ['none'],
  pharmacy: ['none'],
  laboratory: ['none'],
  'billing-revenue': ['none'],
  emergency: ['none'],
  wards: ['none'],
  reports: ['view'],
  administration: ['none'],
};

export function AddRoleModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (role: RoleDefinition) => void;
}) {
  const toast = useToast();
  const roles = useRoleDefinitions();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const copyFromOptions = [
    { value: '', label: 'Start with no access' },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  function handleSubmit() {
    setSubmitted(true);
    if (!name.trim()) {
      toast.error('Required', 'Please enter a role name.');
      return;
    }
    const template = roles.find((r) => r.id === copyFrom);
    const id = `${slugify(name)}-${Date.now().toString(36)}`;
    const role: RoleDefinition = {
      id,
      name: name.trim(),
      description: description.trim() || 'Custom role.',
      status: 'Active',
      permissionsByModule: template ? { ...template.permissionsByModule } : { ...EMPTY_MATRIX },
      customizedModules: [],
      departmentAccess: template ? [...template.departmentAccess] : [],
    };
    addRole(role);
    onSubmit(role);
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
            Add Role
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
              label="Role Name"
              htmlFor="new-role-name"
              required
              error={submitted && !name.trim() ? 'Required' : undefined}
            >
              <FormInput
                id="new-role-name"
                placeholder="e.g. Ward Clerk"
                value={name}
                onChange={(e) => setName(e.target.value)}
                hasError={submitted && !name.trim()}
              />
            </FormField>

            <FormField label="Description" htmlFor="new-role-description">
              <FormInput
                id="new-role-description"
                placeholder="What does this role do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>

            <FormField label="Copy Permissions From" htmlFor="new-role-copy-from">
              <FormSelect
                id="new-role-copy-from"
                value={copyFrom}
                onChange={setCopyFrom}
                options={copyFromOptions}
                placeholder="Start with no access"
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
            Add Role
          </button>
        </div>
      </div>
    </div>
  );
}
