// A backslash reads as a slash in a URL, so `/\host` would leave the site.
const UNSAFE_CHARACTER = /[\s\\\p{Cc}]/u

/** Whether an image may load from `src`: https, or a path on the same site. */
export function isSafeImageSrc(src: unknown): src is string {
  if (typeof src !== 'string' || UNSAFE_CHARACTER.test(src)) return false
  if (/^\/(?!\/)/.test(src)) return true
  return /^https:\/\//i.test(src) && URL.canParse(src)
}
