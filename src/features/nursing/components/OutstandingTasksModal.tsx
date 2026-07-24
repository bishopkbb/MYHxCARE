'use client';

import { Check, ClipboardList, X } from 'lucide-react';

import type { HandoverTask } from '@/features/nursing/__mocks__/shiftHandoverFixtures';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

export function OutstandingTasksModal({
  tasks,
  onToggle,
  onClose,
}: {
  tasks: HandoverTask[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const categories = Array.from(new Set(tasks.map((t) => t.category)));

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
          className="flex shrink-0 items-center justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center gap-2.5">
            <ClipboardList style={{ width: 20, height: 20, color: '#00B4D8' }} />
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Outstanding Tasks
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
          <div className="flex flex-col gap-5">
            {categories.map((category) => {
              const categoryTasks = tasks.filter((t) => t.category === category);
              const remaining = categoryTasks.filter((t) => !t.done).length;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {category}
                    </p>
                    <span style={{ fontSize: 14, color: '#8A98A3' }}>{remaining} remaining</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {categoryTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onToggle(task.id)}
                        className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      >
                        <span
                          className="flex size-5 shrink-0 items-center justify-center rounded-[6px]"
                          style={{
                            border: task.done ? 'none' : '1.5px solid rgba(0,100,130,0.3)',
                            background: task.done ? '#22C55E' : 'transparent',
                          }}
                        >
                          {task.done && (
                            <Check style={{ width: 13, height: 13, color: '#FFFFFF' }} />
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            color: task.done ? '#8A98A3' : '#2F3A40',
                            textDecoration: task.done ? 'line-through' : 'none',
                          }}
                        >
                          {task.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="flex shrink-0 justify-end px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ background: '#00B4D8', fontSize: 14 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
