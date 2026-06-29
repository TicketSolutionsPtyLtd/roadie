export type OztixImageFormat = 'webp' | 'png' | 'jpg'

export interface OztixImageOptions {
  format?: OztixImageFormat
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
 * Sets `width` and `format`, and drops any pre-existing `height` so the proxy
 * scales proportionally. Non-Oztix URLs are returned unchanged.
 */
export function oztixImageAtWidth(
  src: string,
  width: number,
  opts?: OztixImageOptions
): string {
  if (!isOztixImageUrl(src)) return src

  const url = new URL(src)
  url.searchParams.set('width', String(Math.round(width)))
  url.searchParams.delete('height')
  url.searchParams.set('format', opts?.format ?? 'webp')
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
