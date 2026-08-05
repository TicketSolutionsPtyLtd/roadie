import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { tabsIndicatorSurfaceClass, tabsListVariants } from '../Tabs/variants'

// The root owns the viewport. `100dvh` (not `100vh`) so mobile browser
// chrome collapsing doesn't crop the tab bar, and safe-area padding so the
// floating bar clears the home indicator.
// A single full-height row on mobile: the content fills it and the tab bar
// floats over the top of it. `relative` makes the root the positioning
// context for that floating bar. The mobile secondary nav now lives inside the
// top pane's `Pane.Header` rather than a reserved root row.
// `bg-sunken` (not `emphasis-sunken`) — the raised panes and transparent rail
// carry the depth; an inset shadow on a full-viewport frame reads as a heavy
// vignette rather than a recess.
//
// `container-type: inline-size` makes the root a query container so the mobile
// tab bar can size each tab to 1/5 of the root width (`cqw`) — full width for
// five, and the same tab size when there are fewer. Reads the root's own width,
// so an embedded Navigator (a docs example in a box) measures its box, not the
// viewport.
export const navigatorRootVariants = cva([
  'group/navigator',
  'relative grid h-[100dvh] w-full overflow-hidden bg-sunken',
  '[container-type:inline-size]',
  'grid-rows-1 md:grid-cols-[auto_1fr]',
  'pt-[env(safe-area-inset-top)]'
])

// Below `lg` the panes stack: each fills Content and only the top one is
// visible. `relative` makes Content the positioning context so panes resolve
// against it, not the viewport. From `lg` they lay out side by side and every
// stacking rule is inert.
//
// Flex, not an equal-fr grid: a capped `list` pane takes only its own width
// and `detail` fills the remainder. An fr grid would split the row evenly and
// strand the list's spare column while half-starving detail.
export const navigatorContentVariants = cva([
  'row-start-1 md:col-start-2',
  // The frame behind the panes. A pane that paints no opaque surface of its
  // own (`subtle`, `subtler`) inherits this for its sticky chrome, so the bar
  // mixes against what is actually behind it rather than a guess baked into
  // the pane.
  '[--pane-surface:var(--intent-bg-sunken)]',
  // Padding is desktop-only: stacked panes are `absolute inset-0`, which
  // resolves against Content's padding box, so padding here would leave a
  // sunken gap around an otherwise full-bleed pane.
  'grid min-h-0 min-w-0 gap-3 lg:p-3',
  // Guards the `lg:p-3` above, so it has to fire at the same breakpoint — at
  // `md` there is no left padding for it to zero.
  'lg:group-has-[[data-slot=navigator-rail]]/navigator:pl-0',
  'grid-cols-1 lg:flex lg:flex-row',
  // The stack geometry itself — position, translate, opacity, transition —
  // now lives on `paneVariants`' `stackPosition` variant, keyed off the
  // pane's own `data-stack-position`. A direct-child selector here could
  // never reach a pane arriving through a wrapper the orchestrator did not
  // render (a Next.js parallel-route slot, most of all), which is exactly
  // the registration seam this stylesheet now defers to.
  //
  // `overflow-hidden` pairs with `relative`: Content is the box a stacked
  // pane's `absolute inset-0` resolves against, and a `behind` pane's
  // translate can be wider than the rail beside it — clipping to the box
  // that owns the geometry, not shrinking the translate, keeps it correct
  // regardless of the rail's current width. `lg:` untouched: panes are
  // columns from there and never translate, so nothing needs clipping.
  'max-lg:relative max-lg:overflow-hidden'
])

// Primary items plus one slot for End. Not configurable — a seven-tab bar
// is not a shape Navigator can be talked into.
export const MAX_TABS = 5

// Two rail forms, derived once per product from whether anything in the
// tree declares a Secondary. `nested` widens to fit labels and inline
// children; `compact` stays icon-first and closest to the tab bar.
// No card treatment — the rail is transparent and sits directly on the
// sunken frame; the panes carry the only raised surfaces.
//
// The root (a ScrollArea, rendered as the `<nav>`) owns width and grid
// placement only. Base UI pins the scrollbar to the root's
// `inset-inline-end`, so the rail's own padding must live on the viewport,
// not here — padding on the root would push the bar in from the pane edge.
export const navigatorRailVariants = cva(
  ['group/rail hidden min-h-0 md:col-start-1 md:row-start-1 md:block'],
  {
    variants: {
      form: {
        compact: 'w-(--navigator-rail-compact)',
        nested: 'w-(--navigator-rail-nested)'
      }
    },
    defaultVariants: { form: 'compact' }
  }
)

// The rail's scroll container. `relative` positions the sliding indicator,
// which now lives here (not the root) so `useSlidingIndicator` measures
// against the element that actually scrolls — see `NavigatorPrimary`.
export const navigatorRailViewportVariants = cva(['relative min-h-0 p-3'])

// The rail's rows live inside `ScrollArea.Content`, so the column that
// `Navigator.End`'s `mt-auto` pushes against has to be this wrapper, not the
// viewport. `min-h-full` makes it fill the (padding-deducted) viewport when the
// rail is short, so End still lands at the bottom, and grow past it when the
// rows overflow.
export const navigatorRailContentVariants = cva([
  'flex min-h-full flex-col gap-1'
])

// Floating tab bar. On mobile it floats over the bottom of the full-height
// content, anchored to the root's bottom rather than taking a grid row; the
// safe-area bottom offset clears the home indicator. `z-sticky` lifts it above
// the panes (which are positioned and later in DOM order so they would
// otherwise paint over it) and above in-content `z-docked` accents like the
// docs code-preview copy button. On desktop it is `display: none` and never
// takes a grid slot.
//
// The bar keeps one box in both states, on both axes: full width minus the
// floating inset whatever the tab count, and a height the track holds constant
// because every tab presentation carries the same vertical padding (see
// `navigatorTabVariants` — the collapsed circle descends on `translate`, it
// does not shorten the row). That invariance is what lets the collapse animate
// on `scale`/`translate`/`opacity` alone — the visible pill is its own element
// (`navigatorTabBarPillVariants`) that hugs the tabs and fades, and the two
// edge circles translate outward to this box's padding edge. The pill is
// `inset-0` of the track, so a row that changed height would snap the pill's
// top edge at full opacity — the exact pop this arrangement removes.
//
// The custom properties are the geometry every part of that reads:
// `--navigator-tab-col` is one column — a fifth of the root width less the
// bar's own 2rem of floating inset, read via the root's `container-type`.
// `--navigator-tab-edge` is the part of a circle's travel that is the same
// wherever it started — half the slack a short bar leaves either side of
// the hug, plus half the slack between a column and the circle inside it.
// A circle adds its own column index's worth of columns on top (see
// `navigatorTabVariants`). All of it is `calc` off the container query
// that sizes the columns, so the travel needs no measurement.
//
// `--navigator-tab-count` and each tab's `--navigator-tab-index` are the only
// pieces the stylesheet can't know; `Navigator.Primary` sets them inline from
// what it is already rendering. The `5` here is never read at runtime —
// `Navigator.Primary` sets the custom property on every render — it exists so
// this stylesheet reads sensibly in isolation (a five-tab bar) rather than as
// an unset, meaningless `calc`.
export const navigatorTabBarVariants = cva(
  [
    'max-md:absolute max-md:inset-x-2 max-md:bottom-[max(1rem,env(safe-area-inset-bottom))] max-md:z-sticky md:hidden',
    'grid',
    // The bar's own box is always the full floating width, whatever the tab
    // count — only the hugging track (`navigatorTabBarTrackVariants`, below)
    // and the collapsed circles are ever narrower than it. Input must stop
    // here unconditionally, or a short bar leaves a strip either side of the
    // track that swallows taps and swipes meant for the page beneath it; the
    // track puts it back while expanded, and each circle puts it back while
    // collapsed.
    'pointer-events-none',
    '[--navigator-tab-count:5]',
    '[--navigator-tab-col:calc((100cqw-2rem)/5)]',
    '[--navigator-tab-edge:calc((5_-_var(--navigator-tab-count))_*_var(--navigator-tab-col)_/_2_+_(var(--navigator-tab-col)_-_3.5rem)_/_2)]',
    // `translate`, not `transform`: the hide state is `max-md:translate-y-[…]`,
    // which Tailwind v4 emits as the independent `translate` property, so
    // naming `transform` transitioned nothing and the bar snapped away.
    'motion-safe:transition-[translate,opacity,visibility] motion-safe:transition-discrete motion-reduce:transition-none'
  ],
  {
    variants: {
      // The top pane hides the bar (iOS `hidesBottomBarWhenPushed`). It leaves
      // on a transform and its opacity — never on a layout property — and the
      // element stays in the box so the return animates back. `invisible` is
      // what takes it out of the accessibility tree; `allow-discrete` (above)
      // holds it until the transform has finished so the exit still animates.
      hidden: {
        true: 'max-md:invisible max-md:translate-y-[calc(100%+2rem)] max-md:opacity-0',
        false: ''
      },
      // Both states leave the bar itself `pointer-events-none` (above) — the
      // variant exists for the doc comment, not a class difference. Expanded,
      // the track (`navigatorTabBarTrackVariants`) restores input for the
      // hugging box the tabs actually fill. Collapsed, the middle stays inert
      // — where a future tab-bar attachment (e.g. a CartDrawer mini-bar)
      // would sit — and each circle restores its own.
      collapsed: {
        true: '',
        false: ''
      }
    },
    defaultVariants: { collapsed: false, hidden: false }
  }
)

// The tabs' own box inside the bar: a hug-to-content grid whose every column
// is exactly one `--navigator-tab-col`, so each tab is the same generous size
// no matter the count — five fill the bar edge to edge, fewer keep that size
// and the row hugs, centred, inside the bar's unchanging box.
//
// This, not the bar, is the indicator's track and the pill's positioning
// context: both have to resolve against the tabs' box rather than the bar's,
// because only this one hugs. `px-2` is 0.25rem more than the indicator's
// overhang, so an edge tab's pill keeps a small gap from the pill surface's
// rounded corner.
//
// Expanded, this is also the box that puts pointer events back after the bar
// (`navigatorTabBarVariants`) turns them off — it hugs the tabs, so the input
// it restores never reaches past them. Collapsed, every tab still keeps its
// grid column (nothing is removed, only scaled), so at five tabs this box is
// the bar's full width again — restoring input here would swallow the same
// gutter the collapsed state exists to open up, so it stays off and each
// circle (`navigatorTabVariants`) restores its own instead.
export const navigatorTabBarTrackVariants = cva(
  [
    'relative mx-auto grid w-fit grid-flow-col auto-cols-[var(--navigator-tab-col)] items-center gap-0 px-2 py-1'
  ],
  {
    variants: {
      collapsed: {
        true: '',
        false: 'pointer-events-auto'
      }
    },
    defaultVariants: { collapsed: false }
  }
)

// The visible surface behind the tabs — a plain painted box, so it can leave
// on `opacity` alone while the bar it sits in never moves. First child of the
// track and unpositioned in z, so the indicator and the tabs after it paint
// over the top by DOM order.
export const navigatorTabBarPillVariants = cva(
  [
    'pointer-events-none absolute inset-0 rounded-full emphasis-floating',
    'motion-safe:transition-opacity motion-reduce:transition-none'
  ],
  {
    variants: {
      collapsed: {
        true: 'opacity-0',
        false: 'opacity-100'
      }
    },
    defaultVariants: { collapsed: false }
  }
)

// One tab-bar destination. Expanded, every tab is one column of the track's
// grid, so a bar of three and a bar of five read at the same size. Collapsed,
// the active tab and the final tab become icon-only floating circles that
// translate to the bar's edges; every other tab scales to nothing but stays in
// the AT tree (no `display:none`), so a screen-reader user keeps the full
// destination set.
//
// Active reads iOS-accent: icon + label in the vivid accent (`text-accent-11`)
// on a subtle accent-tinted pill. The tinted background comes from the intent
// var directly rather than `emphasis-subtle` so the accent text is the sole
// `color` declaration and never loses to the emphasis preset.
export const navigatorTabVariants = cva(
  [
    'is-interactive relative z-[1] min-w-0 overflow-hidden rounded-full',
    // Only `emphasis-subtler` (inactive, expanded) brings a border, and it is
    // transparent — but a 1px transparent border is still 2px of box. Holding
    // one here makes the box the same for every presentation and both currency
    // states, which is what keeps the row (and the pill's `inset-0`) from
    // changing height on collapse.
    'border border-transparent',
    'grid justify-items-center gap-1',
    'text-center text-[0.625rem]/tight font-medium',
    'motion-safe:transition-[scale,translate,opacity,background-color] motion-reduce:transition-none'
  ],
  {
    variants: {
      active: {
        true: 'intent-accent',
        false: ''
      },
      presentation: {
        // Full pill tab: icon over label, width from the track's grid column.
        // `px-1` is minimal, iOS-style — the equal columns supply the rhythm.
        // `is-interactive` sets no `pointer-events` of its own (only under
        // `:disabled`), so this has to say `auto` explicitly the same way the
        // circle presentation below already does — the bar it sits in is
        // `pointer-events-none` and a tab is not otherwise an ancestor that
        // reasserts it.
        expanded: 'pointer-events-auto px-1 py-1.5 scale-100 opacity-100',
        // Collapsed floating circle: keeps the lg-IconButton feel — size-14
        // (56px) with a non-shrinking size-7 icon (14px padding, the same ~25%
        // ratio as a lg IconButton's 12px/48px), icon only, centred, own
        // surface. Centred in its column, which is what `--navigator-tab-edge`
        // measures the travel from.
        //
        // `self-end` parks it on the row's bottom edge — where the expanded
        // tab's own bottom edge already was — so the only distance left to
        // travel is the track's `py-1`, and `translate-y-1` is exact whatever
        // the row's content height turns out to be. On `translate` rather than
        // by shortening the row, so the box never changes and the descent
        // animates with the rest of the collapse.
        circle:
          'pointer-events-auto size-14 translate-y-1 scale-100 place-content-center justify-self-center self-end bg-raised opacity-100 shadow-xl',
        // Collapsed, not a circle: scaled away but kept in the AT tree, and it
        // keeps its grid column. `py-1.5` matches `expanded` even though
        // nothing here is visible — `scale` doesn't affect layout, so this tab
        // is what holds the row (and therefore the bar, and therefore the
        // pill's `inset-0` box) at exactly the height it had expanded.
        hidden: 'scale-0 px-0 py-1.5 opacity-0 pointer-events-none'
      },
      // Which edge a circle floats to. Inert until the tab is actually a
      // circle: `Navigator.Primary` names the sides while expanded too.
      circleSide: {
        left: '',
        right: ''
      }
      // No `order` variant, deliberately. Reordering is a layout change that
      // can only happen discretely, so pinning a circle to an end column
      // teleported it there in one frame before the translate could run.
      // Every circle now travels from the column it already occupies — see
      // the compound variants below.
    },
    compoundVariants: [
      {
        active: true,
        presentation: 'expanded',
        class: 'text-accent-11'
      },
      {
        active: false,
        presentation: 'expanded',
        class: 'emphasis-subtler text-subtle'
      },
      { active: true, presentation: 'circle', class: 'text-accent-11' },
      { active: false, presentation: 'circle', class: 'text-subtle' },
      // The travel from wherever the tab already sits to the bar's padding
      // edge: its own column index's worth of columns, plus the fixed
      // `--navigator-tab-edge`. A left circle counts columns to its left, a
      // right circle counts the ones to its right, so neither needs to move
      // column first.
      {
        presentation: 'circle',
        circleSide: 'left',
        class:
          '-translate-x-[calc(var(--navigator-tab-index)_*_var(--navigator-tab-col)_+_var(--navigator-tab-edge))]'
      },
      {
        presentation: 'circle',
        circleSide: 'right',
        class:
          'translate-x-[calc((var(--navigator-tab-count)_-_1_-_var(--navigator-tab-index))_*_var(--navigator-tab-col)_+_var(--navigator-tab-edge))]'
      }
    ],
    defaultVariants: { active: false, presentation: 'expanded' }
  }
)

// Bottom-anchored in the rail; `mt-auto` (set on the rail's flex column)
// pins it below the primary items.
export const navigatorEndVariants = cva([
  'mt-auto grid gap-1 border-t border-subtle pt-2'
])

// The nested group spans the full rail width so each secondary item's pill
// lines up edge-to-edge with the primary rows above; the label is indented
// past a hairline tree-line rather than the whole group being inset.
// `1.5rem` drops the tree-line under the centre of the parent's `size-6`
// icon (item `px-3` = 0.75rem + half of 1.5rem). `pl-12` pads each item's
// left so its label lands in the same column as the primary rows' labels
// (`px-3` + icon `1.5rem` + `gap-3` = 3rem) while the pill stays full width,
// and the current sub-page grows a short accent bar sitting on the tree-line.
// Hidden in the compact rail, which has no room for labels.
export const navigatorSecondaryVariants = cva([
  'relative grid gap-0 py-1',
  'before:absolute before:top-1 before:bottom-1 before:left-[1.5rem] before:w-px before:bg-subtle before:content-[""]',
  'group-data-[form=compact]/rail:hidden',
  '[&_[data-slot=navigator-item]]:py-1.5',
  '[&_[data-slot=navigator-item]]:pl-12',
  '[&_[data-slot=navigator-item]]:font-normal',
  '[&_[data-slot=navigator-item][aria-current=page]]:before:absolute',
  '[&_[data-slot=navigator-item][aria-current=page]]:before:top-1/2',
  '[&_[data-slot=navigator-item][aria-current=page]]:before:left-[1.5rem]',
  '[&_[data-slot=navigator-item][aria-current=page]]:before:h-5',
  '[&_[data-slot=navigator-item][aria-current=page]]:before:w-0.5',
  '[&_[data-slot=navigator-item][aria-current=page]]:before:-translate-y-1/2',
  '[&_[data-slot=navigator-item][aria-current=page]]:before:rounded-full',
  '[&_[data-slot=navigator-item][aria-current=page]]:before:bg-[var(--color-accent-9)]',
  '[&_[data-slot=navigator-item][aria-current=page]]:before:content-[""]'
])

// The group heading: a quiet sentence-case label above its own list in the
// rail. On the mobile strip — one horizontal row with nowhere to put a
// heading — the group flattens and the heading is screen-reader-only, so the
// strip case never reaches this variant.
//
// The compact rail has no icon-column indent to align `pl-12` against, so it
// swaps to the item column's own centred, truncating treatment — otherwise a
// title wider than the compact column wraps one character per line.
export const navigatorGroupTitleVariants = cva([
  'truncate pt-3 pr-3 pb-1 pl-12 text-xs font-semibold text-subtler',
  'group-data-[form=compact]/rail:px-2 group-data-[form=compact]/rail:text-center'
])

// A group's own list. `grid` so it stacks in the rail's flex column with the
// same rhythm as a loose run of items.
export const navigatorGroupListVariants = cva(['grid gap-1'])

// A run of rail rows. `grid` inside the rail's flex column keeps the same
// 0.25rem rhythm the loose rows had before they were wrapped.
export const navigatorRailListVariants = cva(['grid gap-1'])

// Logo/wordmark pinned to the top of the rail. Desktop-only by virtue of
// living in the rail (which is `hidden md:flex`); the compact rail centres it.
export const navigatorBrandVariants = cva([
  'flex items-center gap-2 px-3 py-2',
  'group-data-[form=compact]/rail:justify-center group-data-[form=compact]/rail:px-2'
])

// Trailing area of a rail row — badge and/or the section chevron.
export const navigatorItemTrailingVariants = cva(['flex items-center gap-2'])

// Section chevron. `CaretRight` points right at rest; rotating a quarter turn
// points it down while the section is expanded (branch-active). Inherits the
// row's colour so it goes accent on the active pill.
export const navigatorChevronVariants = cva(
  [
    'size-4 shrink-0',
    'group-data-[form=compact]/rail:hidden',
    'motion-safe:transition-transform motion-reduce:transition-none'
  ],
  {
    variants: {
      expanded: {
        true: 'rotate-90',
        false: 'rotate-0'
      }
    },
    defaultVariants: { expanded: false }
  }
)

// The mobile face of the same declaration: a horizontally scrolling row that
// lives inside the top pane's `Pane.Header`. The root (a ScrollArea, rendered as
// the `<nav>`) bleeds back out of the header's own padding so its horizontal
// scrollbar sits at the header's true edges, not inset from them.
//
// Both cancellations read the header's own custom properties rather than
// restating its numbers: `--content-inset` is a variable precisely so it can
// change, and a hardcoded `-mx-4` would silently stop meeting the pane's edges
// the moment it did. Same for the bottom — the strip *is* the header's bottom
// edge, so it cancels `--pane-header-pad-b` to sit flush with no gap beneath.
export const navigatorSecondaryStripVariants = cva([
  'flex md:hidden',
  '-mx-(--content-inset) mb-[calc(var(--pane-header-pad-b)*-1)]'
])

// The scrolling box, and nothing else. The row itself belongs to the content
// wrapper below: `ScrollArea.Content` sits between this element and the items,
// so flex classes here would lay out a single block child, and the inline-flex
// items inside that child would wrap as inline content — which is exactly the
// bug this split fixes.
export const navigatorSecondaryStripViewportVariants = cva([
  'relative overflow-x-auto overscroll-x-contain'
])

// The row. `flex` overrides `tabsListVariants`' `inline-flex`, and the
// horizontal inset lives here rather than on the viewport so it scrolls with
// the items and the last one can still reach the pane's edge. Base UI sets
// `min-width: fit-content` inline on this element, which is what lets the row
// exceed the viewport instead of being clamped to it — do not pass
// `fitWidth={false}`, which is the opposite of what a horizontal scroller wants.
// `min-w-max` is a class-level backstop for that same inline style:
// `scrollAreaContentVariants` (`ScrollArea/variants.ts`) sets `min-w-0` on
// this same element via `ScrollAreaContent`, so if Base UI ever drops the
// inline `min-width: fit-content`, the class alone would clamp the row to
// the viewport and the items would compress instead of scrolling.
// `min-w-max` wins the tailwind-merge against `min-w-0` and is a no-op while
// the inline style still wins.
export const navigatorSecondaryStripContentVariants = cva([
  cn(
    tabsListVariants({ emphasis: 'subtle' }),
    'flex min-w-max',
    'px-[calc(var(--content-inset)+var(--spacing))]'
  )
])

// One rail row. The compact rail restyles the row into a centred icon
// stack through the rail's `data-form`, so the item itself never needs to
// know which form it is in. Tab-bar items are outside `group/rail` and
// get their own variant.
export const navigatorItemVariants = cva(
  [
    // `relative` keeps the row a positioning context for the current
    // sub-page's accent bar (applied via navigatorSecondaryVariants).
    'is-interactive relative z-[1] w-full min-w-0 rounded-xl text-left text-sm font-semibold',
    'grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5',
    'group-data-[form=compact]/rail:grid-cols-1',
    'group-data-[form=compact]/rail:justify-items-center',
    'group-data-[form=compact]/rail:gap-1',
    'group-data-[form=compact]/rail:px-2',
    'group-data-[form=compact]/rail:text-center',
    'group-data-[form=compact]/rail:text-xs'
  ],
  {
    variants: {
      // Three-way currency splits the raised treatment off from the section
      // header, matching Fin: only the page you are on is a raised pill.
      // - current: exact destination — the raised pill lives on the sliding
      //   indicator (see navigatorIndicatorVariants), not this class; a
      //   primary also lights its leading icon accent, and a nested sub-page
      //   additionally gets an accent bar on the secondary tree-line (see
      //   navigatorSecondaryVariants).
      // - section: a branch-active ancestor — flat, dark and bold, no surface.
      // - idle: neither — muted text with a subtle hover.
      state: {
        current: [
          'text-strong',
          '[&_[data-slot=navigator-item-icon]]:text-accent-11'
        ],
        section: 'text-strong hover:bg-subtle',
        idle: 'text-subtle hover:bg-subtle'
      }
    },
    defaultVariants: { state: 'idle' }
  }
)

// The sliding active-destination pill, shared by all three surfaces. Geometry
// arrives as `--active-tab-*` custom properties from `useSlidingIndicator`.
//
// `tab` deliberately inflates the measured box by 0.25rem per side: the mobile
// bar's tabs are equal grid columns, so a pill drawn at the tab's own width
// crowds the label. The track's `px-2` is 0.25rem wider than the overhang, so
// an edge tab's pill keeps a small gap from the pill surface's rounded corner
// rather than touching it.
//
// `data-[ready=false]` covers the first paint, before any measurement exists:
// no transition, so the pill never slides in from (0,0).
export const navigatorIndicatorVariants = cva(
  [
    'pointer-events-none absolute z-0 rounded-full',
    'motion-safe:data-[ready=true]:duration-slow motion-safe:data-[ready=true]:ease-enter',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      surface: {
        // The tab bar's tabs are equal-width grid columns, so this indicator
        // only ever moves, never resizes — it is boxed once at the track's
        // origin and slides on `translate`, the one surface here that can
        // stay off the layout-property exception below.
        tab: [
          'intent-accent bg-[var(--intent-bg-subtle)]',
          'left-0 top-0',
          'h-[var(--active-tab-height)]',
          'w-[calc(var(--active-tab-width)+0.5rem)]',
          'translate-x-[calc(var(--active-tab-left)-0.25rem)]',
          'translate-y-[var(--active-tab-top)]',
          'motion-safe:data-[ready=true]:transition-[translate]'
        ].join(' '),
        // The pill itself — `tabsIndicatorSurfaceClass` — is imported from
        // Tabs, so the strip can no longer drift from the subtle emphasis it
        // is meant to echo; the positioning and `--active-tab-*` mapping
        // below stay Navigator's own, since the strip measures and maps its
        // own track, not one `Tabs.Indicator` could resolve against.
        //
        // Strip and rail items are variable-width, so their indicator has to
        // resize as well as move — `scaleX` alone would distort `rounded-full`
        // corners and the rail's `emphasis-raised` shadow mid-animation, and
        // fixing that needs a counter-scaled inner element, which is separate
        // work. Until then these two keep the `left/top/width/height`
        // transition — a known, recorded exception to the "never on a layout
        // property" rule elsewhere in this file.
        strip: [
          tabsIndicatorSurfaceClass,
          'top-[var(--active-tab-top)] h-[var(--active-tab-height)]',
          'left-[var(--active-tab-left)] w-[var(--active-tab-width)]',
          'motion-safe:data-[ready=true]:transition-[left,top,width,height]'
        ].join(' '),
        rail: [
          'emphasis-raised rounded-xl',
          'top-[var(--active-tab-top)] h-[var(--active-tab-height)]',
          'left-[var(--active-tab-left)] w-[var(--active-tab-width)]',
          'motion-safe:data-[ready=true]:transition-[left,top,width,height]'
        ].join(' ')
      },
      visible: {
        true: 'opacity-100',
        false: 'opacity-0'
      }
    },
    defaultVariants: { surface: 'tab', visible: false }
  }
)

export type NavigatorIndicatorSurface = 'tab' | 'strip' | 'rail'

// The overflow pane. `md:hidden` because the overflow exists only in the band
// that has a tab bar — the rail simply scrolls, so there is nothing to fold.
// Without it a closed overflow would take a real column from `lg` up.
//
// Nav form is an `md:` concern; pane arrangement is an `lg:` one. This is the
// former, deliberately.
export const navigatorOverflowVariants = cva(['md:hidden'])

// A panel item's below-`md` pane — same shape as the overflow: full-screen,
// only in the band that has a tab bar to be a tab of.
export const navigatorPanelPaneVariants = cva(['md:hidden'])
