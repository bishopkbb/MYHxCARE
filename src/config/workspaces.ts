import {
  Activity,
  BedDouble,
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FlaskConical,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Shield,
  Siren,
  Stethoscope,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { resolveWorkspace } from '@/types/auth.types';
import type { WorkspaceId, WorkspaceRole } from '@/types/auth.types';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  label?: string;
  items: NavItem[];
};

export type WorkspaceNavConfig = {
  workspaceLabel: string;
  // Landing route after login. Update here as each Phase 6 workspace page is built.
  homeRoute: string;
  sections: NavSection[];
};

// ─── Workspace Navigation Configurations ─────────────────────────────────────
// One config per WorkspaceId. Nav items use existing routes only — new
// sub-routes are added here as each Phase 6 feature module is built.

export const WORKSPACE_NAV: Record<WorkspaceId, WorkspaceNavConfig> = {
  records: {
    workspaceLabel: 'Medical Records',
    homeRoute: '/patients',
    sections: [
      {
        items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'Patient Management',
        items: [
          { label: 'Register Patient', href: '/patients', icon: UserPlus },
          { label: 'Patient Search', href: '/patients', icon: Users },
        ],
      },
    ],
  },

  clinical: {
    workspaceLabel: 'Clinical Services',
    homeRoute: '/encounters',
    sections: [
      {
        items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'Clinical',
        items: [
          { label: 'OPD Queue', href: '/encounters', icon: ClipboardList },
          { label: 'Patients', href: '/patients', icon: Users },
          { label: 'Encounters', href: '/encounters', icon: Stethoscope },
          { label: 'Lab & Results', href: '/lab', icon: FlaskConical },
        ],
      },
      {
        label: 'Scheduling',
        items: [{ label: 'Duty Roster', href: '/duty-roster', icon: CalendarDays }],
      },
    ],
  },

  nursing: {
    workspaceLabel: 'Nursing',
    homeRoute: '/wards',
    sections: [
      {
        items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'Ward',
        items: [
          { label: 'Patients', href: '/patients', icon: Users },
          { label: 'Wards', href: '/wards', icon: BedDouble },
          { label: 'Vitals & Notes', href: '/encounters', icon: Activity },
        ],
      },
      {
        label: 'Scheduling',
        items: [{ label: 'Duty Roster', href: '/duty-roster', icon: CalendarDays }],
      },
    ],
  },

  'ward-management': {
    workspaceLabel: 'Ward Management',
    homeRoute: '/wards',
    sections: [
      {
        items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'Ward',
        items: [
          { label: 'Bed Management', href: '/wards', icon: BedDouble },
          { label: 'Patients', href: '/patients', icon: Users },
        ],
      },
      {
        label: 'Scheduling',
        items: [{ label: 'Duty Roster', href: '/duty-roster', icon: CalendarDays }],
      },
    ],
  },

  pharmacy: {
    workspaceLabel: 'Pharmacy',
    homeRoute: '/pharmacy',
    sections: [
      {
        items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'Dispensing',
        items: [
          { label: 'Dispensing Queue', href: '/pharmacy/dispense', icon: ClipboardList },
          { label: 'Drug Inventory', href: '/pharmacy/inventory', icon: Package },
        ],
      },
      {
        label: 'Scheduling',
        items: [{ label: 'Duty Roster', href: '/duty-roster', icon: CalendarDays }],
      },
    ],
  },

  laboratory: {
    workspaceLabel: 'Laboratory',
    homeRoute: '/lab',
    sections: [
      {
        items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'Laboratory',
        items: [
          { label: 'Order Worklist', href: '/lab/orders', icon: ClipboardList },
          { label: 'Sample Tracking', href: '/lab/samples', icon: FlaskConical },
          { label: 'Result Entry', href: '/lab/results', icon: FileCheck2 },
        ],
      },
      {
        label: 'Scheduling',
        items: [{ label: 'Duty Roster', href: '/duty-roster', icon: CalendarDays }],
      },
    ],
  },

  finance: {
    workspaceLabel: 'Finance',
    homeRoute: '/billing',
    sections: [
      {
        items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'Finance',
        items: [
          { label: 'Billing & Charges', href: '/billing/charges', icon: Receipt },
          { label: 'Payments', href: '/billing/payments', icon: CreditCard },
          { label: 'Revenue', href: '/billing', icon: TrendingUp },
        ],
      },
    ],
  },

  emergency: {
    workspaceLabel: 'Emergency',
    homeRoute: '/emergency',
    sections: [
      {
        items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'A&E',
        items: [
          { label: 'A&E Queue', href: '/emergency', icon: Siren },
          { label: 'Triage', href: '/emergency', icon: Shield },
          { label: 'Patients', href: '/patients', icon: Users },
        ],
      },
    ],
  },

  administration: {
    workspaceLabel: 'Administration',
    homeRoute: '/admin',
    sections: [
      {
        items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'Management',
        items: [
          { label: 'Staff & Roles', href: '/admin', icon: Users },
          { label: 'Duty Roster', href: '/duty-roster', icon: CalendarDays },
        ],
      },
    ],
  },
};

// ─── Workspace home route resolver ────────────────────────────────────────
// Used by LoginForm and any component that needs to redirect to the
// authenticated user's workspace home (e.g. after session resume).

export function getWorkspaceHomeRoute(workspaceRole: WorkspaceRole): string {
  const workspaceId = resolveWorkspace(workspaceRole);
  return WORKSPACE_NAV[workspaceId].homeRoute;
}

// ─── Universal bottom nav (every workspace) ────────────────────────────────

export const UNIVERSAL_BOTTOM_NAV: NavItem[] = [
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Collaboration', href: '/collaboration', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: Settings },
];
