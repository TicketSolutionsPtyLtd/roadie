# Navigator secondary-as-pane + components list panel — design

Supersedes the registry-based design first drafted for
[the kickoff prompt](./2026-07-26-components-list-panel-prompt.md).

The docs Components section wants a filterable, category-grouped master list with
thumbnail rows. Rather than build that as a bespoke docs component, this makes it
a **third presentation of `Navigator.Secondary`** — a capability apps need too.
The docs site then becomes the first consumer, not a special case.

## Why this belongs in Navigator

`Navigator.Secondary` is already a *declaration read by parents*, not a
self-rendering element. One authored element drives two surfaces today:

| Surface | Rendered by | Gate |
| --- | --- | --- |
| Nested rail group | `NavigatorItem` | branch-active |
| Mobile strip | `NavigatorPaneHeader`, via `NavigatorContext.secondaryNav` | active section |

`NavigatorPresentationContext` (`'rail' | 'strip'`) already exists so
`Navigator.Item` can restyle itself per surface. A list pane is a third surface
on that same mechanism, not a new one.

The choice between "nest it in the rail" and "give it its own pane" is a
recurring product decision driven by item count and row richness. Making it a
prop makes the decision explicit and documentable.

## Dependency: ScrollArea

`docs/plans/2026-07-26-scroll-area-component-plan.md` is in flight. Task 1 (the
`ScrollArea` compound) has landed; **Task 4 rewrites `Navigator.Pane` to render
`ScrollArea` with `render={<section />}`**, moving the scroll container inward to
`ScrollArea.Viewport`.

This design assumes ScrollArea Task 4 has landed and is written against the
post-Task-4 `Navigator.Pane`. Three consequences:

1. **The `emphasis` prop below touches `navigatorPaneVariants` and
   `NavigatorPane.tsx` — the same files Task 4 rewrites.** Sequence after; do not
   develop in parallel.
2. **Sticky positioning resolves against the viewport, not the pane.** That is
   already true for `Navigator.Pane.Header`, and it is what makes sticky group
   headers work unchanged.
3. **Never wrap pane children in `ScrollArea.Content`** — its `min-width:
   fit-content` box is one more thing sticky children must escape. Task 4 already
   forbids this; the group headers here depend on it holding.

The `fade` prop stays off for panes, for the reason Task 2 documents: the mask
applies to everything the viewport paints, so a sticky header washes out exactly
as it pins.

## API additions

Seven additions across the Navigator compound, plus the stacking change below.
Each gets tests and docs.

### 1. `Navigator.Secondary` gains `presentation`

```ts
presentation?: 'rail' | 'pane'   // default 'rail'
```

- **`rail`** — today's behaviour, unchanged: nested group in the rail on desktop,
  hoisted to the mobile strip.
- **`pane`** — the section's sub-nav becomes a dedicated list pane. It renders
  *nothing* in the rail and *nothing* in the mobile strip; the pane is the
  section nav at every size.

Four derivations in `NavigatorPrimary` / `NavigatorItem` must become
presentation-aware:

- **`nests`** (which picks the rail's `compact` vs `nested` form) counts only
  `presentation='rail'` Secondaries. A pane section contributes no rail children,
  so it must not widen the rail on its own.
- **`isBranch ? secondary : null`** in `NavigatorItem` never renders a pane
  Secondary inline.
- **The section chevron** is suppressed for pane sections — there is nothing in
  the rail to expand.
- **`setSecondaryNav`** hoists only rail Secondaries, so `Navigator.Pane.Header`
  never draws a mobile strip for a pane section.

The existing dev warning ("a nesting Navigator has an active section navigation
but no `Navigator.Pane.Header` to host it") gains a sibling: a pane-presentation
Secondary is active but no `Navigator.SecondaryPane` is mounted. Same deferred-tick,
`isDev()`-gated shape as the current one.

### 2. `Navigator.Group`

```ts
type NavigatorGroupProps = {
  label: ReactNode
  children?: ReactNode
  className?: string
}
```

Groups items under a heading, rendering per surface:

| Surface | Rendering |
| --- | --- |
| `rail` | The uppercase label row `DocsNavigator` currently hand-rolls |
| `pane` | Sticky group header (see *Sticky offsets*) |
| `strip` | Label visually hidden; items render inline — a horizontal strip cannot show headings |

This removes two live hacks: the raw `<span className='pt-3 pr-3 pb-1 pl-12
text-xs font-semibold tracking-wide text-subtler uppercase'>` in
`Navigation.tsx`, and the `label: true` pseudo-items that
`getNavigationItems()` invents to feed it.

**Walk impact.** `secondaryDescendantValues`, `firstSecondaryHref` and
`firstSecondaryValue` in `splitSecondary.ts` are strictly one-level: direct
`Navigator.Item` children of `Navigator.Secondary`. They must descend exactly one
level into `Navigator.Group`. `Group` is a known type matched by identity, so the
existing discipline holds — this is not a licence for arbitrary wrappers.
`docs/contributing/COMPOUND_PATTERNS.md`'s direct-children constraint needs
updating to state the new rule precisely.

The RSC identity-walk constraint applies unchanged and now to one more type: a
tree containing `Navigator.Group` must be authored in a client component.

### 3. `Navigator.Item` gains `leading` and `keywords`

```ts
leading?: ReactNode      // pane presentation only
keywords?: string[]      // extra filter match terms
```

`icon` stays the rail/tab/strip glyph and keeps going through `presentNavIcon`
(which does Phosphor weight-switching and would mangle arbitrary media).
`leading` is arbitrary media rendered in the pane row's leading slot, mirroring
`List.Item.leading`. It is ignored in rail and strip presentations.

`keywords` supplements the item's text label for filtering — so `icon-button` is
reachable by slug as well as by its rendered "Icon Button".

### 4. `Navigator.SecondaryPane`

The explicit placement host, mounted inside `Navigator.Content`:

```tsx
<Navigator.Content>
  <Navigator.SecondaryPane />
  <Navigator.Pane role='detail'>{children}</Navigator.Pane>
</Navigator.Content>
```

Explicit rather than auto-rendered by `Navigator.Content`, for two reasons: DOM
order is load-bearing for the mobile pane stack, and `NavigatorContent` is
deliberately server-safe — auto-rendering would force it client and forfeit the
property its file comment calls out. It also mirrors the existing idiom exactly:
the mobile strip does not render itself either; you place a `Pane.Header` and it
hosts it.

```ts
type NavigatorSecondaryPaneProps = {
  heading?: ReactNode
  emphasis?: NavigatorPaneEmphasis
  className?: string
  /** Replaces the derived body entirely. Escape hatch. */
  children?: ReactNode
}
```

It renders a `Navigator.Pane role='list'` containing a `Navigator.Pane.Header`
(heading plus any registered filter controls) and, below it, the active pane
Secondary's groups and items rendered through
`NavigatorPresentationContext value='pane'`. Renders `null` when no
pane-presentation Secondary is active.

`children` remains as an escape hatch for a list that genuinely is not a nav
declaration, but the docs Components pane does not need it.

### 5. Filtering — an extension point, not a feature

Text search is the first filter, not the only one. The mechanism is therefore a
small registry rather than a `filter` boolean.

**Filter context.** `NavigatorSecondaryPane` owns a context holding named
predicates:

```ts
type NavigatorItemMeta = {
  value: string
  label: string          // flattened text of the item's children
  keywords: string[]
  group?: string         // flattened text of the enclosing group's label
}

type NavigatorFilterContextValue = {
  register: (id: string, predicate: (item: NavigatorItemMeta) => boolean) => void
  unregister: (id: string) => void
}
```

An item is visible when **every** registered predicate passes. A `Navigator.Group`
with no visible items hides itself, header included.

**The built-in control.** `Navigator.SecondaryPane.Search` — an `Input` rendered
in the pane header that registers a predicate matching, case-insensitively,
against `label` and `keywords`. Props: `placeholder`, `aria-label`. It carries a
clear button while it has text, and the pane shows a single short empty-state line
when nothing matches.

Future controls (a status `Select`, a category `Toggle`, a date range) are new
components registering their own predicate. They need no change to the core —
which is the point of `NavigatorItemMeta` carrying `group` and `keywords` rather
than the search string alone.

**Filtering is view-only.** This is the load-bearing constraint. Non-matching
items are hidden from view but stay declared, so `secondaryDescendantValues`
never shrinks and `isBranchActive` never flips. Without this, filtering out the
page you are currently on would drop the section from `activeSecondary` and
**unmount the pane you are typing into**. Hidden items are removed from the
accessibility tree too (not merely visually hidden) — a filtered-out row is not a
destination a screen-reader user should land on.

### 6. `Navigator.Pane` gains `emphasis`

`navigatorPaneVariants` currently hardcodes `emphasis-raised` in its base. That
moves into a variant using Card's value names:

| Value | Surface |
| --- | --- |
| `raised` (default) | `emphasis-raised` — today's behaviour, unchanged |
| `normal` | `emphasis-normal` |
| `subtle` | `emphasis-subtle` |
| `subtler` | **transparent** — no background, border, or shadow |

`subtler` deliberately diverges from Card's `emphasis-subtler` (a faint tint plus
a hairline border). On a pane the recessive option means *no surface at all* — the
pane sits directly on the sunken frame the way the rail already does. Documented
on the JSDoc and the docs page so it cannot read as an oversight.

Rounding stays in the base; a `subtler` pane has no surface to round, so it is
inert there.

### 7. `Navigator.Pane.Header` gains `children`

`NavigatorPaneHeaderProps` exposes `heading`, `backHref`, `onBack`, `dismiss`,
`action`, `className` — no slot for arbitrary content. `children` renders below
the heading and above the mobile secondary strip, inside the existing sticky
`<header>`. `hasChrome` must count it, so a header carrying only `children` still
renders and does not get `hideOnDesktop`.

This is where `SecondaryPane.Search` lives.

## Sticky offsets

Group headers must pin *below* the pane header, not under it. Both are sticky
inside the same `ScrollArea.Viewport`.

`Navigator.Pane.Header` measures itself with a `ResizeObserver` and publishes its
height as `--navigator-pane-header-height` on the pane element (reached via a ref
passed down through `NavigatorPaneContext`, which today carries only the role and
becomes an object). Group headers use `sticky top-[var(--navigator-pane-header-height,0px)]`.

Measurement rather than a constant because the header's height genuinely varies:
heading present or not, search present or not, and on mobile the secondary strip
adds a row. A hardcoded offset would be wrong in most of those combinations.

## Mobile stacking stops depending on `:last-child`

The mobile pane stack currently pushes every `:not(:last-child)` off-canvas. That
is DOM order, not visual order, and `display: none` on a later sibling does **not**
hand the top slot back — which is why `OnThisPage` is authored *before* the
content pane with a compensating `lg:order-2`, as its comment in `Navigation.tsx`
explains.

It breaks outright here. At a section's landing route (`/components`) both the
secondary pane and the detail pane are mounted; the detail pane is last, so on
mobile the user gets an empty "Select a component" *instead of* the list — and
Back from a component doc returns them to that same empty pane.

### The fix

A pane declares whether it takes part in the mobile stack, and the stack is
computed from that rather than from position:

```ts
// Navigator.Pane
/**
 * Drop this pane from the mobile pane stack: hidden below `md`, and ignored
 * when working out which pane is on top. Use for panes that only make sense
 * beside the content (a table of contents), and for a detail pane that should
 * yield to the list at a section landing.
 */
hideOnMobile?: boolean   // default false
```

which emits `data-mobile='hidden'`, and `navigatorContentVariants` becomes:

```
max-md:[&>*[data-mobile=hidden]]:hidden
max-md:[&>*:not([data-mobile=hidden]):has(~*:not([data-mobile=hidden]))]:-translate-x-[22%]
max-md:[&>*:not([data-mobile=hidden]):has(~*:not([data-mobile=hidden]))]:opacity-60
max-md:[&>*:not([data-mobile=hidden]):has(~*:not([data-mobile=hidden]))]:pointer-events-none
```

Read it as: *a pane is stacked underneath when some later sibling is still
participating.* The last participating pane matches nothing and is therefore on
top.

Three properties make this the right fix rather than a patch:

- **It stays pure CSS.** `NavigatorContent` keeps the server-safety its file
  comment calls out, and there is no hydration flash — the prerendered HTML is
  already correct, unlike a JS-computed `data-top`.
- **DOM order stops being load-bearing for hidden panes.** `OnThisPage` can be
  authored last, in its natural reading position, and drop the `order-*`
  compensation entirely.
- **It removes a latent bug.** `NavigatorPane` decides "am I the visible pane"
  with `el.nextElementSibling !== null` in two places (the `collapseNav` sync and
  `activePaneScroller`). Today a `display:none` pane authored last would silently
  disable both. Both switch to a shared `isTopPane(el)` helper using the same
  rule as the CSS, so the two can't drift.

If Tailwind's arbitrary-variant parser fights the `:has(~*)` selector, the
fallback is a named `@utility` in `packages/core/src/css/layout.css` alongside the
other Navigator layout tokens — the selector is complex enough that a named
utility with a comment may read better regardless.

**Browser support:** `:has()` is Baseline since Firefox 121 (Dec 2023); Safari
15.4+ and Chrome 105+. Acceptable for the design system's targets, but it is the
first hard `:has()` dependency in Roadie and should be called out in the docs.

### The two landing patterns

Both are `hideOnMobile` on the detail pane at the landing route; they differ only
in what the landing renders on desktop. Documented on the Navigator page as a
pair, because the choice recurs.

**Empty detail** — the landing shows a placeholder beside the list.

```tsx
<Navigator.SecondaryPane />
<Navigator.Pane role='detail' hideOnMobile={atSectionLanding}>
  {children}
</Navigator.Pane>
```

Mobile shows the list; desktop shows list + `EmptyState`. This is what the docs
site uses.

**Auto-select the first child** — the landing renders the first item's content in
the detail pane, at the landing URL. Same `hideOnMobile`, so mobile still shows
the full list; only the desktop detail differs.

Render it, do not redirect. A desktop-only redirect changes the URL, so a resize
across `md` strands the user on a child route, the back button collects a
duplicate entry, and under `output: 'export'` there is no server to do it. The
app already authored the section's items, so it knows the first one — the docs
site reads `getComponentManifest()[0]`. No Navigator API is needed for this; if
threading the first destination through app code proves annoying in practice,
exposing the existing internal `firstSecondaryHref` through a hook is the
follow-up, not a prerequisite.

## Docs site changes

With the above, the Components section is a declaration.

### `Navigation.tsx`

```tsx
<Navigator.Item value='/components' href='/components' icon={<CubeIcon />}>
  Components
  <Navigator.Secondary presentation='pane' aria-label='Components'>
    {categories.map((category) => (
      <Navigator.Group key={category.name} label={category.name}>
        {category.components.map((c) => (
          <Navigator.Item
            key={c.name}
            value={`/components/${c.name}`}
            href={`/components/${c.name}`}
            keywords={[c.name]}
            leading={<ComponentThumbnail name={c.name} />}
          >
            {c.title}
          </Navigator.Item>
        ))}
      </Navigator.Group>
    ))}
  </Navigator.Secondary>
</Navigator.Item>
```

plus the `SecondaryPane` and the landing-aware detail pane in `Navigator.Content`:

```tsx
<Navigator.SecondaryPane className='md:w-[18rem]'>
  <Navigator.SecondaryPane.Search placeholder='Filter components' />
</Navigator.SecondaryPane>
<Navigator.Pane role='detail' hideOnMobile={pathname === '/components'}>
  {children}
</Navigator.Pane>
```

No registry, no `ComponentListPane`, no `--list-filter-h` in app code, no
collapsing of the Navigator `value` — the rail item stays branch-active off the
declared descendants exactly as it does today, because filtering never removes
them.

The other sections keep `presentation='rail'` and are otherwise untouched, except
that their category labels can migrate from `label: true` pseudo-items to
`Navigator.Group` where they have them.

### Shared component manifest

The filesystem walk reading each component's `export const metadata` is currently
duplicated between `docs/src/app/layout.tsx` and `docs/src/app/components/page.tsx`,
with `categoryOrder` written out twice. Both become callers of a new
`docs/src/lib/component-manifest.ts`:

```ts
export type ComponentSummary = {
  name: string
  title: string
  description: string
  category: string
}

export const CATEGORY_ORDER: string[]
export async function getComponentManifest(): Promise<ComponentSummary[]>
```

The root layout calls it once and passes the grouped result to `DocsNavigator`.
This is the only refactor folded in, and it is directly in the way — the pane
declaration needs exactly this data.

### `ComponentSkeleton`

Moves verbatim from `docs/src/app/components/page.tsx` to
`docs/src/components/ComponentSkeleton.tsx`. A thin `ComponentThumbnail` wrapper
puts it in a fixed 4:3 box (`bg-subtle`, `rounded-md`, `overflow-hidden`) with a
transform scale — the skeletons are authored at roughly `w-40` for the old card
grid, and scaling the wrapper beats resizing thirty-odd skeletons.

### `/components`

`page.tsx` becomes a small server page rendering `EmptyState` ("Select a
component" plus a line of guidance). The card grid and the inline
`ComponentSkeleton` definition are removed. It is seen on desktop only — on mobile
`hideOnMobile` on the detail pane hands the top slot to the list.

### Detail pane

Under `/components`, the doc pane's `Navigator.Pane.Header` gets
`backHref='/components'` with the default `dismiss='auto'`: a Back caret while
stacked on mobile, a Close X beside the list on desktop.

### Widths

`OnThisPage` moves from `lg` to **`2xl`** (1536px). At 1280px four columns would
leave the doc pane ~380px, too narrow for `tsx-live` previews.

| | Width | Notes |
| --- | --- | --- |
| Rail | 15rem | unchanged (`--navigator-rail-nested`) |
| Secondary pane | 18rem | overrides the 24rem `role='list'` default |
| On-this-page | 14rem | `2xl`+ only, `emphasis='subtler'` |
| Doc | remainder | ~744px at 1536px |

`OnThisPage` gets `hideOnMobile` and can now be authored last, in its natural
reading position — the `lg:order-2` / `lg:order-1` compensation the
`:last-child` rule forced goes away.

## Documentation

The decision guidance the whole change is for, on the Navigator docs page as a
`<Guideline>` pair plus prose:

**Choose `presentation='rail'`** when the section has a handful of flat
sub-pages, the labels are short, and the rail has room. The nesting keeps the
section's structure visible alongside its siblings, and costs no layout.

**Choose `presentation='pane'`** when the list is long enough to need scrolling
independently of the page, needs grouping, needs filtering, or the rows carry
more than a label (thumbnails, subtitles, badges). Costs a column, so it suits
sections a user dwells in rather than passes through.

Rough dividing line: under ~10 flat items, rail. Grouped, filterable, or
thumbnail-bearing, pane. State it as a heuristic, not a rule.

Also documented: the presentation matrix (which props apply on which surface —
`leading` is pane-only, `Group` labels are hidden on strip), the `subtler`
divergence from Card, `hideOnMobile` and the two landing patterns as a pair, the
new `:has()` dependency, and the filter extension point with a worked example of
a second, non-search filter.

`PropsDefinitions` must pick up every new prop — so no
`VariantProps<typeof …>['key']` on public prop shapes, per the repo rule.

## Testing

**Components package**, extending the existing Navigator suite (the 94
`aria-current` / `data-slot` assertions must stay green throughout):

- `presentation='pane'` renders nothing in the rail, no chevron, and no mobile
  strip; `presentation='rail'` is unchanged.
- A tree whose only Secondary is `presentation='pane'` leaves the rail in
  `compact` form.
- `Navigator.SecondaryPane` renders `null` with no active pane Secondary, and
  renders the active section's groups and items otherwise.
- The dev warning fires when a pane Secondary is active with no `SecondaryPane`
  mounted, and does not fire once one is.
- `splitSecondary`'s three walks find items nested one level inside
  `Navigator.Group`, and still ignore stray wrappers.
- `Group` renders its label in rail and pane presentations, and hides it in strip.
- Search filters by label and by `keywords`; a group with no matches hides itself;
  hidden items leave the accessibility tree.
- **Filtering out the active item keeps the pane mounted and the section
  branch-active** — the regression this design exists to prevent.
- `Navigator.Pane` renders each `emphasis` value; `raised` is the default;
  `subtler` emits no `emphasis-*` utility.
- `Navigator.Pane.Header` renders `children`; a header with only `children` is not
  `md:hidden`; children sit between heading and strip.
- `hideOnMobile` emits `data-mobile='hidden'`.
- `isTopPane` treats the last participating pane as top, ignores
  `data-mobile='hidden'` siblings whatever their position, and therefore keeps
  `collapseNav` and `activePaneScroller` working when a hidden pane is authored
  last. The existing `nextElementSibling` assertions around
  `Navigator.test.tsx:1941` need updating to the new rule.

Sticky behaviour, the `ResizeObserver` offset, and the mobile stack are not
meaningfully testable in jsdom — they go to browser verification, per the
precedent the ScrollArea plan sets.

**Docs app** has no test infrastructure; verification is
`pnpm --filter docs build` plus browser checks:

- ~390px: at `/components` the list is the visible pane; tapping a row pushes the
  doc with a Back caret; Back restores the list with its scroll position intact.
- ~1300px: rail + list + doc, no On-this-page, doc readable.
- ~1600px: four columns, On-this-page transparent against the frame.
- Group headers pin below the pane header, not under it, while scrolling — and
  still do so inside `ScrollArea.Viewport`.
- Every existing Navigator surface still stacks correctly on mobile after the
  `:last-child` change — the docs shell, the Navigator docs page examples, and
  the `NavigatorCanary`.
- Filter narrows live; empty groups vanish; clear works; empty-state line shows;
  filtering out the current component does not unmount the pane.
- Rail Components item stays highlighted on `/components/button`.

Gate: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter docs build`.
Rebuild `@oztix/roadie-components` before docs checks — docs resolve it via dist.

## Risks

1. **ScrollArea Task 4 collides twice.** It rewrites `NavigatorPane.tsx` and
   `navigatorPaneVariants` — the same files as `emphasis` and `hideOnMobile` — and
   it re-points the two `nextElementSibling` scroll consumers at a new
   `viewportRef`, which is exactly the code `isTopPane` replaces. Sequence after
   Task 4; do not parallelise.

2. **The stacking change touches every Navigator consumer.** It is the one edit
   here that can regress surfaces this work never looks at. It is also pure CSS
   with no behavioural default change (a tree with no `hideOnMobile` produces the
   same result as `:last-child` did), which is what makes it safe enough to take
   in this pass rather than defer.

3. **First hard `:has()` dependency in Roadie.** Baseline since Firefox 121;
   fine for the design system's targets, but new.

4. **The one-level walk into `Group` is a real loosening** of a constraint that
   exists because Flight replaces element types with lazy wrappers. It stays sound
   only because `Group` is matched by identity like `Secondary` and `Item` are.
   The `NavigatorCanary` under `docs/src/app/debug/rsc-smoke/` should gain a
   `Group` case.

5. **`NavigatorPaneContext` changes shape** from a bare role string to an object,
   to carry the pane ref for the header-height var. Internal, but it touches every
   consumer.

## Out of scope

- Filter state in the URL.
- Filter controls beyond search — the extension point is built and documented; the
  second control waits for a real need.
- A hook exposing the active section's first destination. The auto-select-first
  landing pattern is documented using data the app already has; add the hook only
  if threading it proves annoying.
- Pane presentation for Foundations or Widgets. Cheap once this lands; building it
  now is speculation.
- Changes to the skeleton illustrations themselves.
