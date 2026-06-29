export type OztixImageFormat = 'webp' | 'png' | 'jpg'

export interface OztixImageOptions {
  /** Output format. Defaults to `webp`. */
  format?: OztixImageFormat
  /**
   * Target height. When set, the proxy resizes to fit both dimensions (crop);
   * when omitted, height is dropped and the proxy scales proportionally.
   */
  height?: number
  /** Encoder quality, 1–100. Lower trades fidelity for bytes. */
  quality?: number
  /** Crop surrounding transparent space server-side (ImageSharp `autotrim=1`). */
  autotrim?: boolean
  /**
   * Escape hatch for any other ImageSharp.Web command, merged verbatim into the
   * query (applied last, so it can override the defaults). Supported commands:
   * `rmode`, `ranchor`, `rxy`, `rsampler`, `compand`, `orient`, `bgcolor`,
   * `autoorient`, `pngcolortype`. Use the `height` option for cropping rather
   * than `params`. See TicketSolutions.Assets ImageSharpWeb config.
   */
  params?: Record<string, string | number | boolean>
}

/**
 * Oztix CDN hosts that front the ImageSharp.Web resize/transcode proxy. Only
 * these get the `?width=&format=` rewrite — third-party (signed S3, Sanity,
 * external thumbnails) URLs would break or ignore the params, so they pass
 * through untouched.
 */
export const OZTIX_IMAGE_HOSTS = new Set([
  'assets.oztix.com.au',
  'd3fcfeclx4v047.cloudfront.net',
  'dp4qkqhwvriyk.cloudfront.net'
])

/** Common device widths, used to build responsive srcSet ladders. */
export const OZTIX_DEVICE_WIDTHS = [
  320, 420, 640, 768, 1024, 1280, 1536, 1920, 2400
]

/**
 * Responsive srcSet widths for a fluid image rendered up to `width` at 1x:
 * common device widths plus the 1x and 2x, capped at the proxy's 4000px limit.
 * Lets small screens download small files. For a fixed-size image just use
 * `[width, width * 2]`.
 */
export function oztixWidthLadder(width: number): number[] {
  if (!Number.isFinite(width) || width <= 0) return []
  const max = Math.min(width * 2, 4000)
  return [
    ...new Set([...OZTIX_DEVICE_WIDTHS, width, width * 2].map(Math.round))
  ]
    .filter((w) => w > 0 && w <= max)
    .sort((a, b) => a - b)
}

export function isOztixImageUrl(src: string): boolean {
  try {
    return OZTIX_IMAGE_HOSTS.has(new URL(src).hostname)
  } catch {
    return false
  }
}

/**
 * Rewrites an Oztix image URL to request a single resized/transcoded variant.
 * Sets `width` and `format`. With `opts.height` it crops to both dimensions;
 * otherwise any pre-existing `height` is dropped so the proxy scales
 * proportionally. With `autotrim`, surrounding transparent space is cropped
 * server-side. `quality` and `params` map to the matching ImageSharp.Web
 * commands. Non-Oztix URLs are returned unchanged.
 */
export function oztixImageAtWidth(
  src: string,
  width: number,
  opts?: OztixImageOptions
): string {
  if (!isOztixImageUrl(src) || !Number.isFinite(width) || width <= 0) return src

  const url = new URL(src)
  url.searchParams.set('width', String(Math.round(width)))
  if (opts?.height != null && opts.height > 0)
    url.searchParams.set('height', String(Math.round(opts.height)))
  else url.searchParams.delete('height')
  url.searchParams.set('format', opts?.format ?? 'webp')
  if (opts?.quality != null)
    url.searchParams.set('quality', String(opts.quality))
  if (opts?.autotrim) url.searchParams.set('autotrim', '1')
  if (opts?.params)
    for (const [key, value] of Object.entries(opts.params))
      url.searchParams.set(key, String(value))
  return url.toString()
}

/**
 * Builds a width-descriptor `srcSet` from a list of target widths, applying the
 * same `opts` to each entry. Returns `undefined` for non-Oztix URLs or when no
 * positive width remains, so callers can omit the attribute entirely. Pair with
 * `oztixWidthLadder` for a responsive ladder. (A fixed `opts.height` is applied
 * to every entry as-is; for a proportionally-scaled crop ladder, map
 * `oztixImageAtWidth` per width like the `Image` component does.)
 */
export function oztixSrcSet(
  src: string,
  widths: number[],
  opts?: OztixImageOptions
): string | undefined {
  if (!isOztixImageUrl(src)) return undefined

  const sorted = [...new Set(widths.map(Math.round).filter((w) => w > 0))].sort(
    (a, b) => a - b
  )
  if (sorted.length === 0) return undefined

  return sorted
    .map((w) => `${oztixImageAtWidth(src, w, opts)} ${w}w`)
    .join(', ')
}
