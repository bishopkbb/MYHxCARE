'use client';

import { ChevronLeft, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import {
  CALENDAR_SLOT_META,
  type CalendarSlot,
  type DoctorShift,
} from '@/features/workforce/__mocks__/workforceFixtures';
import { ShiftCalendar } from '@/app/(hms)/duty-roster/ShiftCalendar';

const CreateShiftModal = dynamic(
  () => import('@/app/(hms)/duty-roster/CreateShiftModal').then((m) => m.CreateShiftModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const LEGEND_SLOTS: CalendarSlot[] = ['MORNING', 'AFTERNOON', 'NIGHT', 'ON_CALL'];

export default function DutyRosterCalendarPage() {
  const router = useRouter();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  function handleCreateShift(shift: DoctorShift) {
    setCreateOpen(false);
    toast.success('Shift created', `${shift.doctorName}'s shift has been added to today's roster.`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.dutyRoster)}
            className="mb-3 flex items-center gap-1.5 font-sans font-medium transition-opacity duration-150 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Back to Workforce Management
          </button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Duty Roster Calendar
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Full calendar view of department rosters, shift patterns, and staff availability.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ background: '#00B4D8', fontSize: 14 }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Create Shift
            </button>
          </div>

          {/* ── Legend ────────────────────────────────────────────────────── */}
          <div
            className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <span className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
              Legend:
            </span>
            {LEGEND_SLOTS.map((slot) => {
              const meta = CALENDAR_SLOT_META[slot];
              return (
                <div key={slot} className="flex items-center gap-1.5">
                  <span
                    className="shrink-0 rounded-[3px]"
                    style={{ width: 10, height: 10, background: meta.color }}
                  />
                  <span style={{ fontSize: 14, color: '#4A7080' }}>
                    {meta.label} · {meta.time}
                  </span>
                </div>
              );
            })}
          </div>

          <ShiftCalendar />

          <div className="h-4" />
        </div>
      </main>

      {createOpen && (
        <CreateShiftModal onClose={() => setCreateOpen(false)} onSave={handleCreateShift} />
      )}
    </div>
  );
}
