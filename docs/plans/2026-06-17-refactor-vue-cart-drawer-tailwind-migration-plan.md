# Vue Cart Drawer Tailwind Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Roadie Vue cart-drawer skin from hand-written `rc-` CSS + inline SVGs to the same raw Roadie/Tailwind utility classes the React skin uses (reusing Roadie core's existing Tailwind v4 build via the host — a single source of truth) and `@phosphor-icons/vue` icons, so styling is structurally consistent across core → React → Vue.

**Architecture:** Roadie core is already a Tailwind v4 layer ([`packages/core/src/css/roadie.css:1`](../../packages/core/src/css/roadie.css) → `@import 'tailwindcss'` plus `@theme`/`@utility` directives). The React skin reuses it by emitting utility class strings that the **host app's** Tailwind build compiles (host does `@import '@oztix/roadie-core/css'` + `@source` the dist). This plan makes the Vue skin a peer consumer of that same build: templates emit identical Roadie utilities, the host imports Roadie core CSS and `@source`-scans the widget dist, and only a tiny widget-owned `motion.css` (bespoke cart keyframes that are not design tokens) ships from the package. This is a **breaking** integration-contract change (the Oztix Vue/Webpack host must now run Tailwind v4) → **major version bump (`2.x` → `3.0.0`)**.

**Tech Stack:** Vue 3 SFC, Tailwind CSS v4, `@oztix/roadie-core` utilities, `@phosphor-icons/vue`, tsdown + `@vitejs/plugin-vue`, Vitest + `@vue/test-utils`, `vue-tsc`.

---

## Decisions locked / for reviewer sign-off

These came out of the feasibility investigation. Defaults are chosen; flag during review if any should change.

| #   | Decision                                           | Chosen approach                                                                                                                                                                                                       | Why                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **CSS delivery**                                   | **Option B — reuse host's Roadie/Tailwind build.** Vue emits raw utilities; host imports `@oztix/roadie-core/css` + `@source`-scans widget dist.                                                                      | Single source of truth; core/React/Vue stay in sync. Option A (self-contained compile) ships a frozen copy that drifts.                                                                                                                 |
| D2  | **Versioning**                                     | Breaking contract change → bump `@oztix/roadie-widgets` to **`3.0.0`**; document host setup in README + CHANGELOG.                                                                                                    | Hosts that don't add Tailwind+Roadie render the drawer unstyled — must be a loud major.                                                                                                                                                 |
| D3  | **Bespoke keyframes** (`cart-bounce`, `badge-pop`) | Ship a tiny **`cart-drawer/vue/motion.css`** (~30 lines: 2 keyframes + `prefers-reduced-motion` guards) from the widget; host imports it. Stock `pulse`/`spin`/`dot-pulse` → Tailwind `animate-pulse`/`animate-spin`. | These are widget-specific animations, not design tokens — they don't belong in core, and they must not depend on the host defining them (React's current undefined-keyframe footgun). Aligning React to the same source is a follow-up. |
| D4  | **Overlay blur**                                   | Adopt `emphasis-overlay` → `backdrop-filter: blur(8px)` (Roadie value), replacing the Vue skin's hand-rolled `blur(2px)`.                                                                                             | Consistency is the whole point; the 2px was a hand-rolled approximation. Visual delta — confirm acceptable.                                                                                                                             |
| D5  | **Button height**                                  | Map `.rc-button` (2.75rem) → Roadie `btn-md` (2.5rem) to match what React's `Button` renders; `.rc-button--sm` → `btn-sm` (2rem).                                                                                     | React uses `<Button>` defaults; mirroring removes the non-standard 2.75rem tier.                                                                                                                                                        |
| D6  | **Ticket row layout**                              | Adopt React's responsive split (`md:hidden` mobile name + `hidden md:block` desktop name + `flex flex-1 justify-center` qty).                                                                                         | The Vue skin's flat row is a real divergence from React today; a faithful port reaches parity. Confirm — this is an intentional layout change, not just a class swap.                                                                   |
| D7  | **Confirm-popover focus parity**                   | **Keep** the hand-rolled Vue confirm (click-outside + Escape). Full focus-trap/return-focus parity with React's Base UI Popover is a **separate behavioral task**, out of scope here.                                 | Styling migration is orthogonal to focus behavior; the parity gap pre-exists and isn't created or fixed by this change.                                                                                                                 |
| D8  | **React `Popover.Title` fix**                      | Apply the independent reviewer fix (`Popover.Header` > `Popover.Title`) in the React skin as Phase 0 — shippable on its own.                                                                                          | Unblocks one PR comment immediately; zero coupling to the Vue work.                                                                                                                                                                     |

**Answer to Luke's "will keyboard/focus work the same as the React Dialog?":** The _drawer_ is already at parity (Vue `focus-trap` ≈ React `react-focus-lock`: trap-on-open, return-focus-on-close, Escape, click-outside). The _confirm popover_ is **not** at full parity today (hand-rolled Vue version doesn't trap/return focus like Base UI). Neither is touched by this styling migration — see D7.

---

## Integration contract change (BREAKING — host-side, document prominently)

After this migration the Vue host **must** do what every React Roadie consumer already does:

```js
// 1. Run Tailwind v4 in the host build.
// 2. In the host's global CSS:
@import '@oztix/roadie-core/css';
@source "../node_modules/@oztix/roadie-widgets/dist/cart-drawer/vue";

// 3. Import the widget's bespoke keyframes:
import '@oztix/roadie-widgets/cart-drawer/vue/motion.css'  // was: .../style.css
```

A host that loads neither Tailwind nor Roadie core CSS gets an **unstyled** drawer. This is intentional (D1/D2). Hosts that genuinely cannot run Tailwind are not supported by `3.0.0` — they stay on `2.x`.

---

## File structure

**Modified (templates → utilities + icons + data-attrs):**

- `packages/widgets/src/cart-drawer/vue/CartDrawer.vue` — overlay, shell, body, lock, skeleton, spinner; the Escape-guard JS hook
- `packages/widgets/src/cart-drawer/vue/CartDrawerHeader.vue`
- `packages/widgets/src/cart-drawer/vue/CartDrawerFooter.vue`
- `packages/widgets/src/cart-drawer/vue/CartContents.vue`
- `packages/widgets/src/cart-drawer/vue/CartEventGroup.vue` — event row, tickets, confirm popover, `data-cart-confirm`
- `packages/widgets/src/cart-drawer/vue/CartEmptyState.vue`
- `packages/widgets/src/cart-drawer/vue/CartUrgencyBadge.vue`
- `packages/widgets/src/cart-drawer/vue/CartExpiryModal.vue`
- `packages/widgets/src/cart-drawer/vue/CartExpiryModals.vue`

**Created:**

- `packages/widgets/src/cart-drawer/vue/motion.css` — bespoke keyframes only (`cart-bounce`, `badge-pop`, reduced-motion guards)

**Deleted:**

- `packages/widgets/src/cart-drawer/vue/style.css` — replaced by host-compiled utilities + `motion.css`

**Modified (build / config / docs):**

- `packages/widgets/tsdown.config.ts:23` — change `copy` from `style.css` → `motion.css`
- `packages/widgets/package.json` — exports (`./cart-drawer/vue/style.css` → `./cart-drawer/vue/motion.css`), add `@phosphor-icons/vue` optional peer + devDep, add it to the Vue `size-limit` ignore array, bump version to `3.0.0`
- `packages/widgets/README.md:50-84` — new Vue integration contract
- `packages/widgets/CHANGELOG.md` — breaking-change entry

**Modified (tests — re-point selectors to data-attributes):**

- `packages/widgets/src/cart-drawer/vue/CartDrawer.test.ts` — `.rc-badge__count` (314,338), `.rc-header__price-text` (316,339), `.rc-footer__fees` (393,425), `.rc-confirm` comment (484)
- `packages/widgets/src/cart-drawer/vue/CartContents.test.ts:76` — `.rc-group__title`
- `packages/widgets/src/cart-drawer/vue/CartUrgencyBadge.test.ts:44` — `.rc-badge__time`

**Modified (React — independent Phase 0):**

- `packages/widgets/src/cart-drawer/react/CartEventGroup.tsx:98-106`

---

## Phase 0 — React `Popover.Title` fix (independent, shippable alone)

### Task 0: Replace raw `<p>` + `aria-label` with `Popover.Header` > `Popover.Title`

**Files:**

- Modify: `packages/widgets/src/cart-drawer/react/CartEventGroup.tsx:98-106`
- Test: `packages/widgets/src/cart-drawer/react/CartEventGroup.test.tsx`

- [ ] **Step 1: Strengthen the test to assert the accessible name**

In `CartEventGroup.test.tsx`, after the confirm popover is opened, add (next to the existing `findByText('Remove all tickets for this event?')`):

```tsx
expect(
  await screen.findByRole('dialog', {
    name: 'Remove all tickets for this event?'
  })
).toBeInTheDocument()
```

- [ ] **Step 2: Run it — expect PASS already (aria-label currently supplies the name), or FAIL if the popup role differs**

Run: `pnpm --filter @oztix/roadie-widgets test -- CartEventGroup`
Expected: the new assertion passes via the current `aria-label`. (If it fails because the popup isn't `role=dialog`, note it — Base UI Popover popups are dialogs.)

- [ ] **Step 3: Apply the fix**

Replace lines 98-106:

```tsx
// BEFORE
<Popover.Content
  intent='danger'
  aria-label='Remove all tickets for this event?'
>
  <Popover.Body>
    <p className='text-ui text-pretty text-strong'>
      Remove all tickets for this event?
    </p>
  </Popover.Body>
```

```tsx
// AFTER
<Popover.Content intent='danger'>
  <Popover.Header>
    <Popover.Title>Remove all tickets for this event?</Popover.Title>
  </Popover.Header>
```

The `<Popover.Footer>` (Cancel / Remove) block at lines 107-127 and the closing `</Popover.Content>` are unchanged. `Popover.Title` (Base UI–backed) auto-wires `aria-labelledby`, so the manual `aria-label` is removed.

- [ ] **Step 4: Run tests — expect PASS (text unchanged, now a titled dialog)**

Run: `pnpm --filter @oztix/roadie-widgets test -- CartEventGroup CartDrawer`
Expected: PASS. Existing `findByText('Remove all tickets for this event?')` still matches the Title text.

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/cart-drawer/react/CartEventGroup.tsx packages/widgets/src/cart-drawer/react/CartEventGroup.test.tsx
git commit -m "fix(cart-drawer): use Popover.Header/Title for the React remove confirm"
```

> Note: `Popover.Title` renders `text-display-ui-6 text-strong` vs the old `text-ui`. If the prior type scale must be kept exactly, pass `className='text-ui text-pretty'` to `Popover.Title` (D-flag).

---

## Phase 1 — Decouple behavior & tests from `rc-` class names (do BEFORE any styling change)

Rationale: the moment styling moves to utilities, every JS/test hook keyed on an `rc-` class breaks. Re-point them to stable `data-*` attributes first (mirrors the React skin's `[data-slot="popover-popup"]` contract), so the suite stays a meaningful safety net through Phases 2-4.

### Task 1: Re-point the Escape-guard to a data-attribute

**Files:**

- Modify: `packages/widgets/src/cart-drawer/vue/CartEventGroup.vue:143-149` (confirm `<div>`)
- Modify: `packages/widgets/src/cart-drawer/vue/CartDrawer.vue:180`
- Test: `packages/widgets/src/cart-drawer/vue/CartDrawer.test.ts:463` (regression test) + `:484` (comment)

- [ ] **Step 1: Confirm the regression test exists and passes**

Run: `pnpm --filter @oztix/roadie-widgets test -- CartDrawer`
Expected: PASS — including `Escape on the confirm popover closes only the popover, not the drawer` (CartDrawer.test.ts:463). It asserts on prompt text + `#cart-drawer` role (not `.rc-confirm`), so it survives the refactor.

- [ ] **Step 2: Add a stable hook to the confirm popover**

In `CartEventGroup.vue`, on the confirm `<div v-if="confirming" :id="confirmId" class="rc-confirm" role="dialog" ...>` add `data-cart-confirm` (keep everything else for now):

```html
<div
  v-if="confirming"
  :id="confirmId"
  data-cart-confirm
  class="rc-confirm"
  role="dialog"
  :aria-labelledby="confirmLabelId"
></div>
```

- [ ] **Step 3: Switch the guard selector**

In `CartDrawer.vue:180`:

```ts
// BEFORE
if (document.querySelector('.rc-confirm')) return
// AFTER
if (document.querySelector('[data-cart-confirm]')) return
```

- [ ] **Step 4: Update the stale comment**

In `CartDrawer.test.ts:484`, change any `.rc-confirm` reference in the comment to `[data-cart-confirm]`.

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm --filter @oztix/roadie-widgets test -- CartDrawer CartEventGroup`
Expected: PASS (regression test still green; guard now class-independent).

- [ ] **Step 6: Commit**

```bash
git add packages/widgets/src/cart-drawer/vue/CartEventGroup.vue packages/widgets/src/cart-drawer/vue/CartDrawer.vue packages/widgets/src/cart-drawer/vue/CartDrawer.test.ts
git commit -m "refactor(cart-drawer): decouple Vue Escape-guard from rc- class via data-attr"
```

### Task 2: Re-point the 5 class-based test selectors to `data-testid`

**Files:**

- Modify templates: `CartDrawerHeader.vue`, `CartDrawerFooter.vue`, `CartContents.vue`, `CartUrgencyBadge.vue`
- Modify tests: `CartDrawer.test.ts`, `CartContents.test.ts`, `CartUrgencyBadge.test.ts`

Mapping (add `data-testid` to the element that currently carries the class, then update the test query):

| Test file:line                | Old selector             | New `data-testid`                               |
| ----------------------------- | ------------------------ | ----------------------------------------------- |
| `CartDrawer.test.ts:314,338`  | `.rc-badge__count`       | `cart-badge-count` (in `CartUrgencyBadge.vue`)  |
| `CartDrawer.test.ts:316,339`  | `.rc-header__price-text` | `cart-header-price` (in `CartDrawerHeader.vue`) |
| `CartDrawer.test.ts:393,425`  | `.rc-footer__fees`       | `cart-footer-fees` (in `CartDrawerFooter.vue`)  |
| `CartContents.test.ts:76`     | `.rc-group__title`       | `cart-group-title` (in `CartContents.vue`)      |
| `CartUrgencyBadge.test.ts:44` | `.rc-badge__time`        | `cart-badge-time` (in `CartUrgencyBadge.vue`)   |

This follows the precedent already in this skin (`:data-intent` on `CartUrgencyBadge.vue:62`, queried at `CartUrgencyBadge.test.ts:14/24`) and the existing `data-testid="cart-remove-spinner"` / `cart-drawer-loading` hooks.

- [ ] **Step 1: Add the `data-testid` attribute to each template element** (keep the `rc-` class for now — it's removed in Phase 3). Example for the badge count span in `CartUrgencyBadge.vue`:

```html
<span
  class="rc-badge__count tabular-nums"
  data-testid="cart-badge-count"
></span>
```

- [ ] **Step 2: Update each test query.** Example, `CartDrawer.test.ts`:

```ts
// BEFORE
container.querySelector('.rc-badge__count')
// AFTER
container.querySelector('[data-testid="cart-badge-count"]')
```

Repeat for all 5 rows above (the `.rc-header__price-text`, `.rc-footer__fees`, `.rc-group__title`, `.rc-badge__time` selectors). Prefer Testing-Library `getByTestId` where the test already imports it.

- [ ] **Step 3: Run the full Vue suite — expect PASS**

Run: `pnpm --filter @oztix/roadie-widgets test`
Expected: PASS — selectors now resolve via `data-testid`, behavior unchanged.

- [ ] **Step 4: Commit**

```bash
git add packages/widgets/src/cart-drawer/vue
git commit -m "refactor(cart-drawer): re-point Vue test selectors to data-testid"
```

---

## Phase 2 — Icons → `@phosphor-icons/vue`

### Task 3: Add the dependency + size-limit ignore

**Files:**

- Modify: `packages/widgets/package.json`

- [ ] **Step 1: Add the optional peer + devDep** (mirror `@phosphor-icons/react`). In `peerDependencies` add `"@phosphor-icons/vue": "^2.2.0"`, in `peerDependenciesMeta` add `"@phosphor-icons/vue": { "optional": true }`, in `devDependencies` add `"@phosphor-icons/vue": "2.2.1"`.

- [ ] **Step 2: Add it to the Vue `size-limit` ignore array** (`package.json` ~line 167-171), alongside `vue`, `focus-trap`, `@number-flow/vue`:

```json
"ignore": ["vue", "focus-trap", "@number-flow/vue", "@phosphor-icons/vue"]
```

(Optionally also add `@phosphor-icons/react` to the React skin's ignore array for symmetry — it's currently missing.)

- [ ] **Step 3: Install**

Run: `pnpm install`
Expected: lockfile updates; no peer warnings for the widget package itself.

- [ ] **Step 4: Commit**

```bash
git add packages/widgets/package.json pnpm-lock.yaml
git commit -m "build(cart-drawer): add @phosphor-icons/vue as optional peer"
```

### Task 4: Replace inline SVGs with `Ph*` components

**Files:** all 8 `.vue` files containing `<svg>`.

Use **named imports only** (no global `app.use` — defeats tree-shaking). Render `weight="bold"` (Roadie convention) and size with the same Tailwind class the React skin uses (`:class`). Complete map (11 instances, 7 icons):

| File                         | Location                                | Inline SVG                      | `@phosphor-icons/vue` | weight   | size class                         |
| ---------------------------- | --------------------------------------- | ------------------------------- | --------------------- | -------- | ---------------------------------- |
| `CartEventGroup.vue:101`     | event time                              | clock                           | `PhClock`             | bold     | `size-4 shrink-0 text-subtler`     |
| `CartEventGroup.vue:111`     | venue                                   | map pin                         | `PhMapPin`            | bold     | `size-3.5 shrink-0 text-subtler`   |
| `CartEventGroup.vue:136`     | remove btn                              | trash                           | `PhTrash`             | bold     | `size-4`                           |
| `CartDrawerHeader.vue:124`   | close btn                               | X                               | `PhX`                 | bold     | `size-4`                           |
| `CartDrawerHeader.vue:137`   | "Cart" title                            | bag                             | `PhBag`               | bold     | `size-5`                           |
| `CartDrawerFooter.vue:118`   | checkout CTA                            | bag                             | `PhBag`               | bold     | `size-4`                           |
| `CartEmptyState.vue:13`      | empty bag                               | bag                             | `PhBag`               | bold     | `size-10`                          |
| `CartContents.vue:76`        | day header                              | calendar                        | `PhCalendarBlank`     | bold     | `size-4 shrink-0`                  |
| `CartExpiryModal.vue:87`     | modal close                             | X                               | `PhX`                 | bold     | `size-4`                           |
| `CartExpiryModals.vue:49,90` | warning + expired (shared `CLOCK_PATH`) | clock                           | `PhClock`             | bold     | warning `size-7`, expired `size-8` |
| `CartDrawer.vue:~386`        | loading spinner                         | circle-notch (**regular path**) | `PhCircleNotch`       | **bold** | `size-6 animate-spin`              |

- [ ] **Step 1: For each file, add the named import and swap each `<svg>...</svg>` for the component.** Example, `CartEventGroup.vue`:

```vue
<script setup lang="ts">
import { PhClock, PhMapPin, PhTrash } from '@phosphor-icons/vue'

// ...existing imports
</script>
```

```html
<!-- BEFORE -->
<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
  <path d="M128,20A108..." />
</svg>
<!-- AFTER -->
<PhClock
  weight="bold"
  :class="'size-4 shrink-0 text-subtler'"
  aria-hidden="true"
/>
```

(While `rc-` classes still exist on parents, the icon sizing via `:class` is harmless; Phase 3 finalizes the surrounding utilities. For the spinner, keep `animate-spin` — see Task 8.)

- [ ] **Step 2: Spinner — use `PhCircleNotch weight="bold"`** in `CartDrawer.vue` (do **not** infer `regular` from the current path; React renders bold). Keep `data-testid="cart-remove-spinner"` on its wrapper.

- [ ] **Step 3: Typecheck + tests**

Run: `pnpm --filter @oztix/roadie-widgets typecheck && pnpm --filter @oztix/roadie-widgets test`
Expected: PASS. `vue-tsc` resolves the `Ph*` component types; behavior tests (text/role/aria/`data-testid`) unaffected.

- [ ] **Step 4: Verify `PhBag` is the handbag (not `PhShoppingBag`)** — quick render check in the dev/preview app, since the inline path matched React's `BagIcon` (Phosphor `bag`).

- [ ] **Step 5: Commit**

```bash
git add packages/widgets/src/cart-drawer/vue
git commit -m "feat(cart-drawer): replace inline SVGs with @phosphor-icons/vue"
```

---

## Phase 3 — Templates → Roadie utilities (per component)

For every task below: replace `rc-` classes with the utility strings, remove the now-dead `rc-` classes from `style.css`, run `typecheck && test`, eyeball against the React skin in the preview app, commit. The React file:line in each table is the authoritative target. Inline progress-morph `:style` bindings (header/footer/badge) **stay as-is** — they are JS, identical in both skins, not expressible as utilities. Re-express `:focus-visible` rings as `focus-visible:` utilities (the drawer container keeps `focus:outline-none`).

### Task 5: `CartDrawer.vue` (overlay, shell, body, lock, skeleton)

| `rc-`                                     | Utilities                                                                                                                                                                                                               | React anchor         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `.rc-overlay`                             | `fixed inset-0 z-70 emphasis-overlay transition-opacity duration-300 ease-out`                                                                                                                                          | `CartDrawer.tsx:299` |
| `.rc-overlay--open` / `--dragging`        | `pointer-events-auto` / `transition-none`                                                                                                                                                                               | :301                 |
| `.rc-drawer` + `@media(min-width:40rem)`  | `fixed inset-x-0 bottom-0 z-70 flex flex-col overflow-hidden rounded-t-4xl emphasis-floating [transition:height_320ms_cubic-bezier(0.22,1,0.36,1)] sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-[600px] sm:rounded-4xl` | :321                 |
| `.rc-drawer--dragging`                    | `[transition:none]`                                                                                                                                                                                                     | :322                 |
| `.rc-drawer:focus{outline:none}`          | `focus:outline-none` (container is `tabindex=-1`)                                                                                                                                                                       | —                    |
| `.rc-drawer__body`                        | `h-full min-h-0 flex-1 overflow-y-auto px-4 transition-opacity`                                                                                                                                                         | :349                 |
| `.rc-drawer__error` (+`rc-intent-danger`) | `text-prose text-subtle intent-danger` (status) / `text-ui-meta text-subtle intent-danger` (alert)                                                                                                                      | :366,373             |
| `.rc-drawer__loading`                     | `grid gap-4`                                                                                                                                                                                                            | :391                 |
| `.rc-skeleton--line`                      | `h-4 w-40 animate-pulse rounded bg-subtle`                                                                                                                                                                              | :392                 |
| `.rc-skeleton--block`                     | `h-32 w-full animate-pulse rounded-xl bg-subtle`                                                                                                                                                                        | :393                 |
| `.rc-lock` / `--busy`                     | `relative` / `pointer-events-none opacity-50`                                                                                                                                                                           | :358                 |
| `.rc-lock__overlay`                       | `pointer-events-none absolute inset-0 grid place-content-center`                                                                                                                                                        | :401                 |
| `.rc-spinner`                             | (on `PhCircleNotch`) `size-6 animate-spin text-subtle`                                                                                                                                                                  | :404                 |

- [ ] Apply mappings; delete the corresponding `rc-` blocks from `style.css`. `[transition:height_…]` replaces the `rc-drawer` height transition (React drives height via motion; the arbitrary utility preserves the current Vue CSS behavior).
- [ ] Run `pnpm --filter @oztix/roadie-widgets typecheck && pnpm --filter @oztix/roadie-widgets test -- CartDrawer`; visual check; commit `refactor(cart-drawer): utilities for CartDrawer shell`.

### Task 6: `CartDrawerHeader.vue`

| `rc-`                    | Utilities                                                                                                                                                                                                                                       | React anchor (`CartDrawerHandle.tsx`) |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `.rc-header`             | `relative shrink-0 cursor-grab touch-none select-none active:cursor-grabbing`                                                                                                                                                                   | :70                                   |
| `.rc-header--bounce`     | `animate-cart-bounce` (from `motion.css`, Task 8)                                                                                                                                                                                               | :71                                   |
| `.rc-header__pill-wrap`  | `flex justify-center py-2`                                                                                                                                                                                                                      | :75                                   |
| `.rc-header__pill`       | `h-1.5 w-9 rounded-full bg-subtle`                                                                                                                                                                                                              | :76                                   |
| `.rc-header__grabber`    | `absolute top-0 left-1/2 size-11 -translate-x-1/2 cursor-grab appearance-none rounded-full bg-transparent text-transparent outline-offset-2 focus:outline-none focus-visible:text-strong focus-visible:outline-2 focus-visible:outline-current` | :87                                   |
| `.rc-header__title-area` | `relative` (+ inline height `:style`)                                                                                                                                                                                                           | :100                                  |
| `.rc-header__close`      | `absolute top-0 left-4` (+ inline opacity) → inner close = `IconButton`-equivalent: `btn btn-icon-sm is-interactive emphasis-subtle intent-neutral` + `PhX size-4`                                                                              | :103,111                              |
| `.rc-header__title`      | `absolute top-0 flex h-8 items-center gap-2` (+ inline left/transform)                                                                                                                                                                          | :125                                  |
| `.rc-header__title svg`  | (on `PhBag`) `size-5 text-subtle intent-accent`                                                                                                                                                                                                 | :128                                  |
| `.rc-header__title-text` | `text-ui font-bold text-strong`                                                                                                                                                                                                                 | :129                                  |
| `.rc-header__badge`      | `absolute left-1/2 -translate-x-1/2` (+ inline top)                                                                                                                                                                                             | :133                                  |
| `.rc-header__price`      | `absolute top-0 right-4 flex h-8 items-center` (+ inline opacity)                                                                                                                                                                               | :147                                  |
| `.rc-header__price-text` | `text-ui font-bold text-strong` + keep `data-testid="cart-header-price"`                                                                                                                                                                        | :150                                  |

- [ ] Apply; delete dead `rc-` blocks; `typecheck && test -- CartDrawer`; visual check; commit.

### Task 7: `CartDrawerFooter.vue`

| `rc-`                               | Utilities                                                                                                            | React anchor (`CartDrawerHandle.tsx`) |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `.rc-footer`                        | `shrink-0 bg-raised`                                                                                                 | :218                                  |
| `.rc-footer--draggable`             | `cursor-grab touch-none select-none active:cursor-grabbing`                                                          | :219                                  |
| `.rc-footer__inner`                 | `px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`                                                           | :223                                  |
| `.rc-footer__subtotal`              | `overflow-hidden` wrapper + `flex items-center justify-between gap-4 pb-2` inner (+ inline maxHeight/opacity)        | :226                                  |
| `.rc-footer__subtotal-label/-value` | `text-ui font-bold text-strong`                                                                                      | :231                                  |
| `.rc-footer__fees`                  | `overflow-hidden pb-2 text-ui-meta text-subtle` + keep `data-testid="cart-footer-fees"` (+ inline maxHeight/opacity) | :243                                  |
| `.rc-footer__buttons`               | `flex gap-3`                                                                                                         | :252                                  |
| secondary button                    | `btn btn-md is-interactive emphasis-normal intent-neutral flex-1` (or Roadie `Button` if a Vue port exists)          | :253                                  |
| primary button                      | `btn btn-md is-interactive emphasis-strong intent-accent flex-1` + `PhBag size-4 mr-1.5`                             | :268                                  |

- [ ] Apply (D5: `btn-md`); delete dead `rc-` blocks; `typecheck && test -- CartDrawer`; visual check; commit.

### Task 8: Create `motion.css` (bespoke keyframes)

**Files:** Create `packages/widgets/src/cart-drawer/vue/motion.css`

- [ ] **Step 1: Author the file** (only the animations that aren't stock Tailwind / aren't design tokens):

```css
/* Roadie cart drawer — Vue skin bespoke motion.
 * Everything else (colours, spacing, pulse, spin) comes from the host's
 * Tailwind + @oztix/roadie-core build. These two keyframes are widget-specific
 * (not design tokens) so they ship here rather than in core. */
@keyframes cart-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
  60% {
    transform: translateY(2px);
  }
}
@keyframes badge-pop {
  0%,
  100% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.12);
  }
}
@media (prefers-reduced-motion: no-preference) {
  .animate-cart-bounce {
    animation: cart-bounce 600ms ease;
  }
  .animate-badge-pop {
    animation: badge-pop 600ms ease;
  }
}
```

- [ ] **Step 2: Wire the build to copy it.** In `tsdown.config.ts:23` change the `copy` source:

```ts
copy: [{ from: 'src/cart-drawer/vue/motion.css', to: 'dist/cart-drawer/vue' }],
```

- [ ] **Step 3: Update `package.json` exports** — replace the `"./cart-drawer/vue/style.css"` entry with:

```json
"./cart-drawer/vue/motion.css": "./dist/cart-drawer/vue/motion.css"
```

- [ ] **Step 4: Commit** `feat(cart-drawer): ship bespoke Vue keyframes via motion.css`.

### Task 9: `CartContents.vue`

| `rc-`                                | Utilities                                                        | React anchor (`CartContents.tsx`) |
| ------------------------------------ | ---------------------------------------------------------------- | --------------------------------- |
| `.rc-contents`                       | `grid gap-5`                                                     | :72                               |
| `.rc-contents__groups` / `.rc-group` | `grid gap-5` / `grid gap-4`                                      | :72,74                            |
| `.rc-group__header`                  | `sticky top-0 z-10 -mx-4 emphasis-strong px-4 py-2.5`            | :75                               |
| `.rc-group__header svg`              | (on `PhCalendarBlank`) `size-4 shrink-0 text-subtle`             | :77                               |
| `.rc-group__title`                   | `text-ui-meta font-bold` + keep `data-testid="cart-group-title"` | :81                               |
| `.rc-group__events`                  | `grid gap-4`                                                     | :87                               |
| `.rc-contents__footer`               | `grid gap-4 border-t border-subtle pt-4`                         | :104                              |
| `.rc-contents__total`                | `flex items-center justify-between gap-4`                        | :110                              |
| `.rc-contents__total-label/-value`   | `text-ui font-bold text-strong`                                  | :111                              |
| `.rc-contents__fees`                 | `text-ui-meta text-subtle`                                       | :116                              |
| checkout button                      | `btn btn-md is-interactive emphasis-normal intent-brand`         | :125                              |

- [ ] Apply; delete dead `rc-` blocks; `typecheck && test -- CartContents`; visual check; commit.

### Task 10: `CartEventGroup.vue` (event row, tickets, confirm popover)

| `rc-`                            | Utilities                                                                                                                      | React anchor (`CartEventGroup.tsx`) |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `.rc-event`                      | `grid gap-3`                                                                                                                   | :53                                 |
| `.rc-event__row`                 | `flex items-start gap-3`                                                                                                       | :54                                 |
| `.rc-event__info`                | `flex min-w-0 flex-1 flex-col gap-1`                                                                                           | :55                                 |
| `.rc-event__time`                | `flex items-center gap-2 text-ui-meta text-subtle`                                                                             | :57                                 |
| `.rc-event__detail`              | `grid gap-1 pl-6`                                                                                                              | :65                                 |
| `.rc-event__name`                | `text-ui font-medium text-strong`                                                                                              | :66                                 |
| `.rc-event__venue`               | `flex items-center gap-1.5 text-ui-meta text-subtle`                                                                           | :67                                 |
| `.rc-event__image`               | `size-20 shrink-0 rounded-lg bg-subtle object-cover`                                                                           | :77                                 |
| `.rc-event__remove`              | wrapper stays (hand-rolled confirm, D7): `relative shrink-0 self-start`                                                        | —                                   |
| trash button                     | `btn btn-icon-sm is-interactive emphasis-subtler intent-danger` + `PhTrash size-4`                                             | :87                                 |
| `.rc-event__tickets`             | `grid gap-3 pl-6`                                                                                                              | :132                                |
| `.rc-ticket` (**D6 responsive**) | `flex items-center rounded-lg bg-sunken px-3 py-2` + adopt React's `md:` name split                                            | :135-159                            |
| `.rc-ticket__name`               | `block truncate text-ui font-medium text-strong` (desktop wrapper `hidden min-w-0 flex-1 pr-4 md:block`; mobile `md:hidden`)   | :139                                |
| `.rc-ticket__price`              | `w-20 shrink-0 text-ui-meta text-subtle`                                                                                       | :144                                |
| `.rc-ticket__qty`                | wrap in `flex flex-1 items-center justify-center` → `shrink-0 text-ui-meta font-medium text-strong`                            | :149                                |
| `.rc-ticket__total`              | `w-24 shrink-0 text-right text-ui font-bold text-strong tabular-nums`                                                          | :154                                |
| `.rc-confirm`                    | `data-cart-confirm` kept; styling → `grid gap-4 text-pretty emphasis-floating rounded-xl p-4` (matches Roadie `Popover` popup) | :98                                 |
| `.rc-confirm__text`              | `text-ui text-pretty text-strong`                                                                                              | :103                                |
| `.rc-confirm__actions`           | `flex gap-2`                                                                                                                   | :107                                |
| confirm Cancel                   | `btn btn-sm is-interactive emphasis-normal intent-neutral flex-1`                                                              | :110                                |
| confirm Remove                   | `btn btn-sm is-interactive emphasis-strong intent-danger flex-1`                                                               | :115                                |

- [ ] Apply (keep `data-cart-confirm` and the hand-rolled dismiss logic from Phase 1 — do **not** portal the confirm; `removeWrapEl.contains()` depends on it staying a descendant). Delete dead `rc-` blocks.
- [ ] `typecheck && test -- CartEventGroup CartDrawer`; visual check; commit.

### Task 11: `CartEmptyState.vue`

| `rc-`                     | Utilities                                                              | React anchor (`CartEmptyState.tsx`) |
| ------------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| `.rc-empty`               | `flex flex-col items-center justify-center px-6 py-16 text-center`     | :20                                 |
| `.rc-empty__icon`         | `mb-6 flex size-24 items-center justify-center rounded-full bg-subtle` | :21                                 |
| `.rc-empty__icon-graphic` | (on `PhBag`) `size-10 text-subtler`                                    | :22                                 |
| `.rc-empty__heading`      | `mb-2 text-display-ui-3 text-strong`                                   | :28                                 |
| `.rc-empty__text`         | `mb-6 max-w-xs text-balance text-prose text-subtle`                    | :29                                 |
| browse button             | `btn btn-lg is-interactive emphasis-strong intent-brand`               | :32                                 |

- [ ] Apply; delete dead `rc-` blocks; `typecheck && test`; visual check; commit.

### Task 12: `CartUrgencyBadge.vue`

| `rc-`                         | Utilities                                                                                                                                                                                        | React anchor (`CartUrgencyBadge.tsx`) |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `.rc-badge`                   | `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-ui-meta font-semibold emphasis-subtle` + `intent-{danger\|warning\|success}` (keeps `:data-intent`) | :47                                   |
| `.rc-badge--pop`              | `animate-badge-pop` (from `motion.css`)                                                                                                                                                          | :55                                   |
| `.rc-badge__dot`              | `size-1.5 shrink-0 rounded-full bg-current`                                                                                                                                                      | Badge `index.tsx:57`                  |
| `.rc-badge__dot--pulse`       | `animate-pulse`                                                                                                                                                                                  | :62                                   |
| `.rc-badge__tail`             | `overflow-hidden whitespace-nowrap` (+ inline maxWidth/opacity/transition)                                                                                                                       | :78                                   |
| `.rc-badge__count` / `__time` | `tabular-nums` + keep `data-testid="cart-badge-count"` / `"cart-badge-time"`                                                                                                                     | :60                                   |

- [ ] Apply; replace the hand-rolled `color-mix` tints with `emphasis-subtle intent-*` (D4 family). Delete dead `rc-` blocks; `typecheck && test -- CartUrgencyBadge CartDrawer`; visual check; commit.

### Task 13: `CartExpiryModal.vue` + `CartExpiryModals.vue`

| `rc-`                           | Utilities                                                                                                                    | React anchor                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `.rc-modal-overlay`             | `fixed inset-0 z-80 flex items-center justify-center emphasis-overlay p-4`                                                   | `CartExpiryModal.tsx:55`     |
| `.rc-modal`                     | wrap content in `w-full max-w-sm` → `relative grid justify-items-center gap-4 rounded-4xl emphasis-floating p-6 text-center` | :58                          |
| `.rc-modal:focus{outline:none}` | `focus:outline-none` (`tabindex=-1`)                                                                                         | :59                          |
| `.rc-modal__close`              | `absolute top-4 right-4` → `btn btn-icon-sm is-interactive emphasis-subtle intent-neutral` + `PhX size-4`                    | :67                          |
| `.rc-modal__icon--warning`      | `flex size-14 items-center justify-center rounded-full bg-subtle` + `PhClock size-7 text-normal intent-danger`               | `CartExpiryModals.tsx:49`    |
| `.rc-modal__icon--expired`      | `flex size-16 items-center justify-center rounded-full bg-subtle` + `PhClock size-8 text-subtler`                            | :93                          |
| `.rc-modal__title`              | `text-display-ui-4 text-strong`                                                                                              | `CartExpiryModal.tsx:80`     |
| `.rc-modal__body`               | `text-balance text-prose text-subtle`                                                                                        | :83                          |
| `.rc-modal__countdown`          | `mt-2 block text-display-ui-4 text-normal tabular-nums intent-danger`                                                        | `CartExpiryModals.tsx:81`    |
| `.rc-modal__actions`            | `flex w-full gap-3`                                                                                                          | `CartExpiryModal.tsx:84`     |
| warning / expired buttons       | `btn btn-md is-interactive emphasis-normal intent-neutral flex-1` / `... emphasis-strong intent-accent flex-1`               | `CartExpiryModals.tsx:58,98` |

- [ ] Apply; delete dead `rc-` blocks; `typecheck && test -- CartExpiry`; visual check; commit.

### Task 14: Delete `style.css`

**Files:** Delete `packages/widgets/src/cart-drawer/vue/style.css`

- [ ] **Step 1: Confirm `style.css` is now empty of live rules** (only the `:root` token bridge + any leftovers should remain after Tasks 5-13). Delete the whole file.
- [ ] **Step 2: Grep for stragglers** — `rg "rc-" packages/widgets/src/cart-drawer/vue` should return **zero** matches in `.vue`/`.ts` (the only allowed prior references were the Escape-guard + tests, already migrated).

Run: `pnpm exec rg "rc-" packages/widgets/src/cart-drawer/vue`
Expected: no output.

- [ ] **Step 3: Run the full suite**

Run: `pnpm --filter @oztix/roadie-widgets test`
Expected: PASS.

- [ ] **Step 4: Commit** `refactor(cart-drawer): remove hand-rolled rc- stylesheet`.

---

## Phase 4 — Contract, build, docs

### Task 15: README + CHANGELOG + version bump

**Files:** `packages/widgets/package.json` (version), `packages/widgets/README.md:50-84`, `packages/widgets/CHANGELOG.md`

- [ ] **Step 1: Bump `version` to `3.0.0`** in `package.json`.

- [ ] **Step 2: Rewrite the Vue quick-start** (README:50-73) to the new contract — host runs Tailwind v4, imports `@oztix/roadie-core/css`, `@source`-scans the widget dist, and imports `motion.css` (replacing the `style.css` import). Update the Architecture note (README:82-84) — the Vue skin no longer "ships a compiled stylesheet for hosts without Tailwind"; it is now a Roadie/Tailwind consumer like React, shipping only bespoke keyframes.

- [ ] **Step 3: Add a CHANGELOG breaking-change entry** under a new `3.0.0` heading: the Vue skin now requires the host to provide Tailwind v4 + `@oztix/roadie-core` CSS; `style.css` export removed and replaced by `motion.css`; `@phosphor-icons/vue` is a new optional peer.

- [ ] **Step 4: Commit** `docs(cart-drawer): document Vue Tailwind/Roadie host contract for 3.0.0`.

### Task 16: Full build + size + lint + format gate

- [ ] **Step 1: Build**

Run: `pnpm --filter @oztix/roadie-widgets build`
Expected: PASS — `dist/cart-drawer/vue/motion.css` emitted; no `style.css`; `check:dts` + `check:exports` green (the `attw` exclude for the old `style.css` export must be updated to `motion.css` in the `check:exports` script if it references it — verify `package.json:48`).

- [ ] **Step 2: Size**

Run: `pnpm --filter @oztix/roadie-widgets size:check`
Expected: PASS — `dist/cart-drawer/vue/index.js` under 10.5 KB (Phosphor is in the ignore list; CSS is not measured).

- [ ] **Step 3: Lint + format + typecheck**

Run: `pnpm --filter @oztix/roadie-widgets lint && pnpm --filter @oztix/roadie-widgets typecheck && pnpm --filter @oztix/roadie-widgets format:check`
Expected: PASS.

- [ ] **Step 4: Repo-wide typecheck** (catch cross-package fallout; if it errors but the package passes, clear `tsbuildinfo` per AGENTS.md):

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit any formatter changes** `chore(cart-drawer): format + size gate`.

---

## Phase 5 — Visual verification

### Task 17: Confirm parity in a real Roadie/Tailwind host

- [ ] **Step 1:** Render the Vue drawer in a host that imports `@oztix/roadie-core/css` + `@source`-scans the widget dist (the docs app or a scratch Vite+Tailwind harness). Confirm: collection accent + dark mode track the host; buttons match React's sizes/emphasis; overlay blur is the Roadie 8px (D4); day-header sticky brand fill; badge tints; empty state; expiry modals.
- [ ] **Step 2:** Keyboard pass — Tab to grabber (focus ring visible), open/close drawer (focus trap + return), open confirm → Escape closes only the confirm (not the drawer), then Escape closes the drawer. Confirms Phase 1 decoupling held.
- [ ] **Step 3:** Render in a host **without** Roadie CSS → expect unstyled (documents the breaking contract; not a bug).

---

## Self-review (completed against the feasibility findings)

- **Spec coverage:** rc-class translation (Tasks 5-13), icons (Task 4), build pipeline / delivery model (Phase 4 + Task 8), JS/test coupling (Phase 1), React Dialog comment (Phase 0), keyboard/focus answer (D7 + Task 17). All five investigation dimensions map to tasks.
- **Placeholder scan:** every styling step carries the literal utility string; every command has an expected result. No "handle edge cases" / "similar to" placeholders.
- **Type/name consistency:** `data-cart-confirm`, `data-testid` names, `Ph*` component names, `motion.css`/`animate-cart-bounce`/`animate-badge-pop`, and `btn-md`/`btn-sm` tiers are used identically across tasks.
- **Known open items requiring reviewer confirmation:** D4 (blur 2→8px), D5 (button tier), D6 (ticket-row responsive change), and whether a Vue port of Roadie `Button`/`IconButton` exists (the plan uses raw `btn*`/`btn-icon*` utility strings, which work regardless; swap to components if a Vue port lands). Verify the `check:exports` `attw` exclude (`package.json:48`) references `motion.css` not `style.css`.
- **z-index — verified, intentionally mirrors React:** the tables use raw `z-70` (overlay/drawer), `z-80` (expiry modal), `z-10` (sticky day header) to match the React skin verbatim ([CartDrawer.tsx:300,321], [CartExpiryModal.tsx:55], [CartContents.tsx:75]). Roadie _does_ have a semantic layering scale ([`layering.css`](../../packages/core/src/css/layering.css): `--z-index-overlay:30`, `--z-index-modal:40`, `--z-index-sticky:20`), but neither skin uses it today. Adopting `z-(--z-index-*)` tokens across **both** skins is a worthwhile follow-up cleanup — doing it in Vue only would diverge from React, so it's deliberately out of scope here.
- **Verified utilities exist in core:** `btn`/`btn-sm`/`btn-md`/`btn-lg`/`btn-icon-sm` ([buttons.css](../../packages/core/src/css/buttons.css)), `emphasis-strong`/`-subtler`/`-floating`/`-overlay` ([emphasis.css](../../packages/core/src/css/emphasis.css), `emphasis-overlay` = `blur(8px)` confirming D4), `text-ui`/`text-ui-meta`/`text-prose` ([typography.css](../../packages/core/src/css/typography.css)).

---

## Execution handoff

Plan complete and saved to `docs/plans/2026-06-17-refactor-vue-cart-drawer-tailwind-migration-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task with two-stage review between tasks. Good fit: tasks are independent and have crisp verification gates.
2. **Inline Execution** — execute in this session in batches (e.g. Phase 0-1, then 2, then 3, then 4-5) with checkpoints.

Phase 0 is independently shippable now if you want the React PR comment resolved before the larger Vue work.
