// Browsers strip leading whitespace before reading the scheme, so `\tjavascript:` still runs.
const UNSAFE_PATTERN = /^\s*(javascript|data|vbscript|blob|file):/i

/**
 * Whether an `href` uses a protocol that can run script or read local data
 * (`javascript:`, `data:`, `vbscript:`, `blob:`, or `file:`). Render `#`
 * instead of an href this returns true for.
 */
export function isUnsafeHref(href: string): boolean {
  return UNSAFE_PATTERN.test(href)
}
