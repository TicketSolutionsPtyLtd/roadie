// Mirrors the WHATWG URL parser: browsers drop tab, LF and CR anywhere and
// trim leading C0 controls and spaces, so `java\tscript:` and `\x00javascript:` still run.
// Leading Unicode whitespace is trimmed too, to fail closed.
const URL_STRIPPED_CHARS = /[\t\n\r]/g
// eslint-disable-next-line no-control-regex -- matching C0 controls is the point
const LEADING_C0_OR_WHITESPACE = /^[\u0000-\u0020\s]+/
const UNSAFE_SCHEME = /^(javascript|data|vbscript|blob|file):/i
// An app's own blob: URL is how an image previews before upload.
const UNSAFE_IMAGE_SCHEME = /^(javascript|data|vbscript|file):/i

const asParsed = (url: string) =>
  url.replace(URL_STRIPPED_CHARS, '').replace(LEADING_C0_OR_WHITESPACE, '')

/**
 * Whether an `href` uses a protocol that can run script or read local data
 * (`javascript:`, `data:`, `vbscript:`, `blob:`, or `file:`). Render `#`
 * instead of an href this returns true for.
 */
export function isUnsafeHref(href: string): boolean {
  return UNSAFE_SCHEME.test(asParsed(href))
}

/** As `isUnsafeHref`, for an image `src`, which may also be a `blob:` URL. */
export function isUnsafeImageSrc(src: string): boolean {
  return UNSAFE_IMAGE_SCHEME.test(asParsed(src))
}
