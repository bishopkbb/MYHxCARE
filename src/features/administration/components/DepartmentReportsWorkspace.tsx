'use client';

import {
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  Eye,
  FileBarChart,
  FileText,
  Lightbulb,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import { StarRating } from '@components/shared/StarRating';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { ROUTES } from '@/constants/routes';
import { ORGANIZATIONAL_DEPARTMENTS } from '@/constants/organizationalDepartments';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatCurrencyWhole } from '@/utils/currency';
import { formatHumanDate } from '@/utils/datetime';
import { buildAllPayments } from '@/features/billing/__mocks__/billingAccountDetailFixtures';
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import { useAdmissions } from '@/features/nursing/store/admissionsStore';
import {
  DEPARTMENT_REPORT_TYPES,
  ILLUSTRATIVE_SATISFACTION,
  RECENT_DEPARTMENT_REPORTS,
  type DepartmentReportType,
} from '@/features/administration/__mocks__/departmentReportsFixtures';

const ScheduleReportModal = dynamic(
  () => import('./ScheduleReportModal').then((m) => m.ScheduleReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const CreateCustomReportModal = dynamic(
  () => import('./CreateCustomReportModal').then((m) => m.CreateCustomReportModal),
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

/**
 * This screen's 7-row department table is a clinic-routing taxonomy for
 * "where a patient was seen" — deliberately NOT the 8-value organizational
 * chart (`ORGANIZATIONAL_DEPARTMENTS`) used for the Total Departments stat
 * card, which includes non-clinical units (Accounts & Billing, Records,
 * Administration) that never see patients. The two numbers are real but
 * answer different questions, matching the precedent already established in
 * Operational Reports' own `VISIT_DEPARTMENT_MAP`.
 */
const DEPT_TABLE_ROWS = [
  'Clinical / Consultation',
  'Pharmacy',
  'Laboratory',
  'Nursing / Wards',
  'Emergency',
  'Radiology',
  'Other Services',
] as const;
type DeptRow = (typeof DEPT_TABLE_ROWS)[number];

const DEPT_ROW_COLORS: Record<DeptRow, string> = {
  'Clinical / Consultation': '#2563EB',
  Pharmacy: '#16A34A',
  Laboratory: '#D97706',
  'Nursing / Wards': '#7C3AED',
  Emergency: '#DC2626',
  Radiology: '#00B4D8',
  'Other Services': '#4A7080',
};

const DEPT_ROW_ICONS: Record<DeptRow, LucideIcon> = {
  'Clinical / Consultation': Users,
  Pharmacy: Wallet,
  Laboratory: ClipboardList,
  'Nursing / Wards': Building2,
  Emergency: Clock,
  Radiology: Eye,
  'Other Services': FileBarChart,
};

const DEPT_ROW_SHORT_LABELS: Record<DeptRow, string> = {
  'Clinical / Consultation': 'Clinical',
  Pharmacy: 'Pharmacy',
  Laboratory: 'Lab',
  'Nursing / Wards': 'Wards',
  Emergency: 'Emergency',
  Radiology: 'Radiology',
  'Other Services': 'Other',
};

/** Raw 8-value clinic-routing `QueueEntry.department`, remapped to this
 * screen's 7-row table (using the RAW values, not Operational Reports' own
 * 5-way collapse, specifically so Radiology gets its own real bucket).
 * `isEmergency` stays a required override on top, same as Operational
 * Reports — confirmed no raw value is ever literally 'Emergency'. */
const QUEUE_DEPT_MAP: Record<string, DeptRow> = {
  'General Outpatient': 'Clinical / Consultation',
  Paediatrics: 'Clinical / Consultation',
  Surgery: 'Other Services',
  Dental: 'Other Services',
  Physiotherapy: 'Other Services',
  Laboratory: 'Laboratory',
  Pharmacy: 'Pharmacy',
  Radiology: 'Radiology',
};

/** Real `BILLING_ACCOUNT_DEPARTMENTS` values on `PaymentWithAccount.department`,
 * remapped to this screen's 7-row table. Radiology has no distinct value in
 * this taxonomy, so its revenue row honestly stays ₦0 rather than fabricating
 * a split of the Laboratory figure. */
const BILLING_DEPT_MAP: Record<string, DeptRow> = {
  Laboratory: 'Laboratory',
  Pharmacy: 'Pharmacy',
  Consultation: 'Clinical / Consultation',
  Emergency: 'Emergency',
  Ward: 'Nursing / Wards',
  'Other Services': 'Other Services',
};

/** Illustrative only — no hospital-wide procedures aggregate exists (see
 * Operational Reports' own "Procedures Performed" precedent). Distributed
 * proportionally across rows by each row's real Visits share, not a flat
 * per-row number. */
const ILLUSTRATIVE_PROCEDURE_RATE = 0.29;

/** Illustrative only — no real waiting-time timestamp pair exists anywhere
 * in this codebase (confirmed: `QueueEntry.history`'s "Seen by Triage
 * Nurse" entry is permanently `{ time: null, pending: true }` everywhere
 * it's written). A baseline plus a small load-based adjustment, not a flat
 * magic number. */
const ILLUSTRATIVE_WAIT_BASELINE_MIN = 14;
const ILLUSTRATIVE_WAIT_LOAD_MIN = 10;

type Metric = 'visits' | 'revenue' | 'procedures' | 'waiting';

const DEPARTMENT_FILTER_DEF: FilterDef = {
  key: 'department',
  defaultLabel: 'All Departments',
  options: DEPT_TABLE_ROWS.map((d) => ({ value: d, label: d })),
};

const REPORT_TYPE_TAGS: DepartmentReportType[] = ['Performance', 'Clinical', 'Revenue', 'Activity'];
const REPORT_TYPE_FILTER_DEF: FilterDef = {
  key: 'reportType',
  defaultLabel: 'All Report Types',
  options: REPORT_TYPE_TAGS.map((t) => ({ value: t, label: t })),
};

const METRIC_FILTER_DEF: FilterDef = {
  key: 'metric',
  defaultLabel: 'Key Metrics',
  options: [
    { value: 'visits', label: 'Visits' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'procedures', label: 'Procedures' },
    { value: 'waiting', label: 'Avg Waiting Time' },
  ],
};

function DepartmentBarChart({
  data,
  formatValue,
}: {
  data: { row: DeptRow; value: number }[];
  formatValue: (v: number) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => d.value), 1);
  const niceMax = Math.ceil(max / 10) * 10 || 10;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 220;
  const slot = W / data.length;
  const barWidth = slot * 0.5;

  return (
    <div className="mt-2 flex gap-3" style={{ height: 284 }}>
      <div
        className="flex shrink-0 flex-col justify-between text-right"
        style={{ width: 48, paddingBottom: 60 }}
      >
        {[...ticks].reverse().map((t) => (
          <span key={t} className="font-sans" style={{ fontSize: 14, color: '#8A98A3' }}>
            {Math.round(t)}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: 'calc(100% - 60px)' }}
        >
          {[...ticks].reverse().map((t) => (
            <div key={t} style={{ borderTop: '1px dashed rgba(0,100,130,0.15)' }} />
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0"
          style={{ height: 'calc(100% - 60px)', width: '100%' }}
        >
          {data.map((d, i) => {
            const barH = (d.value / niceMax) * H;
            const x = i * slot + (slot - barWidth) / 2;
            const y = H - barH;
            return (
              <rect
                key={d.row}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 0)}
                rx={4}
                fill={DEPT_ROW_COLORS[d.row]}
                opacity={hoverIdx === i ? 1 : 0.85}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
          })}
        </svg>
        {hoverIdx !== null && data[hoverIdx] && (
          <div
            className="pointer-events-none absolute z-10 rounded-[10px] px-3 py-2 whitespace-nowrap"
            style={{
              left: `${((hoverIdx * slot + slot / 2) / W) * 100}%`,
              top: Math.max(0, (H - (data[hoverIdx].value / niceMax) * H) * (1 - 60 / 284) - 56),
              transform: 'translateX(-50%)',
              background: '#0D2630',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          >
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{data[hoverIdx].row}</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
              {formatValue(data[hoverIdx].value)}
            </p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0" style={{ height: 60 }}>
          {data.map((d, i) => (
            <span
              key={d.row}
              className="absolute font-sans whitespace-nowrap"
              style={{
                left: `${((i * slot + slot / 2) / W) * 100}%`,
                top: 6,
                transform: 'translateX(-100%) rotate(-40deg)',
                transformOrigin: 'right top',
                fontSize: 14,
                color: '#8A98A3',
              }}
            >
              {DEPT_ROW_SHORT_LABELS[d.row]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

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

function QuickActionButton({
  label,
  description,
  icon: Icon,
  onClick,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: 'rgba(0,180,216,0.1)' }}
      >
        <Icon style={{ width: 16, height: 16, color: '#00B4D8' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {label}
        </p>
        <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
          {description}
        </p>
      </div>
      <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3', flexShrink: 0 }} />
    </button>
  );
}

type SummaryRow = {
  row: DeptRow;
  visits: number;
  revenue: number;
  procedures: number;
  waitingMinutes: number;
  satisfaction: number;
  changePercent: number | null;
};

function SummaryTableRow({ row, onView }: { row: SummaryRow; onView: () => void }) {
  const Icon = DEPT_ROW_ICONS[row.row];
  const color = DEPT_ROW_COLORS[row.row];

  return (
    <div className="flex items-center" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
      <div className="flex max-w-[170px] min-w-0 flex-1 items-center gap-2 py-2.5 pr-2 pl-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{ background: `${color}1A` }}
        >
          <Icon style={{ width: 15, height: 15, color }} />
        </div>
        <Tooltip content={row.row}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {row.row}
          </p>
        </Tooltip>
      </div>
      <div className="w-20 shrink-0 py-2.5 pr-2 pl-3">
        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
          {row.visits.toLocaleString()}
        </p>
      </div>
      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
          {row.revenue > 0 ? formatCurrencyWhole(row.revenue) : '₦0'}
        </p>
      </div>
      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
          {row.procedures.toLocaleString()}
        </p>
      </div>
      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
        <p className="truncate" style={{ fontSize: 14, color: '#0D2630' }}>
          {row.waitingMinutes} mins
        </p>
      </div>
      <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
        <div className="flex items-center gap-1.5">
          <StarRating rating={row.satisfaction} size={13} />
          <span style={{ fontSize: 14, color: '#4A7080' }}>{row.satisfaction.toFixed(1)}</span>
        </div>
      </div>
      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
        <p
          className="truncate font-sans font-medium"
          style={{ fontSize: 14, color: (row.changePercent ?? 0) >= 0 ? '#16A34A' : '#DC2626' }}
        >
          {row.changePercent !== null
            ? `${row.changePercent >= 0 ? '↑' : '↓'}${Math.abs(row.changePercent)}%`
            : 'n/a'}
        </p>
      </div>
      <div className="w-16 shrink-0 py-2.5 pr-2 pl-3">
        <button
          type="button"
          onClick={onView}
          aria-label={`View ${row.row} in Department Monitoring`}
          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
        >
          <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
        </button>
      </div>
    </div>
  );
}

export function DepartmentReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [dateFrom, setDateFrom] = useState(monthStartKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [appliedFrom, setAppliedFrom] = useState(monthStartKey());
  const [appliedTo, setAppliedTo] = useState(todayKey());
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [reportTypeFilter, setReportTypeFilter] = useState('ALL');
  const [metricFilter, setMetricFilter] = useState('ALL');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [reportTypeDropdownOpen, setReportTypeDropdownOpen] = useState(false);
  const [metricDropdownOpen, setMetricDropdownOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [customReportOpen, setCustomReportOpen] = useState(false);
  const summaryTableRef = useRef<HTMLDivElement>(null);

  const queueEntries = useQueueEntries();
  const admissions = useAdmissions();
  const payments = buildAllPayments();

  const rangeDays = Math.max(
    1,
    Math.round((new Date(appliedTo).getTime() - new Date(appliedFrom).getTime()) / DAY_MS) + 1,
  );
  const prevTo = toDateKey(new Date(new Date(appliedFrom).getTime() - DAY_MS));
  const prevFrom = toDateKey(new Date(new Date(appliedFrom).getTime() - rangeDays * DAY_MS));

  function effectiveQueueDept(e: (typeof queueEntries)[number]): DeptRow {
    if (e.isEmergency) return 'Emergency';
    return QUEUE_DEPT_MAP[e.department] ?? 'Other Services';
  }

  function countVisits(from: string, to: string): Record<DeptRow, number> {
    const counts: Record<DeptRow, number> = {
      'Clinical / Consultation': 0,
      Pharmacy: 0,
      Laboratory: 0,
      'Nursing / Wards': 0,
      Emergency: 0,
      Radiology: 0,
      'Other Services': 0,
    };
    for (const e of queueEntries) {
      const key = toDateKey(e.arrivalTime);
      if (key < from || key > to) continue;
      const dept = effectiveQueueDept(e);
      counts[dept] += 1;
    }
    for (const a of admissions) {
      const key = toDateKey(a.admittedAt);
      if (key < from || key > to) continue;
      counts['Nursing / Wards'] += 1;
    }
    return counts;
  }

  function sumRevenue(from: string, to: string): Record<DeptRow, number> {
    const totals: Record<DeptRow, number> = {
      'Clinical / Consultation': 0,
      Pharmacy: 0,
      Laboratory: 0,
      'Nursing / Wards': 0,
      Emergency: 0,
      Radiology: 0,
      'Other Services': 0,
    };
    for (const p of payments) {
      const key = toDateKey(p.date);
      if (key < from || key > to) continue;
      const dept = BILLING_DEPT_MAP[p.department];
      if (!dept) continue;
      totals[dept] += p.amount;
    }
    return totals;
  }

  const visitsByRow = countVisits(appliedFrom, appliedTo);
  const prevVisitsByRow = countVisits(prevFrom, prevTo);
  const revenueByRow = sumRevenue(appliedFrom, appliedTo);

  const totalVisitsAll = DEPT_TABLE_ROWS.reduce((s, r) => s + visitsByRow[r], 0);
  const totalProceduresAll = Math.round(totalVisitsAll * ILLUSTRATIVE_PROCEDURE_RATE);
  const maxVisits = Math.max(...DEPT_TABLE_ROWS.map((r) => visitsByRow[r]), 1);

  const allRows: SummaryRow[] = DEPT_TABLE_ROWS.map((row) => {
    const visits = visitsByRow[row];
    const prevVisits = prevVisitsByRow[row];
    const revenue = revenueByRow[row];
    const procedures =
      totalVisitsAll > 0 ? Math.round(totalProceduresAll * (visits / totalVisitsAll)) : 0;
    const waitingMinutes = Math.round(
      ILLUSTRATIVE_WAIT_BASELINE_MIN + (visits / maxVisits) * ILLUSTRATIVE_WAIT_LOAD_MIN,
    );
    const satisfaction = ILLUSTRATIVE_SATISFACTION[row] ?? 4.0;
    return {
      row,
      visits,
      revenue,
      procedures,
      waitingMinutes,
      satisfaction,
      changePercent: pctDelta(visits, prevVisits),
    };
  });

  const filteredRows =
    departmentFilter === 'ALL' ? allRows : allRows.filter((r) => r.row === departmentFilter);

  const totalVisits = filteredRows.reduce((s, r) => s + r.visits, 0);
  const totalRevenue = filteredRows.reduce((s, r) => s + r.revenue, 0);
  const totalProcedures = filteredRows.reduce((s, r) => s + r.procedures, 0);
  const avgWaitingTime =
    totalVisits > 0
      ? Math.round(filteredRows.reduce((s, r) => s + r.waitingMinutes * r.visits, 0) / totalVisits)
      : ILLUSTRATIVE_WAIT_BASELINE_MIN;

  const prevTotalVisits = filteredRows.reduce((s, r) => s + prevVisitsByRow[r.row], 0);
  const visitsChangePercent = pctDelta(totalVisits, prevTotalVisits);

  const effectiveMetric: Metric = metricFilter === 'ALL' ? 'visits' : (metricFilter as Metric);
  const barChartData = filteredRows.map((r) => ({
    row: r.row,
    value:
      effectiveMetric === 'revenue'
        ? r.revenue
        : effectiveMetric === 'procedures'
          ? r.procedures
          : effectiveMetric === 'waiting'
            ? r.waitingMinutes
            : r.visits,
  }));
  const barValueFormat = (v: number) =>
    effectiveMetric === 'revenue'
      ? formatCurrencyWhole(v)
      : effectiveMetric === 'waiting'
        ? `${v} mins`
        : v.toLocaleString();

  const revenueBreakdown = filteredRows
    .filter((r) => r.revenue > 0)
    .map((r) => ({
      row: r.row,
      amount: r.revenue,
      percent: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0,
      color: DEPT_ROW_COLORS[r.row],
    }))
    .sort((a, b) => b.amount - a.amount);

  const proceduresBreakdown = filteredRows
    .filter((r) => r.procedures > 0)
    .map((r) => ({
      row: r.row,
      amount: r.procedures,
      percent: totalProcedures > 0 ? (r.procedures / totalProcedures) * 100 : 0,
      color: DEPT_ROW_COLORS[r.row],
    }))
    .sort((a, b) => b.amount - a.amount);

  const topRevenueRow = [...filteredRows].sort((a, b) => b.revenue - a.revenue)[0];
  const topChangeRow = [...filteredRows]
    .filter((r) => r.changePercent !== null)
    .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))[0];
  const prevAvgWaitingTime =
    prevTotalVisits > 0
      ? Math.round(
          filteredRows.reduce((s, r) => s + r.waitingMinutes * prevVisitsByRow[r.row], 0) /
            prevTotalVisits,
        )
      : ILLUSTRATIVE_WAIT_BASELINE_MIN;
  const waitingChangePercent = pctDelta(avgWaitingTime, prevAvgWaitingTime);

  const filteredRecentReports =
    reportTypeFilter === 'ALL'
      ? RECENT_DEPARTMENT_REPORTS
      : RECENT_DEPARTMENT_REPORTS.filter((r) => r.reportType === reportTypeFilter);

  function scrollToSummaryTable() {
    summaryTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleApplyFilters() {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    toast.success('Filters applied', 'The dashboard has been updated.');
  }

  function handleResetFilters() {
    const from = monthStartKey();
    const to = todayKey();
    setDateFrom(from);
    setDateTo(to);
    setAppliedFrom(from);
    setAppliedTo(to);
    setDepartmentFilter('ALL');
    setReportTypeFilter('ALL');
    setMetricFilter('ALL');
  }

  function buildDashboardRows(): string[][] {
    const rows: string[][] = [['Section', 'Item', 'Value']];
    rows.push(['Stat', 'Total Departments', String(ORGANIZATIONAL_DEPARTMENTS.length)]);
    rows.push(['Stat', 'Total Visits', String(totalVisits)]);
    rows.push(['Stat', 'Total Revenue', formatCurrencyWhole(totalRevenue)]);
    rows.push(['Stat', 'Total Procedures (Estimated)', String(totalProcedures)]);
    rows.push(['Stat', 'Avg Waiting Time (Estimated)', `${avgWaitingTime} mins`]);
    for (const r of filteredRows) {
      rows.push([
        'Department Performance Summary',
        r.row,
        `Visits: ${r.visits}, Revenue: ${formatCurrencyWhole(r.revenue)}, Procedures: ${r.procedures}, Avg Wait: ${r.waitingMinutes} mins, Satisfaction: ${r.satisfaction.toFixed(1)}`,
      ]);
    }
    return rows;
  }

  function handleExportCSV() {
    downloadCSV('department-reports', buildDashboardRows());
    setExportMenuOpen(false);
    toast.success('Export ready', 'Department report data exported as CSV.');
  }

  function handleExportPDF() {
    const rows = buildDashboardRows();
    const body = `
      <h1>Department Reports</h1>
      <p class="meta">${escapeHtml(formatHumanDate(appliedFrom))} to ${escapeHtml(formatHumanDate(appliedTo))}</p>
      <hr>
      <table><thead><tr><th>Section</th><th>Item</th><th>Value</th></tr></thead><tbody>
      ${rows
        .slice(1)
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r[0] ?? '')}</td><td>${escapeHtml(r[1] ?? '')}</td><td>${escapeHtml(r[2] ?? '')}</td></tr>`,
        )
        .join('')}
      </tbody></table>
    `;
    downloadPDF('department-reports', body);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Department report exported as PDF.');
  }

  function handlePrint() {
    handleExportPDF();
  }

  function handleGenerateCustomReport(params: {
    reportId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const reportName =
      DEPARTMENT_REPORT_TYPES.find((r) => r.id === params.reportId)?.name ??
      'Custom Department Report';
    const visits = countVisits(params.dateFrom, params.dateTo);
    const total = DEPT_TABLE_ROWS.reduce((s, r) => s + visits[r], 0);
    const rows: string[][] = [
      ['Field', 'Value'],
      ['Report Type', reportName],
      ['From', formatHumanDate(params.dateFrom)],
      ['To', formatHumanDate(params.dateTo)],
      ['Total Visits in Range', String(total)],
    ];
    downloadCSV(`custom-department-report-${reportName.toLowerCase().replace(/\s+/g, '-')}`, rows);
    toast.success('Custom report generated', `${reportName} downloaded.`);
  }

  function handleDownloadReport(reportName: string) {
    downloadCSV(reportName.toLowerCase().replace(/\s+/g, '-'), buildDashboardRows());
    toast.success('Report downloaded', `${reportName} downloaded as CSV.`);
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
              Reports
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Department Reports
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(124,58,237,0.1)' }}
              >
                <Building2 style={{ width: 18, height: 18, color: '#7C3AED' }} />
              </div>
              <div>
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
                >
                  Department Reports
                </h1>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  Analyze performance and metrics for all departments.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <CalendarDays style={{ width: 15, height: 15 }} />
                Schedule Report
              </button>
              <div className="relative">
                <button
                  ref={exportBtnRef}
                  type="button"
                  onClick={() => setExportMenuOpen((v) => !v)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Download style={{ width: 15, height: 15 }} />
                  Export Report
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
            </div>
          </div>

          <div
            className="mt-5 rounded-[12px] p-4"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Report Type
                </p>
                <FilterDropdown
                  def={REPORT_TYPE_FILTER_DEF}
                  value={reportTypeFilter}
                  isOpen={reportTypeDropdownOpen}
                  onToggle={() => setReportTypeDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setReportTypeFilter(v);
                    setReportTypeDropdownOpen(false);
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-1.5 font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  Metric
                </p>
                <FilterDropdown
                  def={METRIC_FILTER_DEF}
                  value={metricFilter}
                  isOpen={metricDropdownOpen}
                  onToggle={() => setMetricDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setMetricFilter(v);
                    setMetricDropdownOpen(false);
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
              icon={Building2}
              label="Total Departments"
              value={ORGANIZATIONAL_DEPARTMENTS.length}
              info="Active departments"
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={Users}
              label="Total Visits"
              value={totalVisits.toLocaleString()}
              info={
                visitsChangePercent !== null
                  ? `${visitsChangePercent >= 0 ? '↑' : '↓'} ${Math.abs(visitsChangePercent)}% vs last period`
                  : `${formatHumanDate(appliedFrom)} - ${formatHumanDate(appliedTo)}`
              }
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={Wallet}
              label="Total Revenue"
              value={formatCurrencyWhole(totalRevenue)}
              info={`${formatHumanDate(appliedFrom)} - ${formatHumanDate(appliedTo)}`}
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
            />
            <StatCard
              icon={ClipboardList}
              label="Total Procedures"
              value={totalProcedures.toLocaleString()}
              info="Estimated for range"
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
            />
            <StatCard
              icon={Clock}
              label="Avg Waiting Time"
              value={`${avgWaitingTime} mins`}
              info="Estimated for range"
              accent="#00B4D8"
              iconBg="rgba(0,180,216,0.1)"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div
              className="min-w-0 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Visits by Department
                </p>
                <div className="w-[130px]">
                  <FormSelect
                    id="department-bar-metric"
                    value={effectiveMetric}
                    onChange={(v) => setMetricFilter(v)}
                    options={[
                      { value: 'visits', label: 'Visits' },
                      { value: 'revenue', label: 'Revenue' },
                      { value: 'procedures', label: 'Procedures' },
                      { value: 'waiting', label: 'Avg Wait' },
                    ]}
                    placeholder="Select metric"
                  />
                </div>
              </div>
              <DepartmentBarChart data={barChartData} formatValue={barValueFormat} />
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Revenue by Department
              </p>
              <div className="mt-3 flex justify-center">
                <AnimatedDonutChart
                  breakdown={revenueBreakdown.map((r) => ({
                    label: r.row,
                    value: r.amount,
                    color: r.color,
                  }))}
                  total={totalRevenue}
                  size={130}
                  ariaLabel="Revenue by department"
                  centerValue={formatCurrencyWhole(totalRevenue)}
                  centerLabel="Total"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {revenueBreakdown.map((r) => (
                  <div key={r.row} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: r.color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{r.row}</span>
                    </span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {formatCurrencyWhole(r.amount)} ({r.percent.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Procedures by Department
              </p>
              <div className="mt-3 flex justify-center">
                <AnimatedDonutChart
                  breakdown={proceduresBreakdown.map((r) => ({
                    label: r.row,
                    value: r.amount,
                    color: r.color,
                  }))}
                  total={totalProcedures}
                  size={130}
                  ariaLabel="Procedures by department"
                  centerValue={totalProcedures.toLocaleString()}
                  centerLabel="Total"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {proceduresBreakdown.map((r) => (
                  <div key={r.row} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: r.color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{r.row}</span>
                    </span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {r.amount.toLocaleString()} ({r.percent.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={summaryTableRef}
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
              Department Performance Summary
            </p>
            <div className="mt-3 overflow-x-auto scroll-smooth">
              <div style={{ minWidth: 820 }}>
                <div className="flex" style={{ background: '#F5FBFD' }}>
                  <div className="max-w-[170px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Department
                    </p>
                  </div>
                  <div className="w-20 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Visits
                    </p>
                  </div>
                  <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Revenue
                    </p>
                  </div>
                  <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Procedures
                    </p>
                  </div>
                  <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold whitespace-nowrap"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Avg Wait
                    </p>
                  </div>
                  <div className="w-28 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold whitespace-nowrap"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      Satisfaction
                    </p>
                  </div>
                  <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                    <p
                      className="font-sans font-semibold whitespace-nowrap"
                      style={{ fontSize: 14, color: '#4A7080' }}
                    >
                      % Change
                    </p>
                  </div>
                  <div className="w-16 shrink-0 py-2.5 pr-2 pl-3" />
                </div>
                {filteredRows.map((r) => (
                  <SummaryTableRow
                    key={r.row}
                    row={r}
                    onView={() => router.push(ROUTES.adminDepartmentMonitoring)}
                  />
                ))}
              </div>
            </div>
            <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
              Showing 1 to {filteredRows.length} of {filteredRows.length} departments
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
            <div
              className="min-w-0 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-2">
                <Lightbulb style={{ width: 16, height: 16, color: '#00B4D8' }} />
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Report Insights
                </p>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {topRevenueRow && (
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {topRevenueRow.row} has the highest revenue contribution (
                    {totalRevenue > 0
                      ? ((topRevenueRow.revenue / totalRevenue) * 100).toFixed(1)
                      : '0.0'}
                    %).
                  </p>
                )}
                {topChangeRow && (
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    {topChangeRow.row} department{' '}
                    {(topChangeRow.changePercent ?? 0) >= 0 ? 'improved' : 'declined in'} visits by{' '}
                    {Math.abs(topChangeRow.changePercent ?? 0)}% compared to last period.
                  </p>
                )}
                {waitingChangePercent !== null && (
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Average waiting time {waitingChangePercent >= 0 ? 'increased' : 'reduced'} by{' '}
                    {Math.abs(waitingChangePercent)}% across departments.
                  </p>
                )}
              </div>
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
                  Quick Actions
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <QuickActionButton
                    label="Generate Department Report"
                    description="Create a customized department report"
                    icon={FileText}
                    onClick={() => setCustomReportOpen(true)}
                  />
                  <QuickActionButton
                    label="Compare Departments"
                    description="Compare performance across departments"
                    icon={FileBarChart}
                    onClick={scrollToSummaryTable}
                  />
                  <QuickActionButton
                    label="Schedule Department Report"
                    description="Automate report delivery"
                    icon={CalendarDays}
                    onClick={() => setScheduleOpen(true)}
                  />
                  <QuickActionButton
                    label="Export Department Data"
                    description="Download department data in CSV/PDF"
                    icon={Download}
                    onClick={handleExportCSV}
                  />
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
                    Recent Department Reports
                  </p>
                  <button
                    type="button"
                    onClick={scrollToSummaryTable}
                    className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                    <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {filteredRecentReports.map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5">
                      <div className="min-w-0 flex-1">
                        <Tooltip content={r.name}>
                          <p
                            className="truncate font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {r.name}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#8A98A3' }}>
                          {formatHumanDate(r.generatedAt)}
                        </p>
                        <span
                          className="inline-block rounded-full px-2 py-0.5 font-sans font-medium"
                          style={{
                            fontSize: 14,
                            color: '#16A34A',
                            background: 'rgba(22,163,74,0.08)',
                          }}
                        >
                          {r.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadReport(r.name)}
                        aria-label={`Download ${r.name}`}
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                      >
                        <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {scheduleOpen && (
        <ScheduleReportModal
          reportOptions={DEPARTMENT_REPORT_TYPES.map((r) => ({ id: r.id, name: r.name }))}
          onClose={() => setScheduleOpen(false)}
        />
      )}
      {customReportOpen && (
        <CreateCustomReportModal
          reportOptions={DEPARTMENT_REPORT_TYPES.map((r) => ({ id: r.id, name: r.name }))}
          defaultDateFrom={dateFrom}
          defaultDateTo={dateTo}
          onClose={() => setCustomReportOpen(false)}
          onGenerate={handleGenerateCustomReport}
        />
      )}
    </div>
  );
}
