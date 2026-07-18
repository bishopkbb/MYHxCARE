'use client';

import { Eye, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  DIRECTORY_PATIENTS,
  type DirectoryPatient,
} from '@/features/registration/__mocks__/patientDirectoryFixtures';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

export function PatientPicker({ onSelect }: { onSelect: (patient: DirectoryPatient) => void }) {
  const [search, setSearch] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DIRECTORY_PATIENTS;
    return DIRECTORY_PATIENTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.studentId.toLowerCase().includes(q),
    );
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pagePatients = filtered.slice(pageStart, pageStart + rowsPerPage);

  return (
    <div
      className="rounded-[12px] bg-white p-4 sm:p-5"
      style={{ border: '1px solid rgba(0,100,130,0.12)' }}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          style={{ width: 16, height: 16, color: '#8A98A3' }}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by Name, MRN or Student ID..."
          className="h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
          style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
        />
      </div>

      <div className="mt-3 overflow-x-auto scroll-smooth">
        <div className="min-w-[720px]">
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
            <div className="w-40 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Faculty/Dept
              </span>
            </div>
            <div className="w-24 shrink-0 py-2.5 pr-2">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Status
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

          {pagePatients.map((p) => (
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
                    {p.name}
                  </p>
                  <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                    {p.phone}
                  </p>
                </div>
              </div>
              <div className="w-32 shrink-0 py-3 pr-2">
                <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                  {p.mrn}
                </p>
              </div>
              <div className="w-40 shrink-0 py-3 pr-2">
                <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                  {p.faculty}
                </p>
              </div>
              <div className="w-24 shrink-0 py-3 pr-2">
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium"
                  style={{
                    fontSize: 14,
                    color: '#4A7080',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  {p.status}
                </span>
              </div>
              <div
                className="flex w-20 shrink-0 items-center justify-end py-3 pr-3"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  aria-label={`View visit history for ${p.name}`}
                  className="flex size-8 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none"
                >
                  <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Showing {pageStart + 1} to {Math.min(pageStart + rowsPerPage, filtered.length)} of{' '}
            {filtered.length} patients
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
                  <span key={`e-${i}`} style={{ fontSize: 14, color: '#8A98A3' }} className="px-1">
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
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-9 rounded-[8px] px-2 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40"
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
