/**
 * Typed query key factories for every HMS domain.
 *
 * Usage:
 *   useQuery({ queryKey: QK.patients.list({ page: 1, q: 'john' }) })
 *   useQuery({ queryKey: QK.patients.detail(patientId) })
 *   queryClient.invalidateQueries({ queryKey: QK.patients.all() })
 *
 * Convention: each factory returns a readonly tuple so TanStack Query can
 * distinguish keys by reference equality without accidental collisions.
 */

import type { PaginationParams } from '@lib/api/types';

export const QK = {
  // ── Patients ────────────────────────────────────────────────────────────
  patients: {
    all: () => ['patients'] as const,
    list: (params?: PaginationParams) => ['patients', 'list', params ?? {}] as const,
    detail: (id: string) => ['patients', 'detail', id] as const,
    folder: (id: string) => ['patients', 'folder', id] as const,
    timeline: (id: string) => ['patients', 'timeline', id] as const,
    dependents: (id: string) => ['patients', 'dependents', id] as const,
    insurance: (id: string) => ['patients', 'insurance', id] as const,
    labResults: (id: string, params?: PaginationParams) =>
      ['patients', 'lab-results', id, params ?? {}] as const,
  },

  // ── Encounters ──────────────────────────────────────────────────────────
  encounters: {
    all: () => ['encounters'] as const,
    list: (params?: PaginationParams) => ['encounters', 'list', params ?? {}] as const,
    detail: (id: string) => ['encounters', 'detail', id] as const,
    notes: (encounterId: string) => ['encounters', 'notes', encounterId] as const,
    prescriptions: (encounterId: string) => ['encounters', 'prescriptions', encounterId] as const,
    orders: (encounterId: string) => ['encounters', 'orders', encounterId] as const,
  },

  // ── Pharmacy ────────────────────────────────────────────────────────────
  pharmacy: {
    all: () => ['pharmacy'] as const,
    medications: (params?: PaginationParams) => ['pharmacy', 'medications', params ?? {}] as const,
    inventory: (params?: PaginationParams) => ['pharmacy', 'inventory', params ?? {}] as const,
    locationInventory: (locationId: string, params?: PaginationParams) =>
      ['pharmacy', 'location-inventory', locationId, params ?? {}] as const,
    dispenses: (params?: PaginationParams) => ['pharmacy', 'dispenses', params ?? {}] as const,
    locations: () => ['pharmacy', 'locations'] as const,
    stockLedger: (params?: PaginationParams) => ['pharmacy', 'stock-ledger', params ?? {}] as const,
    transfers: (params?: PaginationParams) => ['pharmacy', 'transfers', params ?? {}] as const,
  },

  // ── Laboratory ──────────────────────────────────────────────────────────
  lab: {
    all: () => ['lab'] as const,
    orders: (params?: PaginationParams) => ['lab', 'orders', params ?? {}] as const,
    orderDetail: (id: string) => ['lab', 'order', id] as const,
    results: (params?: PaginationParams) => ['lab', 'results', params ?? {}] as const,
    bloodBank: (params?: PaginationParams) => ['lab', 'blood-bank', params ?? {}] as const,
  },

  // ── Billing ─────────────────────────────────────────────────────────────
  billing: {
    all: () => ['billing'] as const,
    charges: (params?: PaginationParams) => ['billing', 'charges', params ?? {}] as const,
    invoices: (params?: PaginationParams) => ['billing', 'invoices', params ?? {}] as const,
    payments: (params?: PaginationParams) => ['billing', 'payments', params ?? {}] as const,
    account: (patientId: string) => ['billing', 'account', patientId] as const,
  },

  // ── Emergency ───────────────────────────────────────────────────────────
  emergency: {
    all: () => ['emergency'] as const,
    list: (params?: PaginationParams) => ['emergency', 'list', params ?? {}] as const,
    detail: (id: string) => ['emergency', 'detail', id] as const,
  },

  // ── Wards ───────────────────────────────────────────────────────────────
  wards: {
    all: () => ['wards'] as const,
    list: (params?: PaginationParams) => ['wards', 'list', params ?? {}] as const,
    beds: (wardId: string) => ['wards', 'beds', wardId] as const,
    occupancy: (wardId: string) => ['wards', 'occupancy', wardId] as const,
  },

  // ── Duty Roster ─────────────────────────────────────────────────────────
  dutyRoster: {
    all: () => ['duty-roster'] as const,
    rosters: (params?: PaginationParams) => ['duty-roster', 'rosters', params ?? {}] as const,
    assignments: (params?: PaginationParams) =>
      ['duty-roster', 'assignments', params ?? {}] as const,
    activeAssignments: () => ['duty-roster', 'assignments', 'active'] as const,
    escalationRules: () => ['duty-roster', 'escalation-rules'] as const,
  },

  // ── Case Collaboration ──────────────────────────────────────────────────
  collaboration: {
    all: () => ['collaboration'] as const,
    threads: (params?: PaginationParams) => ['collaboration', 'threads', params ?? {}] as const,
    thread: (id: string) => ['collaboration', 'thread', id] as const,
    messages: (threadId: string, params?: PaginationParams) =>
      ['collaboration', 'messages', threadId, params ?? {}] as const,
  },

  // ── Notifications ───────────────────────────────────────────────────────
  notifications: {
    all: () => ['notifications'] as const,
    list: (params?: PaginationParams) => ['notifications', 'list', params ?? {}] as const,
  },

  // ── Admin ───────────────────────────────────────────────────────────────
  admin: {
    all: () => ['admin'] as const,
    staff: (params?: PaginationParams) => ['admin', 'staff', params ?? {}] as const,
    servicePrices: (params?: PaginationParams) =>
      ['admin', 'service-prices', params ?? {}] as const,
    dashboard: () => ['admin', 'dashboard'] as const,
    reports: {
      operations: (params?: PaginationParams) =>
        ['admin', 'reports', 'operations', params ?? {}] as const,
      inventory: (params?: PaginationParams) =>
        ['admin', 'reports', 'inventory', params ?? {}] as const,
      revenue: (params?: PaginationParams) =>
        ['admin', 'reports', 'revenue', params ?? {}] as const,
      audit: (params?: PaginationParams) => ['admin', 'reports', 'audit', params ?? {}] as const,
    },
  },

  // ── Current User ────────────────────────────────────────────────────────
  me: {
    profile: () => ['me', 'profile'] as const,
    sessions: () => ['me', 'sessions'] as const,
    devices: () => ['me', 'devices'] as const,
    permissions: () => ['me', 'permissions'] as const,
  },

  // ── Reference Data ──────────────────────────────────────────────────────
  ref: {
    permissions: () => ['ref', 'permissions'] as const,
    roles: () => ['ref', 'roles'] as const,
  },
} as const;
