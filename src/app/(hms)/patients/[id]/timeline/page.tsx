'use client';

import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  Download,
  History,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import {
  FALLBACK_PATIENT_DETAIL,
  MOCK_PATIENT_DETAILS,
} from '@/features/patients/__mocks__/patientFixtures';
import {
  FALLBACK_TIMELINE_EVENTS,
  MOCK_TIMELINE_EVENTS,
  TIMELINE_CATEGORY_CONFIG,
  TIMELINE_FILTERS,
  type TimelineFilterKey,
} from '@/features/clinical-timeline/__mocks__/clinicalTimelineFixtures';
import { downloadPDF, escapeHtml } from '@/utils/export';

// ── Types ──────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** "Jun 30, 2026" — WAT-pinned, assembled from explicit parts (never en-US). */
function formatTimelineDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+01:00`);
  const month = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    month: 'short',
  }).format(d);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric' }).format(
    d,
  );
  const year = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
  }).format(d);
  return `${month} ${day}, ${year}`;
}

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonRow({ isLast }: { isLast: boolean }) {
  return (
    <div className="flex gap-8">
      <div className="flex w-6 shrink-0 justify-center">
        <div className="mt-4 size-6 shrink-0 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div
        className="min-w-0 flex-1 animate-pulse rounded-[12px] p-4"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(0,100,130,0.12)',
          marginBottom: isLast ? 0 : 16,
        }}
      >
        <div className="h-7 w-64 rounded-md bg-slate-100" />
        <div className="mt-3 h-5 w-full max-w-md rounded-md bg-slate-100" />
        <div className="mt-2 h-4 w-32 rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ClinicalTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const patient = MOCK_PATIENT_DETAILS[id] ?? FALLBACK_PATIENT_DETAIL;
  const allEvents = MOCK_TIMELINE_EVENTS[id] ?? FALLBACK_TIMELINE_EVENTS;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [activeFilter, setActiveFilter] = useState<TimelineFilterKey>('ALL');

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  const filteredEvents = useMemo(
    () =>
      activeFilter === 'ALL' ? allEvents : allEvents.filter((e) => e.category === activeFilter),
    [allEvents, activeFilter],
  );

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  function handleExport() {
    const filterLabel = TIMELINE_FILTERS.find((f) => f.key === activeFilter)?.label ?? 'All Events';
    const rows = filteredEvents
      .map(
        (e) => `<tr>
          <td>${escapeHtml(TIMELINE_CATEGORY_CONFIG[e.category].label)}</td>
          <td>${escapeHtml(e.title)}</td>
          <td>${escapeHtml(formatTimelineDate(e.date))} ${escapeHtml(e.time)}</td>
          <td>${escapeHtml(e.description)}</td>
          <td>${escapeHtml(e.actor)}</td>
        </tr>`,
      )
      .join('');
    downloadPDF(
      `Clinical-Timeline-${patient.mrn}`,
      `<h1>Clinical Timeline</h1>
       <p class="meta">${escapeHtml(patient.name)} · ${escapeHtml(patient.mrn)} — ${escapeHtml(filterLabel)}</p>
       <hr />
       <table>
         <thead><tr><th>Category</th><th>Event</th><th>When</th><th>Details</th><th>Recorded By</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`,
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: '#F5FBFD' }}>
      {/* ── Patient preview bar ────────────────────────────────────────────────── */}
      <div
        className="px-5 py-[10px] sm:flex sm:min-h-[60px] sm:items-center sm:gap-x-4 sm:py-2"
        style={{ background: '#1A3D4D', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex shrink-0 items-center gap-1.5 rounded focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            <ChevronLeft style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.58)' }} />
            <span className="text-sm leading-[22px]" style={{ color: 'rgba(255,255,255,0.58)' }}>
              Back to Queue
            </span>
          </button>

          <div
            className="shrink-0"
            style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.18)' }}
          />

          <div
            className="flex shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
            style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)' }}
          >
            {patient.initials}
          </div>

          <span
            className="min-w-0 flex-1 truncate font-normal text-white sm:hidden"
            style={{ fontSize: 16, lineHeight: '24px' }}
          >
            {patient.name}
          </span>

          {patient.isUrgent && (
            <span
              className="shrink-0 text-sm font-medium sm:hidden"
              style={{
                borderRadius: 4,
                padding: '4px 10px',
                background: 'rgba(245,158,11,0.30)',
                border: '1px solid rgba(245,158,11,0.45)',
                color: '#FCD34D',
              }}
            >
              URGENT
            </span>
          )}
        </div>

        <div className="mt-1.5 flex min-w-0 [scrollbar-width:none] flex-wrap items-center gap-x-3 gap-y-0.5 sm:mt-0 sm:flex-1 sm:flex-nowrap sm:gap-x-4 sm:overflow-x-auto sm:scroll-smooth sm:whitespace-nowrap [&::-webkit-scrollbar]:hidden">
          <span
            className="hidden shrink-0 font-normal text-white sm:inline"
            style={{ fontSize: 18, lineHeight: '28px' }}
          >
            {patient.name}
          </span>
          <span
            className="shrink-0 text-sm leading-[22px] sm:text-base"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.mrn}
          </span>
          <span
            className="shrink-0 text-sm leading-[22px] sm:text-base"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.age} · {patient.gender}
          </span>
          <span
            className="shrink-0 text-sm leading-[22px] sm:text-base"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            BG: {patient.bloodGroup}
          </span>

          {patient.allergies.length > 0 && (
            <>
              <AlertTriangle
                aria-hidden
                style={{ width: 18, height: 18, color: '#FCA5A5', flexShrink: 0 }}
              />
              <span
                className="shrink-0 text-sm font-medium sm:hidden"
                style={{
                  borderRadius: 4,
                  padding: '3px 8px',
                  background: 'rgba(239,68,68,0.28)',
                  border: '1px solid rgba(239,68,68,0.40)',
                  color: '#FCA5A5',
                }}
              >
                {patient.allergies.length === 1
                  ? '1 allergy'
                  : `${patient.allergies.length} allergies`}
              </span>
              {patient.allergies.slice(0, 2).map((a) => (
                <span
                  key={a.id}
                  className="hidden shrink-0 text-sm font-medium sm:inline"
                  style={{
                    borderRadius: 4,
                    padding: '3px 8px',
                    background: 'rgba(239,68,68,0.28)',
                    border: '1px solid rgba(239,68,68,0.40)',
                    color: '#FCA5A5',
                  }}
                >
                  {a.substance}
                </span>
              ))}
              {patient.allergies.length > 2 && (
                <span
                  className="hidden shrink-0 text-sm sm:inline"
                  style={{ color: 'rgba(255,255,255,0.52)' }}
                >
                  +{patient.allergies.length - 2} more
                </span>
              )}
            </>
          )}
        </div>

        {patient.isUrgent && (
          <span
            className="hidden shrink-0 text-sm font-bold tracking-wide uppercase sm:ml-auto sm:inline"
            style={{
              borderRadius: 4,
              padding: '4px 10px',
              background: 'rgba(245,158,11,0.30)',
              border: '1px solid rgba(245,158,11,0.45)',
              color: '#FCD34D',
            }}
          >
            URGENT
          </span>
        )}
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          {/* ── Page header ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="font-display font-bold"
                style={{ fontSize: 28, lineHeight: '36px', color: '#0D2630' }}
              >
                Clinical Timeline
              </h1>
              <p
                className="mt-1 text-sm leading-5.5 sm:text-base sm:leading-6"
                style={{ color: '#4A7080' }}
              >
                Complete history for {patient.name} · {patient.mrn}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={pageState !== 'loaded' || filteredEvents.length === 0}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-4 text-sm leading-5.5 font-medium transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              style={{
                border: '1px solid rgba(0,100,130,0.20)',
                color: '#0D2630',
                background: '#FFFFFF',
              }}
            >
              <Download style={{ width: 16, height: 16 }} />
              Export
            </button>
          </div>

          {/* ── Allergy banner — patient-safety non-negotiable ───────────────── */}
          <div className="mt-4">
            <AllergyBanner allergies={patient.allergies} />
          </div>

          {/* ── Category filter tabs ─────────────────────────────────────────── */}
          <div className="mt-6 flex [scrollbar-width:none] flex-nowrap gap-[50px] overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden">
            {TIMELINE_FILTERS.map((f) => {
              const active = activeFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveFilter(f.key)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm leading-5.5 font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                  style={
                    active
                      ? { background: f.color, border: `1px solid ${f.color}`, color: '#FFFFFF' }
                      : { background: '#FFFFFF', border: `1px solid ${f.color}66`, color: f.color }
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* ── Timeline ──────────────────────────────────────────────────────── */}
          {pageState === 'loading' ? (
            <div className="mt-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonRow key={i} isLast={i === 2} />
              ))}
            </div>
          ) : pageState === 'error' ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 py-10 text-center">
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load clinical timeline
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className={`flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                style={{
                  height: 40,
                  borderRadius: 12,
                  padding: '0 20px',
                  background: '#00B4D8',
                  fontSize: 14,
                  lineHeight: '22px',
                }}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Retry
              </button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-[12px] bg-white py-16 text-center">
              <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(226,237,241,0.6)' }}
              >
                <History style={{ width: 24, height: 24, color: '#8A98A3' }} />
              </div>
              <div>
                <p className="text-base leading-6 font-medium" style={{ color: '#4A7080' }}>
                  No {TIMELINE_FILTERS.find((f) => f.key === activeFilter)?.label.toLowerCase()}{' '}
                  events recorded
                </p>
                <p className="mt-0.5 text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                  Try a different category, or view the complete history
                </p>
              </div>
              {activeFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`mt-1 text-sm font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ color: '#00B4D8' }}
                >
                  Clear filter — show all events
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6">
              {filteredEvents.map((event, idx) => {
                const cfg = TIMELINE_CATEGORY_CONFIG[event.category];
                const isLast = idx === filteredEvents.length - 1;
                return (
                  <div key={event.id} className="flex gap-8">
                    {/* Dot + connecting line */}
                    <div className="relative flex w-6 shrink-0 justify-center">
                      <div
                        className="z-10 mt-4 size-6 shrink-0 rounded-full border-[3px] border-white"
                        style={{
                          background: cfg.color,
                          boxShadow: '0 1px 3px 0px rgba(0,0,0,0.10)',
                        }}
                      />
                      {!isLast && (
                        <div
                          className="absolute top-4 left-1/2 w-px -translate-x-1/2"
                          style={{
                            background: 'rgba(0,100,130,0.15)',
                            height: 'calc(100% + 16px)',
                          }}
                        />
                      )}
                    </div>

                    {/* Event card */}
                    <div
                      className="min-w-0 flex-1 rounded-[12px] p-4"
                      style={{
                        background: '#FFFFFF',
                        border: `1px solid ${cfg.cardBorder ?? 'rgba(0,100,130,0.12)'}`,
                        marginBottom: isLast ? 0 : 16,
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-sm leading-5.5 font-medium whitespace-nowrap"
                            style={{ background: cfg.badgeBg, color: cfg.color }}
                          >
                            {cfg.label.toUpperCase()}
                          </span>
                          <span
                            className="min-w-0 text-base leading-6 font-semibold"
                            style={{ color: '#0D2630' }}
                          >
                            {event.title}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm leading-5.5" style={{ color: '#2F3A40' }}>
                            {formatTimelineDate(event.date)}
                          </p>
                          <p className="text-sm leading-5.5" style={{ color: '#2F3A40' }}>
                            {event.time}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-base leading-6" style={{ color: '#2F3A40' }}>
                        {event.description}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <UserRound style={{ width: 14, height: 14, color: '#2F3A40' }} />
                        <span className="text-sm leading-5.5" style={{ color: '#2F3A40' }}>
                          {event.actor}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
