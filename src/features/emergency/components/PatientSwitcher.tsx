'use client';

import { Check, ChevronDown, Search, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { derivePriorityForEntry } from '@/features/emergency/__mocks__/emergencyFixtures';
import { useTriageRecords } from '@/features/emergency/store/triageAssessmentStore';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import { getTriageDisplay, triageSortWeight, type TriagePriority } from '@/utils/triage';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const PRIORITY_COLOR: Record<TriagePriority, string> = {
  IMMEDIATE: '#DC2626',
  URGENT: '#D97706',
  LESS_URGENT: '#F59E0B',
  NON_URGENT: '#16A34A',
};
const PRIORITY_BG: Record<TriagePriority, string> = {
  IMMEDIATE: 'rgba(220,38,38,0.08)',
  URGENT: 'rgba(217,119,6,0.08)',
  LESS_URGENT: 'rgba(245,158,11,0.08)',
  NON_URGENT: 'rgba(22,163,74,0.08)',
};

/** Every per-patient Emergency screen (Medication Orders, Procedures,
 * Clinical Notes, Diagnostic Requests, ...) defaults to `?entryId=` or the
 * highest-priority patient in queue with no way to switch patients short of
 * navigating back to Patient Queue. This is the shared fix — a searchable
 * dropdown of every current ED patient, swapping `?entryId=` on the same
 * route via `router.push`, so it works unmodified on any of those screens. */
export function PatientSwitcher({ currentEntryId }: { currentEntryId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const allEntries = useQueueEntries();
  const triageRecords = useTriageRecords();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const emergencyEntries = allEntries
    .filter((e) => e.isEmergency)
    .sort(
      (a, b) =>
        triageSortWeight(triageRecords.get(a.id)?.priority ?? derivePriorityForEntry(a.id)) -
        triageSortWeight(triageRecords.get(b.id)?.priority ?? derivePriorityForEntry(b.id)),
    );

  const q = query.trim().toLowerCase();
  const filtered = emergencyEntries.filter(
    (e) => !q || e.patientName.toLowerCase().includes(q) || e.mrn.toLowerCase().includes(q),
  );

  function selectEntry(id: string) {
    router.push(`${pathname}?entryId=${id}`);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
        style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
      >
        <Users style={{ width: 14, height: 14 }} />
        Switch Patient
        <ChevronDown style={{ width: 13, height: 13 }} />
      </button>

      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-80 overflow-hidden rounded-[12px] bg-white duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div className="p-2.5" style={{ borderBottom: '1px solid rgba(0,100,130,0.1)' }}>
            <div className="relative">
              <Search
                style={{
                  width: 14,
                  height: 14,
                  color: '#8A98A3',
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or MRN..."
                className={`h-9 w-full rounded-[8px] py-1.5 pr-3 pl-8 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
              />
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto scroll-smooth py-1.5">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                No matching patients in the ED queue.
              </p>
            ) : (
              filtered.map((e) => {
                const priority = triageRecords.get(e.id)?.priority ?? derivePriorityForEntry(e.id);
                const isCurrent = e.id === currentEntryId;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => selectEntry(e.id)}
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ background: isCurrent ? 'rgba(0,180,216,0.06)' : 'transparent' }}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                      style={{ background: PRIORITY_COLOR[priority], fontSize: 14 }}
                    >
                      {e.patientName
                        .split(/\s+/)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {e.patientName}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        {e.mrn} · {e.age}Y / {e.gender[0]}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
                      style={{
                        fontSize: 14,
                        color: PRIORITY_COLOR[priority],
                        background: PRIORITY_BG[priority],
                      }}
                    >
                      {getTriageDisplay(priority).label}
                    </span>
                    {isCurrent && (
                      <Check
                        style={{ width: 15, height: 15, color: '#00B4D8' }}
                        className="shrink-0"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
