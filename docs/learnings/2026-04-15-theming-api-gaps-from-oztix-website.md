---
title: Roadie theming API — learnings from the collection theming feature
date: 2026-04-15
related_pr: https://github.com/TicketSolutionsPtyLtd/TicketSolutions.Oztix.Website/pull/61
related_plan: docs/plans/2026-04-15-feat-collection-theming-plan.md
---

# Roadie theming learnings

Captured while building the per-collection theming feature (PR #61). The
feature wires three API-supplied fields (`logoUrl`, `heroImageUrl`,
`themeColour`) into the `(collection)` route, with the accent colour flowing
through Roadie v2.3.0's `ThemeProvider`. Several friction points surfaced
that would be worth addressing upstream to make theming more robust for the
next consumer.

## API gaps (highest value)

### 1. `ThemeProvider` needs a controlled `accentColor` prop

**Problem.** `defaultAccentColor` is initial-state-only. Any runtime change
to the accent colour requires the imperative `useTheme().setAccentColor(hex)`
path, which must be called from a `useEffect` — exactly the React pattern
the Oztix website's own `AGENTS.md` tells you to avoid ("useEffect + setState
for derived/computed values — use useMemo or adjust state during render").

We ended up writing a `CollectionAccentSync` component whose sole job was to
render `null` and call `setAccentColor` in an effect. The effect required
manual cleanup logic to prevent the accent from leaking across route
boundaries (see "Accent colour leak" bug, todo 001).

**Proposed API.**

```tsx
<ThemeProvider accentColor={collection?.themeColour ?? null}>
  {children}
</ThemeProvider>
```

When `accentColor` is `null`, `ThemeProvider` falls back to its
`defaultAccentColor`. Consumers get declarative flow. The library owns the
lifecycle. No effect sync, no leak bug, no manual reset logic, no cleanup
on unmount.

**Why this matters.** It removes an entire class of "forgot to reset on
unmount" bugs from every consuming app. The effect-based workaround is
fragile and easy to get wrong — both Kieran's and Julik's reviews flagged it
as a P1 in the code review.

---

### 2. Export `DEFAULT_ACCENT_COLOR` as a constant

**Problem.** `CollectionAccentSync` needed to reset the accent to the Oztix
default. Roadie doesn't export the default or provide a `resetAccentColor()`
function. We hard-coded `#0091EB` in the app, which means if Roadie ever
changes the default, our app silently drifts.

**Proposed API.** Either:

```ts
import { DEFAULT_ACCENT_COLOR } from '@oztix/roadie-components'
// or
const { resetAccentColor } = useTheme()
```

The constant is simpler; the function is more symmetric with `setAccentColor`.
Both solve the problem. I'd lean constant unless Option 1 (controlled prop)
makes this moot.

---

### 3. `setAccentColor` should validate its input

**Problem.** The current API accepts `any string` and silently throws inside
a `useEffect` when `colorjs.io`'s `new Color(input)` rejects the value. The
throw is swallowed by the effect's implicit `async` context — consuming apps
have no way to know the call failed.

We added an app-layer hex regex validator in `useCollectionConfig`'s zod
schema as defence-in-depth. Every app consuming Roadie dynamic theming has
to reinvent this.

**Proposed API.** One of:

```ts
// Option A: throw synchronously on invalid input
setAccentColor('not-a-hex') // throws InvalidColorError

// Option B: return a boolean
if (!setAccentColor(untrustedString)) {
  console.warn('invalid colour, fell back to default')
}

// Option C: accept a parsed Color type, push validation to the caller
setAccentColor(parseHex(untrustedString)) // type-safe
```

Any of these surfaces the validation failure to the caller. Option A is the
most ergonomic.

---

### 4. `getAccentStyleTag` needs a pre-hydration-friendly distribution

**Problem.** The plan doc for this feature considered four rendering
strategies for the accent colour (see `docs/plans/2026-04-15-feat-collection-theming-plan.md`
— "Rendering strategies for the accent colour"). Strategy B (pre-hydration
inline bootstrap) is theoretically the sweet spot — zero infra change, near-
zero flash duration — but was deferred because:

- `getAccentStyleTag` is an async ESM function
- Static export (`output: 'export'`) means there's no stable URL for the
  Roadie chunk
- You can't `import('@oztix/roadie-components')` from a raw inline
  `<script type="module">` without bundling a separate standalone script

As a result, every static-export consumer hits the ~150–400 ms "flash of
default blue" on cold loads of themed pages.

**Proposed options** (any one unlocks the pattern):

- **a)** Ship a standalone IIFE bootstrap at a known path:
  `@oztix/roadie-components/dist/accent-bootstrap.js` that apps can
  reference via `<script src="/.../accent-bootstrap.js">`. The script reads
  a known global (`window.__ROADIE_ACCENT__`) and applies it synchronously.

- **b)** Expose a synchronous variant `getAccentStyleTagSync(hex)` that
  uses cached/pre-computed oklch math. Drop the async colorjs dependency
  for the hot path.

- **c)** Provide a tiny `<ThemeBootstrap>` React component that wraps the
  inline script generation, so apps can do `<head><ThemeBootstrap accentColor={...} /></head>`
  and not think about it.

- **d)** At minimum: document the "pre-hydration inline module script"
  pattern explicitly in the Roadie tokens docs, with a working example for
  static-export apps.

**Why this matters.** Every promoter-branded collection page currently ships
with a visible colour flash. Users notice it without being able to articulate
why the site feels "cheap". Closing this gap once in Roadie closes it for
every future app.

---

## Documentation gaps

### 5. Using Roadie with the View Transitions API

**Problem.** We spent time empirically figuring out that the hero image
floating over the header during a view transition was a `z-index` issue
inside the `::view-transition-group(*)` pseudo-element tree, and that the
fix was to name the header with its own `<ViewTransition name='collection-header'>`
and set `::view-transition-group(collection-header) { z-index: 100 }`.

This is a reusable pattern for any Roadie app that has a sticky header and
wants to animate content underneath it. The Roadie tokens page talks about
`--accent-hue` and `--accent-chroma` but doesn't cover view-transition
integration at all.

**Proposed docs.** A "View transitions with Roadie" guide in the tokens
page, covering:
- The z-index layering trick for sticky headers
- How named groups interact with the `root` group
- Recommended keyframe names for slide/fade/morph patterns
- How to trigger transitions on search-param-only navigation (our case)

---

### 6. `bg-raised` vs `bg-normal` vs `bg-sunken` semantics aren't obvious

**Problem.** The collection header started with `bg-neutral-0/90` because I
didn't know `bg-raised` existed. The semantic surface tokens (raised /
normal / subtle / sunken) aren't documented prominently. A grep of
`node_modules/@oztix/roadie-core` turned up the correct token eventually,
but it cost real time.

**Proposed docs.** A "Surface tokens" cheat sheet showing the four-level
hierarchy (sunken → normal → raised → floating) with visual examples. This
is a 15-minute docs addition that would save every new Roadie consumer
the same debugging session.

---

### 7. Radius scale ceiling isn't documented

**Problem.** When bumping the header border radius to match a taller
content area, I tried `rounded-5xl` — it silently resolved to `0px` because
Roadie's radius scale stops at `rounded-4xl`. Tailwind v4 doesn't warn on
missing utility classes, so the debugging was "inspect computed style in
devtools → huh, it's zero → try arbitrary value".

**Proposed fixes:**

- **a)** Extend the scale to `rounded-5xl` (40px), `rounded-6xl` (48px),
  `rounded-7xl` (56px) to match the spacing scale's upper end.
- **b)** Document the ceiling explicitly: "Roadie radius scale stops at
  `rounded-4xl` (32px). For larger radii, use arbitrary values like
  `rounded-[2.5rem]` or `rounded-full`."
- **c)** Both.

---

## Missing primitives (nice-to-have)

### 8. No helper for "sync accent colour to tanstack-query data"

**Problem.** We wrote `CollectionAccentSync` from scratch. Any future app
wanting to theme from async data (CMS colors, user preferences, feature
flags) will re-invent the same pattern.

**Proposed API** (assuming Option 1 "controlled prop" is not adopted):

```tsx
import { useAccentColorSync } from '@oztix/roadie-components'

function MyComponent() {
  const { data } = useSomeQuery()
  useAccentColorSync(data?.themeColour)
  // ...
}
```

The hook handles: effect subscription, cleanup on unmount, fallback to
default when the colour is `null`/`undefined`, validation of the hex string,
and the `setAccentColor` stability dep.

If Option 1 (controlled prop) lands, this hook becomes unnecessary — the
user just passes the value to the provider. Option 1 is the better fix.

---

### 9. Dark mode + accent colour are separate boot scripts

**Problem.** `getThemeScript` handles dark/light flash prevention.
`getAccentStyleTag` handles accent colour. Two different functions, two
different call patterns, two different places they need to fire in the
`<head>`.

**Proposed API.** Unified `getBootstrapScript({ defaultDark, followSystem, accentColor })`
that handles both in one inline script. Reduces the "things to remember"
count for consumers.

---

## Meta-learning: the API shape bias

The theming feature's core difficulty came from one underlying problem:
**Roadie's ThemeProvider is imperative-first rather than declarative-first.**

React libraries generally prefer controlled components — you pass the state
down as props, the library renders it, you control lifecycle. Roadie
inverts this: the provider holds state, you reach into it with
`useTheme().setAccentColor`, and you're responsible for effect hygiene.

The imperative API is simpler to implement in Roadie but pushes complexity
onto every consumer. Converting `ThemeProvider` to accept a controlled
`accentColor` prop (learning #1) would be a single change that eliminates
learnings #2, #3, and #8 as side effects — they all exist because the
imperative API forces consumers to manually wire lifecycle.

This would be the single highest-leverage change to the Roadie theming
surface.

---

## Concrete takeaways for our app

These aren't Roadie feedback but are worth capturing for the next
theming-adjacent feature:

1. **Always validate at the fetch boundary.** The zod schema in
   `useCollectionConfig` catches bad URLs, bad hex codes, and shape drift in
   one place. This is cheap insurance against API evolution.

2. **Effect-based state sync needs explicit cleanup.** Whenever you reach
   out of React into an external store from an effect, the cleanup path is
   as important as the set path. Code review caught this for us; don't rely
   on review to catch it next time.

3. **Name everything that might be animated across navigation.** We
   initially only named the hero and title for view transitions. The header
   needed a name too so it could be z-indexed above the hero during the
   slide. When in doubt, name it — unused names are free.

4. **`output: 'export'` is a real constraint that affects feature design.**
   The Strategy B deferral came down to "can't bundle a pre-hydration
   script without infra work". Future features should check the static-export
   implications at the planning stage, not discovery stage.

5. **Use browser measurement to debug invisible issues.** We caught the
   `rounded-5xl` silent failure by measuring computed styles in chrome-devtools.
   Similarly for the header radius math. When Tailwind classes don't warn,
   the browser is the source of truth.

---

## Proposed upstream issues

If we file these upstream against Roadie, here's the suggested priority:

| # | Issue | Priority | Complexity |
|---|---|---|---|
| 1 | Controlled `accentColor` prop on `ThemeProvider` | **High** | Medium |
| 4 | Pre-hydration-friendly accent bootstrap | **High** | Medium |
| 3 | Input validation on `setAccentColor` | Medium | Small |
| 2 | Export `DEFAULT_ACCENT_COLOR` constant | Medium | Trivial |
| 5 | View transitions docs / z-index guidance | Medium | Small |
| 6 | Surface token cheat sheet | Low | Trivial |
| 7 | Extend or document radius scale ceiling | Low | Trivial |
| 8 | `useAccentColorSync` helper hook | Low (obsolete if #1 lands) | Small |
| 9 | Unified bootstrap script | Low | Small |

Learnings 1 + 4 are the biggest force multipliers. Everything else is
polish.
