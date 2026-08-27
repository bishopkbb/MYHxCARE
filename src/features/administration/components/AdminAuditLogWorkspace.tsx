'use client';

import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  Columns3,
  Download,
  Eye,
  FileText,
  LogIn,
  LogOut,
  MoreVertical,
  Pencil,
  Pill,
  PlusCircle,
  RefreshCw,
  Shield,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { FormDateInput } from '@components/shared/FormDateInput';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatDateTime, formatHumanDate } from '@/utils/datetime';
import { MOCK_USERS } from '@/features/auth/__mocks__/authFixtures';
import { useAuditTrailEvents } from '@/features/pharmacy/store/auditTrailStore';
import { ILLUSTRATIVE_AUDIT_ENTRIES } from '@/features/administration/__mocks__/auditLogFixtures';

const AuditEntryDetailModal = dynamic(
  () => import('./AuditEntryDetailModal').then((m) => m.AuditEntryDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const GenerateAuditReportModal = dynamic(
  () => import('./GenerateAuditReportModal').then((m) => m.GenerateAuditReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(
    typeof date === 'string' ? new Date(date) : date,
  );
}

function todayKey(): string {
  return toDateKey(new Date());
}

function monthStartKey(): string {
  const d = new Date();
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  const delta = Math.round(((current - previous) / previous) * 1000) / 10;
  return Math.abs(delta) > 300 ? null : delta;
}

export type CombinedAuditEntry = {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  status: 'Success' | 'Failed';
  severity: 'normal' | 'critical';
  source: 'real' | 'illustrative';
};

const ACTION_ICONS: Record<string, LucideIcon> = {
  'Logged in': LogIn,
  'Logged out': LogOut,
  Viewed: Eye,
  Created: PlusCircle,
  Updated: Pencil,
  Deleted: Trash2,
  Exported: Download,
  'Login Failed': XCircle,
  Dispense: Pill,
  Modify: Pencil,
  Void: Ban,
  Access: Eye,
  Delete: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  'Logged in': '#16A34A',
  'Logged out': '#4A7080',
  Viewed: '#2563EB',
  Created: '#16A34A',
  Updated: '#D97706',
  Deleted: '#DC2626',
  Exported: '#7C3AED',
  'Login Failed': '#DC2626',
  Dispense: '#00B4D8',
  Modify: '#D97706',
  Void: '#DC2626',
  Access: '#2563EB',
  Delete: '#DC2626',
};

const ACTION_OPTIONS = [
  'Logged in',
  'Logged out',
  'Viewed',
  'Created',
  'Updated',
  'Deleted',
  'Exported',
  'Login Failed',
  'Dispense',
  'Modify',
  'Void',
  'Access',
  'Delete',
];

const MODULE_OPTIONS = [
  'Authentication',
  'Patient Records',
  'Appointment',
  'Medication',
  'Lab Results',
  'Reports',
  'User Management',
  'Billing',
  'Dispensing',
  'Inventory',
  'Prescriptions',
  'Procurement',
];

const USER_OPTIONS = [...MOCK_USERS.map((u) => u.name), 'Unknown User'];

const USER_FILTER_DEF: FilterDef = {
  key: 'user',
  defaultLabel: 'All Users',
  options: USER_OPTIONS.map((u) => ({ value: u, label: u })),
};
const ACTION_FILTER_DEF: FilterDef = {
  key: 'action',
  defaultLabel: 'All Actions',
  options: ACTION_OPTIONS.map((a) => ({ value: a, label: a })),
};
const MODULE_FILTER_DEF: FilterDef = {
  key: 'module',
  defaultLabel: 'All Modules',
  options: MODULE_OPTIONS.map((m) => ({ value: m, label: m })),
};
const STATUS_FILTER_DEF: FilterDef = {
  key: 'status',
  defaultLabel: 'All Statuses',
  options: [
    { value: 'Success', label: 'Success' },
    { value: 'Failed', label: 'Failed' },
  ],
};

type ColumnKey = 'user' | 'action' | 'module' | 'details' | 'ip' | 'status';
const COLUMN_LABELS: Record<ColumnKey, string> = {
  user: 'User',
  action: 'Action',
  module: 'Module',
  details: 'Details',
  ip: 'IP Address',
  status: 'Status',
};
const ALL_COLUMNS: ColumnKey[] = ['user', 'action', 'module', 'details', 'ip', 'status'];

function DateRangeControl({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 items-center gap-2 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
        style={{
          fontSize: 14,
          color: '#0D2630',
          border: open ? '1px solid #00B4D8' : '1px solid rgba(0,100,130,0.2)',
        }}
      >
        <CalendarDays style={{ width: 15, height: 15, color: '#4A7080' }} />
        {formatHumanDate(from)} - {formatHumanDate(to)}
      </button>
      {open && (
        <div
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full left-0 z-30 mt-1.5 w-[280px] rounded-[12px] bg-white p-4 duration-150"
          style={{
            border: '1px solid rgba(0,100,130,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex flex-col gap-3">
            <div>
              <label
                className="mb-1 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                From
              </label>
              <FormDateInput value={from} max={to} onChange={(e) => onChange(e.target.value, to)} />
            </div>
            <div>
              <label
                className="mb-1 block font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                To
              </label>
              <FormDateInput
                value={to}
                min={from}
                max={todayKey()}
                onChange={(e) => onChange(from, e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`flex h-10 items-center justify-center rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditRow({
  entry,
  visibleColumns,
  onView,
}: {
  entry: CombinedAuditEntry;
  visibleColumns: Set<ColumnKey>;
  onView: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ActionIcon = ACTION_ICONS[entry.action] ?? FileText;
  const actionColor = ACTION_COLORS[entry.action] ?? '#8A98A3';

  return (
    <div className="flex items-center" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
      <div className="max-w-[150px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
          {formatDateTime(entry.timestamp)}
        </p>
      </div>
      {visibleColumns.has('user') && (
        <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
          <Tooltip content={`${entry.userName} — ${entry.userRole}`}>
            <p
              className="truncate font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {entry.userName}
            </p>
          </Tooltip>
          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
            {entry.userRole}
          </p>
        </div>
      )}
      {visibleColumns.has('action') && (
        <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
          <span className="flex items-center gap-1.5" style={{ fontSize: 14, color: actionColor }}>
            <ActionIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span className="truncate">{entry.action}</span>
          </span>
        </div>
      )}
      {visibleColumns.has('module') && (
        <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {entry.module}
          </p>
        </div>
      )}
      {visibleColumns.has('details') && (
        <div className="w-52 shrink-0 py-2.5 pr-2 pl-3">
          <Tooltip content={entry.details}>
            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
              {entry.details}
            </p>
          </Tooltip>
        </div>
      )}
      {visibleColumns.has('ip') && (
        <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {entry.ipAddress}
          </p>
        </div>
      )}
      {visibleColumns.has('status') && (
        <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
          <span
            className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
            style={
              entry.status === 'Success'
                ? { fontSize: 14, color: '#16A34A', background: 'rgba(22,163,74,0.08)' }
                : { fontSize: 14, color: '#DC2626', background: 'rgba(220,38,38,0.08)' }
            }
          >
            {entry.status}
          </span>
        </div>
      )}
      <div className="w-12 shrink-0 py-2.5 pr-2 pl-3">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={`Actions for ${entry.action} by ${entry.userName}`}
          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
        >
          <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
        </button>
        <RowMenuPortal
          open={menuOpen}
          anchorRef={buttonRef}
          onClose={() => setMenuOpen(false)}
          width={160}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onView();
            }}
            className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            View Details
          </button>
        </RowMenuPortal>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export function AdminAuditLogWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [dateFrom, setDateFrom] = useState(monthStartKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [appliedFrom, setAppliedFrom] = useState(monthStartKey());
  const [appliedTo, setAppliedTo] = useState(todayKey());
  const [userFilter, setUserFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(ALL_COLUMNS));
  const [page, setPage] = useState(1);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<CombinedAuditEntry | null>(null);

  const pharmacyEvents = useAuditTrailEvents();

  const combinedEntries: CombinedAuditEntry[] = [
    ...ILLUSTRATIVE_AUDIT_ENTRIES.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      userName: e.userName,
      userRole: e.userRole,
      action: e.action,
      module: e.module,
      details: e.details,
      ipAddress: e.ipAddress,
      status: e.status,
      severity: e.severity,
      source: 'illustrative' as const,
    })),
    ...pharmacyEvents.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      userName: e.userName,
      userRole: e.userRole,
      action: e.action,
      module: e.module,
      details: e.details,
      ipAddress: e.ipAddress,
      status: 'Success' as const,
      severity: 'normal' as const,
      source: 'real' as const,
    })),
  ];

  const rangeDays = Math.max(
    1,
    Math.round((new Date(appliedTo).getTime() - new Date(appliedFrom).getTime()) / DAY_MS) + 1,
  );
  const prevTo = toDateKey(new Date(new Date(appliedFrom).getTime() - DAY_MS));
  const prevFrom = toDateKey(new Date(new Date(appliedFrom).getTime() - rangeDays * DAY_MS));

  function matches(e: CombinedAuditEntry, from: string, to: string): boolean {
    const key = toDateKey(e.timestamp);
    return (
      key >= from &&
      key <= to &&
      (userFilter === 'ALL' || e.userName === userFilter) &&
      (actionFilter === 'ALL' || e.action === actionFilter) &&
      (moduleFilter === 'ALL' || e.module === moduleFilter) &&
      (statusFilter === 'ALL' || e.status === statusFilter)
    );
  }

  const filtered = combinedEntries
    .filter((e) => matches(e, appliedFrom, appliedTo))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const prevFiltered = combinedEntries.filter((e) => matches(e, prevFrom, prevTo));

  const totalEvents = filtered.length;
  const prevTotalEvents = prevFiltered.length;
  const uniqueUsers = new Set(filtered.map((e) => e.userName)).size;
  const prevUniqueUsers = new Set(prevFiltered.map((e) => e.userName)).size;
  const criticalEvents = filtered.filter((e) => e.severity === 'critical').length;
  const prevCriticalEvents = prevFiltered.filter((e) => e.severity === 'critical').length;
  const failedAttempts = filtered.filter((e) => e.status === 'Failed').length;
  const prevFailedAttempts = prevFiltered.filter((e) => e.status === 'Failed').length;
  const successfulEvents = filtered.filter((e) => e.status === 'Success').length;
  const prevSuccessfulEvents = prevFiltered.filter((e) => e.status === 'Success').length;

  const actionBreakdown = (() => {
    const byAction = new Map<string, number>();
    for (const e of filtered) byAction.set(e.action, (byAction.get(e.action) ?? 0) + 1);
    return Array.from(byAction.entries())
      .map(([action, count]) => ({
        action,
        count,
        percent: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
        color: ACTION_COLORS[action] ?? '#8A98A3',
      }))
      .sort((a, b) => b.count - a.count);
  })();

  const topActiveUsers = (() => {
    const byUser = new Map<string, number>();
    for (const e of filtered) {
      if (e.userName === 'Unknown User') continue;
      byUser.set(e.userName, (byUser.get(e.userName) ?? 0) + 1);
    }
    return Array.from(byUser.entries())
      .map(([userName, count]) => ({ userName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  const recentCriticalEvents = filtered.filter((e) => e.severity === 'critical').slice(0, 5);

  const pagedEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleApplyFilters() {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setPage(1);
    toast.success('Filters applied', 'The audit log has been updated.');
  }

  function handleResetFilters() {
    const from = monthStartKey();
    const to = todayKey();
    setDateFrom(from);
    setDateTo(to);
    setAppliedFrom(from);
    setAppliedTo(to);
    setUserFilter('ALL');
    setActionFilter('ALL');
    setModuleFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  }

  function toggleColumn(col: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }

  function buildRows(): string[][] {
    const rows: string[][] = [
      ['Date & Time', 'User', 'Role', 'Action', 'Module', 'Details', 'IP Address', 'Status'],
    ];
    for (const e of filtered) {
      rows.push([
        formatDateTime(e.timestamp),
        e.userName,
        e.userRole,
        e.action,
        e.module,
        e.details,
        e.ipAddress,
        e.status,
      ]);
    }
    return rows;
  }

  function handleExportCSV() {
    downloadCSV('audit-logs', buildRows());
    setExportMenuOpen(false);
    toast.success('Export ready', 'Audit log entries exported as CSV.');
  }

  function handleExportPDF() {
    const rows = buildRows();
    const body = `
      <h1>Audit Logs</h1>
      <p class="meta">${escapeHtml(formatHumanDate(appliedFrom))} to ${escapeHtml(formatHumanDate(appliedTo))}</p>
      <hr>
      <table><thead><tr>${rows[0]!.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>
      ${rows
        .slice(1)
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
        .join('')}
      </tbody></table>
    `;
    downloadPDF('audit-logs', body);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Audit log exported as PDF.');
  }

  function handlePrint() {
    handleExportPDF();
  }

  function handleRefresh() {
    toast.success('Audit log refreshed', 'Showing the latest recorded activity.');
  }

  function handleGenerateReport(params: { dateFrom: string; dateTo: string }) {
    const scoped = combinedEntries.filter((e) => {
      const key = toDateKey(e.timestamp);
      return key >= params.dateFrom && key <= params.dateTo;
    });
    const rows: string[][] = [
      ['Field', 'Value'],
      ['From', formatHumanDate(params.dateFrom)],
      ['To', formatHumanDate(params.dateTo)],
      ['Total Events', String(scoped.length)],
      ['Critical Events', String(scoped.filter((e) => e.severity === 'critical').length)],
      ['Failed Attempts', String(scoped.filter((e) => e.status === 'Failed').length)],
    ];
    const body = `
      <h1>Audit Log Report</h1>
      <p class="meta">${escapeHtml(formatHumanDate(params.dateFrom))} to ${escapeHtml(formatHumanDate(params.dateTo))}</p>
      <hr>
      <table><tbody>
      ${rows
        .slice(1)
        .map((r) => `<tr><td>${escapeHtml(r[0] ?? '')}</td><td>${escapeHtml(r[1] ?? '')}</td></tr>`)
        .join('')}
      </tbody></table>
    `;
    downloadPDF('audit-log-report', body);
    toast.success('Report generated', 'Audit log report downloaded as PDF.');
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.admin)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Security & Audit
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Audit Logs
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(37,99,235,0.1)' }}
              >
                <Shield style={{ width: 18, height: 18, color: '#2563EB' }} />
              </div>
              <div>
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
                >
                  Audit Logs
                </h1>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  Track and review system activities and changes for security and compliance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <button
                  ref={exportBtnRef}
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Download style={{ width: 15, height: 15 }} />
                  Export Logs
                </button>
                <RowMenuPortal
                  open={exportMenuOpen}
                  anchorRef={exportBtnRef}
                  onClose={() => setExportMenuOpen(false)}
                  width={170}
                >
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2F3A40' }}
                  >
                    Export as CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2F3A40' }}
                  >
                    Export as PDF
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className={`flex w-full items-center px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#2F3A40' }}
                  >
                    Print
                  </button>
                </RowMenuPortal>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <FileText style={{ width: 15, height: 15 }} />
                Generate Report
              </button>
            </div>
          </div>

          <div
            className="mt-5 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Date Range
                </p>
                <DateRangeControl
                  from={dateFrom}
                  to={dateTo}
                  onChange={(from, to) => {
                    setDateFrom(from);
                    setDateTo(to);
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  User
                </p>
                <FilterDropdown
                  def={USER_FILTER_DEF}
                  value={userFilter}
                  isOpen={userDropdownOpen}
                  onToggle={() => setUserDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setUserFilter(v);
                    setUserDropdownOpen(false);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Action
                </p>
                <FilterDropdown
                  def={ACTION_FILTER_DEF}
                  value={actionFilter}
                  isOpen={actionDropdownOpen}
                  onToggle={() => setActionDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setActionFilter(v);
                    setActionDropdownOpen(false);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Module
                </p>
                <FilterDropdown
                  def={MODULE_FILTER_DEF}
                  value={moduleFilter}
                  isOpen={moduleDropdownOpen}
                  onToggle={() => setModuleDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setModuleFilter(v);
                    setModuleDropdownOpen(false);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Status
                </p>
                <FilterDropdown
                  def={STATUS_FILTER_DEF}
                  value={statusFilter}
                  isOpen={statusDropdownOpen}
                  onToggle={() => setStatusDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setStatusFilter(v);
                    setStatusDropdownOpen(false);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetFilters}
                className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleApplyFilters}
                className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            <StatCard
              icon={FileText}
              label="Total Events"
              value={totalEvents.toLocaleString()}
              info={(() => {
                const d = pctDelta(totalEvents, prevTotalEvents);
                return d !== null
                  ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs last period`
                  : 'vs last period';
              })()}
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={Eye}
              label="Unique Users"
              value={uniqueUsers}
              info={(() => {
                const d = pctDelta(uniqueUsers, prevUniqueUsers);
                return d !== null
                  ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs last period`
                  : 'vs last period';
              })()}
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={AlertTriangle}
              label="Critical Events"
              value={criticalEvents}
              info={(() => {
                const d = pctDelta(criticalEvents, prevCriticalEvents);
                return d !== null
                  ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs last period`
                  : 'vs last period';
              })()}
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
            />
            <StatCard
              icon={XCircle}
              label="Failed Attempts"
              value={failedAttempts}
              info={(() => {
                const d = pctDelta(failedAttempts, prevFailedAttempts);
                return d !== null
                  ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs last period`
                  : 'vs last period';
              })()}
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
            />
            <StatCard
              icon={Shield}
              label="Successful Events"
              value={successfulEvents.toLocaleString()}
              info={(() => {
                const d = pctDelta(successfulEvents, prevSuccessfulEvents);
                return d !== null
                  ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs last period`
                  : 'vs last period';
              })()}
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
            <div
              className="min-w-0 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Audit Log Entries ({filtered.length.toLocaleString()})
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      ref={columnsBtnRef}
                      type="button"
                      onClick={() => setColumnsMenuOpen((v) => !v)}
                      className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <Columns3 style={{ width: 14, height: 14 }} />
                      Columns
                    </button>
                    <RowMenuPortal
                      open={columnsMenuOpen}
                      anchorRef={columnsBtnRef}
                      onClose={() => setColumnsMenuOpen(false)}
                      width={190}
                    >
                      {ALL_COLUMNS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => toggleColumn(col)}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          style={{ fontSize: 14, color: '#2F3A40' }}
                        >
                          {COLUMN_LABELS[col]}
                          {visibleColumns.has(col) && (
                            <Check style={{ width: 14, height: 14, color: '#00B4D8' }} />
                          )}
                        </button>
                      ))}
                    </RowMenuPortal>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    aria-label="Refresh audit log"
                    className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.2)' }}
                  >
                    <RefreshCw style={{ width: 14, height: 14, color: '#4A7080' }} />
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <ScrollableTable minWidth={1000}>
                  <div
                    className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG }}
                  >
                    <div className="max-w-[150px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                      <p
                        className="truncate font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Date & Time
                      </p>
                    </div>
                    {visibleColumns.has('user') && (
                      <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          User
                        </p>
                      </div>
                    )}
                    {visibleColumns.has('action') && (
                      <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Action
                        </p>
                      </div>
                    )}
                    {visibleColumns.has('module') && (
                      <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Module
                        </p>
                      </div>
                    )}
                    {visibleColumns.has('details') && (
                      <div className="w-52 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Details
                        </p>
                      </div>
                    )}
                    {visibleColumns.has('ip') && (
                      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold whitespace-nowrap"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          IP Address
                        </p>
                      </div>
                    )}
                    {visibleColumns.has('status') && (
                      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Status
                        </p>
                      </div>
                    )}
                    <div className="w-12 shrink-0 py-2.5 pr-2 pl-3" />
                  </div>
                  {pagedEntries.map((entry) => (
                    <AuditRow
                      key={entry.id}
                      entry={entry}
                      visibleColumns={visibleColumns}
                      onView={() => setDetailEntry(entry)}
                    />
                  ))}
                </ScrollableTable>
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                totalItems={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={() => undefined}
                itemLabel="entries"
                pageSizeOptions={[PAGE_SIZE]}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Actions Overview
                </p>
                <div className="mt-3 flex justify-center">
                  <AnimatedDonutChart
                    breakdown={actionBreakdown.map((a) => ({
                      label: a.action,
                      value: a.count,
                      color: a.color,
                    }))}
                    total={totalEvents}
                    size={130}
                    ariaLabel="Actions overview"
                    centerValue={totalEvents.toLocaleString()}
                    centerLabel="Total"
                  />
                </div>
                <div className="mt-4 flex max-h-[220px] flex-col gap-2 overflow-y-auto scroll-smooth">
                  {actionBreakdown.map((a) => (
                    <div key={a.action} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: a.color }}
                        />
                        <span style={{ fontSize: 14, color: '#4A7080' }}>{a.action}</span>
                      </span>
                      <span
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {a.count} ({a.percent.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Top Active Users
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {topActiveUsers.map((u) => (
                    <div key={u.userName} className="flex items-center gap-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
                        style={{
                          fontSize: 14,
                          background: 'rgba(0,180,216,0.1)',
                          color: '#00B4D8',
                        }}
                      >
                        {u.userName.charAt(0)}
                      </div>
                      <Tooltip content={u.userName}>
                        <p
                          className="min-w-0 flex-1 truncate"
                          style={{ fontSize: 14, color: '#0D2630' }}
                        >
                          {u.userName}
                        </p>
                      </Tooltip>
                      <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {u.count} events
                      </span>
                    </div>
                  ))}
                  {topActiveUsers.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>No activity in this range.</p>
                  )}
                </div>
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Recent Critical Events
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {recentCriticalEvents.map((e) => (
                    <div key={e.id} className="flex items-start gap-2">
                      <AlertTriangle
                        style={{
                          width: 15,
                          height: 15,
                          color: '#DC2626',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <Tooltip content={e.details}>
                          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
                            {e.details}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {formatDateTime(e.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentCriticalEvents.length === 0 && (
                    <p style={{ fontSize: 14, color: '#8A98A3' }}>
                      No critical events in this range.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {detailEntry && (
        <AuditEntryDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
      )}
      {reportModalOpen && (
        <GenerateAuditReportModal
          defaultDateFrom={dateFrom}
          defaultDateTo={dateTo}
          onClose={() => setReportModalOpen(false)}
          onGenerate={handleGenerateReport}
        />
      )}
    </div>
  );
}
