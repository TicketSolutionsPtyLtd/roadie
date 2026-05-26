# Shared CartDrawer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Design reference: [`2026-05-26-shared-cart-drawer-design.md`](2026-05-26-shared-cart-drawer-design.md).
> Apply superpowers:test-driven-development for every task (write failing test → run → implement → run → commit).

**Goal:** Extract the website's React CartDrawer into a single staging package
`@oztix/roadie-cart` (subpaths `/core`, `/react`, `/vue`) so both the React
website and the Vue outlet app can consume one shared, framework-agnostic core.

**Architecture:** A framework-agnostic `src/core` (cart client + types + drag
math + formatters + timer logic, no React/Vue, no secrets) with two thin skins
(`src/react`, `src/vue`) on top. Transport is injected (Bring Your Own Fetch);
nothing private is baked in. One package/one version for now; splits into three
packages later.

**Tech Stack:** TypeScript (strict), tsdown (ESM build), Vitest + jsdom,
React 19 + motion + react-focus-lock + @number-flow/react (React skin),
Vue 3 (Vue skin), pnpm workspace + Turborepo.

**Source of truth for ported code:** the private website repo at
`C:/Users/bryce/Documents/GitHub/TicketSolutions.Oztix.Website/src/TicketSolutions.Oztix.Website/src`
(referred to below as `WEBSITE_SRC`). The engineer needs read access to it to
copy component source in Phases 2–3.

**Build order (strict):** Phase 0 (scaffold) → Phase 1 (core) → Phase 2 (React
skin) → Phase 3 (Vue skin) → Phase 4 (app integration). Core has no open
questions; the Vue render-layer decisions are resolved at the start of Phase 3.

---

## Phase 0 — Scaffold the package

### Task 0.1: Create the package directory and `package.json`

**Files:**

- Create: `packages/roadie-cart/package.json`

**Step 1: Write `package.json`**

```json
{
  "name": "@oztix/roadie-cart",
  "version": "0.0.0",
  "description": "Shared cart drawer (core + React + Vue skins) for the Roadie Design System",
  "private": true,
  "type": "module",
  "repository": {
    "type": "git",
    "url": "https://github.com/TicketSolutionsPtyLtd/roadie"
  },
  "files": ["dist"],
  "sideEffects": ["**/*.css"],
  "exports": {
    "./core": {
      "types": "./dist/core/index.d.ts",
      "import": "./dist/core/index.js"
    },
    "./react": {
      "types": "./dist/react/index.d.ts",
      "import": "./dist/react/index.js"
    },
    "./vue": {
      "types": "./dist/vue/index.d.ts",
      "import": "./dist/vue/index.js"
    },
    "./vue/style.css": "./dist/vue/style.css"
  },
  "scripts": {
    "build": "tsdown",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --ignore-path ../../.prettierignore --write \"**/*.{ts,tsx,js,jsx,vue,json,css,md}\""
  },
  "dependencies": {
    "@oztix/roadie-core": "workspace:*"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@oztix/roadie-components": "workspace:*",
    "motion": "^12.0.0",
    "@number-flow/react": "^0.5.0",
    "react-focus-lock": "^2.13.0",
    "vue": "^3.5.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true },
    "@oztix/roadie-components": { "optional": true },
    "motion": { "optional": true },
    "@number-flow/react": { "optional": true },
    "react-focus-lock": { "optional": true },
    "vue": { "optional": true }
  },
  "devDependencies": {
    "@oztix/roadie-components": "workspace:*",
    "@oztix/roadie-core": "workspace:*",
    "@number-flow/react": "^0.5.14",
    "@testing-library/react": "^16.1.0",
    "@testing-library/vue": "^8.1.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitejs/plugin-vue": "^5.2.1",
    "@vitest/coverage-v8": "4.0.4",
    "jsdom": "27.0.1",
    "motion": "^12.38.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-focus-lock": "2.13.7",
    "tsdown": "catalog:",
    "typescript": "catalog:",
    "vitest": "4.0.4",
    "vue": "^3.5.13"
  }
}
```

> Note: pin `tsdown`/`typescript` to whatever the other packages use — copy the
> exact versions from `packages/components/package.json` (it uses `catalog:` or
> a literal; match it). Verify `@testing-library/vue` and `@vitejs/plugin-vue`
> resolve; if not pinned elsewhere, use the latest stable.

**Step 2: Verify the workspace picks it up**

Run: `pnpm install`
Expected: installs without error; `@oztix/roadie-cart` appears in
`pnpm -r list --depth -1`. (`pnpm-workspace.yaml` already globs `packages/*`.)

**Step 3: Commit**

```bash
git add packages/roadie-cart/package.json
git commit -m "chore(cart): scaffold @oztix/roadie-cart package"
```

### Task 0.2: TypeScript, tsdown, and Vitest config

**Files:**

- Create: `packages/roadie-cart/tsconfig.json`
- Create: `packages/roadie-cart/tsdown.config.ts`
- Create: `packages/roadie-cart/vitest.config.ts`
- Create: `packages/roadie-cart/vitest.setup.ts`

**Step 1: `tsconfig.json`** — extend the repo base (copy `extends` target from
`packages/components/tsconfig.json`):

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

> Confirm the actual base config filename by reading
> `packages/components/tsconfig.json` and mirror its `extends`.

**Step 2: `tsdown.config.ts`** — three entries, ESM, emit per-entry dirs:

```ts
import { defineConfig } from 'tsdown'

export default defineConfig(({ watch }) => ({
  entry: ['src/core/index.ts', 'src/react/index.ts', 'src/vue/index.ts'],
  format: ['esm'],
  platform: 'neutral',
  dts: {
    resolve: true,
    compilerOptions: { composite: false, incremental: false }
  },
  sourcemap: true,
  clean: !watch,
  target: 'es2022',
  minify: true,
  shims: true,
  outDir: 'dist',
  outExtensions: () => ({ js: '.js' }),
  deps: {
    neverBundle: [
      'react',
      'react-dom',
      'vue',
      'motion',
      '@number-flow/react',
      'react-focus-lock',
      '@oztix/roadie-core',
      '@oztix/roadie-components'
    ]
  }
}))
```

> The Vue `style.css` emission is added in Phase 3 (needs the Vue plugin). For
> Phases 0–2 the `src/vue/index.ts` entry can be a stub that exports nothing.

**Step 3: `vitest.config.ts`** — React + Vue plugins, jsdom:

```ts
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), vue()],
  resolve: { dedupe: ['react', 'react-dom', 'vue'] },
  server: { fs: { allow: ['../..'] } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true
  },
  ssr: { noExternal: ['@oztix/roadie-core'] }
})
```

**Step 4: `vitest.setup.ts`**:

```ts
import '@testing-library/jest-dom/vitest'
```

> Add `@testing-library/jest-dom` to devDeps if the setup import needs it
> (match what `packages/components/vitest.setup.ts` does — read it first).

**Step 5: Verify the toolchain runs**

Run: `pnpm --filter @oztix/roadie-cart test`
Expected: Vitest starts and reports "No test files found" (exit 0 or the
"no tests" notice) — proves config loads.

**Step 6: Commit**

```bash
git add packages/roadie-cart/tsconfig.json packages/roadie-cart/tsdown.config.ts packages/roadie-cart/vitest.config.ts packages/roadie-cart/vitest.setup.ts
git commit -m "chore(cart): add tsconfig, tsdown, and vitest config"
```

### Task 0.3: Add to Turborepo build graph

**Files:**

- Modify: `turbo.json` (only if packages must be enumerated — they usually
  aren't; the existing `build`/`test` tasks apply to all workspace packages).

**Step 1:** Read `turbo.json`. If tasks are defined globally (no per-package
list), no change needed — confirm and skip. If there's an explicit package
list, add `@oztix/roadie-cart`.

**Step 2: Verify**

Run: `pnpm build --filter @oztix/roadie-cart`
Expected: builds (empty/stub `dist`), `core:build → components:build` ordering
respected because `@oztix/roadie-core` is a dependency.

**Step 3: Commit** (only if `turbo.json` changed).

---

## Phase 1 — Core (framework-agnostic, fully TDD)

All files under `packages/roadie-cart/src/core/`. No React/Vue imports allowed
in this directory.

### Task 1.1: Cart data types

**Files:**

- Create: `packages/roadie-cart/src/core/types.ts`

**Step 1: Write the types** (note the date-contract fields from design #2):

```ts
export interface CartTicket {
  name: string
  quantity: number
  priceEach: number
}

export interface CartEvent {
  eventId: string
  eventName: string
  venueName: string
  imageUrl?: string
  /** ISO 8601 UTC — used for ORDERING only. */
  eventStartAtUtc: string
  /** Venue-local YYYY-MM-DD — used for DAY GROUPING (design finding #2). */
  eventDateKey: string
  /** Optional pre-formatted display string. */
  eventDateDisplay?: string
  tickets: CartTicket[]
  subtotal: number
  bookingFees: number
  total: number
}

export interface CartSummary {
  cartId: string
  ticketCount: number
  cartTotal: number
  expiresAtUtc: string
  eventIds: string[]
}

export interface CartDetails {
  cartId: string
  collectionName: string | null
  logoUrl: string | null
  cartTotal: number
  expiresAtUtc: string
  extrasUrl: string
  events: CartEvent[]
}
```

**Step 2: Typecheck**

Run: `pnpm --filter @oztix/roadie-cart typecheck`
Expected: PASS (types compile).

**Step 3: Commit**

```bash
git add packages/roadie-cart/src/core/types.ts
git commit -m "feat(cart-core): cart data types with eventStartAtUtc + eventDateKey"
```

### Task 1.2: `extrasUrl` validation + `buildCheckoutUrl` (security, design #2)

**Files:**

- Create: `packages/roadie-cart/src/core/url.ts`
- Test: `packages/roadie-cart/src/core/url.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

import { buildCheckoutUrl, isSafeRelativePath } from './url'

describe('isSafeRelativePath', () => {
  it('accepts a single-slash same-origin path', () => {
    expect(isSafeRelativePath('/outlet/extras/abc')).toBe(true)
  })
  it.each([
    ['protocol-relative', '//evil.com/x'],
    ['http', 'http://evil.com'],
    ['https', 'https://evil.com'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/html,x'],
    ['empty', ''],
    ['no leading slash', 'outlet/extras'],
    ['backslash trick', '/\\evil.com'],
    ['whitespace scheme', ' javascript:alert(1)']
  ])('rejects %s', (_label, input) => {
    expect(isSafeRelativePath(input)).toBe(false)
  })
})

describe('buildCheckoutUrl', () => {
  it('concatenates host + valid path', () => {
    expect(buildCheckoutUrl('https://h.example', '/outlet/extras/abc')).toBe(
      'https://h.example/outlet/extras/abc'
    )
  })
  it('works same-origin (empty host)', () => {
    expect(buildCheckoutUrl('', '/outlet/extras/abc')).toBe(
      '/outlet/extras/abc'
    )
  })
  it('returns null for an unsafe extrasUrl', () => {
    expect(buildCheckoutUrl('https://h.example', 'https://evil.com')).toBeNull()
  })
})
```

**Step 2: Run to verify it fails**

Run: `pnpm --filter @oztix/roadie-cart test url`
Expected: FAIL — `isSafeRelativePath`/`buildCheckoutUrl` not defined.

**Step 3: Implement**

```ts
/** True only for same-origin absolute paths: one leading "/", not "//", no scheme. */
export function isSafeRelativePath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) return false
  const trimmed = path.trim()
  if (trimmed !== path) return false // reject leading/trailing whitespace tricks
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.startsWith('/\\')) return false // backslash → treated as // by browsers
  return true
}

/** host + validated extrasUrl, or null if the path is unsafe. */
export function buildCheckoutUrl(
  host: string,
  extrasUrl: string
): string | null {
  if (!isSafeRelativePath(extrasUrl)) return null
  return `${host}${extrasUrl}`
}
```

**Step 4: Run to verify it passes**

Run: `pnpm --filter @oztix/roadie-cart test url`
Expected: PASS (all cases).

**Step 5: Commit**

```bash
git add packages/roadie-cart/src/core/url.ts packages/roadie-cart/src/core/url.test.ts
git commit -m "feat(cart-core): safe extrasUrl validation + buildCheckoutUrl"
```

### Task 1.3: Day grouping (venue-local) + ordering (UTC) — design #2

**Files:**

- Create: `packages/roadie-cart/src/core/grouping.ts`
- Test: `packages/roadie-cart/src/core/grouping.test.ts`

**Step 1: Failing test** — the key regression: near-midnight UTC must group by
venue-local day, and ordering uses UTC.

```ts
import { describe, expect, it } from 'vitest'

import { groupEventsByDay } from './grouping'
import type { CartEvent } from './types'

const ev = (over: Partial<CartEvent>): CartEvent => ({
  eventId: 'e',
  eventName: 'E',
  venueName: 'V',
  eventStartAtUtc: '2026-06-15T10:00:00Z',
  eventDateKey: '2026-06-15',
  tickets: [],
  subtotal: 0,
  bookingFees: 0,
  total: 0,
  ...over
})

describe('groupEventsByDay', () => {
  it('groups by venue-local eventDateKey, not UTC', () => {
    // 22:00 Sydney on 2026-06-15 is 12:00Z on the 15th, but a 23:30 local
    // event can be next-day UTC — eventDateKey keeps it on the local day.
    const events = [
      ev({
        eventId: 'a',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T13:30:00Z'
      }),
      ev({
        eventId: 'b',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T23:30:00Z'
      })
    ]
    const groups = groupEventsByDay(events)
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('2026-06-15')
    expect(groups[0].events.map((e) => e.eventId)).toEqual(['a', 'b'])
  })

  it('orders groups and events by eventStartAtUtc ascending', () => {
    const events = [
      ev({
        eventId: 'late',
        eventDateKey: '2026-06-16',
        eventStartAtUtc: '2026-06-16T01:00:00Z'
      }),
      ev({
        eventId: 'early',
        eventDateKey: '2026-06-15',
        eventStartAtUtc: '2026-06-15T09:00:00Z'
      })
    ]
    const groups = groupEventsByDay(events)
    expect(groups.map((g) => g.key)).toEqual(['2026-06-15', '2026-06-16'])
  })
})
```

**Step 2: Run — expect FAIL** (`groupEventsByDay` not defined).
Run: `pnpm --filter @oztix/roadie-cart test grouping`

**Step 3: Implement**

```ts
import type { CartEvent } from './types'

export interface DayGroup {
  key: string // venue-local YYYY-MM-DD
  events: CartEvent[]
}

export function groupEventsByDay(events: CartEvent[]): DayGroup[] {
  const ordered = [...events].sort((a, b) =>
    a.eventStartAtUtc.localeCompare(b.eventStartAtUtc)
  )
  const map = new Map<string, CartEvent[]>()
  for (const e of ordered) {
    const bucket = map.get(e.eventDateKey)
    if (bucket) bucket.push(e)
    else map.set(e.eventDateKey, [e])
  }
  return Array.from(map.entries())
    .map(([key, evs]) => ({ key, events: evs }))
    .sort((a, b) => a.key.localeCompare(b.key))
}
```

**Step 4: Run — expect PASS.**

**Step 5: Commit**

```bash
git add packages/roadie-cart/src/core/grouping.ts packages/roadie-cart/src/core/grouping.test.ts
git commit -m "feat(cart-core): venue-local day grouping with UTC ordering"
```

### Task 1.4: Formatters (currency + date) — design #1

**Files:**

- Create: `packages/roadie-cart/src/core/format.ts`
- Test: `packages/roadie-cart/src/core/format.test.ts`

**Step 1: Failing test** — guards the hardcoded-`$`/AUD regression.

```ts
import { describe, expect, it } from 'vitest'

import { formatCurrency, formatDayHeader } from './format'

describe('formatCurrency', () => {
  it('formats AUD in en-AU', () => {
    expect(formatCurrency(12.5, { locale: 'en-AU', currency: 'AUD' })).toBe(
      '$12.50'
    )
  })
  it('formats NZD in en-NZ (no hardcoded $ / AUD)', () => {
    const out = formatCurrency(12.5, { locale: 'en-NZ', currency: 'NZD' })
    expect(out).toContain('12.50')
    expect(out).toContain('$') // en-NZ uses $ but the currency is NZD
  })
})

describe('formatDayHeader', () => {
  it('formats a venue-local key into a readable header', () => {
    const out = formatDayHeader('2026-06-15', { locale: 'en-AU' })
    expect(out).toMatch(/2026/)
    expect(out).toMatch(/June|Jun/)
  })
})
```

**Step 2: Run — expect FAIL.**

**Step 3: Implement**

```ts
export interface CurrencyOptions {
  locale: string
  currency: string
}
export interface DateOptions {
  locale: string
}

export function formatCurrency(amount: number, opts: CurrencyOptions): string {
  return amount.toLocaleString(opts.locale, {
    style: 'currency',
    currency: opts.currency
  })
}

/** Format a venue-local YYYY-MM-DD key as a day header (parsed as local date). */
export function formatDayHeader(dateKey: string, opts: DateOptions): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1) // local; no UTC shift
  if (Number.isNaN(date.getTime())) return dateKey
  return new Intl.DateTimeFormat(opts.locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}
```

**Step 4: Run — expect PASS.**

**Step 5: Commit**

```bash
git add packages/roadie-cart/src/core/format.ts packages/roadie-cart/src/core/format.test.ts
git commit -m "feat(cart-core): locale/currency-aware formatters"
```

### Task 1.5: Drag snap math (port `decideSnapTarget`)

**Files:**

- Create: `packages/roadie-cart/src/core/snap.ts`
- Test: `packages/roadie-cart/src/core/snap.test.ts`

**Step 1: Failing test** (covers the strict-threshold and midpoint rules):

```ts
import { describe, expect, it } from 'vitest'

import { decideSnapTarget } from './snap'

const base = {
  offset: 0,
  currentState: 'closed' as const,
  closedY: 300,
  openY: 0
}

describe('decideSnapTarget', () => {
  it('upward flick opens', () => {
    expect(decideSnapTarget({ ...base, velocity: -600 })).toBe('open')
  })
  it('downward flick closes', () => {
    expect(
      decideSnapTarget({ ...base, velocity: 600, currentState: 'open' })
    ).toBe('closed')
  })
  it('exactly -500 falls through to position', () => {
    // startY=closedY=300, offset 0 → currentY 300 > midpoint 150 → closed
    expect(decideSnapTarget({ ...base, velocity: -500 })).toBe('closed')
  })
  it('exact midpoint keeps state', () => {
    expect(decideSnapTarget({ ...base, velocity: 0, offset: -150 })).toBe(
      'closed'
    )
  })
})
```

**Step 2: Run — expect FAIL.**

**Step 3: Implement** — copy `decideSnapTarget.ts` verbatim from
`WEBSITE_SRC/components/Cart/decideSnapTarget.ts` into `snap.ts` (the function
is already pure and framework-free).

**Step 4: Run — expect PASS.**

**Step 5: Commit**

```bash
git add packages/roadie-cart/src/core/snap.ts packages/roadie-cart/src/core/snap.test.ts
git commit -m "feat(cart-core): port decideSnapTarget drag math"
```

### Task 1.6: Urgency-timer state machine

**Files:**

- Create: `packages/roadie-cart/src/core/urgency.ts`
- Test: `packages/roadie-cart/src/core/urgency.test.ts`

**Step 1: Failing test** (thresholds from `CartUrgencyBadge.tsx`: <120 danger,
<300 warning, else success; null/≤0 handling):

```ts
import { describe, expect, it } from 'vitest'

import { remainingSeconds, urgencyLevel } from './urgency'

describe('urgencyLevel', () => {
  it.each([
    [null, 'success'],
    [600, 'success'],
    [300, 'warning'],
    [299, 'warning'],
    [120, 'danger'],
    [1, 'danger'],
    [0, 'expired']
  ])('remaining %s → %s', (rem, level) => {
    expect(urgencyLevel(rem as number | null)).toBe(level)
  })
})

describe('remainingSeconds', () => {
  it('computes floor of (expiry - now) clamped at 0', () => {
    const now = Date.parse('2026-06-15T00:00:00Z')
    expect(remainingSeconds('2026-06-15T00:02:30Z', now)).toBe(150)
    expect(remainingSeconds('2026-06-14T23:00:00Z', now)).toBe(0)
  })
  it('returns null when no expiry', () => {
    expect(remainingSeconds(undefined, Date.now())).toBeNull()
  })
})
```

**Step 2: Run — expect FAIL.**

**Step 3: Implement**

```ts
export type UrgencyLevel = 'success' | 'warning' | 'danger' | 'expired'

export function urgencyLevel(remaining: number | null): UrgencyLevel {
  if (remaining === null) return 'success'
  if (remaining <= 0) return 'expired'
  if (remaining < 120) return 'danger'
  if (remaining < 300) return 'warning'
  return 'success'
}

export function remainingSeconds(
  expiresAtUtc: string | undefined,
  now: number
): number | null {
  if (!expiresAtUtc) return null
  return Math.max(
    0,
    Math.floor((new Date(expiresAtUtc).getTime() - now) / 1000)
  )
}
```

> Design note: in the original, `remaining > 0` gates the countdown display and
> `<120 → danger` etc. The website never modelled an explicit `expired` state;
> we add it so skins can fire `onExpire` (design finding #10). Confirm against
> `WEBSITE_SRC/components/Cart/CartUrgencyBadge.tsx` that 120/300 are right.

**Step 4: Run — expect PASS. Step 5: Commit**

```bash
git add packages/roadie-cart/src/core/urgency.ts packages/roadie-cart/src/core/urgency.test.ts
git commit -m "feat(cart-core): urgency-timer state machine"
```

### Task 1.7: Cart client (Bring Your Own Fetch)

**Files:**

- Create: `packages/roadie-cart/src/core/client.ts`
- Test: `packages/roadie-cart/src/core/client.test.ts`

**Step 1: Failing test** — paths built against injected host/fetch; checkout
delegates to `buildCheckoutUrl`; same-origin works.

```ts
import { describe, expect, it, vi } from 'vitest'

import { createCartClient } from './client'

const okFetch = (body: unknown) =>
  vi.fn(async () => ({ ok: true, json: async () => body }) as Response)

describe('createCartClient', () => {
  it('builds the summary path against the injected host', async () => {
    const fetchMock = okFetch({
      cartId: 'c',
      ticketCount: 1,
      cartTotal: 10,
      expiresAtUtc: 'x',
      eventIds: []
    })
    const cart = createCartClient({
      host: 'https://h.example',
      fetch: fetchMock
    })
    await cart.getSummary('col-1')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://h.example/outlet/api/collection/col-1/cart/summary',
      expect.anything()
    )
  })

  it('works same-origin with empty host', async () => {
    const fetchMock = okFetch({ events: [] })
    const cart = createCartClient({ host: '', fetch: fetchMock })
    await cart.getDetails('col-1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/outlet/api/collection/col-1/cart',
      expect.anything()
    )
  })

  it('encodes the collectionId', async () => {
    const fetchMock = okFetch({})
    const cart = createCartClient({ host: '', fetch: fetchMock })
    await cart.getSummary('a/b')
    expect(fetchMock).toHaveBeenCalledWith(
      '/outlet/api/collection/a%2Fb/cart/summary',
      expect.anything()
    )
  })

  it('checkoutUrl delegates to safe builder', () => {
    const cart = createCartClient({ host: 'https://h.example' })
    expect(cart.checkoutUrl({ extrasUrl: '/outlet/extras/x' } as any)).toBe(
      'https://h.example/outlet/extras/x'
    )
    expect(
      cart.checkoutUrl({ extrasUrl: 'https://evil.com' } as any)
    ).toBeNull()
  })

  it('returns null on non-ok response', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false }) as Response)
    const cart = createCartClient({ host: '', fetch: fetchMock })
    expect(await cart.getSummary('c')).toBeNull()
  })
})
```

**Step 2: Run — expect FAIL.**

**Step 3: Implement**

```ts
import type { CartDetails, CartSummary } from './types'
import { buildCheckoutUrl } from './url'

export interface CartClientOptions {
  /** Base host. Empty string for same-origin. Never hardcode in this package. */
  host: string
  /** Injected transport. Defaults to global fetch. */
  fetch?: typeof fetch
}

export interface CartClient {
  getSummary(collectionId: string): Promise<CartSummary | null>
  getDetails(collectionId: string): Promise<CartDetails | null>
  checkoutUrl(details: Pick<CartDetails, 'extrasUrl'>): string | null
}

export function createCartClient(options: CartClientOptions): CartClient {
  const { host } = options
  const doFetch = options.fetch ?? globalThis.fetch

  async function get<T>(path: string): Promise<T | null> {
    const res = await doFetch(`${host}${path}`, { credentials: 'include' })
    if (!res.ok) return null
    return (await res.json()) as T
  }

  return {
    getSummary: (id) =>
      get<CartSummary>(
        `/outlet/api/collection/${encodeURIComponent(id)}/cart/summary`
      ),
    getDetails: (id) =>
      get<CartDetails>(`/outlet/api/collection/${encodeURIComponent(id)}/cart`),
    checkoutUrl: (details) => buildCheckoutUrl(host, details.extrasUrl)
  }
}
```

> The `{ credentials: 'include' }` default is fine for both apps; an injected
> `fetch` can override. Verify endpoint paths against
> `WEBSITE_SRC/utils/hooks/useCollectionCart.ts` + `useCollectionCartDetails.ts`.

**Step 4: Run — expect PASS. Step 5: Commit**

```bash
git add packages/roadie-cart/src/core/client.ts packages/roadie-cart/src/core/client.test.ts
git commit -m "feat(cart-core): BYOF cart client"
```

### Task 1.8: Core barrel export

**Files:**

- Create: `packages/roadie-cart/src/core/index.ts`

**Step 1:** Re-export the public surface:

```ts
export * from './types'
export * from './url'
export * from './grouping'
export * from './format'
export * from './snap'
export * from './urgency'
export * from './client'
```

**Step 2: Verify build + types**

Run: `pnpm --filter @oztix/roadie-cart build && pnpm --filter @oztix/roadie-cart typecheck`
Expected: `dist/core/index.js` + `dist/core/index.d.ts` emitted; typecheck PASS.

**Step 3: Commit**

```bash
git add packages/roadie-cart/src/core/index.ts
git commit -m "feat(cart-core): public barrel export"
```

### Task 1.9: CI secret-guard test (design Decision)

**Files:**

- Create: `packages/roadie-cart/src/core/secret-guard.test.ts`

**Step 1: Write the test** — scans the package's own `src` for hardcoded
domains / key-shaped literals, excluding test files and allowed sample strings.

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { glob } from 'tinyglobby'
import { describe, expect, it } from 'vitest'

// or fast-glob — match what the repo already has

const SRC = join(__dirname, '..')

// Allowlist: relative API paths are fine; only absolute hosts/keys are banned.
const BANNED = [
  /https?:\/\/[a-z0-9.-]+/i, // absolute http(s) host
  /[A-Za-z0-9+/]{40,}={0,2}/, // long base64-ish (key-shaped)
  /(sk|pk|key|secret|token)[_-][A-Za-z0-9]{16,}/i
]

describe('secret-guard: no hardcoded hosts or keys in cart src', () => {
  it('source files contain no banned patterns', async () => {
    const files = await glob(['**/*.{ts,tsx,vue}', '!**/*.test.*'], {
      cwd: SRC,
      absolute: true
    })
    const offenders: string[] = []
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      for (const re of BANNED) {
        const m = text.match(re)
        if (m) offenders.push(`${f}: ${m[0]}`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
```

**Step 2: Run — expect PASS** (core has only relative paths). If it flags a
sourcemap/base64 false-positive, tighten the regex or scope to non-generated
files. Use whichever glob lib the repo already depends on.

**Step 3: Commit**

```bash
git add packages/roadie-cart/src/core/secret-guard.test.ts
git commit -m "test(cart-core): CI guard against hardcoded hosts/keys"
```

### Task 1.10: Coverage gate for core

**Step 1:** Run `pnpm --filter @oztix/roadie-cart test:coverage`. Confirm core
modules are at/near 100% (they're pure). Add any missing edge-case tests
(e.g. `groupEventsByDay([])` returns `[]`; `formatCurrency` with 0).

**Step 2: Commit** any added tests.

---

## Phase 2 — React skin

All files under `packages/roadie-cart/src/react/`. This is largely a **port +
rewire** of existing reviewed components, not net-new logic. For each ported
file: copy from `WEBSITE_SRC/components/Cart/` (or `components/Collection/` for
`CartEventGroup.tsx`), then apply the edits below. Keep `'use client'`
directives.

### Task 2.1: Port the data hooks onto the core client

**Files:**

- Create: `packages/roadie-cart/src/react/useCart.ts`
- Test: `packages/roadie-cart/src/react/useCart.test.tsx`

Replace the website's `useCollectionCart` / `useCollectionCartDetails` (which
read `window.config` + build URLs inline) with hooks that take the **core
client** and use React Query:

```ts
import { useQuery } from '@tanstack/react-query'

import type { CartClient } from '../core'

export function useCartSummary(cart: CartClient, collectionId: string) {
  return useQuery({
    queryKey: ['roadieCartSummary', collectionId],
    queryFn: () => cart.getSummary(collectionId),
    staleTime: 0
  })
}
export function useCartDetails(cart: CartClient, collectionId: string) {
  return useQuery({
    queryKey: ['roadieCartDetails', collectionId],
    queryFn: () => cart.getDetails(collectionId),
    staleTime: 0
  })
}
```

> `@tanstack/react-query` becomes a peer dep of the React entry (add to
> `peerDependencies` + `peerDependenciesMeta.optional`). Test with a
> `QueryClientProvider` wrapper and a mock `CartClient`.
> **refreshKey (design #6):** the `<CartDrawer>` prop `refreshKey` is folded
> into the query key (`['roadieCartSummary', collectionId, refreshKey]`) so a
> bump forces a refetch.

TDD: write a test that mounts the hook with a mock client, asserts it fetches;
bump `refreshKey` → asserts refetch. Commit.

### Task 2.2: Port `CartUrgencyBadge` onto core `urgency`

**Files:**

- Create: `packages/roadie-cart/src/react/CartUrgencyBadge.tsx`
- Test: `.../CartUrgencyBadge.test.tsx`

Copy the file; replace its inline countdown/threshold logic with
`remainingSeconds` + `urgencyLevel` from core. Keep `useSyncExternalStore` for
the 1s tick. TDD: render with an expiry 90s out → asserts `intent="danger"`;
3m out → `warning`. Commit.

### Task 2.3: Port `CartEventGroup` (currency via core)

**Files:** Create `.../CartEventGroup.tsx` + test.

Copy from `WEBSITE_SRC/components/Collection/CartEventGroup.tsx`. Replace
hardcoded `$`/`NumberFlow` prefix and any `toLocaleString` with the injected
`formatCurrency` (locale/currency passed down via props/context — design #1).
Keep the plain `<img>` (image-URL contract is "absolute/resolvable", not CORS).
TDD: render with NZD → asserts NZD formatting, no literal AUD `$` assumption.
Commit.

### Task 2.4: Port `CartContents` (grouping + drop LinkButton)

**Files:** Create `.../CartContents.tsx` + test.

Edits when porting:

- Replace `groupByDay` with core `groupEventsByDay` (uses `eventDateKey`).
- Replace `formatDayHeader` with core `formatDayHeader`.
- **Drop `LinkButton`/`next/link`** (design dynamic-links audit): render the
  checkout CTA as a Roadie `Button` (from `@oztix/roadie-components`) that calls
  `onNavigate(checkoutUrl)` — no `href` import of `next/link`.
- Replace the empty-state's hardcoded `/collection/?id=` with the `browseHref`
  prop.
- Currency via injected `formatCurrency`.

TDD: empty cart → uses `browseHref`; non-empty → renders day groups in order;
clicking checkout calls `onNavigate` with the validated URL. Commit.

### Task 2.5: Port the drag hook + bounce

**Files:** Create `.../useCartDrawerDrag.ts`, `.../useCartBounce.ts` + tests.

Copy both; swap the inline snap decision for core `decideSnapTarget`. These use
`motion` (`useMotionValue`/`animate`) and `window`/`ResizeObserver` — keep as-is
(motion is a React-entry peer). TDD where practical (the pure parts already
covered in core; assert the hook wires snap results to state).

### Task 2.6: Port `CartDrawer` + wire props

**Files:** Create `.../CartDrawer.tsx` + test; `.../index.ts` barrel.

Port `CartDrawer.tsx`; apply the design's prop API:

- `cart: CartClient`, `collectionId`, **`onNavigate` (required)**, `browseHref`,
  `locale`, `currency`, optional `refreshKey`, `lockBodyScroll`, `initialState`,
  `onOpenChange`, `onExpire`, optional `onHeightChange`.
- Data via `useCartSummary`/`useCartDetails` (Task 2.1), not `window.config`.
- Checkout URL via `cart.checkoutUrl(details)`.
- Keep `react-focus-lock`, `LazyMotion`, the `--cart-drawer-height` CSS-var
  effect (design #5) **and** call `onHeightChange?.(closedHeight)` alongside it.
- Fire `onOpenChange` on state changes; fire `onExpire` when `urgencyLevel`
  hits `expired`.

`src/react/index.ts`:

```ts
export { CartDrawer } from './CartDrawer'
export type { CartDrawerProps } from './CartDrawer'
```

TDD (behaviour, with mock `CartClient` + `QueryClientProvider`):

- `onNavigate` fires with the validated checkout URL on checkout.
- `browseHref` used in the empty state.
- `refreshKey` bump refetches.
- `onOpenChange(true)` fires when opened; `onExpire` fires at 0.
- No import of `next/link` anywhere in `src/react` (add a grep test).

Run full suite + build + typecheck. Commit.

### Task 2.7: React skin secret-guard + lint

Extend the secret-guard glob to include `src/react`. Run `pnpm lint`,
`pnpm typecheck`, `pnpm build`. Commit.

---

## Phase 3 — Vue skin

**Resolve the deferred decisions first (design Open Questions):**

1. **Data layer:** `@tanstack/vue-query` (recommended — mirrors React) vs plain
   `ref`+`onMounted`.
2. **Animation engine:** `motion` (vanilla) vs `@vueuse/motion` vs CSS.
3. **Focus trap:** `focus-trap` / `focus-trap-vue` vs custom directive.

Record the choices at the top of Phase 3 before coding. Add chosen libs as
Vue-entry peers (optional via `peerDependenciesMeta`).

### Task 3.1: tsdown + Vite Vue plugin for SFC build + CSS emit

Add `@vitejs/plugin-vue` (or tsdown's Vue support) so `src/vue/*.vue` compile
and a `style.css` is emitted to `dist/vue/style.css`. Verify
`@oztix/roadie-cart/vue/style.css` resolves. Commit.

### Task 3.2: Vue cart composable on the core client

`useCart(cart, collectionId, refreshKey)` returning reactive `summary`/`details`
/`loading`/`error`, using the chosen data layer. Calls the **same**
`cart.getSummary/getDetails`. TDD with `@testing-library/vue` + mock client.

### Task 3.3–3.6: Port the drawer UI to Vue SFCs

Re-implement `CartDrawer`, `CartContents`, `CartEventGroup`, `CartUrgencyBadge`
as `.vue` components using the **same core** (`groupEventsByDay`, `formatCurrency`,
`urgencyLevel`, `remainingSeconds`, `decideSnapTarget`, `buildCheckoutUrl`).
Same prop names as React (`cart`, `collectionId`, `onNavigate` required,
`browseHref`, `locale`, `currency`, `refreshKey`, `onOpenChange`, `onExpire`,
`onHeightChange`). Chosen animation + focus-trap libs supply the render-layer
behaviour. Ship scoped styles → compiled `style.css`. `src/vue/index.ts`
exports `CartDrawer`.

TDD (behaviour parity with React): `onNavigate` on checkout, `browseHref` empty
state, `refreshKey` refetch, `onOpenChange`/`onExpire`, venue-local grouping
order. Commit per component.

### Task 3.7: Vue skin secret-guard + build

Extend the secret-guard glob to `src/vue`. `pnpm build` emits all three entries

- `style.css`. Full suite green. Commit.

---

## Phase 4 — App integration (separate repos; do after package is green)

> These changes land in the **private app repos**, not in roadie. Each is its
> own PR. Listed here so the work is tracked; expand into a per-repo plan when
> starting.

### Task 4.1: Website (React)

- Add `@oztix/roadie-cart` dep.
- Create the cart client once: `createCartClient({ host: config.outletHost,
fetch: (u,i)=>fetch(u,{...i,credentials:'include'}) })`.
- Replace the in-repo `CartDrawer` usage with `@oztix/roadie-cart/react`,
  passing `onNavigate={router.push}`, `browseHref`, `locale='en-AU'`,
  `currency='AUD'`. Keep `CartDrawerMount` (route gating) in the app.
- API: add `eventStartAtUtc` + `eventDateKey` to the cart details response
  (design #2) if not already ISO.
- Delete the now-duplicated in-repo cart components (or leave until cutover).

### Task 4.2: Outlet app (Vue)

- Add `@oztix/roadie-cart` dep.
- **Webpack (design #8):** add a `.css` rule whose `include` covers
  `node_modules/@oztix/roadie-cart/dist/vue`, OR route the CSS via SCSS. Then
  `import '@oztix/roadie-cart/vue/style.css'`.
- Register `<cart-drawer>` globally in `common.js`'s `createApp`.
- Create client with `host: ''` (same-origin), native `fetch`.
- Mount in the Razor view; `onNavigate = (href)=>window.location.assign(href)`.
- **Refresh (design #6):** in `handleAddToCartSuccess`, bump a `cartRefreshKey`
  bound to the drawer's `refreshKey` prop.
- **API (design #2):** add `eventStartAtUtc` + venue-local `eventDateKey` to the
  cart response (its `CartResponseExtensions` currently maps a display string).
- Mount client-side only (Razor SSRs the page; drawer touches `window`).

---

## Definition of done (package)

- `pnpm --filter @oztix/roadie-cart test` green; core coverage ~100%.
- `pnpm --filter @oztix/roadie-cart build` emits `dist/{core,react,vue}/index.js`
  - `.d.ts` + `dist/vue/style.css`.
- `pnpm --filter @oztix/roadie-cart typecheck` + `lint` clean.
- Secret-guard test passes across `src/core`, `src/react`, `src/vue`.
- No `next/link` (or any framework-router) import inside the package.
- Both skins expose the identical prop API.
