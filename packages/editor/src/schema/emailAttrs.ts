import { isUnsafeHref } from '@oztix/roadie-core/utils'

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
  return (
    typeof src === 'string' &&
    !/[\s\\\p{Cc}]/u.test(src) &&
    /^https:\/\//i.test(src) &&
    URL.canParse(src)
  )
}

/** A saved image width, or null to fill its column. */
export function imageWidth(width: unknown): number | null {
  return Number.isInteger(width) &&
    Number(width) > 0 &&
    Number(width) <= EMAIL_WIDTH
    ? Number(width)
    : null
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
 * default: filled, its label's width, from the column's start.
 */
export type ButtonLook = {
  align?: Exclude<ButtonAlign, 'left'>
  /** `'normal'` draws an outline in the button's colour, not a fill. */
  emphasis?: 'normal'
  fullWidth?: true
}

/** The saved parts of a button's look, dropping defaults and anything unknown. */
export function buttonLook(attrs: unknown): ButtonLook {
  if (typeof attrs !== 'object' || attrs === null) return {}
  const { align, emphasis, fullWidth } = attrs as Record<string, unknown>
  return {
    ...((align === 'center' || align === 'right') && { align }),
    ...(emphasis === 'normal' && { emphasis }),
    ...(fullWidth === true && { fullWidth })
  }
}
