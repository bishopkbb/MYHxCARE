'use client';

import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { ORGANIZATIONAL_DEPARTMENTS } from '@/constants/organizationalDepartments';
import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';
import {
  ROLE_OPTIONS,
  nextStaffId,
  type StaffMember,
  type StaffRole,
} from '@/features/administration/__mocks__/staffDirectoryFixtures';
import {
  importStaffBatch,
  useStaffDirectory,
} from '@/features/administration/store/staffDirectoryStore';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const AVATAR_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#22C55E', '#00B4D8', '#EC4899'];
const ROLE_VALUES = new Set(ROLE_OPTIONS.map((r) => r.value));

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

/** Parses the rows of a CSV file into new staff members. Expected header:
 * Full Name, Email, Phone, Department, Role. Rows missing required fields,
 * or with a department/role outside the known set, are skipped. */
function parseCsv(text: string): Omit<StaffMember, 'staffId'>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const dataLines = lines[0]?.toLowerCase().includes('full name') ? lines.slice(1) : lines;

  const results: Omit<StaffMember, 'staffId'>[] = [];
  for (const line of dataLines) {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const [fullName, email, phone, department, role] = cols;
    if (!fullName || !email) continue;
    if (!ORGANIZATIONAL_DEPARTMENTS.includes(department as OrganizationalDepartment)) continue;
    if (!ROLE_VALUES.has(role as StaffRole)) continue;
    results.push({
      fullName,
      initials: initialsOf(fullName),
      avatarBg: AVATAR_COLORS[results.length % AVATAR_COLORS.length]!,
      title: role as StaffRole,
      department: department as OrganizationalDepartment,
      role: role as StaffRole,
      email,
      phone: phone || '',
      status: 'Active',
      lastLogin: null,
      newThisMonth: true,
    });
  }
  return results;
}

/** Bulk-imports staff from a CSV file, lazy-loaded (checklist §14). Rows
 * that don't parse (missing required columns, or an unrecognised department
 * / role) are silently skipped and reported in the result count, matching
 * how a real import pipeline would report partial success. */
export function ImportStaffModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (created: StaffMember[]) => void;
  onClose: () => void;
}) {
  const roster = useStaffDirectory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  function pickFile(fileList: FileList | null) {
    const picked = fileList?.[0];
    if (!picked) return;
    if (!picked.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a .csv file.');
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError('No valid rows found in this file. Check the column headers and try again.');
        setImporting(false);
        return;
      }
      const base = Number(nextStaffId(roster).replace('STF-', ''));
      const created: StaffMember[] = parsed.map((p, i) => ({
        ...p,
        staffId: `STF-${String(base + i).padStart(4, '0')}`,
      }));
      const result = importStaffBatch(created);
      onSubmit(result);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 48px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Import Staff
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
              Bulk-add staff accounts from a CSV file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => pickFile(e.target.files)}
          />
          {!file ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                pickFile(e.dataTransfer.files);
              }}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-[12px] py-12 text-center transition-colors duration-150 ${FOCUS_RING}`}
              style={{
                border: `2px dashed ${isDragging ? '#00B4D8' : 'rgba(0,100,130,0.25)'}`,
                background: isDragging ? '#E6F8FD' : '#F5FBFD',
              }}
            >
              <Upload style={{ width: 32, height: 32, color: '#00B4D8' }} />
              <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                Drag and drop a CSV file here
              </p>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>or</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                Choose File
              </button>
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                Columns: Full Name, Email, Phone, Department, Role
              </p>
            </div>
          ) : (
            <div
              className="flex items-center gap-3 rounded-[12px] p-4"
              style={{ background: '#F5FBFD', border: '1px solid rgba(0,100,130,0.15)' }}
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(0,180,216,0.1)' }}
              >
                <FileSpreadsheet style={{ width: 20, height: 20, color: '#00B4D8' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {file.name}
                </p>
                <p style={{ fontSize: 14, color: '#8A98A3' }}>{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Remove file"
                className={`flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[rgba(239,68,68,0.08)] ${FOCUS_RING}`}
              >
                <X style={{ width: 16, height: 16, color: '#DC2626' }} />
              </button>
            </div>
          )}
          {error && (
            <p className="mt-3" style={{ fontSize: 14, color: '#DC2626' }}>
              {error}
            </p>
          )}
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || importing}
            className={`flex h-11 items-center rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
