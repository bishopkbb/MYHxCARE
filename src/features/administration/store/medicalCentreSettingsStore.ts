'use client';

/**
 * Medical Centre Settings as live, shared state, not a static fixture.
 * useSyncExternalStore module-singleton pattern, same as every other store
 * this session. The whole screen edits one record, not a list, so there's
 * a single setter that merges a partial update rather than per-field CRUD
 * actions.
 *
 * Swap out by pointing this at a real settings endpoint in Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  DEFAULT_SETTINGS,
  type MedicalCentreSettings,
} from '@/features/administration/__mocks__/medicalCentreSettingsFixtures';

let settings: MedicalCentreSettings = { ...DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): MedicalCentreSettings {
  return settings;
}

function getServerSnapshot(): MedicalCentreSettings {
  return DEFAULT_SETTINGS;
}

/** Reactive hook, re-renders the caller whenever settings are saved, from
 * any screen (the right-hand preview cards elsewhere could read this too). */
export function useMedicalCentreSettings(): MedicalCentreSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function updateMedicalCentreSettings(partial: Partial<MedicalCentreSettings>): void {
  settings = { ...settings, ...partial };
  emit();
}
