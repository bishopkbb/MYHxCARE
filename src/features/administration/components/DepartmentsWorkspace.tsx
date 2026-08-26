'use client';

import {
  Building2,
  CheckCircle2,
  Download,
  Eye,
  Mail,
  MoreVertical,
  Pause,
  Phone,
  Search,
  Settings,
  Users,
  UserCog,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { Pagination } from '@components/shared/Pagination';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PreferenceToggle } from '@components/shared/PreferenceToggle';
import { RowMenuPortal } from '@components/shared/RowMenuPortal';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { FilterDropdown, type FilterDef } from '@components/shared/FilterDropdown';
import { FormSelect } from '@components/shared/FormSelect';
import { FormInput } from '@components/shared/FormInput';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { downloadCSV } from '@/utils/export';
import {
  ALL_DEPARTMENTS,
  STATUS_OPTIONS,
  computeDepartmentStats,
  formatOperatingHours,
  staffCountFor,
  type DepartmentRecord,
  type DepartmentStatus,
  type OperatingHours,
} from '@/features/administration/__mocks__/departmentsFixtures';
import {
  setDepartmentHead,
  updateDepartmentHours,
  useDepartments,
} from '@/features/administration/store/departmentsStore';
import {
  updateStaff,
  useStaffDirectory,
} from '@/features/administration/store/staffDirectoryStore';
import type { StaffMember } from '@/features/administration/__mocks__/staffDirectoryFixtures';
import type { OrganizationalDepartment } from '@/constants/organizationalDepartments';

const EditDepartmentModal = dynamic(
  () => import('./EditDepartmentModal').then((m) => m.EditDepartmentModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const AddDepartmentInfoModal = dynamic(
  () => import('./AddDepartmentInfoModal').then((m) => m.AddDepartmentInfoModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);
const DepartmentSettingsModal = dynamic(
  () => import('./DepartmentSettingsModal').then((m) => m.DepartmentSettingsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';
const ROWS_PER_PAGE = 10;

type TabKey = 'list' | 'heads' | 'assignment' | 'hours' | 'contacts';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'list', label: 'Department List' },
  { key: 'heads', label: 'Department Heads' },
  { key: 'assignment', label: 'Staff Assignment' },
  { key: 'hours', label: 'Operating Hours' },
  { key: 'contacts', label: 'Department Contacts' },
];

const STATUS_CFG: Record<DepartmentStatus, { color: string; dot: string }> = {
  Operational: { color: '#16A34A', dot: '#22C55E' },
  Busy: { color: '#D97706', dot: '#F59E0B' },
  Inactive: { color: '#DC2626', dot: '#EF4444' },
};

function StatusBadge({ status }: { status: DepartmentStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize: 14, color: cfg.color }}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: cfg.dot }} />
      {status}
    </span>
  );
}

function headOf(dept: DepartmentRecord, staffRoster: StaffMember[]): StaffMember | undefined {
  return staffRoster.find((s) => s.staffId === dept.headStaffId);
}

export function DepartmentsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const departments = useDepartments();
  const staffRoster = useStaffDirectory();
  const stats = computeDepartmentStats(departments, staffRoster);

  const [activeTab, setActiveTab] = useState<TabKey>('list');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [openFilter, setOpenFilter] = useState<'status' | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ROWS_PER_PAGE);
  const [editDept, setEditDept] = useState<DepartmentRecord | null>(null);
  const [addInfoOpen, setAddInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assignmentPreset, setAssignmentPreset] = useState<OrganizationalDepartment | null>(null);

  const FILTER_DEFS: { key: 'status'; def: FilterDef }[] = [
    { key: 'status', def: { key: 'status', defaultLabel: 'All Status', options: STATUS_OPTIONS } },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return departments.filter((d) => {
      if (status !== 'ALL' && d.status !== status) return false;
      if (q && !d.id.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [departments, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  function handleExport() {
    const rows = [
      [
        'Department',
        'Head',
        'Contact Phone',
        'Contact Email',
        'Staff',
        'Status',
        'Operating Hours',
      ],
      ...filtered.map((d) => {
        const head = headOf(d, staffRoster);
        return [
          d.id,
          head?.fullName ?? 'Unassigned',
          d.contactPhone,
          d.contactEmail,
          String(staffCountFor(d.id, staffRoster)),
          d.status,
          formatOperatingHours(d.operatingHours),
        ];
      }),
    ];
    downloadCSV('departments', rows);
    toast.success(
      'Export ready',
      `${filtered.length} department${filtered.length !== 1 ? 's' : ''} exported as CSV.`,
    );
  }

  function handleExportOne(d: DepartmentRecord) {
    const head = headOf(d, staffRoster);
    const rows = [
      ['Field', 'Value'],
      ['Department', d.id],
      ['Description', d.description],
      ['Head', head?.fullName ?? 'Unassigned'],
      ['Contact Phone', d.contactPhone],
      ['Contact Email', d.contactEmail],
      ['Staff', String(staffCountFor(d.id, staffRoster))],
      ['Status', d.status],
      ['Operating Hours', formatOperatingHours(d.operatingHours)],
    ];
    downloadCSV(`department-${d.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, rows);
    toast.success('Export ready', `${d.id} exported as CSV.`);
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
              Departments
            </span>
          </div>

          {/* Header */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Departments
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage departments and organizational structure of the medical centre.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <Settings style={{ width: 15, height: 15 }} />
                Department Settings
              </button>
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <button
                  type="button"
                  onClick={() => setAddInfoOpen(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  + Add Department
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            <StatCard
              icon={Building2}
              label="Total Departments"
              value={stats.total}
              info="Active departments"
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={UserCog}
              label="Department Heads"
              value={stats.headsAssigned}
              info="Assigned heads"
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
              onClick={() => setActiveTab('heads')}
            />
            <StatCard
              icon={Users}
              label="Total Staff"
              value={stats.totalStaff}
              info="Across all departments"
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
              onClick={() => router.push(ROUTES.adminStaffAccounts)}
            />
            <StatCard
              icon={CheckCircle2}
              label="Operational Departments"
              value={stats.operational}
              info="Active & operational"
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
            />
            <StatCard
              icon={Pause}
              label="Inactive Departments"
              value={stats.inactive}
              info="Temporarily inactive"
              accent="#DC2626"
              iconBg="rgba(220,38,38,0.1)"
            />
          </div>

          {/* Tabs */}
          <div
            className="mt-5 rounded-[12px]"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="overflow-x-auto scroll-smooth px-4 pt-3 sm:px-5">
              <div
                className="flex gap-1"
                style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 px-3.5 py-2.5 font-sans font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: activeTab === tab.key ? '#00B4D8' : '#4A7080',
                      borderBottom:
                        activeTab === tab.key ? '2px solid #00B4D8' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {activeTab === 'list' && (
                <>
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
                        placeholder="Search departments..."
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
                        value={status}
                        isOpen={openFilter === key}
                        onToggle={() => setOpenFilter(openFilter === key ? null : key)}
                        onSelect={(v) => {
                          setStatus(v);
                          setPage(1);
                          setOpenFilter(null);
                        }}
                      />
                    ))}
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

                  <div className="mt-4">
                    {pageRows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                        <div
                          className="flex size-14 items-center justify-center rounded-full"
                          style={{ background: 'rgba(226,237,241,0.6)' }}
                        >
                          <Building2 style={{ width: 28, height: 28, color: '#8A98A3' }} />
                        </div>
                        <p
                          className="font-sans font-semibold"
                          style={{ fontSize: 16, color: '#0D2630' }}
                        >
                          No departments match these filters
                        </p>
                        <p style={{ fontSize: 14, color: '#4A7080' }}>
                          Try widening your search or clearing filters.
                        </p>
                      </div>
                    ) : (
                      <ScrollableTable minWidth={1240} maxHeight={640}>
                        <div
                          className={`flex items-center rounded-t-[8px] ${TABLE_HEADER_STICKY_CLASS}`}
                          style={{ background: TABLE_HEADER_BG, borderBottom: '1px solid #E6F8FD' }}
                        >
                          {[
                            ['Department', 'min-w-[180px] flex-1 max-w-[220px]', 'text-left'],
                            ['Department Head', 'w-56', 'text-left'],
                            ['Contact', 'w-52', 'text-left'],
                            ['Staff', 'w-20', 'text-center'],
                            ['Status', 'w-28', 'text-center'],
                            ['Operating Hours', 'w-56', 'text-left'],
                          ].map(([label, width, align]) => (
                            <div
                              key={label}
                              className={`${width} shrink-0 py-2.5 pr-2 pl-3 ${align}`}
                            >
                              <span
                                className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                                style={{ fontSize: 14, color: '#4A7080' }}
                              >
                                {label}
                              </span>
                            </div>
                          ))}
                          <div className="w-32 shrink-0 py-2.5 pr-3 pl-3 text-center">
                            <span
                              className="font-sans font-bold tracking-wider uppercase"
                              style={{ fontSize: 14, color: '#4A7080' }}
                            >
                              Actions
                            </span>
                          </div>
                        </div>
                        {pageRows.map((d) => {
                          const head = headOf(d, staffRoster);
                          const count = staffCountFor(d.id, staffRoster);
                          return (
                            <DepartmentRow
                              key={d.id}
                              department={d}
                              head={head}
                              staffCount={count}
                              onEdit={() => setEditDept(d)}
                              onAssignStaff={() => {
                                setAssignmentPreset(d.id);
                                setActiveTab('assignment');
                              }}
                              onViewHours={() => setActiveTab('hours')}
                              onExport={() => handleExportOne(d)}
                            />
                          );
                        })}
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
                        itemLabel="departments"
                        pageSizeOptions={[10, 25, 50]}
                      />
                    )}
                  </div>
                </>
              )}

              {activeTab === 'heads' && (
                <DepartmentHeadsTab departments={departments} staffRoster={staffRoster} />
              )}
              {activeTab === 'assignment' && <StaffAssignmentTab preset={assignmentPreset} />}
              {activeTab === 'hours' && <OperatingHoursTab departments={departments} />}
              {activeTab === 'contacts' && (
                <DepartmentContactsTab
                  departments={departments}
                  staffRoster={staffRoster}
                  onEdit={(d) => setEditDept(d)}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {editDept && (
        <EditDepartmentModal
          department={editDept}
          onClose={() => setEditDept(null)}
          onSaved={() => {
            setEditDept(null);
            toast.success('Department updated', `${editDept.id}'s details have been saved.`);
          }}
        />
      )}

      {addInfoOpen && <AddDepartmentInfoModal onClose={() => setAddInfoOpen(false)} />}
      {settingsOpen && <DepartmentSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

// ── Department List row ─────────────────────────────────────────────────

function DepartmentRow({
  department,
  head,
  staffCount,
  onEdit,
  onAssignStaff,
  onViewHours,
  onExport,
}: {
  department: DepartmentRecord;
  head: StaffMember | undefined;
  staffCount: number;
  onEdit: () => void;
  onAssignStaff: () => void;
  onViewHours: () => void;
  onExport: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="flex items-center transition-colors duration-100 hover:bg-[#F5FBFD]"
      style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
    >
      <div className="max-w-[220px] min-w-[180px] flex-1 py-3 pr-2 pl-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: 'rgba(0,180,216,0.1)' }}
          >
            <department.icon style={{ width: 18, height: 18, color: '#00B4D8' }} />
          </div>
          <div className="min-w-0">
            <Tooltip content={department.id}>
              <p
                className="truncate font-sans font-medium"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {department.id}
              </p>
            </Tooltip>
            <Tooltip content={department.description}>
              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                {department.description}
              </p>
            </Tooltip>
          </div>
        </div>
      </div>
      <div className="w-56 shrink-0 py-3 pr-2 pl-3">
        {head ? (
          <div className="flex items-center gap-2">
            <div
              className="flex size-7 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
              style={{ background: head.avatarBg, fontSize: 14 }}
            >
              {head.initials}
            </div>
            <div className="min-w-0">
              <Tooltip content={head.fullName}>
                <p
                  className="truncate font-sans font-medium"
                  style={{ fontSize: 14, color: '#0D2630' }}
                >
                  {head.fullName}
                </p>
              </Tooltip>
              <Tooltip content={head.title}>
                <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                  {head.title}
                </p>
              </Tooltip>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: '#8A98A3' }}>Unassigned</p>
        )}
      </div>
      <div className="w-52 shrink-0 py-3 pr-2 pl-3">
        <div className="flex items-center gap-1.5">
          <Phone style={{ width: 13, height: 13, color: '#8A98A3', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: '#4A7080' }}>{department.contactPhone}</p>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <Mail style={{ width: 13, height: 13, color: '#8A98A3', flexShrink: 0 }} />
          <Tooltip content={department.contactEmail}>
            <p className="truncate" style={{ fontSize: 14, color: '#4A7080' }}>
              {department.contactEmail}
            </p>
          </Tooltip>
        </div>
      </div>
      <div className="w-20 shrink-0 py-3 pr-2 pl-3 text-center">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {staffCount}
        </p>
        <p style={{ fontSize: 14, color: '#8A98A3' }}>Staff</p>
      </div>
      <div className="w-28 shrink-0 py-3 pr-2 pl-3 text-center">
        <StatusBadge status={department.status} />
      </div>
      <div className="w-56 shrink-0 py-3 pr-2 pl-3">
        <p style={{ fontSize: 14, color: '#4A7080' }}>
          {formatOperatingHours(department.operatingHours)}
        </p>
      </div>
      <div className="flex w-32 shrink-0 items-center justify-center gap-1 py-3 pr-3 pl-3">
        <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${department.id}`}
            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
          >
            <UserCog style={{ width: 15, height: 15, color: '#4A7080' }} />
          </button>
        </PermissionGate>
        <button
          type="button"
          onClick={onAssignStaff}
          aria-label={`Assign staff to ${department.id}`}
          className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
        >
          <Users style={{ width: 15, height: 15, color: '#4A7080' }} />
        </button>
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`More actions for ${department.id}`}
            className={`flex size-9 items-center justify-center rounded-[8px] transition-colors duration-150 hover:bg-[#E6F8FD] ${FOCUS_RING}`}
          >
            <MoreVertical style={{ width: 15, height: 15, color: '#4A7080' }} />
          </button>
          <RowMenuPortal
            open={menuOpen}
            anchorRef={buttonRef}
            onClose={() => setMenuOpen(false)}
            width={200}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onViewHours();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              View Operating Hours
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onExport();
              }}
              className="flex w-full items-center px-4 py-2.5 text-left font-sans transition-colors duration-150 hover:bg-[#E6F8FD]"
              style={{ fontSize: 14, color: '#2F3A40' }}
            >
              Export Department
            </button>
          </RowMenuPortal>
        </div>
      </div>
    </div>
  );
}

// ── Department Heads tab ────────────────────────────────────────────────

function DepartmentHeadsTab({
  departments,
  staffRoster,
}: {
  departments: DepartmentRecord[];
  staffRoster: StaffMember[];
}) {
  const toast = useToast();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {departments.map((d) => {
        const head = headOf(d, staffRoster);
        const deptStaff = staffRoster.filter((s) => s.department === d.id);
        return (
          <div
            key={d.id}
            className="flex flex-col gap-3 rounded-[12px] p-4"
            style={{ border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(0,180,216,0.1)' }}
              >
                <d.icon style={{ width: 18, height: 18, color: '#00B4D8' }} />
              </div>
              <p
                className="min-w-0 truncate font-sans font-semibold"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {d.id}
              </p>
            </div>
            {head ? (
              <div className="flex items-center gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                  style={{ background: head.avatarBg, fontSize: 15 }}
                >
                  {head.initials}
                </div>
                <div className="min-w-0">
                  <Tooltip content={head.fullName}>
                    <p
                      className="truncate font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {head.fullName}
                    </p>
                  </Tooltip>
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>{head.title}</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#8A98A3' }}>No head assigned</p>
            )}
            <FormSelect
              id={`head-select-${d.id}`}
              value={d.headStaffId}
              onChange={(staffId) => {
                setDepartmentHead(d.id, staffId);
                toast.success('Head reassigned', `${d.id}'s head has been updated.`);
              }}
              options={deptStaff.map((s) => ({ value: s.staffId, label: s.fullName }))}
              placeholder="Reassign head"
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Staff Assignment tab ────────────────────────────────────────────────

function StaffAssignmentTab({ preset }: { preset: OrganizationalDepartment | null }) {
  const toast = useToast();
  const staffRoster = useStaffDirectory();
  const [search, setSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [targetDept, setTargetDept] = useState<string>(preset ?? '');

  // Render-phase state adjustment (React's own recommended pattern for
  // deriving state from a changed prop), not an effect: re-applies the
  // preset only when it actually changes, so a later manual FormSelect
  // pick isn't clobbered on every re-render.
  const [appliedPreset, setAppliedPreset] = useState(preset);
  if (preset !== appliedPreset) {
    setAppliedPreset(preset);
    if (preset) setTargetDept(preset);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staffRoster.slice(0, 8);
    return staffRoster
      .filter((s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [staffRoster, search]);

  const selectedStaff = staffRoster.find((s) => s.staffId === selectedStaffId);

  function handleMove() {
    if (!selectedStaff || !targetDept) return;
    const updated: StaffMember = {
      ...selectedStaff,
      department: targetDept as StaffMember['department'],
    };
    updateStaff(updated);
    toast.success('Staff reassigned', `${selectedStaff.fullName} has been moved to ${targetDept}.`);
    setSelectedStaffId(null);
    setSearch('');
  }

  return (
    <div>
      <p style={{ fontSize: 14, color: '#4A7080' }}>
        Search for a staff member, choose a target department, and move them. This updates their
        record in Staff Management immediately.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px] lg:items-start">
        <div>
          <div className="relative max-w-[420px]">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              style={{ width: 15, height: 15, color: '#8A98A3' }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedStaffId(null);
              }}
              placeholder="Search staff by name or email..."
              className={`h-11 w-full rounded-[10px] pr-3 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
              style={{ fontSize: 14, border: '1px solid rgba(0,100,130,0.18)', color: '#0D2630' }}
            />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {filtered.length === 0 ? (
              <p style={{ fontSize: 14, color: '#8A98A3' }}>No staff found.</p>
            ) : (
              filtered.map((s) => {
                const isSelected = s.staffId === selectedStaffId;
                return (
                  <button
                    key={s.staffId}
                    type="button"
                    onClick={() => setSelectedStaffId(s.staffId)}
                    className={`flex items-center gap-3 rounded-[10px] p-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      border: isSelected ? '1px solid #00B4D8' : '1px solid rgba(0,100,130,0.12)',
                    }}
                  >
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                      style={{ background: s.avatarBg, fontSize: 14 }}
                    >
                      {s.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-sans font-medium"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        {s.fullName}
                      </p>
                      <p style={{ fontSize: 14, color: '#8A98A3' }}>Currently in {s.department}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 style={{ width: 18, height: 18, color: '#00B4D8' }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div
          className="flex flex-col gap-3 rounded-[12px] p-4"
          style={{ border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Target Department
          </p>
          <FormSelect
            id="assignment-target-dept"
            value={targetDept}
            onChange={setTargetDept}
            options={ALL_DEPARTMENTS.map((d) => ({ value: d, label: d }))}
            placeholder="Select department"
          />
          <button
            type="button"
            onClick={handleMove}
            disabled={!selectedStaff || !targetDept}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            style={{ fontSize: 14, background: '#00B4D8' }}
          >
            Move to {targetDept || 'Department'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Operating Hours tab ─────────────────────────────────────────────────

function OperatingHoursTab({ departments }: { departments: DepartmentRecord[] }) {
  const toast = useToast();
  const [editingId, setEditingId] = useState<OrganizationalDepartment | null>(null);
  const [weekday, setWeekday] = useState('');
  const [saturday, setSaturday] = useState('');
  const [is24, setIs24] = useState(false);

  function startEdit(d: DepartmentRecord) {
    setEditingId(d.id);
    setWeekday(d.operatingHours?.weekdayRange ?? '');
    setSaturday(d.operatingHours?.saturdayRange ?? '');
    setIs24(d.operatingHours?.is24Hours ?? false);
  }

  function save(d: DepartmentRecord) {
    const hours: OperatingHours = is24
      ? { is24Hours: true, weekdayRange: null, saturdayRange: null }
      : {
          is24Hours: false,
          weekdayRange: weekday.trim() || null,
          saturdayRange: saturday.trim() || null,
        };
    updateDepartmentHours(d.id, hours);
    setEditingId(null);
    toast.success('Hours updated', `${d.id}'s operating hours have been saved.`);
  }

  return (
    <div className="flex flex-col gap-2">
      {departments.map((d) => (
        <div
          key={d.id}
          className="flex flex-col gap-3 rounded-[10px] p-3.5"
          style={{ border: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <d.icon style={{ width: 17, height: 17, color: '#4A7080' }} />
              <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                {d.id}
              </span>
            </div>
            {editingId !== d.id && (
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 14, color: '#4A7080' }}>
                  {formatOperatingHours(d.operatingHours)}
                </span>
                <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                  <button
                    type="button"
                    onClick={() => startEdit(d)}
                    className={`font-sans font-medium transition-colors duration-150 hover:underline ${FOCUS_RING}`}
                    style={{ fontSize: 14, color: '#00B4D8' }}
                  >
                    Edit
                  </button>
                </PermissionGate>
              </div>
            )}
          </div>
          {editingId === d.id && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2">
                <PreferenceToggle
                  on={is24}
                  onToggle={() => setIs24((v) => !v)}
                  ariaLabel="Open 24 hours"
                />
                <span style={{ fontSize: 14, color: '#4A7080' }}>Open 24 hours</span>
              </label>
              {!is24 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormInput
                    placeholder="Mon - Fri hours, e.g. 8:00 AM - 6:00 PM"
                    value={weekday}
                    onChange={(e) => setWeekday(e.target.value)}
                  />
                  <FormInput
                    placeholder="Sat hours (optional)"
                    value={saturday}
                    onChange={(e) => setSaturday(e.target.value)}
                  />
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => save(d)}
                  className={`flex h-9 items-center rounded-[8px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className={`flex h-9 items-center rounded-[8px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#0D2630',
                    border: '1px solid rgba(0,100,130,0.2)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Department Contacts tab (read-only directory) ───────────────────────

function DepartmentContactsTab({
  departments,
  staffRoster,
  onEdit,
}: {
  departments: DepartmentRecord[];
  staffRoster: StaffMember[];
  onEdit: (d: DepartmentRecord) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {departments.map((d) => {
        const head = headOf(d, staffRoster);
        return (
          <div
            key={d.id}
            className="flex flex-col gap-3 rounded-[12px] p-4"
            style={{ border: '1px solid rgba(0,100,130,0.12)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(0,180,216,0.1)' }}
              >
                <d.icon style={{ width: 18, height: 18, color: '#00B4D8' }} />
              </div>
              <p
                className="min-w-0 truncate font-sans font-semibold"
                style={{ fontSize: 14, color: '#0D2630' }}
              >
                {d.id}
              </p>
            </div>
            {head && (
              <p style={{ fontSize: 14, color: '#8A98A3' }}>
                Head: <span style={{ color: '#0D2630' }}>{head.fullName}</span>
              </p>
            )}
            <a
              href={`tel:${d.contactPhone.replace(/\s+/g, '')}`}
              className={`flex items-center gap-2 rounded-[8px] py-1.5 transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#4A7080' }}
            >
              <Phone style={{ width: 14, height: 14 }} />
              {d.contactPhone}
            </a>
            <a
              href={`mailto:${d.contactEmail}`}
              className={`flex min-w-0 items-center gap-2 rounded-[8px] py-1.5 transition-colors duration-150 hover:text-[#00B4D8] ${FOCUS_RING}`}
              style={{ fontSize: 14, color: '#4A7080' }}
            >
              <Mail style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span className="truncate">{d.contactEmail}</span>
            </a>
            <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
              <button
                type="button"
                onClick={() => onEdit(d)}
                className={`flex h-9 w-fit items-center gap-1.5 rounded-[8px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#00B4D8', border: '1px solid rgba(0,180,216,0.35)' }}
              >
                <Eye style={{ width: 14, height: 14 }} />
                Edit Contact
              </button>
            </PermissionGate>
          </div>
        );
      })}
    </div>
  );
}
