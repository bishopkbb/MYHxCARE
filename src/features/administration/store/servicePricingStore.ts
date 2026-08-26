'use client';

/**
 * Service & Pricing as live, shared state, not a static fixture.
 * useSyncExternalStore module-singleton pattern, same as every other store
 * this session. Holds two related slices, the service catalogue and the
 * published price-change log, sharing one listener set since they change
 * together (publishing a pending change updates both).
 *
 * Swap out by pointing these actions at a real services/pricing endpoint in
 * Phase 6.
 */

import { useSyncExternalStore } from 'react';

import {
  SERVICE_RECORDS,
  type ServiceRecord,
  type ServiceStatus,
} from '@/features/administration/__mocks__/servicePricingFixtures';
import {
  PRICE_CHANGE_LOG,
  type PriceChangeLogEntry,
} from '@/features/administration/__mocks__/priceChangeLogFixtures';

let services: ServiceRecord[] = [...SERVICE_RECORDS];
let priceLog: PriceChangeLogEntry[] = [...PRICE_CHANGE_LOG];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServicesSnapshot(): ServiceRecord[] {
  return services;
}
function getServicesServerSnapshot(): ServiceRecord[] {
  return SERVICE_RECORDS;
}

function getLogSnapshot(): PriceChangeLogEntry[] {
  return priceLog;
}
function getLogServerSnapshot(): PriceChangeLogEntry[] {
  return PRICE_CHANGE_LOG;
}

/** Reactive hook, re-renders the caller whenever a service is added,
 * edited, or has its price/status changed, from any screen. */
export function useServices(): ServiceRecord[] {
  return useSyncExternalStore(subscribe, getServicesSnapshot, getServicesServerSnapshot);
}

/** Reactive hook over the published price-change log. */
export function useServicePriceLog(): PriceChangeLogEntry[] {
  return useSyncExternalStore(subscribe, getLogSnapshot, getLogServerSnapshot);
}

export function addService(service: ServiceRecord): void {
  services = [service, ...services];
  emit();
}

export function updateService(service: ServiceRecord): void {
  services = services.map((s) => (s.id === service.id ? service : s));
  emit();
}

export function setServiceStatus(id: string, status: ServiceStatus): void {
  services = services.map((s) => (s.id === id ? { ...s, status } : s));
  emit();
}

/** Creates or replaces a service's pending change, never touching its
 * published currentPrice/effectiveDate directly. */
export function proposeNewPrice(id: string, price: number, effectiveDate: string): void {
  services = services.map((s) =>
    s.id === id
      ? {
          ...s,
          pendingPrice: price,
          pendingEffectiveDate: effectiveDate,
          status: 'Pending' as const,
          previousStatus: s.status === 'Pending' ? s.previousStatus : s.status,
        }
      : s,
  );
  emit();
}

/** Moves a service's pending change to live, and appends a Published entry
 * to the price-change log, the log's only write path. */
export function publishPendingChange(id: string): void {
  const service = services.find((s) => s.id === id);
  if (!service || service.pendingPrice === null || service.pendingEffectiveDate === null) return;

  const entry: PriceChangeLogEntry = {
    id: `LOG-${String(priceLog.length + 1).padStart(4, '0')}`,
    serviceId: service.id,
    serviceName: service.name,
    previousPrice: service.currentPrice,
    newPrice: service.pendingPrice,
    effectiveDate: service.pendingEffectiveDate,
    changedBy: service.lastUpdatedBy,
    changedAt: new Date().toISOString(),
    status: 'Published',
  };
  priceLog = [entry, ...priceLog];

  services = services.map((s) =>
    s.id === id
      ? {
          ...s,
          currentPrice: s.pendingPrice!,
          effectiveDate: s.pendingEffectiveDate!,
          pendingPrice: null,
          pendingEffectiveDate: null,
          status: 'Active' as const,
          previousStatus: null,
          lastUpdatedAt: entry.changedAt,
        }
      : s,
  );
  emit();
}

/** Discards a service's pending change, reverting it to whichever status it
 * held before the edit (Active or Inactive); a rejected change is not
 * itself logged, nothing was ever published. */
export function rejectPendingChange(id: string): void {
  services = services.map((s) =>
    s.id === id
      ? {
          ...s,
          pendingPrice: null,
          pendingEffectiveDate: null,
          status: s.previousStatus ?? ('Active' as const),
          previousStatus: null,
        }
      : s,
  );
  emit();
}
