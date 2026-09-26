import { cva } from 'class-variance-authority'

import { menuItemVariants, menuPopupClass } from '../Menu/variants'

// dvh so collapsing browser chrome doesn't crop the bar.
export const navigatorRootClass = [
  'group/navigator',
  // isolate: the pending indicator paints behind. clip, not hidden: see docs/solutions/pane-motion/a-transform-inside-a-scrollport.md.
  'relative isolate grid h-[100dvh] w-full overflow-clip bg-sunken',
  '[container-type:inline-size]',
  'grid-rows-1 md:grid-cols-[auto_1fr]',
  'pt-[env(safe-area-inset-top)]'
].join(' ')

// A container can't query itself, so column padding lives on the row inside.
export const navigatorContentClass = [
  'row-start-1 md:col-start-2',
  // Subtle panes' chrome mixes against this.
  '[--pane-surface:var(--intent-bg-sunken)]',
  'relative grid min-h-0 min-w-0',
  '[container:panes/inline-size]',
  // Clips parked panes; pointer events belong to the row.
  'overflow-clip pointer-events-none',
  // Set for two frames while More opens or closes.
  'data-instant:[&_[data-slot=pane]]:transition-none'
].join(' ')

// A stacked pane is absolute, so it insets itself by this gutter: flush on phones.
export const navigatorPanesClass = [
  'pointer-events-auto relative flex h-full min-h-0 min-w-0',
  '[--pane-stack-inset:0px] md:[--pane-stack-inset:--spacing(3)]'
].join(' ')

// The box is the grid track and never animates; the frame inside does.
export const navigatorPrimaryVerticalClass = [
  'group/primary hidden min-h-0 md:col-start-1 md:row-start-1 md:flex',
  '[--navigator-primary-collapsed:5rem] [--navigator-primary-expanded:15rem]',
  'w-(--navigator-primary-collapsed) navigator-expanded:w-(--navigator-primary-expanded)',
  'data-[motion=expand]:w-(--navigator-primary-collapsed)',
  '[--navigator-primary-motion:var(--duration-slow)_var(--ease-standard)]'
].join(' ')

// Flex, not grid rows: an absent brand or pinned region leaves no gutter.
export const navigatorPrimaryFrameClass = [
  'flex min-h-0 shrink-0 flex-col gap-3 py-3',
  'w-(--navigator-primary-collapsed) navigator-expanded:w-(--navigator-primary-expanded)',
  'motion-safe:[transition:width_var(--navigator-primary-motion)]'
].join(' ')

// The toggle is out of flow: `pb-12` gives it a row collapsed, `pe-15` clears it expanded.
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

// Percentages of the brand region, so the toggle travels with it. `rtl:` mirrors translate.
export const navigatorExpandToggleAnchorClass = [
  'absolute start-1/2 top-full -translate-x-1/2 rtl:translate-x-1/2 -translate-y-full',
  'navigator-expanded:start-[calc(100%-1rem)] navigator-expanded:top-1/2 navigator-expanded:-translate-x-full rtl:navigator-expanded:translate-x-full navigator-expanded:-translate-y-1/2',
  'motion-safe:[transition:inset-inline-start_var(--navigator-primary-motion),top_var(--navigator-primary-motion),translate_var(--navigator-primary-motion)]'
].join(' ')

export const navigatorExpandToggleClass =
  'is-interactive grid size-10 place-items-center rounded-full text-subtle hover:bg-subtle'

export const navigatorPrimaryClusterClass = 'min-h-0 flex-1'

export const navigatorPrimaryClusterViewportClass = 'size-full'

// `py-2` keeps capsule shadows off the clip edge.
export const navigatorPrimaryClusterContentClass =
  'grid min-h-full content-center px-3 py-2'

export const navigatorPrimaryClusterTrackClass = 'relative grid gap-3'

export const navigatorPrimaryPinnedClass = 'relative grid gap-3 px-3'

// `rounded-4xl` scales to a pill when collapsed. Opaque: nothing scrolls beneath, so a blur costs GPU for nothing.
export const navigatorCapsuleClass =
  'group/capsule relative grid gap-1 p-1 rounded-4xl emphasis-raised'

// --navigator-primary-col is one bar slot; -edge is a collapsed circle's travel;
// -lead is how many slots the track sits in from the lane's start; -inset is the bar's own padding.
export const navigatorPrimaryHorizontalVariants = cva(
  [
    'max-md:absolute max-md:inset-x-2 max-md:bottom-[max(1rem,env(safe-area-inset-bottom))] max-md:z-sticky md:hidden',
    'grid',
    // The track and circles restore input; the gutters beside them stay inert.
    'pointer-events-none',
    '[--navigator-primary-col:calc((100cqw-1rem)/var(--navigator-primary-slots))]',
    '[--navigator-primary-edge:calc(var(--navigator-primary-lead)_*_var(--navigator-primary-col)_+_(var(--navigator-primary-col)_-_3.5rem)_/_2_+_var(--navigator-primary-inset))]',
    // translate, not transform: Tailwind v4 emits translate-* as the translate property.
    'motion-safe:transition-[translate,opacity,visibility] motion-safe:transition-discrete motion-reduce:transition-none'
  ],
  {
    variants: {
      hidden: {
        true: 'max-md:invisible max-md:translate-y-[calc(100%+2rem)] max-md:opacity-0',
        false: ''
      },
      // Pinned, the track starts at the lane's edge, and both ends sit at the collapsed circles' 1rem inset.
      pinned: {
        true: 'grid-cols-[minmax(0,1fr)_auto] gap-3 px-2 [--navigator-primary-lead:0] [--navigator-primary-inset:--spacing(2)]',
        false:
          '[--navigator-primary-lead:calc((var(--navigator-primary-slots)_-_var(--navigator-primary-count))_/_2)] [--navigator-primary-inset:0px]'
      }
    },
    defaultVariants: { hidden: false, pinned: false }
  }
)

export const navigatorPrimaryLaneClass = '[container-type:inline-size]'

export const navigatorPrimaryCircleClass =
  'pointer-events-auto grid self-stretch'

// Collapsed it can span the full width, so input stays off.
export const navigatorPrimaryTrackVariants = cva(
  [
    'relative grid w-fit grid-flow-col auto-cols-[var(--navigator-primary-col)] items-center gap-0 px-2 py-1'
  ],
  {
    variants: {
      collapsed: {
        true: '',
        false: 'pointer-events-auto'
      },
      pinned: {
        true: 'me-auto',
        false: 'mx-auto'
      }
    },
    defaultVariants: { collapsed: false, pinned: false }
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

// `translate` has no logical form, so `rtl:` mirrors every horizontal travel.
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
          'pointer-events-auto p-4.5 rounded-full emphasis-floating is-translucent place-content-center justify-self-end origin-bottom-right rtl:origin-bottom-left scale-100'
      },
      circleSide: {
        start: '',
        end: ''
      },
      collapsed: {
        true: '',
        false: ''
      }
    },
    compoundVariants: [
      // Down to the edge circle's 3.5rem from its 4.125rem.
      {
        presentation: 'pinned',
        collapsed: true,
        class: 'scale-[calc(3.5/4.125)]'
      },
      {
        presentation: 'circle',
        circleSide: 'start',
        class: [
          '-translate-x-[calc(var(--navigator-primary-index)_*_var(--navigator-primary-col)_+_var(--navigator-primary-edge))]',
          'rtl:translate-x-[calc(var(--navigator-primary-index)_*_var(--navigator-primary-col)_+_var(--navigator-primary-edge))]'
        ]
      },
      {
        presentation: 'circle',
        circleSide: 'end',
        class: [
          'translate-x-[calc((var(--navigator-primary-count)_-_1_-_var(--navigator-primary-index))_*_var(--navigator-primary-col)_+_var(--navigator-primary-edge))]',
          'rtl:-translate-x-[calc((var(--navigator-primary-count)_-_1_-_var(--navigator-primary-index))_*_var(--navigator-primary-col)_+_var(--navigator-primary-edge))]'
        ]
      }
    ],
    defaultVariants: {
      active: false,
      presentation: 'expanded',
      collapsed: false
    }
  }
)

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
export const navigatorGroupTitleClass = [
  'grid grid-rows-[0fr] self-start -mb-3 px-3 text-xs font-semibold text-subtler opacity-0',
  'navigator-expanded:grid-rows-[1fr] navigator-expanded:-mb-2 navigator-expanded:opacity-100',
  'motion-safe:[transition:grid-template-rows_var(--navigator-primary-motion),margin_var(--navigator-primary-motion),opacity_var(--navigator-primary-motion)]'
].join(' ')

export const navigatorGroupTitleTextClass = 'min-h-0 overflow-hidden'

export const navigatorBrandClass = [
  'is-interactive rounded-xl',
  'grid grid-flow-col grid-cols-[minmax(3rem,auto)] auto-cols-[minmax(0,1fr)] items-center justify-start justify-items-start gap-2 py-1 ps-1',
  '[&>:first-child]:justify-self-center',
  '[&>:not(:first-child)]:opacity-0 navigator-expanded:[&>:not(:first-child)]:opacity-100',
  'navigator-expanded:[&>:not(:first-child)]:starting:opacity-0',
  'motion-safe:[&>:not(:first-child)]:[transition:opacity_var(--duration-fast)_var(--ease-exit)]',
  'motion-safe:navigator-expanded:[&>:not(:first-child)]:[transition:opacity_var(--duration-moderate)_var(--ease-enter)_var(--duration-moderate)]',
  '[&>[data-slot=logo]]:mx-[calc((3rem-1em)/2)]',
  '[&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:grid-cols-[0fr] [&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:opacity-0',
  'navigator-expanded:[&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:grid-cols-[1fr] navigator-expanded:[&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:opacity-100',
  'motion-safe:[&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:[transition:grid-template-columns_var(--navigator-primary-motion),opacity_var(--duration-fast)_var(--ease-exit)]',
  'motion-safe:navigator-expanded:[&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:[transition:grid-template-columns_var(--navigator-primary-motion),opacity_var(--duration-moderate)_var(--ease-enter)_var(--duration-fast)]',
  // Keeps a wordmark-only Logo visible while collapsed.
  '[&>[data-slot=logo]:not(:has([data-slot=logo-mark]))]:mx-0',
  '[&_[data-slot=logo]:not(:has([data-slot=logo-mark]))_[data-slot=logo-wordmark]]:h-[min(1em,calc(3rem*42/128))] [&_[data-slot=logo]:not(:has([data-slot=logo-mark]))_[data-slot=logo-wordmark]]:opacity-100',
  'navigator-expanded:[&_[data-slot=logo]:not(:has([data-slot=logo-mark]))_[data-slot=logo-wordmark]]:h-[1em]',
  'motion-safe:[&_[data-slot=logo]:not(:has([data-slot=logo-mark]))_[data-slot=logo-wordmark]]:[transition:height_var(--navigator-primary-motion)]'
].join(' ')

export const navigatorItemTrailingClass =
  'col-start-3 ms-3 flex items-center gap-2'

// Margins, not `gap`, so the zero-width label column can't squeeze the icon.
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
  'col-start-2 row-start-1 ms-3 truncate opacity-0 navigator-expanded:opacity-100 motion-safe:[transition:opacity_var(--duration-fast)_var(--ease-exit)] motion-safe:navigator-expanded:[transition:opacity_var(--duration-moderate)_var(--ease-enter)_var(--duration-fast)]'

// Without an icon the label takes the icon column, unless a capsule sibling's icon needs it for alignment.
export const navigatorItemIconlessLabelClass = [
  'col-span-2 col-start-1 ms-0',
  'group-has-[[data-slot=navigator-item-icon]]/capsule:col-span-1 group-has-[[data-slot=navigator-item-icon]]/capsule:col-start-2 group-has-[[data-slot=navigator-item-icon]]/capsule:ms-3'
].join(' ')

export const navigatorItemInitialClass =
  'col-start-1 row-start-1 grid size-6 place-items-center text-base font-bold navigator-expanded:opacity-0 motion-safe:[transition:opacity_var(--duration-moderate)_var(--ease-enter)_var(--duration-fast)] motion-safe:navigator-expanded:[transition:opacity_var(--duration-fast)_var(--ease-exit)]'

export const navigatorTabInitialClass =
  'grid size-7 place-items-center text-lg font-bold'

// Translate only once settled, so a pill that appears cross-fades in place.
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

export const navigatorMenuPopupClass = menuPopupClass

export const navigatorMenuItemClass = menuItemVariants()
