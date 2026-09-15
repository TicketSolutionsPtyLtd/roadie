import { cva } from 'class-variance-authority'

// `100dvh` so collapsing mobile browser chrome doesn't crop the horizontal
// navigation. `container-type` lets it size tabs off the root's own width, so
// an embedded Navigator measures its box, not the viewport.
export const navigatorRootClass = [
  'group/navigator',
  'relative grid h-[100dvh] w-full overflow-hidden bg-sunken',
  '[container-type:inline-size]',
  'grid-rows-1 md:grid-cols-[auto_1fr]',
  'pt-[env(safe-area-inset-top)]'
].join(' ')

// The `panes` container the pane columns stylesheet queries. Column padding
// lives on the row inside, because a container can't query itself.
export const navigatorContentClass = [
  'row-start-1 md:col-start-2',
  // The frame behind the panes. A pane that paints no opaque surface of its
  // own (`subtle`, `subtler`) inherits this for its sticky chrome, so the bar
  // mixes against what is actually behind it rather than a guess baked into
  // the pane.
  '[--pane-surface:var(--intent-bg-sunken)]',
  'relative grid min-h-0 min-w-0',
  '[container:panes/inline-size]',
  // Clips a parked pane's translate, which can outrun the navigation beside
  // it. Beside a vertical primary the pane columns stylesheet widens it into
  // the primary's gutter, so pointer events belong to the row alone.
  'overflow-clip pointer-events-none',
  // Set for two frames while More opens or closes.
  'data-instant:[&_[data-slot=pane]]:transition-none'
].join(' ')

// The row the stylesheet keys on. A stacked pane is `absolute` and ignores
// padding, so it insets itself by the gutter published here: full-bleed on
// phones, inset from `md`.
export const navigatorPanesClass = [
  'pointer-events-auto relative flex h-full min-h-0 min-w-0',
  '[--pane-stack-inset:0px] md:[--pane-stack-inset:--spacing(3)]'
].join(' ')

// The box is the grid track, so it never animates: it changes once, at the end
// of an expand (held collapsed by `data-motion`) or the start of a collapse.
// The frame inside animates and overflows it while the content translates.
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
// `translate` has no logical form, so `rtl:` mirrors it.
export const navigatorExpandToggleAnchorClass = [
  'absolute start-1/2 top-full -translate-x-1/2 rtl:translate-x-1/2 -translate-y-full',
  'navigator-expanded:start-[calc(100%-1rem)] navigator-expanded:top-1/2 navigator-expanded:-translate-x-full rtl:navigator-expanded:translate-x-full navigator-expanded:-translate-y-1/2',
  'motion-safe:[transition:inset-inline-start_var(--navigator-primary-motion),top_var(--navigator-primary-motion),translate_var(--navigator-primary-motion)]'
].join(' ')

export const navigatorExpandToggleClass =
  'is-interactive grid size-10 place-items-center rounded-full text-subtle hover:bg-subtle'

// Takes the height left between brand and pinned, so the cluster centres there.
export const navigatorPrimaryClusterClass = 'min-h-0 flex-1'

export const navigatorPrimaryClusterViewportClass = 'size-full'

// `min-h-full` + `content-center` centres a short cluster and top-aligns a tall
// one; py-2 keeps capsule shadows off the clip edge.
export const navigatorPrimaryClusterContentClass =
  'grid min-h-full content-center px-3 py-2'

// The pill's track: it moves with the centred capsules, so the pill does too.
// Capsules stretch in both states, so they widen with the navigation.
export const navigatorPrimaryClusterTrackClass = 'relative grid gap-3'

export const navigatorPrimaryPinnedClass = 'relative grid gap-3 px-3'

// `rounded-4xl` overflows a collapsed capsule's width, so the browser scales it to a pill.
// Opaque: nothing scrolls beneath it, so a blur would cost the GPU and show nothing.
export const navigatorCapsuleClass =
  'group/capsule relative grid gap-1 p-1 rounded-4xl emphasis-raised'

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
      pinned: {
        true: 'grid-cols-[minmax(0,1fr)_auto] gap-3',
        false: ''
      }
    },
    defaultVariants: { hidden: false, pinned: false }
  }
)

// A size container, so the tabs share what the pinned circle and gap leave.
export const navigatorPrimaryLaneClass = '[container-type:inline-size]'

export const navigatorPrimaryCircleClass =
  'pointer-events-auto grid self-stretch'

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
// edges; the rest scale away but stay in the accessibility tree. `translate`
// has no logical form, so `rtl:` mirrors every horizontal travel.
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
      // Down to the edge circle's 3.5rem from its 4.125rem, and in to its 1rem inset.
      {
        presentation: 'pinned',
        collapsed: true,
        class: '-translate-x-2 rtl:translate-x-2 scale-[calc(3.5/4.125)]'
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
export const navigatorGroupTitleClass = [
  'grid grid-rows-[0fr] self-start -mb-3 px-3 text-xs font-semibold text-subtler opacity-0',
  'navigator-expanded:grid-rows-[1fr] navigator-expanded:mb-1 navigator-expanded:opacity-100',
  'motion-safe:[transition:grid-template-rows_var(--navigator-primary-motion),margin_var(--navigator-primary-motion),opacity_var(--navigator-primary-motion)]'
].join(' ')

export const navigatorGroupTitleTextClass = 'min-h-0 overflow-hidden'

// `ps-1` + a tile-wide first column keep the mark on the icon column in both
// states. The rest fades in once the toggle has crossed its row; `starting:`
// covers a wordmark that was `display: none`. A `Logo`'s margins fill the tile,
// so its mark stays centred while its wordmark or product opens beside it on
// the navigation's width and the labels' fade.
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
  // The general rules above hide a wordmark while collapsed; a wordmark-only
  // Logo has nothing else to show, so this overrides them to keep it visible.
  '[&>[data-slot=logo]:not(:has([data-slot=logo-mark]))]:mx-0',
  '[&_[data-slot=logo]:not(:has([data-slot=logo-mark]))_[data-slot=logo-wordmark]]:h-[min(1em,calc(3rem*42/128))] [&_[data-slot=logo]:not(:has([data-slot=logo-mark]))_[data-slot=logo-wordmark]]:opacity-100',
  'navigator-expanded:[&_[data-slot=logo]:not(:has([data-slot=logo-mark]))_[data-slot=logo-wordmark]]:h-[1em]',
  'motion-safe:[&_[data-slot=logo]:not(:has([data-slot=logo-mark]))_[data-slot=logo-wordmark]]:[transition:height_var(--navigator-primary-motion)]'
].join(' ')

export const navigatorItemTrailingClass =
  'col-start-3 ms-3 flex items-center gap-2'

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
  'col-start-2 row-start-1 ms-3 truncate opacity-0 navigator-expanded:opacity-100 motion-safe:[transition:opacity_var(--duration-fast)_var(--ease-exit)] motion-safe:navigator-expanded:[transition:opacity_var(--duration-moderate)_var(--ease-enter)_var(--duration-fast)]'

// Without an icon the label takes the icon column, unless a capsule sibling's icon needs it for alignment.
export const navigatorItemIconlessLabelClass = [
  'col-span-2 col-start-1 ms-0',
  'group-has-[[data-slot=navigator-item-icon]]/capsule:col-span-1 group-has-[[data-slot=navigator-item-icon]]/capsule:col-start-2 group-has-[[data-slot=navigator-item-icon]]/capsule:ms-3'
].join(' ')

// Mirrors the label's fade, inverted: visible collapsed, so its fade-in on
// collapse waits like the label's does on expand, and they never overlap.
export const navigatorItemInitialClass =
  'col-start-1 row-start-1 grid size-6 place-items-center text-base font-bold navigator-expanded:opacity-0 motion-safe:[transition:opacity_var(--duration-moderate)_var(--ease-enter)_var(--duration-fast)] motion-safe:navigator-expanded:[transition:opacity_var(--duration-fast)_var(--ease-exit)]'

// The pinned tab's glyph when there is no icon.
export const navigatorTabInitialClass =
  'grid size-7 place-items-center text-lg font-bold'

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

// Same floating surface and motion as Popover.
export const navigatorMenuPopupClass = [
  'grid min-w-48 max-h-(--available-height) origin-(--transform-origin) gap-0.5 p-1',
  'rounded-xl emphasis-floating is-translucent motion-scale outline-none'
].join(' ')

export const navigatorMenuItemClass = [
  'flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-normal outline-none select-none',
  'data-[highlighted]:bg-subtle'
].join(' ')

// Flex: the field takes what Cancel leaves as it opens.
export const navigatorSearchClass = 'group/search flex items-center'

export const navigatorSearchBoxClass = 'relative grid min-w-0 flex-1'

// The capsules' surface, keeping the field's hover, focus and ring. Opaque,
// because the header it sits in already blurs. The browser's own clear button
// would be a second ✕ beside Cancel.
export const navigatorSearchFieldClass = [
  'rounded-full bg-raised emphasis-raised ps-11 pe-4',
  'placeholder:text-subtler [&::-webkit-search-cancel-button]:appearance-none'
].join(' ')

export const navigatorSearchIconClass =
  'pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-subtle'

// Opens while focus is anywhere in the search, so tabbing from the field
// reaches it. Cancel is pinned to the end, so the slot's width reveals it
// over the field's end rather than overflowing the pane.
export const navigatorSearchCancelSlotClass = [
  'relative h-12 w-0 ms-0 invisible scale-75 opacity-0',
  'group-focus-within/search:visible group-focus-within/search:ms-2 group-focus-within/search:w-12 group-focus-within/search:scale-100 group-focus-within/search:opacity-100',
  'motion-safe:transition-[width,margin,scale,opacity,visibility] motion-safe:transition-discrete motion-safe:duration-moderate motion-safe:ease-standard motion-reduce:transition-none'
].join(' ')

export const navigatorSearchCancelClass = 'absolute end-0 top-0 emphasis-raised'
