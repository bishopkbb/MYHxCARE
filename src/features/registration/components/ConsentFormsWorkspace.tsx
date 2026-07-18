'use client';

import {
  Copy,
  Download,
  Edit3,
  Eye,
  FileSignature,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Printer,
  Search,
  User as UserIcon,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { getInitials } from '@lib/utils';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { computeAge } from '@/features/registration/schemas/registerPatientSchema';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  CONSENT_DEPARTMENT_OPTIONS,
  CONSENT_DOCTOR_OPTIONS,
  CONSENT_FORMS,
  CONSENT_QUICK_ACTIONS,
  CONSENT_STATS,
  CONSENT_STATUS_OPTIONS,
  CONSENT_TYPE_OPTIONS,
  PROCEDURE_TYPE_OPTIONS,
  type ConsentForm,
  type ConsentStatus,
  type ConsentType,
  type SignerRole,
} from '@/features/registration/__mocks__/consentFormFixtures';

const NewConsentFormModal = dynamic(
  () => import('./NewConsentFormModal').then((m) => m.NewConsentFormModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ConsentPreviewModal = dynamic(
  () => import('./ConsentPreviewModal').then((m) => m.ConsentPreviewModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const ROWS_PER_PAGE_OPTIONS = [8, 16, 24];
const AVATAR_COLORS = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EC4899', '#00B4D8', '#EF4444'];

const STATUS_CFG: Record<ConsentStatus, { color: string; border: string; bg: string }> = {
  Pending: { color: '#F59E0B', border: 'rgba(245,158,11,0.40)', bg: 'rgba(245,158,11,0.06)' },
  'Awaiting Patient': {
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.40)',
    bg: 'rgba(0,180,216,0.06)',
  },
  Signed: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'transparent' },
  Archived: { color: '#8A98A3', border: 'rgba(138,152,163,0.40)', bg: 'rgba(138,152,163,0.06)' },
};

const CONSENT_TYPE_CFG: Record<ConsentType, { color: string; border: string; bg: string }> = {
  'Surgery Consent': {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.35)',
    bg: 'rgba(139,92,246,0.08)',
  },
  'Blood Transfusion': {
    color: '#EF4444',
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.08)',
  },
  'Radiology Consent': {
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.35)',
    bg: 'rgba(59,130,246,0.08)',
  },
  'Laboratory Consent': {
    color: '#00B4D8',
    border: 'rgba(0,180,216,0.35)',
    bg: 'rgba(0,180,216,0.08)',
  },
  'General Treatment': {
    color: '#22C55E',
    border: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.08)',
  },
  'Anaesthesia Consent': {
    color: '#A855F7',
    border: 'rgba(168,85,247,0.35)',
    bg: 'rgba(168,85,247,0.08)',
  },
  'Telemedicine Consent': {
    color: '#6366F1',
    border: 'rgba(99,102,241,0.35)',
    bg: 'rgba(99,102,241,0.08)',
  },
  'Data Privacy Consent': {
    color: '#6B7280',
    border: 'rgba(107,114,128,0.35)',
    bg: 'rgba(107,114,128,0.08)',
  },
};

function formatDateTimeHuman(iso: string): string {
  if (!iso) return '—';
  return `${formatHumanDate(iso)} ${formatTime(iso)}`;
}

// Deterministic decorative QR-like pattern — purely visual, not a real scannable code.
function QrPattern({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const size = 10;
  const cells = Array.from({ length: size * size }, (_, i) => {
    const bit = (hash >> (i % 24)) & 1;
    const corner =
      (i < 3 && i % size < 3) ||
      (i >= size * (size - 3) && i % size < 3) ||
      (i < size * 3 && i % size >= size - 3);
    return corner ? 1 : bit;
  });
  return (
    <div
      className="grid shrink-0 gap-0.5 rounded-[8px] bg-white p-2"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        width: 112,
        height: 112,
        border: '1px solid rgba(0,100,130,0.12)',
      }}
    >
      {cells.map((v, i) => (
        <div key={i} style={{ background: v ? '#0D2630' : 'transparent' }} />
      ))}
    </div>
  );
}

function RowMenu({
  onView,
  onEdit,
  onPrint,
  onArchive,
}: {
  onView: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onArchive: () => void;
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
            { label: 'View Consent', onClick: onView },
            { label: 'Edit Consent', onClick: onEdit },
            { label: 'Print Consent', onClick: onPrint },
            { label: 'Archive Consent', onClick: onArchive, danger: true },
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

export function ConsentFormsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const [consents, setConsents] = useState<ConsentForm[]>(CONSENT_FORMS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [procedureFilter, setProcedureFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [selectedId, setSelectedId] = useState<string | null>(CONSENT_FORMS[0]?.id ?? null);
  const [detailTab, setDetailTab] = useState<'Overview' | 'Timeline' | 'Audit Trail'>('Overview');
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ConsentForm | null>(null);
  const [previewing, setPreviewing] = useState<ConsentForm | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return consents.filter((c) => {
      if (c.status === 'Archived') return false;
      if (typeFilter && c.consentType !== typeFilter) return false;
      if (deptFilter && c.department !== deptFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (doctorFilter && c.doctor !== doctorFilter) return false;
      if (procedureFilter && c.procedure !== procedureFilter) return false;
      if (dateFilter && c.dateIssued.slice(0, 10) !== dateFilter) return false;
      if (
        q &&
        !c.patientName.toLowerCase().includes(q) &&
        !c.mrn.toLowerCase().includes(q) &&
        !c.id.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [
    consents,
    search,
    typeFilter,
    deptFilter,
    statusFilter,
    doctorFilter,
    procedureFilter,
    dateFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);
  const selected = selectedId ? (consents.find((c) => c.id === selectedId) ?? null) : null;

  function selectConsent(c: ConsentForm) {
    setSelectedId(c.id);
    setDetailTab('Overview');
    setShowDetailOnMobile(true);
  }

  function handleReset() {
    setSearch('');
    setTypeFilter('');
    setDeptFilter('');
    setStatusFilter('');
    setDoctorFilter('');
    setDateFilter('');
    setProcedureFilter('');
    setCurrentPage(1);
    toast.info('Filters cleared', 'Showing every consent form.');
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} consent form${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function updateConsent(id: string, updater: (c: ConsentForm) => ConsentForm) {
    setConsents((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  function handleSignatureToggle(consent: ConsentForm, role: SignerRole) {
    const now = new Date().toISOString();
    updateConsent(consent.id, (c) => {
      const signatures = c.signatures.map((s) =>
        s.role === role && s.status === 'Pending'
          ? { ...s, status: 'Signed' as const, signedOn: now }
          : s,
      );
      const allSigned = signatures.every((s) => s.status === 'Signed');
      const patientSig = signatures.find((s) => s.role === 'Patient / Guardian');
      const status: ConsentStatus = allSigned
        ? 'Signed'
        : patientSig && patientSig.status === 'Pending'
          ? 'Awaiting Patient'
          : 'Pending';
      return {
        ...c,
        signatures,
        status,
        audit: [
          ...c.audit,
          { id: `au-${Date.now()}`, action: `${role} signed`, actor: role, dateTime: now },
        ],
      };
    });
    toast.success('Signature recorded', `${role} signature captured for ${consent.id}.`);
  }

  function handleRequestSignature(consent: ConsentForm | null) {
    if (!consent) {
      toast.info('Select a consent form', 'Choose a consent form from the list first.');
      return;
    }
    const now = new Date().toISOString();
    updateConsent(consent.id, (c) => ({
      ...c,
      audit: [
        ...c.audit,
        {
          id: `au-${Date.now()}`,
          action: 'Signature requested',
          actor: 'Adaobi Nwankwo',
          dateTime: now,
        },
      ],
    }));
    toast.success('Request sent', `Digital signature requested for ${consent.id}.`);
  }

  function handleArchive(consent: ConsentForm | null) {
    if (!consent) {
      toast.info('Select a consent form', 'Choose a consent form from the list first.');
      return;
    }
    updateConsent(consent.id, (c) => ({ ...c, status: 'Archived' }));
    if (selectedId === consent.id) setSelectedId(null);
    toast.success('Consent archived', `${consent.id} has been archived.`);
  }

  function handleUpload(consent: ConsentForm | null) {
    if (!consent) {
      toast.info('Select a consent form', 'Choose a consent form from the list first.');
      return;
    }
    toast.success('Signed copy uploaded', `A signed copy has been attached to ${consent.id}.`);
  }

  function handlePrint(consent: ConsentForm | null) {
    if (!consent) {
      toast.info('Select a consent form', 'Choose a consent form from the list first.');
      return;
    }
    setPreviewing(consent);
  }

  function handleQuickAction(id: string) {
    switch (id) {
      case 'new':
      case 'generate':
        setCreating(true);
        return;
      case 'request-signature':
        handleRequestSignature(selected);
        return;
      case 'print':
        handlePrint(selected);
        return;
      case 'upload':
        handleUpload(selected);
        return;
      case 'archive':
        handleArchive(selected);
        return;
      default:
        return;
    }
  }

  function handleCreateOrSave(consent: ConsentForm) {
    if (editing) {
      updateConsent(consent.id, () => consent);
      toast.success('Consent updated', `${consent.id} has been updated.`);
      setEditing(null);
    } else {
      setConsents((prev) => [consent, ...prev]);
      toast.success('Consent form created', `${consent.id} has been created.`);
      setCreating(false);
      selectConsent(consent);
    }
  }

  const age = selected ? computeAge(selected.dateOfBirth) : null;

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
              Consent Forms
            </span>
          </nav>

          <div className="mt-2">
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Consent Forms
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Manage patient consent forms and treatment authorizations.
            </p>
          </div>

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CONSENT_STATS.map((s) => (
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
                    <s.icon style={{ width: 16, height: 16, color: s.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {s.label}
                    </p>
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 22, color: '#0D2630' }}
                    >
                      {s.value}
                    </p>
                  </div>
                </div>
                <p
                  className="mt-2"
                  style={{
                    fontSize: 14,
                    color:
                      s.trendPercent === 0
                        ? '#8A98A3'
                        : s.trendDirection === 'up'
                          ? '#22C55E'
                          : '#EF4444',
                  }}
                >
                  {s.trendPercent === 0
                    ? s.trendLabel
                    : `${s.trendDirection === 'up' ? '↑' : '↓'} ${s.trendPercent}% ${s.trendLabel}`}
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
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {CONSENT_QUICK_ACTIONS.map((a) => {
                const tile = (
                  <button
                    type="button"
                    onClick={() => handleQuickAction(a.id)}
                    className="flex flex-col items-center gap-2 rounded-[10px] px-3 py-4 text-center transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: a.bg }}
                    >
                      <a.icon style={{ width: 17, height: 17, color: a.color }} />
                    </div>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {a.label}
                    </span>
                  </button>
                );
                if (a.id === 'print') return <div key={a.id}>{tile}</div>;
                return (
                  <PermissionGate key={a.id} permission={PERMISSIONS.PATIENTS_WRITE}>
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
                      placeholder="Search by patient name, MRN or consent ID..."
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

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div>
                    <label
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Consent Type
                    </label>
                    <FormSelect
                      id="con-type-filter"
                      value={typeFilter}
                      onChange={(v) => {
                        setTypeFilter(v);
                        setCurrentPage(1);
                      }}
                      options={CONSENT_TYPE_OPTIONS}
                      placeholder="All Types"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Department
                    </label>
                    <FormSelect
                      id="con-dept-filter"
                      value={deptFilter}
                      onChange={(v) => {
                        setDeptFilter(v);
                        setCurrentPage(1);
                      }}
                      options={CONSENT_DEPARTMENT_OPTIONS}
                      placeholder="All Departments"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Signature Status
                    </label>
                    <FormSelect
                      id="con-status-filter"
                      value={statusFilter}
                      onChange={(v) => {
                        setStatusFilter(v);
                        setCurrentPage(1);
                      }}
                      options={CONSENT_STATUS_OPTIONS}
                      placeholder="All Status"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Doctor
                    </label>
                    <FormSelect
                      id="con-doctor-filter"
                      value={doctorFilter}
                      onChange={(v) => {
                        setDoctorFilter(v);
                        setCurrentPage(1);
                      }}
                      options={CONSENT_DOCTOR_OPTIONS}
                      placeholder="All Doctors"
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Date Created
                    </label>
                    <FormDateInput
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Procedure Type
                    </label>
                    <FormSelect
                      id="con-procedure-filter"
                      value={procedureFilter}
                      onChange={(v) => {
                        setProcedureFilter(v);
                        setCurrentPage(1);
                      }}
                      options={PROCEDURE_TYPE_OPTIONS}
                      placeholder="All Procedure Types"
                    />
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto scroll-smooth">
                  <div className="min-w-[1100px]">
                    <div
                      className="flex rounded-t-[8px]"
                      style={{
                        background: 'rgba(226,237,241,0.4)',
                        borderBottom: '1px solid #E6F8FD',
                      }}
                    >
                      <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Consent ID
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Patient
                        </span>
                      </div>
                      <div className="w-36 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Consent Type
                        </span>
                      </div>
                      <div className="min-w-[140px] flex-1 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Department
                        </span>
                      </div>
                      <div className="w-40 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Doctor
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
                        <span
                          className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Date Issued
                        </span>
                      </div>
                      <div className="w-28 shrink-0 py-2.5 pr-2">
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
                          No consent forms match your filters
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
                      const statusCfg = STATUS_CFG[c.status];
                      const typeCfg = CONSENT_TYPE_CFG[c.consentType];
                      return (
                        <div
                          key={c.id}
                          onClick={() => selectConsent(c)}
                          className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                          style={{
                            borderBottom: '1px solid rgba(0,100,130,0.08)',
                            background: selectedId === c.id ? '#E6F8FD' : 'transparent',
                          }}
                        >
                          <div className="w-36 shrink-0 py-3 pr-2 pl-3">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {c.id}
                            </p>
                          </div>
                          <div className="flex w-40 shrink-0 items-center gap-2.5 py-3 pr-2">
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
                          <div className="w-36 shrink-0 py-3 pr-2">
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
                              {c.consentType}
                            </span>
                          </div>
                          <div className="min-w-[140px] flex-1 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {c.department}
                            </p>
                          </div>
                          <div className="w-40 shrink-0 py-3 pr-2">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {c.doctor}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatHumanDate(c.dateIssued)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatTime(c.dateIssued)}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 py-3 pr-2">
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
                              onClick={() => selectConsent(c)}
                              aria-label={`View ${c.id}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(c)}
                              aria-label={`Edit ${c.id}`}
                              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            >
                              <Edit3 style={{ width: 15, height: 15, color: '#4A7080' }} />
                            </button>
                            <RowMenu
                              onView={() => selectConsent(c)}
                              onEdit={() => setEditing(c)}
                              onPrint={() => handlePrint(c)}
                              onArchive={() => handleArchive(c)}
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
                      {Math.min(pageStart + rowsPerPage, filtered.length)} of {filtered.length}{' '}
                      consent forms
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
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="h-9 rounded-[8px] px-2 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
                        style={{
                          fontSize: 14,
                          border: '1px solid rgba(0,100,130,0.18)',
                          color: '#0D2630',
                        }}
                      >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
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
                      Consent Details
                    </p>
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>Consent ID: {selected.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                      style={{
                        fontSize: 14,
                        color: STATUS_CFG[selected.status].color,
                        border: `1px solid ${STATUS_CFG[selected.status].border}`,
                        background: STATUS_CFG[selected.status].bg,
                      }}
                    >
                      {selected.status}
                    </span>
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
                </div>

                <div
                  className="flex shrink-0 gap-1 px-4 sm:px-5"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.10)' }}
                >
                  {(['Overview', 'Timeline', 'Audit Trail'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDetailTab(t)}
                      className="shrink-0 px-2.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                      style={{
                        fontSize: 14,
                        color: detailTab === t ? '#00B4D8' : '#4A7080',
                        borderBottom:
                          detailTab === t ? '2px solid #00B4D8' : '2px solid transparent',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 py-4 sm:px-5">
                  {detailTab === 'Overview' && (
                    <>
                      <div
                        className="flex items-center gap-3 rounded-[10px] p-3"
                        style={{ background: '#F5FBFD' }}
                      >
                        <div
                          className="flex size-14 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                          style={{ background: '#00B4D8', fontSize: 18 }}
                        >
                          {getInitials(selected.patientName)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="truncate font-sans font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            {selected.patientName}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{selected.mrn}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <UserIcon style={{ width: 14, height: 14, color: '#8A98A3' }} />
                          <span style={{ fontSize: 14, color: '#4A7080' }}>{selected.gender}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>DOB</span>
                          <span style={{ fontSize: 14, color: '#4A7080' }}>
                            {selected.dateOfBirth
                              ? `${formatHumanDate(selected.dateOfBirth)}${age !== null ? ` (${age} Yrs)` : ''}`
                              : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone style={{ width: 14, height: 14, color: '#8A98A3' }} />
                          <span style={{ fontSize: 14, color: '#4A7080' }}>
                            {selected.phone || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail style={{ width: 14, height: 14, color: '#8A98A3' }} />
                          <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {selected.email || '—'}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-start gap-1.5">
                          <MapPin
                            className="mt-0.5 shrink-0"
                            style={{ width: 14, height: 14, color: '#8A98A3' }}
                          />
                          <span style={{ fontSize: 14, color: '#4A7080' }}>
                            {selected.address || '—'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.registrationDirectory)}
                        className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#00B4D8',
                          border: '1px solid rgba(0,180,216,0.35)',
                        }}
                      >
                        View Full Record
                      </button>

                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Consent Information
                        </p>
                        <div className="mt-2 flex flex-col gap-2.5">
                          {[
                            ['Consent Type', selected.consentType],
                            ['Department', selected.department],
                            ['Procedure', selected.procedure],
                            ['Doctor', selected.doctor],
                            ['Date Issued', formatDateTimeHuman(selected.dateIssued)],
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
                      </div>

                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Description
                        </p>
                        <p
                          className="mt-1.5 rounded-[10px] p-3"
                          style={{
                            fontSize: 14,
                            lineHeight: '22px',
                            color: '#4A7080',
                            background: '#F5FBFD',
                          }}
                        >
                          {selected.description}
                        </p>
                      </div>

                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Required Signatures
                        </p>
                        <div className="mt-2 flex flex-col gap-2">
                          {selected.signatures.map((s) => (
                            <div
                              key={s.role}
                              className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2.5"
                              style={{ border: '1px solid rgba(0,100,130,0.10)' }}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <UserIcon
                                  style={{ width: 15, height: 15, color: '#8A98A3', flexShrink: 0 }}
                                />
                                <span
                                  className="truncate"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {s.role}
                                </span>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-0.5">
                                {s.status === 'Signed' ? (
                                  <span
                                    className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                                    style={{
                                      fontSize: 14,
                                      color: '#22C55E',
                                      border: '1px solid rgba(34,197,94,0.40)',
                                    }}
                                  >
                                    Signed
                                  </span>
                                ) : (
                                  <PermissionGate
                                    permission={PERMISSIONS.PATIENTS_WRITE}
                                    fallback={
                                      <span
                                        className="rounded-full px-2.5 py-0.5 font-sans font-medium"
                                        style={{
                                          fontSize: 14,
                                          color: '#F59E0B',
                                          border: '1px solid rgba(245,158,11,0.40)',
                                        }}
                                      >
                                        Pending
                                      </span>
                                    }
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleSignatureToggle(selected, s.role)}
                                      className="rounded-full px-2.5 py-0.5 font-sans font-medium transition-colors duration-150 hover:bg-[rgba(245,158,11,0.10)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                                      style={{
                                        fontSize: 14,
                                        color: '#F59E0B',
                                        border: '1px solid rgba(245,158,11,0.40)',
                                      }}
                                    >
                                      Pending
                                    </button>
                                  </PermissionGate>
                                )}
                                {s.signedOn && (
                                  <span style={{ fontSize: 14, color: '#8A98A3' }}>
                                    {formatDateTimeHuman(s.signedOn)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          Actions
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewing(selected)}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              fontSize: 14,
                              color: '#0D2630',
                              border: '1px solid rgba(0,100,130,0.2)',
                            }}
                          >
                            <Eye style={{ width: 14, height: 14 }} />
                            View Consent
                          </button>
                          <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                            <button
                              type="button"
                              onClick={() => setEditing(selected)}
                              className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{
                                fontSize: 14,
                                color: '#0D2630',
                                border: '1px solid rgba(0,100,130,0.2)',
                              }}
                            >
                              <Edit3 style={{ width: 14, height: 14 }} />
                              Edit Consent
                            </button>
                          </PermissionGate>
                          <button
                            type="button"
                            onClick={() => setPreviewing(selected)}
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
                            onClick={() => handlePrint(selected)}
                            className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{
                              fontSize: 14,
                              color: '#0D2630',
                              border: '1px solid rgba(0,100,130,0.2)',
                            }}
                          >
                            <Printer style={{ width: 14, height: 14 }} />
                            Print Consent
                          </button>
                          <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                            <button
                              type="button"
                              onClick={() => handleRequestSignature(selected)}
                              className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{
                                fontSize: 14,
                                color: '#0D2630',
                                border: '1px solid rgba(0,100,130,0.2)',
                              }}
                            >
                              <FileSignature style={{ width: 14, height: 14 }} />
                              Request Signature
                            </button>
                          </PermissionGate>
                          <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                            <button
                              type="button"
                              onClick={() => handleArchive(selected)}
                              className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] font-sans font-medium transition-colors duration-150 hover:bg-[rgba(239,68,68,0.06)] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{
                                fontSize: 14,
                                color: '#EF4444',
                                border: '1px solid rgba(239,68,68,0.35)',
                              }}
                            >
                              Archive Consent
                            </button>
                          </PermissionGate>
                        </div>
                      </div>

                      <div
                        className="mt-5 rounded-[12px] p-4"
                        style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.10)' }}
                      >
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          QR Verification
                        </p>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          Scan to verify this consent
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {selected.id}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard?.writeText(selected.id);
                                toast.success('Copied', `${selected.id} copied to clipboard.`);
                              }}
                              className="mt-1 flex items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              style={{ fontSize: 14, color: '#00B4D8' }}
                            >
                              <Copy style={{ width: 13, height: 13 }} />
                              Copy ID
                            </button>
                          </div>
                          <QrPattern seed={selected.id} />
                        </div>
                      </div>
                    </>
                  )}

                  {detailTab === 'Timeline' && (
                    <div className="flex flex-col gap-3">
                      {selected.timeline.length === 0 ? (
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>No activity recorded yet.</p>
                      ) : (
                        selected.timeline.map((t) => (
                          <div key={t.id} className="flex items-start gap-2.5">
                            <div
                              className="flex size-8 shrink-0 items-center justify-center rounded-full"
                              style={{ background: t.bg }}
                            >
                              <t.icon style={{ width: 15, height: 15, color: t.color }} />
                            </div>
                            <div className="min-w-0">
                              <p
                                className="font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {t.label}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatDateTimeHuman(t.dateTime)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === 'Audit Trail' && (
                    <div className="flex flex-col gap-2.5">
                      {selected.audit.length === 0 ? (
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>No audit entries yet.</p>
                      ) : (
                        selected.audit
                          .slice()
                          .reverse()
                          .map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-2 rounded-[8px] px-3 py-2.5"
                              style={{ border: '1px solid rgba(0,100,130,0.10)' }}
                            >
                              <div className="min-w-0">
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {a.action}
                                </p>
                                <p style={{ fontSize: 14, color: '#8A98A3' }}>by {a.actor}</p>
                              </div>
                              <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatDateTimeHuman(a.dateTime)}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-4" />
        </div>
      </main>

      {creating && (
        <NewConsentFormModal onClose={() => setCreating(false)} onSave={handleCreateOrSave} />
      )}
      {editing && (
        <NewConsentFormModal
          existing={editing}
          onClose={() => setEditing(null)}
          onSave={handleCreateOrSave}
        />
      )}
      {previewing && (
        <ConsentPreviewModal consent={previewing} onClose={() => setPreviewing(null)} />
      )}
    </div>
  );
}
