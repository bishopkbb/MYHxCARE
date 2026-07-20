'use client';

import { Eye, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Pagination } from '@components/shared/Pagination';
import {
  MY_PATIENTS_ROSTER,
  type NursePatient,
} from '@/features/nursing/__mocks__/myPatientsFixtures';

const RISK_CFG: Record<string, { color: string; border: string; bg: string }> = {
  High: { color: '#EF4444', border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.08)' },
  Medium: { color: '#F59E0B', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)' },
  Low: { color: '#22C55E', border: 'rgba(34,197,94,0.4)', bg: 'rgba(34,197,94,0.08)' },
};

export function NursePatientPicker({ onSelect }: { onSelect: (patient: NursePatient) => void }) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MY_PATIENTS_ROSTER;
    return MY_PATIENTS_ROSTER.filter(
      (p) => p.patientName.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q),
    );
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagePatients = filtered.slice(pageStart, pageStart + pageSize);

  return (
    <div
      className="rounded-[12px] bg-white p-4 sm:p-5"
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <h2 className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
        Select a Patient
      </h2>
      <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
        Choose a patient from your assigned roster to view or record vital signs.
      </p>

      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          style={{ width: 16, height: 16, color: '#8A98A3' }}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or MRN..."
          className="h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
          style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
        />
      </div>

      <div className="mt-3 overflow-x-auto scroll-smooth">
        <div className="min-w-[640px]">
          <div
            className="flex rounded-t-[8px]"
            style={{ background: 'rgba(226,237,241,0.4)', borderBottom: '1px solid #E6F8FD' }}
          >
            <div className="min-w-0 flex-1 py-2.5 pr-2 pl-3">
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
            <div className="w-32 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Ward/Bed
              </span>
            </div>
            <div className="w-24 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Risk
              </span>
            </div>
            <div className="w-20 shrink-0 py-2.5 pr-3 text-right">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                View
              </span>
            </div>
          </div>

          {pagePatients.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(226,237,241,0.6)' }}
              >
                <Users style={{ width: 24, height: 24, color: '#8A98A3' }} />
              </div>
              <p className="font-sans font-medium" style={{ fontSize: 16, color: '#4A7080' }}>
                No patients match your search
              </p>
            </div>
          )}

          {pagePatients.map((p) => {
            const riskCfg = RISK_CFG[p.riskLevel]!;
            return (
              <div
                key={p.id}
                onClick={() => onSelect(p)}
                className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-3">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold text-white"
                    style={{ background: p.avatarBg }}
                  >
                    {p.initials}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {p.patientName}
                    </p>
                    <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                      {p.age} Y / {p.gender}
                    </p>
                  </div>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2">
                  <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                    {p.mrn}
                  </p>
                </div>
                <div className="w-32 shrink-0 py-3 pr-2">
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {p.ward} · {p.bed}
                  </p>
                </div>
                <div className="w-24 shrink-0 py-3 pr-2">
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                    style={{
                      fontSize: 14,
                      color: riskCfg.color,
                      border: `1px solid ${riskCfg.border}`,
                      background: riskCfg.bg,
                    }}
                  >
                    {p.riskLevel}
                  </span>
                </div>
                <div
                  className="flex w-20 shrink-0 items-center justify-end py-3 pr-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(p)}
                    aria-label={`View vital signs for ${p.patientName}`}
                    className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                  >
                    <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length > 0 && (
        <Pagination
          page={safePage}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          itemLabel="patients"
          pageSizeOptions={[10, 25, 50]}
        />
      )}
    </div>
  );
}
