import { cva } from 'class-variance-authority'

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

// Not configurable — a seven-tab bar is not a shape Navigator can be talked into.
export const MAX_TABS = 5

// No padding here: Base UI pins the scrollbar to the root's inline end, so
// padding lives on the viewport.
export const navigatorPrimaryVerticalVariants = cva([
  'group/primary hidden min-h-0 w-(--navigator-primary-nested) md:col-start-1 md:row-start-1 md:block'
])

export const navigatorPrimaryViewportVariants = cva(['relative min-h-0 p-3'])

// `min-h-full` so the pinned region's `mt-auto` still lands at the bottom.
export const navigatorPrimaryContentVariants = cva([
  'flex min-h-full flex-col gap-1'
])

// The box never changes size, so collapse animates on scale/translate/opacity
// alone. `--navigator-primary-col` is one of five columns of the root's width
// less the 2rem inset and the pinned circle's width; `--navigator-primary-edge`
// is the fixed part of a collapsed circle's travel. `Navigator.Primary` sets
// the count and the pinned width inline.
export const navigatorPrimaryHorizontalVariants = cva(
  [
    'max-md:absolute max-md:inset-x-2 max-md:bottom-[max(1rem,env(safe-area-inset-bottom))] max-md:z-sticky md:hidden',
    'grid',
    // The track and circles restore input; the gutters beside them stay inert.
    'pointer-events-none',
    '[--navigator-primary-count:5]',
    '[--navigator-primary-pinned:0rem]',
    '[--navigator-primary-col:calc((100cqw-2rem-var(--navigator-primary-pinned))/5)]',
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
      },
      pinned: {
        true: 'grid-cols-[1fr_auto] gap-2',
        false: ''
      }
    },
    defaultVariants: { collapsed: false, hidden: false, pinned: false }
  }
)

export const navigatorPrimaryCircleVariants = cva([
  'pointer-events-auto grid self-stretch'
])

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
        hidden: 'scale-0 px-0 py-1.5 opacity-0 pointer-events-none',
        pinned:
          'pointer-events-auto aspect-square h-full rounded-full emphasis-floating place-content-center justify-self-end'
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

// Pinned items sit on the vertical navigation's bottom edge; `mt-auto` pushes against the vertical navigation's flex column.
export const navigatorPrimaryPinnedVariants = cva([
  'mt-auto grid gap-1 border-t border-subtle pt-2'
])

export const navigatorGroupTitleVariants = cva([
  'truncate pt-3 pr-3 pb-1 pl-12 text-xs font-semibold text-subtler'
])

export const navigatorGroupListVariants = cva(['grid gap-1'])

export const navigatorPrimaryListVariants = cva(['grid gap-1'])

export const navigatorBrandVariants = cva(['flex items-center gap-2 px-3 py-2'])

export const navigatorItemTrailingVariants = cva(['flex items-center gap-2'])

export const navigatorItemVariants = cva(
  [
    'is-interactive relative z-[1] w-full min-w-0 rounded-xl text-left text-sm font-semibold',
    'grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5'
  ],
  {
    variants: {
      active: {
        true: 'text-strong [&_[data-slot=navigator-item-icon]]:text-accent-11',
        false: 'text-subtle hover:bg-subtle'
      }
    },
    defaultVariants: { active: false }
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
        // Variable-width items: this one still transitions layout properties.
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

export type NavigatorIndicatorSurface = 'horizontal' | 'vertical'

// Rendered after the consumer's panes so it stays the deepest `current` when
// stacked; `order` moves it to the leading column once panes are columns.
export const navigatorOverflowVariants = cva(['lg:-order-1'], {
  variants: {
    // One list pane at a time: closed, it gives its column back.
    open: { true: '', false: 'lg:hidden' }
  },
  defaultVariants: { open: false }
})

// Same floating surface and motion as Popover.
export const navigatorMenuPopupVariants = cva([
  'grid min-w-48 max-h-(--available-height) origin-(--transform-origin) gap-0.5 p-1',
  'rounded-xl emphasis-floating motion-scale outline-none'
])

export const navigatorMenuItemVariants = cva([
  'flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-normal outline-none select-none',
  'data-[highlighted]:bg-subtle'
])
