# Navigator redesign — design

Status: approved in conversation 2026-09-11, pending spec review.
Branch: `feat/navigator-component` (unreleased; Navigator and Pane are `alpha`).

## Goal

One navigation model at every size. The primary nav becomes a vertical
version of the phone tab bar on large screens: icon-only floating capsules,
brand on top, pinned items at the bottom. Every section's sub-pages live in a
list pane. The API moves from positional subcomponents (`End`, the `tabs`
tuple, `Panel`) to per-item properties borrowed from UIKit and SwiftUI
(`placement`, `visibilityPriority`) and a real `Menu`.

`Navigator.Primary` is one component in two orientations:
`data-slot='navigator-primary'` with `data-orientation='vertical'` (`md` and
up) or `'horizontal'` (phones). The old desktop term is retired — it named no
component, and desktop and phone are now the same navigation in two
orientations.

Prior art: iPhone Duo HIG (vertical controls, visibility priority per group
then item, symbols with titles), `UITab.Placement`,
`ToolbarItemVisibilityPriority` (iOS 27), SwiftUI `sidebarAdaptable`.

## Delivery

Self-contained components ship first, each its own PR cut from `main` with its
docs page and changeset:

1. `ScrollArea`
2. `List`
3. `Drawer` + core `motion-drawer` utility (after List: its test uses List)
4. `Accordion` — `--content-inset` publication and the Safari resize fix
5. `Tooltip` — new, Base UI primitive
6. `Badge` — `hideLabel` (below)

Extracted docs pages keep their `# Title` for main's layout; this branch
strips them again after rebasing.

This branch is then rebased onto `main` and carries only Navigator, Pane, the
docs site built on them, and this redesign.

## 1. Anatomy and layout

### Large screens (`md` and up), collapsed — the default

- **Brand** at the top, never inside a capsule. The `ExpandToggle` sits under
  it, icon-only and subtler than a tile, with no capsule of its own.
- **Capsules.** Each `Navigator.Group` renders as its own raised floating
  capsule (`emphasis-raised rounded-full`). Consecutive loose items form an
  implicit capsule. Capsules are separated by a fixed gap.
- **Pinned** items (`placement='pinned'`) sit at the bottom edge.
- **The cluster of capsules centres vertically in the space between brand and
  pinned** — not the viewport — so it can never collide with either.
- Icon-only tiles; the label shows in a `Tooltip`.

### Large screens, expanded — a remembered user toggle

- Capsules widen to show labels beside icons.
- The brand's mark stays on the rows' icon column; a wordmark fades in beside
  it. The toggle moves to the trailing edge of the brand's row.
- The cluster **stays centred** between brand and pinned. Only when it outgrows
  that space does it top-align and scroll. The brand region loses the toggle's
  row, so the cluster drifts up by half that row, animated.
- Everything that moves animates on one duration and easing: the width (the
  panes follow the grid track), the toggle, capsule widths, group titles and
  labels. Reduced motion snaps. A pre-hydration expanded paint doesn't animate.
- Brand stays top and pinned stays bottom; only the cluster between them
  scrolls (`ScrollArea`). Nothing overflows into More while expanded.

### Small screens

- Horizontal floating bar at the bottom (`emphasis-floating`), icon-only.
- Groups flatten into the bar.
- One pinned item gets a separate circle on the trailing edge (iOS 26 search
  tab).
- More uses the ellipsis icon — the HIG reserves the ellipsis for overflow.
- No expanded state; `ExpandToggle` does not render.

## 2. API

```tsx
<Navigator value={path} expanded={open} onExpandedChange={setOpen}>
  <Navigator.Primary aria-label='Documentation'>
    <Navigator.Brand>…</Navigator.Brand>

    <Navigator.Group visibilityPriority='high'>
      <Navigator.GroupTitle>Docs</Navigator.GroupTitle>
      <Navigator.Item value='/start' href='/start' icon={<HouseIcon />}>
        Get started
      </Navigator.Item>
      <Navigator.Item value='/components' icon={<CubeIcon />}>
        Components
        <Navigator.Secondary aria-label='Components' searchable>
          <Navigator.Group>
            <Navigator.GroupTitle>Actions</Navigator.GroupTitle>
            <Navigator.Item value='/components/button' href='…'>
              Button
            </Navigator.Item>
          </Navigator.Group>
        </Navigator.Secondary>
      </Navigator.Item>
    </Navigator.Group>

    <Navigator.Item
      value='account'
      icon={<UserIcon />}
      placement='pinned'
      badge={<Badge intent='danger' emphasis='strong'>3</Badge>}
    >
      Account
      <Navigator.Menu>
        <Navigator.MenuItem href='/profile'>Profile</Navigator.MenuItem>
        <Navigator.MenuItem onClick={signOut}>Sign out</Navigator.MenuItem>
      </Navigator.Menu>
    </Navigator.Item>
    <Navigator.ExpandToggle />
  </Navigator.Primary>

  <Navigator.Content>
    <Pane role='detail' current>…</Pane>
  </Navigator.Content>
</Navigator>
```

### Removed

| Was | Now |
| --- | --- |
| `Navigator.End` | `placement='pinned'` on an Item or Group |
| `tabs` tuple on `Primary` | `visibilityPriority` on Items and Groups |
| `Navigator.Panel` | `Navigator.Menu` + `Navigator.MenuItem` |
| `Navigator.Overflow` | renamed `Navigator.OverflowPane` |
| Nested sub-pages inline in the desktop navigation | sub-pages always open in a pane |
| Secondary strip in the mobile pane header | the section's list pane |

### New

- **`placement`** — `'automatic' | 'pinned'`, default `'automatic'`. On Item or
  Group; an Item inherits its Group's. `fixed`, `movable` and `optional` are
  deferred to user-customisable navigation.
- **`visibilityPriority`** — `'low' | 'automatic' | 'high'`, default
  `'automatic'`. On Item or Group; an Item inherits its Group's. No custom
  relative priorities.
- **`expanded` / `defaultExpanded` / `onExpandedChange`** on the root.
  Navigator never touches storage; the app persists the choice (a cookie, so
  server rendering doesn't flash) and passes it back.
- **`Navigator.ExpandToggle`** — the built-in toggle. Icon-only, it always
  renders in the brand region, wherever it is written; it takes no `placement`.
- **`searchable`** on `Navigator.Secondary` — the generated pane renders a
  `Pane.Search` that filters rows by label and hides groups left empty.
- **`Navigator.SecondaryPane value='…'`** + **`Navigator.SecondaryItems`** —
  override one section's generated pane, mirroring `OverflowPane` +
  `OverflowItems`. Demonstrated on the Navigator page only; the docs site
  does not need it.
- **`Navigator.Menu`** / **`Navigator.MenuItem`** — see section 4.

### Unchanged

`Brand`, `Group`, `GroupTitle`, `Item` (`value`, `href`, `icon`, `badge`),
`Content`, `OverflowItems`, `Secondary` (plus `searchable`).

`GroupTitle` is visible when expanded and in the More pane, and
screen-reader-only when collapsed.

## 3. Overflow and `visibilityPriority`

**Ranking, identical at every size.** Effective priority = the item's, else its
group's, else `automatic`. Rank by priority, ties by source order. Priority
decides *membership*, never *order*: kept items always render in source order.
A capsule whose items all fold disappears.

**Small screens — fixed capacity.** The bar holds five slots: all items if
they fit, otherwise the top four by rank plus More. The first pinned item's
trailing circle takes one of the five (so three plus More beside it); further
pinned items fold into More.

**Large screens, collapsed — capacity from height.** Tile and gap sizes are
fixed tokens, so capacity is arithmetic on the height between brand and
pinned, read by one `ResizeObserver`. No per-item measurement, so no flicker.
When the cluster doesn't fit, the lowest-ranked items move into a More tile at
the end of the cluster. More opens the More pane as a list pane beside the
vertical navigation — the same model as a section pane. Rows keep their groups.

**Large screens, expanded.** Nothing folds; the cluster scrolls.

**Edges.**

- A folded `Menu` item's row opens its menu anchored to the row.
- If the current section has folded, the More tile reads active and the
  section's pane still opens.
- Five or fewer items on small screens (four with a pinned circle): no More.

The ranking is a pure function beside `deriveMobileSlots`, tested directly.

## 4. Sections, panes and Menu

**Selecting a section** navigates as today: its `href`, else its remembered
deep page (section memory), else its first sub-page.

**Large screens.** `Navigator.Content` generates the *active* section's list
pane as the leading column:

- `Pane role='list'` titled with the item's label (`Pane.Title`)
- rows from `Secondary`, groups kept as `List.Group`s
- the current row `aria-current='page'`
- `Pane.Search` when `searchable`

The consumer's detail pane sits beside it.

**Small screens.** The same pane is the tab's stack root. On a sub-page the
list pane sits behind and the detail pane is on top, with Back.

**Between `md` and `lg`** the vertical navigation is showing but panes still
stack (stacking is Pane's `lg` rule): the vertical navigation, then the list
pane and detail as a stack beside it.

**Rules.**

- Only the active section's pane mounts — one at a time.
- A section without `Secondary` gets no pane; its detail stands alone.
- `Navigator.SecondaryPane value` replaces the generated pane for that section.
- The section tile is lit while anywhere in the section
  (`aria-current='true'`); the page's row carries `aria-current='page'`.

**`Navigator.Menu`.**

- Base UI Menu: `role='menu'`, arrow keys, typeahead, Escape, focus return.
  The trigger is the item's tile or row.
- Anchored to its trigger: inline-end of the tile or row on large screens,
  collapsed or expanded; above the tab on small screens; below the row when
  opened from the More pane.
- `Navigator.MenuItem` takes `href` (routed through `RoadieLinkProvider`) or
  `onClick`, plus an optional `icon`.
- A Menu item never navigates and never lights from the route; it reads
  active only while its menu is open.
- Rule for consumers: if it needs a screen's worth of content, it is a
  destination with its own pane, not a menu.
- An item declaring both `Secondary` and `Menu` keeps `Secondary`, with the
  existing dev warning.

## 5. Visuals, motion and accessibility

**Colour.** Icons are always `text-subtle`. The active tile's parent carries
`intent-accent`, so `text-subtle` resolves to the accent's subtle tone. No raw
scale steps.

**Icons.** Phosphor `weight='duotone'` for Navigator destinations, `size-6`.
More: `DotsThreeIcon`. `ExpandToggle`: a sidebar icon. `animate-pop-tap`
bounces the icon as a tab becomes active. `AGENTS.md` records the exception:
Navigator destinations use duotone; everything else stays bold.

**Pill.** The sliding pill stays everywhere — vertical tiles (now moving
vertically), the phone bar, and expanded rows. `useSlidingIndicator` stays.

**Labels.** Collapsed: the new `Tooltip`, inline-end on large screens, with a
shared delay so moving between tiles is instant after the first. No tooltip on
touch or when expanded. The accessible name is always a visually hidden label
inside the link, not `aria-label`, so it translates with the page; the tooltip
is `aria-hidden` to avoid a double announcement.

**Badge.** New `hideLabel` boolean on `Badge`: the badge shrinks to its dot,
its label is visually hidden but still announced, and it implies `indicator`.
Emphasis sets the dot's look; `indicatorPulse` still applies.

```tsx
<Badge hideLabel intent='danger' emphasis='strong'>3 unread</Badge>
```

Navigator renders the declared badge with `hideLabel` in the tile's top-end
corner when collapsed and on the phone bar, and as declared, trailing the
label, when expanded. `badge` is typed as a Badge element so Navigator can set
it. Badge gets no position prop — placement is the container's job.

**Surfaces.** Large-screen capsules `emphasis-raised`; the phone bar
`emphasis-floating`; the brand has no surface.

**Expand and collapse.** The vertical navigation's width snaps; labels fade in on opacity. Pane
columns reflow once, not per frame — within the translate/scale/opacity rule.

**Accessibility.**

- The `nav` landmark keeps its `aria-label`.
- Capsules are lists named by their `GroupTitle`.
- `ExpandToggle` is a button with `aria-expanded` and `aria-controls`,
  labelled "Expand sidebar" / "Collapse sidebar" in visually hidden text and a
  tooltip, in both states.
- Tab order follows source order, not visual position, so pinned items come
  after the cluster.
- Covered panes stay `visibility: hidden` below `lg` (already shipped).

## Deleted code

- `tabs` tuple handling in `mobileSlots` (replaced by priority ranking)
- `NavigatorEnd`, `NavigatorPanel`, `NavigatorPanelPane`
- The nested sub-page list in the desktop navigation: indented rows,
  chevrons, the compact/nested width tokens in
  `packages/core/src/css/layout.css`
- The Secondary strip in `NavigatorPaneChrome`
- The strip surface of the sliding indicator

## Docs site migration

- Foundations, Tokens and Widgets become `Secondary` sections with generated
  panes.
- Components becomes a `Secondary` with `searchable` and category groups; the
  hand-authored Components pane and its thumbnails are deleted.
- Appearance is pinned; `ExpandToggle` sits beside the brand.
- The expanded state persists in a cookie.

## Testing

- **Unit.** Priority ranking and capacity arithmetic as pure functions;
  placement inheritance; generated section pane (title, groups, search
  filtering, current row); `SecondaryPane` override; Menu keyboard behaviour;
  `hideLabel` on Badge; ExpandToggle state.
- **Browser, per breakpoint (390 / 900 / 1440 / 1600).** Centring between
  brand and pinned; overflow into More as the window shortens; tooltips on
  hover and focus; pill movement in all three surfaces; expanded scroll with
  pinned fixed; a menu anchored correctly in each context.
- **By hand.** Reduced motion with the OS setting on; swipe on the Drawer on a
  touch device.

## Deferred

- `placement` values `fixed`, `movable`, `optional` — with user-customisable
  navigation.
- Custom relative priorities (`init(lowerThan:)`).
- Inline sub-pages in the expanded sidebar (`layout='inline'` on
  `Secondary`), addable later without breaking.
- Edge-swipe back.
- `CartDrawer` consolidation onto `Drawer`.
