'use client';

import {
  Archive,
  BedDouble,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  DoorOpen,
  Eye,
  FileBarChart,
  Info,
  MoreVertical,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  EMERGENCY_REPORT_CATALOG,
  REPORT_LOCATIONS,
  REPORT_SHIFTS,
  REPORT_STATS,
  REPORT_TEMPLATES,
  REPORT_TYPES,
  TOP_METRICS,
  type EmergencyReportCatalogEntry,
} from '@/features/emergency/__mocks__/emergencyReportsFixtures';
import type { ScheduleReportInput } from '@/features/emergency/components/ScheduleReportModal';

const ScheduleReportModal = dynamic(
  () => import('./ScheduleReportModal').then((m) => m.ScheduleReportModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ReportPreviewModal = dynamic(
  () => import('./ReportPreviewModal').then((m) => m.ReportPreviewModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

type PageState = 'loading' | 'loaded' | 'error';
type DateRangeFilter = 'ALL' | 'TODAY' | 'WEEK';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

const STAT_ICONS: Record<string, typeof Users> = {
  visits: Users,
  admitted: BedDouble,
  leftAma: DoorOpen,
  los: Clock,
  satisfaction: Star,
};
const STAT_COLORS: Record<string, { color: string; bg: string }> = {
  visits: { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
  admitted: { color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  leftAma: { color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  los: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
  satisfaction: { color: '#D97706', bg: 'rgba(245,158,11,0.1)' },
};

const PAGE_SIZE = 8;

function ReportRowMenu({
  open,
  onToggle,
  onView,
  onDownload,
  onDelete,
  canDelete,
}: {
  open: boolean;
  onToggle: () => void;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  canDelete: boolean;
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
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={onToggle} width={190}>
        <button
          type="button"
          onClick={onView}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Eye style={{ width: 15, height: 15, color: '#00B4D8' }} />
          View Details
        </button>
        <button
          type="button"
          onClick={onDownload}
          className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
          style={{ fontSize: 14, color: '#0D2630' }}
        >
          <Download style={{ width: 15, height: 15, color: '#4A7080' }} />
          Download
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={`flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#DC2626' }}
          >
            <Trash2 style={{ width: 15, height: 15 }} />
            Delete Report
          </button>
        )}
      </RowMenuPortal>
    </div>
  );
}

export function EmergencyReportsWorkspace() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const defaultAuthor = user?.name ?? 'Emergency Physician';

  const [now] = useState(() => Date.now());
  const [pageState, setPageState] = useState<PageState>('loading');
  const [catalog, setCatalog] = useState<EmergencyReportCatalogEntry[]>(EMERGENCY_REPORT_CATALOG);
  const [scheduledCount, setScheduledCount] = useState(5);

  const [reportTypeFilter, setReportTypeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<'type' | 'date' | 'location' | 'shift' | null>(null);
  const [page, setPage] = useState(1);

  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<EmergencyReportCatalogEntry | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 800);
  }

  const filtered = catalog
    .filter((r) => reportTypeFilter === 'ALL' || r.reportType === reportTypeFilter)
    .filter((r) => locationFilter === 'ALL' || r.location === locationFilter)
    .filter((r) => shiftFilter === 'ALL' || r.shift === shiftFilter)
    .filter((r) => {
      if (dateFilter === 'ALL') return true;
      const ageMs = now - new Date(r.generatedOn).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      if (dateFilter === 'TODAY') return ageMs < dayMs;
      return ageMs < 7 * dayMs;
    })
    .sort((a, b) => new Date(b.generatedOn).getTime() - new Date(a.generatedOn).getTime());

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const mostUsed = (() => {
    const counts = new Map<string, number>();
    for (const r of catalog) counts.set(r.name, (counts.get(r.name) ?? 0) + 1);
    let top = catalog[0]?.name ?? '—';
    let max = 0;
    for (const [name, count] of counts) {
      if (count > max) {
        max = count;
        top = name;
      }
    }
    return top;
  })();
  const lastGenerated = [...catalog].sort(
    (a, b) => new Date(b.generatedOn).getTime() - new Date(a.generatedOn).getTime(),
  )[0];

  function buildReportBody(
    entry: Pick<
      EmergencyReportCatalogEntry,
      | 'name'
      | 'description'
      | 'generatedBy'
      | 'generatedOn'
      | 'dateRangeLabel'
      | 'location'
      | 'shift'
    >,
  ) {
    return `
      <h1>${escapeHtml(entry.name)}</h1>
      <p class="meta">${escapeHtml(entry.dateRangeLabel)} · ${escapeHtml(entry.location)} · ${escapeHtml(entry.shift)}</p>
      <p>${escapeHtml(entry.description)}</p>
      <hr>
      <p>Generated by ${escapeHtml(entry.generatedBy)} on ${escapeHtml(formatHumanDate(entry.generatedOn))}, ${escapeHtml(formatTime(entry.generatedOn))}</p>
      <h3>Key Metrics</h3>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
      ${REPORT_STATS.map((s) => `<tr><td>${escapeHtml(s.label)}</td><td>${escapeHtml(s.value)}</td></tr>`).join('')}
      </tbody></table>
    `;
  }

  function handleRowDownload(entry: EmergencyReportCatalogEntry) {
    if (entry.format === 'PDF') {
      downloadPDF(entry.id, buildReportBody(entry));
    } else {
      downloadCSV(entry.id, [['Metric', 'Value'], ...REPORT_STATS.map((s) => [s.label, s.value])]);
    }
    toast.success('Report downloaded', `${entry.name} exported as ${entry.format}.`);
  }

  function handleGenerateReport() {
    const type = reportTypeFilter === 'ALL' ? 'ED Daily Summary' : reportTypeFilter;
    const dateLabel =
      dateFilter === 'TODAY' ? 'Today' : dateFilter === 'WEEK' ? 'Last 7 Days' : 'Custom Range';
    const newEntry: EmergencyReportCatalogEntry = {
      id: `rep-user-${Date.now()}`,
      name: type,
      description:
        catalog.find((r) => r.reportType === type)?.description ??
        'Generated emergency department report.',
      reportType: type,
      generatedBy: defaultAuthor,
      generatedOn: new Date().toISOString(),
      dateRangeLabel: dateLabel,
      format: 'PDF',
      location: locationFilter === 'ALL' ? 'All Locations' : locationFilter,
      shift: shiftFilter === 'ALL' ? 'All Shifts' : shiftFilter,
      userGenerated: true,
    };
    setCatalog((prev) => [newEntry, ...prev]);
    downloadPDF(newEntry.id, buildReportBody(newEntry));
    toast.success('Report generated', `${newEntry.name} is ready and has been downloaded.`);
    setPage(1);
  }

  function handleReset() {
    setReportTypeFilter('ALL');
    setDateFilter('ALL');
    setLocationFilter('ALL');
    setShiftFilter('ALL');
    setPage(1);
  }

  function handleExportBulk(format: 'PDF' | 'CSV') {
    if (format === 'PDF') {
      const body = `
        <h1>Emergency Reports — Available Reports</h1>
        <p class="meta">${filtered.length} reports</p>
        <hr>
        <table><thead><tr><th>Name</th><th>Generated By</th><th>Generated On</th><th>Date Range</th><th>Format</th></tr></thead><tbody>
        ${filtered
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.generatedBy)}</td><td>${escapeHtml(formatHumanDate(r.generatedOn))} ${escapeHtml(formatTime(r.generatedOn))}</td><td>${escapeHtml(r.dateRangeLabel)}</td><td>${escapeHtml(r.format)}</td></tr>`,
          )
          .join('')}
        </tbody></table>
      `;
      downloadPDF('emergency-reports-catalog', body);
    } else {
      downloadCSV('emergency-reports-catalog', [
        [
          'Name',
          'Description',
          'Generated By',
          'Generated On',
          'Date Range',
          'Format',
          'Location',
          'Shift',
        ],
        ...filtered.map((r) => [
          r.name,
          r.description,
          r.generatedBy,
          `${formatHumanDate(r.generatedOn)} ${formatTime(r.generatedOn)}`,
          r.dateRangeLabel,
          r.format,
          r.location,
          r.shift,
        ]),
      ]);
    }
    setExportMenuOpen(false);
    toast.success('Export ready', `${filtered.length} reports exported.`);
  }

  function handleDeleteReport(id: string) {
    setCatalog((prev) => prev.filter((r) => r.id !== id));
    toast.success('Report deleted', 'The report has been removed from the catalog.');
  }

  function handleScheduleSubmit(input: ScheduleReportInput) {
    setScheduledCount((c) => c + 1);
    setShowSchedule(false);
    toast.success(
      'Report scheduled',
      `${input.reportType} will be sent ${input.frequency.toLowerCase()} to ${input.recipients}.`,
    );
  }

  function handleQuickAction(label: string) {
    toast.info(label, 'This feature is on the roadmap and not yet available.');
  }

  const FILTER_DEFS: { key: 'type' | 'date' | 'location' | 'shift'; def: FilterDef }[] = [
    {
      key: 'type',
      def: {
        key: 'type',
        defaultLabel: 'All Reports',
        options: REPORT_TYPES.map((t) => ({ value: t, label: t })),
      },
    },
    {
      key: 'date',
      def: {
        key: 'date',
        defaultLabel: 'All Dates',
        options: [
          { value: 'TODAY', label: 'Today' },
          { value: 'WEEK', label: 'Last 7 Days' },
        ],
      },
    },
    {
      key: 'location',
      def: {
        key: 'location',
        defaultLabel: 'All Locations',
        options: REPORT_LOCATIONS.map((l) => ({ value: l, label: l })),
      },
    },
    {
      key: 'shift',
      def: {
        key: 'shift',
        defaultLabel: 'All Shifts',
        options: REPORT_SHIFTS.map((s) => ({ value: s, label: s })),
      },
    },
  ];
  const filterValue: Record<string, string> = {
    type: reportTypeFilter,
    date: dateFilter,
    location: locationFilter,
    shift: shiftFilter,
  };
  const filterSetter: Record<string, (v: string) => void> = {
    type: setReportTypeFilter,
    date: (v) => setDateFilter(v as DateRangeFilter),
    location: setLocationFilter,
    shift: setShiftFilter,
  };

  if (pageState === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center" style={{ background: '#F5FBFD' }}>
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <Info style={{ width: 40, height: 40, color: '#DC2626' }} />
          <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
            Couldn&apos;t load Emergency Reports
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
        <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 h-64 animate-pulse rounded-[12px] bg-slate-100" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 sm:py-5">
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
          <span style={{ fontSize: 14, color: '#4A7080' }}>Reports</span>
          <ChevronRight style={{ width: 14, height: 14, color: '#8A98A3' }} />
          <span className="font-sans font-medium" style={{ fontSize: 14, color: '#00B4D8' }}>
            Emergency Reports
          </span>
        </div>

        {/* Header */}
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileBarChart style={{ width: 22, height: 22, color: '#DC2626' }} />
            <div>
              <h1 className="font-display font-bold" style={{ fontSize: 24, color: '#0D2630' }}>
                Emergency Reports
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                Generate, view and export emergency department reports and analytics.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
              <button
                type="button"
                onClick={() => setShowSchedule(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Calendar style={{ width: 15, height: 15 }} />
                Schedule Report
              </button>
            </PermissionGate>
            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((p) => !p)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#0D2630' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export
                <ChevronDown style={{ width: 14, height: 14 }} />
              </button>
              {exportMenuOpen && (
                <div
                  className="animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 absolute top-full right-0 z-20 mt-1 w-44 overflow-hidden rounded-[10px] bg-white py-1.5 duration-150"
                  style={{
                    border: '1px solid rgba(0,100,130,0.12)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleExportBulk('PDF')}
                    className={`flex w-full items-center px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Export as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportBulk('CSV')}
                    className={`flex w-full items-center px-3.5 py-2 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1fr_320px] 2xl:items-start">
          <div className="min-w-0">
            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {REPORT_STATS.map((s) => {
                const Icon = STAT_ICONS[s.key]!;
                const cfg = STAT_COLORS[s.key]!;
                const isGood = s.direction === s.goodDirection;
                return (
                  <div
                    key={s.key}
                    className="flex items-start gap-3 rounded-[12px] p-4"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                  >
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: cfg.bg }}
                    >
                      <Icon style={{ width: 20, height: 20, color: cfg.color }} />
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>{s.label}</p>
                      <p
                        className="font-display font-bold"
                        style={{ fontSize: 20, color: '#0D2630' }}
                      >
                        {s.value}
                      </p>
                      <p style={{ fontSize: 14, color: isGood ? '#16A34A' : '#DC2626' }}>
                        {s.direction === 'up' ? '↑' : '↓'} {s.deltaPercent}% vs last 7 days
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filter bar */}
            <div
              className="mt-4 flex flex-wrap items-center gap-2.5 rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
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
              <button
                type="button"
                onClick={handleReset}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Reset
              </button>
              <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  className={`ml-auto flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#0D2630' }}
                >
                  Generate Report
                </button>
              </PermissionGate>
            </div>

            {/* Available Reports table */}
            <div
              className="mt-4 rounded-[12px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p
                className="font-display px-4 pt-4 font-semibold"
                style={{ fontSize: 16, color: '#0D2630' }}
              >
                Available Reports
              </p>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <FileBarChart style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                    No reports found
                  </p>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    Try a different filter combination, or generate a new report.
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
                          ['Report Name', 'min-w-[190px] flex-1'],
                          ['Generated By', 'w-32'],
                          ['Generated On', 'w-32'],
                          ['Date Range', 'w-28'],
                          ['Format', 'w-20'],
                          ['', 'w-24'],
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
                      {paged.map((r, i) => (
                        <div
                          key={r.id}
                          className="flex items-center transition-colors duration-150 hover:bg-[#F5FBFD]"
                          style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                        >
                          <div className="w-10 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {(currentPage - 1) * PAGE_SIZE + i + 1}
                            </p>
                          </div>
                          <div className="min-w-[190px] flex-1 px-2 py-3 text-center">
                            <p
                              className="font-sans font-semibold"
                              style={{ fontSize: 14, color: '#0D2630' }}
                            >
                              {r.name}
                            </p>
                            <Tooltip content={r.description}>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {r.description}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <Tooltip content={r.generatedBy}>
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {r.generatedBy}
                              </p>
                            </Tooltip>
                          </div>
                          <div className="w-32 shrink-0 px-2 py-3 text-center">
                            <p style={{ fontSize: 14, color: '#4A7080' }}>
                              {formatTime(r.generatedOn)}
                            </p>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatHumanDate(r.generatedOn)}
                            </p>
                          </div>
                          <div className="w-28 shrink-0 px-2 py-3 text-center">
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {r.dateRangeLabel}
                            </p>
                          </div>
                          <div className="w-20 shrink-0 px-2 py-3 text-center">
                            <span
                              className="inline-flex items-center rounded-[6px] px-2 py-0.5 font-sans font-semibold whitespace-nowrap"
                              style={{
                                fontSize: 14,
                                color: r.format === 'PDF' ? '#DC2626' : '#16A34A',
                                background:
                                  r.format === 'PDF'
                                    ? 'rgba(220,38,38,0.1)'
                                    : 'rgba(22,163,74,0.1)',
                              }}
                            >
                              {r.format}
                            </span>
                          </div>
                          <div className="flex w-24 shrink-0 items-center justify-center gap-1 px-2 py-3">
                            <button
                              type="button"
                              onClick={() => setPreviewReport(r)}
                              aria-label="View details"
                              className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            >
                              <Eye style={{ width: 16, height: 16, color: '#4A7080' }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRowDownload(r)}
                              aria-label="Download report"
                              className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                            >
                              <Download style={{ width: 16, height: 16, color: '#4A7080' }} />
                            </button>
                            <ReportRowMenu
                              open={openRowMenuId === r.id}
                              onToggle={() =>
                                setOpenRowMenuId((prev) => (prev === r.id ? null : r.id))
                              }
                              onView={() => {
                                setOpenRowMenuId(null);
                                setPreviewReport(r);
                              }}
                              onDownload={() => {
                                setOpenRowMenuId(null);
                                handleRowDownload(r);
                              }}
                              onDelete={() => {
                                setOpenRowMenuId(null);
                                handleDeleteReport(r.id);
                              }}
                              canDelete={!!r.userGenerated}
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
                      reports
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

            {/* About */}
            <div
              className="mt-4 flex items-start gap-2.5 rounded-[12px] p-4"
              style={{
                background: 'rgba(0,180,216,0.06)',
                border: '1px solid rgba(0,180,216,0.2)',
              }}
            >
              <Info
                style={{ width: 16, height: 16, color: '#00B4D8' }}
                className="mt-0.5 shrink-0"
              />
              <div>
                <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
                  About Emergency Reports
                </p>
                <p style={{ fontSize: 14, color: '#4A7080' }}>
                  Reports are generated based on real-time data. Data accuracy depends on timely and
                  correct documentation.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-full shrink-0 flex-col gap-4">
            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Report Overview{' '}
                <span style={{ fontSize: 14, color: '#8A98A3', fontWeight: 400 }}>
                  (This Period)
                </span>
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Total Reports Generated</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {catalog.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Scheduled Reports</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {scheduledCount}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Most Used Report</span>
                  <Tooltip content={mostUsed}>
                    <span
                      className="max-w-[140px] truncate text-right font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {mostUsed}
                    </span>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Last Generated</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {lastGenerated
                      ? `${formatHumanDate(lastGenerated.generatedOn)}, ${formatTime(lastGenerated.generatedOn)}`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Top Metrics{' '}
                <span style={{ fontSize: 14, color: '#8A98A3', fontWeight: 400 }}>
                  (This Period)
                </span>
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Busiest Day</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {TOP_METRICS.busiestDay}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Peak Hour</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {TOP_METRICS.peakHour}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Most Common Diagnosis</span>
                  <Tooltip content={TOP_METRICS.mostCommonDiagnosis}>
                    <span
                      className="max-w-[140px] truncate text-right font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {TOP_METRICS.mostCommonDiagnosis}
                    </span>
                  </Tooltip>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Admission Rate</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {TOP_METRICS.admissionRatePercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 14, color: '#8A98A3' }}>Left AMA Rate</span>
                  <span
                    className="font-sans font-medium"
                    style={{ fontSize: 14, color: '#0D2630' }}
                  >
                    {TOP_METRICS.leftAmaRatePercent}%
                  </span>
                </div>
              </div>
            </div>

            <div
              className="rounded-[12px] p-4"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <p className="font-display font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Quick Actions
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() => handleQuickAction('Custom Report Builder')}
                    className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    Create Custom Report
                  </button>
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.EMERGENCY_WRITE}>
                  <button
                    type="button"
                    onClick={() => setShowSchedule(true)}
                    className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Calendar style={{ width: 14, height: 14 }} />
                    Schedule New Report
                  </button>
                </PermissionGate>
                <button
                  type="button"
                  onClick={() => handleQuickAction('Report Templates')}
                  className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <FileBarChart style={{ width: 14, height: 14 }} />
                  View Report Templates
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAction('Reports Archive')}
                  className={`flex h-10 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Archive style={{ width: 14, height: 14 }} />
                  Reports Archive
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
                  Report Templates
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickAction('Report Templates')}
                  className={`font-sans font-medium transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
                  style={{ fontSize: 14, color: '#00B4D8' }}
                >
                  View All
                </button>
              </div>
              <div className="mt-2.5 flex flex-col gap-1">
                {REPORT_TEMPLATES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setReportTypeFilter(
                        t
                          .replace(' Template', ' Report')
                          .replace('ED Daily Summary Report', 'ED Daily Summary'),
                      );
                      setPage(1);
                      toast.success('Template applied', `Filtered to ${t}.`);
                    }}
                    className={`flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  >
                    <FileBarChart style={{ width: 14, height: 14, color: '#00B4D8' }} />
                    <span style={{ fontSize: 14, color: '#0D2630' }}>{t}</span>
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

      {previewReport && (
        <ReportPreviewModal
          report={previewReport}
          onClose={() => setPreviewReport(null)}
          onDownload={() => {
            handleRowDownload(previewReport);
            setPreviewReport(null);
          }}
        />
      )}

      {showSchedule && (
        <ScheduleReportModal
          onClose={() => setShowSchedule(false)}
          onSubmit={handleScheduleSubmit}
        />
      )}
    </main>
  );
}
