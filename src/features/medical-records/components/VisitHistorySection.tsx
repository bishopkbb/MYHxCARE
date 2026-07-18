'use client';

import { Eye, Filter, MoreVertical } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ExportMenu } from '@/components/ExportMenu';
import { FormDateInput } from '@components/shared/FormDateInput';
import { FormSelect } from '@components/shared/FormSelect';
import { useToast } from '@/hooks/useToast';
import { formatHumanDate, formatTime } from '@/utils/datetime';
import { downloadCSV, downloadPDF, escapeHtml } from '@/utils/export';
import type { PatientVisit } from '@/features/medical-records/__mocks__/medicalRecordDetailFixtures';
import { Pill, SimpleTableCard, toDateInputValue } from './MedicalRecordView';

const VISIT_STATUS_COLOR: Record<string, string> = {
  Completed: '#22C55E',
  Reviewed: '#00B4D8',
  Scheduled: '#00B4D8',
  Cancelled: '#8A98A3',
};

export function computeVisitSummary(visits: PatientVisit[]) {
  const sorted = [...visits].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(),
  );
  return {
    totalVisits: visits.length,
    lastVisit: sorted[sorted.length - 1]?.dateTime,
    firstVisit: sorted[0]?.dateTime,
    uniqueDepartments: new Set(visits.map((v) => v.department)).size,
    emergencyVisits: visits.filter((v) => v.department === 'Emergency Department').length,
    hospitalizations: 0,
  };
}

function exportVisitRows(visits: PatientVisit[]) {
  return [
    ['Visit Date', 'Department', 'Attending Doctor', 'Visit Type', 'Diagnosis Summary', 'Status'],
    ...visits.map((v) => [
      formatHumanDate(v.dateTime),
      v.department,
      v.doctor,
      v.visitType,
      v.diagnosisSummary,
      v.status,
    ]),
  ];
}

export function VisitHistorySection({
  visits,
  patientName,
}: {
  visits: PatientVisit[];
  patientName: string;
}) {
  const toast = useToast();

  const departmentOptions = useMemo(
    () => Array.from(new Set(visits.map((v) => v.department))).map((d) => ({ value: d, label: d })),
    [visits],
  );
  const visitTypeOptions = useMemo(
    () => Array.from(new Set(visits.map((v) => v.visitType))).map((t) => ({ value: t, label: t })),
    [visits],
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(visits.map((v) => v.status))).map((s) => ({ value: s, label: s })),
    [visits],
  );

  const earliestVisit = useMemo(
    () =>
      visits.reduce(
        (min, v) => (new Date(v.dateTime) < new Date(min) ? v.dateTime : min),
        visits[0]?.dateTime ?? new Date().toISOString(),
      ),
    [visits],
  );

  const [dateFrom, setDateFrom] = useState(() => toDateInputValue(new Date(earliestVisit)));
  const [dateTo, setDateTo] = useState(() => toDateInputValue(new Date()));
  const [department, setDepartment] = useState('');
  const [visitType, setVisitType] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    return visits
      .filter((v) => {
        const d = new Date(v.dateTime);
        if (dateFrom && d < new Date(`${dateFrom}T00:00:00`)) return false;
        if (dateTo && d > new Date(`${dateTo}T23:59:59`)) return false;
        if (department && v.department !== department) return false;
        if (visitType && v.visitType !== visitType) return false;
        if (status && v.status !== status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [visits, dateFrom, dateTo, department, visitType, status]);

  function applyFilters() {
    toast.success(
      'Filters applied',
      `${filtered.length} visit${filtered.length !== 1 ? 's' : ''} match your filters.`,
    );
  }

  function exportCSV() {
    downloadCSV('visit-history', exportVisitRows(filtered));
    toast.success('Export ready', `${filtered.length} visits downloaded as CSV.`);
  }

  function exportPDF() {
    const rows = exportVisitRows(filtered);
    const body = `
      <h1>Visit History</h1>
      <p class="meta">${escapeHtml(patientName)} · ${filtered.length} visits</p>
      <table>
        <thead><tr>${rows[0]?.map((h) => `<th>${escapeHtml(h)}</th>`).join('') ?? ''}</tr></thead>
        <tbody>
          ${rows
            .slice(1)
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
            .join('')}
        </tbody>
      </table>
    `;
    downloadPDF('visit-history', body);
    toast.success('Export ready', `${filtered.length} visits downloaded as PDF.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-[12px] p-4 sm:p-5"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Date Range
            </label>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <FormDateInput
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="From date"
                />
              </div>
              <span className="shrink-0" style={{ fontSize: 14, color: '#8A98A3' }}>
                –
              </span>
              <div className="min-w-0 flex-1">
                <FormDateInput
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="To date"
                />
              </div>
            </div>
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Department
            </label>
            <FormSelect
              id="visit-history-department"
              value={department}
              onChange={setDepartment}
              options={departmentOptions}
              placeholder="All Departments"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Visit Type
            </label>
            <FormSelect
              id="visit-history-type"
              value={visitType}
              onChange={setVisitType}
              options={visitTypeOptions}
              placeholder="All Types"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              Status
            </label>
            <FormSelect
              id="visit-history-status"
              value={status}
              onChange={setStatus}
              options={statusOptions}
              placeholder="All Status"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={applyFilters}
            className="flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            style={{ fontSize: 14, color: '#00B4D8', border: '1px solid #00B4D8' }}
          >
            <Filter style={{ width: 15, height: 15 }} />
            Filter
          </button>
          <ExportMenu variant="button" onExportPDF={exportPDF} onExportCSV={exportCSV} />
        </div>
      </div>

      <SimpleTableCard
        title="Visit History"
        emptyMessage="No visits match your filters"
        columns={[
          { label: 'Visit Date', width: 'w-28' },
          { label: 'Department', width: 'w-40' },
          { label: 'Attending Doctor', width: 'w-44' },
          { label: 'Visit Type', width: 'w-32' },
          { label: 'Diagnosis Summary', width: 'flex-1' },
          { label: 'Status', width: 'w-28' },
          { label: 'Actions', width: 'w-20' },
        ]}
        rows={filtered.map((v) => [
          <p key="date" style={{ fontSize: 14, color: '#0D2630' }}>
            {formatHumanDate(v.dateTime)} {formatTime(v.dateTime)}
          </p>,
          <p key="dept" className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {v.department}
          </p>,
          <div key="doc" className="min-w-0">
            <p
              className="truncate font-sans font-medium"
              style={{ fontSize: 14, color: '#0D2630' }}
            >
              {v.doctor}
            </p>
            <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
              {v.credentials}
            </p>
          </div>,
          <p key="type" className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {v.visitType}
          </p>,
          <p key="diagnosis" className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
            {v.diagnosisSummary}
          </p>,
          <Pill key="status" label={v.status} color={VISIT_STATUS_COLOR[v.status] ?? '#8A98A3'} />,
          <div key="actions" className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toast.info('Visit details', `Opening ${v.diagnosisSummary}.`)}
              aria-label={`View visit on ${formatHumanDate(v.dateTime)}`}
              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            >
              <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
            </button>
            <button
              type="button"
              onClick={() =>
                toast.success(
                  'Download started',
                  `Visit summary for ${formatHumanDate(v.dateTime)} is downloading.`,
                )
              }
              aria-label={`Download visit summary for ${formatHumanDate(v.dateTime)}`}
              className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
            >
              <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
            </button>
          </div>,
        ])}
      />
    </div>
  );
}
