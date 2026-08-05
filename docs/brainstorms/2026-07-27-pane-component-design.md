# Pane as a first-class component — agreed design

> Outcome of the brainstorm kicked off by
> [`2026-07-27-pane-component-prompt.md`](2026-07-27-pane-component-prompt.md).
> This is the design, not the plan. It supersedes
> [`2026-07-26-components-list-panel-design.md`](2026-07-26-components-list-panel-design.md)
> and the `Navigator.Secondary presentation='pane'` model in
> [`../plans/2026-07-26-navigator-secondary-pane-plan.md`](../plans/2026-07-26-navigator-secondary-pane-plan.md).

## 1. What `Pane` is, what `Navigator` is, where the boundary sits

**`Pane` is a standalone top-level Roadie component.** It owns a surface, a
scroll container, its own chrome, and its own sizing. It works with no
`Navigator` anywhere in the tree — a settings panel, a split editor, a drawer.

**`Navigator.Content` is the sole orchestrator** — Roadie's
`NavigationSplitView`. It owns cross-pane state, the responsive arrangement,
and the pane stack.

**There is no `PaneGroup`.** A second public orchestrator would be Roadie's
version of the mistake SwiftUI made by shipping two programmatic navigation
models: every reported `NavigationSplitView` bug lives at the seam between
selection-driven columns and `NavigationPath`-driven stacks. One orchestrator,
one state authority. If standalone master–detail is ever needed outside a
Navigator, `Navigator.Content` is what gets extracted — not a parallel API.

`Navigator` keeps everything it is good at: the rail, the tab bar, the sliding
indicator, **`Navigator.Secondary`**, and single-`value` control by the
consumer's router. It never navigates.

**`Navigator.Secondary` is not being removed, and it gets simpler.** It has
exactly one job — declaring a section's nested sub-navigation — and exactly two
renderings, neither of which is a pane:

- **`md` and up: inline in the rail.** The nested list under the expanded
  section, with the active-item pill and the vertical hairline. This is the only
  desktop option; there is nothing to configure.
- **Below `md`: tabs in the current pane's header.** There is no rail at that
  size, so the section nav moves into the pane chrome.

That split is already what ships — `navigatorSecondaryStripVariants` is
`flex md:hidden`, so the strip is below-`md`-only and the rail owns it from `md`
up. Note this is the **nav-form** breakpoint (`md`), not the arrangement one
(`lg`), which is correct: where sub-navigation lives is a nav-form concern.

**The `presentation` prop goes entirely.** With one desktop rendering and one
mobile rendering, both derived from viewport rather than declaration, there is
nothing for the prop to select.

**`Navigator.Primary` keeps lifting the active section's declaration into
context** (`NavigatorContext.secondaryNav`) so a pane in another subtree can
present it. That mechanism exists and is right.

**The mobile tabs are the default and need no wiring.** `Pane.Header` reserves
the slot and the orchestrator fills it — no consumer opt-in, exactly as today.

**And the duplicate-landmark hazard is fixed by the stack, not by a warning.**
Today the header cannot tell whether it is *the* header, because top-pane-ness
is derived; hence the docblock warning "mount only one header per view … a
second header would render a duplicate section-nav landmark." With the depth
pointer as explicit state, the orchestrator knows precisely which pane is
current and injects the tabs into **that pane's header only**. The hazard
disappears as a consequence of making the stack stateful.

### Where this came from

Three references were studied. Each contributed something, and each contributed
a warning.

| Source | Taken | Avoided |
| --- | --- | --- |
| SwiftUI `NavigationSplitView` | Fixed semantic roles; one visibility model for the whole arrangement; child-declared size *constraints*; `.inspector()` as a distinct concept | Two programmatic models; `columnVisibility` as a silently-overridable preference; column widths that were a hint for two OS versions |
| Expo Router `Stack` | `presentation` as one named bundle (`card`/`modal`/`formSheet`); flat chrome options | Hoisting chrome through context with **implicit** target resolution — the cause of `setOptions` hitting the parent, `<Slot/>` interception, and re-render storms |
| React Native ecosystem | — | Nothing to copy: there is no master–detail primitive. SwiftUI is the only prior art for the desktop arrangement. |

## 2. The `Pane` API

### Props

```tsx
type PaneProps = ComponentProps<'section'> & {
  role?: 'list' | 'detail' | 'inspector'          // default 'list'
  presentation?: 'column' | 'stack' | 'sheet' | 'drawer'  // default 'column'
  current?: boolean                                // default false
  emphasis?: 'raised' | 'normal' | 'subtle' | 'subtler'   // default 'raised'
  primaryNav?: 'visible' | 'auto' | 'hidden'       // default 'auto'
}
```

Three axes, each with exactly one job and no overlap.

**`role` — what the pane is.** Drives sizing defaults and *yield order*.

| `role` | sizing default | yields |
| --- | --- | --- |
| `list` | `w-96 shrink-0` (24rem, as today) | second |
| `detail` | `min-w-0 flex-1` — takes the remaining space | last |
| `inspector` | `w-56 shrink-0` (14rem, what `OnThisPage` uses today) | **first** |

**`presentation` — how it materialises.** A named bundle of geometry, motion,
dismissal and a11y, the way `emphasis-strong` is a named bundle of bg + text +
border + interaction. `inspector` is deliberately *not* a value here: it is not
how a pane materialises, it is what a pane is.

Resolution is asymmetric, and this is the rule the current branch is missing:

> **`column` is the only presentation the orchestrator resolves.** It means
> "beside my siblings where there is room, over them where there isn't." Every
> other value is absolute — a `stack` pane covers its siblings at 2560px
> exactly as it does at 390px. The orchestrator never upgrades *to* `column`.

**What an unresolved `column` becomes depends on `role`**, and this is the one
place the two axes touch:

| `role` | resolves to | reachable via |
| --- | --- | --- |
| `list`, `detail` | `stack` — joins the pane stack | the depth pointer (Back / row tap) |
| `inspector` | `drawer` at `md`+, `sheet` below — **never joins the stack** | the header toggle the orchestrator adds |

"Yields" therefore means two different things by role, deliberately: a `list` or
`detail` pane yields *into the stack* and stays part of the primary flow; an
`inspector` yields *out of the flow* and becomes an on-demand overlay. That is
why yield order (`inspector`, `list`, `detail`) is about which pane stops being
a column first, not about which pane becomes unreachable — nothing ever becomes
unreachable.

So `<Pane role='detail' presentation='stack'/>` is a full-frame takeover on a
27-inch display — SwiftUI's `.prominentDetail`, Expo's `presentation: 'modal'`
on a tablet.

There is no `'none'`. Hiding is a *resolution outcome*, never a consumer
intent: the inspector disappears below `2xl` because it yielded. A consumer who
wants a pane genuinely absent does not render it.

**`current` — this pane holds what the user is looking at.** The deepest
`current` pane is the top of the stack. It affects **only** the stacked bands;
at `lg`+ every pane is a column regardless of depth. That distinction is what
`hideOnMobile` could not make, because it conflated "not on the mobile stack"
with "not rendered at all."

**Width** is `role` defaults plus Tailwind on `className`, exactly as the docs
already writes `md:w-[18rem]`. No `width` prop — `minmax()` and `clamp()`
already exist, and the `max-2xl:hidden` sprawl that made className overrides
feel bad is now owned by `presentation`, not by width.

**Layout is flex, not grid.** Roadie's own rule is *"Flex = children control
sizing"*, and children controlling their own track is exactly what panes need.
It also avoids a real hazard: composing `grid-template-columns` on the
orchestrator means the parent must read its children's widths — another
element-identity walk, another RSC silent-failure surface. `Navigator.Content`
is already `md:flex md:flex-row` with `list: md:w-[24rem] md:shrink-0` and
`detail: md:min-w-0 md:flex-1`, so this names the mechanism that exists rather
than introducing one.

### Subcomponents

```tsx
<Pane role='list'>
  <Pane.Header>
    <Pane.Title>Components</Pane.Title>
    <Pane.Actions><IconButton …/></Pane.Actions>
    <Pane.Search value={q} onValueChange={setQ} />
  </Pane.Header>
  <List>…</List>
  <Pane.Footer>…</Pane.Footer>
</Pane>
```

**Chrome renders in place. Nothing teleports.** `Pane.Header` always renders
inside its own pane, and the orchestrator repositions it **as a unit, via
CSS** — sticky at `lg`+, merged into the stacked bar below. No portals, no
context-hoisted slots, no ambiguous target.

This is a deliberate rejection of SwiftUI's modifier model and Expo's
`Stack.Screen`-from-inside-a-route model. Both are more capable; both resolve
their target implicitly, and that implicit resolution is where their bug
reports live. The cost accepted here is that the stacked mobile bar cannot
blend one pane's title with another pane's back button.

**One exception, and it is orchestrator-owned, not consumer-owned.**
`Pane.Header` reserves a slot that `Navigator.Content` fills when it knows a
sibling has yielded — the "☰ On this page" toggle. This is the same mechanism
that already puts the mobile section strip into `Navigator.Pane.Header` today,
so it introduces no new hoisting. The orchestrator owns cross-pane state; a
control that reveals a sibling pane is cross-pane state.

### `primaryNav` — the app decides what the mobile nav does, per pane

Replaces `collapseNav: boolean`. One prop, three mutually exclusive states,
applying **only while the pane is top of the stack below `md`** — a declaration
on a pane sitting underneath does nothing.

| value | behaviour |
| --- | --- |
| `'auto'` *(default)* | The bar collapses to the active-tab circle as the pane scrolls past 24px, and returns at the top or when the circle is tapped. A pane whose content does not overflow never scrolls, so nothing collapses. |
| `'visible'` | The bar stays full at every scroll position. |
| `'hidden'` | No bar at all while this pane is on top. Returns when the stack pops back. |

**Why one prop and not two.** Depth-driven hiding and scroll-driven collapsing
cannot both apply — a hidden bar has nothing to collapse — so two booleans would
permit a contradiction that has no meaning. One axis, three states.

**Prior art.** This is iOS's `hidesBottomBarWhenPushed` (UIKit) /
`.toolbar(.hidden, for: .tabBar)` (SwiftUI): the pushed screen declares it, and
the default keeps the bar. Music, Settings and the App Store all opt into
hiding; plenty of apps don't. The application decides, per screen.

**Naming.** `primaryNav`, not `nav`, because a `Pane` deals with both — it also
hosts the secondary nav's mobile tabs. `'auto'` matches the same component's
existing `dismiss?: 'auto' | 'back' | 'close'`, where `auto` likewise means
"decide from context."

**Two consequences to carry into the plan:**

- `navigatorPaneViewportVariants` carries `max-md:pb-24` to clear the floating
  bar. Under `'hidden'` that becomes dead space at the bottom of the pane, so
  the padding has to key off resolved nav visibility instead of being constant.
- `collapseNav`'s docblock instruction *"Leave off for short panes"* retires:
  `'auto'` detects the condition rather than asking the consumer to know it.

**Behaviour change:** `collapseNav` defaults to `false` today, so panes now
collapse on scroll by default rather than on request. Deliberate — a
non-overflowing pane is unaffected, so the default is safe.

This is the fourth capability the depth pointer unlocks, after secondary-nav
header targeting, the Back/Close affordance rule, and duplicate-landmark
elimination.

### `Pane.SecondaryNav` — an opt-in placement override, not the default path

Below `md`, the section nav renders as tabs in the current pane's header
automatically. A consumer who wants it **somewhere else inside a pane** places
`Pane.SecondaryNav` there, and doing so suppresses the automatic header
injection for that view:

```tsx
<Pane role='detail' current={…}>
  <Pane.Header>
    <Pane.Title>Foundations</Pane.Title>
  </Pane.Header>
  <Pane.SecondaryNav />   {/* below the header instead of inside it */}
  {children}
</Pane>
```

It renders `null` when the active section declares no `Navigator.Secondary`, and
`null` at `md`+ where the rail owns the nav. No `as` prop — the rendering is the
scrolling tab strip with the sliding indicator that ships today, and inventing
`'tabs' | 'select'` variants with no consumer would be exactly the API accretion
this design exists to undo.

Presence-suppresses-default is the one piece of implicit behaviour here, and it
is deliberate: the alternative is a `secondaryNav={false}` escape on
`Pane.Header`, which is two props coordinating to express one decision. A
dev-mode `isDev()` warning covers the mistake of mounting more than one.

`NavigatorPresentationContext` keeps its `'rail'` and `'strip'` values and loses
only `'pane'`.

`Pane.Footer` is sticky chrome at the bottom of the pane, publishing its
measured height the same way the header publishes
`--pane-header-height` (renamed from `--navigator-pane-header-height`).

### Composing `List`

**The consumer writes a real `<List>` inside a `<Pane>`.** `Pane` never wraps,
generates, or styles a list. "The pane borrows `List`'s class strings" is the
thing being deleted — the reworked `List` drives its section rules off
`li > [data-slot=list-item] > [data-slot=list-item-content]` by child
combinator, and Navigator's rows emit `navigator-item` instead, so the divider
rules silently stopped matching. That is the visible stray hairline above each
group heading in the docs today. It is a symptom, and it dissolves rather than
being patched.

**`List.Item`'s `selected` is renamed to `current`**, accepting
`boolean | 'page' | 'step' | 'location'`:

```tsx
<List.Item current />        // aria-current="true"
<List.Item current='page' /> // aria-current="page"
```

One prop, one attribute. `List` already keys its divider rules off bare
`[aria-current]`, so the CSS needs no change at all. `List.Item` shipped days
ago with one consumer, so the rename costs nothing.

### Filtering

**Nobody owns it. The consumer filters their own array.**

The predicate registry existed only because filtered-out rows had to stay
*declared* to keep nav state alive — remove a child and the section stopped
being branch-active, `activePaneSecondary` went undefined, and the pane being
typed into unmounted. With an explicit `Pane` that hazard does not exist, so
filtering is a plain `.filter()`:

```tsx
const shown = categories
  .map((c) => ({ ...c, components: c.components.filter((m) => match(m, q)) }))
  .filter((c) => c.components.length > 0)
```

`Pane.Search` is a styled input for pane headers with no filter machinery
behind it. The empty-group case the prompt flagged is answered by the consumer
filtering groups out, as above — no `List.Group` coupling, no selector needed.

This deletes `NavigatorFilterContext`, the predicate registry,
`collectItemMetas`, `SecondaryPane.Search`, the "No matches" branch, and the
view-only `null`-rendering hazard.

### Grouping in primary and secondary nav

`Navigator.Group` is **reworked, not deleted** — the earlier position that
grouping belongs solely to `List` was wrong. Nav needs it too, and it takes
`List`'s authoring convention:

```tsx
<Navigator.Primary>
  <Navigator.Item value='/' icon={<HouseIcon/>}>Home</Navigator.Item>

  <Navigator.Group>
    <Navigator.GroupTitle>Design</Navigator.GroupTitle>
    <Navigator.Item value='/foundations' icon={<CompassIcon/>}>
      Foundations
      <Navigator.Secondary aria-label='Foundations pages'>…</Navigator.Secondary>
    </Navigator.Item>
  </Navigator.Group>
</Navigator.Primary>
```

`Navigator.GroupTitle` is matched by element identity inside `Navigator.Group`,
exactly as `List.GroupTitle` is — so the RSC client-component rule applies here
too.

**Nesting expresses hierarchy; groups are siblings.**

```html
<nav data-slot='navigator-rail'>
  <ul>                                        <!-- loose primary items -->
    <li>
      <a data-slot='navigator-item'>Home</a>
    </li>
  </ul>

  <h2 id=':r1:' data-slot='navigator-group-title'>Design</h2>
  <ul data-slot='navigator-group' aria-labelledby=':r1:'>
    <li>
      <a data-slot='navigator-item'>Foundations</a>
      <ul>…secondary items…</ul>              <!-- NESTED: belongs to its primary -->
    </li>
  </ul>
</nav>
```

A group emits a **fragment of two siblings** — its title and its own `<ul>` —
which the rail's grid lays out directly. No `display: contents`, and valid
because `<nav>` may hold several lists.

This is where the design deliberately diverges from `List.Group`'s DOM, which
nests a group as an `<li>` inside the root `<ul>`. The divergence is forced by
the roots: `List`'s root **is** a `<ul>`, so everything must live inside it;
`Navigator`'s root is a landmark, so nothing has to. The *authoring* convention
is identical, which is what matters to a consumer.

**The title is an `<h2>` by default, overridable via `render`.** This matches
`Pane.Header`, which already renders its heading as `<h2>` so it never collides
with the page's `<h1>` — same reasoning, same level.

```tsx
<Navigator.GroupTitle render={(p) => <h3 {...p} />}>Design</Navigator.GroupTitle>
```

Noted for the record: a heading per group enters the document outline on every
page, and the "correct" level is not knowable from inside a landmark component.
`render` is the release valve, and `<h2>` keeps Roadie internally consistent.

**Association is added, and it fixes an existing defect.** The title takes a
`useId` and the group's `<ul>` takes `aria-labelledby`, so assistive tech
announces *"Design, list, 6 items"* rather than loose text followed by an
anonymous list. **`List.Group` gets the same treatment in this pass** — it has
the identical gap today, since `List.GroupTitle` is a bare `<p>` that
`List.Group` never associates with its nested `<ul>`. `List.GroupTitle` also
becomes an `<h2>` with `render`.

**Degradation by surface:**

| surface | group renders as |
| --- | --- |
| rail, `md`+ | title + its own list, as above |
| secondary mobile strip | flattened — items inline, title `sr-only` (today's behaviour) |
| mobile tab bar, first 5 slots | flattened — groups do not survive into a horizontal 5-slot bar |
| mobile overflow pane | **a real `List.Group`** — see below |

### Declaring the tab-bar slots explicitly

Today the mobile bar is purely positional — `items.slice(0, MAX_TABS - 1)` —
so it is whatever happens to be declared first in the rail. With grouping in
the picture, rail order is chosen for the rail, and the tab bar deserves its
own answer.

`Navigator.Primary` takes an **optional** `tabs` array of item values —
`tabs?: NavigatorTabSlots`. Every existing consumer keeps working untouched;
this is purely opt-in for products with more nav than a tab bar can hold.

```tsx
<Navigator.Primary tabs={['/', '/calendar', '/listings', '/messages']}>
  …items in rail order, grouped…
</Navigator.Primary>
```

**Typed as a union of tuples so the cap is a compile-time error**, not a runtime
warning:

```ts
export type NavigatorTabSlots =
  | readonly [string]
  | readonly [string, string]
  | readonly [string, string, string]
  | readonly [string, string, string, string]
```

Four route tabs plus the More slot is the full five. This is the reason for
choosing the array over a `tab` boolean on each item: a boolean scattered across
the tree can only be counted at runtime, whereas the tuple makes the limit part
of the type. It also lets tab order differ from rail order, which the per-item
form cannot express.

**Rules:**

- Omitted → source order, exactly as today. Non-breaking.
- Provided → those values are the tabs, in array order; everything else folds
  into the overflow, including anything the array does not name.
- A value not present in the declared tree is an `isDev()` warning — this is the
  one real cost of naming values away from the items they refer to, so it needs
  to be caught loudly.
- The active item not being a tab is already handled: `foldedIsActive` gives the
  More disclosure the active pill, so exactly one tab reads as current.

### The mobile overflow becomes a Pane

Today the overflow is `data-slot='navigator-overflow-pane'`: a bespoke floating
`ScrollArea` with a hardcoded `FLOATING_PANE` style to escape Base UI's inline
`position: relative`, hovering above the tab bar.

It becomes **a full-screen `Pane`** — reference is the Airbnb host app's Menu
tab: a page title, arbitrary consumer content, then the remaining nav items as
a `List` with leading icons and chevrons, tab bar still visible with the
overflow tab active.

That is exactly a `Pane` at the top of the stack with `primaryNav='visible'`.
It inherits push/pop motion, the stack pointer, and the surface treatment for
free, and the bespoke floating-pane machinery is deleted.

**Slot-based composition**, because the reference needs consumer content:

```tsx
<Navigator.Overflow>
  <Pane.Header><Pane.Title>Menu</Pane.Title></Pane.Header>
  <PromoCard />
  <Navigator.OverflowItems />
  <SwitchModeButton />
</Navigator.Overflow>
```

`Navigator.OverflowItems` renders the generated `List` of folded items, so the
consumer controls ordering — above the promo, below it, or between sections.
It already renders a real `<List>` with `List.Item`s today, which makes this a
short step and gives the `selected` → `current` rename its second consumer.

**Grouping in the overflow.** Items are allocated to tabs by source order, and
groups are flattened for the first `MAX_TABS - 1` slots — a five-slot
horizontal bar cannot express them. Any `Navigator.Group` whose items land in
the overflow renders there as a `List.Group` + `List.GroupTitle`. A group split
across the boundary keeps only its overflow remainder grouped; the tabbed items
are already flat.

**Rendering `Navigator.Overflow` is optional.** Omit it and the overflow falls
back to a Navigator-rendered pane with just the item list — today's behaviour,
re-homed.

### `Navigator.Panel` — an item that owns a menu, not a destination

**The gap.** `Navigator.Item` can own a destination (`href`) or a
`Navigator.Secondary` (nav), and nothing else. An account switcher containing
*Log out* is neither — it is a menu of actions. With no way to express that, the
only option is a custom trigger component inside `Navigator.End`, which
`Navigator.Primary`'s walk cannot see: `deriveMobileSlots` matches
`Navigator.Item` by reference, so `endItems` comes back empty, no final tab is
derived, and the rail's `hidden md:block` takes the whole `End` with it below
`md`. The item silently vanishes on mobile.

This is observed in `~/Code/prototype`, which writes
`<Navigator.End><PersonaSwitcher /></Navigator.End>` and loses its account menu
below `md`. The stray-child dev warning fires, but the warning describes the
symptom, not the missing capability.

**The shape.** Same as `Navigator.Secondary`: one declaration, two
presentations, chosen by viewport.

```tsx
<Navigator.End>
  <Navigator.Item value='account' icon={<UserIcon />}>
    Jordan Lee
    <Navigator.Panel>
      <List>
        <List.Group>
          <List.GroupTitle>Switch account</List.GroupTitle>
          <List.Item title='Channel 10' current leading={<IconTile …/>} />
          <List.Item title='Personal' leading={<IconTile …/>} />
        </List.Group>
        <List.Item title='Switch to Studio' leading={<StorefrontIcon />} />
        <List.Item title='Log out' leading={<SignOutIcon />} />
      </List>
    </Navigator.Panel>
  </Navigator.Item>
</Navigator.End>
```

- **`md`+** — a popover anchored to the rail item.
- **below `md`** — the item takes a tab slot, and activating it pushes a
  full-screen `Pane` onto the stack, inheriting push/pop motion, `Pane.Header`'s
  Back/Close affordance and `primaryNav` for free.

Declaring a `Navigator.Panel` makes the item a **disclosure rather than a
link** — the same rule `Navigator.Secondary` already uses to make an item a
section. It works on any item, primary or `End`; nothing about it is specific to
account menus.

Anchoring is necessarily Roadie's job: the trigger element lives inside the
rail, so a consumer cannot reach it to anchor their own popover.

**Why this is not merged with `Navigator.Overflow`**, despite both being "a rail
affordance that becomes a mobile Pane":

- The overflow has **no desktop rendering at all** — folding only happens
  because a five-slot bar ran out, and the rail simply scrolls. A panel is
  explicitly two-presentation. Merging a one-presentation thing with a
  two-presentation thing yields a component that is mostly conditionals.
- Overflow content is **generated** from folded items; panel content is
  **authored**.
- Overflow **membership** is derived from `tabs` / source order / `MAX_TABS`; a
  panel has no membership concept.

The genuinely shared primitive is `Pane` itself, and both already use it. Two
thin callers of one primitive, not one merged component carrying both rule sets.

## 3. Responsive orchestration

### Two independent breakpoints

Today both flip at `md` (768), which is why 800px crams a list and a detail
into ~750px. They are separate concerns and flip at different sizes:

- **nav form** — tab bar → rail, at `md` (768)
- **pane arrangement** — stack → columns, at `lg` (1024)

These are a documented convention, not CSS custom properties — a media query
cannot read a custom property, so there is no `--pane-columns-breakpoint` to
set. The convention is simply *which Tailwind variant owns which concern*:
`md:` for nav form, `lg:` for arrangement. Getting them mixed is exactly the
bug being fixed, so the rule needs to be written down and tested rather than
inferred from the class strings.

**Per-instance retuning is available and comes free.** `navigatorRootVariants`
already sets `[container-type:inline-size]`, so the arrangement rules can use
Tailwind's container variants (`@lg:`) against the Navigator's own box rather
than the viewport. An embedded Navigator — a docs example in a box — then
arranges by its own width, which is what it should already do. Whether to switch
the arrangement rules from `lg:` to `@lg:` in this pass or after is an
implementation call; the mobile tab bar already reads the root via `cqw`, so the
precedent exists.

### Four bands

| Band | Nav | list | detail | inspector |
| --- | --- | --- | --- | --- |
| `< md` (768) | tab bar | stack | stack | **sheet** on demand |
| `md`–`lg` (768–1023) | rail | stack | stack | **drawer** on demand |
| `lg`–`2xl` (1024–1535) | rail | column, capped | column, takes the rest | **drawer** on demand |
| `2xl`+ (1536+) | rail | column | column | column, pinned open |

**Yielding is not disappearing.** A yielded pane re-presents on demand — as a
`sheet` below `md`, a `drawer` above it. This is why `sheet` and `drawer` are
load-bearing values rather than speculative ones: the resolution model
*requires* them.

**Yield order is fixed:** `inspector`, then `list`, then `detail`. This is the
precedence rule SwiftUI never wrote down, and its absence is why
`columnVisibility` reads as a silent override.

### The stack is state, remembered per primary section

The declared pane order **is** the stack. What varies is a depth pointer — one
per primary section, remembered, the way each iOS tab owns its own
`NavigationStack` and switching tabs restores it rather than resetting it.

```
on /components/button → tap Tokens → lands on /tokens/color (not /tokens)
                      → tap Components → back on /components/button
```

Navigator stores the last value per section, and the section's rail item
targets *that* instead of its declared href. It still never navigates; the
consumer's router does. Navigator only changes where the link points.

**Lifetime — the URL always wins:**

> The **URL is the only source of truth** for the current section's stack
> depth. The in-memory Map supplies *only* the target href for sections the
> user is not currently in. On reload the Map is empty and every section link
> falls back to its declared href.

No `sessionStorage`, no hydration mismatch — the Map affects link targets,
never rendered arrangement, and a link target is safe to change after mount.

### What this deletes

Making the stack explicit state removes the derivation that currently spans two
languages:

- `isTopPane.ts` — the JS half of the participation rule
- `max-md:[&>*:not([data-mobile=hidden]):has(~*:not([data-mobile=hidden]))]:…`
  — the CSS half
- the requirement to keep the two "deliberately in sync"

`:has()` remains a dependency elsewhere; this particular use of it goes.

### Motion

Grounded in what Motion actually supports, not what would be nice.

**Findings.** `motion` is currently a dependency of `docs` and
`packages/widgets` but **not** `packages/components` — adding it to core is a
real decision. Springs compile to a generated `linear()` CSS easing on the
WAAPI path, so physics-based motion *can* run on the compositor. Two gotchas
bite panes specifically: Motion's *individual* transforms (`x: 100`) go through
CSS variables and are **not accelerated** by Motion's own admission; and
`layout` / `layoutId` are disqualified outright — main-thread FLIP, visible
distortion of `border-radius` and `box-shadow` (panes have `rounded-2xl` *and*
`emphasis-raised` shadows, so both), and layout animations are **blocked during
horizontal window resizing**, which is exactly the column↔stack case.
`animateView` (React's `ViewTransition` + Motion springs) requires
`react@canary`; Roadie is on React 19 stable, so it is deferred, not chosen.

**The rule:**

> **Within a band**, arrangement changes are `transform` + `opacity` only —
> push/pop, sheet and drawer open/close — animated with an accelerated spring,
> animating the **full `transform` string** rather than individual transform
> values. **Across a band** (a resize crossing `md` or `lg`), the arrangement
> changes **instantly, with no animation.**

The second half is a decision, not an omission. Motion blocks it, the browser
fights it, and it is precisely the transition SwiftUI is most criticised for
because it is not solvable well. This closes the prompt's "transitions between
breakpoints" question by evidence.

**What the structure gives motion:** panes stay mounted across depth changes,
so push/pop is a transform change rather than a mount/unmount — which is what
makes an accelerated spring possible at all, and what leaves room for
interruptible swipe-to-go-back later. `motion-reduce:transition-none` handling
stays as it is.

Whether to take the mini (2.3kb, WAAPI-only) or hybrid (17kb) `animate()` build
is an implementation decision to confirm during planning; the requirement is
the WAAPI path.

### Desktop expand / collapse / minimise

Out of scope. The prompt lists it as an ambition; the resolution model plus the
yielded-pane affordance already deliver the behaviour that has a consumer
(the inspector opening on demand at `lg`). A user-driven pin that overrides the
resolved arrangement is the natural next increment and is deliberately not
designed here.

## 4. Migration

**Build on `feat/navigator-component`, cleaning up aggressively in the same
PR.** The Pane work is the same goal as the branch, and the more of the
superseded surface that leaves in the same change, the more honest the PR.

**Kept, unchanged or renamed:**

- Pane-as-`ScrollArea` via a function `render` prop, so the pane stays
  `<section data-slot="pane">` with a nested viewport
- `emphasis` on the pane, including `subtler` meaning *no surface at all*
- The header publishing its measured height via `ResizeObserver`
  (`--navigator-pane-header-height` → `--pane-header-height`)
- Z-index tiering: scrollbar at `z-docked` (10), pinned chrome at `z-sticky`
  (20)
- The `absolute!` override beating `ScrollArea`'s inline `position: relative`
- `Navigator.Secondary`, the `NavigatorContext.secondaryNav` lift, and
  `NavigatorIndicator` / `useSlidingIndicator` driving the in-header strip
- `ComponentSkeleton` / `ComponentThumbnail` and
  `docs/src/lib/component-manifest.ts`
- `List.Group` / `List.GroupTitle`, `contained`, row-level `emphasis`,
  selector-driven dividers — all as-is

**Deleted:**

`Navigator.Secondary`'s `presentation` prop entirely — with one rail rendering
at `md`+ and one header rendering below, both derived from viewport, there is
nothing left to select — plus `Navigator.SecondaryPane`, `SecondaryPane.Search`,
the bespoke `navigator-overflow-pane` floating `ScrollArea` and its
`FLOATING_PANE` positioning hack, `isPaneSectionActive`, `collectItemMetas`,
`NavigatorFilterContext`, `NavigatorPresentationContext`'s `'pane'` value,
`isTopPane.ts`, the participation `:has()` selector, the borrowed
`navigator-item` row classes, `hideOnMobile`, and
`NavigatorPane`/`NavigatorPaneHeader` as Navigator-owned components.

**`Navigator.Secondary` itself stays**, as does the
`NavigatorContext.secondaryNav` lift that publishes the active section's
declaration to panes, and the `flex md:hidden` strip in the pane header. Both
renderings keep working exactly as they do today; the only change is that the
orchestrator now targets the *current* pane's header rather than whichever
header happens to be mounted.

**Changed:** `List.Item`'s `selected` → `current`; the pane's
`collapseNav: boolean` → `primaryNav: 'visible' | 'auto' | 'hidden'`, absorbing
the new depth-driven hidden state and flipping the default to collapse-on-scroll.

**Reworked rather than deleted:** `Navigator.Group` — its `label` prop becomes a
`Navigator.GroupTitle` child, and its `display: contents` wrapper becomes a
sibling title plus its own `<ul>`. The earlier position that grouping belonged
solely to `List` was wrong; nav needs it too.

**Added:** `Navigator.GroupTitle`, `Navigator.Overflow`,
`Navigator.OverflowItems`, `Navigator.Panel`, `Navigator.Primary`'s optional
`tabs`, and `aria-labelledby` association on both `Navigator.Group` and
`List.Group`.
`List.GroupTitle` becomes an `<h2>` with `render`, matching
`Navigator.GroupTitle` and `Pane.Header`'s existing heading level.

**The docs Components browser migrates in the same pass.** It is the proof:
`Pane` is not done until the reference consumer works — filterable,
category-grouped, thumbnail rows, master–detail at `lg`+, stacked below. The
migration is also what kills the stray-hairline defect at the root instead of
patching it.

Target consumer shape:

```tsx
<Navigator.Content>
  <Pane role='list' className='lg:w-72'>
    <Pane.Header>
      <Pane.Title>Components</Pane.Title>
      <Pane.Search value={q} onValueChange={setQ} placeholder='Filter components' />
    </Pane.Header>
    <List>
      {shown.map((category) => (
        <List.Group key={category.name}>
          <List.GroupTitle>{category.name}</List.GroupTitle>
          {category.components.map((c) => (
            <List.Item
              key={c.name}
              title={c.title}
              href={`/components/${c.name}`}
              current={pathname === `/components/${c.name}` && 'page'}
              trailing={<ComponentThumbnail name={c.name} />}
            />
          ))}
        </List.Group>
      ))}
    </List>
  </Pane>

  {/* primaryNav defaults to 'auto' — collapses on scroll, nothing to declare */}
  <Pane role='detail' current={pathname.startsWith('/components/')}>
    {/* Section tabs land in this header automatically below md, because
        this is the current pane. Nothing to declare. */}
    <Pane.Header backHref={…} />
    {children}
  </Pane>

  <Pane role='inspector'>
    <OnThisPage />
  </Pane>
</Navigator.Content>
```

Compare today's version, which needs `hideOnMobile`, `max-2xl:hidden`, a
`pathname === '/components'` conditional, and a `Navigator.SecondaryPane` that
reads its children out of context.

## 5. Scope

**This is larger than what it replaces, and it should say so.**

It is larger in seven specific ways, each of which is new capability rather
than restructuring:

1. **The pane stack becomes remembered state, per primary section.** Nothing
   like this exists today. It adds a Map to Navigator, a depth pointer, and
   per-section link retargeting.
2. **`sheet` and `drawer` presentations, plus the yielded-pane affordance.**
   Two new arrangement bundles and an orchestrator-owned control in the header
   slot. Today a yielded pane simply does not render.
3. **A fourth responsive band.** Splitting one breakpoint into two adds a band
   (768–1023) that has never existed, with its own arrangement and its own
   tests.
4. **Depth-driven primary nav visibility.** `primaryNav='hidden'` has no
   equivalent today — the mobile bar is always present and can only collapse.
   It also makes the pane's bottom padding conditional rather than constant.
5. **Grouping in primary nav, with real association.** `Navigator.Group` exists
   today but only inside `Navigator.Secondary`, and it associates nothing.
   Primary grouping, `Navigator.GroupTitle`, `<h2>` + `render`, and
   `aria-labelledby` on both Navigator and List groups are all new.
6. **A composable overflow.** `Navigator.Overflow` /
   `Navigator.OverflowItems` and the optional `tabs` slot array replace a
   floating popup that took no consumer content and whose tab membership was
   positional.
7. **Item-owned panels.** `Navigator.Panel` lets an item be a menu rather than
   a destination, rendering as an anchored popover on desktop and a
   full-screen Pane on mobile. Today this is inexpressible, and the workaround
   silently disappears below `md`.

**Only the docs site is a required consumer.** Items 5–7 are driven by the
prototype and by the reference apps rather than by the docs, so they are the
natural candidates if the PR needs to be cut down. Called out here so that
choice stays available rather than being discovered mid-implementation.

Against that, it is *smaller* in surface: eleven exported or internal pieces
are deleted, one two-language derivation collapses into one piece of state, and
the reference consumer loses three responsive props and a conditional.

What it is **not**: a rewrite of `Navigator`. The rail, tab bar, sliding
indicator, `Navigator.Secondary` and its context lift, and single-`value`
control are all untouched. `Navigator.Secondary` gains a clearer contract
rather than losing one — it declares sub-navigation, and the pane decides how
that reads in its own chrome.

## Constraints carried forward

All of these are load-bearing and were learned the hard way on the current
branch. They are not re-derived here — see the
[prompt document](2026-07-27-pane-component-prompt.md) for the full list. The
ones this design depends on directly:

- **Author `Pane` / `List.Group` trees in a client component.** Compounds that
  match children by element identity fail *silently* on server-authored trees,
  because Flight replaces each element's type with a `React.lazy` wrapper.
  Canary at `docs/src/app/debug/rsc-smoke/`. See `COMPOUND_PATTERNS.md` §1.2.
  This design keeps the identity-walk surface small on purpose: chrome renders
  in place, and the orchestrator reads pane *state*, not pane *children*.
- **`List`'s styling is a selector contract, not a set of classes.** Anything
  wanting row behaviour must emit `list-item` / `list-item-content` in that
  child-combinator shape. Borrowing class strings fails past typecheck *and*
  tests.
- **`ScrollArea` sets `position: relative` inline**, so the stacked pane needs
  `absolute!`.
- **`react-docgen-typescript` cannot drill into CVA conditional types** —
  inline the literal unions for `role` and `presentation`, and export sibling
  aliases (`PaneRole`, `PanePresentation`).
- **`noUncheckedIndexedAccess`** — indexed reads into the per-section Map widen
  to `T | undefined`.
- **`Navigator.test.tsx`'s `flushViewportMeasurement()`** is used ~105 times;
  any test rendering a Navigator must be `async` and await it. The suite's
  React `act()` warning count is 17 and must not grow.
- Dev-only warnings use `isDev()` from `packages/components/src/utils/isDev.ts`.
- Never run `prettier --write` on `.mdx`; never run `pnpm --filter docs build`
  while the docs dev server is running.

## Open for the plan, not the design

- Mini vs hybrid Motion `animate()` build, and whether `packages/components`
  takes `motion` as a dependency or the spring is hand-rolled in CSS
- Exact spring parameters and the reduced-motion fallback per presentation
- Whether `Pane.Footer` needs its own measured-height custom property in v1
- `inert` on covered panes — the current branch closes the pointer-events gap
  but not the AT-reachability gap; explicit state makes real `inert` tractable
- Whether `Navigator.Content` gains a public name (`Navigator.Panes`?) now that
  its orchestration role is explicit
- Whether `Pane.SecondaryNav` ships in v1 at all. The automatic header tabs cover
  the docs site completely; the override has no consumer yet, and the
  presence-suppresses-default rule is the only implicit behaviour in the design
- Whether `Navigator.Panel`'s desktop rendering needs to be configurable. It is a
  popover today because that is what the prototype draws; a notifications panel
  might want a `drawer`. One value until something asks for two
- `~/Code/prototype`'s `PersonaSwitcher` is the migration test for
  `Navigator.Panel`, alongside the docs site for `Pane` — worth running both
  before calling the API done
