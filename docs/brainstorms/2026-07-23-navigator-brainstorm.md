# Navigator — adaptive navigation panels — brainstorm

## Purpose

One navigation system that serves both the consumer ticketing app (browse
events, view tickets, manage an account) and the organiser console (event
creation, insights, marketing, audience, organisation switching), across
mobile and desktop, without either product configuring a mode.

Roadie has navigation-shaped components (`Tabs`, `Breadcrumb`, `Dialog`) but
nothing that owns an application frame. Every consuming app currently
re-solves the same hard problems: the mobile↔desktop switch, scroll
ownership, safe areas, and where identity lives.

Interactive reference mockup (consumer + organiser, both viewports):
<https://claude.ai/code/artifact/78cfcbff-b58e-4834-b5d7-7e97548fad80>

## The governing idea

**Name the role, let the form adapt.** `Navigator.Primary` is the same
component and the same semantics whether it renders as a 92px rail on
desktop or a floating tab bar on mobile. `Navigator.Secondary` is the same
component whether it nests inside the rail or becomes a tab strip under the
title.

**Everything is derived from the declared tree.** There is no `density`
prop, no `variant`, no `railWidth`, no coarse/fine mode. The consumer app
gets the simple shape by not declaring the complex one. This is the central
bet of the design; if it fails anywhere, that failure is the signal to
revisit, not to add a prop.

## Pattern

Compound component, **context-only idiom** (same as `Card`, `Accordion`,
`Field`) — see `docs/contributing/COMPOUND_PATTERNS.md`. Named exports plus
property assignment; no `Object.assign` cast.

The root owns breakpoint, selection and derived layout facts, and shares
them through context. Sub-components read what they need. No `Children.map`
and no cloning — except in `Navigator.Primary`, which must count its
children to derive rail form and the mobile fold (see _Derived behaviour_).
That counting reads `children` metadata only; it does not clone or
re-parent.

Sub-components each render a single DOM element carrying a `data-slot`
attribute and a dot-notation `displayName`.

`'use client'` lives on the context module and the root, not on the barrel —
`index.tsx` stays server-safe.

## Anatomy

```
Navigator                  root · owns 100dvh, safe areas, breakpoint, selection
├─ Navigator.Primary       rail (desktop) │ floating tab bar (mobile)
│  ├─ Navigator.Item       value · href · icon · badge
│  └─ Navigator.End        a position, not a type
├─ Navigator.Secondary     nested in rail │ tab strip under the title
│  └─ Navigator.Item       value · href · count
└─ Navigator.Content
   └─ Navigator.Pane       role='list'|'detail' · collapseNav

List                       standalone; useful well outside Navigator
└─ List.Item               title · leading · subtitle · trailing · href · selected
```

`Navigator.End` is a **position**, not a different kind of thing. Its
children are ordinary `Navigator.Item`s that select and render Panes exactly
like any other destination. It pins to the bottom of the rail on desktop and
becomes the final tab on mobile, set off by a hairline so it reads as a
different class of destination.

There is deliberately **no** `Switcher`, `OrgSwitcher`, `ProductSwitch`,
`Account` or `Action` component. Organisation switching, product switching
(Oztix ↔ Studio) and account settings are all `List.Item`s inside Panes.
This keeps those screens identical on mobile and desktop by construction
rather than by discipline, and it means a fourth kind of switching costs
nothing.

## Derived behaviour

Nothing in this table is configurable. Each row is a consequence of the tree
the app declares.

| Input                         | Consequence                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| No item declares `Secondary`  | 92px icon rail; no secondary layer exists                                                                               |
| Any item declares `Secondary` | 240px labelled rail, children inline under the active item                                                              |
| `primary.length + End ≤ 5`    | rendered as authored; End is the last tab                                                                               |
| `primary.length + End > 5`    | first 4 primary items kept; the tail — remaining sections plus everything in `End` — folds into a generated `More` Pane |
| Panes on desktop              | side by side, maximum two, each owning its own scroll                                                                   |
| Panes on mobile               | push stack; tab bar persists above it                                                                                   |
| Nesting deeper than two       | the list Pane replaces in place with a back affordance — identical on both platforms                                    |
| `Pane collapseNav`            | tab bar shrinks to the active tab past the scroll threshold, restores at the top                                        |

Rail form is decided **per product, not per section** — it checks whether
_any_ primary item declares a `Secondary`, not whether the _active_ one
does. This is deliberate: deriving it from the active item would make the
rail change width while navigating.

### The five-tab cap

Navigator counts primary items plus one slot for `End`. It is not possible
to ship a seven-tab bar. The Pane behind the final tab is a `List` of
whatever landed there, and is not customisable in v1 (see _Deferred_).

The final tab's label follows what it contains: a single `End` item lends
its own label (`Account`), anything more is labelled `More`.

Worked examples:

- Consumer: 3 primary + End(account) → 4 tabs, final tab `Account`.
- Organiser: 4 primary + End(orgs, account) → 5 tabs, final tab `More`.
- Hypothetical 6 primary + End → 4 tabs + `More`, holding 2 folded sections
  plus End's contents.

## Layout and geometry

Every region is a raised, rounded, gapped surface. **Panel is a treatment,
not a structure** — `emphasis-raised` plus a radius token does the work, so
a flush variant is a styling switch rather than a different component.

- Root is `100dvh`, `display: grid`, and owns `env(safe-area-inset-*)`.
- The page itself never scrolls. Each Pane owns its scroll with
  `overscroll-behavior: contain`.
- Radius uses `rounded-2xl` for panes and the rail, `rounded-full` for the
  tab bar. No arbitrary values. The shape foundation's tier table gains a
  row for app-shell surfaces, since panes are larger than the Container tier
  (cards, popovers) but are not modals.
- Vertical stacks use `grid gap-*`; the tab bar uses `flex` because its
  children size themselves.
- The rail's two widths (92px / 240px) are tokens, not magic numbers.

Because the page does not scroll, an app that genuinely wants a long
scrolling document must put it inside a single Pane and let that Pane
scroll. This is a documented consequence, not a limitation to design
around.

## List and List.Item

Specified alongside Navigator because the Pane pattern is unusable without
it, but designed to stand alone — it should suit search results, settings
screens, event lists and order histories equally.

`title` is the only required prop. A `List.Item` with nothing else renders
correctly. Ideally an item carries at least an `IconTile` or `Image` in
`leading`, but that is guidance for the docs page, not a runtime constraint.

| Prop       | Purpose                                                          |
| ---------- | ---------------------------------------------------------------- |
| `title`    | required; the only thing an item needs                           |
| `leading`  | `IconTile`, `Image`, or an avatar                                |
| `subtitle` | secondary line                                                   |
| `trailing` | chevron, count, `Badge`, or a check for selected state           |
| `href`     | routes through `RoadieLinkProvider` like every other Roadie link |
| `selected` | selected state, for pickers such as the organisation list        |

`IconTile` already carries `intent` / `emphasis` / `size` / `shape`, so a
settings row and an event row differ only in what is handed to `leading`.

Linking follows the existing Roadie contract: internal hrefs route through
the provider, external hrefs render `<a target='_blank' rel='noopener
noreferrer'>`, `mailto:` / `tel:` / `sms:` render plain anchors, and no
`href` renders a `<button>`.

## Routing

Navigator stays framework-agnostic. It never imports `next/link`; selection
is controlled via `value` / `onValueChange`, and links route through
`RoadieLinkProvider`. Next.js integration ships as a **documented recipe**
on the docs site, not as component code.

The recipe pairs parallel routes with intercepting routes so that one route
file serves both presentations: clicking a row resolves the detail into a
slot, while a refresh or deep link renders the standalone page. Navigator
then presents that same intercepted route as a side Pane on desktop and a
pushed page on mobile.

```
app/(studio)/
├── layout.tsx                     ← <Navigator>, receives children + detail
├── @detail/
│   ├── default.tsx                ← null  (mandatory)
│   ├── [...catchAll]/page.tsx     ← null  (mandatory)
│   └── (.)events/[id]/page.tsx    ← <Navigator.Pane role='detail'>
└── events/
    ├── page.tsx                   ← list
    └── [id]/page.tsx              ← standalone (deep link / hard nav)
```

`(.)` rather than `(..)`: the Next.js docs state that interception matchers
do "not consider `@slot` folders", so the slot is not a route segment.

Three constraints the recipe must carry, all verified against the Next.js 16
documentation:

1. **`default.tsx` is mandatory** for every slot, or a refresh 404s.
2. **A catch-all returning `null` is mandatory.** Client-side navigation to
   a route that no longer matches a slot leaves the previous content
   visible, so switching primary sections with a detail open would strand a
   stale pane.
3. **One URL-addressable deep pane per level.** Slots do not affect the URL,
   so only one pane's state can live in the address bar. This caps the model
   at list + detail — which is exactly the scope here, so it validates the
   design rather than constraining it.

A fourth point to watch: if one slot at a level is dynamic, all slots at
that level must be dynamic. A static list beside a dynamic detail slot needs
the slot placed at a deeper segment.

Per-section stack memory comes free from the router — Next.js "keeps track
of the active state (or subpage) for each slot" across soft navigation.
Navigator therefore implements **no** stack memory of its own; doing so
would fight the router.

## Accessibility

- `Navigator.Primary` and `Navigator.Secondary` are `<nav>` landmarks with
  distinct accessible names.
- Active destinations use `aria-current="page"`.
- The rail and tab bar are arrow-key navigable; `End` participates in the
  same focus order and is announced as a distinct group.
- Focus moves into a Pane when it is pushed on mobile, and back to the
  originating row when popped.
- The collapsing tab bar never removes items from the accessibility tree —
  it only changes their visual presentation — so a screen reader user always
  has the full set.
- All motion respects `prefers-reduced-motion`.
- Focus rings come from `is-interactive`.

## Testing

Behaviour over class snapshots, per the repo convention. Vitest plus React
Testing Library, co-located.

- Rail form derives from tree shape: no `Secondary` anywhere → compact; any
  `Secondary` → labelled, and it does not change while navigating.
- The five-slot fold produces the expected tabs and the expected generated
  `More` Pane, at the boundary (exactly 5) and past it.
- Pane roles lay out side by side on desktop and stack on mobile; back pops
  the stack.
- Nesting past two levels replaces in place and exposes a back affordance on
  both breakpoints.
- `collapseNav` toggles at the scroll threshold and restores at the top;
  a Pane without it never collapses the bar.
- `List.Item` renders with `title` alone; `leading` / `trailing` / `selected`
  are threaded correctly.
- Links resolve internal, external, `mailto:` and no-href cases through the
  provider.

## Documentation

A `Navigator` component page following
`docs/contributing/COMPONENT_DOC_TEMPLATE.md`, plus a `List` page. The
Next.js recipe gets its own foundation-style page, since it is guidance
rather than API surface.

## Known unknown: resource-level navigation

The design has not been tested against a resource that carries substantial
navigation of its own — an event with tickets, pricing, sessions, holds,
attendees, reports and settings, several of those with their own sub-pages.

This is a **breadth** problem, not a depth one. Replace-in-place handles
arbitrary depth fine, but it turns a wide set of sibling sections into a
sequence of pushes, which is the wrong shape for something you move between
constantly while working on one event.

The three plausible answers, none chosen:

1. **The event becomes the context.** Opening an event swaps `Secondary` to
   the event's own sections, with a back affordance to the event list —
   the drill-into-a-resource pattern used by Stripe and Shopify. Fits the
   existing anatomy without new components, but means `Secondary` is
   sometimes a sibling list and sometimes a resource's internals.
2. **The detail Pane owns `Tabs` internally.** Uses a component that already
   exists and keeps Navigator out of it, but caps out at roughly seven
   sections and gives the event no addressable rail presence.
3. **A third navigation layer.** Honest about the information architecture,
   and the thing most likely to be wrong — it would be the first mode in a
   design whose whole premise is that there are none.

Deliberately not resolved here. It needs a real organiser IA to argue
against rather than a hypothetical, and resolving it now would mean
designing a third layer on speculation. Revisit once the docs migration has
proven the two-layer model.

## Deferred

Additive, and explicitly out of scope for v1:

- Per-section stack memory beyond what the router provides.
- A rail collapse toggle with hover flyouts.
- Customising the generated `More` Pane.
- More than two side-by-side Panes on desktop.

## First consumer: the Roadie docs site

The docs site replaces its own navigation with `Navigator`. This is
deliberate dogfooding, and it is demanding rather than convenient:

- **It triggers the mobile fold.** Overview, Foundations, Components,
  Tokens, Migration and Widgets is six primary items plus `End` — past the
  five-slot cap. The first real consumer exercises the hardest path through
  the derived-behaviour table rather than avoiding it.
- **It exercises the nested rail.** The component index under Components,
  and the token groups under Tokens, are exactly the `Secondary` case, so
  the docs site renders the 240px labelled rail.
- **It proves the routing recipe in place.** The site already runs Next
  16.0.10, so parallel and intercepting routes are validated in a real app
  rather than a sandbox.
- **It is the reference implementation.** Anyone reading the `Navigator`
  docs page is looking at `Navigator` while they read it, and any awkwardness
  in the API is felt by the people who own it.

A component index that becomes a `List` of `List.Item`s with `IconTile`
leading slots also gives `List` a real first consumer, not a synthetic one.

Migrating the docs navigation is the acceptance criterion for v1. If
something about the design does not survive that migration, that is the
signal to revisit the design — not to add a prop to work around it.

## Implementation sequencing

The first task is proving, inside the docs app, two things the Next.js
documentation cannot answer: that one intercepted route can render as both a
side Pane and a pushed page without duplication, and how the catch-all
actually behaves when switching primary sections. It is task 1 rather than a
pre-spec spike because it needs `Navigator` to exist in skeleton form to
mean anything, and because the design does not change either way — only the
recipe's wording does.

Rough order: skeleton `Navigator` + routing proof in docs → `List` /
`List.Item` → derived rail form and the five-slot fold → Panes and the
mobile stack → `collapseNav` → docs navigation migration → documentation
pages.
