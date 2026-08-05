# Navigator ↔ Tabs unification (+ ScrollArea for Panes) — brainstorm

> Captures analysis done 2026-07-24 on the `feat/navigator-component` branch,
> to be turned into a plan and executed in a fresh session. No code has been
> written for any of this yet.

## Purpose

Navigator today hand-rolls three tab-like surfaces — the mobile primary tab
bar, the mobile secondary strip, and (loosely) the desktop rail — each with its
own styling and active-state logic. Roadie already ships a `Tabs` component
built on Base UI with a polished animated indicator, roving-focus keyboard nav,
orientation (incl. vertical), and the smart-href contract. The question the user
raised: **can Navigator reuse Tabs instead of duplicating it — its styling,
behaviour, animation — rather than maintaining a parallel implementation?** And,
relatedly: **should `Navigator.Pane` (and other scroll owners) adopt Base UI's
[ScrollArea](https://base-ui.com/react/components/scroll-area) for more control
over the scrolling display?**

## The governing finding

**Share the rendering mechanics that are semantically neutral (the sliding
indicator, the skin vocabulary, icon presentation), NOT the tab role
semantics.** This is the whole crux and it decides everything below.

- **Tabs is an in-page widget.** Base UI emits `role=tablist/tab/tabpanel`,
  `aria-selected`, `aria-controls`, roving tabindex, and arrow-keys that select
  a tab and reveal its panel. A tab is a control; activating it does not
  navigate.
- **Navigator is site navigation.** It renders `<nav aria-label>` landmarks,
  real `<a href>` routed through `RoadieRoutedLink`, and `aria-current="page"`.
  Activating a destination moves the route.

Putting `role=tab`/`aria-selected` on a set of page links is an ARIA
anti-pattern (the WAI-ARIA APG explicitly warns against the tabs pattern for
site navigation) and a real screen-reader regression. So the sharing seam must
sit **below** the ARIA layer: Navigator keeps `<nav>` + `<a>` + `aria-current`
and borrows the _mechanism_, not the role.

Hard blockers against rendering `Tabs` directly inside Navigator:

- **`tablist` must contain only `tab`s.** Navigator's bar legitimately contains
  a non-navigating **More disclosure** (`<button aria-expanded aria-controls>`),
  and the rail contains `Brand`, `End`, rotating chevrons and nested sub-navs —
  none are tabs.
- **No panels.** Tabs owns `Tabs.Panel` wired via `aria-controls`. Navigator's
  panes are driven by the router, not by tab selection; there's nothing for
  `aria-controls` to point at.
- **Different keyboard model.** Tab arrow-keys move a roving focus and
  optionally change selection; Navigator links sit in the normal tab order and
  Enter navigates immediately.

## What Tabs already provides (capability map)

Roadie `Tabs` is a thin compound over Base UI `@base-ui/react@1.3.0` Tabs.

| Capability                        | How                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Roving focus + arrow/Home/End nav | Base UI `Tabs.List` (`loopFocus`)                                                                                                                                                    |
| Active selection semantics        | Base UI `role=tab*`, `aria-selected`, `data-active`                                                                                                                                  |
| Controlled/uncontrolled           | `value`/`defaultValue`/`onValueChange` passthrough                                                                                                                                   |
| Activation mode                   | `activateOnFocus` on `Tabs.List` (not an `activationMode` prop)                                                                                                                      |
| **Animated sliding indicator**    | Base UI `Tabs.Indicator` publishes `--active-tab-left/top/width/height`; Roadie animates with `transition-all duration-slow ease-enter`. Pure CSS-var geometry, **no JS/motion lib** |
| SSR indicator (no flash)          | `renderBeforeHydration` default true                                                                                                                                                 |
| Orientation / vertical            | `direction='horizontal'\|'vertical'` → `data-[orientation]`; indicator swaps bottom-bar ↔ left-bar in the `subtler` skin                                                            |
| Emphasis skins                    | `strong`/`normal`/`subtle` (pill) + `subtler` (underline); sizes `sm/md/lg`                                                                                                          |
| Href routing on a tab             | `Tabs.Tab` **already** has the smart-href contract via `RoadieRoutedLink`                                                                                                            |
| Icon in a tab                     | Only via consumer `render` — no built-in icon slot, no icon-over-label stack                                                                                                         |

Two facts that matter most: the indicator animation is pure Base-UI-CSS-var +
`transition-all` (cheap to reuse), and `Tabs.Tab` already routes hrefs through
`RoadieRoutedLink` (the one genuinely-common seam with Navigator today,
currently duplicated in `TabsTab.tsx` and `NavigatorTab.tsx`/`NavigatorItem.tsx`).

## Per-surface feasibility

- **Mobile primary tab bar** — wants Tabs' animated indicator (the biggest win),
  but adds icon-over-label stack, a floating pill container, `collapseNav`
  (shrink inactive tabs to `max-w-0`, kept in the AT tree), the five-slot fold,
  and the generated **More disclosure** + overflow `List` pane. The indicator
  and skins fit; the fold/More/collapseNav do **not** fit the Tabs model and
  `aria-current` vs `aria-selected` is a hard semantic conflict.
- **Mobile secondary strip** — closest to a plain Tabs (horizontal scrolling
  pill row). But it currently reuses _the same authored `Navigator.Item`
  elements_ the rail uses (one element, two presentations, via lifted context);
  moving to `Tabs.Tab` children forks that. Still `<nav>`+`aria-current`.
- **Desktop rail** — the most divergent, and **too convoluted for Tabs**
  (the user's own suspicion, confirmed): three-state currency
  (current/section/idle), nested Secondary with tree-line/accent-bar/chevrons,
  `Brand`/`End` non-destinations, two rail forms, route delegation. A `tablist`
  containing sub-`tablist`s and non-tab children is invalid. **Keep it native.**

## Mobile tab bar — shipped behaviour (2026-07-24 update)

A follow-up pass hardened the mobile primary bar. What it now DOES, so the
Tabs-unification work builds on the real thing, not the sketch above:

- **Accent active tab.** The active tab shows its icon + label in the vivid
  accent (`text-accent-11`) on a subtle accent-tinted pill; siblings are muted.
- **Collapse-on-scroll to edge circles.** `collapseNav` drops the pill surface
  and floats two `lg`-IconButton-style circles — the active tab left, the
  final tab right — with a reserved middle spacer (a future mini-bar attachment
  point). Non-edge tabs shrink to `max-w-0` but stay in the AT tree.
- **`size-14` circles, non-shrinking `size-7` icon.** The collapsed circle is
  `size-14` (56px) so a `size-7` (28px) icon keeps the same ~25% padding ratio
  as a `lg` IconButton — the icon no longer shrinks between presentations.
- **No inter-tab gap + minimal bar padding.** `gap-0` plus a small `px-2 py-1`
  on the expanded bar gives labels the most room (full "Foundations" /
  "Components" fit at 390px) while keeping the edge pills clear of the pill's
  rounded edge.
- **Two-tap reopen-then-scroll.** A collapsed active circle's first tap only
  reopens the bar (pinned so the still-scrolled pane can't re-collapse it); the
  next tap acts per the rule below. Neither re-navigates.
- **Tap-to-scroll-on-landing / navigate-up-from-sub-page.** Tapping the active
  expanded tab scrolls the pane to top when you are on the section's own
  landing (`topValue` === active value), but pops **up** to the landing when you
  are on a sub-page (the tab's `href` already points at the landing, so the link
  navigates). `topValue` is the item's own value when routed, else its first
  sub-page's value (`firstSecondaryValue`).
- **Named z-index layering.** The bar and the sticky pane header sit at
  `z-sticky` (20) so they paint above in-content `z-docked` (10) accents like
  the docs code-preview copy button, and still below `z-modal`/`z-popover`.

### Still deferred to this session: a separated, wider active indicator

The user still wants the iOS-style **separated active indicator** — a pill (or
underline) that can be a little **wider than its tab** so the label never feels
cramped. That was explicitly NOT built here because it needs the shared
sliding-indicator primitive: today's indicator is the tab's own background, so
it cannot widen without either bleeding past the tab box or truncating the
label. The Tabs-unification work should therefore make the indicator a
**separate element** that can exceed its tab's width — this likely changes the
recommended mobile-bar approach (the indicator stops being a per-tab `bg-*` and
becomes a measured overlay driven off the active `[aria-current]` child).

## Options

- **A — Navigator renders `Tabs` directly.** Free indicator + roving focus, one
  style source. But forces `role=tablist`/`aria-selected` onto navigation (a11y
  regression), the More disclosure can't be a tab, collapseNav fights the moving
  pill, the strip loses element reuse, and the rail still can't be Tabs.
  **Rejected** — trades correct navigation semantics for visual reuse.
- **B — Extract a shared, role-neutral primitive.** Pull the animated-indicator
  mechanism (measure the active child, publish `--active-*` vars, animate with
  the existing motion tokens) — and optionally a roving-focus helper — into an
  internal primitive/hook (e.g. `internal/SlidingIndicator` or
  `useSlidingIndicator`). `Tabs` consumes it under `role=tab`; Navigator's mobile
  bar + strip consume it under `<nav>`/`aria-current`, driving the pill off the
  active `[data-slot=navigator-item][aria-current]` child. Navigator keeps
  correct semantics AND gains the shared slide + skins. **Recommended.**
- **C — Keep separate, align tokens only.** Zero risk, but the mobile bar has no
  sliding indicator today, so "parity" wouldn't include the animation unless
  Navigator grows its own. Under-delivers if the animated indicator is the goal.

## Recommendation

**Option B, scoped tightly to the two mobile surfaces; the desktop rail stays
Navigator-native.** Unification means: Navigator keeps its `<nav>`/`<a href>`/
`aria-current` semantics and its tree-walking/fold logic, and borrows a shared
role-neutral sliding-indicator primitive plus a shared skin vocabulary from
Tabs. **Do not render `Tabs`/`role=tablist` inside Navigator.**

Tabs enhancements this requires:

1. **Extract the indicator mechanism** into a role-agnostic internal primitive/
   hook that measures the active child and publishes `--active-*` vars, animated
   with the existing motion tokens. `Tabs.Indicator` refactors to consume it
   (behaviour-preserving); Navigator's mobile bar/strip consume it against
   `[aria-current]`. (Open question 4 below: whether Tabs keeps Base UI's own
   indicator and Navigator gets a parallel one, or both share a reimplemented
   measurement.)
2. **Icon-stack tab layout** — a first-class "icon above label" option (today
   only via `render`), reusing `presentNavIcon`'s `weight`/`size` logic so Tabs
   and Navigator present icons identically.
3. **A "floating" pill skin** (rounded-full, `emphasis-floating`, safe-area
   aware) as a Tabs emphasis/variant the mobile bar can share.
4. Keep `subtle`/`strong` pill + `subtler` underline skins in a shared variant
   module both import.
5. **Extract the `RoadieRoutedLink` smart-href contract** shared by `Tabs.Tab`
   and `Navigator.Item`/`NavigatorTab` into one helper — worth doing regardless
   of which option is chosen.

Explicitly **out of scope**: desktop rail (native), `collapseNav` (Navigator-only
mode that disables the shared indicator), the More disclosure + overflow pane +
fold (`deriveMobileSlots`, Navigator-only), branch/three-state currency
(Navigator-only).

## Related: ScrollArea for Panes

The user also proposed adopting Base UI's
[ScrollArea](https://base-ui.com/react/components/scroll-area) for
`Navigator.Pane` (and likely other scroll owners) to get more control over the
scrolling display — custom scrollbars, consistent cross-platform appearance,
overscroll/edge affordances. This is **separable** from the Tabs work and lower
risk. Considerations a plan must weigh:

- Panes currently own scroll with `overflow-y-auto overscroll-contain` and rely
  on native scrolling; ScrollArea replaces that with a viewport + custom
  scrollbar. Verify the sticky `Navigator.Pane.Header`, the mobile pane-stack
  (`max-md:absolute` off-canvas panes), and the `collapseNav` scroll listener
  (reads `scrollTop` on the pane) still work against ScrollArea's viewport
  element rather than the pane itself — the scroll listener likely has to move
  to ScrollArea's viewport.
- RSC/SSR: ScrollArea is a client primitive; confirm it doesn't force
  `'use client'` where the pane is currently server-safe, and keep the barrel
  RSC-safe.
- Could ship as its own component (a Roadie `ScrollArea` wrapper) reused by
  Pane, the overflow pane, and long content — evaluate whether it deserves to be
  a public Roadie component vs an internal Navigator detail.

## Risks & open questions a plan must resolve

1. **A11y semantics (highest):** never emit `role=tab`/`aria-selected` for
   navigation; preserve `<nav>` landmarks + `aria-current`. Validate against the
   existing `aria-current` tests.
2. **The More disclosure:** not a tab; must stay a sibling `<button
aria-expanded>` outside the shared indicator's tracked set — or the bar stays
   Navigator-native and only borrows the indicator hook. Decide which.
3. **collapseNav vs sliding indicator:** a measured moving pill assumes tabs keep
   their layout box; `max-w-0` shrinking breaks the geometry. Decide: collapseNav
   disables the indicator, or the indicator recomputes on collapse (jank risk).
4. **Indicator reuse coupling:** Base UI's `Tabs.Indicator` needs `role=tab`
   children + `--active-tab-*`. Decide whether the shared primitive reimplements
   measurement (`ResizeObserver` + SSR `renderBeforeHydration` parity) or Tabs
   keeps Base UI's indicator while Navigator gets a parallel one (less "unified").
5. **SSR/RSC:** Navigator's tree walk relies on element-type identity and is
   fragile in server components (Flight lazy-wraps types). Any refactor that
   changes child shapes (e.g. requiring `Tabs.Tab` children) risks breaking the
   "author inside a client component" contract. Preserve it.
6. **Strip's "one element, two presentations":** `Navigator.Item` is rendered by
   both the rail and the strip via lifted context. Decide whether the shared
   primitive operates on the existing `Navigator.Item` DOM instead of forking
   into `Tabs.Tab` children.
7. **Animation performance:** the mobile bar already animates
   `max-width/opacity/padding` for collapseNav; stacking a sliding-indicator
   transition on the same element needs a check. Confirm the shared primitive
   inherits `prefers-reduced-motion`.
8. **Test migration:** Tabs has 40+ role-based tests, Navigator has 94 asserting
   `data-slot`/`aria-current`. A shared primitive needs its own suite; neither
   existing suite should have to change its semantic assertions — itself a signal
   that Option B (not A) is right.

## Suggested plan shape (for the new session)

1. Extract the `RoadieRoutedLink` smart-href contract into one shared helper
   (low-risk, immediately useful).
2. Extract a role-neutral `useSlidingIndicator`/`SlidingIndicator` primitive;
   refactor `Tabs.Indicator` onto it behaviour-preservingly (Tabs tests stay
   green).
3. Add the icon-stack layout + floating pill skin to the shared skin vocabulary.
4. Adopt the shared indicator in Navigator's mobile primary bar and secondary
   strip, keeping `<nav>`/`aria-current`; special-case the More disclosure and
   collapseNav.
5. Separately, prototype `ScrollArea` on `Navigator.Pane`, re-pointing the
   `collapseNav` scroll listener at the ScrollArea viewport; decide whether it
   becomes a public Roadie `ScrollArea`.
6. Leave the desktop rail native.

## Resolution (2026-07-24)

Implemented as `docs/plans/2026-07-24-navigator-sliding-indicator-plan.md`.
Option B, but with the sharing seam drawn tighter than the brainstorm proposed:
**nothing is shared with `Tabs` at all.** The primitive lives in Navigator.

- **Q2 (More disclosure):** moot. The indicator tracks `[aria-current]`, so the
  disclosure participates or not purely by whether it carries currency. It stays
  an ordinary `<button aria-expanded>` sibling.
- **Q3 (collapseNav):** the indicator is suppressed while collapsed
  (`hidden={navCollapsed}`). Collapsed tabs shrink to `max-w-0`, so their
  geometry is meaningless mid-transition and the edge circles own their surfaces.
  Re-measurement uses `ResizeObserver` only, and browser verification confirmed
  this is sufficient: a rail section can't expand independently of navigation —
  `NavigatorItem` renders `isBranch ? secondary : null` purely off the active
  value, with no `aria-expanded` control in the rail — so every rail reflow
  coincides with an `activeKey` change and gets re-measured anyway; no
  `MutationObserver` is needed.
- **Q4 (indicator reuse):** Navigator reimplements measurement in
  `useSlidingIndicator`. `Tabs.Indicator` is untouched. Two reasons, both
  verified against `@base-ui/react@1.3.0`: (a) `Tabs.Indicator` measures only
  tabs registered in the root's `tabMap`, and only direct `Tabs.Tab` children
  register — so it cannot track the rail's nested `Navigator.Secondary` items;
  (b) `composite/` is absent from the package's `exports` map, so the
  roving-focus engine cannot be imported without its role.
- **Q6 (one element, two presentations):** preserved and made explicit. The strip
  still renders the authored `Navigator.Item` elements; a
  `NavigatorPresentationContext` tells them which surface they are in, replacing
  the descendant-selector styling the strip used before. The indicator reads
  their DOM rather than replacing them, which is precisely why a hand-rolled
  primitive beat Base UI here.

Adopted from the brainstorm's step 4: the strip now imports `tabsTabVariants` /
`tabsListVariants` so it reads as a Tabs `subtle` pill row. One-way only —
`Tabs/variants.ts` is untouched, and no `role=tab` reaches the DOM. Sharing the
skin without the semantics is the whole shape of the answer.

Also settled: normal tab order is retained on all three surfaces, since the
WAI-ARIA APG prescribes it for site navigation. Roving focus was never a gap.

Still open, unchanged: the `ScrollArea` question for `Navigator.Pane`.
