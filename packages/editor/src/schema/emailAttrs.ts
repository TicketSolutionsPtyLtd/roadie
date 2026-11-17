import { isUnsafeHref } from '@oztix/roadie-core/utils'

import { isSafeImageSrc } from './imageSrc'

/** The email canvas's width in CSS pixels, which an image never exceeds. */
export const EMAIL_WIDTH = 600

export const COLUMN_COUNTS = [2, 3, 4] as const

export const SPACER_HEIGHT = { min: 8, max: 160, default: 32 } as const

const EMAIL_PROTOCOL = /^(https?:\/\/|mailto:|tel:)\S/i

/**
 * Whether a button may link to `href`. An email opens outside the site, so it
 * must be absolute: https, http, mailto or tel.
 */
export function isEmailHref(href: unknown): href is string {
  return (
    typeof href === 'string' &&
    !isUnsafeHref(href) &&
    EMAIL_PROTOCOL.test(href) &&
    URL.canParse(href)
  )
}

/** Whether an email image may load from `src`: https only, as it loads in a mail client. */
export function isEmailImageSrc(src: unknown): src is string {
  return isSafeImageSrc(src) && /^https:\/\//i.test(src)
}

/** A saved image width, or null to fill its column. */
export function imageWidth(width: unknown): number | null {
  return Number.isInteger(width) &&
    Number(width) > 0 &&
    Number(width) <= EMAIL_WIDTH
    ? Number(width)
    : null
}

/** A link variable's key, trimmed as a merge tag's is, or undefined when blank. */
export function linkVariable(variable: unknown): string | undefined {
  const key = typeof variable === 'string' ? variable.trim() : ''
  return key === '' ? undefined : key
}

/** A spacer's height, in whole pixels within its range. */
export function spacerHeight(height: unknown): number {
  if (typeof height !== 'number' || !Number.isFinite(height)) {
    return SPACER_HEIGHT.default
  }
  return Math.min(
    SPACER_HEIGHT.max,
    Math.max(SPACER_HEIGHT.min, Math.round(height))
  )
}

/** How a button sits in its column: from its start, centred, or at its end. */
export type ButtonAlign = 'left' | 'center' | 'right'

/**
 * A button's look beyond its link. Each is saved only when it isn't the
 * default: strong, its label's width, from the column's start.
 */
export type ButtonLook = {
  align?: Exclude<ButtonAlign, 'left'>
  /**
   * Strong by default: the accent's fill. `'normal'` is a neutral border and
   * `'subtle'` a neutral tint, for a button beside a strong one.
   */
  emphasis?: 'normal' | 'subtle'
  fullWidth?: true
}

/** A heading's or a paragraph's alignment: from its start, or centred. */
export function textAlign(align: unknown): 'center' | undefined {
  return align === 'center' ? align : undefined
}

/**
 * How an image sits and where it links. Each is saved only when it isn't the
 * default: centred, as a mail client centres it, and unlinked. Its width is
 * `width`, so it aligns only at a width narrower than its column.
 */
export type ImageLook = {
  align?: 'left' | 'right'
  href?: string
  /** A link variable's key, such as the unsubscribe page, in place of `href`. */
  variable?: string
}

/** The saved parts of an image's look, dropping defaults and anything unknown. */
export function imageLook(attrs: unknown): ImageLook {
  if (typeof attrs !== 'object' || attrs === null) return {}
  const { align, href, variable: saved } = attrs as Record<string, unknown>
  const variable = linkVariable(saved)
  const linked = variable ? { variable } : isEmailHref(href) ? { href } : {}
  return {
    ...((align === 'left' || align === 'right') && { align }),
    ...linked
  }
}

/**
 * How a row of columns shares its width and stacks on a phone. Each is saved
 * only when it isn't the default: equal widths, stacked in order.
 */
export type ColumnsLook = {
  /** The first or last column twice the width of each other, as 2:1 or 1:2 in two. */
  layout?: 'wide-left' | 'wide-right'
  /** Stacked last column first on a phone. */
  stack?: 'reverse'
}

/** The saved parts of a row of columns' look, dropping defaults and anything unknown. */
export function columnsLook(attrs: unknown): ColumnsLook {
  if (typeof attrs !== 'object' || attrs === null) return {}
  const { layout, stack } = attrs as Record<string, unknown>
  return {
    ...((layout === 'wide-left' || layout === 'wide-right') && { layout }),
    ...(stack === 'reverse' && { stack })
  }
}

/** Each column's share of the row, in percent, by its look. */
export function columnWidths(count: number, { layout }: ColumnsLook) {
  const wide =
    layout === 'wide-left' ? 0 : layout === 'wide-right' ? count - 1 : -1
  const parts = wide < 0 ? count : count + 1
  return Array.from(
    { length: count },
    (_, index) => ((index === wide ? 2 : 1) * 100) / parts
  )
}

/** The saved parts of a button's look, dropping defaults and anything unknown. */
export function buttonLook(attrs: unknown): ButtonLook {
  if (typeof attrs !== 'object' || attrs === null) return {}
  const { align, emphasis, fullWidth } = attrs as Record<string, unknown>
  return {
    ...((align === 'center' || align === 'right') && { align }),
    ...((emphasis === 'normal' || emphasis === 'subtle') && { emphasis }),
    ...(fullWidth === true && { fullWidth })
  }
}

/** A section's fill, from the email's theme: its tint, or its accent. */
export type SectionLook = 'tint' | 'accent'

/** The room above and below a section's blocks. */
export type SectionSpacing = 'tight' | 'roomy'

/**
 * A section's look and spacing, each saved only when it isn't the default:
 * plain, with normal spacing.
 */
export function sectionLook(attrs: unknown): {
  look?: SectionLook
  spacing?: SectionSpacing
} {
  if (typeof attrs !== 'object' || attrs === null) return {}
  const { look, spacing } = attrs as Record<string, unknown>
  return {
    ...((look === 'tint' || look === 'accent') && { look }),
    ...((spacing === 'tight' || spacing === 'roomy') && { spacing })
  }
}
