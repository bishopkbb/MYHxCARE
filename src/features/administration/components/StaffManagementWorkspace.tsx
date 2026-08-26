'use client';

import {
  Download,
  Eye,
  MoreVertical,
  Search,
  Upload,
  UserCog,
  Users,
  UserX,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { ORG_DEPARTMENT_OPTIONS } from '@/constants/organizationalDepartments';
import { useToast } from '@/hooks/useToast';
import { downloadCSV } from '@/utils/export';
import { formatDateTime } from '@/utils/datetime';
import {
  computeStaffSummary,
  ROLE_BADGE_CFG,
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  type StaffMember,
} from '@/features/administration/__mocks__/staffDirectoryFixtures';
import {
  setStaffStatus,
  useStaffDirectory,
} from '@/features/administration/store/staffDirectoryStore';

const AddEditStaffModal = dynamic(
  () => import('./AddEditStaffModal').then((m) => m.AddEditStaffModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const ImportStaffModal = dynamic(
  () => import('./ImportStaffModal').then((m) => m.ImportStaffModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

type FilterKey = 'department' | 'role' | 'status';

const STATUS_CFG: Record<StaffMember['status'], { color: string; dot: string }> = {
  Active: { color: '#16A34A', dot: '#22C55E' },
  Inactive: { color: '#DC2626', dot: '#EF4444' },
  'On Leave': { color: '#D97706', dot: '#F59E0B' },
};

function StatusBadge({ status }: { status: StaffMember['status'] }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 14, color: cfg.color }}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: cfg.dot }} />
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: StaffMember['role'] }) {
  const cfg = ROLE_BADGE_CFG[role];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{
        fontSize: 14,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
      }}
    >
      {role}
    </span>
  );
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'rgba(226,237,241,0.6)' }}
      >
        <Users style={{ width: 28, height: 28, color: '#8A98A3' }} />
      </div>
      <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
        {message}
      </p>
      <p style={{ fontSize: 14, color: '#4A7080' }}>{hint}</p>
    </div>
  );
}

function RowMenu({
  member,
  onView,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: {
  member: StaffMember;
  onView: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${member.fullName}`}
        className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
      >
        <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
      </button>
      <RowMenuPortal open={open} anchorRef={buttonRef} onClose={() => setOpen(false)} width={208}>
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
        <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            Edit Staff
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onResetPassword();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: '#2F3A40' }}
          >
            Reset Password
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onToggleStatus();
            }}
            className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
            style={{ fontSize: 14, color: member.status === 'Inactive' ? '#16A34A' : '#DC2626' }}
          >
            {member.status === 'Inactive' ? 'Reactivate' : 'Deactivate'}
          </button>
        </PermissionGate>
      </RowMenuPortal>
    </div>
  );
}

export function StaffManagementWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const roster = useStaffDirectory();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ROWS_PER_PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const summary = computeStaffSummary(roster);

  const FILTER_DEFS: { key: FilterKey; def: FilterDef }[] = [
    {
      key: 'department',
      def: { key: 'department', defaultLabel: 'All Departments', options: ORG_DEPARTMENT_OPTIONS },
    },
    {
      key: 'role',
      def: { key: 'role', defaultLabel: 'All Roles', options: ROLE_OPTIONS },
    },
    {
      key: 'status',
      def: { key: 'status', defaultLabel: 'All Status', options: STATUS_OPTIONS },
    },
  ];
  const filterValue: Record<string, string> = { department, role, status };
  const filterSetter: Record<string, (v: string) => void> = {
    department: setDepartment,
    role: setRole,
    status: setStatus,
  };

  const hasActiveFilters =
    department !== 'ALL' || role !== 'ALL' || status !== 'ALL' || search.trim() !== '';

  function resetFilters() {
    setDepartment('ALL');
    setRole('ALL');
    setStatus('ALL');
    setSearch('');
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster.filter((s) => {
      if (department !== 'ALL' && s.department !== department) return false;
      if (role !== 'ALL' && s.role !== role) return false;
      if (status !== 'ALL' && s.status !== status) return false;
      if (
        q &&
        !s.fullName.toLowerCase().includes(q) &&
        !s.email.toLowerCase().includes(q) &&
        !s.phone.includes(q) &&
        !s.staffId.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [roster, department, role, status, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const selected = selectedId ? roster.find((s) => s.staffId === selectedId) : undefined;

  function handleExport() {
    const rows = [
      ['Staff ID', 'Full Name', 'Department', 'Role', 'Email', 'Phone', 'Status', 'Last Login'],
      ...filtered.map((s) => [
        s.staffId,
        s.fullName,
        s.department,
        s.role,
        s.email,
        s.phone,
        s.status,
        s.lastLogin ? formatDateTime(s.lastLogin) : 'Never',
      ]),
    ];
    downloadCSV('staff-management', rows);
    toast.success(
      'Export ready',
      `${filtered.length} staff member${filtered.length !== 1 ? 's' : ''} exported as CSV.`,
    );
  }

  function handleToggleStatus(member: StaffMember) {
    const next = member.status === 'Inactive' ? 'Active' : 'Inactive';
    setStaffStatus(member.staffId, next);
    toast.success(
      next === 'Active' ? 'Staff reactivated' : 'Staff deactivated',
      `${member.fullName} is now ${next.toLowerCase()}.`,
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1.5" style={{ fontSize: 14 }}>
            <button
              type="button"
              onClick={() => router.push(ROUTES.admin)}
              className={`font-sans transition-opacity duration-150 hover:opacity-70 ${FOCUS_RING}`}
              style={{ color: '#4A7080' }}
            >
              Home
            </button>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span style={{ color: '#4A7080' }}>People & Access</span>
            <span style={{ color: '#8A98A3' }}>/</span>
            <span className="font-medium" style={{ color: '#0D2630' }}>
              Staff Management
            </span>
          </div>

          {/* Header */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Staff Management
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage all staff accounts, roles, departments, and access permissions.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  <Upload style={{ width: 15, height: 15 }} />
                  Import Staff
                </button>
              </PermissionGate>
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <button
                  type="button"
                  onClick={() => setAddStaffOpen(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  + Add New Staff
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            <StatCard
              icon={Users}
              label="Total Staff"
              value={summary.total}
              info="All staff members"
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={UserCog}
              label="Active Staff"
              value={summary.active}
              info={`${Math.round((summary.active / Math.max(1, summary.total)) * 1000) / 10}% of total staff`}
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
              onClick={() => {
                setStatus('Active');
                setPage(1);
              }}
            />
            <StatCard
              icon={UserX}
              label="Inactive Staff"
              value={summary.inactive}
              info={`${Math.round((summary.inactive / Math.max(1, summary.total)) * 1000) / 10}% of total staff`}
              accent="#DC2626"
              iconBg="rgba(220,38,38,0.1)"
              onClick={() => {
                setStatus('Inactive');
                setPage(1);
              }}
            />
            <StatCard
              icon={Users}
              label="On Leave"
              value={summary.onLeave}
              info={`${Math.round((summary.onLeave / Math.max(1, summary.total)) * 1000) / 10}% of total staff`}
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
              onClick={() => {
                setStatus('On Leave');
                setPage(1);
              }}
            />
            <StatCard
              icon={Users}
              label="New This Month"
              value={summary.newThisMonth}
              info={`${summary.newThisMonth} new staff added`}
              accent="#00B4D8"
              iconBg="rgba(0,180,216,0.1)"
            />
          </div>

          {/* Filters */}
          <div
            className="mt-5 rounded-[12px] p-4 sm:p-5"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[240px] flex-1">
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
                  placeholder="Search staff by name, email, phone, or staff ID..."
                  className={`h-11 w-full rounded-[10px] pr-4 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    border: '1px solid rgba(0,100,130,0.18)',
                    color: '#0D2630',
                  }}
                />
              </div>
              {FILTER_DEFS.map(({ key, def }) => (
                <FilterDropdown
                  key={key}
                  def={def}
                  value={filterValue[key]!}
                  isOpen={openFilter === key}
                  onToggle={() => setOpenFilter(openFilter === key ? null : key)}
                  onSelect={(v) => {
                    filterSetter[key]!(v);
                    setPage(1);
                    setOpenFilter(null);
                  }}
                />
              ))}
              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className={`flex h-11 items-center rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleExport}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Download style={{ width: 15, height: 15 }} />
                Export
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="min-w-0 flex-1">
                {pageRows.length === 0 ? (
                  <EmptyState
                    message="No staff match these filters"
                    hint="Try widening your search or clearing filters."
                  />
                ) : (
                  <ScrollableTable minWidth={1360} maxHeight={640}>
                    <div
                      className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                      style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                    >
                      {[
                        ['Staff ID', 'w-28', 'text-center'],
                        ['Full Name', 'min-w-[180px] flex-1 max-w-[220px]', 'text-left'],
                        ['Department', 'w-40', 'text-center'],
                        ['Role', 'w-36', 'text-center'],
                        ['Email', 'w-52', 'text-center'],
                        ['Phone', 'w-36', 'text-center'],
                        ['Status', 'w-28', 'text-center'],
                        ['Last Login', 'w-36', 'text-center'],
                      ].map(([label, width, align]) => (
                        <div key={label} className={`${width} shrink-0 py-2.5 pr-2 pl-3 ${align}`}>
                          <span
                            className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                            style={{ fontSize: 14, color: '#4A7080' }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                      <div className="w-24 shrink-0 py-2.5 pr-3 text-center">
                        <span
                          className="font-sans font-bold tracking-wider uppercase"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Actions
                        </span>
                      </div>
                    </div>
                    {pageRows.map((s) => (
                      <div
                        key={s.staffId}
                        onClick={() => setSelectedId(s.staffId)}
                        className="flex cursor-pointer items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
                        style={{
                          borderBottom: '1px solid rgba(0,100,130,0.08)',
                          background: selectedId === s.staffId ? '#E6F8FD' : 'transparent',
                        }}
                      >
                        <div className="w-28 shrink-0 py-3 pr-2 pl-3 text-center">
                          <Tooltip content={s.staffId}>
                            <p className="truncate" style={{ fontSize: 14, color: '#00B4D8' }}>
                              {s.staffId}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="max-w-[220px] min-w-0 flex-1 py-3 pr-2 pl-3 text-left">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="flex size-8 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                              style={{ background: s.avatarBg, fontSize: 14 }}
                            >
                              {s.initials}
                            </div>
                            <div className="min-w-0">
                              <Tooltip content={s.fullName}>
                                <p
                                  className="truncate font-sans font-medium"
                                  style={{ fontSize: 14, color: '#0D2630' }}
                                >
                                  {s.fullName}
                                </p>
                              </Tooltip>
                              <Tooltip content={s.title}>
                                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                  {s.title}
                                </p>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                        <div className="w-40 shrink-0 py-3 pr-2 pl-3 text-center">
                          <Tooltip content={s.department}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.department}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2 pl-3 text-center">
                          <RoleBadge role={s.role} />
                        </div>
                        <div className="w-52 shrink-0 py-3 pr-2 pl-3 text-center">
                          <Tooltip content={s.email}>
                            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                              {s.email}
                            </p>
                          </Tooltip>
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2 pl-3 text-center">
                          <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
                            {s.phone}
                          </p>
                        </div>
                        <div className="w-28 shrink-0 py-3 pr-2 pl-3 text-center">
                          <StatusBadge status={s.status} />
                        </div>
                        <div className="w-36 shrink-0 py-3 pr-2 pl-3 text-center">
                          <p style={{ fontSize: 14, color: '#4A7080' }}>
                            {s.lastLogin ? formatDateTime(s.lastLogin) : 'Never'}
                          </p>
                        </div>
                        <div
                          className="flex w-24 shrink-0 items-center justify-center gap-1 py-3 pr-3"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedId(s.staffId)}
                            aria-label={`View ${s.fullName}`}
                            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
                          >
                            <Eye style={{ width: 15, height: 15, color: '#4A7080' }} />
                          </button>
                          <RowMenu
                            member={s}
                            onView={() => setSelectedId(s.staffId)}
                            onEdit={() => setEditStaff(s)}
                            onResetPassword={() =>
                              toast.success(
                                'Password reset sent',
                                `${s.fullName} will receive a reset link.`,
                              )
                            }
                            onToggleStatus={() => handleToggleStatus(s)}
                          />
                        </div>
                      </div>
                    ))}
                  </ScrollableTable>
                )}

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
                    itemLabel="staff members"
                    pageSizeOptions={[10, 25, 50]}
                  />
                )}
              </div>

              {/* Docked Staff Details panel */}
              {selected && (
                <div
                  className="flex w-full shrink-0 flex-col overflow-hidden xl:w-[340px]"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,100,130,0.12)',
                    borderRadius: 12,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 16, color: '#0D2630' }}
                    >
                      Staff Details
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      aria-label="Close"
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    >
                      <X style={{ width: 18, height: 18, color: '#4A7080' }} />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 pb-4 sm:px-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-14 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                        style={{ background: selected.avatarBg, fontSize: 18 }}
                      >
                        {selected.initials}
                      </div>
                      <div className="min-w-0">
                        <Tooltip content={selected.fullName}>
                          <p
                            className="font-display truncate font-semibold"
                            style={{ fontSize: 16, color: '#0D2630' }}
                          >
                            {selected.fullName}
                          </p>
                        </Tooltip>
                        <p style={{ fontSize: 14, color: '#00B4D8' }}>{selected.staffId}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <RoleBadge role={selected.role} />
                      <StatusBadge status={selected.status} />
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      {[
                        ['Title', selected.title],
                        ['Department', selected.department],
                        ['Email', selected.email],
                        ['Phone', selected.phone],
                        [
                          'Last Login',
                          selected.lastLogin ? formatDateTime(selected.lastLogin) : 'Never',
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-2">
                          <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
                          <span
                            className="max-w-[180px] truncate text-right font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-4 pt-0 sm:p-5 sm:pt-0">
                    <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                      <button
                        type="button"
                        onClick={() => setEditStaff(selected)}
                        className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                        style={{ fontSize: 14, background: '#00B4D8' }}
                      >
                        Edit Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(selected)}
                        className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: selected.status === 'Inactive' ? '#16A34A' : '#DC2626',
                          border: `1px solid ${selected.status === 'Inactive' ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.35)'}`,
                        }}
                      >
                        {selected.status === 'Inactive' ? 'Reactivate' : 'Deactivate'}
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {addStaffOpen && (
        <AddEditStaffModal
          member={null}
          onClose={() => setAddStaffOpen(false)}
          onSubmit={(member) => {
            setAddStaffOpen(false);
            toast.success('Staff added', `${member.fullName} (${member.staffId}) has been added.`);
          }}
        />
      )}

      {editStaff && (
        <AddEditStaffModal
          member={editStaff}
          onClose={() => setEditStaff(null)}
          onSubmit={(member) => {
            setEditStaff(null);
            toast.success('Staff updated', `${member.fullName}'s details have been saved.`);
          }}
        />
      )}

      {importOpen && (
        <ImportStaffModal
          onClose={() => setImportOpen(false)}
          onSubmit={(members) => {
            setImportOpen(false);
            toast.success(
              'Import complete',
              `${members.length} staff member${members.length !== 1 ? 's' : ''} imported.`,
            );
          }}
        />
      )}
    </div>
  );
}
