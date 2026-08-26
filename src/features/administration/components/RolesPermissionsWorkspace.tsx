'use client';

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  Lock,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import { PreferenceToggle } from '@components/shared/PreferenceToggle';
import { FormSelect } from '@components/shared/FormSelect';
import { FormField } from '@components/shared/FormField';
import { FormInput } from '@components/shared/FormInput';
import { StatCard } from '@components/shared/StatCard';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { ORGANIZATIONAL_DEPARTMENTS } from '@/constants/organizationalDepartments';
import { useToast } from '@/hooks/useToast';
import { downloadCSV } from '@/utils/export';
import { formatDateTime } from '@/utils/datetime';
import {
  ACCESS_LEVELS,
  ACCESS_LEVEL_DESCRIPTION,
  MODULE_DEFS,
  computeRoleStats,
  hasAnyAccess,
  type RoleDefinition,
  type RoleStatus,
} from '@/features/administration/__mocks__/rolePermissionsFixtures';
import {
  setRoleStatus,
  toggleDepartmentAccess,
  toggleRolePermission,
  updateRole,
  useRoleDefinitions,
} from '@/features/administration/store/rolePermissionsStore';
import {
  updateStaff,
  useStaffDirectory,
} from '@/features/administration/store/staffDirectoryStore';
import type { StaffMember } from '@/features/administration/__mocks__/staffDirectoryFixtures';

const AddRoleModal = dynamic(() => import('./AddRoleModal').then((m) => m.AddRoleModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});
const PermissionSettingsModal = dynamic(
  () => import('./PermissionSettingsModal').then((m) => m.PermissionSettingsModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type TabKey = 'assign' | 'matrix' | 'departments' | 'module-access' | 'details';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'assign', label: 'Select Personnel' },
  { key: 'matrix', label: 'Permission Matrix' },
  { key: 'departments', label: 'Department Access' },
  { key: 'module-access', label: 'Module Access' },
  { key: 'details', label: 'Role Details' },
];

const STATUS_OPTIONS: { value: RoleStatus; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

function StatusPill({ status }: { status: RoleStatus }) {
  const active = status === 'Active';
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-sans font-medium whitespace-nowrap"
      style={{
        fontSize: 14,
        color: active ? '#16A34A' : '#D97706',
        border: `1px solid ${active ? 'rgba(22,163,74,0.35)' : 'rgba(217,119,6,0.35)'}`,
        background: active ? 'rgba(22,163,74,0.08)' : 'rgba(217,119,6,0.08)',
      }}
    >
      {status}
    </span>
  );
}

function WizardNav({
  activeTab,
  onNavigate,
}: {
  activeTab: TabKey;
  onNavigate: (tab: TabKey) => void;
}) {
  const index = TABS.findIndex((t) => t.key === activeTab);
  const prev = index > 0 ? TABS[index - 1] : undefined;
  const next = index < TABS.length - 1 ? TABS[index + 1] : undefined;

  return (
    <div
      className="flex items-center justify-between gap-3 p-4 sm:px-5"
      style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
    >
      <button
        type="button"
        onClick={() => prev && onNavigate(prev.key)}
        disabled={!prev}
        className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
        style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
      >
        <ArrowLeft style={{ width: 15, height: 15 }} />
        Back
      </button>
      {next ? (
        <button
          type="button"
          onClick={() => onNavigate(next.key)}
          className={`flex h-10 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
          style={{ fontSize: 14, background: '#00B4D8' }}
        >
          Next: {next.label}
          <ArrowRight style={{ width: 15, height: 15 }} />
        </button>
      ) : (
        <span
          className="flex items-center gap-1.5 font-sans font-medium"
          style={{ fontSize: 14, color: '#16A34A' }}
        >
          <CheckCircle2 style={{ width: 16, height: 16 }} />
          All steps complete
        </span>
      )}
    </div>
  );
}

export function RolesPermissionsWorkspace() {
  const router = useRouter();
  const toast = useToast();

  const roles = useRoleDefinitions();
  const staffRoster = useStaffDirectory();
  const stats = computeRoleStats(roles);

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(TABS[0]!.key);

  function selectRole(id: string) {
    setSelectedRoleId(id);
    setActiveTab(TABS[0]!.key);
  }
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [showCustomOnly, setShowCustomOnly] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const visibleRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roles.filter((r) => {
      if (!showInactive && r.status === 'Inactive') return false;
      if (showActiveOnly && r.status !== 'Active') return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [roles, search, showInactive, showActiveOnly]);

  const selectedRole = selectedRoleId ? roles.find((r) => r.id === selectedRoleId) : undefined;

  const staffCountFor = (roleName: string) =>
    staffRoster.filter((s) => s.role === roleName || s.title === roleName).length;

  const visibleModules = useMemo(() => {
    let mods = MODULE_DEFS;
    if (moduleFilter !== 'ALL') mods = mods.filter((m) => m.key === moduleFilter);
    if (showCustomOnly && selectedRole) {
      mods = mods.filter((m) => selectedRole.customizedModules.includes(m.key));
    }
    return mods;
  }, [moduleFilter, showCustomOnly, selectedRole]);

  const moduleFilterOptions = [
    { value: 'ALL', label: 'All Modules' },
    ...MODULE_DEFS.map((m) => ({ value: m.key, label: m.label })),
  ];

  function handleExportMatrix() {
    if (!selectedRole) return;
    const rows = [
      ['Module', 'Access Levels'],
      ...MODULE_DEFS.map((m) => [
        m.label,
        selectedRole.permissionsByModule[m.key]
          .map((level) => ACCESS_LEVELS.find((a) => a.value === level)?.label ?? level)
          .join('; '),
      ]),
    ];
    downloadCSV(`role-permissions-${selectedRole.id}`, rows);
    toast.success('Export ready', `${selectedRole.name}'s permission matrix exported as CSV.`);
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
              Roles & Permissions
            </span>
          </div>

          {/* Header */}
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Roles & Permissions
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Manage roles and control access permissions across modules and departments.
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
                Permission Settings
              </button>
              <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
                <button
                  type="button"
                  onClick={() => setAddRoleOpen(true)}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  + Add Role
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5 xl:gap-4">
            <StatCard
              icon={Users}
              label="Total Roles"
              value={stats.total}
              info="Active roles in system"
              accent="#2563EB"
              iconBg="rgba(37,99,235,0.1)"
            />
            <StatCard
              icon={ShieldCheck}
              label="Active Roles"
              value={stats.active}
              info="Enabled and in use"
              accent="#16A34A"
              iconBg="rgba(22,163,74,0.1)"
            />
            <StatCard
              icon={Users}
              label="Role Assignments"
              value={staffRoster.length}
              info="Staff with assigned roles"
              accent="#7C3AED"
              iconBg="rgba(124,58,237,0.1)"
              onClick={() => router.push(ROUTES.adminStaffAccounts)}
            />
            <StatCard
              icon={Lock}
              label="Custom Permissions"
              value={stats.custom}
              info="Custom rules configured"
              accent="#D97706"
              iconBg="rgba(217,119,6,0.1)"
            />
            <StatCard
              icon={Building2}
              label="Department Access"
              value={stats.departmentCount}
              info="Departments configured"
              accent="#00B4D8"
              iconBg="rgba(0,180,216,0.1)"
              onClick={() => router.push(ROUTES.adminDepartments)}
            />
          </div>

          {/* Role List + tabbed detail */}
          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
            {/* Role List */}
            <div
              className="flex w-full shrink-0 flex-col overflow-hidden xl:w-[280px]"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(0,100,130,0.12)',
                borderRadius: 12,
              }}
            >
              <div className="p-4">
                <p
                  className="font-display font-semibold"
                  style={{ fontSize: 16, color: '#0D2630' }}
                >
                  Role List
                </p>
                <div className="relative mt-3">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                    style={{ width: 15, height: 15, color: '#8A98A3' }}
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search roles..."
                    className={`h-10 w-full rounded-[10px] pr-3 pl-9 font-sans outline-none focus:ring-2 focus:ring-[#00B4D8]/40 ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      border: '1px solid rgba(0,100,130,0.18)',
                      color: '#0D2630',
                    }}
                  />
                </div>
              </div>
              <div className="flex max-h-[560px] flex-col overflow-y-auto scroll-smooth px-2 pb-2">
                {visibleRoles.length === 0 ? (
                  <p className="px-2 py-6 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
                    No roles match your search.
                  </p>
                ) : (
                  visibleRoles.map((r) => {
                    const isSelected = r.id === selectedRoleId;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => selectRole(r.id)}
                        className={`mb-1 flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          background: isSelected ? '#E6F8FD' : 'transparent',
                          border: isSelected ? '1px solid #00B4D8' : '1px solid transparent',
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Shield
                            style={{
                              width: 18,
                              height: 18,
                              color: isSelected ? '#00B4D8' : '#8A98A3',
                              flexShrink: 0,
                            }}
                          />
                          <div className="min-w-0">
                            <Tooltip content={r.name}>
                              <p
                                className="truncate font-sans font-medium"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {r.name}
                              </p>
                            </Tooltip>
                            <Tooltip content={r.description}>
                              <p className="truncate" style={{ fontSize: 14, color: '#8A98A3' }}>
                                {r.description}
                              </p>
                            </Tooltip>
                          </div>
                        </div>
                        <StatusPill status={r.status} />
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-3" style={{ borderTop: '1px solid rgba(0,100,130,0.08)' }}>
                <button
                  type="button"
                  onClick={() => setShowInactive((v) => !v)}
                  className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                  style={{
                    fontSize: 14,
                    color: '#00B4D8',
                    border: '1px solid rgba(0,180,216,0.35)',
                  }}
                >
                  <Eye style={{ width: 15, height: 15 }} />
                  {showInactive ? 'Hide Inactive Roles' : 'View Inactive Roles'}
                </button>
              </div>
            </div>

            {/* Tabbed detail */}
            <div
              className="min-w-0 flex-1 rounded-[12px]"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {!selectedRole ? (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(226,237,241,0.6)' }}
                  >
                    <Shield style={{ width: 28, height: 28, color: '#8A98A3' }} />
                  </div>
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Select a role to get started
                  </p>
                  <p style={{ fontSize: 14, color: '#4A7080' }}>
                    Choose a role from the list on the left to assign personnel and configure its
                    permissions.
                  </p>
                </div>
              ) : (
                <>
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
                    {activeTab === 'assign' && <AssignRoleTab role={selectedRole} />}
                    {activeTab === 'matrix' && (
                      <PermissionMatrixTab
                        role={selectedRole}
                        modules={visibleModules}
                        moduleFilter={moduleFilter}
                        moduleFilterOptions={moduleFilterOptions}
                        onModuleFilterChange={setModuleFilter}
                        showActiveOnly={showActiveOnly}
                        onShowActiveOnlyChange={setShowActiveOnly}
                        showCustomOnly={showCustomOnly}
                        onShowCustomOnlyChange={setShowCustomOnly}
                        onExport={handleExportMatrix}
                      />
                    )}
                    {activeTab === 'departments' && <DepartmentAccessTab role={selectedRole} />}
                    {activeTab === 'module-access' && <ModuleAccessTab role={selectedRole} />}
                    {activeTab === 'details' && (
                      <RoleDetailsTab
                        role={selectedRole}
                        staffCount={staffCountFor(selectedRole.name)}
                      />
                    )}
                  </div>

                  <WizardNav activeTab={activeTab} onNavigate={setActiveTab} />
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {addRoleOpen && (
        <AddRoleModal
          onClose={() => setAddRoleOpen(false)}
          onSubmit={(role) => {
            setAddRoleOpen(false);
            selectRole(role.id);
            toast.success('Role added', `${role.name} has been added.`);
          }}
        />
      )}

      {settingsOpen && <PermissionSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

// ── Permission Matrix tab ───────────────────────────────────────────────

function PermissionMatrixTab({
  role,
  modules,
  moduleFilter,
  moduleFilterOptions,
  onModuleFilterChange,
  showActiveOnly,
  onShowActiveOnlyChange,
  showCustomOnly,
  onShowCustomOnlyChange,
  onExport,
}: {
  role: RoleDefinition;
  modules: typeof MODULE_DEFS;
  moduleFilter: string;
  moduleFilterOptions: { value: string; label: string }[];
  onModuleFilterChange: (v: string) => void;
  showActiveOnly: boolean;
  onShowActiveOnlyChange: (v: boolean) => void;
  showCustomOnly: boolean;
  onShowCustomOnlyChange: (v: boolean) => void;
  onExport: () => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#4A7080' }}>
        Check every access level {role.name} should have per module (View and Write can combine).
        Checking No Access clears the rest for that row, since it can&apos;t coexist with any real
        access.
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-[220px]">
          <p className="mb-1.5 font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Module View
          </p>
          <FormSelect
            id="module-view-filter"
            value={moduleFilter}
            onChange={onModuleFilterChange}
            options={moduleFilterOptions}
            placeholder="All Modules"
          />
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <p className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
            Filter Permissions
          </p>
          <label className="flex items-center gap-2">
            <PreferenceToggle
              on={showActiveOnly}
              onToggle={() => onShowActiveOnlyChange(!showActiveOnly)}
              ariaLabel="Show active roles only"
            />
            <span style={{ fontSize: 14, color: '#4A7080' }}>Show Active Only</span>
          </label>
          <label className="flex items-center gap-2">
            <PreferenceToggle
              on={showCustomOnly}
              onToggle={() => onShowCustomOnlyChange(!showCustomOnly)}
              ariaLabel="Show custom permissions only"
            />
            <span style={{ fontSize: 14, color: '#4A7080' }}>Show Custom Only</span>
          </label>
          <button
            type="button"
            onClick={onExport}
            className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            <Download style={{ width: 15, height: 15 }} />
            Export Matrix
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto scroll-smooth">
        <div style={{ minWidth: 760 }}>
          <div
            className="flex items-center rounded-t-[8px]"
            style={{ background: '#EEF5F7', borderBottom: '1px solid #E6F8FD' }}
          >
            <div className="min-w-[180px] flex-1 py-2.5 pr-2 pl-3 text-left">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Module
              </span>
            </div>
            {ACCESS_LEVELS.map((level) => (
              <div key={level.value} className="w-32 shrink-0 py-2.5 pr-2 pl-3 text-center">
                <span
                  className="font-sans font-bold tracking-wider whitespace-nowrap uppercase"
                  style={{ fontSize: 14, color: '#4A7080' }}
                >
                  {level.label}
                </span>
              </div>
            ))}
            <div className="w-28 shrink-0 py-2.5 pr-3 pl-3 text-center">
              <span
                className="font-sans font-bold tracking-wider uppercase"
                style={{ fontSize: 14, color: '#4A7080' }}
              >
                Status
              </span>
            </div>
          </div>
          {modules.length === 0 ? (
            <p className="px-3 py-8 text-center" style={{ fontSize: 14, color: '#8A98A3' }}>
              No modules match this filter.
            </p>
          ) : (
            modules.map((m) => {
              const current = role.permissionsByModule[m.key];
              const isCustom = role.customizedModules.includes(m.key);
              return (
                <div
                  key={m.key}
                  className="flex items-center"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.08)' }}
                >
                  <div className="flex min-w-[180px] flex-1 items-center gap-2.5 py-3 pr-2 pl-3">
                    <m.icon style={{ width: 17, height: 17, color: '#4A7080', flexShrink: 0 }} />
                    <span
                      className="font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      {m.label}
                    </span>
                  </div>
                  {ACCESS_LEVELS.map((level) => (
                    <div
                      key={level.value}
                      className="flex w-32 shrink-0 justify-center py-3 pr-2 pl-3"
                    >
                      <input
                        type="checkbox"
                        checked={current.includes(level.value)}
                        onChange={() => toggleRolePermission(role.id, m.key, level.value)}
                        aria-label={`${m.label}: ${level.label}`}
                        className="size-4 cursor-pointer rounded"
                        style={{ accentColor: level.color }}
                      />
                    </div>
                  ))}
                  <div className="flex w-28 shrink-0 items-center justify-center gap-1.5 py-3 pr-3 pl-3">
                    <StatusPill status={role.status} />
                    {isCustom && (
                      <Tooltip content="Customized from default">
                        <Lock style={{ width: 13, height: 13, color: '#D97706' }} />
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[10px] p-3.5"
        style={{ background: '#F5FBFD' }}
      >
        {ACCESS_LEVELS.map((level) => (
          <div key={level.value} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: level.color }} />
            <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
              {level.label}
            </span>
            <span style={{ fontSize: 14, color: '#8A98A3' }}>
              {ACCESS_LEVEL_DESCRIPTION[level.value]}
            </span>
          </div>
        ))}
      </div>

      <div
        className="mt-3 flex items-start gap-2.5 rounded-[10px] p-3.5"
        style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}
      >
        <ShieldCheck style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0 }} />
        <div>
          <p className="font-sans font-semibold" style={{ fontSize: 14, color: '#0D2630' }}>
            About Permissions
          </p>
          <p style={{ fontSize: 14, color: '#4A7080' }}>
            Permissions control what users can see and do within each module. Changes apply
            immediately to this role&apos;s configuration.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Assign Role tab ─────────────────────────────────────────────────────

function AssignRoleTab({ role }: { role: RoleDefinition }) {
  const toast = useToast();
  const staffRoster = useStaffDirectory();
  const [search, setSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staffRoster.slice(0, 8);
    return staffRoster
      .filter((s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [staffRoster, search]);

  const selectedStaff = staffRoster.find((s) => s.staffId === selectedStaffId);

  function handleAssign() {
    if (!selectedStaff) return;
    const updated: StaffMember = { ...selectedStaff, role: role.name as StaffMember['role'] };
    updateStaff(updated);
    toast.success(
      'Role assigned',
      `${selectedStaff.fullName} has been assigned the ${role.name} role.`,
    );
    setSelectedStaffId(null);
    setSearch('');
  }

  return (
    <div>
      <p style={{ fontSize: 14, color: '#4A7080' }}>
        Search for a staff member and assign them the{' '}
        <strong style={{ color: '#0D2630' }}>{role.name}</strong> role. This updates their role in
        Staff Management immediately.
      </p>
      <div className="relative mt-4 max-w-[420px]">
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
                  <p style={{ fontSize: 14, color: '#8A98A3' }}>
                    Current role: {s.role} · {s.department}
                  </p>
                </div>
                {isSelected && <CheckCircle2 style={{ width: 18, height: 18, color: '#00B4D8' }} />}
              </button>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={handleAssign}
        disabled={!selectedStaff}
        className={`mt-4 flex h-11 items-center gap-1.5 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
        style={{ fontSize: 14, background: '#00B4D8' }}
      >
        Assign {role.name}
      </button>
    </div>
  );
}

// ── Department Access tab ───────────────────────────────────────────────

function DepartmentAccessTab({ role }: { role: RoleDefinition }) {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#4A7080' }}>
        Departments this role can access. Changes apply immediately.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {ORGANIZATIONAL_DEPARTMENTS.map((dept) => {
          const hasAccess = role.departmentAccess.includes(dept);
          return (
            <div
              key={dept}
              className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-2.5">
                <Building2 style={{ width: 17, height: 17, color: '#4A7080' }} />
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {dept}
                </span>
              </div>
              <PreferenceToggle
                on={hasAccess}
                onToggle={() => toggleDepartmentAccess(role.id, dept)}
                ariaLabel={`Toggle ${role.name} access to ${dept}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Module Access tab (read-only summary) ───────────────────────────────

function ModuleAccessTab({ role }: { role: RoleDefinition }) {
  return (
    <div>
      <p style={{ fontSize: 14, color: '#4A7080' }}>
        Summary of module access derived from the Permission Matrix.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {MODULE_DEFS.map((m) => {
          const levels = role.permissionsByModule[m.key];
          const hasAccess = hasAnyAccess(levels);
          const labels = levels
            .map((l) => ACCESS_LEVELS.find((a) => a.value === l)?.label ?? l)
            .join(', ');
          return (
            <div
              key={m.key}
              className="flex items-center justify-between gap-3 rounded-[10px] p-3.5"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div className="flex items-center gap-2.5">
                <m.icon style={{ width: 17, height: 17, color: '#4A7080' }} />
                <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
                  {m.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14, color: '#8A98A3' }}>{labels}</span>
                {hasAccess ? (
                  <CheckCircle2 style={{ width: 18, height: 18, color: '#16A34A' }} />
                ) : (
                  <XCircle style={{ width: 18, height: 18, color: '#8A98A3' }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Role Details tab ─────────────────────────────────────────────────────

function RoleDetailsTab({ role, staffCount }: { role: RoleDefinition; staffCount: number }) {
  const toast = useToast();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [status, setStatus] = useState<RoleStatus>(role.status);

  function handleSave() {
    updateRole({
      ...role,
      name: name.trim() || role.name,
      description: description.trim(),
      status,
    });
    setRoleStatus(role.id, status);
    toast.success('Role updated', `${name.trim() || role.name}'s details have been saved.`);
  }

  return (
    <div className="flex max-w-[480px] flex-col gap-4">
      <FormField label="Role Name" htmlFor="role-name">
        <FormInput id="role-name" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Description" htmlFor="role-description">
        <FormInput
          id="role-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormField>
      <FormField label="Status" htmlFor="role-status">
        <FormSelect
          id="role-status"
          value={status}
          onChange={(v) => setStatus(v as RoleStatus)}
          options={STATUS_OPTIONS}
          placeholder="Select status"
        />
      </FormField>
      <div className="flex items-center justify-between gap-2">
        <span style={{ fontSize: 14, color: '#8A98A3' }}>Assigned Staff</span>
        <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {staffCount}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span style={{ fontSize: 14, color: '#8A98A3' }}>Last Updated</span>
        <span className="font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
          {formatDateTime(new Date())}
        </span>
      </div>
      <PermissionGate permission={PERMISSIONS.ADMIN_WRITE}>
        <button
          type="button"
          onClick={handleSave}
          className={`flex h-11 w-fit items-center gap-1.5 rounded-[10px] px-5 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
          style={{ fontSize: 14, background: '#00B4D8' }}
        >
          Save Changes
        </button>
      </PermissionGate>
    </div>
  );
}
