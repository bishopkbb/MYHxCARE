'use client';

import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Download,
  Eye,
  Filter,
  MoreVertical,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PERMISSIONS } from '@/constants/permissions';
import { useToast } from '@/hooks/useToast';
import { downloadCSV } from '@/utils/export';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import {
  ARCHIVED_RECORDS,
  ARCHIVED_RECORD_TYPES,
  ARCHIVE_STATUSES,
  type ArchivedRecord,
} from '@/features/medical-records/__mocks__/archivedRecordFixtures';

type PageState = 'loading' | 'loaded' | 'error';

const STATUS_CFG: Record<ArchivedRecord['status'], { color: string; border: string; bg: string }> =
  {
    Archived: { color: '#22C55E', border: 'rgba(34,197,94,0.40)', bg: 'rgba(34,197,94,0.06)' },
    Restored: { color: '#00B4D8', border: 'rgba(0,180,216,0.40)', bg: 'transparent' },
    'Pending Deletion': {
      color: '#EF4444',
      border: 'rgba(239,68,68,0.40)',
      bg: 'rgba(239,68,68,0.06)',
    },
  };

const RECORD_TYPE_CFG: Record<
  ArchivedRecord['recordType'],
  { color: string; border: string; bg: string }
> = {
  'Patient Record': {
    color: '#3B82F6',
    border: 'rgba(59,130,246,0.30)',
    bg: 'rgba(59,130,246,0.06)',
  },
  'Visit History': {
    color: '#8B5CF6',
    border: 'rgba(139,92,246,0.30)',
    bg: 'rgba(139,92,246,0.06)',
  },
  'Lab Results': { color: '#00B4D8', border: 'rgba(0,180,216,0.30)', bg: 'rgba(0,180,216,0.06)' },
};

const ROWS_PER_PAGE = 5;

function formatHumanDateTime(date: string): string {
  return `${formatHumanDate(date)} ${formatTime(date)}`;
}

export function ArchivedRecordsWorkspace() {
  const toast = useToast();
  const [pageState, setPageState] = useState<PageState>('loaded');
  const [records, setRecords] = useState<ArchivedRecord[]>(ARCHIVED_RECORDS);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [recordType, setRecordType] = useState('');
  const [archiveDate, setArchiveDate] = useState('');
  const [status, setStatus] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(records.map((r) => r.department))).map((d) => ({ value: d, label: d })),
    [records],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (department && r.department !== department) return false;
      if (recordType && r.recordType !== recordType) return false;
      if (status && r.status !== status) return false;
      if (archiveDate && formatDateOnly(r.archiveDate) !== archiveDate) return false;
      if (q && !r.patientName.toLowerCase().includes(q) && !r.mrn.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [records, search, department, recordType, status, archiveDate]);

  function formatDateOnly(iso: string): string {
    return iso.slice(0, 10);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const selected = selectedId ? records.find((r) => r.id === selectedId) : undefined;

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  function clearFilters() {
    setSearch('');
    setDepartment('');
    setRecordType('');
    setArchiveDate('');
    setStatus('');
    setCurrentPage(1);
  }

  function handleRetrieve(id: string) {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Restored',
              auditTrail: [
                {
                  dateTime: new Date().toISOString(),
                  label: 'Record restored',
                  actor: 'Mrs. Ngozi Asogwa',
                },
                ...r.auditTrail,
              ],
            }
          : r,
      ),
    );
    toast.success('Record retrieved', `${record.patientName} is now active again.`);
    setSelectedId(null);
  }

  function handleExport() {
    const rows = [
      [
        'Patient',
        'MRN',
        'Record Type',
        'Department',
        'Archive Date',
        'Reason',
        'Status',
        'Archived By',
      ],
      ...filtered.map((r) => [
        r.patientName,
        r.mrn,
        r.recordType,
        r.department,
        formatHumanDateTime(r.archiveDate),
        r.reason,
        r.status,
        r.archivedBy,
      ]),
    ];
    downloadCSV('archived-records.csv', rows);
    toast.success(
      'Export ready',
      `${filtered.length} archived record${filtered.length !== 1 ? 's' : ''} downloaded as CSV.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5">
          <h1
            className="font-display font-semibold"
            style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
          >
            Archived Records
          </h1>
          <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
            View and manage archived or inactive patient records
          </p>

          {pageState === 'error' ? (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load archived records
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                style={{
                  height: 40,
                  borderRadius: 12,
                  padding: '0 20px',
                  background: '#00B4D8',
                  fontSize: 14,
                }}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Retry
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              {/* ── List pane ─────────────────────────────────────────────── */}
              <div className={`min-w-0 flex-1 ${selected ? 'hidden xl:block' : 'block'}`}>
                <div
                  className="rounded-[12px] p-4 sm:p-5"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <div className="relative sm:col-span-2 lg:col-span-1">
                      <Search
                        style={{ width: 15, height: 15, color: '#8A98A3' }}
                        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
                      />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search by patient name, MRN or record ID"
                        className="h-11 w-full rounded-[10px] pr-3.5 pl-9 font-sans transition-colors duration-150 placeholder:text-[#8A98A3] focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/40 focus:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.18)',
                        }}
                      />
                    </div>
                    <FormSelect
                      id="archived-department-filter"
                      value={department}
                      onChange={(v) => {
                        setDepartment(v);
                        setCurrentPage(1);
                      }}
                      options={departmentOptions}
                      placeholder="All Departments"
                    />
                    <FormSelect
                      id="archived-type-filter"
                      value={recordType}
                      onChange={(v) => {
                        setRecordType(v);
                        setCurrentPage(1);
                      }}
                      options={ARCHIVED_RECORD_TYPES.map((t) => ({ value: t, label: t }))}
                      placeholder="All Record Types"
                    />
                    <FormDateInput
                      value={archiveDate}
                      onChange={(e) => {
                        setArchiveDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      aria-label="Archive date"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFiltersOpen((v) => !v)}
                        className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: filtersOpen ? '#00B4D8' : '#0D2630',
                          border: `1px solid ${filtersOpen ? '#00B4D8' : 'rgba(0,100,130,0.2)'}`,
                        }}
                      >
                        <Filter style={{ width: 15, height: 15 }} />
                        Filters
                      </button>
                      <button
                        type="button"
                        onClick={handleExport}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        <Download style={{ width: 15, height: 15 }} />
                        Export
                      </button>
                    </div>
                  </div>

                  {filtersOpen && (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <FormSelect
                        id="archived-status-filter"
                        value={status}
                        onChange={(v) => {
                          setStatus(v);
                          setCurrentPage(1);
                        }}
                        options={ARCHIVE_STATUSES.map((s) => ({ value: s, label: s }))}
                        placeholder="All Status"
                      />
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="flex h-11 items-center justify-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                        style={{ fontSize: 14, color: '#00B4D8' }}
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}

                  <div className="mt-4 overflow-x-auto scroll-smooth">
                    <div className="min-w-[1080px]">
                      <div
                        className="flex rounded-t-[8px]"
                        style={{
                          background: 'rgba(226,237,241,0.4)',
                          borderBottom: '1px solid #E6F8FD',
                        }}
                      >
                        <div className="min-w-[180px] flex-1 py-2.5 pr-2 pl-3">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Patient
                          </span>
                        </div>
                        <div className="w-32 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            MRN
                          </span>
                        </div>
                        <div className="w-36 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Record Type
                          </span>
                        </div>
                        <div className="w-44 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Department
                          </span>
                        </div>
                        <div className="w-36 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Archive Date
                          </span>
                        </div>
                        <div className="w-44 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Reason
                          </span>
                        </div>
                        <div className="w-32 shrink-0 py-2.5 pr-2">
                          <span
                            className="font-sans font-bold tracking-wider uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            Status
                          </span>
                        </div>
                        <div className="w-24 shrink-0 py-2.5 pr-3 text-right">
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
                            <Archive style={{ width: 24, height: 24, color: '#8A98A3' }} />
                          </div>
                          <p
                            className="font-sans font-medium"
                            style={{ fontSize: 16, color: '#4A7080' }}
                          >
                            No archived records match your filters
                          </p>
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="mt-1 font-sans font-medium transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                            style={{ fontSize: 14, color: '#00B4D8' }}
                          >
                            Clear all filters
                          </button>
                        </div>
                      )}

                      {pageRows.map((rec) => {
                        const statusCfg = STATUS_CFG[rec.status];
                        const typeCfg = RECORD_TYPE_CFG[rec.recordType];
                        return (
                          <div
                            key={rec.id}
                            onClick={() => setSelectedId(rec.id)}
                            className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                            style={{
                              borderBottom: '1px solid rgba(0,100,130,0.08)',
                              background: selectedId === rec.id ? '#E6F8FD' : 'transparent',
                            }}
                          >
                            <div className="flex min-w-[180px] flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                              <div
                                className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                                style={{ background: rec.avatarBg }}
                              >
                                {rec.initials}
                              </div>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {rec.patientName}
                              </p>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                                {rec.mrn}
                              </p>
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
                                {rec.recordType}
                              </span>
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {rec.department}
                              </p>
                            </div>
                            <div className="w-36 shrink-0 py-3 pr-2">
                              <p style={{ fontSize: 14, color: '#4A7080' }}>
                                {formatHumanDate(rec.archiveDate)}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                                {formatTime(rec.archiveDate)}
                              </p>
                            </div>
                            <div className="w-44 shrink-0 py-3 pr-2">
                              <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                                {rec.reason}
                              </p>
                            </div>
                            <div className="w-32 shrink-0 py-3 pr-2">
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
                                {rec.status}
                              </span>
                            </div>
                            <div
                              className="flex w-24 shrink-0 items-center justify-end gap-1 py-3 pr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedId(rec.id)}
                                aria-label={`View ${rec.patientName}`}
                                className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  toast.info(
                                    'More actions',
                                    `Additional actions for ${rec.patientName}.`,
                                  )
                                }
                                aria-label={`More actions for ${rec.patientName}`}
                                className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                              >
                                <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
                              </button>
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
                        archived records
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
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                          .reduce<(number | 'ellipsis')[]>((acc, p) => {
                            if (acc.length > 0 && typeof acc[acc.length - 1] === 'number') {
                              const prev = acc[acc.length - 1] as number;
                              if (p - prev > 1) acc.push('ellipsis');
                            }
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, i) =>
                            p === 'ellipsis' ? (
                              <span
                                key={`e-${i}`}
                                style={{ fontSize: 14, color: '#8A98A3' }}
                                className="px-1"
                              >
                                …
                              </span>
                            ) : (
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
                            ),
                          )}
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

              {/* ── Detail pane ───────────────────────────────────────────── */}
              {selected && (
                <div
                  className="flex w-full shrink-0 flex-col overflow-hidden xl:w-[380px]"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.12)',
                    borderRadius: 12,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p
                          className="font-display font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          {selected.patientName}
                        </p>
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
                      </div>
                      <p style={{ fontSize: 14, color: '#00B4D8' }}>{selected.mrn}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      aria-label="Close"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                    >
                      <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                    <div className="flex flex-col gap-3">
                      {[
                        ['Record Type', selected.recordType],
                        ['Department', selected.department],
                        ['Archive Date', formatHumanDateTime(selected.archiveDate)],
                        ['Reason', selected.reason],
                        ['Archived By', selected.archivedBy],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                          <span
                            className="text-right font-sans font-medium"
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
                        Audit Trail
                      </p>
                      <div className="mt-3 flex flex-col gap-3">
                        {selected.auditTrail.map((entry, i) => (
                          <div key={i}>
                            <p style={{ fontSize: 14, color: '#8A98A3' }}>
                              {formatHumanDateTime(entry.dateTime)}
                            </p>
                            <p style={{ fontSize: 14, color: '#0D2630' }}>
                              {entry.label} by {entry.actor}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <PermissionGate permission={PERMISSIONS.PATIENTS_WRITE}>
                    {selected.status !== 'Restored' && (
                      <div className="p-4 pt-0 sm:p-5 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRetrieve(selected.id)}
                          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                          style={{ fontSize: 14, background: '#00B4D8' }}
                        >
                          <ArchiveRestore style={{ width: 15, height: 15 }} />
                          Retrieve Record
                        </button>
                      </div>
                    )}
                  </PermissionGate>
                </div>
              )}
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>
    </div>
  );
}
