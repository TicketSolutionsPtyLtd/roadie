/**
 * Shared CVA variant maps used across multiple components.
 */
export const intentVariants = {
  neutral: 'intent-neutral',
  brand: 'intent-brand',
  'brand-secondary': 'intent-brand-secondary',
  'brand-blue': 'intent-brand-blue',
  'brand-orange': 'intent-brand-orange',
  'brand-purple': 'intent-brand-purple',
  accent: 'intent-accent',
  danger: 'intent-danger',
  success: 'intent-success',
  warning: 'intent-warning',
  info: 'intent-info'
} as const

/** The title style for a surface that owns a region of the screen. */
export const surfaceTitleClass = 'text-display-ui-4 text-strong'

/** A disclosure caret's size and turn. Pair with an open-state `rotate-180`. */
export const disclosureCaretClass =
  'size-4 shrink-0 transition-transform duration-moderate ease-enter'

// A literal, not a joined array: a module-level call isn't tree-shaken, so
// every component importing this file would carry it.
/** A horizontal track that scrolls sideways, scrollbar hidden, when it outgrows its container. */
export const horizontalScrollClass =
  'data-[orientation=horizontal]:max-w-full data-[orientation=horizontal]:overflow-x-auto data-[orientation=horizontal]:overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

// List popups skip `is-translucent`: the blur repaints under every keystroke
// and exit frame, and Combobox.perf and Select.perf then miss 60fps.
/** A popup's elevation, edge, padding and enter motion: Menu and every list popup. */
export const floatingPopupClass =
  'max-h-(--available-height) origin-(--transform-origin) overflow-y-auto rounded-xl p-1 emphasis-floating motion-scale outline-none'

/** Beside `floatingPopupClass` on a listbox popup: at least its anchor's width. */
export const listPopupWidthClass =
  'max-w-(--available-width) min-w-(--anchor-width)'

// An inset shadow on a scroller moves its fill out of the scrolling layer, and
// without a GPU every frame blends the rows over it again, so typing in a long
// Combobox drops frames. The rim becomes a border the fill shows through: the
// top is the rim's highlight, and the sides 30% of it, the ring's exact alpha
// in dark mode and a touch over it in light, white on a near-white fill. A
// pixel of padding moves to the border, so rows don't move.
/** Beside `floatingPopupClass` on a popup that scrolls: the rim as a border. */
export const scrollingPopupRimClass =
  'border border-(--rim-light-edge)/30 border-t-(--rim-light-edge) p-0.75 [--rim-light-own:0_0_#0000]'

/** An option row's shape. Its highlight depends on where focus lives, so it's added beside. */
export const optionRowClass =
  'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-normal outline-none select-none'

// A tapped row keeps focus, so on touch only the keyboard shows the highlight.
/** The highlight for a row that takes focus itself, as in Menu and Select. */
export const focusedRowHighlightClass =
  '[@media(hover:hover)]:data-[highlighted]:bg-subtle data-[highlighted]:focus-visible:bg-subtle'

/** The check that marks a chosen option. */
export const optionIndicatorClass = 'shrink-0 text-subtle'

/** A group's heading inside a list popup. */
export const optionGroupLabelClass =
  'px-2 py-1.5 text-xs font-medium text-subtle select-none'

/** The message a list popup shows when nothing matches; collapses while empty. */
export const listEmptyClass =
  'text-center text-sm text-subtle empty:hidden [&:not(:empty)]:px-3 [&:not(:empty)]:py-4'

/** A literal union, because `react-docgen-typescript` can't read CVA types. */
export type RoadieIntent = keyof typeof intentVariants

/** How much a drawer or dialog takes over the page behind it. */
export type OverlayEmphasis = 'normal' | 'subtle' | 'subtler'

// `subtler` still renders the backdrop, so a click outside still dismisses.
export const overlayBackdropVariants = {
  normal: 'emphasis-overlay',
  subtle: 'emphasis-overlay-subtle',
  subtler: 'bg-transparent'
} as const satisfies Record<OverlayEmphasis, string>
