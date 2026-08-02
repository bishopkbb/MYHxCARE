'use client';

import {
  Activity,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileBarChart,
  MoreVertical,
  Pencil,
  Printer,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import {
  formatHumanDate,
  formatTime,
  toWATDateInput,
  watMonthStartInput,
  watMonthStartTimestamp,
} from '@/utils/datetime';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import {
  AUDIT_ACTION_COLOR,
  AUDIT_ACTION_OPTIONS,
  AUDIT_MODULE_OPTIONS,
  AUDIT_NAMED_USER_NAMES,
  AUDIT_OUTCOME_COLOR,
  AUDIT_OUTCOME_OPTIONS,
  AUDIT_USER_OPTIONS,
  type AuditAction,
  type AuditTrailEvent,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import { useAuditTrailEvents } from '@/features/pharmacy/store/auditTrailStore';

const AuditEventDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/AuditEventDetailModal').then(
      (m) => m.AuditEventDetailModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const AuditTrailSettingsModal = dynamic(
  () =>
    import('@/features/pharmacy/components/AuditTrailSettingsModal').then(
      (m) => m.AuditTrailSettingsModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const RetentionPolicyModal = dynamic(
  () =>
    import('@/features/pharmacy/components/RetentionPolicyModal').then(
      (m) => m.RetentionPolicyModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const ACTION_ICON: Record<AuditAction, typeof CheckCircle2> = {
  Dispense: CheckCircle2,
  Modify: Pencil,
  Void: XCircle,
  Access: Eye,
  Delete: Trash2,
};

type ModalState =
  { type: 'detail'; event: AuditTrailEvent } | { type: 'settings' } | { type: 'retention' } | null;

function OutcomeBadge({ event }: { event: AuditTrailEvent }) {
  const cfg = AUDIT_OUTCOME_COLOR[event.outcome];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
      style={{
        fontSize: 14,
        whiteSpace: 'nowrap',
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
      }}
    >
      {event.outcome}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className="mt-0.5 inline-block rounded-full px-2 py-0.5 font-sans"
      style={{ fontSize: 14, background: '#F1F5F9', color: '#64748B' }}
    >
      {role}
    </span>
  );
}

function RowMenu({
  event,
  onView,
  onExport,
}: {
  event: AuditTrailEvent;
  onView: () => void;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${event.id}`}
        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={180}>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onView();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          View Details
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onExport();
          }}
          className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
          style={{ fontSize: 14, color: '#2F3A40' }}
        >
          Export Record
        </button>
      </RowMenuPortal>
    </div>
  );
}

export function DispensingAuditTrailWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(watMonthStartInput());
  const [dateTo, setDateTo] = useState(toWATDateInput());
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('Dispensing');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);

  const events = useAuditTrailEvents();

  const total = events.length;
  const todayCount = events.filter((e) => toWATDateInput(e.timestamp) === toWATDateInput()).length;
  const modifiedCount = events.filter((e) => e.action === 'Modify').length;
  const deletedVoidedCount = events.filter(
    (e) => e.action === 'Void' || e.action === 'Delete',
  ).length;
  const accessedCount = events.filter((e) => e.action === 'Access').length;

  const summaryBreakdown = useMemo(() => {
    const dispenseCount = events.filter((e) => e.action === 'Dispense').length;
    return [
      { label: 'Dispense (Success)', value: dispenseCount, color: '#16A34A' },
      { label: 'Access', value: accessedCount, color: '#2563EB' },
      { label: 'Modify', value: modifiedCount, color: '#D97706' },
      { label: 'Void / Deleted', value: deletedVoidedCount, color: '#DC2626' },
    ];
  }, [events, accessedCount, modifiedCount, deletedVoidedCount]);

  const actionsByUser = useMemo(() => {
    const monthStart = watMonthStartTimestamp(0);
    const counts = new Map<string, number>();
    let othersCount = 0;
    let scopedTotal = 0;
    for (const e of events) {
      if (new Date(e.timestamp).getTime() < monthStart) continue;
      scopedTotal++;
      if (AUDIT_NAMED_USER_NAMES.includes(e.userName)) {
        counts.set(e.userName, (counts.get(e.userName) ?? 0) + 1);
      } else {
        othersCount++;
      }
    }
    const rows = AUDIT_NAMED_USER_NAMES.map((name) => ({
      label: name,
      value: counts.get(name) ?? 0,
    }));
    rows.push({ label: 'Others', value: othersCount });
    const max = Math.max(...rows.map((r) => r.value), 1);
    return {
      rows: rows.map((r) => ({ ...r, barPercent: (r.value / max) * 100 })),
      scopedTotal,
    };
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Infinity;
    return events.filter((e) => {
      if (userFilter && e.userName !== userFilter) return false;
      if (actionFilter && e.action !== actionFilter) return false;
      if (moduleFilter && e.module !== moduleFilter) return false;
      if (outcomeFilter && e.outcome !== outcomeFilter) return false;
      const t = new Date(e.timestamp).getTime();
      if (t < fromTime || t > toTime) return false;
      if (
        q &&
        !e.patientName.toLowerCase().includes(q) &&
        !e.userName.toLowerCase().includes(q) &&
        !e.medicationName.toLowerCase().includes(q) &&
        !e.id.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [events, search, dateFrom, dateTo, userFilter, actionFilter, moduleFilter, outcomeFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [filtered],
  );

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setDateFrom(watMonthStartInput());
    setDateTo(toWATDateInput());
    setUserFilter('');
    setActionFilter('');
    setModuleFilter('Dispensing');
    setOutcomeFilter('');
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} event${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function buildExportRows(rows: AuditTrailEvent[]): string[][] {
    return [
      [
        'Event ID',
        'Date & Time',
        'User',
        'Role',
        'Action',
        'Patient',
        'MRN',
        'Medication',
        'Details',
        'Module',
        'IP Address',
        'Outcome',
      ],
      ...rows.map((e) => [
        e.id,
        `${formatHumanDate(e.timestamp)} ${formatTime(e.timestamp)}`,
        e.userName,
        e.userRole,
        e.action,
        e.patientName,
        e.mrn,
        e.medicationName,
        e.details,
        e.module,
        e.ipAddress,
        e.outcome,
      ]),
    ];
  }

  function handleExport() {
    downloadCSV('dispensing-audit-trail', buildExportRows(sorted));
    toast.success('Export ready', `${sorted.length} audit events downloaded as CSV.`);
  }

  function handlePrintList() {
    setActionsMenuOpen(false);
    const rows = buildExportRows(sorted);
    const [header, ...body] = rows;
    const table = `<table><thead><tr>${header!.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
    downloadPDF(
      'Dispensing Audit Trail',
      `<h1>Dispensing Audit Trail</h1><p class="meta">${sorted.length} events</p><hr />${table}`,
    );
  }

  function handleExportRecord(event: AuditTrailEvent) {
    downloadCSV(`audit-${event.id}`, buildExportRows([event]));
    toast.success('Record exported', `${event.id} downloaded as CSV.`);
  }

  function handleViewUserActivityReport() {
    const lines = [
      'Dispensing Audit Trail — Actions by User (This Month)',
      `Generated ${formatHumanDate(new Date().toISOString())} ${formatTime(new Date().toISOString())}`,
      '',
      ...actionsByUser.rows.map((r) => `  ${r.label}: ${r.value}`),
      '',
      `Total (This Month): ${actionsByUser.scopedTotal}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-activity-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report generated', 'User activity report downloaded.');
  }

  function handleGenerateComplianceReport() {
    const lines = [
      'Dispensing Audit Trail — Compliance Report',
      `Generated ${formatHumanDate(new Date().toISOString())} ${formatTime(new Date().toISOString())}`,
      '',
      `Total Dispensing Events: ${total}`,
      `Today's Events: ${todayCount}`,
      `Modified Records: ${modifiedCount} (${total > 0 ? ((modifiedCount / total) * 100).toFixed(2) : 0}%)`,
      `Deleted / Voided: ${deletedVoidedCount} (${total > 0 ? ((deletedVoidedCount / total) * 100).toFixed(2) : 0}%)`,
      `Accessed Records: ${accessedCount} (${total > 0 ? ((accessedCount / total) * 100).toFixed(2) : 0}%)`,
      '',
      'All audit trail records are securely logged and immutable to ensure data integrity and regulatory compliance.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compliance-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report generated', 'Compliance report downloaded.');
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.pharmacy)}
            className={`transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#8A98A3' }}
          >
            Home
          </button>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Operations</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Dispensing Audit Trail
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Dispensing Audit Trail
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Track and review all dispensing activities for accountability, compliance, and patient
              safety.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
            >
              <Download style={{ width: 15, height: 15 }} />
              Export Report
            </button>
            <PermissionGate permission={PERMISSIONS.PHARMACY_AUDIT_WRITE}>
              <button
                type="button"
                onClick={() => setModal({ type: 'settings' })}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0F766E' }}
              >
                <SettingsIcon style={{ width: 15, height: 15 }} />
                Audit Trail Settings
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          <StatCard
            icon={Activity}
            label="Total Dispensing Events"
            value={total}
            info="All time"
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={handleClearFilters}
          />
          <StatCard
            icon={Calendar}
            label="Today's Events"
            value={todayCount}
            info={formatHumanDate(new Date().toISOString())}
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => {
              setDateFrom(toWATDateInput());
              setDateTo(toWATDateInput());
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Pencil}
            label="Modified Records"
            value={modifiedCount}
            info={`${total > 0 ? ((modifiedCount / total) * 100).toFixed(2) : 0}% of total`}
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setActionFilter('Modify');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Trash2}
            label="Deleted / Voided"
            value={deletedVoidedCount}
            info={`${total > 0 ? ((deletedVoidedCount / total) * 100).toFixed(2) : 0}% of total`}
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={() => {
              setActionFilter('Void');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Eye}
            label="Accessed Records"
            value={accessedCount}
            info={`${total > 0 ? ((accessedCount / total) * 100).toFixed(2) : 0}% of total`}
            accent="#00B4D8"
            iconBg="rgba(0,180,216,0.1)"
            onClick={() => {
              setActionFilter('Access');
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
          {/* Main column */}
          <div className="min-w-0 flex-1">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {/* Filters */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <label
                    htmlFor="audit-search"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Search
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                      style={{ width: 15, height: 15, color: '#8A98A3' }}
                    />
                    <input
                      id="audit-search"
                      type="search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by patient, user, medication or ID..."
                      className={`h-11 w-full rounded-[10px] pr-3 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        border: '1px solid rgba(0,100,130,0.18)',
                        color: '#0D2630',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Date Range
                  </label>
                  <button
                    ref={dateButtonRef}
                    type="button"
                    onClick={() => setDateMenuOpen((v) => !v)}
                    className={`flex h-11 w-full items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                      fontSize: 14,
                    }}
                  >
                    <CalendarDays
                      style={{ width: 15, height: 15, color: '#4A7080', flexShrink: 0 }}
                    />
                    <Tooltip
                      content={`${formatHumanDate(`${dateFrom}T00:00:00`)} — ${formatHumanDate(`${dateTo}T00:00:00`)}`}
                    >
                      <span className="truncate">
                        {formatHumanDate(`${dateFrom}T00:00:00`)} —{' '}
                        {formatHumanDate(`${dateTo}T00:00:00`)}
                      </span>
                    </Tooltip>
                  </button>
                  <RowMenuPortal
                    open={dateMenuOpen}
                    anchorRef={dateButtonRef}
                    onClose={() => setDateMenuOpen(false)}
                    width={280}
                  >
                    <div className="px-4 py-3.5">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Date range
                      </p>
                      <div className="mt-3 flex flex-col gap-2.5">
                        <div>
                          <label
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            From
                          </label>
                          <FormDateInput
                            value={dateFrom}
                            max={dateTo}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="mt-1 h-10 w-full"
                          />
                        </div>
                        <div>
                          <label
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            To
                          </label>
                          <FormDateInput
                            value={dateTo}
                            min={dateFrom}
                            max={toWATDateInput()}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="mt-1 h-10 w-full"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage(1);
                          setDateMenuOpen(false);
                        }}
                        className={`mt-3.5 flex h-9 w-full items-center justify-center rounded-[8px] font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ background: '#00B4D8', fontSize: 14 }}
                      >
                        Apply
                      </button>
                    </div>
                  </RowMenuPortal>
                </div>
                <div>
                  <label
                    htmlFor="audit-user-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    User
                  </label>
                  <FormSelect
                    id="audit-user-filter"
                    value={userFilter}
                    onChange={(v) => {
                      setUserFilter(v);
                      setCurrentPage(1);
                    }}
                    options={AUDIT_USER_OPTIONS}
                    placeholder="All Users"
                  />
                </div>
                <div>
                  <label
                    htmlFor="audit-action-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Action Type
                  </label>
                  <FormSelect
                    id="audit-action-filter"
                    value={actionFilter}
                    onChange={(v) => {
                      setActionFilter(v);
                      setCurrentPage(1);
                    }}
                    options={AUDIT_ACTION_OPTIONS}
                    placeholder="All Actions"
                  />
                </div>
                <div>
                  <label
                    htmlFor="audit-module-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Module
                  </label>
                  <FormSelect
                    id="audit-module-filter"
                    value={moduleFilter}
                    onChange={(v) => {
                      setModuleFilter(v);
                      setCurrentPage(1);
                    }}
                    options={AUDIT_MODULE_OPTIONS}
                    placeholder="All Modules"
                  />
                </div>
                <div>
                  <label
                    htmlFor="audit-outcome-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Outcome
                  </label>
                  <FormSelect
                    id="audit-outcome-filter"
                    value={outcomeFilter}
                    onChange={(v) => {
                      setOutcomeFilter(v);
                      setCurrentPage(1);
                    }}
                    options={AUDIT_OUTCOME_OPTIONS}
                    placeholder="All Outcomes"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#4A7080',
                    border: '1px solid rgba(0,100,130,0.18)',
                  }}
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#0F766E' }}
                >
                  Apply Filters
                </button>
              </div>

              {/* Table */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Audit Trail Events ({filtered.length.toLocaleString('en-GB')})
                </h2>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans"
                    style={{
                      fontSize: 14,
                      color: '#4A7080',
                      border: '1px solid rgba(0,100,130,0.18)',
                    }}
                  >
                    Sort by: Date (Newest)
                  </div>
                  <div className="relative">
                    <button
                      ref={actionsButtonRef}
                      type="button"
                      onClick={() => setActionsMenuOpen((v) => !v)}
                      className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      Actions
                    </button>
                    <RowMenuPortal
                      open={actionsMenuOpen}
                      anchorRef={actionsButtonRef}
                      onClose={() => setActionsMenuOpen(false)}
                      width={180}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActionsMenuOpen(false);
                          handleExport();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        <Download style={{ width: 14, height: 14 }} />
                        Export CSV
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintList}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                        style={{ fontSize: 14, color: '#2F3A40' }}
                      >
                        <Printer style={{ width: 14, height: 14 }} />
                        Print List
                      </button>
                    </RowMenuPortal>
                  </div>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto scroll-smooth">
                <div style={{ minWidth: 1560 }}>
                  <div
                    className="flex rounded-t-[8px]"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Date &amp; Time
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        User
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Action
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Medication
                      </span>
                    </div>
                    <div className="min-w-[180px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Details
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Module
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        IP Address
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Outcome
                      </span>
                    </div>
                    <div className="flex w-20 shrink-0 items-center justify-end py-2.5 pr-3">
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
                        <Shield style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No audit events match your filters
                      </p>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className={`mt-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}

                  {pageRows.map((e) => {
                    const actionCfg = AUDIT_ACTION_COLOR[e.action];
                    const ActionIcon = ACTION_ICON[e.action];
                    return (
                      <div
                        key={e.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                          <p style={{ fontSize: 14, color: '#0D2630' }}>
                            {formatHumanDate(e.timestamp)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatTime(e.timestamp)}
                          </p>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={e.userName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {e.userName}
                            </p>
                          </Tooltip>
                          <RoleBadge role={e.userRole} />
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <div className="flex items-center gap-1.5">
                            <ActionIcon
                              style={{
                                width: 15,
                                height: 15,
                                color: actionCfg.color,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              className="font-sans font-medium"
                              style={{ fontSize: 14, color: actionCfg.color }}
                            >
                              {e.action}
                            </span>
                          </div>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          {e.patientName !== '—' ? (
                            <>
                              <Tooltip content={e.patientName}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {e.patientName}
                                </p>
                              </Tooltip>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{e.mrn}</p>
                            </>
                          ) : (
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>—</p>
                          )}
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Tooltip content={e.medicationName}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {e.medicationName}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="min-w-[180px] flex-1 py-3 pr-2">
                          <Tooltip content={e.details}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {e.details}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{e.module}</p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>{e.ipAddress}</p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <OutcomeBadge event={e} />
                        </div>
                        <div className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'detail', event: e })}
                            aria-label={`View ${e.id}`}
                            className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          >
                            <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <RowMenu
                            event={e}
                            onView={() => setModal({ type: 'detail', event: e })}
                            onExport={() => handleExportRecord(e)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Pagination
                page={currentPage}
                pageSize={rowsPerPage}
                totalItems={filtered.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setRowsPerPage(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[8, 10, 25, 50]}
                itemLabel="events"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Audit Trail Summary
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={summaryBreakdown}
                  total={total}
                  ariaLabel="Audit trail summary donut chart"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {summaryBreakdown.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <Tooltip content={d.label}>
                          <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {d.label}
                          </span>
                        </Tooltip>
                      </div>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total Events {total.toLocaleString('en-GB')}
              </p>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Actions by User (This Month)
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {actionsByUser.rows.map((r) => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between gap-2">
                      <Tooltip content={r.label}>
                        <span className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                          {r.label}
                        </span>
                      </Tooltip>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {r.value.toLocaleString('en-GB')}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                      style={{ background: 'rgba(0,180,216,0.1)' }}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${r.barPercent}%`, background: '#00B4D8' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total {actionsByUser.scopedTotal.toLocaleString('en-GB')}
              </p>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </h2>
              <div className="mt-3 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={handleExport}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Download style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Export Audit Trail</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleViewUserActivityReport}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileBarChart style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      View User Activity Report
                    </span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <PermissionGate permission={PERMISSIONS.PHARMACY_AUDIT_WRITE}>
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'settings' })}
                    className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <SettingsIcon style={{ width: 16, height: 16, color: '#00B4D8' }} />
                      <span style={{ fontSize: 14, color: '#0D2630' }}>Audit Trail Settings</span>
                    </span>
                    <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() => setModal({ type: 'retention' })}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Shield style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Retention Policy</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerateComplianceReport}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileBarChart style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>
                      Generate Compliance Report
                    </span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <div
          className="mt-5 flex items-start gap-2.5 rounded-[12px] p-4"
          style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)' }}
        >
          <p style={{ fontSize: 14, color: '#0D2630' }}>
            All audit trail records are securely logged and immutable to ensure data integrity and
            regulatory compliance.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'detail' && (
        <AuditEventDetailModal event={modal.event} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'settings' && <AuditTrailSettingsModal onClose={() => setModal(null)} />}
      {modal?.type === 'retention' && <RetentionPolicyModal onClose={() => setModal(null)} />}
    </main>
  );
}
