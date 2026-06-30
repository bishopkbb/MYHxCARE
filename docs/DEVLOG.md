# MYHxCare HMS — Development Log

Running record of bottlenecks, non-obvious bugs, architecture decisions made under constraint, and integration surprises. Every entry stays permanently. Nothing gets deleted.

| # | Title | Area | Date | Severity |
|---|---|---|---|---|
| [DL-001](#dl-001) | npm naming restriction blocks create-next-app in-place init | infra/scaffold | 30/06/2026 | Low |
| [DL-002](#dl-002) | Stack version discoveries on scaffold — Tailwind v4, React 19, ESLint v9, Next.js 16 breaking changes | infra/scaffold | 30/06/2026 | Medium |
| [DL-003](#dl-003) | Next.js 16 breaking changes affecting this project — async APIs, proxy.ts, removed APIs | infra/next16 | 30/06/2026 | High |
| [DL-004](#dl-004) | Dependency install resolved newer major versions than expected — Zod v4, date-fns v4, uuid v14 | infra/deps | 30/06/2026 | Medium |
| [DL-005](#dl-005) | PostCSS XSS audit warning in Next.js 16.2.9 bundled dependency — cannot fix without Next.js downgrade | infra/security | 30/06/2026 | Low |
| [DL-006](#dl-006) | Vitest default forks pool times out on Windows paths with spaces — switched to threads pool | infra/testing | 30/06/2026 | Medium |
| [DL-007](#dl-007) | @testing-library/dom missing — not auto-installed as peer dep of @testing-library/react v16 | infra/testing | 30/06/2026 | Low |
| [DL-008](#dl-008) | TypeScript strict mode caught two Playwright config errors — exactOptionalPropertyTypes + noPropertyAccessFromIndexSignature | infra/testing | 30/06/2026 | Low |
| [DL-009](#dl-009) | ShadCN v4 breaking changes — unified radix-ui package, Slot.Root, tw-animate-css, oklch colors, preset system | ui/shadcn | 30/06/2026 | Medium |
| [DL-010](#dl-010) | Turbopack (Next.js 16 default) blocks all Webpack-based PWA plugins — chose custom SW approach | infra/pwa | 30/06/2026 | High |

---

## [DL-001] npm naming restriction blocks create-next-app in-place init
**Date:** 30/06/2026  
**Phase:** Phase 2 — Project Initialization  
**Area:** infra/scaffold  
**Severity:** Low  

### Context
Running `npx create-next-app@16.2.9 .` inside `C:\...\MYHxCare\` to scaffold the Next.js app in-place.

### Problem
```
Could not create a project called "MYHxCare" because of npm naming restrictions:
  * name can no longer contain capital letters
```
`create-next-app` derives the npm package name from the target directory name. `MYHxCare` contains uppercase letters, which npm disallows in package names.

### Investigation
No `--name` flag exists on `create-next-app` to override the derived package name. Options: (a) scaffold into a lowercase subdirectory then move files up, or (b) scaffold elsewhere and move. Option (a) chosen — cleaner, no temp directory outside the project.

### Fix
1. `npx create-next-app@16.2.9 myhxcare-hms --skip-install --yes ...` — scaffolds into `MYHxCare/myhxcare-hms/` with valid package name
2. Created `docs/` directory, moved all three reference documents (architecture HTML, two constitutions) into it
3. Moved all scaffolded files (including dotfiles) from `myhxcare-hms/` up to `MYHxCare/` root
4. Removed the now-empty `myhxcare-hms/` directory

Final result: `MYHxCare/` is the app root with `package.json` name `myhxcare-hms`. Docs live in `docs/`.

### Impact
Low. Resulted in a cleaner project structure — docs are now properly separated in `docs/` rather than mixed with source files at root.

### Lesson
When initializing any npm-based project inside a directory with uppercase or special characters in the name, scaffold into a valid lowercase intermediary directory first. Also a good prompt to move reference/architecture docs into `docs/` from the start rather than leaving them at root.

---

## [DL-002] Stack version discoveries on scaffold — Tailwind v4, React 19, ESLint v9, Next.js 16 breaking changes
**Date:** 30/06/2026  
**Phase:** Phase 2 — Project Initialization  
**Area:** infra/scaffold  
**Severity:** Medium  

### Context
Verifying the scaffolded project structure after DL-001 fix. Assistant knowledge cutoff is August 2025; this project is being built in June 2026.

### Problem / Discovery
The scaffold resolved to versions significantly newer than the assistant's training data:

| Package | Expected (training) | Actual (scaffolded) |
|---|---|---|
| `next` | 14.x / 15.x | **16.2.9** |
| `react` | 18.x / 19.x | **19.2.4** |
| `tailwindcss` | 3.x | **4.x** |
| `eslint` | 8.x | **9.x** |

**Specific changes that affect our build:**

1. **Tailwind CSS v4** — No `tailwind.config.ts` file. Config is now CSS-based via `@import "tailwindcss"` and `@theme` directive directly in CSS. PostCSS plugin is now `@tailwindcss/postcss` (not `tailwindcss`). Any v3-era `tailwind.config.ts` patterns (extend, theme, plugins) must be rewritten as CSS variables.

2. **ESLint v9** — Flat config format (`eslint.config.mjs`). The old `.eslintrc.*` format is removed. All rule additions, plugin configurations, and extends must use the new flat config API.

3. **Next.js 16** — The scaffolded `AGENTS.md`/`CLAUDE.md` explicitly warns: *"This is NOT the Next.js you know. This version has breaking changes. Read `node_modules/next/dist/docs/` before writing any code."* Exact API changes unknown until `npm install` runs and docs are reviewed.

4. **React 19** — `use()` hook stable, server actions stable, ref as prop (no `forwardRef` needed). Some patterns from React 18 may be deprecated.

### Investigation
No investigation needed — these are version discoveries, not errors. Root cause is a 10-month gap between assistant training cutoff (August 2025) and project start (June 2026).

### Fix / Mitigation
1. `npm install` is the next task — after which `node_modules/next/dist/docs/` will be readable
2. Read Next.js 16 release notes/docs before writing any Next.js-specific code
3. Tailwind v4: all custom theming goes into `globals.css` via `@theme` — no `tailwind.config.ts` to create
4. ESLint v9: extend `eslint.config.mjs` using flat config API in Task 4
5. ShadCN compatibility with Tailwind v4 must be verified in Task 5 before proceeding
6. Any unexpected breaking change gets its own DL-XXX entry

### Impact
Medium. Tailwind v4 and ESLint v9 require different configuration patterns than originally planned. Next.js 16 may have changed routing, caching, or component APIs. ShadCN/Tailwind v4 compatibility is an open risk item for Task 5.

### Lesson
For projects where the assistant's training data may be stale (>6 months), run the scaffold first, inspect actual versions, then plan configuration tasks against the real versions — not assumed versions. Reference `node_modules/*/dist/docs/` or `CHANGELOG.md` files as the ground truth for installed versions.

---

## [DL-003] Next.js 16 breaking changes affecting this project
**Date:** 30/06/2026  
**Phase:** Phase 2 — Project Initialization  
**Area:** infra/next16  
**Severity:** High  

### Context
Reading `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` immediately after base `npm install`, as the scaffolded `AGENTS.md` warned of breaking changes.

### Problem / Discovery
Next.js 16 has six breaking changes that directly affect the MYHxCare build plan:

**1. Async Request APIs — synchronous compat removed**
In Next.js 15 these had a temporary synchronous compat shim. In Next.js 16 that shim is gone. All of the following are now Promise-only:
- `cookies()` — use `await cookies()`
- `headers()` — use `await headers()`
- `draftMode()` — use `await draftMode()`
- `params` in `layout.tsx`, `page.tsx`, `route.ts` — use `const { id } = await props.params`
- `searchParams` in `page.tsx` — use `const query = await props.searchParams`

**2. `middleware.ts` → `proxy.ts`**
File name changed from `middleware.ts` to `proxy.ts`. Named export changed from `middleware` to `proxy`. Runs Node.js runtime only (no Edge). Config key `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`. This directly affects our Phase 3 auth route protection layer.

**3. `next lint` command removed**
`next build` no longer runs linting. `next lint` CLI command is gone. Must use `eslint` directly. Our `"lint": "eslint"` script in package.json is already correct — no action needed.

**4. Turbopack is now default for both `next dev` and `next build`**
No `--turbopack` flag needed. Adding a custom `webpack` function in `next.config.ts` will break builds. We must NOT add webpack config. Any Node.js module resolution issues (e.g., idb, uuid in server context) use `turbopack.resolveAlias` not `webpack.resolve.fallback`.

**5. New page/layout type helpers via `npx next typegen`**
`PageProps<'/route/[param]'>` and `LayoutProps` are now generated and globally available. Cleaner and fully type-safe than the old `{ params: { id: string } }` pattern. Run `npx next typegen` after the folder skeleton is created in Task 8.

**6. Parallel routes require explicit `default.js`**
Any `@slot` parallel route directory must have a `default.js` that either returns `null` or calls `notFound()`. Build fails without them.

### Investigation
Extracted from official version-16 upgrade guide bundled in `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`. No runtime errors encountered — these are design constraints surfaced pre-emptively.

### Fix / Mitigation Applied
1. **Async APIs**: Every server component, layout, and route handler in this project will use `await` on `cookies()`, `headers()`, `params`, and `searchParams`. No synchronous access ever. Enforced in code review.
2. **`proxy.ts`**: Phase 3 auth protection file will be named `proxy.ts` exporting `export function proxy(request: Request)`. Not `middleware.ts`.
3. **`next lint`**: Already handled — `package.json` lint script uses `eslint` directly.
4. **Turbopack**: No custom webpack config will be added. Turbopack options (if needed) go in `turbopack: {}` at the top level of `next.config.ts`.
5. **`next typegen`**: Will be run after Task 8 (folder skeleton) to generate `PageProps` and `LayoutProps` helpers.
6. **Parallel routes**: Any parallel route slot created in future phases will have a `default.tsx` returning `null` on day one.

### Impact
High. Without knowing these changes:
- Every `page.tsx` accessing `params` would have thrown at runtime (silent in dev until rendered)
- The auth protection file named `middleware.ts` would have been ignored entirely by Next.js 16 (no auth = all routes unprotected)
- Any `next lint` script reference in CI would have failed the pipeline

### Lesson
Read the version upgrade guide BEFORE writing any application code when using a major version of Next.js beyond your training data. The `node_modules/next/dist/docs/` directory contains all official docs bundled with the installed version — it is the most reliable reference available locally.

---

## [DL-004] Dependency install resolved newer major versions than expected
**Date:** 30/06/2026  
**Phase:** Phase 2 — Project Initialization  
**Area:** infra/deps  
**Severity:** Medium  

### Context
Running `npm install --save-exact` for all project dependencies. Package versions resolved to majors beyond assistant training data (cutoff August 2025).

### Problem / Discovery
Three packages resolved to unexpectedly newer major versions:

| Package | Expected (training) | Installed | Risk |
|---|---|---|---|
| `zod` | v3.x | **v4.4.3** | High — API changes expected |
| `date-fns` | v3.x | **v4.4.0** | Medium — timezone submodule may differ |
| `uuid` | v9–v11 | **v14.0.1** | Low — API is stable, but verify named exports |
| `@hookform/resolvers` | v3.x | **v5.4.0** | Medium — Zod v4 integration pattern may differ |

**Zod v4 (most significant):**
Zod v4 is a ground-up rewrite with major performance improvements. Key changes from v3 that may affect this project:
- Default import style is the same: `import { z } from 'zod'`
- `z.infer<typeof schema>` still works
- `z.object({}).parse()`, `.safeParse()` still work
- New: `z.interface()` type — prefer over `z.object()` for open object types
- `ZodError` structure may differ — verify error mapping in form validation

**date-fns v4:**
- Still exports from same paths
- `date-fns/tz` submodule exists — verify `TZDate` and `formatInTimeZone` still available for WAT display

**uuid v14:**
- `import { v4 as uuidv4 } from 'uuid'` still works
- Package now ships its own TypeScript types — `@types/uuid` v10 installed as safety net, may conflict

### Investigation
Discovered post-install by reading `package.json`. No errors at install time — versions resolved cleanly. Impact unknown until code is written.

### Fix / Mitigation
1. **Zod v4**: When writing schemas (Phase 4), verify API against `node_modules/zod/` source or CHANGELOG. Do not assume v3 patterns.
2. **date-fns v4**: When writing `utils/datetime.ts` (Phase 4), test WAT timezone formatting via the `date-fns/tz` submodule before committing.
3. **uuid v14**: When writing `utils/request.ts`, use `import { v4 as uuidv4 } from 'uuid'` — if types conflict, remove `@types/uuid`.
4. **@hookform/resolvers v5**: When wiring forms, verify the `zodResolver()` import and usage against the v5 docs.
5. Each integration point gets its own DL entry if the API turns out to be incompatible.

### Impact
Medium. No immediate errors — packages installed successfully. If Zod v4's API differs in ways we don't catch until Phase 4 schema writing, we may need to rewrite schema patterns. Isolated to `src/features/*/schemas/`, `src/utils/`, and form components — not structural.

### Lesson
When installing with `npm install` (no pinned version), npm resolves the latest matching major. In a project starting from scratch in June 2026, packages are 6–12 months ahead of training data. Always read installed version from `package.json` — not from memory — before writing code that calls those packages.

---

## [DL-005] PostCSS XSS audit warning in Next.js 16.2.9 bundled dependency
**Date:** 30/06/2026  
**Phase:** Phase 2 — Project Initialization  
**Area:** infra/security  
**Severity:** Low  

### Context
Running `npm audit` after all dependencies installed.

### Problem
```
postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output
https://github.com/advisories/GHSA-qx2v-qp2m-jg93
fix available via `npm audit fix --force`
Will install next@9.3.3, which is a breaking change
```

`npm audit` reports 2 moderate severity vulnerabilities in `next/node_modules/postcss` — a PostCSS version older than 8.5.10 bundled inside Next.js 16.2.9 itself. The "fix" suggested by npm would downgrade Next.js to 9.3.3, which is completely wrong.

### Investigation
This is a known vendor vulnerability in the version of PostCSS bundled inside the Next.js package tree. The XSS vector requires an attacker to control CSS stringify output — not a realistic attack surface for a backend-rendered HMS where CSS is not user-generated. The vulnerability is in the build toolchain, not in shipped client code.

The affected `postcss` is at `node_modules/next/node_modules/postcss`, meaning it is isolated inside Next.js's own dependency subtree. Our code does not import PostCSS directly.

### Fix / Mitigation
No action taken. `npm audit fix --force` is NOT run — it would catastrophically downgrade Next.js. The correct resolution is to wait for Next.js to release a version bundling postcss >=8.5.10. Check on next upgrade cycle.

**What we do NOT do:**
- `npm audit fix --force` — destroys the project
- Override postcss in package.json overrides — risky, may break Next.js CSS pipeline

### Impact
Low. The vulnerability is moderate severity and requires control of CSS stringify output, which is not a realistic attack vector in MYHxCare. This is a framework vendor issue, not a code quality issue.

### Lesson
When `npm audit` suggests `--force`, always read what it will install. If it suggests downgrading a core framework by 7 major versions, it is a false remedy. Vendor vulnerabilities inside framework subtrees are the framework maintainer's responsibility to patch — not ours to override.

---

## [DL-006] Vitest default forks pool times out on Windows paths with spaces
**Date:** 30/06/2026  
**Phase:** Phase 2 — Project Initialization  
**Area:** infra/testing  
**Severity:** Medium  

### Context
Running `npx vitest run` after configuring Vitest v4.1.9 with jsdom environment and `@vitejs/plugin-react`.

### Problem
```
Error: [vitest-pool]: Failed to start forks worker for test files
  C:/Users/USER/Desktop/Traceworka Projects/MYHxCare/src/test/smoke.test.tsx
Caused by: Error: [vitest-pool-runner]: Timeout waiting for worker to respond
Duration: 60.20s
```
The worker timed out at startup without running any tests. Stack trace showed path URL-encoded as `Traceworka%20Projects` — the space in the directory name `Traceworka Projects` was causing the child process (spawned by the `forks` pool) to fail to resolve its working directory.

### Investigation
Vitest v4's default pool is `forks`, which spawns isolated child processes for each test worker. On Windows, when the project path contains spaces, the child process command-line arguments are not properly escaped. The worker starts but cannot locate its module files, causing a silent timeout after 60 seconds.

Root cause: Windows + path with spaces + Vitest forks pool = broken worker IPC.

### Fix
Changed `pool: 'threads'` in `vitest.config.ts`. The `threads` pool uses Node.js worker threads (`worker_threads`) instead of spawning separate processes. Worker threads inherit the parent process's module resolution context and are not affected by path encoding issues.

```typescript
// vitest.config.ts
test: {
  pool: 'threads', // not 'forks' — forks fails on Windows paths with spaces
}
```

After this change: tests ran successfully in 10s (vs 60s timeout).

### Impact
Medium. Without this fix, Vitest would be completely non-functional on this machine. Any developer whose workspace path contains spaces would hit the same issue.

### Lesson
On Windows, always use `pool: 'threads'` in Vitest when the project path contains spaces. The `forks` pool is the default for isolation reasons (true separate processes), but `threads` pool provides sufficient isolation for unit and component tests and avoids this class of path-resolution bug.

---

## [DL-007] @testing-library/dom missing — not auto-installed as peer dep of @testing-library/react v16
**Date:** 30/06/2026  
**Phase:** Phase 2 — Project Initialization  
**Area:** infra/testing  
**Severity:** Low  

### Context
Running Vitest after switching to threads pool (post DL-006).

### Problem
```
Error: Cannot find module '@testing-library/dom'
Require stack:
- node_modules/@testing-library/react/dist/pure.js
```
`@testing-library/react@16.3.2` requires `@testing-library/dom` as a peer dependency, but npm v11 did not auto-install it when we ran `npm install @testing-library/react`.

### Investigation
In `@testing-library/react` v16, `@testing-library/dom` is listed as a `peerDependency` rather than a regular `dependency`. npm v7+ installs peer dependencies automatically, but npm v11 may have stricter peer dep resolution that skipped it — possibly because `@testing-library/dom` was also a peer dep of `@testing-library/jest-dom` and npm deduplicated the install incorrectly.

### Fix
```bash
npm install --save-dev --save-exact @testing-library/dom
```
Installed `@testing-library/dom@10.4.1`. After this, all 3 smoke tests passed.

### Impact
Low. Easy fix. Would have been caught as soon as the first `render()` call appeared in any test.

### Lesson
When installing `@testing-library/react`, always explicitly install `@testing-library/dom` alongside it. They are sister packages that must co-exist in node_modules. Do not rely on peer dep auto-install in npm v11+.

---

## [DL-008] TypeScript strict mode caught two Playwright config errors
**Date:** 30/06/2026  
**Phase:** Phase 2 — Project Initialization  
**Area:** infra/testing  
**Severity:** Low  

### Context
Running `tsc --noEmit` after writing `playwright.config.ts`. Two errors surfaced immediately.

### Problem
```
playwright.config.ts(10,29): error TS4111: Property 'CI' comes from an index signature,
  so it must be accessed with ['CI'].

playwright.config.ts(16,24): error TS2769: No overload matches this call.
  Types of property 'workers' are incompatible.
  Type 'number | undefined' is not assignable to type 'string | number'.
```

**Error 1:** `noPropertyAccessFromIndexSignature: true` (Task 3) requires `process.env['CI']` not `process.env.CI`. `process.env` has an index signature — all property access on index signatures must use bracket notation to make the dynamic access explicit.

**Error 2:** `exactOptionalPropertyTypes: true` (Task 3) means `number | undefined` is not assignable to `string | number` even though `undefined` would normally just mean "omit the property". With this flag, you cannot pass `undefined` as a value — you must not set the property at all.

### Fix
**Error 1:** Extracted `const isCI = !!process.env['CI']` at the top of the file and used `isCI` throughout. Clean, readable, and satisfies the bracket notation requirement.

**Error 2:** Changed from:
```typescript
workers: process.env['CI'] ? 2 : undefined,
```
To a conditional spread that omits the property entirely when not in CI:
```typescript
...(isCI ? { workers: 2 } : {}),
```

### Impact
Low — caught at compile time before any test run. Both patterns (`process.env.PROP` and `value | undefined`) are extremely common across the codebase. Every future contributor who writes config objects or reads from `process.env` will encounter these rules.

### Lesson
`noPropertyAccessFromIndexSignature` requires `obj['key']` for any object with an index signature (`Record<string, ...>`, `process.env`, API response maps, etc.). `exactOptionalPropertyTypes` requires conditional spreads instead of `value | undefined` when a property is meant to be omitted. Both are intentional — the config catches exactly the kind of ambiguous code that causes subtle bugs in clinical data handling.

---

## [DL-009] ShadCN v4 breaking changes — unified radix-ui, Slot.Root, tw-animate-css, oklch, preset system
**Date:** 30/06/2026
**Phase:** Phase 2 — Project Initialization
**Area:** ui/shadcn
**Severity:** Medium

### Context
Running `npx shadcn@latest init` during Task 7 (ShadCN UI + Tailwind v4 setup). Installed version was `shadcn@4.12.0`.

### Discoveries

**1. API has changed significantly from v2/v3 training data.**

Old init flags (`--style`, `--base-color`) are gone. New flags:
- `--template` — framework selection (`next`, `vite`, `react-router`, `laravel`, `astro`)
- `--base` — component library (`radix` or `base`)
- `--preset` — named theme preset (`nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`, `custom`)

**2. `radix-ui` is now a unified package.**

Previously, each Radix primitive was a separate install (`@radix-ui/react-dialog`, `@radix-ui/react-slot`, etc.). In v4, there is a single `radix-ui` package that exports all primitives. Import pattern has changed:

```typescript
// Old (v3 era)
import { Slot } from '@radix-ui/react-slot'

// New (v4 / radix-ui unified)
import { Slot } from 'radix-ui'
const Comp = asChild ? Slot.Root : 'button'  // note: Slot.Root, not Slot directly
```

When writing or reviewing component code, use `radix-ui` imports and `Slot.Root`.

**3. `tw-animate-css` replaces `tailwindcss-animate`.**

Old plugin (`tailwindcss-animate` via `tailwind.config.js` plugins array) is incompatible with Tailwind v4's CSS-based config. The replacement is `tw-animate-css`, imported as a CSS layer:

```css
@import "tw-animate-css";
```

**4. Colors use oklch color space.**

ShadCN v4 generates all color tokens in `oklch()` notation instead of HSL. All `globals.css` custom properties look like `oklch(0.577 0.245 27.325)`. This is correct for Tailwind v4 — do not convert to HSL.

**5. Preset-based theming — `radix-nova` was chosen.**

Style is `radix-nova` in `components.json`. Nova preset: Lucide icons + neutral base color + Geist font. This matches our installed `lucide-react` and the Next.js scaffold's Geist font setup. To add ShadCN components:

```bash
npx shadcn add <component-name>
```

**6. Dark mode via `.dark` class.**

CSS is set up with a `.dark` class (not `prefers-color-scheme` media query). Dark mode can be toggled by adding/removing `.dark` on `<html>`. For Phase 3, implement a `ThemeProvider` wrapper that persists the preference. MYHxCare defaults to light mode (appropriate for clinical environments).

**7. `components.json` has `tailwind.config: ""`.**

Empty string is correct for Tailwind v4 — there is no `tailwind.config.ts`. ShadCN detects this and operates CSS-only. Do not create a `tailwind.config.ts`.

**8. `src/components/ui/` is excluded from ESLint, Prettier, and coverage.**

ShadCN components are vendor code — committed but not authored. The exclusions in `eslint.config.mjs`, `.prettierignore`, and `vitest.config.ts` cover this directory correctly. Modify ShadCN components only by re-running `npx shadcn add --reinstall`.

### Fix / Mitigation
No fixes needed — all patterns documented above are intentional v4 API design. Key rules for Phase 5 and 6 component work:
- Use `radix-ui` imports (not `@radix-ui/react-*`)
- Use `Slot.Root` (not `Slot`)
- Leave oklch colors as-is
- Add components via `npx shadcn add <name>`
- Do not create `tailwind.config.ts`

### Impact
Medium — every component written in Phase 5/6 must use the new import patterns. The unified `radix-ui` package is a significant departure from v2/v3 patterns that will catch every developer coming from older ShadCN knowledge.

### Lesson
Always run `npx shadcn@latest init --help` before running init on a new ShadCN version. The CLI API changes between major versions and interactive prompts (like the preset selector) are easy to miss in a non-TTY background process. Log the version (`shadcn@4.12.0`) in the devlog so future contributors know which API this project was initialized against.

---

## [DL-010] Turbopack (Next.js 16 default) blocks all Webpack-based PWA plugins
**Date:** 30/06/2026
**Phase:** Phase 2 — Project Initialization
**Area:** infra/pwa
**Severity:** High

### Context
Task 12: PWA config. Evaluating `@serwist/next` (the maintained successor to `next-pwa`) vs custom Workbox.

### Problem
Next.js 16 documentation confirms:

> "Turbopack is now the default bundler. To use Webpack run `next dev --webpack` or `next build --webpack`."

`@serwist/next` (and all other next-pwa successors) work by injecting a **Webpack plugin** into the Next.js build pipeline. Turbopack does not support Webpack plugins — only a subset of Webpack loaders (via `turbopack.rules`). Running `next build` with `@serwist/next` installed would either silently fail or error.

The only workaround is `next build --webpack`, which opts out of Turbopack for production builds entirely. This defeats the purpose of upgrading to Next.js 16.

### Decision
**Custom service worker approach — no `@serwist/next`, no `workbox-webpack-plugin`.**

PWA infrastructure created for Phase 2:
- `src/app/manifest.ts` — typed Next.js manifest route convention (auto-serves with correct MIME type)
- `public/sw.js` — plain JS service worker stub served from the root scope
- `src/lib/pwa/ServiceWorkerRegistrar.tsx` — `'use client'` component that registers the SW on load
- `next.config.ts` — `/sw.js` route gets `Cache-Control: public, max-age=0, must-revalidate` + `Service-Worker-Allowed: /`
- `public/sw.js` added to ESLint and Prettier ignore lists (runs in `ServiceWorkerGlobalScope`, not Node/browser)

### Phase 3 plan
Full Workbox integration via `workbox-build` CLI (NOT webpack plugin). The `scripts/build-sw.ts` post-build script will:
1. Inject a precache manifest using `workbox-build.injectManifest()`
2. Add fetch strategies: `StaleWhileRevalidate` for static assets, `NetworkFirst` for API, `NetworkOnly` for critical clinical writes
3. Register background sync for offline draft queue (`workbox-background-sync`)

### Impact
High — blocks `@serwist/next` and any future Webpack-based plugin. But the custom approach gives MORE control over caching strategies for a clinical system where stale clinical data is a patient safety concern.

### Lesson
Before choosing a Next.js plugin, always confirm it supports Turbopack. The distinction between "supports Turbopack loaders" and "supports Turbopack plugins" is critical — plugins require webpack entirely.

---
