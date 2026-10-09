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
