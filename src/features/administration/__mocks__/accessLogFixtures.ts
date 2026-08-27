/**
 * Illustrative access log entries for `/admin/access-log`. Confirmed by
 * research: `/settings/sessions` and `/settings/devices` are real but scoped
 * to the current user's own browser sessions/trusted devices only (self-
 * service, not admin-visible across staff), and no store anywhere tracks a
 * hospital-wide login event or a "blocked"/"locked" account — the only
 * lockout concept in the app is a hardcoded demo trigger in the mock login
 * flow, not backed by real state. This file generates a deterministic
 * illustrative set instead (same technique as `auditLogFixtures.ts`, kept as
 * a separate fixture set since this screen's unit of analysis, a login
 * attempt with device/network metadata, differs from that file's cross-
 * module event log).
 *
 * Deterministic (index-seeded, no `Math.random()`), evaluated once at
 * module load, spread across the last 45 days so both the default date
 * range and its previous-period comparison have real distributed counts.
 *
 * Swap out by pointing this at a real login/session-event stream in Phase 6.
 */

import { MOCK_USERS } from '@/features/auth/__mocks__/authFixtures';

export type LoginType = 'Web Login' | 'Mobile App' | 'Failed Login';
export type AccessStatus = 'Success' | 'Failed';

export type AccessLogEntry = {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  department: string;
  loginType: LoginType;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  status: AccessStatus;
  location: string;
};

const IP_POOL = [
  '197.210.45.12',
  '197.210.45.15',
  '197.210.45.18',
  '197.210.45.22',
  '197.210.45.30',
  '197.210.45.45',
  '197.210.45.66',
  '197.210.45.77',
  '197.210.45.99',
];

const LOCATIONS = ['Ibadan, NG', 'Lagos, NG', 'Abuja, NG', 'Port Harcourt, NG', 'Enugu, NG'];

type DeviceProfile = { device: string; browser: string; os: string; loginType: LoginType };

const DEVICE_PROFILES: DeviceProfile[] = [
  { device: 'Chrome 126.0', browser: 'Chrome', os: 'Windows 11', loginType: 'Web Login' },
  { device: 'Chrome 126.0', browser: 'Chrome', os: 'Windows 10', loginType: 'Web Login' },
  { device: 'Safari 17.5', browser: 'Safari', os: 'macOS', loginType: 'Web Login' },
  { device: 'Edge 126.0', browser: 'Edge', os: 'Windows 11', loginType: 'Web Login' },
  { device: 'Firefox 128.0', browser: 'Firefox', os: 'Windows 11', loginType: 'Web Login' },
  { device: 'MYHxCare App', browser: 'MYHxCare App', os: 'Android 14', loginType: 'Mobile App' },
  { device: 'MYHxCare App', browser: 'MYHxCare App', os: 'iOS 17', loginType: 'Mobile App' },
];

const FAILED_DEVICE_PROFILES: DeviceProfile[] = [
  { device: 'Chrome 126.0', browser: 'Chrome', os: 'Android', loginType: 'Failed Login' },
  { device: 'Chrome 126.0', browser: 'Chrome', os: 'Windows 10', loginType: 'Failed Login' },
];

/** Hours weighted toward the working day (repeated entries = higher
 * frequency once cycled through), so "Logins by Time of Day" reads as a
 * realistic daily curve instead of a mechanical repeating pattern. */
const BUSINESS_HOUR_WEIGHTS = [
  7, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 18, 20, 22, 1, 4, 6,
];

function generateEntries(): AccessLogEntry[] {
  const entries: AccessLogEntry[] = [];
  const totalDays = 45;
  const perDay = 4;
  let idx = 0;
  for (let day = 0; day < totalDays; day++) {
    for (let slot = 0; slot < perDay; slot++) {
      const hour = BUSINESS_HOUR_WEIGHTS[idx % BUSINESS_HOUR_WEIGHTS.length]!;
      const minute = (idx * 11) % 60;
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(hour, minute, 0, 0);

      // Roughly 1 in 8 slots is a failed login attempt, matching the
      // mockup's own proportion of Failed rows among Success rows. Most
      // failures are anonymous (an unrecognized identifier), but a small
      // rotating set of named users repeatedly fail so "Blocked Users"
      // (3+ failed attempts by the same person) has real rows to count
      // from, rather than only ever counting zero.
      const isFailed = idx % 8 === 7;
      if (isFailed) {
        const profile = FAILED_DEVICE_PROFILES[idx % FAILED_DEVICE_PROFILES.length]!;
        const isNamedFailure = idx % 24 !== 7;
        const namedUser = isNamedFailure ? MOCK_USERS[idx % 3]! : null;
        entries.push({
          id: `acc-${String(idx + 1).padStart(5, '0')}`,
          timestamp: date.toISOString(),
          userName: namedUser ? namedUser.name : 'Unknown User',
          userRole: namedUser ? namedUser.role : 'Guest',
          department: namedUser ? (namedUser.department ?? '-') : '-',
          loginType: 'Failed Login',
          ipAddress: IP_POOL[idx % IP_POOL.length]!,
          device: profile.device,
          browser: profile.browser,
          os: profile.os,
          status: 'Failed',
          location: LOCATIONS[idx % LOCATIONS.length]!,
        });
      } else {
        const user = MOCK_USERS[idx % MOCK_USERS.length]!;
        const profile = DEVICE_PROFILES[idx % DEVICE_PROFILES.length]!;
        entries.push({
          id: `acc-${String(idx + 1).padStart(5, '0')}`,
          timestamp: date.toISOString(),
          userName: user.name,
          userRole: user.role,
          department: user.department ?? '-',
          loginType: profile.loginType,
          ipAddress: IP_POOL[idx % IP_POOL.length]!,
          device: profile.device,
          browser: profile.browser,
          os: profile.os,
          status: 'Success',
          location: LOCATIONS[idx % LOCATIONS.length]!,
        });
      }
      idx += 1;
    }
  }
  return entries;
}

export const ILLUSTRATIVE_ACCESS_LOG_ENTRIES: AccessLogEntry[] = generateEntries();
