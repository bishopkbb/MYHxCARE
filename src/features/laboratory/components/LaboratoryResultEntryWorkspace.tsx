'use client';

import {
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  ScanLine,
  Send,
  TestTube2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ModalLoadingFallback } from '@components/shared/ModalLoadingFallback';
import { PermissionGate } from '@components/shared/PermissionGate';
import {
  ScrollableTable,
  TABLE_HEADER_BG,
  TABLE_HEADER_STICKY_CLASS,
} from '@components/shared/ScrollableTable';
import { Tooltip } from '@components/shared/Tooltip';
import { PERMISSIONS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/utils/datetime';
import {
  addReflexTest,
  finalizeResult,
  saveResultDraft,
  useLabResults,
} from '@/features/laboratory/store/labResultStore';
import {
  deriveCollectionPoint,
  deriveSampleId,
  groupIntoOrders,
  orderSampleType,
  relevantTests,
  type RawLabOrder,
} from '@/features/laboratory/utils/labOrders';
import {
  computeFlag,
  getCatalogForTest,
  getPreviousResult,
  isRowCritical,
  type CatalogParam,
} from '@/features/laboratory/__mocks__/labTestCatalog';
import type {
  LabResult,
  LabResultFlag,
  LabResultRow,
} from '@/features/laboratory/__mocks__/labResultFixtures';

const ScanSampleModal = dynamic(() => import('./ScanSampleModal').then((m) => m.ScanSampleModal), {
  ssr: false,
  loading: () => <ModalLoadingFallback />,
});

const AddReflexTestModal = dynamic(
  () => import('./AddReflexTestModal').then((m) => m.AddReflexTestModal),
  { ssr: false, loading: () => <ModalLoadingFallback /> },
);

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

type PageState = 'loading' | 'loaded' | 'error';

const STEPS = ['Enter Results', 'Review', 'Verification', 'Published'] as const;

type DraftRow = { parameter: string; value: string; method: string };

const FLAG_STYLE: Record<'N' | 'H' | 'L' | 'A' | 'CRIT', { background: string; color: string }> = {
  N: { background: 'rgba(34,197,94,0.12)', color: '#16A34A' },
  H: { background: 'rgba(239,68,68,0.12)', color: '#DC2626' },
  L: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
  A: { background: 'rgba(245,158,11,0.14)', color: '#B45309' },
  CRIT: { background: '#EF4444', color: '#FFFFFF' },
};

/** Test-level flag rolls up from every parameter row on that test: any real
 * critical crossing wins outright, else any H/L/A makes it ABNORMAL, else
 * NORMAL — never a placeholder, always computed from what was actually
 * typed. */
function rollUpTestFlag(
  rows: DraftRow[],
  catalog: CatalogParam[],
): { flag: LabResultFlag; criticalValueLabel: string | undefined } {
  let flag: LabResultFlag = 'NORMAL';
  let criticalValueLabel: string | undefined;
  catalog.forEach((param, i) => {
    const value = rows[i]?.value ?? '';
    if (isRowCritical(value, param)) {
      flag = 'CRITICAL';
      criticalValueLabel = `${param.parameter} ${value}${param.unit ? ` ${param.unit}` : ''}`;
      return;
    }
    if (computeFlag(value, param) && flag !== 'CRITICAL') flag = 'ABNORMAL';
  });
  return { flag, criticalValueLabel };
}

function buildDraftRows(test: LabResult, catalog: CatalogParam[]): DraftRow[] {
  return catalog.map((param) => {
    const existing = test.rows?.find((r) => r.parameter === param.parameter);
    return {
      parameter: param.parameter,
      value: existing?.value ?? '',
      method: existing?.method ?? param.method,
    };
  });
}

function toLabRows(rows: DraftRow[], catalog: CatalogParam[]): LabResultRow[] {
  return catalog.map((param, i) => {
    const row = rows[i];
    const value = row?.value ?? '';
    const method = row?.method ?? param.method;
    const flag = computeFlag(value, param);
    return {
      parameter: param.parameter,
      value,
      reference: param.referenceDisplay,
      method,
      ...(param.unit ? { unit: param.unit } : {}),
      ...(flag ? { flag } : {}),
    };
  });
}

function ageGenderLabel(order: RawLabOrder): string {
  if (order.age !== undefined && order.gender) return `${order.age} Y · ${order.gender}`;
  if (order.age !== undefined) return `${order.age} Y`;
  if (order.gender) return order.gender;
  return '—';
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span style={{ fontSize: 14, color: '#8A98A3' }}>{label}</span>
      <span className="text-right font-sans font-medium" style={{ fontSize: 14, color: '#0D2630' }}>
        {value}
      </span>
    </div>
  );
}

// ── Main workspace ───────────────────────────────────────────────────────────

export function LaboratoryResultEntryWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const results = useLabResults();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [orderParam, setOrderParam] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setPageState('loaded'), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Deferred so the setState call happens in an async callback, not
    // synchronously in the effect body — same convention as the Patient
    // Profile page's `?patientId=` handoff, which reads `window.location`
    // rather than `useSearchParams()` to avoid opting this route out of
    // static optimization.
    const id = setTimeout(() => {
      setOrderParam(new URLSearchParams(window.location.search).get('order'));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function handleRetry() {
    setPageState('loading');
    setTimeout(() => setPageState('loaded'), 700);
  }

  function navigateToOrder(groupKey: string) {
    router.replace(`${ROUTES.laboratoryResultEntry}?order=${encodeURIComponent(groupKey)}`);
    setOrderParam(groupKey);
  }

  const orders = useMemo(() => groupIntoOrders(results), [results]);

  const inProgressOrders = useMemo(
    () => orders.filter((o) => relevantTests(o).some((t) => t.analysisStartedAt && !t.isOnHold)),
    [orders],
  );

  const selectedOrder = orderParam ? orders.find((o) => o.groupKey === orderParam) : undefined;

  const enterableTests = useMemo(
    () =>
      selectedOrder
        ? selectedOrder.tests.filter(
            (t) => t.status === 'IN_PROCESS' && t.analysisStartedAt && !t.isOnHold,
          )
        : [],
    [selectedOrder],
  );

  const alreadyResultedTests = useMemo(
    () =>
      selectedOrder
        ? selectedOrder.tests.filter((t) => t.status === 'RESULTED' || t.status === 'VERIFIED')
        : [],
    [selectedOrder],
  );

  const [draft, setDraft] = useState<Record<string, DraftRow[]>>({});
  const [comment, setComment] = useState('');
  const [commentFlash, setCommentFlash] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [reflexOpen, setReflexOpen] = useState(false);

  // Adjust state during render (React's own recipe for "reset state when a
  // prop/derived value changes") rather than an effect + setState, which
  // would cascade an extra render for no benefit — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [resetKey, setResetKey] = useState(orderParam);
  if (orderParam !== resetKey) {
    setResetKey(orderParam);
    setDraft({});
    setComment('');
  }

  // Seeds draft rows for any enterable test that doesn't have one yet
  // (initial load, and tests added later via Add Reflex Test) — merges in
  // rather than overwriting, so in-progress typing on the order's other
  // tests survives. Same render-time-adjustment pattern as above.
  const enterableIds = enterableTests.map((t) => t.id).join(',');
  const [seededIds, setSeededIds] = useState(enterableIds);
  if (enterableIds !== seededIds) {
    setSeededIds(enterableIds);
    setDraft((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const test of enterableTests) {
        if (!next[test.id]) {
          next[test.id] = buildDraftRows(test, getCatalogForTest(test.testName));
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  function setRowValue(testId: string, index: number, value: string) {
    setDraft((prev) => {
      const rows = prev[testId];
      if (!rows) return prev;
      const nextRows = rows.map((r, i) => (i === index ? { ...r, value } : r));
      return { ...prev, [testId]: nextRows };
    });
  }

  function setRowMethod(testId: string, index: number, method: string) {
    setDraft((prev) => {
      const rows = prev[testId];
      if (!rows) return prev;
      const nextRows = rows.map((r, i) => (i === index ? { ...r, method } : r));
      return { ...prev, [testId]: nextRows };
    });
  }

  function focusComment(parameter: string) {
    setCommentFlash(true);
    setTimeout(() => setCommentFlash(false), 900);
    setComment((prev) => (prev.trim() ? prev : `Re: ${parameter}: `));
    document.getElementById('result-entry-comment')?.focus();
  }

  const summary = useMemo(() => {
    let total = 0;
    let filled = 0;
    let abnormal = 0;
    for (const test of enterableTests) {
      const catalog = getCatalogForTest(test.testName);
      const rows = draft[test.id] ?? [];
      catalog.forEach((param, i) => {
        total += 1;
        const value = rows[i]?.value ?? '';
        if (value.trim()) filled += 1;
        if (computeFlag(value, param) || isRowCritical(value, param)) abnormal += 1;
      });
    }
    return { totalTests: enterableTests.length, total, filled, abnormal, pending: total - filled };
  }, [enterableTests, draft]);

  function handleSaveDraft() {
    if (!selectedOrder || enterableTests.length === 0) return;
    const commentToSave = comment.trim() ? comment.trim() : undefined;
    for (const test of enterableTests) {
      const catalog = getCatalogForTest(test.testName);
      const rows = draft[test.id] ?? buildDraftRows(test, catalog);
      saveResultDraft(test.id, toLabRows(rows, catalog), commentToSave);
    }
    toast.success('Draft saved', `${selectedOrder.orderId} — your entries have been saved.`);
  }

  function handleFinalize() {
    if (!selectedOrder || enterableTests.length === 0) return;
    const incomplete = enterableTests.some((test) => {
      const rows = draft[test.id] ?? [];
      return rows.some((r) => !r.value.trim());
    });
    if (incomplete) {
      toast.error('Missing results', 'Enter a value for every parameter before finalizing.');
      return;
    }
    const commentToSave = comment.trim() ? comment.trim() : undefined;
    let anyCritical = false;
    for (const test of enterableTests) {
      const catalog = getCatalogForTest(test.testName);
      const rows = draft[test.id] ?? [];
      const { flag, criticalValueLabel } = rollUpTestFlag(rows, catalog);
      if (flag === 'CRITICAL') anyCritical = true;
      finalizeResult(test.id, toLabRows(rows, catalog), flag, criticalValueLabel, commentToSave);
    }
    toast.success(
      'Sent for verification',
      `${selectedOrder.orderId} — ${enterableTests.length} test${enterableTests.length === 1 ? '' : 's'} finalized${anyCritical ? ', including a critical value' : ''}.`,
    );
    router.push(ROUTES.laboratoryTestWorkQueue);
  }

  function handleAddReflex(testId: string) {
    if (!selectedOrder) return;
    addReflexTest(selectedOrder.groupKey, testId, user?.name ?? 'Lab Scientist');
    toast.success('Reflex test added', 'Added to this order and ready to enter below.');
    setReflexOpen(false);
  }

  const scanEntries = useMemo(
    () =>
      inProgressOrders.map((o) => ({
        sampleId: deriveSampleId(o.groupKey, o.orderedAt),
        groupKey: o.groupKey,
      })),
    [inProgressOrders],
  );

  if (pageState === 'error') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
          <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] py-16 text-center"
              style={{ background: '#FFFFFF', border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <AlertCircle style={{ width: 36, height: 36, color: '#EF4444' }} />
              <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                Failed to load Result Entry
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className={`flex items-center gap-2 font-sans font-semibold text-white transition-opacity duration-150 hover:opacity-80 ${FOCUS_RING}`}
                style={{
                  height: 40,
                  borderRadius: 12,
                  padding: '0 20px',
                  background: '#00B4D8',
                  fontSize: 14,
                }}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto scroll-smooth" style={{ background: '#F5FBFD' }}>
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="font-display font-semibold"
                style={{ fontSize: 26, lineHeight: '34px', color: '#0D2630' }}
              >
                Result Entry
              </h1>
              <p className="mt-0.5" style={{ fontSize: 14, lineHeight: '22px', color: '#4A7080' }}>
                Enter and save test results. Once completed, send for verification.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleRetry}
                className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <RefreshCw style={{ width: 15, height: 15 }} />
                Refresh
              </button>
              {selectedOrder && enterableTests.length > 0 && (
                <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                    style={{
                      fontSize: 14,
                      color: '#0D2630',
                      border: '1px solid rgba(0,100,130,0.2)',
                    }}
                  >
                    <Save style={{ width: 15, height: 15 }} />
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalize}
                    className={`flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <Send style={{ width: 15, height: 15 }} />
                    Finalize &amp; Send for Verification
                  </button>
                </PermissionGate>
              )}
            </div>
          </div>

          {/* ── Step indicator ────────────────────────────────────────────── */}
          <div
            className="mt-5 flex items-center rounded-[12px] bg-white px-4 py-4 sm:px-6"
            style={{ border: '1px solid rgba(0,100,130,0.12)' }}
          >
            {STEPS.map((step, i) => (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full font-sans font-semibold"
                    style={{
                      fontSize: 13,
                      background: i === 0 ? '#00B4D8' : 'rgba(0,100,130,0.1)',
                      color: i === 0 ? '#FFFFFF' : '#8A98A3',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="font-sans font-medium whitespace-nowrap"
                    style={{ fontSize: 14, color: i === 0 ? '#0D2630' : '#8A98A3' }}
                  >
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span
                    className="mx-3 h-px flex-1"
                    style={{ background: 'rgba(0,100,130,0.15)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {pageState === 'loading' && (
            <div className="mt-5 flex flex-col gap-4 xl:flex-row">
              <div
                className="min-w-0 flex-1 animate-pulse rounded-[12px] bg-white p-5"
                style={{ border: '1px solid rgba(0,100,130,0.12)', height: 420 }}
              />
              <div className="flex shrink-0 flex-col gap-4 xl:w-[380px]">
                <div
                  className="h-40 animate-pulse rounded-[12px] bg-white"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                />
                <div
                  className="h-32 animate-pulse rounded-[12px] bg-white"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                />
              </div>
            </div>
          )}

          {pageState === 'loaded' && orderParam === undefined && <div className="mt-5 h-40" />}

          {pageState === 'loaded' && orderParam !== undefined && !selectedOrder && (
            <div
              className="mt-5 rounded-[12px] bg-white p-5 sm:p-6"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              {inProgressOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <div
                    className="flex size-14 items-center justify-center rounded-full"
                    style={{ background: 'rgba(0,180,216,0.1)' }}
                  >
                    <TestTube2 style={{ width: 24, height: 24, color: '#00B4D8' }} />
                  </div>
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 18, color: '#0D2630' }}
                  >
                    No tests are currently in progress
                  </p>
                  <p className="max-w-[360px]" style={{ fontSize: 14, color: '#4A7080' }}>
                    Start a test from Test Work Queue, then continue here to enter its results.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(ROUTES.laboratoryTestWorkQueue)}
                    className={`mt-1 flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                    style={{ fontSize: 14, background: '#00B4D8' }}
                  >
                    <ArrowLeft style={{ width: 15, height: 15 }} />
                    Go to Test Work Queue
                  </button>
                </div>
              ) : (
                <>
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Select an order to begin
                  </p>
                  <p className="mt-0.5" style={{ fontSize: 14, color: '#4A7080' }}>
                    Every test currently in progress at the bench.
                  </p>
                  <div className="mt-3.5 flex flex-col gap-2">
                    {inProgressOrders.map((o) => (
                      <button
                        key={o.groupKey}
                        type="button"
                        onClick={() => navigateToOrder(o.groupKey)}
                        className={`flex items-center gap-3 rounded-[10px] px-3.5 py-3 text-left transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                      >
                        <span
                          className="flex size-11 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                          style={{ background: o.avatarBg, fontSize: 14 }}
                        >
                          {o.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block font-sans font-medium"
                            style={{ fontSize: 14, color: '#0D2630' }}
                          >
                            {o.patientName} · {o.mrn}
                          </span>
                          <span className="block" style={{ fontSize: 14, color: '#4A7080' }}>
                            {o.orderId} — {relevantTests(o).length} test
                            {relevantTests(o).length === 1 ? '' : 's'} in progress
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {pageState === 'loaded' && selectedOrder && enterableTests.length === 0 && (
            <div
              className="mt-5 flex flex-col items-center justify-center gap-3 rounded-[12px] bg-white py-16 text-center"
              style={{ border: '1px solid rgba(0,100,130,0.12)' }}
            >
              <div
                className="flex size-14 items-center justify-center rounded-full"
                style={{ background: 'rgba(0,180,216,0.1)' }}
              >
                <TestTube2 style={{ width: 24, height: 24, color: '#00B4D8' }} />
              </div>
              <p className="font-display font-semibold" style={{ fontSize: 18, color: '#0D2630' }}>
                Nothing ready for entry on this order
              </p>
              <p className="max-w-[360px]" style={{ fontSize: 14, color: '#4A7080' }}>
                {selectedOrder.orderId} has no tests currently started and unpaused — check Test
                Work Queue for its status.
              </p>
              <button
                type="button"
                onClick={() => router.push(ROUTES.laboratoryTestWorkQueue)}
                className={`mt-1 flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <ArrowLeft style={{ width: 15, height: 15 }} />
                Go to Test Work Queue
              </button>
            </div>
          )}

          {pageState === 'loaded' && selectedOrder && enterableTests.length > 0 && (
            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-start">
              {/* ── Main column ─────────────────────────────────────────── */}
              <div
                className="min-w-0 flex-1 rounded-[12px] bg-white"
                style={{ border: '1px solid rgba(0,100,130,0.12)' }}
              >
                <div
                  className="flex flex-wrap items-center gap-3 px-5 py-4"
                  style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-full font-sans font-semibold text-white"
                    style={{ background: selectedOrder.avatarBg, fontSize: 15 }}
                  >
                    {selectedOrder.initials}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="font-display font-semibold"
                      style={{ fontSize: 17, color: '#0D2630' }}
                    >
                      {selectedOrder.patientName}
                    </p>
                    <p style={{ fontSize: 14, color: '#4A7080' }}>
                      {selectedOrder.mrn} · {ageGenderLabel(selectedOrder)}
                      {selectedOrder.ward ? ` · ${selectedOrder.ward}` : ''}
                    </p>
                  </div>
                  <span className="ml-auto" style={{ fontSize: 14, color: '#00B4D8' }}>
                    {selectedOrder.orderId}
                  </span>
                </div>

                <div className="px-5 py-4">
                  <p className="font-sans font-semibold" style={{ fontSize: 16, color: '#0D2630' }}>
                    Tests to Be Entered ({enterableTests.length})
                  </p>

                  <div className="mt-3">
                    <ScrollableTable minWidth={900}>
                      <div
                        className={`flex items-center gap-2 border-b px-2 pb-2 ${TABLE_HEADER_STICKY_CLASS}`}
                        style={{ borderColor: 'rgba(0,100,130,0.12)', background: TABLE_HEADER_BG }}
                      >
                        <span
                          className="min-w-0 flex-1 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Test
                        </span>
                        <span
                          className="w-28 shrink-0 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Result
                        </span>
                        <span
                          className="w-16 shrink-0 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Units
                        </span>
                        <span
                          className="w-24 shrink-0 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Reference
                        </span>
                        <span
                          className="w-24 shrink-0 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Previous
                        </span>
                        <span
                          className="w-36 shrink-0 font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Method
                        </span>
                        <span
                          className="w-28 shrink-0 text-right font-sans font-semibold"
                          style={{ fontSize: 14, color: '#4A7080' }}
                        >
                          Flag
                        </span>
                      </div>

                      {enterableTests.map((test) => {
                        const catalog = getCatalogForTest(test.testName);
                        const rows = draft[test.id] ?? buildDraftRows(test, catalog);
                        return (
                          <div key={test.id} className="mt-3">
                            <div
                              className="rounded-[8px] px-2.5 py-2"
                              style={{ background: '#F5FBFD' }}
                            >
                              <p
                                className="font-sans font-semibold"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {test.testName}
                              </p>
                              <p style={{ fontSize: 14, color: '#8A98A3' }}>{test.department}</p>
                            </div>

                            {catalog.map((param, i) => {
                              const row = rows[i] ?? {
                                parameter: param.parameter,
                                value: '',
                                method: param.method,
                              };
                              const flag = computeFlag(row.value, param);
                              const critical = isRowCritical(row.value, param);
                              const badge = critical
                                ? 'CRIT'
                                : (flag ?? (row.value.trim() ? 'N' : undefined));
                              const previous = getPreviousResult(
                                results,
                                selectedOrder.mrn,
                                test.testName,
                                param.parameter,
                                selectedOrder.orderedAt,
                              );
                              return (
                                <div
                                  key={param.parameter}
                                  className="flex items-center gap-2 px-2 py-2"
                                  style={{ borderBottom: '1px solid rgba(0,100,130,0.06)' }}
                                >
                                  <Tooltip content={param.parameter}>
                                    <span
                                      className="min-w-0 flex-1 truncate"
                                      style={{ fontSize: 14, color: '#0D2630' }}
                                    >
                                      {param.parameter}
                                    </span>
                                  </Tooltip>
                                  <span className="w-28 shrink-0">
                                    {param.kind === 'qualitative' ? (
                                      <select
                                        value={row.value}
                                        onChange={(e) => setRowValue(test.id, i, e.target.value)}
                                        className={`h-9 w-full rounded-[8px] px-2 font-sans outline-none ${FOCUS_RING}`}
                                        style={{
                                          fontSize: 14,
                                          color: '#0D2630',
                                          border: '1px solid rgba(0,100,130,0.18)',
                                        }}
                                      >
                                        <option value="">Select…</option>
                                        {param.options?.map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={row.value}
                                        onChange={(e) => setRowValue(test.id, i, e.target.value)}
                                        placeholder="—"
                                        className={`h-9 w-full rounded-[8px] px-2.5 font-sans outline-none ${FOCUS_RING}`}
                                        style={{
                                          fontSize: 14,
                                          color: '#0D2630',
                                          border: '1px solid rgba(0,100,130,0.18)',
                                        }}
                                      />
                                    )}
                                  </span>
                                  <span
                                    className="w-16 shrink-0"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {param.unit ?? '—'}
                                  </span>
                                  <span
                                    className="w-24 shrink-0"
                                    style={{ fontSize: 14, color: '#4A7080' }}
                                  >
                                    {param.referenceDisplay}
                                  </span>
                                  <Tooltip content={previous ?? '—'}>
                                    <span
                                      className="w-24 shrink-0 truncate"
                                      style={{ fontSize: 14, color: '#4A7080' }}
                                    >
                                      {previous ?? '—'}
                                    </span>
                                  </Tooltip>
                                  <span className="w-36 shrink-0">
                                    <select
                                      value={row.method}
                                      onChange={(e) => setRowMethod(test.id, i, e.target.value)}
                                      className={`h-9 w-full rounded-[8px] px-2 font-sans outline-none ${FOCUS_RING}`}
                                      style={{
                                        fontSize: 14,
                                        color: '#0D2630',
                                        border: '1px solid rgba(0,100,130,0.18)',
                                      }}
                                    >
                                      {param.methodOptions.map((m) => (
                                        <option key={m} value={m}>
                                          {m}
                                        </option>
                                      ))}
                                    </select>
                                  </span>
                                  <span className="flex w-28 shrink-0 items-center justify-end gap-1.5">
                                    {badge && (
                                      <span
                                        className="shrink-0 rounded-full px-2 py-0.5 font-sans font-semibold"
                                        style={{ fontSize: 13, ...FLAG_STYLE[badge] }}
                                      >
                                        {badge}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => focusComment(param.parameter)}
                                      aria-label={`Add a comment about ${param.parameter}`}
                                      className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,180,216,0.08)] ${FOCUS_RING}`}
                                    >
                                      <MessageSquare
                                        style={{ width: 15, height: 15, color: '#8A98A3' }}
                                      />
                                    </button>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </ScrollableTable>
                  </div>

                  {alreadyResultedTests.length > 0 && (
                    <div className="mt-4">
                      <p
                        className="font-sans font-semibold"
                        style={{ fontSize: 14, color: '#0D2630' }}
                      >
                        Already entered ({alreadyResultedTests.length})
                      </p>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {alreadyResultedTests.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-3 rounded-[8px] px-3 py-2"
                            style={{ background: '#F5FBFD' }}
                          >
                            <Tooltip content={t.testName}>
                              <span
                                className="min-w-0 truncate"
                                style={{ fontSize: 14, color: '#0D2630' }}
                              >
                                {t.testName}
                              </span>
                            </Tooltip>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 font-sans font-semibold"
                              style={{
                                fontSize: 13,
                                ...(t.flag === 'CRITICAL'
                                  ? FLAG_STYLE.CRIT
                                  : t.flag === 'ABNORMAL'
                                    ? FLAG_STYLE.A
                                    : FLAG_STYLE.N),
                              }}
                            >
                              {t.flag ?? 'RESULTED'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <label
                      htmlFor="result-entry-comment"
                      className="block font-sans font-medium"
                      style={{ fontSize: 14, color: '#0D2630' }}
                    >
                      Add Comment (Optional)
                    </label>
                    <textarea
                      id="result-entry-comment"
                      rows={3}
                      maxLength={500}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Enter any additional notes or observations…"
                      className={`mt-1.5 w-full resize-none rounded-[10px] px-3.5 py-2.5 font-sans transition-shadow duration-150 outline-none placeholder:text-[#8A98A3] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: `1px solid ${commentFlash ? '#00B4D8' : 'rgba(0,100,130,0.18)'}`,
                        boxShadow: commentFlash ? '0 0 0 3px rgba(0,180,216,0.15)' : 'none',
                      }}
                    />
                    <p className="mt-1 text-right" style={{ fontSize: 14, color: '#8A98A3' }}>
                      {comment.length} / 500
                    </p>
                  </div>
                </div>

                <div
                  className="mx-5 mb-5 flex items-start gap-2.5 rounded-[10px] px-3.5 py-3"
                  style={{ background: 'rgba(0,180,216,0.06)' }}
                >
                  <AlertCircle
                    style={{ width: 16, height: 16, color: '#00B4D8', flexShrink: 0, marginTop: 2 }}
                  />
                  <p style={{ fontSize: 14, color: '#0D2630' }}>
                    Please ensure all results are accurate and within reference ranges before
                    sending for verification.
                  </p>
                </div>
              </div>

              {/* ── Right rail ──────────────────────────────────────────── */}
              <div className="flex shrink-0 flex-col gap-4 xl:w-[380px]">
                <div
                  className="rounded-[12px] bg-white p-4 sm:p-5"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Sample &amp; Order Information
                  </p>
                  <div
                    className="mt-2 flex flex-col divide-y"
                    style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                  >
                    <InfoRow
                      label="Sample ID / Barcode"
                      value={deriveSampleId(selectedOrder.groupKey, selectedOrder.orderedAt)}
                    />
                    <InfoRow label="Sample Type" value={orderSampleType(selectedOrder.tests)} />
                    <InfoRow
                      label="Collection Point"
                      value={deriveCollectionPoint(selectedOrder)}
                    />
                    <InfoRow label="Ordered By" value={selectedOrder.orderedBy} />
                    <InfoRow
                      label="Order Date / Time"
                      value={formatDateTime(selectedOrder.orderedAt)}
                    />
                    <InfoRow label="Priority" value={selectedOrder.priority} />
                    {enterableTests[0]?.comment && (
                      <div className="py-1.5">
                        <span style={{ fontSize: 14, color: '#8A98A3' }}>Clinical Note</span>
                        <p className="mt-0.5" style={{ fontSize: 14, color: '#0D2630' }}>
                          {enterableTests[0].comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="rounded-[12px] bg-white p-4 sm:p-5"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Test Summary
                  </p>
                  <div
                    className="mt-2 flex flex-col divide-y"
                    style={{ borderColor: 'rgba(0,100,130,0.08)' }}
                  >
                    <InfoRow label="Total Tests" value={String(summary.totalTests)} />
                    <InfoRow
                      label="Results Entered"
                      value={`${summary.filled} / ${summary.total}`}
                    />
                    <InfoRow label="Abnormal" value={String(summary.abnormal)} />
                    <InfoRow label="Pending" value={String(summary.pending)} />
                  </div>
                </div>

                <div
                  className="rounded-[12px] bg-white p-4 sm:p-5"
                  style={{ border: '1px solid rgba(0,100,130,0.12)' }}
                >
                  <p
                    className="font-display font-semibold"
                    style={{ fontSize: 16, color: '#0D2630' }}
                  >
                    Actions
                  </p>
                  <div className="mt-2.5 flex flex-col gap-2">
                    <PermissionGate permission={PERMISSIONS.LAB_ORDERS_WRITE}>
                      <button
                        type="button"
                        onClick={() => setReflexOpen(true)}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                        style={{
                          fontSize: 14,
                          color: '#0D2630',
                          border: '1px solid rgba(0,100,130,0.2)',
                        }}
                      >
                        <Plus style={{ width: 15, height: 15 }} />
                        Add Reflex Test
                      </button>
                    </PermissionGate>
                    <button
                      type="button"
                      onClick={() => setScanOpen(true)}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#0D2630',
                        border: '1px solid rgba(0,100,130,0.2)',
                      }}
                    >
                      <ScanLine style={{ width: 15, height: 15 }} />
                      Scan Another Sample
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(ROUTES.laboratoryTestWorkQueue)}
                      className={`flex h-11 items-center justify-center gap-1.5 rounded-[10px] font-sans font-medium transition-colors duration-150 hover:bg-red-50 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#EF4444',
                        border: '1px solid rgba(239,68,68,0.3)',
                      }}
                    >
                      Cancel &amp; Return to Queue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>
      </main>

      {scanOpen && (
        <ScanSampleModal
          entries={scanEntries}
          onClose={() => setScanOpen(false)}
          onFound={(groupKey) => navigateToOrder(groupKey)}
        />
      )}

      {reflexOpen && selectedOrder && (
        <AddReflexTestModal
          patientName={selectedOrder.patientName}
          mrn={selectedOrder.mrn}
          onClose={() => setReflexOpen(false)}
          onConfirm={handleAddReflex}
        />
      )}
    </div>
  );
}
