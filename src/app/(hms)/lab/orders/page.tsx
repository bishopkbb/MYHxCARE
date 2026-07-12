'use client';

import { AlertCircle, AlertTriangle, Check, ChevronLeft, RefreshCw, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import {
  LAB_CATEGORIES,
  MOCK_LAB_PATIENT,
  type LabCategory,
  type Priority,
} from '@/features/laboratory/__mocks__/labOrderFixtures';

// ── Priority config ───────────────────────────────────────────────────────────

type PriorityCfg = {
  label: string;
  activeBg: string;
  activeBorder: string;
  activeColor: string;
  warning?: string;
};

const PRIORITY_CFG: Record<Priority, PriorityCfg> = {
  stat: {
    label: 'STAT',
    activeBg: '#FB2C36',
    activeBorder: '#FB2C36',
    activeColor: '#FFFFFF',
    warning: 'STAT: For life-threatening conditions only — processed immediately.',
  },
  urgent: {
    label: 'Urgent',
    activeBg: '#FE9A00',
    activeBorder: '#FE9A00',
    activeColor: '#FFFFFF',
  },
  routine: {
    label: 'Routine',
    activeBg: '#E0F7FC',
    activeBorder: '#00B4D8',
    activeColor: '#0D2630',
  },
};

const PRIORITY_ORDER: Priority[] = ['stat', 'urgent', 'routine'];

type PageState = 'loading' | 'loaded' | 'error';

// ── Checkbox ──────────────────────────────────────────────────────────────────

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="flex shrink-0 items-center justify-center transition-colors"
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        border: checked ? '2px solid #00B4D8' : '2px solid rgba(0,100,130,0.15)',
        background: checked ? '#00B4D8' : '#FFFFFF',
      }}
    >
      {checked && <Check style={{ width: 14, height: 14, color: '#FFFFFF', strokeWidth: 3 }} />}
    </button>
  );
}

// ── Lab Category Card ─────────────────────────────────────────────────────────

function LabCard({
  category,
  selected,
  onToggle,
}: {
  category: LabCategory;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        borderRadius: 12,
        border: '1px solid rgba(0,100,130,0.12)',
        background: '#FFFFFF',
      }}
    >
      {/* Card header */}
      <div
        className="shrink-0 px-4"
        style={{
          background: '#E2EDF180',
          borderBottom: '1px solid rgba(0,100,130,0.12)',
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <span
          className="font-display font-semibold"
          style={{ fontSize: 16, lineHeight: '24px', color: '#2F3A40' }}
        >
          {category.title}
        </span>
      </div>

      {/* Test list */}
      <div className="flex flex-col p-3">
        {category.tests.map((test) => {
          const isChecked = selected.has(test.id);
          return (
            <div
              key={test.id}
              onClick={() => onToggle(test.id)}
              className="flex w-full cursor-pointer items-center gap-[10px] text-left transition-colors"
              style={{
                borderRadius: 8,
                padding: '8px 12px',
                background: isChecked ? 'rgba(0,180,216,0.04)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isChecked)
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0,180,216,0.04)';
              }}
              onMouseLeave={(e) => {
                if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <Checkbox checked={isChecked} onChange={() => onToggle(test.id)} />
              <span
                className="font-sans font-normal"
                style={{ fontSize: 16, lineHeight: '24px', color: '#2F3A40' }}
              >
                {test.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeleton Lab Card ─────────────────────────────────────────────────────────

const SK_TEST_WIDTHS = [90, 140, 110, 120, 80] as const;

function SkeletonLabCard() {
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ borderRadius: 12, border: '1px solid rgba(0,100,130,0.12)', background: '#FFFFFF' }}
    >
      <div
        className="shrink-0 px-4"
        style={{
          background: '#E2EDF180',
          borderBottom: '1px solid rgba(0,100,130,0.12)',
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <div className="animate-pulse rounded bg-slate-200" style={{ width: 120, height: 18 }} />
      </div>
      <div className="flex flex-col p-3">
        {SK_TEST_WIDTHS.map((w, i) => (
          <div
            key={i}
            className="flex items-center gap-[10px]"
            style={{ borderRadius: 8, padding: '8px 12px' }}
          >
            <div
              className="shrink-0 animate-pulse bg-slate-200"
              style={{ width: 24, height: 24, borderRadius: 4 }}
            />
            <div className="animate-pulse rounded bg-slate-200" style={{ width: w, height: 20 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LabOrdersPage() {
  const router = useRouter();
  const toast = useToast();

  const [priority, setPriority] = useState<Priority>('stat');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const patient = MOCK_LAB_PATIENT;
  const totalSelected = selected.size;

  function toggleTest(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (totalSelected === 0) {
      toast.error('No tests selected', 'Please select at least one test to submit.');
      return;
    }
    toast.success(
      'Request sent',
      `${totalSelected} test${totalSelected !== 1 ? 's' : ''} dispatched to the laboratory at ${PRIORITY_CFG[priority].label} priority.`,
    );
    setSelected(new Set());
    setNotes('');
    setPriority('routine');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Patient preview bar ──────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-4 py-[10px] sm:flex sm:min-h-[56px] sm:items-center sm:gap-4 sm:px-5 sm:py-0"
        style={{ background: '#1A3D4D', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
      >
        {/* Row 1 (mobile) / nav block (sm+) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex shrink-0 items-center gap-1.5"
          >
            <ChevronLeft style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.58)' }} />
            <span
              className="font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: 'rgba(255,255,255,0.58)' }}
            >
              Back to Queue
            </span>
          </button>

          <div
            className="shrink-0"
            style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.18)' }}
          />

          {/* Avatar */}
          <div
            className="flex shrink-0 items-center justify-center rounded-full font-sans font-medium text-white"
            style={{
              width: 38,
              height: 38,
              background: 'rgba(255,255,255,0.15)',
              fontSize: 14,
              lineHeight: '22px',
            }}
          >
            {patient.initials}
          </div>

          {/* Name — mobile only */}
          <span
            className="min-w-0 flex-1 truncate font-sans text-white sm:hidden"
            style={{ fontSize: 15, lineHeight: '22px' }}
          >
            {patient.name}
          </span>

          {/* URGENT — mobile inline */}
          {patient.isUrgent && (
            <span
              className="shrink-0 font-sans font-medium sm:hidden"
              style={{
                fontSize: 14,
                lineHeight: '20px',
                borderRadius: 4,
                padding: '2px 8px',
                background: 'rgba(245,158,11,0.30)',
                border: '1px solid rgba(245,158,11,0.45)',
                color: '#FCD34D',
              }}
            >
              URGENT
            </span>
          )}
        </div>

        {/* Row 2 (mobile) / info strip (sm+) */}
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 sm:mt-0 sm:flex-1 sm:gap-x-4">
          {/* Name — sm+ */}
          <span
            className="hidden shrink-0 font-sans text-white sm:inline"
            style={{ fontSize: 16, lineHeight: '24px' }}
          >
            {patient.name}
          </span>

          <span
            className="shrink-0 font-sans"
            style={{ fontSize: 14, lineHeight: '22px', color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.mrn}
          </span>
          <span
            className="shrink-0 font-sans"
            style={{ fontSize: 14, lineHeight: '22px', color: 'rgba(255,255,255,0.52)' }}
          >
            {patient.age} · {patient.gender}
          </span>
          <span
            className="shrink-0 font-sans"
            style={{ fontSize: 14, lineHeight: '22px', color: 'rgba(255,255,255,0.52)' }}
          >
            BG: {patient.bloodGroup}
          </span>

          {patient.allergies.length > 0 && (
            <>
              <AlertTriangle style={{ width: 16, height: 16, color: '#FCA5A5', flexShrink: 0 }} />
              {/* Mobile: count chip */}
              <span
                className="font-sans font-medium sm:hidden"
                style={{
                  fontSize: 14,
                  lineHeight: '20px',
                  borderRadius: 4,
                  padding: '2px 8px',
                  background: 'rgba(239,68,68,0.28)',
                  border: '1px solid rgba(239,68,68,0.40)',
                  color: '#FCA5A5',
                }}
              >
                {patient.allergies.length === 1
                  ? '1 allergy'
                  : `${patient.allergies.length} allergies`}
              </span>
              {/* sm+: individual pills */}
              {patient.allergies.map((a) => (
                <span
                  key={a}
                  className="hidden shrink-0 font-sans font-medium sm:inline"
                  style={{
                    fontSize: 14,
                    lineHeight: '22px',
                    borderRadius: 4,
                    padding: '3px 8px',
                    background: 'rgba(239,68,68,0.28)',
                    border: '1px solid rgba(239,68,68,0.40)',
                    color: '#FCA5A5',
                  }}
                >
                  {a}
                </span>
              ))}
            </>
          )}
        </div>

        {/* URGENT badge — sm+ right slot */}
        {patient.isUrgent && (
          <span
            className="hidden shrink-0 font-sans font-semibold sm:inline"
            style={{
              fontSize: 14,
              lineHeight: '20px',
              borderRadius: 6,
              padding: '4px 12px',
              background: 'rgba(245,158,11,0.22)',
              border: '1px solid rgba(245,158,11,0.40)',
              color: '#FCD34D',
              letterSpacing: '0.5px',
            }}
          >
            URGENT
          </span>
        )}
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px]">
          {/* ── Page header ─────────────────────────────────────────────────── */}
          <div
            className="px-4 sm:px-6"
            style={{
              background: '#FFFFFF',
              borderBottom: '1px solid rgba(0,100,130,0.12)',
              paddingTop: 16,
              paddingBottom: 16,
              minHeight: 88,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Laboratory Request
            </h1>
            <p
              className="mt-0.5 font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
            >
              For {patient.name} · {patient.mrn}
            </p>
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5">
            {/* ── Request Priority ─────────────────────────────────────────── */}
            <div
              className="mb-4"
              style={{
                borderRadius: 12,
                border: '1px solid rgba(0,100,130,0.12)',
                background: '#FFFFFF',
                padding: 16,
              }}
            >
              <p
                className="font-display font-semibold"
                style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630', marginBottom: 12 }}
              >
                Request Priority
              </p>

              {/* Priority buttons */}
              <div className="flex gap-2">
                {PRIORITY_ORDER.map((p) => {
                  const c = PRIORITY_CFG[p];
                  const isActive = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className="flex flex-1 items-center justify-center font-sans font-semibold transition-all"
                      style={{
                        height: 48,
                        borderRadius: 12,
                        fontSize: 16,
                        lineHeight: '24px',
                        background: isActive ? c.activeBg : '#FFFFFF',
                        border: isActive
                          ? `2px solid ${c.activeBorder}`
                          : '1px solid rgba(0,100,130,0.15)',
                        color: isActive ? c.activeColor : '#2F3A40',
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* STAT warning */}
              {priority === 'stat' && (
                <div className="mt-3 flex items-center gap-2">
                  <AlertTriangle
                    style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0 }}
                  />
                  <p
                    className="font-sans"
                    style={{ fontSize: 14, lineHeight: '22px', color: '#EF4444' }}
                  >
                    {PRIORITY_CFG.stat.warning}
                  </p>
                </div>
              )}
            </div>

            {/* ── Lab category cards ───────────────────────────────────────── */}
            {pageState === 'loading' && (
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonLabCard key={i} />
                ))}
              </div>
            )}
            {pageState === 'error' && (
              <div className="mb-4 flex flex-col items-center justify-center gap-3 py-12 text-center">
                <AlertCircle style={{ width: 40, height: 40, color: '#EF4444' }} />
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  Failed to load lab tests
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity hover:opacity-80"
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
            )}
            {pageState === 'loaded' && (
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {LAB_CATEGORIES.map((cat) => (
                  <LabCard key={cat.id} category={cat} selected={selected} onToggle={toggleTest} />
                ))}
              </div>
            )}

            {/* ── Clinical Notes for Laboratory ────────────────────────────── */}
            <div
              className="mb-4"
              style={{
                borderRadius: 12,
                border: '1px solid rgba(0,100,130,0.12)',
                background: '#FFFFFF',
                padding: 16,
              }}
            >
              <p
                className="font-sans font-semibold"
                style={{
                  fontSize: 16,
                  lineHeight: '24px',
                  color: '#2F3A40',
                  paddingBottom: 8,
                }}
              >
                Clinical Notes for Laboratory
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Clinical indication, relevant history, suspected diagnosis for the laboratory team…"
                className="w-full resize-none font-sans outline-none placeholder:font-sans"
                style={{
                  minHeight: 96,
                  borderRadius: 12,
                  border: '1px solid rgba(0,100,130,0.12)',
                  padding: '10px 12px',
                  fontSize: 14,
                  lineHeight: '22px',
                  color: '#0D2630',
                  background: '#FFFFFF',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid #00B4D8';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(0,100,130,0.12)';
                }}
              />
            </div>

            {/* ── Submit row ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
              {/* Selection count */}
              <p
                className="font-sans"
                style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
              >
                {totalSelected === 0
                  ? 'No tests selected'
                  : `${totalSelected} test${totalSelected !== 1 ? 's' : ''} selected`}
              </p>

              <button
                type="button"
                onClick={handleSubmit}
                className="flex shrink-0 items-center gap-2.5 font-sans font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  height: 44,
                  borderRadius: 12,
                  padding: '0 24px',
                  background: '#00B4D8',
                  fontSize: 14,
                  lineHeight: '22px',
                  boxShadow: '0px 4px 20px 0px rgba(0,180,216,0.30)',
                  whiteSpace: 'nowrap',
                }}
              >
                <Send style={{ width: 16, height: 16, flexShrink: 0 }} />
                Send Request to Laboratory
              </button>
            </div>

            <div className="h-6" />
          </div>
        </div>
      </main>
    </div>
  );
}
