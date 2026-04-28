---
title: Roadie link provider, href-aware components, and tracking pattern
type: feat
status: active
date: 2026-04-28
---

# Roadie link provider, href-aware components, and tracking pattern

## Overview

Today Roadie ships **two** ways to render an action — `Button` (Base UI button)
and `LinkButton` (anchor-shaped button) — plus a parallel pair for icons
(`IconButton` / `LinkIconButton`). Card, Breadcrumb, and Carousel each accept
`as` to swap in a router-aware Link. Consumers must decide on every call:
_is this an anchor or a button?_, _is this internal or external?_, _which
shim wraps `next/link`?_, _do I need `rel='noopener'`?_. The cart-drawer PR
(#66 in `TicketSolutions.Oztix.Website`) showed the cost — the same
checkout CTA was implemented three different ways across CartContents,
CartDrawerHandle, and CartEmptyState.

This plan replaces that decision tree with a single rule:

> **Pass `href` and you're done.** Roadie picks the right element, attaches
> the right `target`/`rel`, and routes through the app's configured client
> router. No `href` and you have `onClick` → it's a `<button>`.

Implemented as:

1. A `RoadieLinkProvider` injected at the app root that supplies the project's
   Link component (typically `next/link` or a Next-shim like the website's
   `@/components/Link`). One-line wiring per app, never imported by Roadie itself
   so the package stays framework-agnostic.
2. `Button` and `IconButton` become `href`-aware via Base UI's `render` prop —
   no breaking change to existing call sites.
3. `Card` keeps its existing `href` API and gains router awareness via a tiny
   client-side delegation child, so `CardRoot` itself stays server-safe.
4. `BreadcrumbLink` and `CarouselTitleLink` adopt the same pattern.
5. `TabsTab` gains `href` via render synthesis (Base UI policy).
6. `LinkButton` / `LinkIconButton` are deprecated as aliases of `Button` /
   `IconButton`. Removed in a future major.
7. A new `Foundations → Linking` docs page is the single source of truth, plus
   a `Recipes → Tracking actions` page that documents the app-level
   `<Tracked>` wrapper pattern (kept in consumer apps — Roadie does not ship
   tracking).

## Problem Frame

Roadie consumers (primarily the Oztix website Next.js app) pay three taxes
on every link-shaped surface:

- **Routing decision tax** — every CTA needs to choose between `<a>` and
  `next/link`. Wrong choice = either flash-of-white reload (preventable
  with `next/link`) or invalid client routing for cross-app paths.
- **Trust decision tax** — external links need `rel='noopener noreferrer'`,
  often `target='_blank'`. Frequently forgotten.
- **Component sprawl tax** — the website carries
  `LinkButton.tsx` (Roadie + tracking + Link shim), and the same shape will
  inevitably reappear as `LinkIconButton`, `LinkCard`, `LinkBadge`. Each new
  shape duplicates the routing/tracking choice.

The audit on PR #66 (cart drawer) surfaced the cost concretely:

- `CartContents.tsx:166` — `<Button render={<a href={…} />} onClick={preventDefault + onNavigate}>` — manual `a` element, `onClick` shim, no router.
- `CartEmptyState.tsx:19` — `<LinkButton href=… onClick={preventDefault + onNavigate}>` — uses the website wrapper, also onClick-shimmed.
- `CartDrawerHandle.tsx:231–248` — `<Button onClick={onCheckout}>` for what is logically a navigation. No anchor at all.

Three call sites for one concept ("link to checkout"), three different
shapes, all routing through `onNavigate` props that exist solely because
the components don't know how to navigate themselves.

## Requirements Trace

- R1. Single `href` prop replaces `LinkButton` / `LinkIconButton` and the
  manual `render={<a>}` / `as={Link}` patterns in Roadie components.
- R2. Internal hrefs route through the app's configured Link (`next/link`
  or wrapper), preserving prefetch, scroll restoration, and view
  transitions on the Next.js docs site and consumer apps.
- R3. External hrefs (`http(s)://`, `//…`) automatically render `<a>` with
  `target='_blank'` and `rel='noopener noreferrer'` unless overridden.
- R4. Protocol hrefs (`mailto:`, `tel:`, `sms:`) render plain `<a>` with no
  `target`.
- R5. Components that are server-safe today (`Card`, `BreadcrumbLink`,
  `CarouselTitleLink`) **stay server-safe** — adopting the provider must
  not force them into a `'use client'` boundary in static contexts.
- R6. Adding `href` to `Button` / `IconButton` does not break any existing
  consumer. Existing `render={<a href=… />}` continues to work unchanged.
- R7. Roadie ships zero tracking code. Tracking is documented as a
  consumer-app pattern (the website's `<Tracked>` wrapper around any
  Roadie action). Doc page exists in `docs/recipes/`.
- R8. `RoadieLinkProvider` performance is bounded — single context, stable
  value, never re-renders consumers when the value reference doesn't change.
- R9. Apps that don't wire the provider (or render Roadie outside any
  provider) get plain `<a>` fallback. No crash, no warning except in dev.
- R10. The docs site eats its own dog food: `Providers.tsx` mounts
  `RoadieLinkProvider`, all internal nav uses `href` on Roadie components.
- R11. Type inference does not regress for existing `Button` /
  `LinkButton` consumers. New `href`-only props (`external`, `target`,
  `rel`) accept the obvious string/boolean values and don't surface as
  `any`. Anchor-only DOM props like `download`, `hreflang`,
  `referrerPolicy` are reachable via the existing escape hatch
  (`render={<a download …>}` or the deprecated
  `LinkButton<typeof MyLink>` generic) — they are **not** elevated onto
  `Button`'s base prop shape. (See Key Technical Decisions for why the
  conditional / overloaded form was rejected.)

## Scope Boundaries

- Out of scope: a Roadie `<Link>` for inline prose links inside `<Prose>`.
  May follow as a separate small addition; not required by this plan.
- Out of scope: tracking implementation. Roadie ships only the documentation
  pattern; the actual `<Tracked>` component lives in consumer apps.
- Out of scope: `Steps` link tabs. `StepsTrigger` is button-only today and
  there's no consumer demand. Defer.
- Out of scope: `Tabs.Tab` reordering for link-tab routing on URL change —
  stays a Base UI concern, no Roadie-side state machine wiring.
- Out of scope: a Roadie codemod for the website migration. The website
  call-site sweep is hand-rolled at consumer time.

### Deferred to Separate Tasks

- Inline prose `<Link>` primitive: separate plan; can reuse the same provider.
- Website `LinkButton.tsx` deletion + `<Tracked>` rollout: separate PR in
  `TicketSolutions.Oztix.Website` once Roadie ships the new API.
- Removal of deprecated `LinkButton` / `LinkIconButton` exports: separate
  major version bump.

## Context & Research

### Relevant Code and Patterns

- `packages/components/src/components/Button/Button.tsx:42–57` — current
  Base UI Button wrapper, sets `nativeButton={!props.render}` so `render`
  swaps the underlying tag. The href shim plugs in here.
- `packages/components/src/components/Button/IconButton.tsx` — pure
  pass-through to Button. Inherits the change automatically.
- `packages/components/src/components/LinkButton/LinkButton.tsx:38–54` and
  `LinkIconButton.tsx:31–47` — non-Base-UI wrappers that share
  `buttonVariants` from Button. Become deprecated aliases.
- `packages/components/src/components/Card/CardRoot.tsx:24–25` — already
  routes element on `href` (`Component = as || (rest.href ? 'a' : 'div')`).
  Pattern extends to read the configured Link from the provider.
- `packages/components/src/components/Breadcrumb/BreadcrumbLink.tsx:10–26`
  — server-safe `as`-polymorphic anchor wrapper. Same delegation pattern.
- `packages/components/src/components/Carousel/CarouselTitleLink.tsx:25–55`
  — already `'use client'`. Reads context directly.
- `packages/components/src/components/Tabs/TabsTab.tsx:15–25` — Base UI
  Tabs.Tab. Adds `href` via `render` synthesis (per BASE_UI.md §3).
- `packages/components/src/providers/ThemeProvider.tsx:1–443` — reference
  shape for context provider: `'use client'`, `createContext`, stable
  `useMemo` value, dev-only warnings via `isDev()`.
- React 19 — Roadie targets React 19, where `ref` is a regular prop on
  function components and `forwardRef` is deprecated. Every new file in
  this plan accepts `ref` directly as a prop (typed via
  `RefAttributes<…>` intersection like the existing Base UI wrappers in
  `Button.tsx:38–40`). No `forwardRef` calls anywhere.
- `docs/src/components/Providers.tsx` — single client wrapper around
  `ThemeProvider`. Site-level mount point for `RoadieLinkProvider`.
- `TicketSolutions.Oztix.Website/src/components/Link.tsx` — the canonical
  consumer Link shim: `next/link` plus `isExternalAppRoute(href)` short-
  circuit to `<a>`. Plan must allow this exact component to plug in.

### Institutional Learnings

- `docs/solutions/best-practices/verifying-base-ui-runtime-contract-from-source.md`
  — read Base UI's runtime types from source before assuming an API; the
  `render` contract has subtle edges around prop merging.
- `docs/solutions/rsc-patterns/compound-export-namespace.md` — server-safe
  `index.tsx` + per-file leaves is what makes the property-assignment
  compound work in RSC. The new `Link` compound and the smart-delegation
  child files must follow this layout.
- `docs/contributing/BASE_UI.md` §3 — **policy**: don't invent `as` on
  Base UI consumers. Plan respects this — Button uses `render` synthesis,
  not `as`.
- `docs/contributing/BASE_UI.md` §7 — `'use client'` only where needed.
  Plan keeps `CardRoot`, `BreadcrumbLink`, and `index.tsx` files server-
  safe by delegating client-context reads to a sibling leaf.
- `docs/contributing/COMPOUND_PATTERNS.md` §2.6 — context modules need
  `'use client'` because `createContext` at module scope makes the module
  a client module under Next's rules. `RoadieLinkProvider` and its
  context module must follow this.

### External References

- Base UI composition / render prop: https://base-ui.com/react/overview/composition
- `next/link` (App Router): https://nextjs.org/docs/app/api-reference/components/link
  — confirms ref forwarding shape, prefetch behavior, supports being
  passed via Roadie's component-form `render`.
- `rel='noopener noreferrer'` rationale: https://web.dev/articles/external-anchors-use-rel-noopener

## Key Technical Decisions

- **`href` becomes the universal routing prop, not `as` or `render`.** `as` and
  `render` remain available as escape hatches but are demoted to advanced usage
  in docs. New default: pass `href`, get the right element + router.
  _Rationale:_ one prop, one mental model. `as` and `render` solve different
  problems (custom elements, full prop control); they don't belong on the happy
  path for the team.

- **Server-safe components delegate via a client sibling, never read context
  directly.** `CardRoot.tsx` stays server-safe; when `href` is set, it renders
  a `<RoadieRoutedLink>` client child that reads `useRoadieLink()`. Same for
  `BreadcrumbLink`. _Rationale:_ `useContext` forces `'use client'` on the
  reading file. Direct consumption would regress every server-rendered Card
  into a client boundary. The delegation child is tree-shaken when no `href`
  is passed because the import side-effect cost is one small chunk and Next
  client-reference-proxies handle the boundary.

- **Provider stores a `Link` _component_, not a routing function.** Same shape
  as `next/link`'s component API, which means consumers can pass
  `import Link from 'next/link'` directly, or any wrapper that takes `href`
  - `children`. _Rationale:_ lowest learning curve, no Roadie-specific
    contract to learn.

- **No `as` removal.** `as` stays in `Card`, `Breadcrumb`, `LinkButton`,
  `CarouselTitleLink` for back-compat and for cases where the Link itself
  isn't the right element (e.g. `Card as='button' onClick=…`). The `href`
  path takes precedence over `as` only when `href` is also present.
  _Rationale:_ zero-breakage migration; consumers pick their pace.

- **Base UI Button's render synthesis happens internally, opaque to the
  consumer.** When `href` is present and `props.render` is not, Button
  injects `render={<RoadieRoutedLink href={…} target=… rel=… />}` before
  forwarding to `ButtonPrimitive`. _Rationale:_ preserves Base UI's
  contract (`nativeButton={!props.render}`) without inventing parallel
  polymorphism, and lets consumers still override with their own `render`.
  **Implementer note:** the new own-props (`href`, `external`, `target`,
  `rel`) must be destructured out of `props` before the rest is spread
  into `ButtonPrimitive` — leaving `external` in the rest spread leaks a
  React unknown-attribute warning to the DOM, and leaving `href` in the
  rest spread when the consumer's own `render` wins puts an `href` on the
  rendered `<button>`.

- **Passing both `href` and an explicit `render` is a footgun and emits a
  dev warning.** The consumer `render` wins (preserves Base UI's
  contract), which silently disables provider-driven routing for that
  href. Component logs a single dev-only warning telling the consumer to
  pick one. _Rationale:_ the silent-disable is exactly the kind of
  "looks-right-but-isn't" failure mode the new API is supposed to remove.

- **External / protocol detection is a pure module-scope function**
  (`resolveLinkKind(href)`). _Rationale:_ runs identically on server and
  client, no hooks needed, easy to unit-test, called everywhere.

- **`LinkButton` and `LinkIconButton` deprecation strategy: type-preserving
  thin wrappers, not one-line aliases.** Today's
  `LinkButton<T extends ElementType = 'a'>` is generic over the element
  type and exposes `as?: T` plus `Omit<ComponentProps<T>, …>`. Re-
  exporting `Button` directly (`export const LinkButton = Button`) would
  silently break consumers using `<LinkButton<typeof MyLink> as={MyLink}
customLinkProp='x' />` because `Button` does not accept `as` and is not
  generic. The deprecation wrappers therefore preserve the existing
  generic signature on the public type, and at runtime forward to
  `<Button href={…} render={<As {...rest} />}>` (or `<Button href={…}>`
  when `as` is absent). _Rationale:_ zero type-level breakage at the
  consumer surface; the runtime collapses to the new path. _Verification
  to do during implementation:_ confirm `LinkButtonIntent` literals
  (notably `'brand-secondary'`) all exist in
  `intentVariants` exported from `packages/components/src/variants.ts` —
  if any literal was unique to LinkButton, propagate it to the shared
  intent map before collapsing.

- **Tracking is a docs page, not a component.** Roadie ships
  `docs/src/app/recipes/tracking/page.mdx` describing the
  `<Tracked>{<Button href=… />}</Tracked>` pattern. _Rationale:_ tracking
  taxonomy (PostHog event names, `pageSection`) is product-shaped.
  Coupling Roadie to it makes the package opinionated about analytics.

## Open Questions

### Resolved During Planning

- _Should the provider be context-only or accept a render-prop slot?_
  → Context only. Render-prop slots conflict with Base UI's existing
  `render` and complicate type inference.
- _Should Roadie auto-derive external from `href`?_
  → Yes. Heuristic in `resolveLinkKind`. Consumers can still set
  `external={false}` to force an internal route through the configured
  Link (e.g. an `https://oztix.com.au` URL that should still go through
  Next routing in some contexts).
- _Where do Card / Breadcrumb's delegation children live in the file
  layout?_
  → Sibling leaf in the compound folder, e.g.
  `Card/CardLinkAnchor.tsx`, `Breadcrumb/BreadcrumbAnchor.tsx`. Per the
  per-file leaf rule (`COMPOUND_PATTERNS.md` §2). `index.tsx` re-exports
  nothing new — this leaf is internal-only.
- _Should `Card href=` keep the `is-interactive` auto-application?_
  → Yes. Existing behavior at `CardRoot.tsx:24` is preserved.
- _Does the docs site keep `next/link` direct imports for non-Roadie
  surfaces (Navigation, FooterNav, CodePreview)?_
  → Yes. `next/link` is fine for nav components. Provider exists for
  Roadie components only.

### Deferred to Implementation

- Whether `LinkButton` / `LinkIconButton` files emit a runtime
  `console.warn` in dev or rely on JSDoc `@deprecated` only. Pick during
  implementation based on whether dev-warning noise outweighs migration
  visibility. (Distinct from the `<Button href + render>` co-occurrence
  warning, which is decided — see Key Technical Decisions.)
- Whether `RoadieRoutedLink` is exported as a public primitive
  (`@oztix/roadie-components/link`) or kept internal-only. Default
  internal until a consumer asks for it. Unit 2 ships it internal-only;
  flipping to public later is a one-line `index.tsx` change.
- Whether the docs site's `Providers.tsx` should mount
  `RoadieLinkProvider` lazily (Suspense) — `next/link` is synchronous,
  shouldn't be needed.
- Final shape of dev warning when a consumer passes `target='_blank'`
  without `rel='noopener'` and `external` is false. Likely: warn in dev,
  no enforcement.

## High-Level Technical Design

> _Directional guidance for review, not implementation specification._

```text
┌─ App root (consumer) ──────────────────────────────┐
│ <RoadieLinkProvider Link={NextLink}>               │
│   <ThemeProvider>...</ThemeProvider>               │
│ </RoadieLinkProvider>                              │
└────────────────┬───────────────────────────────────┘
                 │ context.value = NextLink
                 ▼
   ┌─────────────────────────────────────────────────┐
   │  Component decision tree (per render)           │
   │  href ──┬── undefined → <button> | <div>        │
   │         │                                       │
   │         └── string ──> resolveLinkKind(href)    │
   │                ├─ external → <a target rel>     │
   │                ├─ protocol → <a>                │
   │                └─ internal ─┬─ Link injected    │
   │                             │   → <Link href>   │
   │                             └─ no provider      │
   │                                 → <a href>      │
   └─────────────────────────────────────────────────┘
```

**Per-component routing path:**

| Component           | Today                 | After                                                 | Boundary                                                      |
| ------------------- | --------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `Button`            | `render` for anchors  | `href` → synthesized `render={<RoadieRoutedLink/>}`   | client (current)                                              |
| `IconButton`        | inherits Button       | inherits Button                                       | client (current)                                              |
| `LinkButton`        | own component         | re-exports Button (`@deprecated`)                     | unchanged                                                     |
| `LinkIconButton`    | own component         | re-exports IconButton (`@deprecated`)                 | unchanged                                                     |
| `Card`              | `href` → `<a>` static | `href` → delegates to `<RoadieRoutedLink/>`           | server-safe (delegation crosses to client only when href set) |
| `BreadcrumbLink`    | `as`-polymorphic      | adds `href` → delegates to `<RoadieRoutedLink/>`      | server-safe                                                   |
| `CarouselTitleLink` | `as`-polymorphic      | adds `href`, reads provider directly (already client) | client (current)                                              |
| `Tabs.Tab`          | button-only           | adds `href` → synthesized Base UI `render`            | client (current)                                              |

**`RoadieRoutedLink` (internal client primitive)** is the single place that
reads `useRoadieLink()` and `resolveLinkKind`. Every smart-href component
delegates to it. Ten lines of code, one test file.

## Implementation Units

- [x] **Unit 1: Provider, context, and link-resolution helper**

**Goal:** Ship the `RoadieLinkProvider`, `useRoadieLink` hook, and the
pure `resolveLinkKind` helper. Lay the foundation everything else
delegates to.

**Requirements:** R8, R9

**Dependencies:** none

**Files:**

- Create: `packages/components/src/providers/RoadieLinkContext.ts` — `'use client'`, `createContext` at module scope.
- Create: `packages/components/src/providers/RoadieLinkProvider.tsx` — `'use client'`, the provider component + `useRoadieLink` hook export.
- Create: `packages/components/src/utils/resolveLinkKind.ts` — server-safe pure function.
- Create: `packages/components/src/utils/resolveLinkKind.test.ts` — unit tests.
- Modify: `packages/components/src/index.tsx` — export `RoadieLinkProvider`, `useRoadieLink`, `type RoadieLinkComponent`.
- Modify: `packages/components/src/providers/RoadieLinkProvider.test.tsx` — provider behavior tests.

**Approach:**

- Provider stores `Link: ComponentType<RoadieLinkProps> | null` in context (default `null`). `useRoadieLink()` returns the context value (or `null`).
- `RoadieLinkProps` shape mirrors what `next/link` exposes for SSR-safe usage: `href`, `children`, `className`, `onClick`, `target`, `rel`, `ref`, plus `data-*` and `aria-*` passthrough.
- Provider memoizes the value with `useMemo([Link])` so re-renders only happen when the consumer swaps Link.
- Dev-mode warning if a `Link` prop changes identity across renders (mirrors `ThemeProvider`'s controlled/uncontrolled warning pattern in `ThemeProvider.tsx:259–269`).
- `resolveLinkKind(href)` returns one of `'button' | 'external' | 'protocol' | 'internal'`. Module-scope regex; no hooks; pure function.

**Patterns to follow:**

- `packages/components/src/providers/ThemeProvider.tsx` — context shape, `'use client'` placement, dev warnings via `isDev()`.
- `docs/contributing/COMPOUND_PATTERNS.md` §2.6 — `*Context.ts` `'use client'` rule.

**Test scenarios:**

- _Happy path:_ `useRoadieLink()` returns the configured Link when called inside `<RoadieLinkProvider Link={Stub}>`.
- _Happy path:_ `useRoadieLink()` returns `null` when called outside any provider (no throw).
- _Edge case:_ re-rendering `RoadieLinkProvider` with the same `Link` reference does not change context identity (assert via `useMemo`-driven equality).
- _Edge case:_ `resolveLinkKind('https://example.com')` → `'external'`; `'//example.com'` → `'external'`.
- _Edge case:_ `resolveLinkKind('mailto:a@b.com')` → `'protocol'`; `'tel:+61400000000'` → `'protocol'`.
- _Edge case:_ `resolveLinkKind('/events/123')` → `'internal'`; `'./local'` → `'internal'`; empty string → `'internal'` (pass-through, caller's responsibility).
- _Edge case:_ `resolveLinkKind(undefined)` → `'button'`.
- _Error path:_ dev warning fires when `Link` prop reference changes between renders without explicit re-mount; suppressed in production builds.

**Verification:**

- All tests pass under `pnpm --filter @oztix/roadie-components test`.
- `RoadieLinkProvider` and `useRoadieLink` exported from `@oztix/roadie-components`.
- No new `'use client'` directives in `index.tsx`.

---

- [x] **Unit 2: Internal `RoadieRoutedLink` primitive**

**Goal:** A single, internal client-side anchor that reads the provider,
applies external-link safety attributes, and is the delegation target
for every smart-href component.

**Requirements:** R2, R3, R4, R5, R9

**Dependencies:** Unit 1

**Files:**

- Create: `packages/components/src/components/Link/RoadieRoutedLink.tsx` — `'use client'`, the routing primitive.
- Create: `packages/components/src/components/Link/RoadieRoutedLink.test.tsx` — behavior tests.
- Create: `packages/components/src/components/Link/index.tsx` — server-safe. Ships internal-only by default (Unit 2 does not re-export `RoadieRoutedLink` from the public root barrel). The decision to expose a public `<Link>` primitive is deferred — see Open Questions; flipping later is a one-line change here.

**Approach:**

- Accepts: `href: string`, optional `external?: boolean`, optional `target?: string`, optional `rel?: string`, plus pass-through props (`className`, `onClick`, `children`, `ref`, etc.). `ref` is a regular prop (React 19) — no `forwardRef`.
- Resolves `kind = external ? 'external' : resolveLinkKind(href)`.
- For `'external'`: renders `<a target={target ?? '_blank'} rel={rel ?? 'noopener noreferrer'} href={href}>`.
- For `'protocol'`: renders `<a href={href}>` (no target, no rel).
- For `'internal'`: if context Link is non-null, renders `<Link href={href} {...rest}>`; else `<a href={href}>`.
- Passes `ref` straight through to the underlying anchor (or to the consumer's `Link`, which accepts `ref` as a prop in React 19 / Next 15+).
- Reads context once at the top of the component; no `useEffect`.

**Patterns to follow:**

- Base UI render-target convention from `Button.tsx:51`: spread props onto the rendered element.
- `next/link` ref forwarding: `next/link` accepts `ref` directly in App Router; pass it through.

**Test scenarios:**

- _Happy path:_ internal href + provider configured → renders the configured Link with `href` attribute.
- _Happy path:_ internal href + no provider → renders plain `<a href>`.
- _Happy path:_ external href → renders `<a target='_blank' rel='noopener noreferrer'>`, ignores provider entirely.
- _Happy path:_ `mailto:` href → renders `<a href='mailto:…'>` with no `target`, no `rel`.
- _Edge case:_ consumer passes `external={false}` with an `https://` href → renders the configured Link (forced internal).
- _Edge case:_ consumer passes `target='_self'` on an external href → respects the override, drops the auto `_blank`.
- _Edge case:_ `onClick` is forwarded and called once on click; `e.preventDefault()` in consumer onClick still works.
- _Integration:_ a fake Link component receives `href`, `className`, `data-testid`, and `ref` correctly when used as the configured Link.

**Verification:**

- All tests pass.
- Component is not exported from `@oztix/roadie-components` root barrel in this unit (deferred — see Open Questions).
- File carries `'use client'`; `index.tsx` does not.

---

- [x] **Unit 3: `Button` and `IconButton` accept `href`**

**Goal:** Make `<Button href='/x'>` and `<Button href='https://…'>` work
with router-aware behavior, while preserving existing `render={…}`
escape hatch and the Base UI `nativeButton` contract.

**Requirements:** R1, R2, R3, R6, R11

**Dependencies:** Unit 2

**Files:**

- Modify: `packages/components/src/components/Button/Button.tsx` — add `href`, `external`, `target`, `rel` props; synthesize `render` from `RoadieRoutedLink` when applicable.
- Modify: `packages/components/src/components/Button/Button.test.tsx` — add href tests.
- Modify: `packages/components/src/components/Button/IconButton.test.tsx` — confirm IconButton inherits the new behavior (one happy-path test).
- Modify: `packages/components/src/components/Button/index.tsx` — no public-API change; add the new prop types to the existing exports.

**Approach:**

- New `ButtonHrefProps`: `href?: string; external?: boolean; target?: string; rel?: string`.
- **Destructure first.** Pull `href`, `external`, `target`, `rel` out of `props` before any spread — these are Roadie-only props and must never reach Base UI's `ButtonPrimitive` or the rendered DOM. Failing to destructure leaks `external=""` as an unknown attribute and puts `href` onto rendered `<button>` elements when consumer `render` wins.
- If `props.render` is set **and** `href` is also set: log a single dev-only warning ("`href` and `render` together — `render` wins, provider routing disabled. Pick one.") and let `render` win. Quiet in production.
- Else if `props.render` is set (no `href`): pass through unchanged. Consumer `render` is the canonical escape hatch.
- Else if `href` is set: synthesize `render={<RoadieRoutedLink href={href} external={external} target={target} rel={rel} />}` before forwarding. The synthesis flips `nativeButton={!props.render}` to `false` automatically.
- Else: pass through unchanged → `nativeButton={true}` → renders `<button>`.
- Update `ButtonProps` type to include the new fields. Type them as plain optional strings/booleans on the base shape (no conditional / overloaded discrimination — see R11 and the architectural decision in Key Technical Decisions). Consumers needing anchor-only DOM props (`download`, `hreflang`, `referrerPolicy`) reach for `render={<a download …>}` or the deprecated typed `LinkButton<typeof MyLink>` wrapper.

**Patterns to follow:**

- `Button.tsx:51` — `nativeButton={!props.render}` is the existing contract. Synthesizing render hooks into this naturally.
- `BASE_UI.md` §3 — "use Base UI's `render` prop … do not invent a custom `as` / `ElementType` / `asChild` API." Plan respects this; `href` is just sugar that resolves into `render`.

**Test scenarios:**

- _Happy path:_ `<Button href='/x'>` renders an `<a href='/x'>` (or the configured Link if provider is wired in test).
- _Happy path:_ `<Button href='https://example.com'>` renders `<a href target='_blank' rel='noopener noreferrer'>`.
- _Happy path:_ `<Button onClick={…}>` (no href) still renders a `<button>` with `nativeButton=true`.
- _Edge case:_ `<Button href='/x' render={<a href='/y' />}>` — consumer `render` wins; renders `<a href='/y'>`. Verifies `render` priority **and** that a single dev-mode warning is logged for the conflicting props (suppressed in production).
- _Edge case:_ `<Button external={true}>` does not leak `external` as an HTML attribute on the rendered element (regression test for the destructure).
- _Edge case:_ `<Button render={<button />} href='/x'>` — consumer `render` wins; the rendered `<button>` does **not** carry an `href` attribute (regression test for the destructure when render is a non-anchor element).
- _Edge case:_ `<Button href='/x' external={true}>` — forces external treatment on an internal-looking href.
- _Edge case:_ `<Button href='https://oztix.com.au' external={false}>` — forces internal routing through provider.
- _Edge case:_ `<Button>` (no href, no onClick, no render) — renders `<button>`, no warnings.
- _Integration:_ IconButton inherits — `<IconButton href='/x' aria-label='Go'>` renders the same routed anchor as Button.
- _Integration:_ CVA classes (`buttonVariants`) apply identically whether the underlying element is `<button>` or `<a>`.

**Verification:**

- Existing Button / IconButton tests still pass.
- New tests pass.
- `Button.tsx` has no new `'use client'` placement (already had it).
- Bundle size of `Button.js` does not grow by more than ~200 bytes (assert via dist inspection or note in PR).

---

- [x] **Unit 4: `LinkButton` / `LinkIconButton` deprecation**

**Goal:** Collapse `LinkButton` and `LinkIconButton` into thin
type-preserving wrappers around `Button` and `IconButton` that keep the
existing `<T extends ElementType>` generic surface intact. Mark
`@deprecated`. Preserve the public API for one minor cycle.

**Requirements:** R1

**Dependencies:** Unit 3

**Files:**

- Modify: `packages/components/src/components/LinkButton/LinkButton.tsx` — re-export `Button` as `LinkButton` with `@deprecated` JSDoc.
- Modify: `packages/components/src/components/LinkButton/LinkIconButton.tsx` — re-export `IconButton` as `LinkIconButton` with `@deprecated` JSDoc.
- Modify: `packages/components/src/components/LinkButton/index.tsx` — keep public exports; reference Button types.
- Modify: `packages/components/src/components/LinkButton/LinkButton.test.tsx` — verify back-compat: existing API surface still works (intent, emphasis, size, href).
- Modify: `packages/components/src/components/LinkButton/LinkIconButton.test.tsx` — same.

**Approach:**

- Wrappers, **not** one-line re-exports. Consumers today write
  `<LinkButton<typeof MyLink> as={MyLink} customLinkProp='x' />`. That
  generic-with-`as` shape doesn't exist on `Button`, and a bare
  `export const LinkButton = Button` would silently break those calls
  at the type level.
- `LinkButton` keeps its current generic surface
  (`LinkButtonProps<T extends ElementType = 'a'>` with `as?: T`,
  `Omit<ComponentProps<T>, …>`, intent/emphasis/size). Internally it
  collapses to `<Button href={…} render={<As {...rest} />}>` when `as`
  is set, or `<Button href={…} {...rest}>` otherwise. The new `Button`
  rules (destructure of `external`/`target`/`rel`, dev warning for
  `href + render`) apply automatically.
- `LinkIconButton` mirrors the shape, passing `size='icon-md'` defaults
  through to `IconButton`.
- JSDoc on the public exports:
  `@deprecated Use \`Button\` with \`href\` instead. Will be removed in v3.0.0.`
- Runtime `console.warn` deferred (see Open Questions).
- Pre-collapse audit: confirm every literal in `LinkButtonIntent`
  (notably `'brand-secondary'` per `LinkButton.tsx:7–15`) exists in the
  shared `intentVariants` map (`packages/components/src/variants.ts`).
  If any literal is unique to `LinkButton`, hoist it into
  `intentVariants` first so collapsing doesn't drop a valid intent.

**Patterns to follow:**

- TypeScript's `@deprecated` JSDoc tag — IDE shows strikethrough.

**Test scenarios:**

- _Happy path:_ `<LinkButton href='/x' intent='accent'>` renders the same DOM and classes as `<Button href='/x' intent='accent'>`.
- _Happy path:_ `<LinkButton<typeof CustomLink> as={CustomLink} href='/x' customLinkProp='y'>` forwards `customLinkProp` onto `CustomLink` and `customLinkProp` is required by TS via the preserved `<T>` generic.
- _Happy path:_ `<LinkIconButton aria-label='Cart' href='/cart'>` renders an icon-sized routed anchor with the IconButton's default `icon-md` sizing.
- _Edge case:_ `<LinkButton intent='brand-secondary'>` still type-checks and renders the brand-secondary intent (regression test for the literal-hoist audit).
- _Edge case:_ importing `LinkButtonProps` and `LinkButtonProps<typeof MyLink>` types from `@oztix/roadie-components` still resolve.
- _Integration:_ Existing LinkButton snapshot/class assertions continue to pass without modification.

**Verification:**

- Existing LinkButton/LinkIconButton tests pass unmodified except for any that hard-asserted internal CSS class names now applied via Button.
- Public types unchanged from a consumer perspective; `<T extends ElementType>` generic preserved.

---

- [x] **Unit 5: `Card` href routes through provider via client delegation**

**Goal:** When a Card has `href`, render through the configured Link
(or external rules), without forcing CardRoot into a client boundary
in the no-href case.

**Requirements:** R1, R2, R3, R5, R6

**Dependencies:** Unit 2

**Files:**

- Modify: `packages/components/src/components/Card/CardRoot.tsx` — keep server-safe; when `href` is present, render `<RoadieRoutedLink>` (imported from the internal Link folder); when not, unchanged.
- Modify: `packages/components/src/components/Card/Card.test.tsx` — extend href tests to verify provider integration.
- Modify: `packages/components/src/components/Card/index.tsx` — no API change.

**Approach:**

- `CardRoot.tsx`: when `props.href` is set, render `<RoadieRoutedLink {...props} className={cardVariants(...)}>` instead of the bare `Component`.
- **`as` is the documented escape hatch** (Card is not a Base UI consumer, so per BASE_UI.md §3 `as` is the right polymorphism API here). `as` always wins over the auto-routing — `<Card as='button' onClick={…}>` renders a `<button>`, `<Card as={MyCustomLink} href='/x'>` renders the custom component without provider routing. Consumers reach for `as` when they need a non-anchor element or want to bypass `RoadieRoutedLink` entirely.
- Decision tree: `as` set → use `as` (escape hatch); else `href` set → `RoadieRoutedLink`; else `<div>`.
- `is-interactive` continues to apply when `href` or `onClick` is set (preserves current behavior at `CardRoot.tsx:24`).
- **Why CardRoot stays server-safe.** Server components can render client components — Next's App Router resolves the imported `'use client'` module to a client-reference proxy, which crosses the boundary at render time. `CardRoot.tsx` itself never calls `useContext` and so does not pick up the `'use client'` boundary at the module level. (Reviewed against Next.js App Router rules; the equivalent pattern already works in Carousel where a server-safe `index.tsx` re-exports client leaves.)
- **What stays unchanged about RSC compatibility.** Today's `CardRoot` already accepts `onClick`, and an RSC consumer passing `onClick={someServerFn}` already fails ("Functions cannot be passed directly to Client Components"). This plan does not change that — server consumers passing function props to `Card` were never RSC-compatible and remain so.
- **Bundle impact.** When a page renders a Card, Next registers `RoadieRoutedLink` as a client reference for that page's module graph regardless of whether `href` is passed at runtime. Net cost: one small client-side chunk in the consumer's main bundle, evaluated only when a Card with `href` actually renders. (Earlier draft of this plan claimed "tree-shaking when href is unused" — that's incorrect at the server-graph level and has been removed.)

**Patterns to follow:**

- `CardRoot.tsx:23–37` — existing routing logic; extend, don't replace.
- `BASE_UI.md` §7 — `'use client'` only where needed.

**Test scenarios:**

- _Happy path:_ `<Card href='/event/123'>` renders an anchor (or the provider's Link in test) with `href` and `is-interactive`.
- _Happy path:_ `<Card>` with no `href` and no `onClick` renders a `<div>`, no `is-interactive`. (Existing test, must still pass.)
- _Happy path:_ `<Card href='https://stripe.com'>` renders `<a target='_blank' rel='noopener noreferrer'>`.
- _Edge case:_ `<Card as='a' href='/x'>` — `as` wins; renders straight anchor without provider routing. (Back-compat.)
- _Edge case:_ `<Card as='button' onClick={…}>` — renders `<button>`, no anchor.
- _Edge case:_ `<Card href='/x' onClick={onTrack}>` — anchor, `is-interactive`, onClick fires on click.
- _Integration:_ RSC smoke test (`/debug/rsc-smoke` page) renders a `<Card>` with no href in a server component without crashing — verifies CardRoot stays server-safe.
- _Integration:_ RSC smoke test renders a `<Card href='/x'>` inside a server component — the delegation crosses to client correctly.

**Execution note:** Add an entry to `/debug/rsc-smoke` for both no-href and href Cards before changing CardRoot. Catch a `'use client'` regression early.

**Verification:**

- Card RSC smoke page builds and renders.
- No new `'use client'` at the top of `CardRoot.tsx`.
- `head -c 13 packages/components/dist/components/Card/CardRoot.js` does **not** show `"use client";`.

---

- [x] **Unit 6: `BreadcrumbLink` accepts `href` directly via the same delegation pattern**

**Goal:** `<Breadcrumb.Link href='/x'>` routes through the provider
without making BreadcrumbLink client.

**Requirements:** R1, R2, R3, R5

**Dependencies:** Unit 2

**Files:**

- Modify: `packages/components/src/components/Breadcrumb/BreadcrumbLink.tsx` — keep server-safe; when `href` is set without `as`, render `<RoadieRoutedLink>`.
- Modify: `packages/components/src/components/Breadcrumb/Breadcrumb.test.tsx` (or `BreadcrumbLink.test.tsx` if separate) — add href + provider tests.

**Approach:**

- Same shape as Card: `as` wins; else `href` → `RoadieRoutedLink`; else default `<a>` (preserves current at `BreadcrumbLink.tsx:15`).
- **`as` remains the documented escape hatch** (BreadcrumbLink is not a Base UI consumer). Use `as` to substitute a custom component or bypass provider routing.
- Passes through current `text-subtle transition-colors hover:text-normal` classes.
- **Why BreadcrumbLink stays server-safe.** Identical rationale to Unit 5 — `BreadcrumbLink.tsx` imports `RoadieRoutedLink` (`'use client'`) but never calls `useContext` itself. Next resolves the import as a client-reference proxy and crosses the boundary at render time. The file stays without a `'use client'` directive.

**Patterns to follow:**

- `BreadcrumbLink.tsx:10–26` — existing structure.

**Test scenarios:**

- _Happy path:_ `<Breadcrumb.Link href='/events'>` renders the configured Link; classes match.
- _Edge case:_ `<Breadcrumb.Link as={CustomLink} href='/x'>` — `as` still wins.
- _Edge case:_ `<Breadcrumb.Link href='https://external'>` — anchor with `target='_blank' rel='noopener noreferrer'`.
- _Integration:_ RSC smoke test renders a Breadcrumb compound in a server component.

**Verification:**

- `head -c 13 packages/components/dist/components/Breadcrumb/BreadcrumbLink.js` does **not** show `"use client";` (parity with the Card check).
- RSC smoke page renders a Breadcrumb in a server component without crashing.

---

- [x] **Unit 7: `CarouselTitleLink` and `Tabs.Tab` adopt `href`**

**Goal:** Bring the remaining link-shaped surfaces in line.

**Requirements:** R1, R2, R3

**Dependencies:** Unit 2

**Files:**

- Modify: `packages/components/src/components/Carousel/CarouselTitleLink.tsx` — accept `href`; when set, render `<RoadieRoutedLink>` (already client, no boundary concern).
- Modify: `packages/components/src/components/Carousel/Carousel.test.tsx` — extend the `Carousel.TitleLink` test cases (currently at lines 469–529) for provider-driven routing.
- Modify: `packages/components/src/components/Tabs/TabsTab.tsx` — accept optional `href`; when set, synthesize `render={<RoadieRoutedLink href={…} />}` and forward to Base UI's Tabs.Tab.
- Modify: `packages/components/src/components/Tabs/Tabs.test.tsx` — add link-tab cases.

**Approach:**

- CarouselTitleLink: read provider via `useRoadieLink()` directly (already `'use client'`). When `href` set, route through `RoadieRoutedLink` to keep the same external/internal/protocol logic. **`as` remains the escape hatch** (not a Base UI consumer) — `<Carousel.TitleLink as={MyLink}>` bypasses provider routing.
- TabsTab: when `props.href` is set and no `props.render`, synthesize `render={<RoadieRoutedLink href={…} />}` **and** pass `nativeButton={false}` to `TabsPrimitive.Tab`. Base UI's Tabs.Tab defaults to `nativeButton=true`; if we synthesize a non-`<button>` render without flipping `nativeButton`, Base UI emits a dev-mode warning per `useButton` (`node_modules/@base-ui/react/.../use-button/useButton.js:40–50`). Same Button-side pattern (destructure `href`/`external`/`target`/`rel` before forwarding the rest).
- TabsTab still keeps its button semantics by default. With the anchor synthesis path, Base UI's `useCompositeItem` propagates `role='tab'`, `aria-controls`, `aria-selected`, and roving `tabIndex` onto the rendered `<a>` — verified against Base UI's TabsTab source.
- **Enter-key activation timing on link-tabs.** Pressing Enter on a rendered anchor fires native browser navigation immediately. Base UI's `onClick` handler (which calls `onTabActivation` and the consumer's `onValueChange`) runs in the same click event but the navigation is what consumers care about. Practical implication: link-tabs are best used when the destination URL is the source of truth for `Tabs.value` (e.g. derive `value` from `usePathname()` rather than from a controlled local state). The Linking foundations page (Unit 8) documents this constraint.

**Test scenarios:**

- _Happy path:_ `<Carousel.TitleLink href='/events'>` renders provider Link.
- _Edge case:_ CarouselTitleLink existing `as` API still works (back-compat).
- _Happy path:_ `<Tabs.Tab value='events' href='/events'>Events</Tabs.Tab>` renders an anchor inside the tabs roving tabindex group.
- _Edge case:_ `<Tabs.Tab value='settings'>Settings</Tabs.Tab>` (no href) renders a button — unchanged.
- _Edge case:_ `<Tabs.Tab href='/x'>` does **not** emit Base UI's "nativeButton with non-button render" dev warning (regression test for the `nativeButton={false}` flip; capture via `console.warn` spy).
- _Integration:_ Tabs keyboard nav (arrow keys) still works when one of the tabs is a link-tab — proves render synthesis doesn't break Base UI's accessibility.
- _Integration:_ Pressing Enter on a focused link-tab fires both the consumer's `onValueChange` and triggers anchor navigation in the same event (use a stub Link that asserts the click event propagated).

**Verification:**

- Existing Carousel and Tabs tests pass.
- New tests pass.

---

- [ ] **Unit 8: Documentation — Linking foundations + Tracking recipe**

**Goal:** A single foundations page is the canonical reference for
linking. Component docs cross-link to it. A recipes page documents the
recommended consumer-app tracking pattern.

**Requirements:** R7, R10

**Dependencies:** Units 1–7

**Files:**

- Create: `docs/src/app/foundations/linking/page.tsx` — full guide: provider setup, `href` semantics, external/internal/protocol decision tree, escape hatches (`render`, `as`), security notes (`rel='noopener'`).
- Create: `docs/src/app/recipes/tracking/page.mdx` — `<Tracked>` wrapper pattern, including the website's reference implementation.
- Modify: `docs/src/app/components/button/page.mdx` — add an `### Href` example; cross-link to Linking foundations; remove `### With custom component` if redundant or rewrite.
- Modify: `docs/src/app/components/card/page.mdx` — same.
- Modify: `docs/src/app/components/breadcrumb/page.mdx` — same.
- Modify: `docs/src/app/components/tabs/page.mdx` — add link-tab example.
- Modify: `docs/src/app/components/carousel/page.mdx` — update title link example.
- Modify: `docs/src/app/components/link-button/page.mdx` — mark deprecated; redirect to Button.
- Modify: `AGENTS.md` — add a `### Linking` section under "Component Patterns" referencing the new foundations page and the `RoadieLinkProvider` requirement.
- Modify: `docs/contributing/BASE_UI.md` §3 — update the "policy for new components" callout to clarify that `href` is the universal sugar and `render`/`as` remain as escape hatches.

**Approach:**

- Foundations page sections:
  1. Quick start — single screenshot of `<RoadieLinkProvider Link={Link}>` mounted at the layout root + `<Button href='/x'>` example.
  2. The decision tree (visual + table) — `href` undefined → button, internal → provider Link or `<a>`, external → `<a target rel>`, protocol → plain `<a>`.
  3. Per-component reference — quick table of which components accept `href`.
  4. Escape hatches — concrete examples for every component, organised
     by which polymorphism API the component uses (per BASE_UI.md §3):
     - **Base UI consumers** (`Button`, `IconButton`, `Tabs.Tab`,
       deprecated `LinkButton`/`LinkIconButton`): the `render` prop.
       Show `<Button render={<a download='file.pdf' href='/file.pdf' />}>`
       for typed anchor-DOM-prop access; show
       `<Tabs.Tab render={(props, state) => <a {...props} data-active={state.selected} />}>`
       for the function form. Note that consumer `render` always wins
       over the synthesized provider routing — passing both `href` and
       `render` triggers a dev warning (per Key Technical Decisions).
     - **Non-Base-UI components** (`Card`, `Breadcrumb.Link`,
       `Carousel.TitleLink`): the `as` prop. Show
       `<Card as={MyCustomLink} href='/x'>` (bypasses provider routing
       in favour of `MyCustomLink`'s own routing) and
       `<Card as='button' onClick={…}>` (renders a button instead of an
       anchor). Note that `as` always wins over `href`-driven auto-
       routing.
     - Cross-link to BASE_UI.md §3 for the underlying policy.
     - Note that the deprecated `LinkButton<typeof MyLink>` generic
       remains the path for typed anchor-DOM-prop access (`download`,
       `hreflang`, `referrerPolicy`) on Button-shaped surfaces until a
       future major collapses it.
  5. Security — `rel='noopener noreferrer'` defaults, when to override.
  6. Provider configuration — `next/link`, the website's `Link` shim with `isExternalAppRoute`, and apps with no router.
  7. Link-tab gotcha — `<Tabs.Tab href>` works, but Enter triggers native navigation immediately. For controlled `Tabs.value`, derive from the route (`usePathname()`) rather than from controlled local state, otherwise the active-tab indicator can flicker between selection and route change.
- Recipes/tracking page:
  1. The problem: tracking shape is product-specific; Roadie shouldn't know.
  2. The pattern: `<Tracked pageSection='hero'>{<Button href='/x'>...</Button>}</Tracked>` — wrapper reads `currentTarget.href`/`textContent`/`aria-label`, captures, fires consumer onClick.
  3. Reference implementation snippet (matches the design proposed for `TicketSolutions.Oztix.Website/src/components/Tracked.tsx`).
  4. Why not bake this into Roadie (taxonomy, vendor, API shape).
  5. Optional `data-track-*` attribute convention.
- Component MDX updates: add `### Href` example to each, plus a `### Escape hatch` example showing the component's polymorphism API in action (`render` for Button/IconButton/Tabs.Tab/LinkButton/LinkIconButton; `as` for Card/Breadcrumb/Carousel.TitleLink). Replace any existing `### With custom component` section with the new escape-hatch example and a link to the Linking foundations page for the full reference.

**Patterns to follow:**

- `docs/contributing/COMPONENT_DOC_TEMPLATE.md` — section ordering, `tsx-live` blocks, frontmatter shape.
- `docs/src/app/foundations/theming/page.tsx` (or equivalent) — reference for an existing foundations page that cross-references a provider.

**Test scenarios:**

- _Test expectation: documentation only — no behavioral tests._ Verify by:
  - Foundations page renders without errors in `pnpm --filter docs dev`.
  - Every `tsx-live` example compiles.
  - Cross-links resolve (no broken anchors).

**Execution note:** Write the foundations page first; the component MDX changes derive from it.

**Verification:**

- Docs site builds.
- Manual review: every link-bearing component's MDX has at least one `href` example.
- AGENTS.md updated.

---

- [ ] **Unit 9: Wire the docs site to use `RoadieLinkProvider`**

**Goal:** Roadie's own docs site eats its own dog food. Internal nav,
footer, and any in-page CTAs route through the new provider.

**Requirements:** R10

**Dependencies:** Unit 1

**Files:**

- Modify: `docs/src/components/Providers.tsx` — wrap `ThemeProvider` in `RoadieLinkProvider Link={NextLink}`.
- Modify: `docs/src/components/Navigation.tsx`, `FooterNav.tsx`, `not-found.tsx` — replace ad-hoc `<Link>` + Button compositions with `<Button href>` where applicable. Keep raw `<Link>` for non-Roadie surfaces.
- Modify: `docs/src/components/CodePreview.tsx` — leave alone unless it uses Roadie buttons.

**Approach:**

- Pass `import NextLink from 'next/link'` directly. The docs site doesn't need an external-app-route shim like the website.
- Smoke-test by visiting key pages: `/components/button`, `/foundations/linking`, `/`.

**Test scenarios:**

- _Test expectation: integration only._ `pnpm --filter docs dev`, navigate from home → foundations/linking → components/button. Assert client routing (no full reload). Then test from Roadie button anchors specifically.
- _Edge case:_ visiting an `https://` link from a docs Roadie button opens in a new tab (manual check).

**Verification:**

- `pnpm --filter docs build` succeeds.
- Manual nav test passes.

---

- [ ] **Unit 10: Migration notes and changelog entry**

**Goal:** Communicate the change to consumers.

**Requirements:** R1

**Dependencies:** Units 1–9

**Files:**

- Create or modify: `.changeset/<id>.md` — `feat`-level changeset describing the new `RoadieLinkProvider`, `href`-on-Button-Card-Breadcrumb-Tabs-Carousel, and the LinkButton deprecation.
- Modify: `docs/migration/` (if present) — add a "Migrating LinkButton → Button + href" guide.

**Approach:**

- Changeset notes `LinkButton` as deprecated, not removed. Mention the foundations/linking page as the canonical reference.
- Migration guide ships a one-paragraph codemod recipe (rg + sed) for sweeping `<LinkButton href=…>` → `<Button href=…>` in consumer apps.

**Test scenarios:** _Test expectation: none — communication only._

**Verification:**

- Changeset present.
- Migration guide present in docs site.

## System-Wide Impact

- **Interaction graph:** The new provider sits at the React tree root in
  consumer apps and the docs site. It introduces one context read per
  Card with `href`, one per BreadcrumbLink with `href`, one per
  CarouselTitleLink, and one per Button with `href`. All reads are pure
  `useContext`, no subscriptions.
- **Error propagation:** `RoadieRoutedLink` falls back to plain `<a>` when
  the provider is missing. No runtime crash. Dev warning when no
  provider is wired but routing is requested (deferred).
- **State lifecycle risks:** None — context value is set once and never
  changes for the lifetime of the app.
- **API surface parity:** All link-bearing components converge on a single
  `href` API. `LinkButton` / `LinkIconButton` retain their public surface
  via re-export.
- **Integration coverage:** RSC smoke test (`/debug/rsc-smoke`) gains
  cases for Card-with-href and Breadcrumb-with-href in server components.
- **Unchanged invariants:**
  - `nativeButton={!props.render}` Base UI contract on Button.
  - Card's `is-interactive` auto-application when interactive.
  - `as` prop continues to take priority where it exists.
  - Existing `render` consumers on Button/Tabs.Tab continue to work
    unchanged (consumer `render` always wins over synthesized `render`).
  - `data-slot` attributes unchanged on every component.
  - Server-safe boundary for CardRoot, BreadcrumbLink, every `index.tsx`,
    and Button/IconButton (which were already client).

## Risks & Dependencies

| Risk                                                                                                                                | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useContext` accidentally added to a server-safe component, regressing RSC consumers.                                               | Explicit delegation pattern: server-safe components import a `'use client'` sibling instead of reading context directly. RSC smoke test covers it. Build verification: `head -c 13 dist/.../CardRoot.js` does not show `"use client";`.                                                                                                                                                                           |
| Base UI `render` prop merging order causes consumer `render` to lose to synthesized `render`.                                       | Test asserting consumer `render` priority. The synthesis runs before forwarding to Base UI; `props.render` short-circuits the synthesis.                                                                                                                                                                                                                                                                          |
| Consumer passes both `href` and an explicit `render` — `render` wins, provider routing is silently disabled.                        | Dev-mode warning ("`href` and `render` together — `render` wins, provider routing disabled. Pick one."). Decided in Key Technical Decisions.                                                                                                                                                                                                                                                                      |
| `external` / `href` leak as React unknown attributes when not destructured before forwarding into Base UI.                          | Explicit destructure step in Unit 3's Approach; regression tests (`<Button external>` does not produce a DOM `external` attribute; `<Button render={<button />} href>` does not emit `href` on the button).                                                                                                                                                                                                       |
| `<Tabs.Tab href>` triggers Base UI's "nativeButton with non-button render" dev warning.                                             | Pass `nativeButton={false}` alongside the synthesized render in TabsTab. Test captures `console.warn` to assert the warning does not fire.                                                                                                                                                                                                                                                                        |
| `LinkButton` / `LinkIconButton` consumers depend on the deprecated component re-applying class names that Button doesn't.           | LinkButton tests assert DOM/class parity with Button. If parity gap exists, the deprecation wrapper applies the missing classes itself.                                                                                                                                                                                                                                                                           |
| External-link auto-detection (`https://oztix.com.au/...`) treats first-party Oztix URLs as external.                                | `external={false}` opt-out documented; foundations page calls this out for the website specifically.                                                                                                                                                                                                                                                                                                              |
| Provider-mismatch dev warnings (Link prop changing identity) are noisy in HMR.                                                      | Suppress in HMR via React's strict-mode-aware ref comparison; mirror ThemeProvider's pattern.                                                                                                                                                                                                                                                                                                                     |
| Bundle impact from registering `RoadieRoutedLink` as a client reference on every page that renders a Card, Breadcrumb, or Carousel. | Acceptable. `RoadieRoutedLink` is a small client primitive (one provider read + element resolution). Per-file dist + Rolldown's `'use client'` preservation keep it isolated. Bundle audit during PR — assert the client chunk added is well under 1 KB gzipped. (Earlier draft of this plan claimed runtime tree-shaking when href was unused; that's incorrect at the server-graph level and has been removed.) |
| Tabs link-tab keyboard navigation breaks because Base UI Tabs.Tab is button-by-default.                                             | Test suite includes arrow-key navigation across a tab list mixing button and anchor tabs. Base UI's roving tabindex works on either element type — verify.                                                                                                                                                                                                                                                        |

## Documentation / Operational Notes

- **Versioning:** This is a `feat` change in Roadie. Ship as a minor
  version bump. `LinkButton` deprecation is a soft deprecation — does not
  break consumers. Removal scheduled for the next major.
- **Rollout:** No feature flag needed. Library change; opt-in adoption by
  consumers as they wire `RoadieLinkProvider`.
- **Monitoring:** Not applicable (library, no runtime telemetry).
- **Consumer migration:** Website (`TicketSolutions.Oztix.Website`)
  follows in a separate PR — wire `RoadieLinkProvider` once at the root
  of `(collection)/layout.tsx` and `widget/cart-drawer/layout.tsx`,
  delete `LinkButton.tsx`, sweep call sites to `<Button href>`, ship
  `<Tracked>` wrapper. Captured as separate work in the website repo.

## Sources & References

- Origin discussion: review of PR
  [TicketSolutions.Oztix.Website#66](https://github.com/TicketSolutionsPtyLtd/TicketSolutions.Oztix.Website/pull/66)
  ("Inno 558 collection drawer") — surfaced the `LinkButton` /
  `<Button render={<a>}>` / `onNavigate` divergence.
- Related code: `packages/components/src/components/Button/Button.tsx`,
  `packages/components/src/components/Card/CardRoot.tsx`,
  `packages/components/src/providers/ThemeProvider.tsx`.
- Consumer Link shim:
  `TicketSolutions.Oztix.Website/src/components/Link.tsx`.
- Consumer tracking module:
  `TicketSolutions.Oztix.Website/src/utils/tracking.ts`.
- Repo conventions: `docs/contributing/BASE_UI.md`,
  `docs/contributing/COMPOUND_PATTERNS.md`,
  `docs/contributing/COMPONENT_DOC_TEMPLATE.md`.
- Solutions: `docs/solutions/rsc-patterns/compound-export-namespace.md`,
  `docs/solutions/best-practices/verifying-base-ui-runtime-contract-from-source.md`.
- External: Base UI composition
  (https://base-ui.com/react/overview/composition), `next/link` App
  Router (https://nextjs.org/docs/app/api-reference/components/link),
  `rel='noopener'` (https://web.dev/articles/external-anchors-use-rel-noopener).
