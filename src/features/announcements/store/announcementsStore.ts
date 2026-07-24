/**
 * Cross-workspace shared store for Announcements.
 *
 * Announcements are the one feed every workspace's dashboard shows the same
 * copy of — an admin posting from the Administration workspace must appear
 * identically in Nursing, Registration, Medical Records, and every other
 * workspace mounted in the same browser session. A per-page `useState` (the
 * pattern used by Notifications/Messages, which are intentionally
 * role-scoped) would silo each page's edits from every other page's mounted
 * copy. This module-level store — the same `useSyncExternalStore` pattern
 * as `nursingWorkflowStore.ts` — is what makes read/pin/delete/create
 * reactive across every workspace without a real backend.
 *
 * Swap out by pointing hooks to a real announcements endpoint/WebSocket in
 * Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  ANNOUNCEMENTS,
  type Announcement,
} from '@/features/announcements/__mocks__/announcementFixtures';

let announcements: Announcement[] = ANNOUNCEMENTS;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Announcement[] {
  return announcements;
}

function getServerSnapshot(): Announcement[] {
  return ANNOUNCEMENTS;
}

export function useAnnouncements(): Announcement[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addAnnouncement(announcement: Announcement): void {
  announcements = [announcement, ...announcements];
  emit();
}

export function markAnnouncementRead(id: string): void {
  announcements = announcements.map((a) => (a.id === id ? { ...a, read: true } : a));
  emit();
}

export function toggleAnnouncementPin(id: string): void {
  announcements = announcements.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a));
  emit();
}

export function deleteAnnouncement(id: string): void {
  announcements = announcements.filter((a) => a.id !== id);
  emit();
}
