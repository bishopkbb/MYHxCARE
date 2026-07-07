import {
  Activity,
  BarChart2,
  BedDouble,
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileText,
  FlaskConical,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Share2,
  Shield,
  Siren,
  Stethoscope,
  TrendingUp,
  User,
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
  iconSrc?: string;
  badge?: number;
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
    homeRoute: '/dashboard',
    sections: [
      {
        label: 'MAIN',
        items: [
          {
            label: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
            iconSrc: '/icons/dashboard.png',
          },
          {
            label: 'Patient Queue',
            href: '/encounters',
            icon: ClipboardList,
            iconSrc: '/icons/patient%20queue.png',
            badge: 6,
          },
          {
            label: 'Patients',
            href: '/patients',
            icon: Users,
            iconSrc: '/icons/patients.png',
          },
        ],
      },
      {
        label: 'CLINICAL',
        items: [
          {
            label: 'Consultation',
            href: '/encounters',
            icon: Stethoscope,
            iconSrc: '/icons/consultation.png',
          },
          {
            label: 'Medical Records',
            href: '/patients',
            icon: FileText,
            iconSrc: '/icons/medical%20records.png',
          },
          {
            label: 'Clinical Notes',
            href: '/encounters',
            icon: ClipboardList,
            iconSrc: '/icons/clinical%20notes.png',
          },
          {
            label: 'Prescriptions',
            href: '/encounters/prescriptions',
            icon: FileCheck2,
            iconSrc: '/icons/prescriptions.png',
          },
          {
            label: 'Laboratory Requests',
            href: '/lab/orders',
            icon: FlaskConical,
            iconSrc: '/icons/laboratory%20requests.png',
          },
          {
            label: 'Laboratory Results',
            href: '/lab/results',
            icon: FlaskConical,
            iconSrc: '/icons/laboratory%20results.png',
            badge: 1,
          },
          {
            label: 'Referrals',
            href: '/patients',
            icon: Share2,
            iconSrc: '/icons/referrals.png',
          },
        ],
      },
      {
        label: 'SCHEDULE',
        items: [
          {
            label: 'Appointments',
            href: '/duty-roster',
            icon: CalendarDays,
            iconSrc: '/icons/appointments.png',
          },
          {
            label: 'Workforce Management',
            href: '/duty-roster',
            icon: Users,
            iconSrc: '/icons/workforce%20management.png',
          },
          {
            label: 'Clinical Timeline',
            href: '/patients',
            icon: Activity,
            iconSrc: '/icons/clinical%20timeline.png',
          },
        ],
      },
      {
        label: 'COMMUNICATION',
        items: [
          {
            label: 'Messages',
            href: '/collaboration',
            icon: MessageSquare,
            iconSrc: '/icons/messages.png',
            badge: 3,
          },
          {
            label: 'Reports',
            href: '/notifications',
            icon: BarChart2,
            iconSrc: '/icons/reports.png',
          },
          {
            label: 'Notifications',
            href: '/notifications',
            icon: Bell,
            iconSrc: '/icons/notifications.png',
            badge: 8,
          },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          {
            label: 'Profile',
            href: '/settings',
            icon: User,
            iconSrc: '/icons/profile.png',
          },
          {
            label: 'Settings',
            href: '/settings',
            icon: Settings,
            iconSrc: '/icons/settings.png',
          },
        ],
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
