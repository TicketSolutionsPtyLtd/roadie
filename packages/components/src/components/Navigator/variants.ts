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
  'max-lg:relative max-lg:overflow-hidden',
  // Set for two frames while More opens or closes.
  'data-instant:[&_[data-slot=pane]]:transition-none'
])

// Not configurable — a seven-tab bar is not a shape Navigator can be talked into.
export const MAX_TABS = 5

// Flex, not grid rows: an absent brand or pinned region leaves no gutter.
// Width is the one layout transition: the panes beside it follow the track.
export const navigatorPrimaryVerticalVariants = cva([
  'group/primary hidden min-h-0 md:col-start-1 md:row-start-1 md:flex',
  'flex-col gap-3 py-3 w-20 navigator-expanded:w-60',
  '[--navigator-primary-motion:var(--duration-slow)_var(--ease-standard)]',
  'motion-safe:[transition:width_var(--navigator-primary-motion)]'
])

// The toggle is out of flow: collapsed, `pb-12` makes its row under the brand;
// expanded, `pe-15` keeps the brand clear of it.
export const navigatorPrimaryBrandVariants = cva(
  [
    'relative grid min-h-10 px-3',
    'motion-safe:[transition:padding_var(--navigator-primary-motion)]'
  ],
  {
    variants: {
      toggle: {
        true: 'pb-12 navigator-expanded:pb-0 navigator-expanded:pe-15',
        false: ''
      }
    },
    defaultVariants: { toggle: false }
  }
)

// Percentages of the brand region, which resizes with the navigation, so the
// toggle travels continuously from under the brand to its trailing edge.
export const navigatorExpandToggleAnchorVariants = cva([
  'absolute left-1/2 top-full -translate-x-1/2 -translate-y-full',
  'navigator-expanded:left-[calc(100%-1rem)] navigator-expanded:top-1/2 navigator-expanded:-translate-x-full navigator-expanded:-translate-y-1/2',
  'motion-safe:[transition:left_var(--navigator-primary-motion),top_var(--navigator-primary-motion),translate_var(--navigator-primary-motion)]'
])

export const navigatorExpandToggleVariants = cva([
  'is-interactive grid size-10 place-items-center rounded-full text-subtle hover:bg-subtle'
])

// Takes the height left between brand and pinned, so the cluster centres there.
export const navigatorPrimaryClusterVariants = cva(['min-h-0 flex-1'])

export const navigatorPrimaryClusterViewportVariants = cva(['size-full'])

// `min-h-full` + `content-center` centres a short cluster and top-aligns a tall
// one; py-2 keeps capsule shadows off the clip edge.
export const navigatorPrimaryClusterContentVariants = cva([
  'grid min-h-full content-center px-3 py-2'
])

// The pill's track: it moves with the centred capsules, so the pill does too.
// Capsules stretch in both states, so they widen with the navigation.
export const navigatorPrimaryClusterTrackVariants = cva(['relative grid gap-3'])

export const navigatorPrimaryPinnedVariants = cva(['relative grid gap-3 px-3'])

// `rounded-4xl` overflows a collapsed capsule's width, so the browser scales it to a pill.
export const navigatorCapsuleVariants = cva([
  'relative grid gap-1 p-1 rounded-4xl emphasis-raised is-translucent'
])

// The box never changes size, so collapse animates on scale/translate/opacity
// alone. `--navigator-primary-col` is one of the bar's slots across the lane
// (its `cqw` resolves where it is used) less the track's inset;
// `--navigator-primary-edge` is the fixed part of a collapsed circle's travel.
// `Navigator.Primary` sets the count and the slots inline.
export const navigatorPrimaryHorizontalVariants = cva(
  [
    'max-md:absolute max-md:inset-x-2 max-md:bottom-[max(1rem,env(safe-area-inset-bottom))] max-md:z-sticky md:hidden',
    'grid',
    // The track and circles restore input; the gutters beside them stay inert.
    'pointer-events-none',
    '[--navigator-primary-count:5]',
    '[--navigator-primary-slots:5]',
    '[--navigator-primary-col:calc((100cqw-1rem)/var(--navigator-primary-slots))]',
    '[--navigator-primary-edge:calc((var(--navigator-primary-slots)_-_var(--navigator-primary-count))_*_var(--navigator-primary-col)_/_2_+_(var(--navigator-primary-col)_-_3.5rem)_/_2)]',
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
        true: 'grid-cols-[minmax(0,1fr)_auto] gap-3',
        false: ''
      }
    },
    defaultVariants: { collapsed: false, hidden: false, pinned: false }
  }
)

// A size container, so the tabs share what the pinned circle and gap leave.
export const navigatorPrimaryLaneVariants = cva([
  '[container-type:inline-size]'
])

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
    'pointer-events-none absolute inset-0 rounded-full emphasis-floating is-translucent',
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
    'grid justify-items-center text-subtle',
    'motion-safe:transition-[scale,translate,opacity,background-color] motion-reduce:transition-none'
  ],
  {
    variants: {
      active: {
        true: 'intent-accent',
        false: ''
      },
      presentation: {
        expanded: 'pointer-events-auto px-1 py-3.5 scale-100 opacity-100',
        circle:
          'pointer-events-auto size-14 translate-y-1 scale-100 place-content-center justify-self-center self-end emphasis-floating is-translucent opacity-100',
        // `py-3.5` holds the row's height while invisible.
        hidden: 'scale-0 px-0 py-3.5 opacity-0 pointer-events-none',
        // `p-4.5` = the track's `py-1` + a tab's `py-3.5`: square at the bar's height, sized intrinsically.
        pinned:
          'pointer-events-auto p-4.5 rounded-full emphasis-floating is-translucent place-content-center justify-self-end origin-bottom-right scale-100'
      },
      circleSide: {
        left: '',
        right: ''
      },
      collapsed: {
        true: '',
        false: ''
      }
    },
    compoundVariants: [
      // Down to the edge circle's 3.5rem from its 4.125rem, and in to its 1rem inset.
      {
        presentation: 'pinned',
        collapsed: true,
        class: '-translate-x-2 scale-[calc(3.5/4.125)]'
      },
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
    defaultVariants: {
      active: false,
      presentation: 'expanded',
      collapsed: false
    }
  }
)

// A tile-sized box, so the badge dot sits as on the vertical tile. Scaled
// against the collapsed pinned circle, so its icon matches the edge circle's.
export const navigatorTabIconFrameVariants = cva(
  [
    'relative -m-3 grid p-3',
    'motion-safe:transition-[scale] motion-reduce:transition-none'
  ],
  {
    variants: {
      counterScaled: {
        true: 'scale-[calc(4.125/3.5)]',
        false: 'scale-100'
      }
    },
    defaultVariants: { counterScaled: false }
  }
)

// Rows `0fr` → `1fr` grows the title open; `-mb-3` cancels the cluster gap while it's shut.
export const navigatorGroupTitleVariants = cva([
  'grid grid-rows-[0fr] self-start -mb-3 px-3 text-xs font-semibold text-subtler opacity-0',
  'navigator-expanded:grid-rows-[1fr] navigator-expanded:mb-1 navigator-expanded:opacity-100',
  'motion-safe:[transition:grid-template-rows_var(--navigator-primary-motion),margin_var(--navigator-primary-motion),opacity_var(--navigator-primary-motion)]'
])

export const navigatorGroupTitleTextVariants = cva(['min-h-0 overflow-hidden'])

// `ps-1` + a tile-wide first column keep the mark on the icon column in both
// states. The rest fades in once the toggle has crossed its row; `starting:`
// covers a wordmark that was `display: none`.
export const navigatorBrandVariants = cva([
  'is-interactive rounded-xl',
  'grid grid-flow-col grid-cols-[minmax(3rem,auto)] auto-cols-[minmax(0,1fr)] items-center justify-start justify-items-start gap-2 py-1 ps-1',
  '[&>:first-child]:justify-self-center',
  '[&>:not(:first-child)]:opacity-0 navigator-expanded:[&>:not(:first-child)]:opacity-100',
  'navigator-expanded:[&>:not(:first-child)]:starting:opacity-0',
  'motion-safe:[&>:not(:first-child)]:[transition:opacity_var(--duration-fast)_var(--ease-exit)]',
  'motion-safe:navigator-expanded:[&>:not(:first-child)]:[transition:opacity_var(--duration-moderate)_var(--ease-enter)_var(--duration-moderate)]'
])

export const navigatorItemTrailingVariants = cva([
  'col-start-3 ms-3 flex items-center gap-2'
])

// One geometry in both states; collapsed, the label's column is zero wide.
// Margins, not `gap`, space the label, so that column can't squeeze the icon.
// `text-subtle` always: under `intent-accent` it becomes the accent's tone.
export const navigatorItemVariants = cva(
  [
    'is-interactive relative z-[1] grid h-12 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center rounded-full px-3 text-start text-subtle',
    'navigator-expanded:text-sm navigator-expanded:font-semibold'
  ],
  {
    variants: {
      active: { true: 'intent-accent', false: 'hover:bg-subtle' }
    },
    defaultVariants: { active: false }
  }
)

// Always laid out, so it fades both ways; the delay hides the ellipsis while its column opens.
export const navigatorItemLabelClass =
  'col-start-2 ms-3 truncate opacity-0 navigator-expanded:opacity-100 motion-safe:[transition:opacity_var(--duration-fast)_var(--ease-exit)] motion-safe:navigator-expanded:[transition:opacity_var(--duration-moderate)_var(--ease-enter)_var(--duration-fast)]'

// Opacity always fades; translate slides only once settled, so a pill that
// appears (or moves between vertical tracks) cross-fades in place.
export const navigatorIndicatorVariants = cva(
  [
    'pointer-events-none absolute z-0 rounded-full',
    'motion-safe:transition-opacity motion-safe:duration-slow motion-safe:ease-enter',
    // Property only: a `transition-*` utility would reset the duration.
    'motion-safe:data-[settled=true]:[transition-property:opacity,translate]',
    'motion-reduce:transition-none'
  ],
  {
    variants: {
      surface: {
        // Inflated 0.25rem per side so the pill doesn't crowd the icon.
        horizontal: [
          'intent-accent bg-[var(--intent-bg-subtle)]',
          'left-0 top-0',
          'h-[var(--active-tab-height)]',
          'w-[calc(var(--active-tab-width)+0.5rem)]',
          'translate-x-[calc(var(--active-tab-left)-0.25rem)]',
          'translate-y-[var(--active-tab-top)]'
        ].join(' '),
        // Insets, not a width, so the pill widens with the navigation in CSS.
        vertical: [
          'intent-accent bg-[var(--intent-bg-subtle)]',
          'left-[var(--active-tab-left)] right-[var(--active-tab-right)] top-0 h-[var(--active-tab-height)]',
          'translate-y-[var(--active-tab-top)]'
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
  'rounded-xl emphasis-floating is-translucent motion-scale outline-none'
])

export const navigatorMenuItemVariants = cva([
  'flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-normal outline-none select-none',
  'data-[highlighted]:bg-subtle'
])

// Flex: the field takes what Cancel leaves as it opens.
export const navigatorSearchVariants = cva(['group/search flex items-center'])

export const navigatorSearchBoxVariants = cva(['relative grid min-w-0 flex-1'])

// The capsules' surface, keeping the field's hover, focus and ring. The
// browser's own clear button would be a second ✕ beside Cancel.
export const navigatorSearchFieldVariants = cva([
  'rounded-full bg-raised emphasis-raised is-translucent ps-11 pe-4',
  'placeholder:text-subtler [&::-webkit-search-cancel-button]:appearance-none'
])

export const navigatorSearchIconVariants = cva([
  'pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-subtle'
])

// Opens while focus is anywhere in the search, so tabbing from the field
// reaches it. Cancel is pinned to the end, so the slot's width reveals it
// over the field's end rather than overflowing the pane.
export const navigatorSearchCancelSlotVariants = cva([
  'relative h-12 w-0 ms-0 invisible scale-75 opacity-0',
  'group-focus-within/search:visible group-focus-within/search:ms-2 group-focus-within/search:w-12 group-focus-within/search:scale-100 group-focus-within/search:opacity-100',
  'motion-safe:transition-[width,margin,scale,opacity,visibility] motion-safe:transition-discrete motion-safe:duration-moderate motion-safe:ease-standard motion-reduce:transition-none'
])

export const navigatorSearchCancelVariants = cva([
  'absolute end-0 top-0 emphasis-raised is-translucent'
])
