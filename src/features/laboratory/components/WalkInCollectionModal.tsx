'use client';

import { ChevronLeft, Send, X } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { LAB_CATEGORIES, type Priority } from '@/features/laboratory/__mocks__/labOrderFixtures';
import { addLabOrder } from '@/features/laboratory/store/labResultStore';
import type { LabResultPriority } from '@/features/laboratory/__mocks__/labResultFixtures';
import { PatientPicker } from '@/features/medical-records/components/PatientPicker';
import type { DirectoryPatient } from '@/features/registration/__mocks__/patientDirectoryFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_TO_CANONICAL: Record<Priority, LabResultPriority> = {
  stat: 'STAT',
  urgent: 'URGENT',
  routine: 'ROUTINE',
};

const PRIORITY_ORDER: { value: Priority; label: string; activeBg: string; activeColor: string }[] =
  [
    { value: 'stat', label: 'STAT', activeBg: '#EF4444', activeColor: '#FFFFFF' },
    { value: 'urgent', label: 'Urgent', activeBg: '#D97706', activeColor: '#FFFFFF' },
    { value: 'routine', label: 'Routine', activeBg: '#E0F7FC', activeColor: '#0D2630' },
  ];

/** Fills the real gap a "Sample Collection" screen otherwise has: a walk-in
 * patient (already known to Registration, but with no prior doctor lab
 * order) has nothing to show up as pending here. Reuses the same, real
 * `addLabOrder()` store action the doctor's own "Send Request to Laboratory"
 * screen (`/lab/orders`) writes to — a walk-in requisition is a real
 * `ORDERED` row, attributed to the Lab Scientist, and lands in Pending
 * Collection like any other. */
export function WalkInCollectionModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const toast = useToast();

  const [patient, setPatient] = useState<DirectoryPatient | null>(null);
  const [priority, setPriority] = useState<Priority>('routine');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleTest(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (!patient) return;
    if (selected.size === 0) {
      toast.error('No tests selected', 'Select at least one test for this requisition.');
      return;
    }
    addLabOrder({
      patientId: patient.id,
      patientName: patient.name,
      mrn: patient.mrn,
      initials: patient.initials,
      avatarBg: patient.avatarBg,
      age: patient.age,
      gender: patient.gender,
      testIds: Array.from(selected),
      priority: PRIORITY_TO_CANONICAL[priority],
      orderedBy: user?.name ?? 'Lab Scientist',
      isWalkIn: true,
    });
    toast.success(
      'Requisition created',
      `${selected.size} test${selected.size !== 1 ? 's' : ''} added to Pending Collection for ${patient.name}.`,
    );
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
              Walk-in Collection
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              {patient
                ? `For ${patient.name} · ${patient.mrn}`
                : 'Select a patient to create a new requisition'}
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
          {!patient ? (
            <PatientPicker onSelect={setPatient} />
          ) : (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  setPatient(null);
                  setSelected(new Set());
                }}
                className={`flex w-fit items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8' }}
              >
                <ChevronLeft style={{ width: 15, height: 15 }} />
                Change Patient
              </button>

              <div>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Priority
                </p>
                <div className="mt-1.5 flex gap-2">
                  {PRIORITY_ORDER.map((p) => {
                    const isActive = priority === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={`flex h-11 flex-1 items-center justify-center rounded-[10px] font-sans font-semibold transition-colors duration-150 ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          background: isActive ? p.activeBg : '#FFFFFF',
                          color: isActive ? p.activeColor : '#2F3A40',
                          border: isActive
                            ? `2px solid ${p.activeBg}`
                            : '1px solid rgba(0,100,130,0.15)',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  Tests ({selected.size} selected)
                </p>
                <div className="mt-1.5 flex flex-col gap-3">
                  {LAB_CATEGORIES.map((category) => (
                    <div
                      key={category.id}
                      className="overflow-hidden rounded-[10px]"
                      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      <div className="px-3.5 py-2" style={{ background: 'rgba(226,237,241,0.4)' }}>
                        <span
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {category.title}
                        </span>
                      </div>
                      <div className="flex flex-col p-1.5">
                        {category.tests.map((test) => {
                          const isChecked = selected.has(test.id);
                          return (
                            <label
                              key={test.id}
                              className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 transition-colors duration-150"
                              style={{
                                background: isChecked ? 'rgba(0,180,216,0.06)' : 'transparent',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTest(test.id)}
                                className="size-4 shrink-0 accent-[#00B4D8]"
                              />
                              <span style={{ fontSize: 14, color: '#0D2630' }}>{test.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {patient && (
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
              <Send style={{ width: 15, height: 15 }} />
              Create Requisition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
