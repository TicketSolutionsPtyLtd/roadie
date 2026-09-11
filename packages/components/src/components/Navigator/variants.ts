import { cva } from 'class-variance-authority'

import { cn } from '@oztix/roadie-core/utils'

import { tabsIndicatorSurfaceClass, tabsListVariants } from '../Tabs/variants'

// `100dvh` so collapsing mobile browser chrome doesn't crop the horizontal
// navigation. `container-type` lets it size tabs off the root's own width, so
// an embedded Navigator measures its box, not the viewport.
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
  'lg:group-has-[[data-slot=navigator-primary][data-orientation=vertical]]/navigator:pl-0',
  'grid-cols-1 lg:flex lg:flex-row',
  // The stack geometry itself — position, translate, opacity, transition —
  // now lives on `paneVariants`' `stackPosition` variant, keyed off the
  // pane's own `data-stack-position`. A direct-child selector here could
  // never reach a pane arriving through a wrapper the orchestrator did not
  // render (a Next.js parallel-route slot, most of all), which is exactly
  // the registration seam this stylesheet now defers to.
  //
  // Clips a `behind` pane's translate, which can outrun the navigation beside it.
  'max-lg:relative max-lg:overflow-hidden'
])

// Primary items plus one slot for End. Not configurable — a seven-tab bar
// is not a shape Navigator can be talked into.
export const MAX_TABS = 5

// No padding here: Base UI pins the scrollbar to the root's inline end, so
// padding lives on the viewport.
export const navigatorPrimaryVerticalVariants = cva(
  ['group/primary hidden min-h-0 md:col-start-1 md:row-start-1 md:block'],
  {
    variants: {
      form: {
        compact: 'w-(--navigator-primary-compact)',
        nested: 'w-(--navigator-primary-nested)'
      }
    },
    defaultVariants: { form: 'compact' }
  }
)

export const navigatorPrimaryViewportVariants = cva(['relative min-h-0 p-3'])

// `min-h-full` so `Navigator.End`'s `mt-auto` still lands at the bottom.
export const navigatorPrimaryContentVariants = cva([
  'flex min-h-full flex-col gap-1'
])

// The box never changes size, so collapse animates on scale/translate/opacity
// alone. `--navigator-primary-col` is one of five columns of the root's width
// less the 2rem inset; `--navigator-primary-edge` is the fixed part of a
// collapsed circle's travel. `Navigator.Primary` sets the count inline.
export const navigatorPrimaryHorizontalVariants = cva(
  [
    'max-md:absolute max-md:inset-x-2 max-md:bottom-[max(1rem,env(safe-area-inset-bottom))] max-md:z-sticky md:hidden',
    'grid',
    // The track and circles restore input; the gutters beside them stay inert.
    'pointer-events-none',
    '[--navigator-primary-count:5]',
    '[--navigator-primary-col:calc((100cqw-2rem)/5)]',
    '[--navigator-primary-edge:calc((5_-_var(--navigator-primary-count))_*_var(--navigator-primary-col)_/_2_+_(var(--navigator-primary-col)_-_3.5rem)_/_2)]',
    // `translate`, not `transform`: the hide state is `max-md:translate-y-[…]`,
    // which Tailwind v4 emits as the independent `translate` property, so
    // naming `transform` transitioned nothing and the bar snapped away.
    'motion-safe:transition-[translate,opacity,visibility] motion-safe:transition-discrete motion-reduce:transition-none'
  ],
  {
    variants: {
      hidden: {
        true: 'max-md:invisible max-md:translate-y-[calc(100%+2rem)] max-md:opacity-0',
        false: ''
      },
      collapsed: {
        true: '',
        false: ''
      }
    },
    defaultVariants: { collapsed: false, hidden: false }
  }
)

// Hugs the tabs, so the indicator and pill resolve against it. Collapsed it
// can span the full width, so input stays off and each circle restores its own.
export const navigatorPrimaryTrackVariants = cva(
  [
    'relative mx-auto grid w-fit grid-flow-col auto-cols-[var(--navigator-primary-col)] items-center gap-0 px-2 py-1'
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

export const navigatorPrimaryPillVariants = cva(
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

// Collapsed, the active and final tabs become circles that translate to the
// edges; the rest scale away but stay in the accessibility tree.
export const navigatorTabVariants = cva(
  [
    'is-interactive relative z-[1] min-w-0 overflow-hidden rounded-full',
    // Every presentation carries the same border so the row never changes height.
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
        expanded: 'pointer-events-auto px-1 py-1.5 scale-100 opacity-100',
        circle:
          'pointer-events-auto size-14 translate-y-1 scale-100 place-content-center justify-self-center self-end bg-raised opacity-100 shadow-xl',
        // `py-1.5` holds the row's height while invisible.
        hidden: 'scale-0 px-0 py-1.5 opacity-0 pointer-events-none'
      },
      circleSide: {
        left: '',
        right: ''
      }
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
      {
        presentation: 'circle',
        circleSide: 'left',
        class:
          '-translate-x-[calc(var(--navigator-primary-index)_*_var(--navigator-primary-col)_+_var(--navigator-primary-edge))]'
      },
      {
        presentation: 'circle',
        circleSide: 'right',
        class:
          'translate-x-[calc((var(--navigator-primary-count)_-_1_-_var(--navigator-primary-index))_*_var(--navigator-primary-col)_+_var(--navigator-primary-edge))]'
      }
    ],
    defaultVariants: { active: false, presentation: 'expanded' }
  }
)

export const navigatorEndVariants = cva([
  'mt-auto grid gap-1 border-t border-subtle pt-2'
])

// `1.5rem` puts the tree-line under the parent's icon centre; `pl-12` aligns
// sub-page labels with the primary labels.
export const navigatorSecondaryVariants = cva([
  'relative grid gap-0 py-1',
  'before:absolute before:top-1 before:bottom-1 before:left-[1.5rem] before:w-px before:bg-subtle before:content-[""]',
  'group-data-[form=compact]/primary:hidden',
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

// Compact has no icon column for `pl-12`, so the title centres and truncates.
export const navigatorGroupTitleVariants = cva([
  'truncate pt-3 pr-3 pb-1 pl-12 text-xs font-semibold text-subtler',
  'group-data-[form=compact]/primary:px-2 group-data-[form=compact]/primary:text-center'
])

export const navigatorGroupListVariants = cva(['grid gap-1'])

export const navigatorPrimaryListVariants = cva(['grid gap-1'])

export const navigatorBrandVariants = cva([
  'flex items-center gap-2 px-3 py-2',
  'group-data-[form=compact]/primary:justify-center group-data-[form=compact]/primary:px-2'
])

export const navigatorItemTrailingVariants = cva(['flex items-center gap-2'])

// Section chevron. `CaretRight` points right at rest; rotating a quarter turn
// points it down while the section is expanded (branch-active). Inherits the
// row's colour so it goes accent on the active pill.
export const navigatorChevronVariants = cva(
  [
    'size-4 shrink-0',
    'group-data-[form=compact]/primary:hidden',
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

export const navigatorItemVariants = cva(
  [
    // `relative` keeps the row a positioning context for the current
    // sub-page's accent bar (applied via navigatorSecondaryVariants).
    'is-interactive relative z-[1] w-full min-w-0 rounded-xl text-left text-sm font-semibold',
    'grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5',
    'group-data-[form=compact]/primary:grid-cols-1',
    'group-data-[form=compact]/primary:justify-items-center',
    'group-data-[form=compact]/primary:gap-1',
    'group-data-[form=compact]/primary:px-2',
    'group-data-[form=compact]/primary:text-center',
    'group-data-[form=compact]/primary:text-xs'
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

// `data-[ready=false]` skips the transition on first paint, so the pill never
// slides in from (0,0).
export const navigatorIndicatorVariants = cva(
  [
    'pointer-events-none absolute z-0 rounded-full',
    'motion-safe:data-[ready=true]:duration-slow motion-safe:data-[ready=true]:ease-enter',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      surface: {
        // Inflated 0.25rem per side so the pill doesn't crowd the label.
        horizontal: [
          'intent-accent bg-[var(--intent-bg-subtle)]',
          'left-0 top-0',
          'h-[var(--active-tab-height)]',
          'w-[calc(var(--active-tab-width)+0.5rem)]',
          'translate-x-[calc(var(--active-tab-left)-0.25rem)]',
          'translate-y-[var(--active-tab-top)]',
          'motion-safe:data-[ready=true]:transition-[translate]'
        ].join(' '),
        // Variable-width items: these two still transition layout properties.
        strip: [
          tabsIndicatorSurfaceClass,
          'top-[var(--active-tab-top)] h-[var(--active-tab-height)]',
          'left-[var(--active-tab-left)] w-[var(--active-tab-width)]',
          'motion-safe:data-[ready=true]:transition-[left,top,width,height]'
        ].join(' '),
        vertical: [
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
    defaultVariants: { surface: 'horizontal', visible: false }
  }
)

export type NavigatorIndicatorSurface = 'horizontal' | 'strip' | 'vertical'

// Only phones fold items; without `md:hidden` a closed overflow takes a column.
export const navigatorOverflowVariants = cva(['md:hidden'])

export const navigatorPanelPaneVariants = cva(['md:hidden'])
