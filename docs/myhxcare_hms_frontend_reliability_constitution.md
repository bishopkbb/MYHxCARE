# MYHxCARE HMS Frontend Reliability, Resilience, Performance & Experience Engineering Constitution

**Document Type:** Supplemental frontend engineering lawbook  
**System:** UniZik Hospital Management System, MYHxCARE HMS  
**Primary Audience:** Frontend engineers, UX engineers, QA engineers, product managers, technical leads, and AI coding assistants  
**Frontend Stack:** Next.js, TypeScript, Tailwind CSS, ShadCN UI, TanStack Query, TanStack Table, TanStack Virtual, React Hook Form, Zod  
**Status:** Binding supplement to the MYHxCARE HMS Frontend Constitution  

---

## 0. Executive Version

### 0.1 Executive Purpose
The HMS frontend is a clinical operations surface. It must stay usable during poor network conditions, power interruptions, backend slowdowns, session expiry, and emergency events. Every screen must have safe loading, empty, error, offline, success, accessibility, security, and observability behavior.

### 0.2 Executive Rules
- No screen may ship with only a happy path.
- No clinical form may lose user-entered work during refresh, outage, or crash.
- No emergency alert may show success until the backend confirms acceptance.
- No table handling hospital-scale data may render unbounded rows without pagination or virtualization.
- No role-restricted action may rely only on hidden UI; backend authorization remains mandatory.
- No motion or animation may reduce clarity, delay care, or violate reduced-motion preferences.
- No sensitive data may be logged, copied, cached, downloaded, or displayed without the approved handling pattern.

### 0.3 Business Outcomes
This Constitution reduces:

- wrong-patient actions;
- duplicate submissions;
- lost clinical notes;
- inconsistent screens;
- poor-network failures;
- unusable tables;
- inaccessible workflows;
- debugging blind spots;
- AI-generated frontend inconsistency.

---

## 0B. Engineering Version

### 0B.1 Mandatory Screen Contract
Every screen must implement and test:

| Required State | Meaning |
|---|---|
| Loading state | Data request or route preparation in progress |
| Skeleton state | Layout-preserving placeholder before data arrives |
| Empty state | Request succeeded but no domain data exists |
| Error state | Request/action failed |
| Offline state | Network is unavailable or app is in offline read/draft mode |
| Success state | User action completed and resulting state is visible |
| Permission state | User cannot view or act due to permission |
| Stale state | Cached data is displayed while refresh is pending or unavailable |

### 0B.2 Approved Stack Responsibilities

| Tool | Responsibility |
|---|---|
| Next.js | routing, layouts, app shell, server/client boundaries |
| TypeScript | compile-time safety and typed contracts |
| Tailwind CSS | utility styling within design system constraints |
| ShadCN UI | accessible component primitives |
| TanStack Query | server state, cache, request lifecycle |
| TanStack Table | table state, sorting, filtering, columns |
| TanStack Virtual | virtualization for large datasets |
| React Hook Form | form state |
| Zod | form and DTO validation |

### 0B.3 Non-Negotiables
- Server state belongs in TanStack Query, not global stores.
- Form validation uses Zod.
- Complex forms use React Hook Form.
- Large tables use TanStack Table.
- Large scrollable datasets use TanStack Virtual.
- API integration goes through typed clients and hooks.
- Route/module/widget failures are caught by error boundaries.
- Every critical user action emits observability metadata.

---

## 0C. AI Coding Assistant Version

### 0C.1 AI Generation Rules
When generating MYHxCARE HMS frontend code:

1. Always create loading, skeleton, empty, error, offline, and success states.
2. Use TypeScript types for every prop, API response, form value, and table row.
3. Use TanStack Query for server state.
4. Use React Hook Form plus Zod for forms.
5. Use TanStack Table for tables and TanStack Virtual when rows can exceed 100.
6. Never call `fetch` directly inside a component.
7. Never store tokens in `localStorage`.
8. Never log PHI, tokens, passwords, full clinical notes, or payment data.
9. Never optimistic-update high-risk workflows: prescriptions, dispensing, admissions, discharges, payments, lab verification, inventory adjustments, emergency acknowledgement.
10. Always include permission gates for menus, routes, buttons, forms, table actions, and bulk actions.
11. Always support keyboard navigation and screen reader labels.
12. Always include request ID and correlation ID in error display when available.

### 0C.2 Required Component Shape

```tsx
export function FeatureScreen() {
  const online = useOnlineStatus();
  const query = useFeatureQuery();

  if (!online && query.data) return <FeatureOfflineRead data={query.data} />;
  if (query.isLoading) return <FeatureSkeleton />;
  if (query.isError) return <FeatureError error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data?.items.length) return <FeatureEmptyState />;

  return <FeatureContent data={query.data} />;
}
```

### 0C.3 Forbidden AI Patterns

```tsx
// Forbidden: direct API call in component
useEffect(() => {
  fetch("/api/v1/patients").then(...);
}, []);

// Forbidden: untyped response
const data: any = await api.get(...);

// Forbidden: no error, empty, offline, or skeleton state
return <Table data={data} />;
```

---

## Part 1. Loading Experience Constitution

### 1.1 Constitution Rule
Loading must preserve layout, reduce anxiety, and expose progress hierarchy. Users must always understand what is loading and whether they can continue working.

### 1.2 Loading Hierarchy

| Loading Level | Pattern | Blocks Interaction |
|---|---|---|
| App shell loading | full-page app shell skeleton | yes |
| Route loading | route-level skeleton | only route content |
| Module loading | module panel skeleton | only module |
| Widget loading | widget skeleton | no |
| Table loading | table skeleton rows | table only |
| Form loading | disabled fields + skeleton defaults | form only |
| Modal loading | modal body skeleton | modal action only |
| Drawer loading | drawer panel skeleton | drawer only |
| Background refetch | subtle refresh indicator | no |

### 1.3 Initial Page Loading
Initial authenticated HMS load must show:

- layout shell;
- sidebar/topbar skeleton;
- active module placeholder;
- no blank white screen longer than 500ms after JS starts;
- no protected data until auth state is confirmed.

### 1.4 Route Loading
Every route segment must provide a `loading.tsx` or route-level skeleton component.

Required file pattern:

```text
src/app/(hms)/wards/loading.tsx
src/features/wards/components/WardDashboardSkeleton.tsx
```

### 1.5 Module Loading
Feature modules must use domain-specific skeletons, not generic spinners.

Allowed:

```tsx
<WardDashboardSkeleton />
<PatientProfileSkeleton />
```

Forbidden:

```tsx
<Spinner />
```

as the only content for a full clinical screen.

### 1.6 Widget Loading
Dashboard widgets load independently. One slow widget must not block the entire dashboard.

Required:

```tsx
<Suspense fallback={<MetricCardSkeleton />}>
  <WardOccupancyMetric />
</Suspense>
```

### 1.7 Modal and Drawer Loading
When a modal/drawer requires data:

- open immediately;
- show title and context first;
- show body skeleton;
- disable confirm action until data is ready;
- show error inside modal/drawer if fetch fails.

### 1.8 Form Loading
Forms must not flicker between empty and populated values.

Required:

- load defaults before rendering editable fields, or
- render disabled skeleton fields, then hydrate once.

### 1.9 Table Loading
Tables must use skeleton rows matching the final column count.

Required:

```tsx
<DataTableSkeleton columns={7} rows={10} />
```

### 1.10 Dashboard Loading
Dashboards render in this priority:

1. shell and role context;
2. critical alerts;
3. primary queue;
4. key metrics;
5. secondary widgets;
6. charts and reports.

### 1.11 Per-Module Loading Patterns

| Module | Required Skeleton |
|---|---|
| Admissions | patient search/registration skeleton |
| Clinicals | patient header + timeline + note panel skeleton |
| Wards | occupancy cards + bed grid skeleton |
| Pharmacy | prescription queue + stock status skeleton |
| Laboratory | lab queue + sample status skeleton |
| Billing | account summary + invoice table skeleton |
| Revenue | KPI cards + chart/table skeleton |
| Emergency | alert list + active alert detail skeleton |
| Notifications | inbox list skeleton |

---

## Part 2. Skeleton System Constitution

### 2.1 Naming Standards
Skeleton components must be named after the final component or screen.

Required:

```text
PatientProfileSkeleton
ConsultationWorkspaceSkeleton
WardDashboardSkeleton
LabQueueSkeleton
PharmacyQueueSkeleton
BillingDashboardSkeleton
AnalyticsDashboardSkeleton
NotificationCenterSkeleton
```

Forbidden:

```text
Loader
MySkeleton
CardPlaceholder
TempLoading
```

### 2.2 Component Architecture

```text
components/ui/skeleton.tsx
features/patients/components/PatientProfileSkeleton.tsx
features/clinicals/components/ConsultationWorkspaceSkeleton.tsx
features/wards/components/WardDashboardSkeleton.tsx
```

Shared primitive:

```tsx
export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
```

### 2.3 Reusability Rules
- Shared skeleton primitives are allowed.
- Domain skeleton compositions belong inside feature modules.
- A skeleton must match the shape of the final layout.
- Skeletons must not display fake PHI or fake patient names.

### 2.4 Domain-Specific Standards

Patient Profile Skeleton:

- patient header row;
- identity summary panel;
- tab strip;
- main detail area;
- side context panel.

Consultation Skeleton:

- fixed patient header;
- timeline column;
- SOAP note blocks;
- order/prescription action row.

Ward Dashboard Skeleton:

- occupancy KPI cards;
- bed grid blocks;
- active patients table rows.

Lab Queue Skeleton:

- filter bar;
- table rows;
- status chips.

Pharmacy Queue Skeleton:

- prescription queue;
- patient/prescriber columns;
- action column placeholder.

Billing Dashboard Skeleton:

- revenue/payment cards;
- invoice queue table;
- exception panel.

Analytics Dashboard Skeleton:

- KPI cards;
- chart block;
- report table.

Notification Center Skeleton:

- filters;
- notification list rows;
- right detail pane if desktop.

### 2.5 Anti-Patterns
Forbidden:

- full-page spinner for dashboard or clinical workspace;
- skeleton with misleading fake data;
- skeleton that shifts layout when data loads;
- skeleton that hides critical alert space;
- skeleton animation that ignores reduced-motion settings.

---

## Part 3. Empty State Constitution

### 3.1 Constitution Rule
Empty states must explain what happened, why it matters, and what the user can do next.

### 3.2 Empty State Structure

Every empty state must include:

- clear title;
- one-sentence explanation;
- recovery action if available;
- permission-aware call to action;
- no blame language.

### 3.3 Messaging Standards

| Empty Case | Title | Message | Action |
|---|---|---|---|
| No Patients | No patients found | No patient matches the current search or filters. | Clear filters / Register patient |
| No Admissions | No active admissions | This ward has no active admissions for the selected filter. | Change filter / Admit patient |
| No Lab Results | No lab results | Released results will appear here after verification. | Request lab / Refresh |
| No Prescriptions | No prescriptions | Prescriptions submitted by clinicians will appear here. | Refresh |
| No Revenue | No revenue data | No payments or charges exist for this period. | Change date range |
| No Notifications | No notifications | New alerts and updates will appear here. | None |
| No Search Results | No results found | Try another name, MRN, folder number, or filter. | Clear search |

### 3.4 CTA Standards
- Primary CTA appears only if user has permission.
- Secondary CTA may be `Clear filters`, `Refresh`, or `Go back`.
- Empty state must not suggest unauthorized actions.

### 3.5 Example

```tsx
<EmptyState
  title="No patients found"
  description="No patient matches the current search or filters."
  action={canCreatePatient ? { label: "Register Patient", onClick: openRegistration } : undefined}
  secondaryAction={{ label: "Clear Filters", onClick: clearFilters }}
/>
```

---

## Part 4. Error Experience Constitution

### 4.1 Error Types

| Error Type | UI Treatment | Retry |
|---|---|---|
| Validation | field + summary errors | after correction |
| Network | offline/connection banner | manual + auto for safe reads |
| Server | safe message + request ID | manual |
| Authorization | access denied screen/message | no retry unless role changes |
| Permission | disabled/hidden action with reason | no |
| Offline | offline mode indicator | auto on reconnect |
| Timeout | timeout message + retry | manual |
| Unknown | generic fallback + request ID | manual |

### 4.2 Error Messaging Standards
Error messages must:

- be plain language;
- include request ID when available;
- preserve user input;
- provide recovery action;
- avoid raw technical details.

Forbidden:

```text
TypeError: Cannot read properties of undefined
500 internal server error at /api/v1/...
pq duplicate key violates constraint
```

Required:

```text
We could not save this consultation. Your draft is still saved locally. Request ID: req_123.
```

### 4.3 Retry Strategies

| Operation | Retry Strategy |
|---|---|
| GET list/detail | auto retry 2 times, then manual |
| Search | cancel previous, no noisy retry |
| Mutation low-risk | manual retry |
| Mutation high-risk | no automatic retry unless idempotency key exists |
| Emergency alert | visible retry path and status |
| File upload | resumable/retry if supported |

### 4.4 Escalation Standards
Escalate to support/admin when:

- repeated save failure after 3 manual retries;
- authorization mismatch blocks urgent care;
- emergency alert submission fails while online;
- data conflict cannot be resolved by user;
- sync queue has failed for more than 10 minutes.

---

## Part 5. Offline-First Constitution

### 5.1 Offline Modes

| Mode | Meaning |
|---|---|
| Offline read mode | cached data visible with stale indicator |
| Offline draft mode | user can continue writing locally |
| Offline queue mode | approved mutation queued with idempotency key |
| Online-required mode | action disabled until network returns |

### 5.2 Network Loss Rules
When network is lost:

- show global offline banner within 3 seconds;
- pause unsafe mutations;
- preserve active drafts;
- continue read-only cached screens where approved;
- mark cached data as stale;
- queue only approved actions.

### 5.3 Healthcare-Specific Offline Rules

| Workflow | Offline Behavior |
|---|---|
| Consultation notes | local draft allowed; final submit online only |
| Nursing notes | local draft allowed; submit online only unless approved queue |
| Lab reports | draft allowed; verification online only |
| Billing forms | draft allowed; posting payment online only |
| Patient registration | draft allowed; final creation online only |
| Prescription | draft allowed; final submission online only |
| Discharge | online required |
| Bed allocation | online required |
| Dispensing | online required |
| Emergency console | must show last known state and reconnect aggressively |

### 5.4 Queue Management
Queued writes must include:

```ts
type OfflineQueueItem = {
  id: string;
  feature: string;
  operation: string;
  endpoint: string;
  payload: unknown;
  idempotencyKey: string;
  createdAt: string;
  lastAttemptAt?: string;
  attemptCount: number;
  status: "queued" | "syncing" | "failed" | "synced";
  correlationId: string;
};
```

### 5.5 Conflict Resolution
Never overwrite server state silently.

Conflict UI must show:

- local draft timestamp;
- server version timestamp;
- fields in conflict;
- available choices: keep draft, discard draft, copy to new note, request review.

---

## Part 6. Session Recovery Constitution

### 6.1 Power Failure Recovery
After power returns:

- app loads shell;
- validates session;
- restores route if safe;
- restores drafts;
- shows recovery banner;
- requires re-auth if session expired.

### 6.2 Browser Crash Recovery
On crash/reopen:

- restore unsent drafts from IndexedDB;
- do not auto-submit;
- show "Recovered draft" panel;
- require user review before submit.

### 6.3 Tab Refresh Recovery
Refreshing must not lose:

- current patient context;
- unsaved form draft;
- selected filters where useful;
- active queue position where safe.

### 6.4 Context Restoration
Store context as:

```ts
type WorkContext = {
  route: string;
  feature: string;
  patientId?: string;
  resourceId?: string;
  filters?: Record<string, string>;
  updatedAt: string;
};
```

Do not restore sensitive screens if user is no longer authenticated.

---

## Part 7. Autosave & Draft Recovery Constitution

### 7.1 Autosave Intervals

| Form | Interval | Storage |
|---|---:|---|
| Consultation notes | 10 seconds after change debounce | IndexedDB |
| Nursing notes | 10 seconds after change debounce | IndexedDB |
| Lab reports | 15 seconds after change debounce | IndexedDB |
| Billing forms | 20 seconds after change debounce | IndexedDB |
| Patient registration | 15 seconds after change debounce | IndexedDB |

### 7.2 Draft Persistence Standard

```ts
type DraftRecord<T> = {
  id: string;
  feature: string;
  schemaVersion: number;
  tenantId: string;
  actorId: string;
  patientId?: string;
  resourceId?: string;
  payload: T;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  status: "local" | "syncing" | "synced" | "conflict";
};
```

### 7.3 Restoration UX
When draft exists:

```text
Recovered draft from 10:42 AM.
[Review Draft] [Discard Draft]
```

Final submit is disabled until the user reviews recovered clinical drafts.

### 7.4 Draft Expiry
Default draft retention:

- clinical drafts: 7 days unless policy changes;
- registration drafts: 48 hours;
- billing drafts: 48 hours;
- lab report drafts: 72 hours.

---

## Part 8. Feature Flag Constitution

### 8.1 Feature Flag Scope
Feature flags are required for:

- Blood Bank;
- Mortuary;
- Dialysis;
- Radiology;
- Research;
- future modules;
- risky workflow changes;
- new dashboards;
- offline write expansion.

### 8.2 Flag Model

```ts
type FeatureFlag = {
  key: string;
  enabled: boolean;
  roles?: string[];
  permissions?: string[];
  tenantIds?: string[];
  rolloutPercentage?: number;
};
```

### 8.3 Rendering Standards
- Disabled features must not appear in navigation.
- Direct route access must show `Feature unavailable`, not a crash.
- Feature flags must not replace permissions.
- A feature must require both enabled flag and permission.

### 8.4 Route Protection

```tsx
<FeatureGate flag="radiology" fallback={<FeatureUnavailable />}>
  <PermissionGate permission="radiology.read">
    <RadiologyPage />
  </PermissionGate>
</FeatureGate>
```

### 8.5 Fallback Handling
Fallback must explain:

- feature unavailable;
- whether it is not enabled for this facility;
- who to contact if access is expected.

---

## Part 9. Permission-Aware UI Constitution

### 9.1 Permission Gates
Permission gates must exist at:

- route level;
- menu level;
- button/action level;
- form field level;
- table action level;
- bulk action level.

### 9.2 Rendering Rules

| Case | UI Behavior |
|---|---|
| User never has permission | hide action |
| User can have permission but current state forbids action | disable with reason |
| Permission is loading | render protected skeleton, no data |
| Permission denied route | access denied page |

### 9.3 Example

```tsx
<PermissionGate
  permission="pharmacy.dispense"
  fallback={null}
>
  <Button disabled={!prescription.canDispense}>
    Dispense Medication
  </Button>
</PermissionGate>
```

### 9.4 Dynamic Navigation
Navigation items are generated from:

- feature flags;
- permissions;
- route availability;
- user role context.

Navigation must never be hardcoded by role name alone.

---

## Part 10. Clinical Timeline Constitution

### 10.1 Timeline Event Types

| Event Type | Source |
|---|---|
| consultation.created | Clinicals |
| diagnosis.added | Clinicals |
| prescription.created | Clinicals |
| prescription.dispensed | Pharmacy |
| lab.order.created | Laboratory |
| lab.result.verified | Laboratory |
| ward.admission.created | Ward |
| ward.transfer.created | Ward |
| invoice.created | Billing |
| payment.posted | Billing |

### 10.2 Desktop Pattern
Desktop timeline uses:

- fixed patient context header;
- left filter panel;
- center chronological feed;
- right detail drawer.

### 10.3 Tablet Pattern
Tablet timeline uses:

- collapsible filters;
- full-width feed;
- detail drawer.

### 10.4 Mobile/PWA Pattern
Mobile staff view uses:

- compact event cards;
- filter sheet;
- detail screen navigation.

### 10.5 Safety Rules
- Do not show unauthorized clinical content.
- Always show timestamp and source module.
- Stale/cached timeline must be labelled.
- Billing events must not expose payment secrets.

---

## Part 11. Activity Feed Constitution

### 11.1 Feed Types

| Feed | Purpose |
|---|---|
| Patient activity | full patient operational timeline |
| Clinical activity | clinician actions and care events |
| Ward activity | admissions, transfers, discharges |
| Lab activity | sample and result events |
| Pharmacy activity | dispensing and stock events |
| Billing activity | invoice/payment/refund events |

### 11.2 Feed Structure

```ts
type ActivityFeedItem = {
  id: string;
  type: string;
  title: string;
  summary: string;
  occurredAt: string;
  actorName?: string;
  sourceModule: string;
  resourceId: string;
  priority?: "low" | "normal" | "high" | "critical";
  auditId?: string;
};
```

### 11.3 Filtering
All feeds support:

- event type;
- source module;
- date range;
- actor where permitted;
- priority;
- search.

### 11.4 Audit Integration
Audit-linked feed items must provide "View audit details" only to users with audit permission.

---

## Part 12. Notification Center Constitution

### 12.1 Notification States

```ts
type NotificationState = "unread" | "read" | "archived";
type NotificationPriority = "low" | "normal" | "high" | "critical";
```

### 12.2 Inbox Pattern
Notification center layout:

- left filters/categories;
- center notification list;
- right detail pane on desktop;
- detail route/sheet on tablet/mobile.

### 12.3 Priority Rules

| Priority | UX |
|---|---|
| Critical | persistent alert, cannot auto-dismiss |
| High | banner + inbox |
| Normal | inbox + badge |
| Low | inbox only |

### 12.4 Department Notifications
Department notifications must show:

- department;
- duty role if applicable;
- target audience;
- action deadline if any.

### 12.5 Emergency Notifications
Emergency notifications must:

- remain visible until acknowledged/resolved;
- include sound/visual cue if policy allows;
- respect reduced motion while remaining obvious.

---

## Part 13. Advanced Search Constitution

### 13.1 Search Architecture
Search input must be debounced, cancellable, permission-filtered, and grouped by result type.

Search sources:

- global search;
- patient search;
- lab search;
- prescription search;
- billing search.

### 13.2 Suggestions
Suggestions appear after 2 characters or recognized ID pattern.

Suggestion groups:

- recent searches;
- exact ID matches;
- patients;
- orders;
- invoices.

### 13.3 Keyboard Shortcuts
Global search opens with:

```text
Ctrl+K on Windows/Linux
Cmd+K on macOS
```

### 13.4 No Results
No results screen must offer:

- clear filters;
- try another ID/name;
- register patient if permission allows.

---

## Part 14. Keyboard Shortcut Constitution

### 14.1 Shortcut Registry

| Shortcut | Action | Scope |
|---|---|---|
| Ctrl/Cmd + K | Global search | global |
| G then D | Dashboard | global |
| G then P | Patients | global |
| G then W | Wards | global |
| G then L | Laboratory | global |
| G then B | Billing | global |
| N then P | New patient | records only |
| N then R | New prescription | clinical context |
| N then L | New lab order | clinical context |
| E then C | Emergency console | authorized users |
| ? | Shortcut help | global |
| Esc | Close modal/drawer | global |

### 14.2 Safety Rules
- High-risk actions cannot be completed by shortcut alone.
- Emergency console shortcut opens console, not acknowledgement.
- Shortcuts must be disabled while typing in form fields unless explicitly scoped.
- All shortcuts must be discoverable through help overlay.

---

## Part 15. Print & Document Generation Constitution

### 15.1 Documents

| Document | Required Elements |
|---|---|
| Prescription | patient, prescriber, medications, date, QR verification |
| Lab Report | patient, test, result, verifier, timestamp, QR verification |
| Medical Certificate | patient, clinician, validity, QR verification |
| Referral Letter | patient, reason, destination, clinician, QR verification |
| Receipt | invoice, payment, amount, cashier, QR verification |
| NHIS Reports | payer, coverage, claim data, generation timestamp |

### 15.2 Print Layout Rules
- Use dedicated print routes/components.
- Hide navigation.
- Include generated timestamp.
- Include QR verification where required.
- Include watermark for draft, duplicate, or reprint.

### 15.3 PDF Generation
PDF generation must be server-authoritative for official documents when legal/clinical validity matters.

Frontend may preview but must not fabricate official final document numbers.

---

## Part 16. Real-Time Experience Constitution

### 16.1 Real-Time Sources
Real-time events may come from:

- WebSocket;
- TanStack Query invalidation/refetch;
- FCM for mobile, not HMS desktop;
- polling fallback only when WebSocket unavailable.

### 16.2 Update Handling
When a WebSocket event arrives:

1. validate event type;
2. validate permission/context;
3. update visible UI if safe;
4. invalidate query if server state must be refreshed;
5. show indicator if user action is needed.

### 16.3 Reconciliation
WebSocket events are hints. REST data is source of truth.

### 16.4 Visual Indicators
Use:

- "New update" banner for list changes;
- row highlight for safe low-risk updates;
- persistent critical alert for emergency;
- stale data indicator during reconnect.

---

## Part 17. Professional Motion & Animation Constitution

### 17.1 Motion Rule
Motion must clarify state change. Motion must never delay care, distract from clinical decisions, or hide information.

### 17.2 Timing Standards

| Motion | Duration |
|---|---:|
| hover/focus feedback | 100-150ms |
| modal open/close | 150-200ms |
| drawer slide | 180-240ms |
| route fade/skeleton transition | 150-250ms |
| row update highlight | 800-1500ms |
| toast entry | 150-200ms |
| success state | 800-1200ms |

### 17.3 Reduced Motion
If `prefers-reduced-motion` is enabled:

- remove non-essential animation;
- keep instant state changes;
- preserve critical alert visibility without pulsing movement.

### 17.4 Healthcare-Safe Motion Rules
Forbidden:

- bouncing clinical alerts;
- slow decorative page transitions;
- animation before emergency acknowledgement UI appears;
- motion-only status communication.

---

## Part 18. Table Engineering Constitution

### 18.1 Required Table Stack
Use:

- TanStack Table for table state;
- TanStack Virtual for large visible lists;
- typed column definitions.

### 18.2 Table Features
Every data table must define:

- columns;
- sorting;
- filtering;
- pagination or virtualization;
- loading skeleton;
- empty state;
- error state;
- row actions;
- permission-aware actions.

### 18.3 Pagination and Virtualization

| Data Size | Pattern |
|---|---|
| under 100 rows | pagination acceptable |
| 100-1,000 rows | server pagination required |
| large scrolling worklists | virtualization required |
| reports/exports | async export job |

### 18.4 Bulk Actions
Bulk actions require:

- permission check;
- selected count;
- confirmation for risky actions;
- result summary;
- partial failure handling.

### 18.5 Export
Export must:

- respect filters;
- respect permissions;
- be audited when sensitive;
- avoid exporting hidden unauthorized columns.

---

## Part 19. Observability Constitution

### 19.1 Frontend Logging
Log:

- route errors;
- failed mutations;
- sync queue failures;
- WebSocket disconnects;
- critical workflow failures;
- performance budget breaches.

Never log:

- PHI;
- tokens;
- passwords;
- full clinical notes;
- payment secrets.

### 19.2 Monitoring Events

```ts
type FrontendEvent = {
  name: string;
  route: string;
  feature: string;
  correlationId: string;
  requestId?: string;
  severity: "info" | "warning" | "error" | "critical";
  metadata?: Record<string, string | number | boolean>;
};
```

### 19.3 Alert Thresholds

| Signal | Alert |
|---|---|
| emergency console render failure | immediate critical |
| consultation draft save failure > 3 attempts | warning |
| WebSocket disconnected > 2 minutes | warning |
| route error rate > 5% in 10 minutes | warning |
| API 5xx visible to frontend > 3% | warning |
| sync queue item failed > 10 minutes | critical for clinical drafts |

### 19.4 Dashboard Requirements
Frontend observability dashboard must show:

- route error rates;
- API latency from browser;
- WebSocket status;
- offline duration;
- draft recovery events;
- top failing components;
- Core Web Vitals;
- user journey completion/failure.

---

## Part 20. Accessibility Constitution

### 20.1 WCAG Standard
HMS must meet WCAG 2.1 AA.

### 20.2 Keyboard Navigation
Required:

- all controls reachable by keyboard;
- visible focus states;
- modal focus trap;
- Escape closes modal/drawer;
- shortcut help accessible;
- table row actions keyboard reachable.

### 20.3 Screen Readers
Required:

- semantic HTML;
- labelled form controls;
- accessible error summaries;
- ARIA live regions for critical alerts;
- meaningful table headers;
- notification announcements.

### 20.4 Dialogs
Dialogs must:

- focus title on open;
- trap focus;
- return focus to trigger on close;
- include action-specific confirm label.

### 20.5 Forms
Forms must:

- associate label and input;
- expose errors via `aria-describedby`;
- move focus to error summary after submit failure;
- preserve input after errors.

---

## Part 21. Performance Constitution

### 21.1 Performance Targets

| Target | Requirement |
|---|---:|
| initial HMS shell interactive | < 3s on target hospital network |
| route transition perceived time | < 500ms |
| local interaction feedback | < 100ms |
| table scroll | 60fps target |
| API visible loading before feedback | < 300ms |
| JS initial route target | < 250KB gzip where practical |
| dashboard first useful content | < 2s |

### 21.2 Code Splitting
Split by:

- route;
- feature;
- heavy widgets;
- chart libraries;
- rich editors;
- report builders.

### 21.3 Memoization
Memoize only expensive calculations or stable props that prevent meaningful re-renders. Do not use `useMemo` as decoration.

### 21.4 Large Datasets
Large datasets require:

- server-side pagination;
- server-side filtering;
- sort allowlist;
- virtualization;
- export job for full data.

### 21.5 Caching
Use TanStack Query stale times by domain:

| Data | Suggested Stale Time |
|---|---:|
| permissions | 5 minutes or session event |
| reference data | 30 minutes |
| patient profile | 1-5 minutes |
| queues | 15-60 seconds |
| emergency alerts | real-time + short refetch |
| dashboards | 30-120 seconds |

---

## Part 22. Frontend Security Constitution

### 22.1 XSS Prevention
Forbidden:

- unsanitized HTML rendering;
- unsafe markdown rendering;
- string-to-DOM injection;
- dynamic script injection.

### 22.2 Token Security
- Do not store refresh tokens in localStorage.
- Do not expose tokens in URLs.
- Do not log tokens.
- Clear sensitive state on logout.

### 22.3 Sensitive Data Protection
Sensitive screens must:

- avoid browser console logging;
- avoid analytics payload PHI;
- mask where appropriate;
- clear state on logout/session expiry.

### 22.4 Clipboard Protection
Copy actions for PHI or identifiers must be explicit, permission-aware, and audited where required.

### 22.5 Download Security
Downloads must:

- use authorized signed URLs or backend stream;
- show document classification;
- watermark official documents where required;
- log/audit sensitive exports.

---

## Part 23. Error Boundary Constitution

### 23.1 Boundary Levels

| Boundary | Purpose |
|---|---|
| Route boundary | prevent route crash from killing app shell |
| Module boundary | isolate feature failure |
| Widget boundary | isolate non-critical dashboard widgets |
| Dashboard boundary | preserve critical widgets if one fails |

### 23.2 Recovery Patterns
Every boundary must offer:

- retry;
- navigate back;
- request ID if available;
- safe support message;
- no raw stack trace in production.

### 23.3 Critical Modules
Emergency module failure must show:

- explicit failure;
- retry;
- fallback contact/procedure if configured;
- alert to observability.

---

## Part 24. Architecture Decision Records

### 24.1 ADR Requirement
ADRs are required for changes to:

- Next.js architecture;
- TypeScript strictness;
- TanStack Query strategy;
- feature flag platform;
- offline support;
- PWA strategy;
- authentication/session strategy;
- table/virtualization strategy;
- observability provider.

### 24.2 ADR Template

```md
# ADR-0000: Title

## Status
Proposed | Accepted | Superseded

## Context
What problem are we solving?

## Decision
What did we decide?

## Alternatives Considered
What else did we evaluate?

## Consequences
Benefits, costs, risks, migration steps.

## Security / Reliability / Accessibility Impact
Required impact statement.

## Review Date
When should this decision be revisited?
```

### 24.3 Required Starter ADRs
- ADR: Use Next.js App Router for HMS.
- ADR: Use TypeScript strict mode.
- ADR: Use TanStack Query for server state.
- ADR: Use feature flags for future modules.
- ADR: Use IndexedDB for offline drafts.
- ADR: Use PWA app shell for poor-network tolerance.
- ADR: Use backend-managed authentication and session recovery.

---

## Part 25. Quality Gate Constitution

### 25.1 Every Screen Must Define

| Requirement | Mandatory |
|---|---|
| Loading state | yes |
| Skeleton state | yes |
| Empty state | yes |
| Error state | yes |
| Offline state | yes |
| Success state | yes |
| Accessibility review | yes |
| Security review | yes |
| Responsive review | yes |
| Test coverage | yes |
| Observability coverage | yes |

### 25.2 Merge Requirements
No PR may merge unless:

- TypeScript passes with no unsafe `any`;
- lint passes;
- relevant tests pass;
- screen state checklist is complete;
- accessibility checks pass for changed UI;
- high-risk actions have confirmation and duplicate-submit protection;
- no sensitive data is logged;
- route has error boundary if applicable;
- loading/skeleton/empty/error states are implemented;
- observability events exist for critical workflows.

### 25.3 Review Checklist

```text
[ ] Loading state implemented
[ ] Skeleton state layout-stable
[ ] Empty state actionable and permission-aware
[ ] Error state includes recovery action
[ ] Offline behavior defined
[ ] Success state visible
[ ] TanStack Query used for server state
[ ] RHF + Zod used for complex forms
[ ] Permission gates implemented
[ ] High-risk actions confirmed
[ ] Accessibility checked
[ ] Performance budget reviewed
[ ] Observability events added
[ ] Sensitive data not logged
[ ] Tests added
```

---

## Implementation Checklist

### Screen Implementation Checklist
For every new screen:

1. Create feature route.
2. Create domain-specific skeleton.
3. Create empty state.
4. Create error state.
5. Create offline/stale state.
6. Create success feedback.
7. Add query/mutation hooks.
8. Add permission gates.
9. Add accessibility labels.
10. Add observability events.
11. Add tests.

### Component Implementation Checklist
For every reusable component:

1. Define typed props.
2. Define loading/disabled state if interactive.
3. Define keyboard behavior.
4. Define ARIA behavior.
5. Define error behavior.
6. Add examples/tests.

### Workflow Implementation Checklist
For every workflow:

1. Define states.
2. Define allowed transitions.
3. Define offline behavior.
4. Define retry behavior.
5. Define conflict handling.
6. Define audit/observability behavior.
7. Define QA test cases.

---

## Quality Gate Checklist

### Release-Level Gate

| Gate | Pass Criteria |
|---|---|
| Reliability | no critical route lacks error/offline recovery |
| Resilience | drafts recover after refresh/crash for required forms |
| Performance | target screens meet budgets |
| Accessibility | no critical WCAG failures |
| Security | no token/PHI logging or insecure storage |
| Observability | critical journeys visible in monitoring |
| UX Safety | high-risk actions protected |
| QA | critical workflows covered |

### Critical Workflow Gate
Critical workflows include:

- patient registration;
- consultation note;
- prescription;
- ward admission;
- discharge;
- lab result verification;
- dispensing;
- payment posting;
- emergency console.

Each must have E2E coverage for:

- happy path;
- validation failure;
- authorization failure;
- network failure;
- duplicate submit prevention;
- recovery from refresh if draft-based.

---

## PDF-Friendly Version

### PDF Export Rules
When exporting this Constitution to PDF:

- use A4 portrait for text-heavy sections;
- use A4 landscape for checklists and tables;
- preserve code blocks;
- keep each major part starting near a page boundary;
- include document title, version, and generated date;
- do not shrink text below readable size;
- ensure tables wrap rather than overflow.

### PDF Reading Order
Recommended PDF order:

1. Executive Version.
2. AI Coding Assistant Version.
3. Parts 1-25.
4. Implementation Checklist.
5. Quality Gate Checklist.
6. ADR Templates.

---

## Final Binding Rule

If an HMS frontend implementation conflicts with this Constitution, the implementation is wrong.

If speed conflicts with reliability, resilience, performance, accessibility, security, clinical safety, or recoverability, the conflict must be escalated before merge.

This document is the official supplemental MYHxCARE HMS Frontend Reliability, Resilience, Performance, UX Excellence, and Engineering Quality Constitution.

