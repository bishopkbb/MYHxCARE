import type { Session } from '@/types/auth.types';

const BASE = Date.now();
const ago = (ms: number) => new Date(BASE - ms).toISOString();
const H = 60 * 60 * 1000;
const D = 24 * H;

let _sessions: Session[] = [
  {
    id: 'sess_001',
    deviceName: 'Chrome on Windows 10',
    browser: 'Chrome 125',
    os: 'Windows 10',
    ipAddress: '102.88.65.1',
    location: 'Awka, Anambra, Nigeria',
    lastActiveAt: ago(0),
    createdAt: ago(2 * H),
    isCurrent: true,
  },
  {
    id: 'sess_002',
    deviceName: 'Safari on iPhone',
    browser: 'Safari 17',
    os: 'iOS 17',
    ipAddress: '102.88.72.4',
    location: 'Awka, Anambra, Nigeria',
    lastActiveAt: ago(3 * D),
    createdAt: ago(5 * D),
    isCurrent: false,
  },
  {
    id: 'sess_003',
    deviceName: 'Firefox on macOS',
    browser: 'Firefox 126',
    os: 'macOS Sonoma',
    ipAddress: '41.58.112.9',
    location: 'Lagos, Lagos, Nigeria',
    lastActiveAt: ago(7 * D),
    createdAt: ago(7 * D),
    isCurrent: false,
  },
];

export function getMockSessions(): Session[] {
  return [..._sessions];
}

export function mockRevokeSession(sessionId: string): void {
  _sessions = _sessions.filter((s) => s.id !== sessionId);
}

export function mockRevokeAllSessions(): void {
  _sessions = _sessions.filter((s) => s.isCurrent);
}
