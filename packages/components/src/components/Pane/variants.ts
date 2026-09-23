import { cva } from 'class-variance-authority'

export type PaneColumn = 'list' | 'detail' | 'inspector'
export type PaneEmphasis = 'raised' | 'normal' | 'subtle' | 'subtler'
export type PaneTabBar = 'visible' | 'auto' | 'hidden'
export type PaneInspectorSize = 'sm' | 'md' | 'lg'
export type PaneMeasure = 'full' | 'narrow' | 'readable' | 'wide'
export type PaneMeasureAlign = 'center' | 'start'

export const paneVariants = cva(
  [
    'relative min-h-0 min-w-0',
    // backdrop-filter escapes an ancestor's rounded clip, so chrome rounds itself; phone panes are flush.
    '[--pane-radius:var(--radius-2xl)] max-md:[--pane-radius:var(--pane-radius-phone,0px)]',
    'overflow-hidden rounded-(--pane-radius)',
    // Published, not applied: chrome is sticky and the body scrolls, so each applies it.
    '[--content-inset:--spacing(6)]'
  ],
  {
    variants: {
      // Nearest opaque surface behind sticky chrome; bg-inherit would resolve transparent.
      emphasis: {
        raised: 'emphasis-raised [--pane-surface:var(--intent-bg-raised)]',
        normal: 'emphasis-normal [--pane-surface:var(--intent-bg-normal)]',
        subtle: 'emphasis-subtle',
        subtler: ''
      }
    },
    defaultVariants: { emphasis: 'raised' }
  }
)

export const paneViewportVariants = cva(['size-full overscroll-contain'], {
  variants: {
    // Clears the floating tab bar.
    clearsTabBar: { true: 'max-md:pb-24', false: '' }
  },
  defaultVariants: { clearsTabBar: true }
})

// Translucent against --pane-surface; Content overrides the fallback to sunken.
const PANE_CHROME_SURFACE =
  'bg-[color-mix(in_oklab,var(--pane-surface,var(--intent-bg-normal))_80%,transparent)] backdrop-blur-md'

// The shadow is a pseudo's opacity, so it fades on the compositor.
export const paneHeaderVariants = cva(
  [
    'sticky top-0 z-sticky grid-cols-[auto_minmax(0,1fr)_auto]',
    '[--pane-header-gap:--spacing(2)]',
    // Row gaps are margins, not row-gap: a closed row can't reclaim a shared gap.
    'gap-x-(--pane-header-gap)',
    PANE_CHROME_SURFACE,
    '[--pane-header-pad-b:--spacing(2)]',
    '-mx-(--content-inset) px-(--content-inset) pt-4 pb-(--pane-header-pad-b)',
    'rounded-t-(--pane-radius)',
    // One btn-md tall plus the header's padding.
    'min-h-[calc(--spacing(4)_+_--spacing(10)_+_var(--pane-header-pad-b))]',
    // Anything but the top-row cells spans all three columns.
    '[&>*:not([data-slot=pane-back]):not([data-slot=pane-close]):not([data-slot=pane-title-compact]):not([data-slot=pane-actions])]:col-span-3',
    // Pane.Title is excluded: it animates this margin itself.
    '[&>*:not([data-slot=pane-back]):not([data-slot=pane-close]):not([data-slot=pane-title-compact]):not([data-slot=pane-actions]):not([data-slot=pane-title])]:mt-(--pane-header-gap)',
    "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-md after:content-['']",
    'motion-safe:after:transition-opacity motion-safe:after:duration-slow motion-safe:after:ease-enter',
    'motion-reduce:after:transition-none'
  ],
  {
    variants: {
      // The leading cell's occupant decides whether an otherwise-empty header draws.
      edgeOnly: {
        none: 'grid',
        back: '[display:var(--pane-back)]',
        close: '[display:var(--pane-close)]',
        both: '[display:var(--pane-edge)]'
      },
      collapsed: { true: 'after:opacity-100', false: 'after:opacity-0' }
    },
    defaultVariants: { edgeOnly: 'none', collapsed: false }
  }
)

// Back and Close share the leading cell; the stylesheet draws at most one.
export const paneHeaderEdgeClass = 'col-start-1 row-start-1 justify-self-start'

// In the inspector's drawer: Close sits as far below the handle's band as from the side, and the shadow follows the drawer's scroll.
export const paneHeaderInDrawerClass = [
  'pt-1',
  '[[data-slot=drawer-popup]:has([data-slot=drawer-body][data-overflow-y-start])_&]:after:opacity-100'
]

// grid rows 1fr→0fr close the row; transforms wouldn't release layout.
export const paneTitleVariants = cva(
  ['text-display-ui-3 text-strong', 'origin-left'],
  {
    variants: {
      collapsible: {
        true: [
          'grid',
          'motion-safe:transition-[grid-template-rows,margin-top,scale,opacity]',
          'motion-safe:duration-slow motion-safe:ease-enter',
          'motion-reduce:transition-none'
        ].join(' '),
        false: ''
      },
      collapsed: {
        true: 'grid-rows-[0fr] mt-0 scale-95 opacity-0',
        false: 'grid-rows-[1fr] mt-(--pane-header-gap) scale-100 opacity-100'
      }
    },
    defaultVariants: { collapsible: false, collapsed: false }
  }
)

// No inset of its own: it aligns with its content neighbours.
export const paneBodyTitleClass = 'text-display-ui-3 text-strong'

// Stretched: a minmax(0,1fr) track would size to the untruncated title.
export const paneTitleCompactVariants = cva(
  [
    'col-start-2 row-start-1 w-full',
    'inline-flex items-center justify-center gap-1',
    'min-w-0 truncate cursor-pointer text-sm font-semibold text-strong',
    'motion-safe:transition-[scale,opacity] motion-safe:duration-slow',
    'motion-safe:ease-enter motion-reduce:transition-none'
  ],
  {
    variants: {
      collapsed: {
        true: 'scale-100 opacity-100',
        // invisible, not hidden: it keeps its cell so the row never reflows.
        false: 'invisible scale-95 opacity-0'
      }
    },
    defaultVariants: { collapsed: false }
  }
)

export const paneActionsClass = [
  'col-start-3 row-start-1 flex flex-wrap items-center justify-end gap-1',
  'justify-self-end'
].join(' ')

// Flex: the field takes what Cancel leaves as it opens.
export const paneSearchClass = 'group/search flex items-center'

export const paneSearchBoxClass = 'relative grid min-w-0 flex-1'

// Opaque: the header already blurs. The native clear button would be a second ✕ beside Cancel.
export const paneSearchFieldClass = [
  'rounded-full bg-raised emphasis-raised ps-11 pe-4',
  'placeholder:text-subtler [&::-webkit-search-cancel-button]:appearance-none'
].join(' ')

export const paneSearchIconClass =
  'pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-subtle'

// Opens while focus is in the search, so Tab reaches Cancel.
export const paneSearchCancelSlotClass = [
  'relative h-12 w-0 ms-0 invisible scale-75 opacity-0',
  'group-focus-within/search:visible group-focus-within/search:ms-2 group-focus-within/search:w-12 group-focus-within/search:scale-100 group-focus-within/search:opacity-100',
  'motion-safe:transition-[width,margin,scale,opacity,visibility] motion-safe:transition-discrete motion-safe:duration-moderate motion-safe:ease-standard motion-reduce:transition-none'
].join(' ')

export const paneSearchCancelClass = 'absolute end-0 top-0 emphasis-raised'

export const paneFooterClass = [
  'sticky bottom-0 z-sticky',
  PANE_CHROME_SURFACE,
  'rounded-b-(--pane-radius)',
  '-mx-(--content-inset) px-(--content-inset) pt-2 pb-4'
].join(' ')
