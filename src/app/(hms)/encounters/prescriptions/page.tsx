'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AllergyBanner } from '@components/clinical/AllergyBanner';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { useToast } from '@/hooks/useToast';
import {
  ADDITIONAL_OPTION_DEFS,
  DEFAULT_ADDITIONAL_OPTIONS,
  DRUG_CATALOGUE,
  DOSAGE_UNITS,
  DURATION_UNITS,
  FREQUENCY_OPTIONS,
  MOCK_PRESCRIPTION_PATIENT,
  PRESCRIBING_DOCTOR,
  ROUTE_OPTIONS,
  createDefaultPrescriptionLines,
  createLineFromDrug,
  frequencyLabel,
  type AdditionalOptionsState,
  type PrescriptionLine,
} from '@/features/prescriptions/__mocks__/prescriptionFixtures';
import type { AllergySeverity } from '@/types/patient.types';

// ── Types ──────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'error';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** "Jun 30, 2026" — WAT-pinned, assembled from explicit parts (never en-US). */
function formatRxDate(date: Date): string {
  const month = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    month: 'short',
  }).format(date);
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric' }).format(
    date,
  );
  const year = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
  }).format(date);
  return `${month} ${day}, ${year}`;
}

function lowercaseFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

const ROUTE_SENTENCE: Record<string, string> = {
  Oral: 'by mouth',
  IV: 'by intravenous injection',
  IM: 'by intramuscular injection',
  Topical: 'by topical application',
  Sublingual: 'sublingually',
  Rectal: 'rectally',
};

function buildDirectionsSentence(line: PrescriptionLine): string {
  const routePhrase = ROUTE_SENTENCE[line.route] ?? `by ${line.route.toLowerCase()}`;
  const freq = lowercaseFirst(frequencyLabel(line.frequency));
  const durationPhrase = line.isOngoing
    ? 'ongoing'
    : `for ${line.duration} ${line.durationUnit.toLowerCase()}`;
  const instructions = line.specialInstructions.trim() || 'Take after meals.';
  return `Take 1 ${line.form.toLowerCase()} (${line.dosagePerDose}${line.dosageUnit}) ${routePhrase} ${freq} ${durationPhrase}. ${instructions}`;
}

const SEVERITY_PILL: Record<AllergySeverity, React.CSSProperties> = {
  MILD: { background: 'rgba(254,243,199,0.6)', border: '1px solid #D97706', color: '#92400E' },
  MODERATE: { background: 'rgba(255,237,213,0.6)', border: '1px solid #EA580C', color: '#7C2D12' },
  SEVERE: { background: 'rgba(254,226,226,0.6)', border: '1px solid #DC2626', color: '#7F1D1D' },
  LIFE_THREATENING: { background: '#7F1D1D', border: '1px solid #991B1B', color: '#FEF2F2' },
};

const SEVERITY_LABEL: Record<AllergySeverity, string> = {
  MILD: 'Mild',
  MODERATE: 'Moderate',
  SEVERE: 'Severe',
  LIFE_THREATENING: 'Life-Threatening',
};

// ── Shared field styling (mirrors the consultation-page input recipe) ────────

const FIELD_BASE: React.CSSProperties = {
  border: '1px solid #0064821F',
  fontSize: 14,
  lineHeight: '22px',
  color: '#0D2630',
  background: '#FFFFFF',
  height: 44,
  borderRadius: 10,
};

// Textareas (Special Instruction, Pharmacy Instructions) use a lighter,
// neutral border (#8A98A3 at 20% opacity) and a 12px radius — distinct from
// the teal-tinted single-line FIELD_BASE recipe above.
const TEXTAREA_FIELD: React.CSSProperties = {
  border: '1px solid rgba(138,152,163,0.2)',
  fontSize: 14,
  lineHeight: '22px',
  color: '#0D2630',
  background: '#FFFFFF',
  borderRadius: 12,
};

function focusBorder(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) {
  e.currentTarget.style.borderColor = '#00B4D8';
}
function blurBorder(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) {
  e.currentTarget.style.borderColor = '#0064821F';
}
/** Blur handler for TEXTAREA_FIELD elements — restores its neutral border, not FIELD_BASE's. */
function blurBorderNeutral(e: React.FocusEvent<HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = 'rgba(138,152,163,0.2)';
}

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none focus-visible:border-[#00B4D8]';

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />;
}

function PrescriptionSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        <div
          className="rounded-[12px] p-4"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <SkeletonBlock className="h-5 w-40" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonBlock className="h-11 flex-1" />
                <SkeletonBlock className="h-11 w-28" />
                <SkeletonBlock className="h-11 w-28" />
                <SkeletonBlock className="h-11 w-24" />
              </div>
            ))}
          </div>
        </div>
        <SkeletonBlock className="h-64 w-full rounded-[12px]" />
      </div>
      <div className="w-full shrink-0 xl:w-90">
        <SkeletonBlock className="h-96 w-full rounded-[12px]" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PrescriptionsPage() {
  const toast = useToast();
  const patient = MOCK_PRESCRIPTION_PATIENT;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [lines, setLines] = useState<PrescriptionLine[]>(() => createDefaultPrescriptionLines());
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [additionalOptions, setAdditionalOptions] = useState<AdditionalOptionsState>(
    DEFAULT_ADDITIONAL_OPTIONS,
  );
  const [pharmacyNote, setPharmacyNote] = useState('');

  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!addMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [addMenuOpen]);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const availableDrugs = DRUG_CATALOGUE.filter((d) => !lines.some((l) => l.drugId === d.id));
  const filteredDrugs = availableDrugs.filter((d) =>
    d.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function addDrug(drugId: string) {
    const drug = DRUG_CATALOGUE.find((d) => d.id === drugId);
    if (!drug) return;
    const line = createLineFromDrug(drug);
    setLines((prev) => [...prev, line]);
    setSelectedLineId(line.id);
    setAddMenuOpen(false);
    setSearch('');
    toast.success(`${drug.name} added`, 'Adjust the strength, form, and dosage below.');
  }

  function handleAddAnother() {
    if (availableDrugs.length === 0) {
      toast.info('Drug list exhausted', 'Every catalogued medication has already been added.');
      return;
    }
    addDrug(availableDrugs[0]!.id);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLine(id: string, patch: Partial<PrescriptionLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function updateSelectedLine(patch: Partial<PrescriptionLine>) {
    if (!selectedLine) return;
    updateLine(selectedLine.id, patch);
  }

  function toggleOption(key: keyof AdditionalOptionsState) {
    setAdditionalOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleClearAll() {
    setLines([]);
    setSelectedLineId(null);
    setAdditionalOptions(DEFAULT_ADDITIONAL_OPTIONS);
    setPharmacyNote('');
    toast.info('Cleared', 'All medications and instructions have been removed.');
  }

  function handleSaveDraft() {
    if (lines.length === 0) {
      toast.error('Nothing to save', 'Add at least one medication before saving a draft.');
      return;
    }
    toast.success('Draft saved', 'You can resume this prescription later from your drafts.');
  }

  function handleSendPrescription() {
    if (lines.length === 0) {
      toast.error('No medications', 'Add at least one medication before sending.');
      return;
    }
    toast.success('Prescription sent', `Sent to pharmacy for ${patient.name}.`);
    setLines([]);
    setSelectedLineId(null);
    setAdditionalOptions(DEFAULT_ADDITIONAL_OPTIONS);
    setPharmacyNote('');
  }

  // Derived at render time (not synced via effect) so a stale/null
  // selectedLineId always resolves to a real line whenever one exists —
  // no setState-in-effect cascade required.
  const selectedLine =
    lines.find((l) => l.id === selectedLineId) ?? (lines.length > 0 ? lines[0]! : null);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px]">
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            {/* ── Page header ───────────────────────────────────────────────── */}
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Create Prescription
            </h1>
            <p
              className="mt-0.5 font-sans"
              style={{ fontSize: 14, lineHeight: '22px', color: '#00B4D8' }}
            >
              For {patient.name} · {patient.mrn}
            </p>

            {pageState === 'loading' ? (
              <PrescriptionSkeleton />
            ) : pageState === 'error' ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 py-10 text-center">
                <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
                <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                  Failed to load prescription workspace
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
            ) : (
              <>
                {/* ── Allergy banner — patient-safety non-negotiable, above the
                     working area on every prescribing screen ────────────────── */}
                <div className="mt-4">
                  <AllergyBanner allergies={patient.allergies} />
                </div>

                {/* ── Active medications interaction-check banner ──────────── */}
                {patient.activeMedications.length > 0 && (
                  <div
                    className="mt-4 rounded-[12px] px-2.5 py-4"
                    style={{ background: '#FFFBEB', borderTop: '1px solid #FEE685' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle
                        className="shrink-0"
                        style={{ width: 18, height: 18, color: '#D97706' }}
                      />
                      <span
                        className="text-sm leading-5.5 font-semibold"
                        style={{ color: '#F59E0B' }}
                      >
                        Active Medications — Check Interactions Before Prescribing
                      </span>
                    </div>
                    <div className="mt-2.5 flex [scrollbar-width:none] flex-nowrap gap-2 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden">
                      {patient.activeMedications.map((med) => (
                        <span
                          key={med.id}
                          className="shrink-0 rounded-[12px] px-3 py-1 text-sm leading-5.5 font-medium whitespace-nowrap"
                          style={{
                            background: '#FEF3C6',
                            borderTop: '1px solid #FFD230',
                            color: '#92400E',
                          }}
                        >
                          {med.name} {med.dose} {med.frequencyShort}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Two-column layout ─────────────────────────────────────── */}
                <div className="mt-6 flex flex-col gap-6 xl:flex-row xl:items-start">
                  {/* ══ MAIN COLUMN ══════════════════════════════════════════ */}
                  <div className="min-w-0 flex-1 space-y-6">
                    {/* ── Add Medication ──────────────────────────────────── */}
                    <div>
                      <p className="text-base leading-6 font-semibold" style={{ color: '#0D2630' }}>
                        Add Medication
                      </p>
                      <div className="relative mt-2" ref={addMenuRef}>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <div className="relative flex-1">
                            <Search
                              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
                              style={{ width: 16, height: 16, color: '#8A98A3' }}
                            />
                            <input
                              type="text"
                              value={search}
                              onChange={(e) => {
                                setSearch(e.target.value);
                                setAddMenuOpen(true);
                              }}
                              onFocus={(e) => {
                                setAddMenuOpen(true);
                                focusBorder(e);
                              }}
                              onBlur={blurBorder}
                              placeholder="Search drug by generic or brand name…"
                              className={`w-full pr-4 pl-10 transition-[border-color] duration-150 outline-none ${FOCUS_RING}`}
                              style={FIELD_BASE}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setAddMenuOpen((v) => !v)}
                            aria-expanded={addMenuOpen}
                            className={`flex shrink-0 items-center justify-center gap-2 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                            style={{
                              height: 44,
                              background: '#00B4D8',
                              fontSize: 14,
                              lineHeight: '22px',
                            }}
                          >
                            <LayoutGrid style={{ width: 16, height: 16 }} />
                            Browse Drug List
                          </button>
                        </div>

                        {/* ── Drug catalogue dropdown ───────────────────────── */}
                        {addMenuOpen && (
                          <div
                            className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 left-0 z-30 mt-1.5 max-h-72 overflow-y-auto scroll-smooth rounded-[12px] bg-white py-1.5 duration-150"
                            style={{
                              border: '1px solid rgba(0,100,130,0.15)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                            }}
                          >
                            {filteredDrugs.length === 0 ? (
                              <p
                                className="px-4 py-3 text-sm leading-5.5"
                                style={{ color: '#8A98A3' }}
                              >
                                {availableDrugs.length === 0
                                  ? 'Every catalogued medication has been added.'
                                  : 'No matching drugs found.'}
                              </p>
                            ) : (
                              filteredDrugs.map((drug) => (
                                <button
                                  key={drug.id}
                                  type="button"
                                  onClick={() => addDrug(drug.id)}
                                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                                >
                                  <span>
                                    <span
                                      className="block text-sm leading-5.5 font-medium"
                                      style={{ color: '#0D2630' }}
                                    >
                                      {drug.name}
                                    </span>
                                    <span
                                      className="block text-sm leading-5"
                                      style={{ color: '#8A98A3' }}
                                    >
                                      {drug.category}
                                    </span>
                                  </span>
                                  <Plus style={{ width: 16, height: 16, color: '#00B4D8' }} />
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Medication table ─────────────────────────────────── */}
                    <div
                      className="overflow-hidden rounded-[12px]"
                      style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                    >
                      {lines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
                          <div
                            className="flex size-14 items-center justify-center rounded-full"
                            style={{ background: 'rgba(226,237,241,0.6)' }}
                          >
                            <LayoutGrid style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <div>
                            <p
                              className="text-base leading-6 font-medium"
                              style={{ color: '#4A7080' }}
                            >
                              No medications added yet
                            </p>
                            <p className="mt-0.5 text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                              Search or browse the drug list above to add the first medication
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Table header — hidden on mobile, cards below */}
                          <div
                            className="hidden sm:flex"
                            style={{
                              background: 'rgba(226,237,241,0.4)',
                              borderBottom: '1px solid #E6F8FD',
                            }}
                          >
                            <span
                              className="min-w-0 flex-1 px-5 py-3.5 text-sm leading-[22px] font-bold tracking-wider uppercase"
                              style={{ color: '#4A7080' }}
                            >
                              Medication
                            </span>
                            <span
                              className="w-32 shrink-0 px-2 py-3.5 text-sm leading-[22px] font-bold tracking-wider uppercase"
                              style={{ color: '#4A7080' }}
                            >
                              Strength
                            </span>
                            <span
                              className="w-32 shrink-0 px-2 py-3.5 text-sm leading-[22px] font-bold tracking-wider uppercase"
                              style={{ color: '#4A7080' }}
                            >
                              Form
                            </span>
                            <span
                              className="w-28 shrink-0 px-4 py-3.5 text-sm leading-[22px] font-bold tracking-wider uppercase"
                              style={{ color: '#4A7080' }}
                            >
                              Actions
                            </span>
                          </div>

                          <div>
                            {lines.map((line, idx) => {
                              const drug = DRUG_CATALOGUE.find((d) => d.id === line.drugId);
                              const isSelected = line.id === selectedLineId;
                              return (
                                <div
                                  key={line.id}
                                  className="flex w-full flex-col items-start gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-0 sm:px-0"
                                  style={{
                                    background: isSelected ? 'rgba(0,180,216,0.05)' : 'transparent',
                                    borderLeft: `3px solid ${isSelected ? '#00B4D8' : 'transparent'}`,
                                    borderBottom:
                                      idx === lines.length - 1
                                        ? undefined
                                        : '1px solid rgba(0,100,130,0.08)',
                                  }}
                                >
                                  {/* Medication name + category — the clickable
                                      "select this row" control */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLineId(line.id)}
                                    aria-pressed={isSelected}
                                    className={`min-w-0 flex-1 text-left transition-colors duration-100 sm:px-5 ${FOCUS_RING}`}
                                  >
                                    <span
                                      className="block text-base leading-6 font-medium"
                                      style={{ color: '#0D2630' }}
                                    >
                                      {line.name}
                                    </span>
                                    <span
                                      className="block text-sm leading-5"
                                      style={{ color: '#8A98A3' }}
                                    >
                                      {line.category}
                                    </span>
                                  </button>

                                  {/* Strength select */}
                                  <span className="relative w-full shrink-0 sm:w-32 sm:px-2">
                                    <select
                                      value={line.strength}
                                      onChange={(e) =>
                                        updateLine(line.id, { strength: e.target.value })
                                      }
                                      className={`h-10 w-full appearance-none rounded-[8px] pr-7 pl-3 text-sm outline-none ${FOCUS_RING}`}
                                      style={{ border: '1px solid #0064821F', color: '#0D2630' }}
                                    >
                                      {(drug?.strengthOptions ?? [line.strength]).map((s) => (
                                        <option key={s} value={s}>
                                          {s}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown
                                      className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                                      style={{ width: 14, height: 14, color: '#8A98A3' }}
                                    />
                                  </span>

                                  {/* Form select */}
                                  <span className="relative w-full shrink-0 sm:w-32 sm:px-2">
                                    <select
                                      value={line.form}
                                      onChange={(e) =>
                                        updateLine(line.id, { form: e.target.value })
                                      }
                                      className={`h-10 w-full appearance-none rounded-[8px] pr-7 pl-3 text-sm outline-none ${FOCUS_RING}`}
                                      style={{ border: '1px solid #0064821F', color: '#0D2630' }}
                                    >
                                      {(drug?.formOptions ?? [line.form]).map((f) => (
                                        <option key={f} value={f}>
                                          {f}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown
                                      className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                                      style={{ width: 14, height: 14, color: '#8A98A3' }}
                                    />
                                  </span>

                                  {/* Remove */}
                                  <span className="w-full shrink-0 sm:w-28 sm:px-4">
                                    <button
                                      type="button"
                                      onClick={() => removeLine(line.id)}
                                      className={`h-9 w-full rounded-[8px] text-sm font-medium whitespace-nowrap transition-colors duration-150 hover:bg-red-100 sm:w-auto sm:px-3 ${FOCUS_RING}`}
                                      style={{
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        color: '#EF4444',
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      <div className="p-4">
                        <button
                          type="button"
                          onClick={handleAddAnother}
                          className={`flex w-full items-center justify-center gap-2.5 rounded-[12px] px-2.5 py-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                          style={{ background: '#00B4D8', fontSize: 16, lineHeight: '24px' }}
                        >
                          <Plus style={{ width: 18, height: 18 }} />
                          Add Another Medication
                        </button>
                      </div>
                    </div>

                    {selectedLine && (
                      <>
                        {/* ── Dosage & Directions ────────────────────────── */}
                        <div
                          className="rounded-[12px] p-4 sm:p-5"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid rgba(0,100,130,0.12)',
                          }}
                        >
                          <p
                            className="text-base leading-6 font-semibold"
                            style={{ color: '#0D2630' }}
                          >
                            Dosage &amp; Directions
                          </p>
                          <p className="mt-0.5 text-sm leading-5.5" style={{ color: '#00B4D8' }}>
                            Editing {selectedLine.name} {selectedLine.strength}
                          </p>

                          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <label
                                className="mb-1.5 block text-sm leading-5.5 font-medium"
                                style={{ color: '#0D2630' }}
                              >
                                Dosage (per dose)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={selectedLine.dosagePerDose}
                                  onChange={(e) =>
                                    updateSelectedLine({ dosagePerDose: e.target.value })
                                  }
                                  onFocus={focusBorder}
                                  onBlur={blurBorder}
                                  className={`w-full min-w-0 flex-1 px-4 transition-[border-color] duration-150 outline-none ${FOCUS_RING}`}
                                  style={FIELD_BASE}
                                />
                                <div className="relative w-20 shrink-0">
                                  <select
                                    value={selectedLine.dosageUnit}
                                    onChange={(e) =>
                                      updateSelectedLine({ dosageUnit: e.target.value })
                                    }
                                    className={`h-11 w-full appearance-none rounded-[10px] pr-7 pl-3 text-sm outline-none ${FOCUS_RING}`}
                                    style={{ border: '1px solid #0064821F', color: '#0D2630' }}
                                  >
                                    {DOSAGE_UNITS.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown
                                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                                    style={{ width: 14, height: 14, color: '#8A98A3' }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label
                                className="mb-1.5 block text-sm leading-5.5 font-medium"
                                style={{ color: '#0D2630' }}
                              >
                                Route
                              </label>
                              <div className="relative">
                                <select
                                  value={selectedLine.route}
                                  onChange={(e) => updateSelectedLine({ route: e.target.value })}
                                  className={`w-full appearance-none pr-9 pl-4 text-sm outline-none ${FOCUS_RING}`}
                                  style={FIELD_BASE}
                                >
                                  {ROUTE_OPTIONS.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
                                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                                />
                              </div>
                            </div>

                            <div>
                              <label
                                className="mb-1.5 block text-sm leading-5.5 font-medium"
                                style={{ color: '#0D2630' }}
                              >
                                Frequency
                              </label>
                              <div className="relative">
                                <select
                                  value={selectedLine.frequency}
                                  onChange={(e) =>
                                    updateSelectedLine({ frequency: e.target.value })
                                  }
                                  className={`w-full appearance-none pr-9 pl-4 text-sm outline-none ${FOCUS_RING}`}
                                  style={FIELD_BASE}
                                >
                                  {FREQUENCY_OPTIONS.map((f) => (
                                    <option key={f.value} value={f.value}>
                                      {f.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
                                  style={{ width: 16, height: 16, color: '#8A98A3' }}
                                />
                              </div>
                            </div>

                            <div>
                              <label
                                className="mb-1.5 block text-sm leading-5.5 font-medium"
                                style={{ color: '#0D2630' }}
                              >
                                Duration
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={selectedLine.duration}
                                  onChange={(e) => updateSelectedLine({ duration: e.target.value })}
                                  onFocus={focusBorder}
                                  onBlur={blurBorder}
                                  disabled={selectedLine.isOngoing}
                                  className={`w-full min-w-0 flex-1 px-4 transition-[border-color] duration-150 outline-none disabled:opacity-50 ${FOCUS_RING}`}
                                  style={FIELD_BASE}
                                />
                                <div className="relative w-24 shrink-0">
                                  <select
                                    value={selectedLine.durationUnit}
                                    onChange={(e) =>
                                      updateSelectedLine({ durationUnit: e.target.value })
                                    }
                                    disabled={selectedLine.isOngoing}
                                    className={`h-11 w-full appearance-none rounded-[10px] pr-7 pl-3 text-sm outline-none disabled:opacity-50 ${FOCUS_RING}`}
                                    style={{ border: '1px solid #0064821F', color: '#0D2630' }}
                                  >
                                    {DURATION_UNITS.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown
                                    className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
                                    style={{ width: 14, height: 14, color: '#8A98A3' }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label
                                className="mb-1.5 block text-sm leading-5.5 font-medium"
                                style={{ color: '#0D2630' }}
                              >
                                Start Date
                              </label>
                              <div className="relative">
                                <input
                                  type="date"
                                  value={selectedLine.startDate}
                                  onChange={(e) =>
                                    updateSelectedLine({ startDate: e.target.value })
                                  }
                                  onFocus={focusBorder}
                                  onBlur={blurBorder}
                                  className={`w-full px-4 transition-[border-color] duration-150 outline-none ${FOCUS_RING}`}
                                  style={FIELD_BASE}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="mb-1.5 flex items-center justify-between">
                                <label
                                  className="text-sm leading-5.5 font-medium"
                                  style={{ color: '#0D2630' }}
                                >
                                  End Date
                                </label>
                                <label className="flex cursor-pointer items-center gap-1.5">
                                  <input
                                    type="checkbox"
                                    checked={selectedLine.isOngoing}
                                    onChange={(e) =>
                                      updateSelectedLine({ isOngoing: e.target.checked })
                                    }
                                    style={{ accentColor: '#00B4D8' }}
                                    className={`size-4.5 cursor-pointer rounded border border-[#006482]/22 ${FOCUS_RING}`}
                                  />
                                  <span
                                    className="text-sm leading-5.5"
                                    style={{ color: '#4A7080' }}
                                  >
                                    Ongoing
                                  </span>
                                </label>
                              </div>
                              <input
                                type="date"
                                value={selectedLine.endDate}
                                onChange={(e) => updateSelectedLine({ endDate: e.target.value })}
                                onFocus={focusBorder}
                                onBlur={blurBorder}
                                disabled={selectedLine.isOngoing}
                                className={`w-full px-4 transition-[border-color] duration-150 outline-none disabled:opacity-50 ${FOCUS_RING}`}
                                style={FIELD_BASE}
                              />
                            </div>
                          </div>

                          <div className="mt-4">
                            <label
                              className="mb-1.5 block text-sm leading-5.5 font-medium"
                              style={{ color: '#0D2630' }}
                            >
                              Special Instruction to Patient (Optional)
                            </label>
                            <textarea
                              value={selectedLine.specialInstructions}
                              onChange={(e) =>
                                e.target.value.length <= 200 &&
                                updateSelectedLine({ specialInstructions: e.target.value })
                              }
                              rows={3}
                              className={`w-full resize-none rounded-[12px] px-2.5 py-4 outline-none ${FOCUS_RING}`}
                              style={TEXTAREA_FIELD}
                              onFocus={focusBorder}
                              onBlur={blurBorderNeutral}
                            />
                            <p className="mt-1 text-sm leading-5" style={{ color: '#8A98A3' }}>
                              {selectedLine.specialInstructions.length}/200 characters
                            </p>
                          </div>
                        </div>

                        {/* ── Additional Options + Pharmacy Instructions ──── */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <div
                            className="rounded-[12px] p-4 sm:p-5"
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid rgba(0,100,130,0.12)',
                            }}
                          >
                            <p
                              className="text-base leading-6 font-semibold"
                              style={{ color: '#0D2630' }}
                            >
                              Additional Options
                            </p>
                            <div className="mt-3 space-y-3">
                              {ADDITIONAL_OPTION_DEFS.map((opt) => (
                                <label
                                  key={opt.key}
                                  className="flex cursor-pointer items-center gap-2.5"
                                >
                                  <input
                                    type="checkbox"
                                    checked={additionalOptions[opt.key]}
                                    onChange={() => toggleOption(opt.key)}
                                    style={{ accentColor: '#00B4D8' }}
                                    className={`size-4.5 cursor-pointer rounded border border-[#006482]/22 ${FOCUS_RING}`}
                                  />
                                  <span
                                    className="text-sm leading-5.5"
                                    style={{ color: '#25464D' }}
                                  >
                                    {opt.label}
                                  </span>
                                  <span className="shrink-0 cursor-help" title={opt.tooltip}>
                                    <Info
                                      style={{ width: 14, height: 14, color: '#8A98A3' }}
                                      aria-hidden
                                    />
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div
                            className="rounded-[12px] p-4 sm:p-5"
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid rgba(0,100,130,0.12)',
                            }}
                          >
                            <p
                              className="text-base leading-6 font-semibold"
                              style={{ color: '#0D2630' }}
                            >
                              Pharmacy Instructions
                            </p>
                            <textarea
                              value={pharmacyNote}
                              onChange={(e) => setPharmacyNote(e.target.value)}
                              placeholder="Add note for pharmacist (e.g. preferred brand, special handling)"
                              rows={5}
                              className={`mt-3 w-full resize-none rounded-[12px] px-2.5 py-4 outline-none ${FOCUS_RING}`}
                              style={TEXTAREA_FIELD}
                              onFocus={focusBorder}
                              onBlur={blurBorderNeutral}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* ── Action row ───────────────────────────────────────── */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className={`h-11 rounded-[10px] px-5 text-sm leading-5.5 font-medium transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                        style={{
                          border: '1px solid #00B4D8',
                          color: '#00B4D8',
                          background: '#FFFFFF',
                        }}
                      >
                        Clear All
                      </button>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <PermissionGate permission={PERMISSIONS.PRESCRIPTIONS_WRITE}>
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            className={`h-11 rounded-[10px] px-5 text-sm leading-5.5 font-medium transition-colors duration-150 hover:bg-slate-50 ${FOCUS_RING}`}
                            style={{
                              border: '1px solid rgba(0,100,130,0.20)',
                              color: '#0D2630',
                              background: '#FFFFFF',
                            }}
                          >
                            Save as Draft
                          </button>
                        </PermissionGate>
                        <PermissionGate permission={PERMISSIONS.PRESCRIPTIONS_WRITE}>
                          <button
                            type="button"
                            onClick={handleSendPrescription}
                            className={`flex h-11 items-center justify-center gap-2 rounded-[10px] px-5 text-sm leading-5.5 font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                            style={{ background: '#00B4D8' }}
                          >
                            <Send style={{ width: 16, height: 16 }} />
                            Send Prescription
                          </button>
                        </PermissionGate>
                      </div>
                    </div>

                    {/* ── Prescription Preview ─────────────────────────────── */}
                    <div
                      className="rounded-[12px] p-5 sm:p-6"
                      style={{ background: '#FDF6EC', border: '1px solid rgba(217,119,6,0.18)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className="font-display text-xl leading-7 font-semibold"
                          style={{ color: '#0D2630' }}
                        >
                          Prescription Preview
                        </p>
                        <span
                          className="shrink-0 text-sm leading-5.5"
                          style={{ color: '#4A7080' }}
                          suppressHydrationWarning
                        >
                          {formatRxDate(new Date())}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <div
                          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                          style={{ background: patient.avatarBg }}
                        >
                          {patient.initials}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-base leading-6 font-semibold"
                            style={{ color: '#0D2630' }}
                          >
                            {patient.name}
                          </p>
                          <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                            {patient.mrn}
                          </p>
                        </div>
                      </div>

                      {lines.length === 0 ? (
                        <p className="mt-6 text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                          No medications added — the preview will appear here once you add at least
                          one medication.
                        </p>
                      ) : (
                        <div className="mt-5 space-y-4">
                          {lines.map((line) => (
                            <div key={line.id}>
                              <p
                                className="text-base leading-6 font-semibold"
                                style={{ color: '#0D2630' }}
                              >
                                {line.name} {line.strength} {line.form}
                              </p>
                              <p
                                className="mt-0.5 text-sm leading-5.5"
                                style={{ color: '#4A7080' }}
                              >
                                {buildDirectionsSentence(line)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-6 flex justify-end">
                        <div className="text-right">
                          <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                            Prescribing Doctor
                          </p>
                          <p
                            className="text-base leading-6 font-semibold"
                            style={{ color: '#0D2630' }}
                          >
                            {PRESCRIBING_DOCTOR.name}
                          </p>
                          <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                            {PRESCRIBING_DOCTOR.credentials}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ══ SIDEBAR — Patient Summary ═══════════════════════════ */}
                  <div
                    className="w-full shrink-0 rounded-[12px] p-4 sm:p-5 xl:w-90"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <p className="text-base leading-6 font-semibold" style={{ color: '#0D2630' }}>
                      Patient Summary
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ background: patient.avatarBg }}
                      >
                        {patient.initials}
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-base leading-6 font-semibold"
                          style={{ color: '#0D2630' }}
                        >
                          {patient.name}
                        </p>
                        <p className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                          {patient.mrn}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-5.5" style={{ color: '#4A7080' }}>
                      {patient.age} {patient.gender} · BG: {patient.bloodGroup}
                    </p>

                    {/* ── Vital signs ─────────────────────────────────────── */}
                    <div
                      className="mt-4 border-t pt-4"
                      style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                    >
                      <p
                        className="text-sm leading-5.5 font-bold tracking-wider uppercase"
                        style={{ color: '#4A7080' }}
                      >
                        Vital Signs
                      </p>
                      <div className="mt-2 space-y-2">
                        {patient.vitals.map((v) => (
                          <div key={v.label} className="flex items-center justify-between">
                            <span className="text-sm leading-5.5" style={{ color: '#4A7080' }}>
                              {v.label}
                            </span>
                            <span
                              className="flex items-center gap-1 text-sm leading-5.5 font-medium"
                              style={{ color: v.abnormal ? '#EF4444' : '#0D2630' }}
                            >
                              {v.value}
                              {v.abnormal && <AlertTriangle style={{ width: 14, height: 14 }} />}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Active medications ──────────────────────────────── */}
                    {patient.activeMedications.length > 0 && (
                      <div
                        className="mt-4 border-t pt-4"
                        style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                      >
                        <p
                          className="text-sm leading-5.5 font-bold tracking-wider uppercase"
                          style={{ color: '#4A7080' }}
                        >
                          Active Medications
                        </p>
                        <div className="mt-2 space-y-2.5">
                          {patient.activeMedications.map((med) => (
                            <div key={med.id} className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p
                                  className="text-sm leading-5.5 font-medium"
                                  style={{ color: '#0D2630' }}
                                >
                                  {med.name}
                                </p>
                                <p className="text-sm leading-5" style={{ color: '#4A7080' }}>
                                  {med.dose} · {med.form ? `${med.form} ` : ''}
                                  {med.frequencyLabel}
                                </p>
                              </div>
                              <span
                                className="shrink-0 rounded-full px-2.5 py-1 text-sm leading-none font-medium"
                                style={{
                                  background: 'rgba(0,180,216,0.1)',
                                  border: '1px solid rgba(0,180,216,0.3)',
                                  color: '#00B4D8',
                                }}
                              >
                                Active
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Diagnosis ────────────────────────────────────────── */}
                    <div
                      className="mt-4 border-t pt-4"
                      style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                    >
                      <p
                        className="text-sm leading-5.5 font-bold tracking-wider uppercase"
                        style={{ color: '#4A7080' }}
                      >
                        Diagnosis (This Week)
                      </p>
                      <p className="mt-2 text-sm leading-5.5" style={{ color: '#4A7080' }}>
                        Primary Diagnosis
                      </p>
                      <p className="text-base leading-6 font-medium" style={{ color: '#0D2630' }}>
                        {patient.diagnosis.condition}
                      </p>
                      <p className="mt-0.5 text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                        ICD-10: {patient.diagnosis.icd10}
                      </p>
                    </div>

                    {/* ── Notes ────────────────────────────────────────────── */}
                    <div
                      className="mt-4 border-t pt-4"
                      style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                    >
                      <p
                        className="text-sm leading-5.5 font-bold tracking-wider uppercase"
                        style={{ color: '#4A7080' }}
                      >
                        Notes
                      </p>
                      <p className="mt-2 text-sm leading-5.5" style={{ color: '#25464D' }}>
                        {patient.notes}
                      </p>
                    </div>

                    {/* ── Allergies ────────────────────────────────────────── */}
                    <div
                      className="mt-4 border-t pt-4"
                      style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle style={{ width: 15, height: 15, color: '#EF4444' }} />
                        <p
                          className="text-sm leading-5.5 font-bold tracking-wider uppercase"
                          style={{ color: '#EF4444' }}
                        >
                          Allergies
                        </p>
                      </div>
                      <div className="mt-2 space-y-3">
                        {patient.allergies.map((allergy) => (
                          <div key={allergy.id}>
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="rounded-full px-2.5 py-0.5 text-sm leading-5 font-medium"
                                style={{
                                  background: 'rgba(254,226,226,0.5)',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  color: '#EF4444',
                                }}
                              >
                                {allergy.substance}
                              </span>
                              <span
                                className="shrink-0 rounded-full px-2.5 py-0.5 text-sm leading-5 font-medium"
                                style={SEVERITY_PILL[allergy.severity]}
                              >
                                {SEVERITY_LABEL[allergy.severity]}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-5.5" style={{ color: '#4A7080' }}>
                              {allergy.reaction}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Drug interaction check ───────────────────────────── */}
                    <div
                      className="mt-4 border-t pt-4"
                      style={{ borderColor: 'rgba(0,100,130,0.12)' }}
                    >
                      <p
                        className="text-sm leading-5.5 font-bold tracking-wider uppercase"
                        style={{ color: '#4A7080' }}
                      >
                        Drug Interaction Check
                      </p>
                      {lines.length === 0 ? (
                        <p className="mt-2 text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                          Add medications to run an interaction check.
                        </p>
                      ) : (
                        <>
                          <div className="mt-2 flex items-center gap-1.5">
                            <CheckCircle2 style={{ width: 16, height: 16, color: '#22C55E' }} />
                            <span
                              className="text-sm leading-5.5 font-semibold"
                              style={{ color: '#16A34A' }}
                            >
                              No significant interactions found
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-5.5" style={{ color: '#8A98A3' }}>
                            All selected medications are safe to prescribe together
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
