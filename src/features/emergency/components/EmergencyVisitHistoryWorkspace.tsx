'use client';

import {
  AlertCircle,
  Binoculars,
  Bed,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  History,
  Info,
  MoreVertical,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Stethoscope,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { triageSortWeight } from '@/utils/triage';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import type { QueueEntry } from '@/features/registration/__mocks__/queueFixtures';
import {
  deriveBloodGroup,
  deriveChronicConditions,
  deriveEmergencyContact,
  deriveLatestVitals,
  derivePriorityForEntry,
  deriveVisitHistory,
  type VisitDisposition,
  type VisitHistoryEntry,
} from '@/features/emergency/__mocks__/emergencyFixtures';
import { PatientSwitcher } from '@/features/emergency/components/PatientSwitcher';
import { useTriageRecords } from '@/features/emergency/store/triageAssessmentStore';

const VisitDetailModal = dynamic(
  () => import('./VisitDetailModal').then((m) => m.VisitDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type DateRangeFilter = 'ALL' | 'YEAR' | 'HALF_YEAR';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const DISPOSITION_CFG: Record<VisitDisposition, { color: string; bg: string }> = {
  Discharged: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  Admitted: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  Observation: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  'Left AMA': { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  Transferred: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
};

const DISPOSITION_LEGEND: { key: VisitDisposition; desc: string }[] = [
  { key: 'Discharged', desc: 'Patient discharged home.' },
  { key: 'Admitted', desc: 'Patient admitted to inpatient care.' },
  { key: 'Observation', desc: 'Patient placed in observation unit.' },
  { key: 'Left AMA', desc: 'Patient left against medical advice.' },
  { key: 'Transferred', desc: 'Patient transferred to another facility.' },
];

const PAGE_SIZE = 5;

function DispositionPill({ disposition }: { disposition: VisitDisposition }) {
  const cfg = DISPOSITION_CFG[disposition];
  return (
    <span
      className="inline-flex items-center rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
      style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
    >
      {disposition}
    </span>
  );
}

function VisitRowMenu({
  open,
  onToggle,
  onViewDetails,
  onPrint,
  onOpenTimeline,
}: {
  open: boolean;
  onToggle: () => void;
  onViewDetails: () => void;
  onPrint: () => void;
  onOpenTimeline: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label="More actions"
        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 16, height: 16, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={200}>
        <button
          type="button"
          onClick={onViewDetails}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <FileText style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View Details
        </button>
        <button
          type="button"
          onClick={onPrint}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Printer style={{ width: 15, height: 15, color: '#4A7080' }} />
          Print Visit Summary
        </button>
        <button
          type="button"
          onClick={onOpenTimeline}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Clock style={{ width: 15, height: 15, color: '#4A7080' }} />
          Open in Clinical Timeline
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function EmergencyVisitHistoryWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const entryId = searchParams.get('entryId');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [now] = useState(() => Date.now());
  const [dispositionFilter, setDispositionFilter] = useState<'ALL' | VisitDisposition>('ALL');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('ALL');
  const [openFilter, setOpenFilter] = useState<'disposition' | 'date' | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [detailVisit, setDetailVisit] = useState<VisitHistoryEntry | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  const allEntries = useQueueEntries();
  const triageRecords = useTriageRecords();

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const emergencyEntries = allEntries.filter((e) => e.isEmergency);
  const entry: QueueEntry | undefined = entryId
    ? emergencyEntries.find((e) => e.id === entryId)
    : emergencyEntries
        .slice()
        .sort(
          (a, b) =>
            triageSortWeight(triageRecords.get(a.id)?.priority ?? derivePriorityForEntry(a.id)) -
            triageSortWeight(triageRecords.get(b.id)?.priority ?? derivePriorityForEntry(b.id)),
        )[0];

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <AlertCircle style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Emergency Visit History
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (pageState === 'loading') {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-64 animate-pulse rounded-[12px] bg-slate-100" />
        </div>
      </main>
    );
  }

  if (!entry) {
    return (
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-3 px-4 py-24 text-center sm:px-6">
          <div
            className="flex size-14 items-center justify-center rounded-full"
            style={{ background: 'rgba(226,237,241,0.6)' }}
          >
            <History style={{ width: 28, height: 28, color: '#8A98A3' }} />
          </div>
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            No emergency patients in the queue
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Visit history needs a patient currently in the emergency department.
          </p>
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergencyPatientQueue)}
            className={`mt-1 flex h-11 items-center gap-2 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Go to Patient Queue
          </button>
        </div>
      </main>
    );
  }

  const bloodGroup = deriveBloodGroup(entry.id);
  const emergencyContact = deriveEmergencyContact(entry.id);
  const vitals = deriveLatestVitals(entry.id);
  const chronicConditions = deriveChronicConditions(entry.id);
  const visits = deriveVisitHistory(entry.id, entry.arrivalTime);
  const sortedVisits = [...visits].sort(
    (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
  );

  const q = search.trim().toLowerCase();
  const filtered = sortedVisits
    .filter((v) => dispositionFilter === 'ALL' || v.disposition === dispositionFilter)
    .filter((v) => {
      if (dateFilter === 'ALL') return true;
      const ageMs = now - new Date(v.dateTime).getTime();
      const yearMs = 365 * 24 * 60 * 60 * 1000;
      if (dateFilter === 'HALF_YEAR') return ageMs < yearMs / 2;
      return ageMs < yearMs;
    })
    .filter(
      (v) =>
        !q ||
        v.chiefComplaint.toLowerCase().includes(q) ||
        v.diagnosis.toLowerCase().includes(q) ||
        v.visitId.toLowerCase().includes(q),
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalVisits = sortedVisits.length;
  const lastVisit = sortedVisits[0];
  const admissionsCount = sortedVisits.filter((v) => v.disposition === 'Admitted').length;
  const observationsCount = sortedVisits.filter((v) => v.disposition === 'Observation').length;

  const STAT_CARDS: {
    key: string;
    label: string;
    icon: typeof Clock;
    color: string;
    bg: string;
    content: React.ReactNode;
  }[] = [
    {
      key: 'total',
      label: 'Total ED Visits',
      icon: Clock,
      color: '#00B4D8',
      bg: 'rgba(0,180,216,0.1)',
      content: (
        <p className="font-display font-bold" style={{ fontSize: 22, color: '#0D2630' }}>
          {totalVisits}
        </p>
      ),
    },
    {
      key: 'last',
      label: 'Last Visit',
      icon: History,
      color: '#16A34A',
      bg: 'rgba(22,163,74,0.1)',
      content: lastVisit ? (
        <>
          <p className="font-display font-semibold" style={{ fontSize: 15, color: '#0D2630' }}>
            {formatHumanDate(lastVisit.dateTime)}
          </p>
          <p style={{ fontSize: 14, color: '#8A98A3' }}>{formatTime(lastVisit.dateTime)}</p>
        </>
      ) : (
        <p style={{ fontSize: 14, color: '#8A98A3' }}>—</p>
      ),
    },
    {
      key: 'diagnosis',
      label: 'Most Recent Diagnosis',
      icon: Stethoscope,
      color: '#D97706',
      bg: 'rgba(217,119,6,0.1)',
      content: (
        <p className="font-display font-semibold" style={{ fontSize: 15, color: '#0D2630' }}>
          {lastVisit?.diagnosis ?? '—'}
        </p>
      ),
    },
    {
      key: 'admissions',
      label: 'Admissions',
      icon: Bed,
      color: '#7C3AED',
      bg: 'rgba(124,58,237,0.1)',
      content: (
        <p className="font-display font-bold" style={{ fontSize: 22, color: '#0D2630' }}>
          {admissionsCount}
        </p>
      ),
    },
    {
      key: 'observations',
      label: 'Observations',
      icon: Binoculars,
      color: '#16A34A',
      bg: 'rgba(22,163,74,0.1)',
      content: (
        <p className="font-display font-bold" style={{ fontSize: 22, color: '#0D2630' }}>
          {observationsCount}
        </p>
      ),
    },
  ];

  function handlePrintVisit(v: VisitHistoryEntry) {
    if (!entry) return;
    const body = `
      <h1>Emergency Visit Summary — ${escapeHtml(v.visitId)}</h1>
      <p class="meta">${escapeHtml(entry.patientName)} · ${escapeHtml(entry.mrn)} · ${escapeHtml(formatHumanDate(v.dateTime))}, ${escapeHtml(formatTime(v.dateTime))}</p>
      <hr>
      <p>Chief Complaint: ${escapeHtml(v.chiefComplaint)}</p>
      <p>Diagnosis: ${escapeHtml(v.diagnosis)}</p>
      <p>Disposition: ${escapeHtml(v.disposition)}</p>
      <p>Provider: ${escapeHtml(v.provider)}</p>
    `;
    downloadPDF(`visit-summary-${v.visitId.toLowerCase()}`, body);
    toast.success('Visit summary ready', `${v.visitId} exported.`);
  }

  function handlePrintAllVisits() {
    if (!entry) return;
    const body = `
      <h1>Emergency Visit History — ${escapeHtml(entry.patientName)}</h1>
      <p class="meta">MRN: ${escapeHtml(entry.mrn)} · ${sortedVisits.length} visits</p>
      <hr>
      <table><thead><tr><th>Date</th><th>Chief Complaint</th><th>Diagnosis</th><th>Disposition</th><th>Provider</th><th>Visit ID</th></tr></thead><tbody>
      ${sortedVisits
        .map(
          (v) =>
            `<tr><td>${escapeHtml(formatHumanDate(v.dateTime))} ${escapeHtml(formatTime(v.dateTime))}</td><td>${escapeHtml(v.chiefComplaint)}</td><td>${escapeHtml(v.diagnosis)}</td><td>${escapeHtml(v.disposition)}</td><td>${escapeHtml(v.provider)}</td><td>${escapeHtml(v.visitId)}</td></tr>`,
        )
        .join('')}
      </tbody></table>
    `;
    downloadPDF(`visit-history-${entry.patientName.split(' ')[0]?.toLowerCase()}`, body);
    toast.success('Visit history ready', `${sortedVisits.length} visits exported.`);
  }

  const FILTER_DEFS: { key: 'disposition' | 'date'; def: FilterDef }[] = [
    {
      key: 'disposition',
      def: {
        key: 'disposition',
        defaultLabel: 'All Visits',
        options: DISPOSITION_LEGEND.map((d) => ({ value: d.key, label: d.key })),
      },
    },
    {
      key: 'date',
      def: {
        key: 'date',
        defaultLabel: 'All Visit Types',
        options: [
          { value: 'HALF_YEAR', label: 'Last 6 Months' },
          { value: 'YEAR', label: 'Last 12 Months' },
        ],
      },
    },
  ];
  const filterValue: Record<string, string> = {
    disposition: dispositionFilter,
    date: dateFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    disposition: (v) => setDispositionFilter(v as VisitDisposition),
    date: (v) => setDateFilter(v as DateRangeFilter),
  };

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.emergency)}
            className={`font-sans transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#4A7080' }}
          >
            Home
          </button>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>Patient Records</span>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
            Emergency Visit History
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex items-center gap-2">
          <History style={{ width: 22, height: 22, color: '#DC2626' }} />
          <div>
            <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
              Emergency Visit History
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              View patient&apos;s past emergency department visits and encounter details.
            </p>
          </div>
        </div>

        {/* Patient context bar */}
        <div
          className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[12px] p-4"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
              style={{ background: '#DC2626', fontSize: 14 }}
            >
              {entry.patientName
                .split(/\s+/)
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <p className="font-display font-semibold" style={{ fontSize: 17, color: '#0D2630' }}>
                {entry.patientName}
              </p>
              <p style={{ fontSize: 14, color: '#4A7080' }}>
                MRN: {entry.mrn} · {entry.age} Years, {entry.gender}
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Blood Group</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {bloodGroup}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Allergies</p>
            <p className="font-sans font-medium" style={{ fontSize: 14, color: '#16A34A' }}>
              No Known Allergies
            </p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#8A98A3' }}>Emergency Contact</p>
            <Tooltip
              content={`${emergencyContact.name} (${emergencyContact.relation}) · ${emergencyContact.phone}`}
            >
              <p
                className="max-w-[200px] truncate font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {emergencyContact.name} ({emergencyContact.relation})
              </p>
            </Tooltip>
          </div>
          <button
            type="button"
            onClick={() => router.push(ROUTES.patients)}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            View Full Profile
          </button>
          <div className="ml-auto">
            <PatientSwitcher currentEntryId={entry.id} />
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {FILTER_DEFS.map(({ key, def }) => (
            <FilterDropdown
              key={key}
              def={def}
              value={filterValue[key] ?? 'ALL'}
              isOpen={openFilter === key}
              onToggle={() => setOpenFilter((prev) => (prev === key ? null : key))}
              onSelect={(v) => {
                filterSetter[key]?.(v);
                setOpenFilter(null);
                setPage(1);
              }}
            />
          ))}
          <div className="relative min-w-[200px] flex-1">
            <Search
              style={{
                width: 16,
                height: 16,
                color: '#8A98A3',
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search visits..."
              className={`h-11 w-full rounded-[10px] py-2 pr-3.5 pl-10 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_320px] 2xl:items-start">
          <div className="min-w-0">
            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {STAT_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="flex items-start gap-3 rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: card.bg }}
                    >
                      <Icon style={{ width: 20, height: 20, color: card.color }} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{card.label}</p>
                      {card.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visit History table */}
            <div
              className="mt-4 rounded-[12px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p
                className="font-display px-4 pt-4 font-semibold"
                style={{ fontSize: 16, color: '#0D2630' }}
              >
                Visit History
              </p>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <History style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    No visits found
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    Try a different search term or filter combination.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-2">
                    <ScrollableTable minWidth={1050}>
                      <div
                        className={`flex items-center rounded-t-[12px] ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                      >
                        {[
                          ['#', 'w-10'],
                          ['Visit Date & Time', 'w-32'],
                          ['Visit Type', 'w-24'],
                          ['Chief Complaint', 'min-w-[150px] flex-1'],
                          ['Diagnosis', 'min-w-[150px] flex-1'],
                          ['Disposition', 'w-32'],
                          ['Provider', 'w-28'],
                          ['Visit ID', 'w-32'],
                          ['', 'w-20'],
                        ].map(([label, width]) => (
                          <div
                            key={label}
                            className={`${width} shrink-0 overflow-hidden px-2 py-2.5 text-center`}
                          >
                            <span
                              className="truncate font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                      {paged.map((v, i) => (
                        <div
                          key={v.id}
                          className="flex items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-10 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {(currentPage - 1) * PAGE_SIZE + i + 1}
                            </p>
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <p
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {formatHumanDate(v.dateTime)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatTime(v.dateTime)}
                            </p>
                          </div>
                          <div className="w-24 shrink-0 px-2 py-3 text-center">
                            <span
                              className="inline-flex items-center rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
                              style={{
                                fontSize: 14,
                                color: '#DC2626',
                                background: 'rgba(220,38,38,0.1)',
                              }}
                            >
                              Emergency
                            </span>
                          </div>
                          <div className="min-w-[150px] flex-1 px-2 py-3 text-center">
                            <Tooltip content={v.chiefComplaint}>
                              <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                                {v.chiefComplaint}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="min-w-[150px] flex-1 px-2 py-3 text-center">
                            <Tooltip content={v.diagnosis}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {v.diagnosis}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <DispositionPill disposition={v.disposition} />
                          </div>
                          <div className="w-28 shrink-0 px-2 py-3 text-center">
                            <Tooltip content={v.provider}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {v.provider}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>{v.visitId}</p>
                          </div>
                          <div className="flex w-20 shrink-0 items-center justify-center gap-1 px-2 py-3">
                            <button
                              type="button"
                              onClick={() => setDetailVisit(v)}
                              aria-label="View details"
                              className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                            </button>
                            <VisitRowMenu
                              open={openRowMenuId === v.id}
                              onToggle={() =>
                                setOpenRowMenuId((prev) => (prev === v.id ? null : v.id))
                              }
                              onViewDetails={() => {
                                setOpenRowMenuId(null);
                                setDetailVisit(v);
                              }}
                              onPrint={() => {
                                setOpenRowMenuId(null);
                                handlePrintVisit(v);
                              }}
                              onOpenTimeline={() => {
                                setOpenRowMenuId(null);
                                router.push(
                                  `${ROUTES.emergencyClinicalTimeline}?entryId=${entry.id}`,
                                );
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </ScrollableTable>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
                      {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}{' '}
                      visits
                    </p>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          aria-label="Previous page"
                          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                          style={{ border: '1px solid rgba(0,100,130,0.2)' }}
                        >
                          <ChevronLeft style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            className={`flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 ${FOCUS_RING}`}
                            style={{
                              fontSize: 14,
                              color: p === currentPage ? '#FFFFFF' : '#0D2630',
                              background: p === currentPage ? '#0D2630' : 'transparent',
                              border: p === currentPage ? 'none' : '1px solid rgba(0,100,130,0.2)',
                            }}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          aria-label="Next page"
                          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                          style={{ border: '1px solid rgba(0,100,130,0.2)' }}
                        >
                          <ChevronRight style={{ width: 15, height: 15, color: '#4A7080' }} />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Visit Legend */}
            <div
              className="mt-4 rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-1.5">
                <Info style={{ width: 15, height: 15, color: '#00B4D8' }} />
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 15, color: '#0D2630' }}
                >
                  Visit Legend
                </p>
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {DISPOSITION_LEGEND.map((d) => (
                  <div key={d.key}>
                    <DispositionPill disposition={d.key} />
                    <p className="mt-1" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {d.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Patient Summary
                </p>
                <button
                  type="button"
                  onClick={() => router.push(ROUTES.patients)}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View Full Profile
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>MRN</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {entry.mrn}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Age / Sex</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {entry.age} Years / {entry.gender}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Blood Group</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {bloodGroup}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>Phone</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    {emergencyContact.phone}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Vital Signs (Latest)
                </p>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`${ROUTES.emergencyResultsReview}?entryId=${entry.id}`)
                  }
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View Latest
                </button>
              </div>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>BP</p>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {vitals.bp}
                  </p>
                </div>
                <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>HR</p>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#DC2626' }}>
                    {vitals.hr}
                  </p>
                </div>
                <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>RR</p>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {vitals.rr}
                  </p>
                </div>
                <div className="rounded-[8px] p-2" style={{ background: '#F5FBFD' }}>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>SpO₂</p>
                  <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                    {vitals.spo2}%
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Allergies
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: '#16A34A' }} />
                <span style={{ fontSize: 14, color: '#16A34A' }}>No Known Allergies</span>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Chronic Conditions
              </p>
              {chronicConditions.length === 0 ? (
                <p className="mt-2.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                  None recorded.
                </p>
              ) : (
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {chronicConditions.map((c) => (
                    <li key={c} className="flex items-center gap-1.5">
                      <span className="size-1 rounded-full" style={{ background: '#4A7080' }} />
                      <span style={{ fontSize: 14, color: '#0D2630' }}>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.registrationEmergency)}
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    New ED Visit
                  </button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`${ROUTES.emergencyClinicalNotes}?entryId=${entry.id}`)
                    }
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <FileText style={{ width: 14, height: 14 }} />
                    Add Clinical Note
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`${ROUTES.emergencyClinicalNotes}?entryId=${entry.id}`)
                  }
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  View Clinical Notes
                </button>
                <button
                  type="button"
                  onClick={handlePrintAllVisits}
                  className={`flex h-10 items-center justify-center gap-1.5 rounded-[8px] px-2 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Printer style={{ width: 14, height: 14 }} />
                  Print Visit Summary
                </button>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Recent Visits (Quick View)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDispositionFilter('ALL');
                    setDateFilter('ALL');
                    setSearch('');
                    setPage(1);
                  }}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {sortedVisits.slice(0, 3).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setDetailVisit(v)}
                    className={`flex items-start justify-between gap-2 text-left transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  >
                    <div className="min-w-0">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>
                        {formatHumanDate(v.dateTime)} {formatTime(v.dateTime)}
                      </p>
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {v.diagnosis}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
          All times are current. Data updates automatically.
        </p>
      </div>

      {detailVisit && (
        <VisitDetailModal
          visit={detailVisit}
          patientName={entry.patientName}
          onClose={() => setDetailVisit(null)}
        />
      )}
    </main>
  );
}
