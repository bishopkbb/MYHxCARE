import type { TrustedDevice } from '@/types/auth.types';

const BASE = Date.now();
const ago = (ms: number) => new Date(BASE - ms).toISOString();
const D = 24 * 60 * 60 * 1000;

let _devices: TrustedDevice[] = [
  {
    id: 'dev_001',
    deviceName: 'Chrome on Windows 10',
    browser: 'Chrome 125',
    os: 'Windows 10',
    ipAddress: '102.88.65.1',
    location: 'Awka, Anambra, Nigeria',
    trustedAt: ago(2 * D),
    lastUsedAt: ago(0),
    isCurrent: true,
  },
  {
    id: 'dev_002',
    deviceName: 'Safari on iPhone',
    browser: 'Safari 17',
    os: 'iOS 17',
    ipAddress: '102.88.72.4',
    location: 'Awka, Anambra, Nigeria',
    trustedAt: ago(10 * D),
    lastUsedAt: ago(3 * D),
    isCurrent: false,
  },
  {
    id: 'dev_003',
    deviceName: 'Firefox on macOS',
    browser: 'Firefox 126',
    os: 'macOS Sonoma',
    ipAddress: '41.58.112.9',
    location: 'Lagos, Lagos, Nigeria',
    trustedAt: ago(20 * D),
    lastUsedAt: ago(14 * D),
    isCurrent: false,
  },
];

export function getMockDevices(): TrustedDevice[] {
  return [..._devices];
}

export function mockRevokeDevice(deviceId: string): void {
  _devices = _devices.filter((d) => d.id !== deviceId);
}

export function mockRevokeAllDevices(): void {
  _devices = _devices.filter((d) => d.isCurrent);
}
