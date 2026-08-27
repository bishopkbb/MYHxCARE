'use client';

import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Columns3,
  Download,
  FileText,
  Globe,
  KeyRound,
  MapPin,
  MoreVertical,
  RefreshCw,
  Shield,
  ShieldOff,
  Smartphone,
  Users,
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
import {
  ILLUSTRATIVE_ACCESS_LOG_ENTRIES,
  type AccessLogEntry,
} from '@/features/administration/__mocks__/accessLogFixtures';

const AccessLogDetailModal = dynamic(
  () => import('./AccessLogDetailModal').then((m) => m.AccessLogDetailModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const GenerateAuditReportModal = dynamic(
  () => import('./GenerateAuditReportModal').then((m) => m.GenerateAuditReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Matches the "automatic account lockout after 3 failed attempts" copy
 * already shown as real UI text on the login form's own Security Notice
 * (`LoginForm.tsx`) — ties this illustrative derivation back to a policy
 * already documented elsewhere in the app. */
const LOCKOUT_THRESHOLD = 3;

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

const LOGIN_TYPE_ICONS: Record<string, LucideIcon> = {
  'Web Login': Globe,
  'Mobile App': Smartphone,
  'Failed Login': XCircle,
};

const LOGIN_TYPE_COLORS: Record<string, string> = {
  'Web Login': '#2563EB',
  'Mobile App': '#7C3AED',
  'Failed Login': '#DC2626',
};

const DEPARTMENT_OPTIONS = Array.from(
  new Set(MOCK_USERS.map((u) => u.department).filter((d): d is string => Boolean(d))),
).sort();
const USER_OPTIONS = [...MOCK_USERS.map((u) => u.name), 'Unknown User'];

const USER_FILTER_DEF: FilterDef = {
  key: 'user',
  defaultLabel: 'All Users',
  options: USER_OPTIONS.map((u) => ({ value: u, label: u })),
};
const DEPARTMENT_FILTER_DEF: FilterDef = {
  key: 'department',
  defaultLabel: 'All Departments',
  options: DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d })),
};
const LOGIN_TYPE_FILTER_DEF: FilterDef = {
  key: 'loginType',
  defaultLabel: 'All Login Types',
  options: [
    { value: 'Web Login', label: 'Web Login' },
    { value: 'Mobile App', label: 'Mobile App' },
    { value: 'Failed Login', label: 'Failed Login' },
  ],
};
const STATUS_FILTER_DEF: FilterDef = {
  key: 'status',
  defaultLabel: 'All Statuses',
  options: [
    { value: 'Success', label: 'Success' },
    { value: 'Failed', label: 'Failed' },
  ],
};

type ColumnKey = 'user' | 'department' | 'loginType' | 'ip' | 'device' | 'status' | 'location';
const COLUMN_LABELS: Record<ColumnKey, string> = {
  user: 'User',
  department: 'Department',
  loginType: 'Login Type',
  ip: 'IP Address',
  device: 'Device & Browser',
  status: 'Status',
  location: 'Location',
};
const ALL_COLUMNS: ColumnKey[] = [
  'user',
  'department',
  'loginType',
  'ip',
  'device',
  'status',
  'location',
];

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

function AccessLogRow({
  entry,
  visibleColumns,
  onView,
}: {
  entry: AccessLogEntry;
  visibleColumns: Set<ColumnKey>;
  onView: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const TypeIcon = LOGIN_TYPE_ICONS[entry.loginType] ?? Globe;
  const typeColor = LOGIN_TYPE_COLORS[entry.loginType] ?? '#8A98A3';

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
      {visibleColumns.has('department') && (
        <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {entry.department}
          </p>
        </div>
      )}
      {visibleColumns.has('loginType') && (
        <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
          <span className="flex items-center gap-1.5" style={{ fontSize: 14, color: typeColor }}>
            <TypeIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span className="truncate">{entry.loginType}</span>
          </span>
        </div>
      )}
      {visibleColumns.has('ip') && (
        <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {entry.ipAddress}
          </p>
        </div>
      )}
      {visibleColumns.has('device') && (
        <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
          <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
            {entry.device}
          </p>
          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
            {entry.os}
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
      {visibleColumns.has('location') && (
        <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {entry.location}
          </p>
        </div>
      )}
      <div className="w-12 shrink-0 py-2.5 pr-2 pl-3">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={`Actions for ${entry.loginType} by ${entry.userName}`}
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

function TimeOfDayChart({ data }: { data: { hour: number; count: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...data.map((d) => d.count), 1);
  const niceMax = Math.ceil(max / 100) * 100 || 100;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.count / niceMax) * H,
  }));
  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD = `${lineD} L ${points[points.length - 1]?.x ?? 0} ${H} L ${points[0]?.x ?? 0} ${H} Z`;

  // This chart sits in the narrow 340px sidebar column, so only 4 labels
  // fit before they start colliding (the same lesson learned on Financial
  // Reports' and Department Reports' narrower-column charts).
  const xLabelIdx = [0, 6, 12, 18];

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX / stepX)));
    setHoverIdx(idx);
  }

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredPoint = hoverIdx !== null ? points[hoverIdx] : null;

  function hourLabel(h: number): string {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  }

  return (
    <div className="mt-2 flex gap-3" style={{ height: 260 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 40 }}>
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {Math.round(t)}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 24px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          ))}
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 cursor-crosshair"
          style={{ height: 'calc(100% - 24px)', width: '100%' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="access-log-time-of-day-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#access-log-time-of-day-fill)" stroke="none" />
          <path
            d={lineD}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={0}
              x2={hoveredPoint.x}
              y2={H}
              stroke="rgba(0,100,130,0.25)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#2563EB"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {hovered && hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
            style={{
              left: `${(hoveredPoint.x / W) * 100}%`,
              top: Math.max(0, (hoveredPoint.y / H) * (260 - 24) - 56),
              transform: 'translateX(-50%)',
              background: '#0D2630',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{hourLabel(hovered.hour)}</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
              {hovered.count} logins
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0" style={{ height: 24 }}>
          {xLabelIdx.map((i) => (
            <span
              key={i}
              className="absolute font-sans whitespace-nowrap"
              style={{
                left: `${((points[i]?.x ?? 0) / W) * 100}%`,
                transform:
                  i === 0
                    ? 'translateX(0)'
                    : i === data.length - 1
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
                fontSize: 14,
                color: '#8A98A3',
              }}
            >
              {hourLabel(data[i]?.hour ?? 0)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;
// Sum of all fixed shrink-0 columns (128+112+112+112+144+96+112+48 = 864)
// plus a comfortable floor for the flex-1 Date & Time column, so that
// column never gets squeezed to the point of overflowing into its
// neighbour — the exact header-bleed bug hit and fixed on Audit Logs.
const TABLE_MIN_WIDTH = 1050;

export function AdminAccessLogWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [dateFrom, setDateFrom] = useState(monthStartKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [appliedFrom, setAppliedFrom] = useState(monthStartKey());
  const [appliedTo, setAppliedTo] = useState(todayKey());
  const [userFilter, setUserFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [loginTypeFilter, setLoginTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [loginTypeDropdownOpen, setLoginTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(ALL_COLUMNS));
  const [page, setPage] = useState(1);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<AccessLogEntry | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const rangeDays = Math.max(
    1,
    Math.round((new Date(appliedTo).getTime() - new Date(appliedFrom).getTime()) / DAY_MS) + 1,
  );
  const prevTo = toDateKey(new Date(new Date(appliedFrom).getTime() - DAY_MS));
  const prevFrom = toDateKey(new Date(new Date(appliedFrom).getTime() - rangeDays * DAY_MS));

  function matches(e: AccessLogEntry, from: string, to: string): boolean {
    const key = toDateKey(e.timestamp);
    return (
      key >= from &&
      key <= to &&
      (userFilter === 'ALL' || e.userName === userFilter) &&
      (departmentFilter === 'ALL' || e.department === departmentFilter) &&
      (loginTypeFilter === 'ALL' || e.loginType === loginTypeFilter) &&
      (statusFilter === 'ALL' || e.status === statusFilter)
    );
  }

  const filtered = ILLUSTRATIVE_ACCESS_LOG_ENTRIES.filter((e) =>
    matches(e, appliedFrom, appliedTo),
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const prevFiltered = ILLUSTRATIVE_ACCESS_LOG_ENTRIES.filter((e) => matches(e, prevFrom, prevTo));

  const totalLogins = filtered.length;
  const prevTotalLogins = prevFiltered.length;
  const uniqueUsers = new Set(
    filtered.filter((e) => e.userName !== 'Unknown User').map((e) => e.userName),
  ).size;
  const prevUniqueUsers = new Set(
    prevFiltered.filter((e) => e.userName !== 'Unknown User').map((e) => e.userName),
  ).size;
  const successfulLogins = filtered.filter((e) => e.status === 'Success').length;
  const prevSuccessfulLogins = prevFiltered.filter((e) => e.status === 'Success').length;
  const failedAttempts = filtered.filter((e) => e.status === 'Failed').length;
  const prevFailedAttempts = prevFiltered.filter((e) => e.status === 'Failed').length;

  const failedCountByUser = new Map<string, number>();
  for (const e of filtered) {
    if (e.status !== 'Failed' || e.userName === 'Unknown User') continue;
    failedCountByUser.set(e.userName, (failedCountByUser.get(e.userName) ?? 0) + 1);
  }
  const blockedUserNames = Array.from(failedCountByUser.entries())
    .filter(([, count]) => count >= LOCKOUT_THRESHOLD)
    .map(([name]) => name);
  const blockedUsers = blockedUserNames.length;

  const prevFailedCountByUser = new Map<string, number>();
  for (const e of prevFiltered) {
    if (e.status !== 'Failed' || e.userName === 'Unknown User') continue;
    prevFailedCountByUser.set(e.userName, (prevFailedCountByUser.get(e.userName) ?? 0) + 1);
  }
  const prevBlockedUsers = Array.from(prevFailedCountByUser.values()).filter(
    (c) => c >= LOCKOUT_THRESHOLD,
  ).length;

  const timeOfDayData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: filtered.filter((e) => new Date(e.timestamp).getHours() === hour).length,
  }));

  const byLocation = new Map<string, number>();
  for (const e of filtered) byLocation.set(e.location, (byLocation.get(e.location) ?? 0) + 1);
  const sortedLocations = Array.from(byLocation.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count);
  const topLocations = sortedLocations.slice(0, 4);
  const otherLocationsCount = sortedLocations.slice(4).reduce((s, l) => s + l.count, 0);

  const pagedEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function scrollToTable() {
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleApplyFilters() {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setPage(1);
    toast.success('Filters applied', 'The access log has been updated.');
  }

  function handleResetFilters() {
    const from = monthStartKey();
    const to = todayKey();
    setDateFrom(from);
    setDateTo(to);
    setAppliedFrom(from);
    setAppliedTo(to);
    setUserFilter('ALL');
    setDepartmentFilter('ALL');
    setLoginTypeFilter('ALL');
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
      [
        'Date & Time',
        'User',
        'Department',
        'Login Type',
        'IP Address',
        'Device',
        'OS',
        'Status',
        'Location',
      ],
    ];
    for (const e of filtered) {
      rows.push([
        formatDateTime(e.timestamp),
        e.userName,
        e.department,
        e.loginType,
        e.ipAddress,
        e.device,
        e.os,
        e.status,
        e.location,
      ]);
    }
    return rows;
  }

  function handleExportCSV() {
    downloadCSV('access-logs', buildRows());
    setExportMenuOpen(false);
    toast.success('Export ready', 'Access log entries exported as CSV.');
  }

  function handleExportPDF() {
    const rows = buildRows();
    const body = `
      <h1>Access Logs</h1>
      <p class="meta">${escapeHtml(formatHumanDate(appliedFrom))} to ${escapeHtml(formatHumanDate(appliedTo))}</p>
      <hr>
      <table><thead><tr>${rows[0]!.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>
      ${rows
        .slice(1)
        .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
        .join('')}
      </tbody></table>
    `;
    downloadPDF('access-logs', body);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Access log exported as PDF.');
  }

  function handlePrint() {
    handleExportPDF();
  }

  function handleRefresh() {
    toast.success('Access log refreshed', 'Showing the latest recorded activity.');
  }

  function handleGenerateReport(params: { dateFrom: string; dateTo: string }) {
    const scoped = ILLUSTRATIVE_ACCESS_LOG_ENTRIES.filter((e) => {
      const key = toDateKey(e.timestamp);
      return key >= params.dateFrom && key <= params.dateTo;
    });
    const rows: string[][] = [
      ['Field', 'Value'],
      ['From', formatHumanDate(params.dateFrom)],
      ['To', formatHumanDate(params.dateTo)],
      ['Total Logins', String(scoped.length)],
      ['Successful Logins', String(scoped.filter((e) => e.status === 'Success').length)],
      ['Failed Attempts', String(scoped.filter((e) => e.status === 'Failed').length)],
    ];
    const body = `
      <h1>Access Log Report</h1>
      <p class="meta">${escapeHtml(formatHumanDate(params.dateFrom))} to ${escapeHtml(formatHumanDate(params.dateTo))}</p>
      <hr>
      <table><tbody>
      ${rows
        .slice(1)
        .map((r) => `<tr><td>${escapeHtml(r[0] ?? '')}</td><td>${escapeHtml(r[1] ?? '')}</td></tr>`)
        .join('')}
      </tbody></table>
    `;
    downloadPDF('access-log-report', body);
    toast.success('Report generated', 'Access log report downloaded as PDF.');
  }

  function handleViewBlockedUsers() {
    handleResetFilters();
    setStatusFilter('Failed');
    setPage(1);
    scrollToTable();
    toast.success(
      'Filtered',
      `Showing failed attempts (${blockedUsers} user(s) at or above the lockout threshold).`,
    );
  }

  function handleReviewFailedAttempts() {
    setStatusFilter('Failed');
    setPage(1);
    scrollToTable();
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
              Access Logs
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(37,99,235,0.1)' }}
              >
                <KeyRound style={{ width: 18, height: 18, color: '#2563EB' }} />
              </div>
              <div>
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
                >
                  Access Logs
                </h1>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  Monitor user sign-ins, access attempts, and session activities across the system.
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
                  Department
                </p>
                <FilterDropdown
                  def={DEPARTMENT_FILTER_DEF}
                  value={departmentFilter}
                  isOpen={departmentDropdownOpen}
                  onToggle={() => setDepartmentDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setDepartmentFilter(v);
                    setDepartmentDropdownOpen(false);
                    setPage(1);
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Login Type
                </p>
                <FilterDropdown
                  def={LOGIN_TYPE_FILTER_DEF}
                  value={loginTypeFilter}
                  isOpen={loginTypeDropdownOpen}
                  onToggle={() => setLoginTypeDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setLoginTypeFilter(v);
                    setLoginTypeDropdownOpen(false);
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
              icon={Smartphone}
              label="Total Logins"
              value={totalLogins.toLocaleString()}
              info={(() => {
                const d = pctDelta(totalLogins, prevTotalLogins);
                return d !== null
                  ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs last period`
                  : 'vs last period';
              })()}
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={Users}
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
              icon={CheckCircle2}
              label="Successful Logins"
              value={successfulLogins.toLocaleString()}
              info={(() => {
                const d = pctDelta(successfulLogins, prevSuccessfulLogins);
                return d !== null
                  ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs last period`
                  : 'vs last period';
              })()}
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={AlertTriangle}
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
              icon={ShieldOff}
              label="Blocked Users"
              value={blockedUsers}
              info={(() => {
                const d = pctDelta(blockedUsers, prevBlockedUsers);
                return d !== null
                  ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs last period`
                  : 'vs last period';
              })()}
              accent="#DC2626"
              iconBg="rgba(220,38,38,0.1)"
            />
          </div>

          <div ref={tableRef} className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
            <div
              className="min-w-0 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Access Log Entries ({filtered.length.toLocaleString()})
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
                    aria-label="Refresh access log"
                    className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.2)' }}
                  >
                    <RefreshCw style={{ width: 14, height: 14, color: '#4A7080' }} />
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <ScrollableTable minWidth={TABLE_MIN_WIDTH}>
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
                    {visibleColumns.has('department') && (
                      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Department
                        </p>
                      </div>
                    )}
                    {visibleColumns.has('loginType') && (
                      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold whitespace-nowrap"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Login Type
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
                    {visibleColumns.has('device') && (
                      <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold whitespace-nowrap"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Device & Browser
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
                    {visibleColumns.has('location') && (
                      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Location
                        </p>
                      </div>
                    )}
                    <div className="w-12 shrink-0 py-2.5 pr-2 pl-3" />
                  </div>
                  {pagedEntries.map((entry) => (
                    <AccessLogRow
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
                  Login Activity Overview
                </p>
                <div className="mt-3 flex justify-center">
                  <AnimatedDonutChart
                    breakdown={[
                      { label: 'Successful Logins', value: successfulLogins, color: '#16A34A' },
                      { label: 'Failed Attempts', value: failedAttempts, color: '#DC2626' },
                    ]}
                    total={totalLogins}
                    size={130}
                    ariaLabel="Login activity overview"
                    centerValue={totalLogins.toLocaleString()}
                    centerLabel="Total"
                  />
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: '#16A34A' }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>Successful Logins</span>
                    </span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {successfulLogins.toLocaleString()} (
                      {totalLogins > 0
                        ? ((successfulLogins / totalLogins) * 100).toFixed(1)
                        : '0.0'}
                      %)
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: '#DC2626' }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>Failed Attempts</span>
                    </span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {failedAttempts.toLocaleString()} (
                      {totalLogins > 0 ? ((failedAttempts / totalLogins) * 100).toFixed(1) : '0.0'}
                      %)
                    </span>
                  </div>
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
                  Logins by Time of Day
                </p>
                <TimeOfDayChart data={timeOfDayData} />
              </div>

              <div
                className="rounded-[12px] p-4 sm:p-5"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Top Access Locations
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {topLocations.map((l) => (
                    <div key={l.location} className="flex items-center gap-2.5">
                      <MapPin style={{ width: 15, height: 15, color: '#4A7080', flexShrink: 0 }} />
                      <p
                        className="min-w-0 flex-1 truncate"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {l.location}
                      </p>
                      <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {l.count.toLocaleString()} (
                        {totalLogins > 0 ? ((l.count / totalLogins) * 100).toFixed(1) : '0.0'}%)
                      </span>
                    </div>
                  ))}
                  {otherLocationsCount > 0 && (
                    <div className="flex items-center gap-2.5">
                      <MapPin style={{ width: 15, height: 15, color: '#4A7080', flexShrink: 0 }} />
                      <p
                        className="min-w-0 flex-1 truncate"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Other Locations
                      </p>
                      <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                        {otherLocationsCount.toLocaleString()} (
                        {totalLogins > 0
                          ? ((otherLocationsCount / totalLogins) * 100).toFixed(1)
                          : '0.0'}
                        %)
                      </span>
                    </div>
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
                  Quick Actions
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleViewBlockedUsers}
                    className={`flex items-center gap-2.5 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(220,38,38,0.1)' }}
                    >
                      <ShieldOff style={{ width: 16, height: 16, color: '#DC2626' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        View Blocked Users
                      </p>
                      <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Manage blocked and locked accounts
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleReviewFailedAttempts}
                    className={`flex items-center gap-2.5 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(217,119,6,0.1)' }}
                    >
                      <AlertTriangle style={{ width: 16, height: 16, color: '#D97706' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Review Failed Attempts
                      </p>
                      <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Investigate failed login attempts
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.adminRolesPermissions)}
                    className={`flex items-center gap-2.5 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(0,180,216,0.1)' }}
                    >
                      <Shield style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Security Settings
                      </p>
                      <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                        Manage authentication & access policies
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {detailEntry && (
        <AccessLogDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
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
