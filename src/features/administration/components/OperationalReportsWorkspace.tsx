'use client';

import {
  Beaker,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileBarChart,
  FileText,
  MoreVertical,
  Pill,
  Siren,
  Stethoscope,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnimatedDonutChart } from '@components/shared/AnimatedDonutChart';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
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
import { useQueueEntries } from '@/features/registration/store/registrationQueueStore';
import { useEncounters } from '@/features/encounters/store/encounterStore';
import { useAdmissions } from '@/features/nursing/store/admissionsStore';
import { useScheduledAppointments } from '@/features/registration/store/appointmentStore';
import { deriveStatus } from '@/features/registration/__mocks__/appointmentSchedulingFixtures';
import { INVOICE_SERVICE_OPTIONS } from '@/features/billing/__mocks__/billingAccountDetailFixtures';
import {
  REPORT_DEFINITIONS,
  REPORT_TYPE_COLORS,
  RECENT_REPORTS,
  type ReportType,
} from '@/features/administration/__mocks__/operationalReportsFixtures';

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

/** `QueueEntry.department` is the 8-value clinic-routing taxonomy
 * (`General Outpatient`/`Surgery`/... ), a different real list from
 * `OrganizationalDepartment`/`BILLING_ACCOUNT_DEPARTMENTS`. Remapped here to
 * a coherent 5-category set, the same remap-table technique already used
 * for Revenue Overview's service categories — real counts, familiar labels. */
const VISIT_DEPARTMENT_MAP: Record<string, string> = {
  'General Outpatient': 'Consultation',
  Paediatrics: 'Consultation',
  Surgery: 'Other Services',
  Dental: 'Other Services',
  Physiotherapy: 'Other Services',
  Laboratory: 'Laboratory',
  Radiology: 'Laboratory',
  Pharmacy: 'Pharmacy',
};

const VISIT_DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  Consultation: Stethoscope,
  Pharmacy: Pill,
  Laboratory: Beaker,
  Emergency: Siren,
  'Other Services': ClipboardList,
};

const VISIT_DEPARTMENT_COLORS: Record<string, string> = {
  Consultation: '#00B4D8',
  Pharmacy: '#7C3AED',
  Laboratory: '#D97706',
  Emergency: '#DC2626',
  'Other Services': '#4A7080',
};

const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  Completed: '#16A34A',
  Confirmed: '#2563EB',
  Scheduled: '#00B4D8',
  'In Progress': '#D97706',
  Cancelled: '#DC2626',
};

const DEPARTMENT_FILTER_DEF: FilterDef = {
  key: 'department',
  defaultLabel: 'All Departments',
  options: Object.keys(VISIT_DEPARTMENT_ICONS).map((d) => ({ value: d, label: d })),
};

const SERVICE_FILTER_DEF: FilterDef = {
  key: 'service',
  defaultLabel: 'All Services',
  options: INVOICE_SERVICE_OPTIONS.map((s) => ({ value: s, label: s })),
};

const REPORT_TYPE_FILTER_DEF: FilterDef = {
  key: 'reportType',
  defaultLabel: 'All Report Types',
  options: (['Patient', 'Department', 'Staff', 'Service', 'Appointment'] as ReportType[]).map(
    (t) => ({
      value: t,
      label: t,
    }),
  ),
};

type Period = 'daily' | 'weekly' | 'monthly';

function PatientVolumeChart({ data }: { data: { label: string; value: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...data.map((d) => d.value), 1);
  const niceMax = Math.ceil(max / 10) * 10 || 10;
  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const W = 900;
  const H = 220;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: data.length > 1 ? i * stepX : W / 2,
    y: H - (d.value / niceMax) * H,
  }));
  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaD = `${lineD} L ${points[points.length - 1]?.x ?? 0} ${H} L ${points[0]?.x ?? 0} ${H} Z`;

  const labelStep = data.length > 8 ? Math.ceil(data.length / 8) : 1;
  const xLabelIdx = Array.from({ length: data.length }, (_, i) => i).filter(
    (i) => i % labelStep === 0,
  );

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

  return (
    <div className="mt-2 flex gap-3" style={{ height: 260 }}>
      <div className="flex shrink-0 flex-col justify-between pb-6 text-right" style={{ width: 32 }}>
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
            <linearGradient id="operational-reports-volume-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#operational-reports-volume-fill)" stroke="none" />
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
            <p style={{ fontSize: 14, color: '#B8D8E0' }}>{hovered.label}</p>
            <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#FFFFFF' }}>
              {hovered.value} patients
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
              {data[i]?.label}
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

const REPORT_PAGE_SIZE = 5;

export function OperationalReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const [dateFrom, setDateFrom] = useState(monthStartKey());
  const [dateTo, setDateTo] = useState(todayKey());
  const [appliedFrom, setAppliedFrom] = useState(monthStartKey());
  const [appliedTo, setAppliedTo] = useState(todayKey());
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [reportTypeFilter, setReportTypeFilter] = useState('ALL');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [reportTypeDropdownOpen, setReportTypeDropdownOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('daily');
  const [reportPage, setReportPage] = useState(1);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDefaultId, setScheduleDefaultId] = useState<string | undefined>(undefined);
  const [customReportOpen, setCustomReportOpen] = useState(false);
  const reportsTableRef = useRef<HTMLDivElement>(null);
  const [now] = useState(() => Date.now());

  const queueEntries = useQueueEntries();
  const encounters = useEncounters();
  const admissions = useAdmissions();
  const appointments = useScheduledAppointments();

  const entriesInRange = useMemo(
    () =>
      queueEntries.filter((e) => {
        const key = toDateKey(e.arrivalTime);
        const dept = VISIT_DEPARTMENT_MAP[e.department] ?? 'Other Services';
        const effectiveDept = e.isEmergency ? 'Emergency' : dept;
        return (
          key >= appliedFrom &&
          key <= appliedTo &&
          (departmentFilter === 'ALL' || effectiveDept === departmentFilter)
        );
      }),
    [queueEntries, appliedFrom, appliedTo, departmentFilter],
  );
  const consultationsInRange = useMemo(
    () =>
      encounters.filter((e) => {
        if (!e.completedAt) return false;
        const key = toDateKey(e.completedAt);
        return key >= appliedFrom && key <= appliedTo;
      }),
    [encounters, appliedFrom, appliedTo],
  );
  const admissionsInRange = useMemo(
    () =>
      admissions.filter((a) => {
        const key = toDateKey(a.admittedAt);
        return key >= appliedFrom && key <= appliedTo;
      }),
    [admissions, appliedFrom, appliedTo],
  );

  const totalPatients = entriesInRange.length;
  const totalConsultations = consultationsInRange.length;
  const totalAdmissions = admissionsInRange.length;
  // Illustrative: no hospital-wide procedures/no-show aggregate exists (see
  // plan notes) — scaled off real patient volume so it stays internally
  // plausible rather than a fixed magic number.
  const proceduresPerformed = Math.round(totalPatients * 0.29);
  const noShowAppointments = Math.round(totalPatients * 0.06);

  const trendData = useMemo(() => {
    const byKey = new Map<string, { label: string; value: number }>();
    for (const e of entriesInRange) {
      const d = new Date(e.arrivalTime);
      let key: string;
      let label: string;
      if (period === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      } else if (period === 'weekly') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = toDateKey(weekStart);
        label = `Wk of ${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
      } else {
        key = toDateKey(d);
        label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      }
      const existing = byKey.get(key);
      byKey.set(key, { label, value: (existing?.value ?? 0) + 1 });
    }
    return Array.from(byKey.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([, v]) => v);
  }, [entriesInRange, period]);

  const visitsByDepartment = useMemo(() => {
    const byDept = new Map<string, number>();
    for (const e of entriesInRange) {
      const dept = e.isEmergency
        ? 'Emergency'
        : (VISIT_DEPARTMENT_MAP[e.department] ?? 'Other Services');
      byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
    }
    return Array.from(byDept.entries())
      .map(([department, count]) => ({
        department,
        count,
        percent: totalPatients > 0 ? (count / totalPatients) * 100 : 0,
        color: VISIT_DEPARTMENT_COLORS[department] ?? '#8A98A3',
        icon: VISIT_DEPARTMENT_ICONS[department] ?? ClipboardList,
      }))
      .sort((a, b) => b.count - a.count);
  }, [entriesInRange, totalPatients]);

  const appointmentsOverview = useMemo(() => {
    const appointmentsInRange = appointments.filter((a) => {
      const key = toDateKey(a.dateTime);
      return key >= appliedFrom && key <= appliedTo;
    });
    const byStatus = new Map<string, number>();
    for (const a of appointmentsInRange) {
      const status = deriveStatus(a, now);
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    }
    const total = appointmentsInRange.length;
    return Array.from(byStatus.entries())
      .map(([status, count]) => ({
        status,
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
        color: APPOINTMENT_STATUS_COLORS[status] ?? '#8A98A3',
      }))
      .sort((a, b) => b.count - a.count);
  }, [appointments, appliedFrom, appliedTo, now]);
  const totalAppointments = appointmentsOverview.reduce((s, a) => s + a.count, 0);

  const filteredReports = useMemo(
    () =>
      REPORT_DEFINITIONS.filter(
        (r) => reportTypeFilter === 'ALL' || r.reportType === reportTypeFilter,
      ),
    [reportTypeFilter],
  );
  const pagedReports = filteredReports.slice(
    (reportPage - 1) * REPORT_PAGE_SIZE,
    reportPage * REPORT_PAGE_SIZE,
  );

  function scrollToReportsTable() {
    reportsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleApplyFilters() {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setReportPage(1);
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
    setServiceFilter('ALL');
    setReportTypeFilter('ALL');
    setReportPage(1);
  }

  function buildDashboardRows(): string[][] {
    const rows: string[][] = [['Section', 'Item', 'Value']];
    rows.push(['Stat', 'Total Patients', String(totalPatients)]);
    rows.push(['Stat', 'Total Consultations', String(totalConsultations)]);
    rows.push(['Stat', 'Procedures Performed', String(proceduresPerformed)]);
    rows.push(['Stat', 'Admissions', String(totalAdmissions)]);
    rows.push(['Stat', 'No-Show Appointments', String(noShowAppointments)]);
    for (const d of visitsByDepartment) {
      rows.push(['Visits by Department', d.department, `${d.count} (${d.percent.toFixed(1)}%)`]);
    }
    for (const a of appointmentsOverview) {
      rows.push(['Appointments Overview', a.status, `${a.count} (${a.percent.toFixed(1)}%)`]);
    }
    for (const r of filteredReports) {
      rows.push([
        'Report Catalog',
        r.name,
        `${r.reportType} - ${r.frequency} - ${formatDateTime(r.lastGeneratedAt)}`,
      ]);
    }
    return rows;
  }

  function handleExportCSV() {
    downloadCSV('operational-reports', buildDashboardRows());
    setExportMenuOpen(false);
    toast.success('Export ready', 'Operational report data exported as CSV.');
  }

  function handleExportPDF() {
    const rows = buildDashboardRows();
    const body = `
      <h1>Operational Reports</h1>
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
    downloadPDF('operational-reports', body);
    setExportMenuOpen(false);
    toast.success('Export ready', 'Operational report opened for print/PDF.');
  }

  function handlePrint() {
    handleExportPDF();
  }

  function handleGenerateCustomReport(params: {
    reportId: string;
    dateFrom: string;
    dateTo: string;
  }) {
    const reportName = REPORT_DEFINITIONS.find((r) => r.id === params.reportId)?.name ?? 'Custom';
    const rows: string[][] = [
      ['Field', 'Value'],
      ['Report Type', reportName],
      ['From', formatHumanDate(params.dateFrom)],
      ['To', formatHumanDate(params.dateTo)],
    ];
    const patients = queueEntries.filter((e) => {
      const key = toDateKey(e.arrivalTime);
      return key >= params.dateFrom && key <= params.dateTo;
    });
    rows.push(['Total Patients in Range', String(patients.length)]);
    downloadCSV(`custom-report-${reportName.toLowerCase().replace(/\s+/g, '-')}`, rows);
    toast.success('Custom report generated', `${reportName} report downloaded.`);
  }

  function handleDownloadReport(reportName: string) {
    downloadCSV(reportName.toLowerCase().replace(/\s+/g, '-'), buildDashboardRows());
    toast.success('Report downloaded', `${reportName} has been downloaded.`);
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
              Operational Reports
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(124,58,237,0.1)' }}
              >
                <FileBarChart style={{ width: 18, height: 18, color: '#7C3AED' }} />
              </div>
              <div>
                <h1
                  className="font-display font-semibold"
                  style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
                >
                  Operational Reports
                </h1>
                <p
                  className="mt-0.5"
                  style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}
                >
                  Monitor and analyze day-to-day operations across the medical centre.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setScheduleDefaultId(undefined);
                  setScheduleOpen(true);
                }}
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
                  Export Reports
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
                  Service
                </p>
                <FilterDropdown
                  def={SERVICE_FILTER_DEF}
                  value={serviceFilter}
                  isOpen={serviceDropdownOpen}
                  onToggle={() => setServiceDropdownOpen((v) => !v)}
                  onSelect={(v) => {
                    setServiceFilter(v);
                    setServiceDropdownOpen(false);
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
                    setReportPage(1);
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
              icon={Users}
              label="Total Patients"
              value={totalPatients}
              info={`${formatHumanDate(appliedFrom)} - ${formatHumanDate(appliedTo)}`}
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={Stethoscope}
              label="Total Consultations"
              value={totalConsultations}
              info="Completed in range"
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={ClipboardList}
              label="Procedures Performed"
              value={proceduresPerformed}
              info="Estimated for range"
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
            />
            <StatCard
              icon={UserPlus}
              label="Admissions"
              value={totalAdmissions}
              info="In range"
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
            />
            <StatCard
              icon={CheckCircle2}
              label="No-Show Appointments"
              value={noShowAppointments}
              info="Estimated for range"
              accent="#DC2626"
              iconBg="rgba(220,38,38,0.1)"
            />
          </div>

          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Patient Volume Trend
              </p>
              <div className="w-[130px]">
                <FormSelect
                  id="patient-volume-period"
                  value={period}
                  onChange={(v) => setPeriod(v as Period)}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                  placeholder="Select period"
                />
              </div>
            </div>
            <PatientVolumeChart data={trendData} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div
              className="rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Visits by Department
              </p>
              <div className="mt-3 flex justify-center">
                <AnimatedDonutChart
                  breakdown={visitsByDepartment.map((d) => ({
                    label: d.department,
                    value: d.count,
                    color: d.color,
                  }))}
                  total={totalPatients}
                  size={140}
                  ariaLabel="Visits by department"
                  centerValue={totalPatients}
                  centerLabel="Total"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {visitsByDepartment.map((d) => (
                  <div key={d.department} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: d.color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{d.department}</span>
                    </span>
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {d.count} ({d.percent.toFixed(1)}%)
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
                Appointments Overview
              </p>
              <div className="mt-3 flex justify-center">
                <AnimatedDonutChart
                  breakdown={appointmentsOverview.map((a) => ({
                    label: a.status,
                    value: a.count,
                    color: a.color,
                  }))}
                  total={totalAppointments}
                  size={140}
                  ariaLabel="Appointments overview"
                  centerValue={totalAppointments}
                  centerLabel="Total"
                />
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {appointmentsOverview.map((a) => (
                  <div key={a.status} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: a.color }}
                      />
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{a.status}</span>
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
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
            <div
              ref={reportsTableRef}
              className="min-w-0 rounded-[12px] p-4 sm:p-5"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Operational Reports
              </p>
              <div className="mt-3">
                <ScrollableTable minWidth={640}>
                  <div
                    className={`flex ${TABLE_HEADER_STICKY_CLASS}`}
                    style={{ background: TABLE_HEADER_BG }}
                  >
                    <div className="max-w-[160px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Report Name
                      </p>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Type
                      </p>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Frequency
                      </p>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
                      <p
                        className="font-sans font-semibold whitespace-nowrap"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Last Generated
                      </p>
                    </div>
                    <div className="w-24 shrink-0 py-2.5 pr-2 pl-3" />
                  </div>
                  {pagedReports.map((r) => (
                    <ReportRow
                      key={r.id}
                      report={r}
                      onDownload={() => handleDownloadReport(r.name)}
                      onSchedule={() => {
                        setScheduleDefaultId(r.id);
                        setScheduleOpen(true);
                      }}
                    />
                  ))}
                </ScrollableTable>
              </div>
              <div className="mt-3">
                <Pagination
                  page={reportPage}
                  pageSize={REPORT_PAGE_SIZE}
                  totalItems={filteredReports.length}
                  onPageChange={setReportPage}
                  onPageSizeChange={() => undefined}
                  itemLabel="reports"
                  pageSizeOptions={[REPORT_PAGE_SIZE]}
                />
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
                    label="Create Custom Report"
                    description="Build a report with your filters"
                    icon={FileText}
                    onClick={() => setCustomReportOpen(true)}
                  />
                  <QuickActionButton
                    label="Schedule New Report"
                    description="Automate report delivery"
                    icon={CalendarDays}
                    onClick={() => {
                      setScheduleDefaultId(undefined);
                      setScheduleOpen(true);
                    }}
                  />
                  <QuickActionButton
                    label="Manage Report Templates"
                    description="Edit and manage report templates"
                    icon={Wallet}
                    onClick={scrollToReportsTable}
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
                    Recent Reports
                  </p>
                  <button
                    type="button"
                    onClick={scrollToReportsTable}
                    className={`flex items-center gap-1 font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    View All
                    <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {RECENT_REPORTS.map((r) => (
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
          reportOptions={REPORT_DEFINITIONS.map((r) => ({ id: r.id, name: r.name }))}
          defaultReportId={scheduleDefaultId}
          onClose={() => setScheduleOpen(false)}
        />
      )}
      {customReportOpen && (
        <CreateCustomReportModal
          reportOptions={REPORT_DEFINITIONS.map((r) => ({ id: r.id, name: r.name }))}
          defaultDateFrom={dateFrom}
          defaultDateTo={dateTo}
          onClose={() => setCustomReportOpen(false)}
          onGenerate={handleGenerateCustomReport}
        />
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

function ReportRow({
  report,
  onDownload,
  onSchedule,
}: {
  report: (typeof REPORT_DEFINITIONS)[number];
  onDownload: () => void;
  onSchedule: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cfg = REPORT_TYPE_COLORS[report.reportType];

  return (
    <div className="flex items-center" style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}>
      <div className="max-w-[160px] min-w-0 flex-1 py-2.5 pr-2 pl-3">
        <Tooltip content={report.name}>
          <p className="truncate font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            {report.name}
          </p>
        </Tooltip>
        <Tooltip content={report.description}>
          <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
            {report.description}
          </p>
        </Tooltip>
      </div>
      <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
        <span
          className="inline-block rounded-full px-2 py-0.5 font-sans font-medium whitespace-nowrap"
          style={{ fontSize: 14, color: cfg.color, background: cfg.bg }}
        >
          {report.reportType}
        </span>
      </div>
      <div className="w-24 shrink-0 py-2.5 pr-2 pl-3">
        <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
          {report.frequency}
        </p>
      </div>
      <div className="w-36 shrink-0 py-2.5 pr-2 pl-3">
        <p className="truncate whitespace-nowrap" style={{ fontSize: 14, color: '#4A7080' }}>
          {formatDateTime(report.lastGeneratedAt)}
        </p>
      </div>
      <div className="flex w-24 shrink-0 items-center gap-1 py-2.5 pr-2 pl-3">
        <button
          type="button"
          onClick={onDownload}
          aria-label={`Preview ${report.name}`}
          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
        >
          <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
        </button>
        <button
          type="button"
          onClick={onDownload}
          aria-label={`Download ${report.name}`}
          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
        >
          <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
        </button>
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`More actions for ${report.name}`}
            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
          >
            <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
          </button>
          <RowMenuPortal
            open={menuOpen}
            anchorRef={buttonRef}
            onClose={() => setMenuOpen(false)}
            width={180}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onSchedule();
              }}
              className={`flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              Schedule This Report
            </button>
          </RowMenuPortal>
        </div>
      </div>
    </div>
  );
}
