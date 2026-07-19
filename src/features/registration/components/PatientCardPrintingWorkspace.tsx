'use client';

import {
  AlertOctagon,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileSignature,
  Layers,
  MoreVertical,
  Plus,
  Printer,
  Search,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { getInitials } from '@lib/utils';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  CARD_STATS,
  CARD_STATUS_OPTIONS,
  CARD_TYPE_OPTIONS,
  PATIENT_CARDS,
  type CardStatus,
  type CardType,
  type PatientCard,
} from '@/features/registration/__mocks__/patientCardFixtures';
import { PatientIdCard } from './PatientIdCard';

const NewCardPrintModal = dynamic(
  () => import('./NewCardPrintModal').then((m) => m.NewCardPrintModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const CardTemplatesModal = dynamic(
  () => import('./CardTemplatesModal').then((m) => m.CardTemplatesModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const ROWS_PER_PAGE = 8;
const AVATAR_COLORS = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#00B4D8', '#EF4444'];

const TYPE_CFG: Record<CardType, { color: string; border: string; bg: string }> = {
  Student: { color: '#00B4D8', border: 'rgba(0,180,216,0.35)', bg: 'rgba(0,180,216,0.08)' },
  Staff: { color: '#8B5CF6', border: 'rgba(139,92,246,0.35)', bg: 'rgba(139,92,246,0.08)' },
  Dependent: { color: '#22C55E', border: 'rgba(34,197,94,0.35)', bg: 'rgba(34,197,94,0.08)' },
  Visitor: { color: '#F59E0B', border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.08)' },
};

const STATUS_CFG: Record<CardStatus, { color: string; border: string; bg: string }> = {
  Printed: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  'Reprint Requested': {
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'rgba(0,180,216,0.06)',
  },
  Expired: { color: '#8A98A3', border: 'rgba(138,152,163,0.40)', bg: 'rgba(138,152,163,0.06)' },
  'Lost/Damaged': { color: '#EF4444', border: 'rgba(239,68,68,0.40)', bg: 'rgba(239,68,68,0.06)' },
};

function buildCardHtml(card: PatientCard): string {
  return `
    <h1>${escapeHtml(card.cardType)} ID Card — ${escapeHtml(card.patientName)}</h1>
    <p class="meta">${escapeHtml(card.id)}</p>
    <hr />
    <table>
      <tr><th>Patient</th><td>${escapeHtml(card.patientName)}</td></tr>
      <tr><th>MRN</th><td>${escapeHtml(card.mrn)}</td></tr>
      <tr><th>Patient ID</th><td>${escapeHtml(card.patientId)}</td></tr>
      <tr><th>Gender</th><td>${escapeHtml(card.gender)}</td></tr>
      <tr><th>Blood Group</th><td>${escapeHtml(card.bloodGroup)}</td></tr>
      <tr><th>Card Type</th><td>${escapeHtml(card.cardType)}</td></tr>
      <tr><th>Issue Date</th><td>${escapeHtml(formatHumanDate(card.issueDate))}</td></tr>
      <tr><th>Expiry Date</th><td>${escapeHtml(formatHumanDate(card.expiryDate))}</td></tr>
    </table>
    <p class="content">UNIZIK Medical Centre — property of the university. If found, please return to the Registration desk.</p>
  `;
}

function RowMenu({
  onView,
  onReprint,
  onReportLost,
}: {
  onView: () => void;
  onReprint: () => void;
  onReportLost: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="More actions"
        className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-30 mt-1.5 w-48 overflow-hidden rounded-[12px] bg-white py-1.5 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          }}
        >
          {[
            { label: 'View Card', onClick: onView },
            { label: 'Reprint Card', onClick: onReprint },
            { label: 'Report Lost/Damaged', onClick: onReportLost, danger: true },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: item.danger ? '#EF4444' : '#2F3A40' }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PatientCardPrintingWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [cards, setCards] = useState<PatientCard[]>(PATIENT_CARDS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(PATIENT_CARDS[0]?.id ?? null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createInitialType, setCreateInitialType] = useState<CardType | undefined>(undefined);
  const [createPrefill, setCreatePrefill] = useState<
    { name: string; mrn: string; gender?: string; dob?: string } | undefined
  >(undefined);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Consume a `?prefill=[{name,mrn,gender,dob}]` handoff from Patient Directory's
  // Print Patient Card actions. A single patient opens New Card Print pre-filled;
  // several are added straight to the queue as Pending (the modal is single-patient
  // only), then the query string is cleared so a refresh doesn't re-trigger it.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('prefill');
    if (!raw) return;
    // Defer so the setState calls happen in an async callback, not
    // synchronously in the effect body (satisfies react-hooks/set-state-in-effect).
    const id = setTimeout(() => {
      try {
        const parsed = JSON.parse(raw) as {
          name: string;
          mrn: string;
          gender?: string;
          dob?: string;
        }[];
        if (parsed.length === 1 && parsed[0]) {
          setCreatePrefill(parsed[0]);
          setCreating(true);
        } else if (parsed.length > 1) {
          const now = new Date().toISOString();
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 365);
          const added: PatientCard[] = parsed.map((p, i) => ({
            id: `CARD-2026-BULK-${Date.now().toString().slice(-6)}${i}`,
            patientName: p.name,
            mrn: p.mrn,
            patientId: `PT-${Date.now().toString().slice(-6)}${i}`,
            gender: p.gender === 'Female' ? 'Female' : 'Male',
            dateOfBirth: p.dob ?? '',
            bloodGroup: 'O+',
            cardType: 'Student',
            issueDate: now,
            expiryDate: expiry.toISOString().slice(0, 10),
            status: 'Pending',
            printCount: 0,
            lastPrintedBy: '—',
          }));
          setCards((prev) => [...added, ...prev]);
          toast.success(
            'Added to print queue',
            `${added.length} patients added from Patient Directory.`,
          );
        }
      } catch {
        // malformed prefill param -- ignore rather than crash the page
      }
      router.replace(ROUTES.registrationCardPrinting);
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      if (typeFilter && c.cardType !== typeFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (dateFilter && c.issueDate.slice(0, 10) !== dateFilter) return false;
      if (
        q &&
        !c.patientName.toLowerCase().includes(q) &&
        !c.mrn.toLowerCase().includes(q) &&
        !c.id.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [cards, search, typeFilter, statusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const selected = selectedId ? (cards.find((c) => c.id === selectedId) ?? null) : null;

  function selectCard(c: PatientCard) {
    setSelectedId(c.id);
    setShowDetailOnMobile(true);
  }

  function handleReset() {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setDateFilter('');
    setCurrentPage(1);
    toast.info('Filters cleared', 'Showing every card.');
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} card${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function updateCard(id: string, updater: (c: PatientCard) => PatientCard) {
    setCards((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  function handlePrint(card: PatientCard) {
    updateCard(card.id, (c) => ({
      ...c,
      status: 'Printed',
      printCount: c.printCount + 1,
      lastPrintedBy: 'Adaobi Nwankwo',
    }));
    downloadPDF(`card-${card.id}`, buildCardHtml(card));
    toast.success(
      'Card sent to print',
      `${card.patientName}'s ${card.cardType.toLowerCase()} card is printing.`,
    );
  }

  function handleReprint(card: PatientCard) {
    updateCard(card.id, (c) => ({
      ...c,
      status: 'Printed',
      printCount: c.printCount + 1,
      lastPrintedBy: 'Adaobi Nwankwo',
    }));
    downloadPDF(`card-${card.id}-reprint`, buildCardHtml(card));
    toast.success('Reprint sent', `A reprint of ${card.patientName}'s card has been queued.`);
  }

  function handleReportLost(card: PatientCard) {
    updateCard(card.id, (c) => ({ ...c, status: 'Lost/Damaged' }));
    toast.info('Reported lost/damaged', `${card.patientName}'s card has been flagged for reprint.`);
  }

  function handleDownload(card: PatientCard) {
    downloadPDF(`card-${card.id}`, buildCardHtml(card));
    toast.success('Download ready', `${card.patientName}'s card downloaded as PDF.`);
  }

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkPrint() {
    if (checkedIds.size === 0) return;
    const targets = cards.filter((c) => checkedIds.has(c.id));
    setCards((prev) =>
      prev.map((c) =>
        checkedIds.has(c.id)
          ? {
              ...c,
              status: 'Printed',
              printCount: c.printCount + 1,
              lastPrintedBy: 'Adaobi Nwankwo',
            }
          : c,
      ),
    );
    toast.success(
      'Batch print started',
      `${targets.length} card${targets.length !== 1 ? 's' : ''} sent to print.`,
    );
    setCheckedIds(new Set());
  }

  function handleCreateCard(card: PatientCard) {
    setCards((prev) => [card, ...prev]);
    setCreating(false);
    setCreateInitialType(undefined);
    setCreatePrefill(undefined);
    toast.success('Added to print queue', `${card.patientName}'s card is ready to print.`);
    selectCard(card);
  }

  function handleUseTemplate(cardType: CardType) {
    setTemplatesOpen(false);
    setCreateInitialType(cardType);
    setCreating(true);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1520px] px-4 py-4 sm:px-6 sm:py-5">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push(ROUTES.registration)}
              className="transition-colors duration-150 hover:text-[#00B4D8] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
              style={{ fontSize: 14, color: '#8A98A3' }}
            >
              Dashboard
            </button>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>Operations</span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              Patient Card Printing
            </span>
          </nav>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Patient Card Printing
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Issue, print, and manage patient identification cards.
              </p>
            </div>
            <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Plus style={{ width: 15, height: 15 }} />
                New Card Print
              </button>
            </PermissionGate>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {CARD_STATS.map((s) => (
              <div
                key={s.id}
                className="rounded-[12px] p-4"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: s.bg }}
                  >
                    <s.icon style={{ width: 17, height: 17, color: s.color }} />
                  </div>
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {s.label}
                  </p>
                </div>
                <p
                  className="font-display mt-2 font-semibold"
                  style={{ fontSize: 22, color: '#0D2630' }}
                >
                  {s.value}
                </p>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, color: s.trendDirection === 'up' ? '#16A34A' : '#DC2626' }}
                >
                  {s.trendDirection === 'up' ? '↑' : '↓'} {s.trendPercent}% {s.trendLabel}
                </p>
              </div>
            ))}
          </div>

          {/* ── Quick Actions ──────────────────────────────────────────────── */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Quick Actions
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                {
                  icon: Plus,
                  label: 'New Card Print',
                  onClick: () => setCreating(true),
                  gated: true,
                },
                { icon: Layers, label: 'Batch Print', onClick: handleBulkPrint, gated: true },
                {
                  icon: FileSignature,
                  label: 'Reprint Card',
                  onClick: () =>
                    selected
                      ? handleReprint(selected)
                      : toast.info('Select a card', 'Choose a card from the list first.'),
                  gated: true,
                },
                {
                  icon: CreditCard,
                  label: 'Card Templates',
                  onClick: () => setTemplatesOpen(true),
                  gated: false,
                },
              ].map((a) => {
                const tile = (
                  <button
                    type="button"
                    onClick={a.onClick}
                    className="flex flex-col items-center gap-2 rounded-[10px] px-3 py-4 text-center transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'rgba(0,180,216,0.12)' }}
                    >
                      <a.icon style={{ width: 17, height: 17, color: '#00B4D8' }} />
                    </div>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {a.label}
                    </span>
                  </button>
                );
                if (!a.gated) return <div key={a.label}>{tile}</div>;
                return (
                  <PermissionGate key={a.label} permission={PERMISSIONS.PATIENTS_WRITE}>
                    {tile}
                  </PermissionGate>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
            {/* ── List pane ────────────────────────────────────────────────── */}
            <div className={`min-w-0 flex-1 ${showDetailOnMobile ? 'hidden xl:block' : 'block'}`}>
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                      style={{ width: 16, height: 16, color: '#8A98A3' }}
                    />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by patient name, MRN or card ID..."
                      className="h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50"
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApplyFilters}
                      className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      Filters
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FormSelect
                    id="card-type-filter"
                    value={typeFilter}
                    onChange={(v) => {
                      setTypeFilter(v);
                      setCurrentPage(1);
                    }}
                    options={CARD_TYPE_OPTIONS}
                    placeholder="All Card Types"
                  />
                  <FormSelect
                    id="card-status-filter"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    options={CARD_STATUS_OPTIONS}
                    placeholder="All Status"
                  />
                  <FormDateInput
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Issue date"
                  />
                </div>

                {checkedIds.size > 0 && (
                  <div
                    className="mt-3 flex items-center justify-between gap-3 rounded-[10px] px-4 py-2.5"
                    style={{
                      background: 'rgba(0,180,216,0.08)',
                      border: '1px solid rgba(0,180,216,0.3)',
                    }}
                  >
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {checkedIds.size} card{checkedIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCheckedIds(new Set())}
                        className="font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Clear
                      </button>
                      <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                        <button
                          type="button"
                          onClick={handleBulkPrint}
                          className="flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, background: '#00B4D8' }}
                        >
                          <Printer style={{ width: 14, height: 14 }} />
                          Print Selected
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                )}

                <div className="mt-4 overflow-x-auto scroll-smooth">
                  <div className="min-w-[1180px]">
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="flex w-10 shrink-0 items-center justify-center py-2.5 pl-3">
                        <span className="sr-only">Select</span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Card ID
                        </span>
                      </div>
                      <div className="w-44 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Patient
                        </span>
                      </div>
                      <div className="w-32 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Card Type
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Issue Date
                        </span>
                      </div>
                      <div className="min-w-[120px] flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Expiry Date
                        </span>
                      </div>
                      <div className="w-44 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Status
                        </span>
                      </div>
                      <div className="w-20 shrink-0 py-2.5 pr-3 text-right">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                    </div>

                    {pageRows.length === 0 && (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div
                          className="flex size-14 items-center justify-center rounded-full"
                          style={{ background: 'rgba(226,237,241,0.6)' }}
                        >
                          <Search style={{ width: 24, height: 24, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-medium"
                          style={{ fontSize: 16, color: '#4A7080' }}
                        >
                          No cards match your filters
                        </p>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, color: '#00B4D8' }}
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}

                    {pageRows.map((c, i) => {
                      const typeCfg = TYPE_CFG[c.cardType];
                      const statusCfg = STATUS_CFG[c.status];
                      const isExpired = c.status === 'Expired';
                      return (
                        <div
                          key={c.id}
                          onClick={() => selectCard(c)}
                          className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{
                            borderBottom: '1px solid rgba(0,100,130,0.08)',
                            background: selectedId === c.id ? '#E6F8FD' : 'transparent',
                          }}
                        >
                          <div
                            className="flex w-10 shrink-0 items-center justify-center py-3 pl-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={checkedIds.has(c.id)}
                              onChange={() => toggleCheck(c.id)}
                              className="size-4 cursor-pointer rounded"
                              style={{ accentColor: '#00B4D8' }}
                              aria-label={`Select ${c.id}`}
                            />
                          </div>
                          <div className="w-36 shrink-0 py-3 pr-2">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {c.id}
                            </p>
                          </div>
                          <div className="flex w-44 shrink-0 items-center gap-2.5 py-3 pr-2">
                            <div
                              className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                              style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                            >
                              {getInitials(c.patientName)}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {c.patientName}
                              </p>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {c.mrn}
                              </p>
                            </div>
                          </div>
                          <div className="w-32 shrink-0 py-3 pr-2">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: typeCfg.color,
                                border: `1px solid ${typeCfg.border}`,
                                background: typeCfg.bg,
                              }}
                            >
                              {c.cardType}
                            </span>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(c.issueDate)}
                            </p>
                          </div>
                          <div className="min-w-[120px] flex-1 py-3 pr-2">
                            <p style={{ fontSize: 14, color: isExpired ? '#EF4444' : '#4A7080' }}>
                              {formatHumanDate(c.expiryDate)}
                            </p>
                          </div>
                          <div className="w-44 shrink-0 py-3 pr-2">
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                              style={{
                                fontSize: 14,
                                whiteSpace: 'nowrap',
                                color: statusCfg.color,
                                border: `1px solid ${statusCfg.border}`,
                                background: statusCfg.bg,
                              }}
                            >
                              {c.status}
                            </span>
                          </div>
                          <div
                            className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => selectCard(c)}
                              aria-label={`View ${c.id}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenu
                              onView={() => selectCard(c)}
                              onReprint={() => handleReprint(c)}
                              onReportLost={() => handleReportLost(c)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {filtered.length > 0 && (
                  <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      Showing {pageStart + 1} to{' '}
                      {Math.min(pageStart + ROWS_PER_PAGE, filtered.length)} of {filtered.length}{' '}
                      cards
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className="flex size-9 items-center justify-center rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            border: `1px solid ${p === safePage ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                            color: p === safePage ? '#00B4D8' : '#4A7080',
                            background: p === safePage ? '#E6F8FD' : 'transparent',
                          }}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safePage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ border: '1px solid rgba(0,100,130,0.18)', color: '#4A7080' }}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14, color: '#4A7080' }}>Rows per page:</span>
                      <select
                        value={ROWS_PER_PAGE}
                        disabled
                        className="h-9 rounded-[8px] px-2 font-sans outline-none"
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      >
                        <option value={ROWS_PER_PAGE}>{ROWS_PER_PAGE}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Detail panel ─────────────────────────────────────────────── */}
            {selected && (
              <div
                className={`flex w-full shrink-0 flex-col overflow-hidden xl:w-[400px] ${showDetailOnMobile ? 'flex' : 'hidden xl:flex'}`}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(0,100,130,0.12)',
                  borderRadius: 12,
                  maxHeight: 'calc(100vh - 96px)',
                }}
              >
                <div
                  className="flex shrink-0 items-start justify-between gap-2 px-4 py-4 sm:px-5"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.10)' }}
                >
                  <div>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Card Preview
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>{selected.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      setShowDetailOnMobile(false);
                    }}
                    aria-label="Close"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  >
                    <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 py-4 sm:px-5">
                  <PatientIdCard card={selected} />

                  <div className="mt-5 flex flex-col gap-2.5">
                    {[
                      ['Status', selected.status],
                      ['Print Count', String(selected.printCount)],
                      ['Last Printed By', selected.lastPrintedBy],
                      [
                        'Issue Date',
                        `${formatHumanDate(selected.issueDate)} ${formatTime(selected.issueDate)}`,
                      ],
                      ['Expiry Date', formatHumanDate(selected.expiryDate)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                        <span
                          className="max-w-[220px] truncate text-right font-sans font-medium"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Actions
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                        <button
                          type="button"
                          onClick={() => handlePrint(selected)}
                          className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, background: '#00B4D8' }}
                        >
                          <Printer style={{ width: 14, height: 14 }} />
                          Print
                        </button>
                      </PermissionGate>
                      <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                        <button
                          type="button"
                          onClick={() => handleReprint(selected)}
                          className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#0D2630',
                            border: '1px solid rgba(0,100,130,0.2)',
                          }}
                        >
                          <FileSignature style={{ width: 14, height: 14 }} />
                          Reprint
                        </button>
                      </PermissionGate>
                      <button
                        type="button"
                        onClick={() => handleDownload(selected)}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        <Download style={{ width: 14, height: 14 }} />
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(selected.mrn);
                          toast.success('Copied', `${selected.mrn} copied to clipboard.`);
                        }}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        <Copy style={{ width: 14, height: 14 }} />
                        Copy MRN
                      </button>
                      <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                        <button
                          type="button"
                          onClick={() => handleReportLost(selected)}
                          className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{
                            fontSize: 14,
                            color: '#EF4444',
                            border: '1px solid rgba(239,68,68,0.35)',
                          }}
                        >
                          <AlertOctagon style={{ width: 14, height: 14 }} />
                          Report Lost/Damaged
                        </button>
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>
      </main>

      {creating && (
        <NewCardPrintModal
          initialCardType={createInitialType}
          initialPatientName={createPrefill?.name}
          initialMrn={createPrefill?.mrn}
          initialGender={createPrefill?.gender}
          initialDateOfBirth={createPrefill?.dob}
          onClose={() => {
            setCreating(false);
            setCreateInitialType(undefined);
            setCreatePrefill(undefined);
          }}
          onCreate={handleCreateCard}
        />
      )}
      {templatesOpen && (
        <CardTemplatesModal
          onClose={() => setTemplatesOpen(false)}
          onUseTemplate={handleUseTemplate}
        />
      )}
    </div>
  );
}
