import {
  Activity,
  Archive,
  ArrowLeftRight,
  BarChart2,
  BedDouble,
  BedSingle,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  LayoutList,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileCheck2,
  Files,
  FileText,
  FlaskConical,
  History,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Package,
  PieChart,
  Pill,
  Receipt,
  Settings,
  Share2,
  Shield,
  Siren,
  Stethoscope,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { PERMISSIONS } from '@/constants/permissions';
import { resolveWorkspace } from '@/types/auth.types';
import type { WorkspaceId, WorkspaceRole } from '@/types/auth.types';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  iconSrc?: string;
  badge?: number;
  /** Item only renders for users holding this permission. Omit to show to everyone in the workspace. */
  permission?: string;
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
    homeRoute: '/medical-records/dashboard',
    sections: [
      {
        label: 'MAIN',
        items: [{ label: 'Dashboard', href: '/medical-records/dashboard', icon: LayoutDashboard }],
      },
      {
        label: 'MEDICAL RECORDS',
        items: [
          { label: 'Medical Records', href: '/medical-records', icon: FileText },
          { label: 'Visit History', href: '/medical-records/visit-history', icon: History },
          { label: 'Clinical Documents', href: '/medical-records/clinical-documents', icon: Files },
          { label: 'Document Upload', href: '/medical-records/document-upload', icon: Upload },
          { label: 'Archived Records', href: '/medical-records/archived', icon: Archive },
          { label: 'Record Requests', href: '/medical-records/requests', icon: ClipboardList },
        ],
      },
      {
        label: 'SCHEDULE & WORKFORCE',
        items: [
          {
            label: 'Workforce Management',
            href: '/medical-records/workforce-management',
            icon: CalendarDays,
            permission: PERMISSIONS.DUTY_ROSTER_WRITE,
          },
        ],
      },
      {
        label: 'REPORTS',
        items: [
          { label: 'Medical Records Reports', href: '/medical-records/reports', icon: BarChart2 },
          {
            label: 'Patient Statistics',
            href: '/medical-records/patient-statistics',
            icon: PieChart,
          },
        ],
      },
      {
        label: 'COMMUNICATION',
        items: [
          { label: 'Messages', href: '/medical-records/messages', icon: MessageSquare, badge: 3 },
          {
            label: 'Notifications',
            href: '/medical-records/notifications',
            icon: Bell,
            badge: 8,
          },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { label: 'Profile', href: '/medical-records/account/profile', icon: User },
          { label: 'Settings', href: '/medical-records/account/settings', icon: Settings },
        ],
      },
    ],
  },

  registration: {
    workspaceLabel: 'Patient Registration',
    homeRoute: '/registration',
    sections: [
      {
        label: 'MAIN',
        items: [{ label: 'Dashboard', href: '/registration', icon: LayoutDashboard }],
      },
      {
        label: 'PATIENT MANAGEMENT',
        items: [
          { label: 'Register Patient', href: '/registration/register', icon: UserPlus },
          { label: 'Patient Directory', href: '/registration/directory', icon: Users },
          { label: 'Patient Profile', href: '/registration/profile', icon: User },
          { label: 'Check-In', href: '/registration/check-in', icon: UserCheck },
          {
            label: 'Appointment Scheduling',
            href: '/registration/appointments',
            icon: CalendarDays,
          },
          { label: 'Emergency Registration', href: '/registration/emergency', icon: Siren },
        ],
      },
      {
        label: 'OPERATIONS',
        items: [
          { label: 'Insurance Verification', href: '/registration/insurance', icon: Shield },
          { label: 'Referral Management', href: '/registration/referrals', icon: Share2 },
          { label: 'Consent Forms', href: '/registration/consent-forms', icon: FileCheck2 },
          { label: 'Patient Card Printing', href: '/registration/card-printing', icon: CreditCard },
        ],
      },
      {
        label: 'SCHEDULE & WORKFORCE',
        items: [
          {
            label: 'Workforce Management',
            href: '/registration/workforce-management',
            icon: CalendarDays,
            permission: PERMISSIONS.DUTY_ROSTER_WRITE,
          },
        ],
      },
      {
        label: 'REPORTS',
        items: [
          { label: 'Registration Reports', href: '/registration/reports', icon: TrendingUp },
          { label: 'Daily Attendance', href: '/registration/attendance', icon: CalendarCheck },
        ],
      },
      {
        label: 'COMMUNICATION',
        items: [
          { label: 'Messages', href: '/registration/messages', icon: MessageSquare, badge: 3 },
          {
            label: 'Notifications',
            href: '/registration/notifications',
            icon: Bell,
            badge: 8,
          },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { label: 'Profile', href: '/registration/account/profile', icon: User },
          { label: 'Settings', href: '/registration/account/settings', icon: Settings },
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
            badge: 26,
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
            href: '/medical-records',
            icon: FileText,
            iconSrc: '/icons/medical%20records.png',
          },
          {
            label: 'Clinical Notes',
            href: '/clinical-notes',
            icon: NotebookPen,
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
            icon: ClipboardCheck,
            iconSrc: '/icons/laboratory%20results.png',
            badge: 1,
          },
          {
            label: 'Referrals',
            href: '/referrals',
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
            href: '/appointments',
            icon: CalendarDays,
            iconSrc: '/icons/appointments.png',
          },
          {
            label: 'My Schedule',
            href: '/my-schedule',
            icon: LayoutList,
          },
          {
            label: 'Workforce Management',
            href: '/duty-roster',
            icon: CalendarClock,
            iconSrc: '/icons/workforce%20management.png',
          },
          {
            label: 'Clinical Timeline',
            href: '/clinical-timeline',
            icon: History,
            iconSrc: '/icons/clinical%20timeline.png',
          },
        ],
      },
      {
        label: 'COMMUNICATION',
        items: [
          {
            label: 'Messages',
            href: '/messages',
            icon: MessageSquare,
            iconSrc: '/icons/messages.png',
            badge: 3,
          },
          {
            label: 'Reports',
            href: '/reports',
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
            href: '/profile',
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
    workspaceLabel: 'Nurse Workspace',
    homeRoute: '/nurse',
    sections: [
      {
        label: 'DASHBOARD',
        items: [{ label: 'Dashboard', href: '/nurse', icon: LayoutDashboard }],
      },
      {
        label: 'PATIENT CARE',
        items: [
          {
            label: 'Patient Queue',
            href: '/nurse/patient-queue',
            icon: ListOrdered,
            permission: PERMISSIONS.ENCOUNTERS_READ,
          },
          {
            label: 'My Patients',
            href: '/nurse/my-patients',
            icon: Users,
            permission: PERMISSIONS.ENCOUNTERS_READ,
          },
          {
            label: 'Vital Signs',
            href: '/nurse/vital-signs',
            icon: Activity,
            permission: PERMISSIONS.ENCOUNTERS_READ,
          },
          {
            label: 'Nursing Assessment',
            href: '/nurse/nursing-assessment',
            icon: ClipboardList,
            permission: PERMISSIONS.ENCOUNTERS_READ,
          },
          {
            label: 'Medication Administration (MAR)',
            href: '/nurse/medication-administration',
            icon: Pill,
            permission: PERMISSIONS.ENCOUNTERS_READ,
          },
          {
            label: 'Nursing Notes',
            href: '/nurse/nursing-notes',
            icon: NotebookPen,
            permission: PERMISSIONS.ENCOUNTERS_READ,
          },
          {
            label: 'Care Plans',
            href: '/nurse/care-plans',
            icon: ClipboardCheck,
            permission: PERMISSIONS.ENCOUNTERS_READ,
          },
        ],
      },
      {
        label: 'WARD MANAGEMENT',
        items: [
          { label: 'Ward Census', href: '/nurse/ward-census', icon: PieChart },
          { label: 'Bed Management', href: '/wards', icon: BedDouble },
          { label: 'Admissions', href: '/nurse/admissions', icon: BedSingle },
          { label: 'Discharges', href: '/nurse/discharges', icon: LogOut },
          { label: 'Observation Charts', href: '/nurse/observation-charts', icon: FileText },
        ],
      },
      {
        label: 'CLINICAL SERVICES',
        items: [
          { label: 'Laboratory Requests', href: '/lab/orders', icon: FlaskConical },
          { label: 'Laboratory Results', href: '/lab/results', icon: FileCheck2 },
          { label: 'Clinical Timeline', href: '/clinical-timeline', icon: History },
        ],
      },
      {
        label: 'SCHEDULE & WORKFORCE',
        items: [
          {
            label: 'Workforce Management',
            href: '/nurse/workforce-management',
            icon: CalendarDays,
            permission: PERMISSIONS.DUTY_ROSTER_WRITE,
          },
          { label: 'My Schedule', href: '/my-schedule', icon: LayoutList },
          { label: 'Shift Handover', href: '/nurse/shift-handover', icon: ArrowLeftRight },
        ],
      },
      {
        label: 'COMMUNICATION',
        items: [
          { label: 'Messages', href: '/nurse/messages', icon: MessageSquare, badge: 5 },
          { label: 'Notifications', href: '/nurse/notifications', icon: Bell, badge: 8 },
          { label: 'Announcements', href: '/nurse/announcements', icon: Megaphone },
        ],
      },
      {
        label: 'REPORTS',
        items: [{ label: 'Nursing Reports', href: '/nurse/reports', icon: BarChart2 }],
      },
      {
        label: 'ACCOUNT',
        items: [
          { label: 'Profile', href: '/nurse/account/profile', icon: User },
          { label: 'Settings', href: '/nurse/account/settings', icon: Settings },
        ],
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
      {
        label: 'COMMUNICATION',
        items: [
          { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 3 },
          { label: 'Notifications', href: '/notifications', icon: Bell, badge: 8 },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { label: 'Profile', href: '/profile', icon: User },
          { label: 'Settings', href: '/settings', icon: Settings },
        ],
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
      {
        label: 'COMMUNICATION',
        items: [
          { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 3 },
          { label: 'Notifications', href: '/notifications', icon: Bell, badge: 8 },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { label: 'Profile', href: '/profile', icon: User },
          { label: 'Settings', href: '/settings', icon: Settings },
        ],
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
      {
        label: 'COMMUNICATION',
        items: [
          { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 3 },
          { label: 'Notifications', href: '/notifications', icon: Bell, badge: 8 },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { label: 'Profile', href: '/profile', icon: User },
          { label: 'Settings', href: '/settings', icon: Settings },
        ],
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
      {
        label: 'COMMUNICATION',
        items: [
          { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 3 },
          { label: 'Notifications', href: '/notifications', icon: Bell, badge: 8 },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { label: 'Profile', href: '/profile', icon: User },
          { label: 'Settings', href: '/settings', icon: Settings },
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
      {
        label: 'COMMUNICATION',
        items: [
          { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 3 },
          { label: 'Notifications', href: '/notifications', icon: Bell, badge: 8 },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { label: 'Profile', href: '/profile', icon: User },
          { label: 'Settings', href: '/settings', icon: Settings },
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
      {
        label: 'COMMUNICATION',
        items: [
          { label: 'Messages', href: '/messages', icon: MessageSquare, badge: 3 },
          { label: 'Notifications', href: '/notifications', icon: Bell, badge: 8 },
        ],
      },
      {
        label: 'ACCOUNT',
        items: [
          { label: 'Profile', href: '/profile', icon: User },
          { label: 'Settings', href: '/settings', icon: Settings },
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

// ─── Workspace nav item lookup ─────────────────────────────────────────────
// Used by chrome outside the sidebar (e.g. the topbar's bell/avatar buttons)
// that needs to send the user to the SAME route their own sidebar links to,
// rather than a route hardcoded to one workspace (historically clinical's).

export function findWorkspaceRoute(workspaceId: WorkspaceId, label: string): string | undefined {
  for (const section of WORKSPACE_NAV[workspaceId].sections) {
    const item = section.items.find((i) => i.label === label);
    if (item) return item.href;
  }
  return undefined;
}

// ─── Universal bottom nav (every workspace) ────────────────────────────────

export const UNIVERSAL_BOTTOM_NAV: NavItem[] = [
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Settings', href: '/settings', icon: Settings },
];
