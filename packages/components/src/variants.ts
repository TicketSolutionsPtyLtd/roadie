/**
 * Shared CVA variant maps used across multiple components.
 */
export const intentVariants = {
  neutral: 'intent-neutral',
  brand: 'intent-brand',
  'brand-secondary': 'intent-brand-secondary',
  accent: 'intent-accent',
  danger: 'intent-danger',
  success: 'intent-success',
  warning: 'intent-warning',
  info: 'intent-info'
} as const

/** The title style for a surface that owns a region of the screen. */
export const surfaceTitleClass = 'text-display-ui-4 text-strong'

/** A literal union, because `react-docgen-typescript` can't read CVA types. */
export type RoadieIntent = keyof typeof intentVariants

/** The default field surface, matching `Input` and `Textarea`. */
export const fieldSurfaceClass = 'emphasis-field is-interactive-field'
