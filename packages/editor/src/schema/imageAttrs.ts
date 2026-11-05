/**
 * How a page's image sits, in the rich and blocks presets. Each is saved
 * only when it isn't the default: its own width, from the start. An email's
 * image saves `width` and `align` of its own instead (see `imageLook`).
 */
export type PageImageLook = {
  /** Across the text's width. */
  fullWidth?: true
  /** Where an image narrower than the text sits. */
  align?: 'center' | 'right'
  /** A line under the image, as a `figcaption`. */
  caption?: string
}

/** The saved parts of a page image's look, dropping defaults and anything unknown. */
export function pageImageLook(attrs: unknown): PageImageLook {
  if (typeof attrs !== 'object' || attrs === null) return {}
  const { fullWidth, align, caption } = attrs as Record<string, unknown>
  const text = typeof caption === 'string' ? caption.trim() : ''
  return {
    ...(fullWidth === true && { fullWidth }),
    ...(fullWidth !== true &&
      (align === 'center' || align === 'right') && { align }),
    ...(text && { caption: text })
  }
}
