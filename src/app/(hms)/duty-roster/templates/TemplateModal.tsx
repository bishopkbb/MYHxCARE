'use client';

import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  CALENDAR_SLOT_META,
  DEPARTMENT_OPTIONS,
  type CalendarSlot,
  type ShiftTemplate,
  type TemplateSlotRequirement,
} from '@/features/workforce/__mocks__/workforceFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const FIELD_BASE: React.CSSProperties = {
  height: 44,
  border: '1px solid #0064821F',
  borderRadius: 10,
  background: '#FFFFFF',
  color: '#0D2630',
  fontSize: 14,
  lineHeight: '22px',
  padding: '0 12px',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
};

const SLOT_OPTIONS: CalendarSlot[] = ['MORNING', 'AFTERNOON', 'NIGHT', 'ON_CALL'];

export function TemplateModal({
  editingTemplate,
  onClose,
  onSave,
}: {
  editingTemplate?: ShiftTemplate;
  onClose: () => void;
  onSave: (template: ShiftTemplate) => void;
}) {
  const isEditing = Boolean(editingTemplate);
  const toast = useToast();
  const [name, setName] = useState(editingTemplate?.name ?? '');
  const [description, setDescription] = useState(editingTemplate?.description ?? '');
  const [department, setDepartment] = useState(
    editingTemplate?.department ?? DEPARTMENT_OPTIONS[0]!,
  );
  const [active, setActive] = useState(editingTemplate?.active ?? true);
  const [slots, setSlots] = useState<TemplateSlotRequirement[]>(
    editingTemplate?.slots ?? [{ slot: 'MORNING', role: '', count: 1 }],
  );

  function updateSlot(idx: number, patch: Partial<TemplateSlotRequirement>) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addSlot() {
    setSlots((prev) => [...prev, { slot: 'MORNING', role: '', count: 1 }]);
  }

  function removeSlot(idx: number) {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error('Required', 'Please name this template.');
      return;
    }
    const cleanSlots = slots.filter((s) => s.role.trim());
    if (cleanSlots.length === 0) {
      toast.error('Required', 'Add at least one shift slot with a role.');
      return;
    }
    const template: ShiftTemplate = {
      id: editingTemplate?.id ?? `tpl-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      department,
      slots: cleanSlots,
      active,
      timesUsed: editingTemplate?.timesUsed ?? 0,
      lastUsed: editingTemplate?.lastUsed ?? null,
    };
    onSave(template);
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
        className="flex w-full flex-col gap-5 overflow-y-auto scroll-smooth bg-white"
        style={{ maxWidth: 620, maxHeight: 'calc(100vh - 64px)', borderRadius: 16, padding: 24 }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 22, lineHeight: '30px', color: '#0D2630' }}
          >
            {isEditing ? 'Edit Shift Template' : 'New Shift Template'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`shrink-0 rounded-full p-1 transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div>
          <p className="mb-1.5 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            Template Name
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Weekday — General OPD"
            className="transition-[border-color] placeholder:text-[#8A98A3]"
            style={FIELD_BASE}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
          />
        </div>

        <div>
          <p className="mb-1.5 font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            Description
          </p>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this template covers"
            className="transition-[border-color] placeholder:text-[#8A98A3]"
            style={FIELD_BASE}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p
              className="mb-1.5 font-sans font-semibold"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Department
            </p>
            <div className="relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full appearance-none transition-[border-color]"
                style={{ ...FIELD_BASE, paddingRight: 36, cursor: 'pointer' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#00B4D8')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#0064821F')}
              >
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                style={{ width: 16, height: 16, color: '#8A98A3' }}
              />
            </div>
          </div>

          <div>
            <p
              className="mb-1.5 font-sans font-semibold"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Status
            </p>
            <button
              type="button"
              onClick={() => setActive((v) => !v)}
              className={`flex items-center gap-2.5 rounded-[10px] px-3.5 transition-colors duration-150 ${FOCUS_RING}`}
              style={{ ...FIELD_BASE, cursor: 'pointer' }}
            >
              <span
                className="relative shrink-0 rounded-full transition-colors duration-150"
                style={{ width: 36, height: 20, background: active ? '#00B4D8' : '#D1D5DB' }}
              >
                <span
                  className="absolute rounded-full bg-white transition-[left] duration-150"
                  style={{ width: 16, height: 16, top: 2, left: active ? 18 : 2 }}
                />
              </span>
              {active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              Shift Slots
            </p>
            <button
              type="button"
              onClick={addSlot}
              className={`flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#00B4D8' }}
            >
              <Plus style={{ width: 15, height: 15 }} />
              Add Slot
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {slots.map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="relative" style={{ width: 130 }}>
                  <select
                    value={slot.slot}
                    onChange={(e) => updateSlot(idx, { slot: e.target.value as CalendarSlot })}
                    className="w-full appearance-none transition-[border-color]"
                    style={{ ...FIELD_BASE, height: 40, paddingRight: 30, cursor: 'pointer' }}
                  >
                    {SLOT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {CALENDAR_SLOT_META[s].label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                    style={{ width: 14, height: 14, color: '#8A98A3' }}
                  />
                </div>
                <input
                  type="text"
                  value={slot.role}
                  onChange={(e) => updateSlot(idx, { role: e.target.value })}
                  placeholder="Required role"
                  className="min-w-0 flex-1 transition-[border-color] placeholder:text-[#8A98A3]"
                  style={{ ...FIELD_BASE, height: 40 }}
                />
                <input
                  type="number"
                  min={1}
                  value={slot.count}
                  onChange={(e) =>
                    updateSlot(idx, { count: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="shrink-0 text-center transition-[border-color]"
                  style={{ ...FIELD_BASE, height: 40, width: 64, padding: 0 }}
                />
                <button
                  type="button"
                  onClick={() => removeSlot(idx)}
                  aria-label="Remove slot"
                  disabled={slots.length === 1}
                  className={`flex size-10 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS_RING}`}
                >
                  <Trash2 style={{ width: 16, height: 16, color: '#EF4444' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex flex-wrap justify-end gap-3"
          style={{ borderTop: '1px solid #0064821F', paddingTop: 16 }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`font-sans font-semibold transition-colors duration-150 hover:bg-[rgba(0,0,0,0.04)] ${FOCUS_RING}`}
            style={{
              height: 44,
              borderRadius: 12,
              padding: '0 20px',
              background: '#FFFFFF',
              border: '1px solid #0064821F',
              fontSize: 14,
              color: '#0D2630',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className={`font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{
              height: 44,
              borderRadius: 12,
              padding: '0 20px',
              background: '#00B4D8',
              fontSize: 14,
            }}
          >
            {isEditing ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
