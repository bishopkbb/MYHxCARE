import type { Metadata } from 'next';
import { ChevronRight, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { ROUTES } from '@/constants/routes';

export const metadata: Metadata = { title: 'Settings' };

const SETTINGS_SECTIONS = [
  {
    href: ROUTES.settingsSessions,
    icon: ShieldCheck,
    title: 'Active Sessions',
    description: 'View and revoke active sign-in sessions across all devices.',
  },
  {
    href: ROUTES.settingsDevices,
    icon: MonitorSmartphone,
    title: 'Trusted Devices',
    description:
      'Manage devices authorised to access your account without additional verification.',
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-foreground text-xl font-semibold tracking-tight">Settings</h1>
      <p className="text-muted-foreground mt-0.5 text-sm">
        Manage your account security and preferences.
      </p>

      <div className="mt-6 space-y-2">
        {SETTINGS_SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="bg-card hover:bg-muted/50 flex items-center gap-4 rounded-lg border p-4 transition-colors duration-150"
          >
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
              <Icon className="text-muted-foreground size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-medium">{title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
            </div>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
