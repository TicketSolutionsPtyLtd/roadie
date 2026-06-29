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
   * query (applied last, so it can override the defaults — e.g. reintroduce
   * `height` with `rmode: 'crop'`). Supported commands: `height`, `rmode`,
   * `ranchor`, `rxy`, `rsampler`, `compand`, `orient`, `bgcolor`, `autoorient`,
   * `pngcolortype`. See TicketSolutions.Assets ImageSharpWeb config.
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
  if (!isOztixImageUrl(src)) return src

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
 * Builds a width-descriptor `srcSet` from a list of target widths. Returns
 * `undefined` for non-Oztix URLs or when no positive width remains, so callers
 * can omit the attribute entirely.
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
