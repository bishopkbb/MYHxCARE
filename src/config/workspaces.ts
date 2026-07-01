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

import type { WorkspaceId } from '@/types/auth.types';

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
  sections: NavSection[];
};

// ─── Workspace Navigation Configurations ─────────────────────────────────────
// One config per WorkspaceId. Nav items use existing routes only — new
// sub-routes are added here as each Phase 6 feature module is built.

export const WORKSPACE_NAV: Record<WorkspaceId, WorkspaceNavConfig> = {
  records: {
    workspaceLabel: 'Medical Records',
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
    ],
  },

  nursing: {
    workspaceLabel: 'Nursing',
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
    ],
  },

  'ward-management': {
    workspaceLabel: 'Ward Management',
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
    ],
  },

  pharmacy: {
    workspaceLabel: 'Pharmacy',
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
    ],
  },

  laboratory: {
    workspaceLabel: 'Laboratory',
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
    ],
  },

  finance: {
    workspaceLabel: 'Finance',
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

// ─── Universal bottom nav (every workspace) ────────────────────────────────

export const UNIVERSAL_BOTTOM_NAV: NavItem[] = [
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Collaboration', href: '/collaboration', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: Settings },
];
