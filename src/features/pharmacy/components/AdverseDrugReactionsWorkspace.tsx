'use client';

import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileBarChart,
  Filter,
  MoreVertical,
  Printer,
  Rocket,
  Search,
  ShieldAlert,
  TrendingUp,
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
import { useAuth } from '@/hooks/useAuth';
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
  ADR_CAUSALITY_COLOR,
  ADR_CAUSALITY_OPTIONS,
  ADR_DRUG_CLASSES,
  ADR_DRUG_CLASS_OPTIONS,
  ADR_SEVERITY_COLOR,
  ADR_SEVERITY_OPTIONS,
  ADR_STATUS_COLOR,
  ADR_STATUS_OPTIONS,
  type ADRReport,
  type ADRSeverity,
} from '@/features/pharmacy/__mocks__/pharmacyFixtures';
import {
  createADRReport,
  updateADRStatus,
  useADRReports,
} from '@/features/pharmacy/store/adrReportStore';
import type { CreateADRReportInput } from '@/features/pharmacy/store/adrReportStore';

const ReportNewADRModal = dynamic(
  () => import('@/features/pharmacy/components/ReportNewADRModal').then((m) => m.ReportNewADRModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ADRReportDetailModal = dynamic(
  () =>
    import('@/features/pharmacy/components/ADRReportDetailModal').then(
      (m) => m.ADRReportDetailModal,
    ),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ADRGuidelinesModal = dynamic(
  () =>
    import('@/features/pharmacy/components/ADRGuidelinesModal').then((m) => m.ADRGuidelinesModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const SEVERITY_RANK: Record<ADRSeverity, number> = { Severe: 3, Moderate: 2, Mild: 1, Unknown: 0 };

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Report Date (Newest)' },
  { value: 'date-asc', label: 'Report Date (Oldest)' },
  { value: 'severity-desc', label: 'Severity (High to Low)' },
  { value: 'patient-asc', label: 'Patient Name (A-Z)' },
];

type ModalState =
  { type: 'new' } | { type: 'detail'; report: ADRReport } | { type: 'guidelines' } | null;

function Badge({
  label,
  color,
  border,
  bg,
}: {
  label: string;
  color: string;
  border: string;
  bg: string;
}) {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
      style={{
        fontSize: 14,
        whiteSpace: 'nowrap',
        color,
        border: `1px solid ${border}`,
        background: bg,
      }}
    >
      {label}
    </span>
  );
}

function RowMenu({
  report,
  onView,
  onResolve,
  onReportToNPC,
}: {
  report: ADRReport;
  onView: () => void;
  onResolve: () => void;
  onReportToNPC: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${report.id}`}
        className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={200}>
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
        {report.status === 'Under Assessment' && (
          <>
            {report.severity === 'Severe' && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onReportToNPC();
                }}
                className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
                style={{ fontSize: 14, color: '#7C3AED' }}
              >
                Report to NPC
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onResolve();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#16A34A' }}
            >
              Mark as Resolved
            </button>
          </>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function AdverseDrugReactionsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [causalityFilter, setCausalityFilter] = useState('');
  const [drugClassFilter, setDrugClassFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(watMonthStartInput());
  const [dateTo, setDateTo] = useState(toWATDateInput());
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [modal, setModal] = useState<ModalState>(null);

  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const actionsButtonRef = useRef<HTMLButtonElement>(null);

  const reports = useADRReports();

  const total = reports.length;
  const underAssessment = reports.filter((r) => r.status === 'Under Assessment').length;
  const serious = reports.filter((r) => r.severity === 'Severe').length;
  const resolved = reports.filter((r) => r.status === 'Resolved').length;

  const { thisMonthCount, trendPercent } = useMemo(() => {
    const thisStart = watMonthStartTimestamp(0);
    const lastStart = watMonthStartTimestamp(1);
    let thisCount = 0;
    let lastCount = 0;
    for (const r of reports) {
      const t = new Date(r.reportedAt).getTime();
      if (t >= thisStart) thisCount++;
      else if (t >= lastStart) lastCount++;
    }
    const pct = lastCount > 0 ? Math.round(((thisCount - lastCount) / lastCount) * 100) : 0;
    return { thisMonthCount: thisCount, trendPercent: pct };
  }, [reports]);

  const severityBreakdown = useMemo(() => {
    const order: { label: ADRSeverity; color: string }[] = [
      { label: 'Mild', color: ADR_SEVERITY_COLOR.Mild.color },
      { label: 'Moderate', color: ADR_SEVERITY_COLOR.Moderate.color },
      { label: 'Severe', color: ADR_SEVERITY_COLOR.Severe.color },
      { label: 'Unknown', color: ADR_SEVERITY_COLOR.Unknown.color },
    ];
    return order.map(({ label, color }) => ({
      label,
      value: reports.filter((r) => r.severity === label).length,
      color,
    }));
  }, [reports]);

  const drugClassBreakdown = useMemo(() => {
    const rows = ADR_DRUG_CLASSES.map((cls) => ({
      label: cls,
      value: reports.filter((r) => r.drugClass === cls).length,
    }));
    const max = Math.max(...rows.map((r) => r.value), 1);
    return rows.map((r) => ({
      ...r,
      percent: total > 0 ? (r.value / total) * 100 : 0,
      barPercent: (r.value / max) * 100,
    }));
  }, [reports, total]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Infinity;
    return reports.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (severityFilter && r.severity !== severityFilter) return false;
      if (causalityFilter && r.causality !== causalityFilter) return false;
      if (drugClassFilter && r.drugClass !== drugClassFilter) return false;
      const t = new Date(r.reportedAt).getTime();
      if (t < fromTime || t > toTime) return false;
      if (
        q &&
        !r.patientName.toLowerCase().includes(q) &&
        !r.mrn.toLowerCase().includes(q) &&
        !r.id.toLowerCase().includes(q) &&
        !r.suspectedDrugs.some((d) => d.toLowerCase().includes(q)) &&
        !r.reportedBy.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [
    reports,
    search,
    statusFilter,
    severityFilter,
    causalityFilter,
    drugClassFilter,
    dateFrom,
    dateTo,
  ]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    switch (sortBy) {
      case 'date-asc':
        return rows.sort(
          (a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime(),
        );
      case 'severity-desc':
        return rows.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
      case 'patient-asc':
        return rows.sort((a, b) => a.patientName.localeCompare(b.patientName));
      case 'date-desc':
      default:
        return rows.sort(
          (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
        );
    }
  }, [filtered, sortBy]);

  const pageStart = (currentPage - 1) * rowsPerPage;
  const pageRows = sorted.slice(pageStart, pageStart + rowsPerPage);

  function handleClearFilters() {
    setSearch('');
    setStatusFilter('');
    setSeverityFilter('');
    setCausalityFilter('');
    setDrugClassFilter('');
    setDateFrom(watMonthStartInput());
    setDateTo(toWATDateInput());
    setCurrentPage(1);
  }

  function handleApplyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} report${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function buildExportRows(): string[][] {
    return [
      [
        'Report ID',
        'Patient',
        'MRN',
        'Suspected Drug(s)',
        'Reaction',
        'Severity',
        'Causality',
        'Status',
        'Report Date',
        'Reported By',
      ],
      ...sorted.map((r) => [
        r.id,
        r.patientName,
        r.mrn,
        r.suspectedDrugs.join('; '),
        r.reaction,
        r.severity,
        r.causality,
        r.status,
        `${formatHumanDate(r.reportedAt)} ${formatTime(r.reportedAt)}`,
        r.reportedBy,
      ]),
    ];
  }

  function handleExport() {
    downloadCSV('adr-reports', buildExportRows());
    toast.success('Export ready', `${sorted.length} ADR reports downloaded as CSV.`);
  }

  function handlePrintList() {
    setActionsMenuOpen(false);
    const rows = buildExportRows();
    const [header, ...body] = rows;
    const table = `<table><thead><tr>${header!.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
    downloadPDF(
      'ADR Reports',
      `<h1>Adverse Drug Reactions</h1><p class="meta">${sorted.length} reports</p><hr />${table}`,
    );
  }

  function handleGenerateSummary() {
    const lines = [
      'Adverse Drug Reactions — Summary',
      `Generated ${formatHumanDate(new Date().toISOString())} ${formatTime(new Date().toISOString())}`,
      '',
      `Total ADR Reports: ${total}`,
      `Under Assessment: ${underAssessment}`,
      `Serious ADRs (Severe): ${serious}`,
      `Resolved: ${resolved}`,
      `This Month: ${thisMonthCount}`,
      '',
      'Top Suspected Drug Classes:',
      ...drugClassBreakdown.map((d) => `  ${d.label}: ${d.value} (${d.percent.toFixed(1)}%)`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adr-summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Summary generated', 'ADR summary downloaded.');
  }

  function handleCreateReport(input: CreateADRReportInput) {
    const id = createADRReport(input, user?.name ?? 'Pharmacist');
    setModal(null);
    toast.success('ADR reported', `${id} has been logged and is under assessment.`);
  }

  function handleResolve(id: string) {
    updateADRStatus(id, 'Resolved');
    setModal(null);
    toast.success('Marked as resolved', `${id} has been resolved.`);
  }

  function handleReportToNPC(id: string) {
    updateADRStatus(id, 'Reported to NPC');
    setModal(null);
    toast.success('Reported to NPC', `${id} has been escalated to the NPC.`);
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
          <span style={{ fontSize: 14, color: '#8A98A3' }}>Clinical Pharmacy</span>
          <span style={{ fontSize: 14, color: '#8A98A3' }}>/</span>
          <span className="font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Adverse Drug Reactions (ADR)
          </span>
        </nav>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-display font-semibold"
              style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
            >
              Adverse Drug Reactions (ADR)
            </h1>
            <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
              Report, monitor, and manage adverse drug reactions to improve patient safety.
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
            <PermissionGate permission={PERMISSIONS.PHARMACY_ADR_WRITE}>
              <button
                type="button"
                onClick={() => setModal({ type: 'new' })}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0F766E' }}
              >
                <ShieldAlert style={{ width: 15, height: 15 }} />
                Report New ADR
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          <StatCard
            icon={Rocket}
            label="Total ADR Reports"
            value={total}
            info="All time"
            accent="#DC2626"
            iconBg="rgba(220,38,38,0.1)"
            onClick={handleClearFilters}
          />
          <StatCard
            icon={Clock}
            label="Under Assessment"
            value={underAssessment}
            info="Awaiting review"
            accent="#D97706"
            iconBg="rgba(217,119,6,0.1)"
            onClick={() => {
              setStatusFilter('Under Assessment');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={Bell}
            label="Serious ADRs"
            value={serious}
            info={`${total > 0 ? ((serious / total) * 100).toFixed(1) : 0}% of total`}
            accent="#EA580C"
            iconBg="rgba(234,88,12,0.1)"
            onClick={() => {
              setSeverityFilter('Severe');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={CheckCircle2}
            label="Resolved"
            value={resolved}
            info={`${total > 0 ? ((resolved / total) * 100).toFixed(1) : 0}% of total`}
            accent="#16A34A"
            iconBg="rgba(22,163,74,0.1)"
            onClick={() => {
              setStatusFilter('Resolved');
              setCurrentPage(1);
            }}
          />
          <StatCard
            icon={TrendingUp}
            label="This Month"
            value={thisMonthCount}
            info={`${trendPercent >= 0 ? '+' : ''}${trendPercent}% vs last month`}
            accent="#2563EB"
            iconBg="rgba(37,99,235,0.1)"
            onClick={() => {
              setDateFrom(watMonthStartInput());
              setDateTo(toWATDateInput());
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
              <div className="flex items-center justify-between gap-3">
                <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  Filters
                </p>
                <button
                  type="button"
                  onClick={() => setMoreFiltersOpen((v) => !v)}
                  className={`flex shrink-0 items-center gap-1 font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  <Filter style={{ width: 14, height: 14 }} />
                  {moreFiltersOpen ? 'Fewer Filters' : 'More Filters'}
                </button>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label
                    htmlFor="adr-search"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Search
                  </label>
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                      style={{ width: 15, height: 15, color: '#8A98A3' }}
                    />
                    <input
                      id="adr-search"
                      type="search"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search by patient name, drug, or report ID..."
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
                    htmlFor="adr-status-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Status
                  </label>
                  <FormSelect
                    id="adr-status-filter"
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setCurrentPage(1);
                    }}
                    options={ADR_STATUS_OPTIONS}
                    placeholder="All Statuses"
                  />
                </div>
                <div>
                  <label
                    htmlFor="adr-severity-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Severity
                  </label>
                  <FormSelect
                    id="adr-severity-filter"
                    value={severityFilter}
                    onChange={(v) => {
                      setSeverityFilter(v);
                      setCurrentPage(1);
                    }}
                    options={ADR_SEVERITY_OPTIONS}
                    placeholder="All Severities"
                  />
                </div>
                <div>
                  <label
                    htmlFor="adr-causality-filter"
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Causality Assessment
                  </label>
                  <FormSelect
                    id="adr-causality-filter"
                    value={causalityFilter}
                    onChange={(v) => {
                      setCausalityFilter(v);
                      setCurrentPage(1);
                    }}
                    options={ADR_CAUSALITY_OPTIONS}
                    placeholder="All Assessments"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Report Date Range
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
                        Report date range
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
                {moreFiltersOpen && (
                  <div>
                    <label
                      htmlFor="adr-drug-class-filter"
                      className="mb-1.5 block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Drug Class
                    </label>
                    <FormSelect
                      id="adr-drug-class-filter"
                      value={drugClassFilter}
                      onChange={(v) => {
                        setDrugClassFilter(v);
                        setCurrentPage(1);
                      }}
                      options={ADR_DRUG_CLASS_OPTIONS}
                      placeholder="All Drug Classes"
                    />
                  </div>
                )}
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
                  style={{ fontSize: 14, background: '#00B4D8' }}
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
                  ADR Reports ({filtered.length})
                </h2>
                <div className="flex items-center gap-2.5">
                  <div style={{ width: 200 }}>
                    <FormSelect
                      id="adr-sort-by"
                      value={sortBy}
                      onChange={setSortBy}
                      options={SORT_OPTIONS}
                      placeholder="Sort by"
                    />
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
                <div style={{ minWidth: 1360 }}>
                  <div
                    className="flex rounded-t-[8px]"
                    style={{
                      background: 'rgba(226,237,241,0.4)',
                      borderBottom: '1px solid #E6F8FD',
                    }}
                  >
                    <div className="w-32 shrink-0 py-2.5 pr-2 pl-3">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Report ID
                      </span>
                    </div>
                    <div className="min-w-[160px] flex-1 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Patient
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Suspected Drug(s)
                      </span>
                    </div>
                    <div className="w-40 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Reaction
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Severity
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Causality
                      </span>
                    </div>
                    <div className="w-36 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Status
                      </span>
                    </div>
                    <div className="w-28 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Report Date
                      </span>
                    </div>
                    <div className="w-32 shrink-0 py-2.5 pr-2">
                      <span
                        className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                        style={{ fontSize: 14, color: '#4A7080' }}
                      >
                        Reported By
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
                        <Search style={{ width: 24, height: 24, color: '#8A98A3' }} />
                      </div>
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 16, color: '#4A7080' }}
                      >
                        No ADR reports match your filters
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

                  {pageRows.map((r) => {
                    const severityCfg = ADR_SEVERITY_COLOR[r.severity];
                    const causalityCfg = ADR_CAUSALITY_COLOR[r.causality];
                    const statusCfg = ADR_STATUS_COLOR[r.status];
                    return (
                      <div
                        key={r.id}
                        className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                      >
                        <div className="w-32 shrink-0 py-3 pr-2 pl-3">
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {r.id}
                          </p>
                        </div>
                        <div className="min-w-[160px] flex-1 py-3 pr-2">
                          <Tooltip content={r.patientName}>
                            <p
                              className="truncate font-sans font-medium"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.patientName}
                            </p>
                          </Tooltip>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>{r.mrn}</p>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={r.suspectedDrugs.join(', ')}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.suspectedDrugs.join(', ')}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2">
                          <Tooltip content={r.reaction}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.reaction}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <Badge
                            label={r.severity}
                            color={severityCfg.color}
                            border={severityCfg.border}
                            bg={severityCfg.bg}
                          />
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <Badge
                            label={r.causality}
                            color={causalityCfg.color}
                            border={causalityCfg.border}
                            bg={causalityCfg.bg}
                          />
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2">
                          <Badge
                            label={r.status}
                            color={statusCfg.color}
                            border={statusCfg.border}
                            bg={statusCfg.bg}
                          />
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {formatHumanDate(r.reportedAt)}
                          </p>
                          <p style={{ fontSize: 14, color: '#8A98A3' }}>
                            {formatTime(r.reportedAt)}
                          </p>
                        </div>
                        <div className="w-32 shrink-0 py-3 pr-2">
                          <Tooltip content={r.reportedBy}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.reportedBy}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="flex w-20 shrink-0 items-center justify-end gap-1 py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'detail', report: r })}
                            aria-label={`View ${r.id}`}
                            className={`flex size-11 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          >
                            <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <RowMenu
                            report={r}
                            onView={() => setModal({ type: 'detail', report: r })}
                            onResolve={() => handleResolve(r.id)}
                            onReportToNPC={() => handleReportToNPC(r.id)}
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
                itemLabel="reports"
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
                ADR by Severity
              </h2>
              <div className="mt-3 flex items-center gap-5">
                <AnimatedDonutChart
                  breakdown={severityBreakdown}
                  total={total}
                  ariaLabel="ADR by severity donut chart"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {severityBreakdown.map((d) => (
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
                Total {total.toLocaleString('en-GB')}
              </p>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <h2 className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Top Suspected Drug Classes
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {drugClassBreakdown.map((d) => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ fontSize: 14, color: '#4A7080' }}>{d.label}</span>
                      <span
                        className="shrink-0 font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {d.value} ({d.percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                      style={{ background: 'rgba(0,180,216,0.1)' }}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${d.barPercent}%`, background: '#00B4D8' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3" style={{ fontSize: 14, color: '#8A98A3' }}>
                Total {total.toLocaleString('en-GB')}
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
                <PermissionGate permission={PERMISSIONS.PHARMACY_ADR_WRITE}>
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'new' })}
                    className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldAlert style={{ width: 16, height: 16, color: '#00B4D8' }} />
                      <span style={{ fontSize: 14, color: '#0D2630' }}>Report New ADR</span>
                    </span>
                    <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() => {
                    setSearch(user?.name ?? '');
                    setCurrentPage(1);
                    toast.info('Showing your reports', 'Filtered to reports you submitted.');
                  }}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileBarChart style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>View My Reports</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ type: 'guidelines' })}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>ADR Reporting Guidelines</span>
                  </span>
                  <span style={{ fontSize: 14, color: '#00B4D8' }}>→</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className={`flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileBarChart style={{ width: 16, height: 16, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>Generate ADR Summary</span>
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
            Report all suspected adverse drug reactions promptly. Serious reactions will be
            escalated to the appropriate authorities.
          </p>
        </div>

        <div className="h-4" />
      </div>

      {modal?.type === 'new' && (
        <ReportNewADRModal onSubmit={handleCreateReport} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'detail' && (
        <ADRReportDetailModal
          report={reports.find((r) => r.id === modal.report.id) ?? modal.report}
          onUpdateStatus={(id, status) => {
            updateADRStatus(id, status);
            setModal(null);
            toast.success(
              status === 'Resolved' ? 'Marked as resolved' : 'Reported to NPC',
              `${id} has been updated.`,
            );
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'guidelines' && <ADRGuidelinesModal onClose={() => setModal(null)} />}
    </main>
  );
}
