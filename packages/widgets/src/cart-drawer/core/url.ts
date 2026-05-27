/** True only for same-origin absolute paths: one leading "/", not "//", no scheme. */
export function isSafeRelativePath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) return false
  if (path !== path.trim()) return false // reject leading/trailing whitespace tricks
  // Reject ALL C0 control chars + DEL, not just \t\n\r — browsers strip or
  // realign on several of them (\v \f NUL …), which can reposition slashes.
  for (let i = 0; i < path.length; i++) {
    const code = path.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return false
  }
  if (!path.startsWith('/')) return false
  if (path.startsWith('//')) return false
  if (path.startsWith('/\\')) return false // backslash → treated as // by browsers
  try {
    const base = 'https://x.invalid'
    if (new URL(path, base).origin !== base) return false // durable cross-origin guard
  } catch {
    return false
  }
  return true
}

/**
 * True only for absolute http(s) URLs — used to gate API-supplied image URLs
 * before they reach an `<img src>`. Blocks `data:`, `javascript:`,
 * protocol-relative (`//host`) and relative refs so a hostile API can't beacon
 * viewers or smuggle a non-image scheme. Host allow-listing is left to the
 * consuming app (the trusted-hosts seam); this is the baseline scheme guard.
 */
export function isSafeImageUrl(url: string | null | undefined): url is string {
  if (typeof url !== 'string' || url.length === 0) return false
  if (url !== url.trim()) return false
  for (let i = 0; i < url.length; i++) {
    const code = url.charCodeAt(i)
    if (code <= 0x1f || code === 0x7f) return false
  }
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false // relative or protocol-relative → no base → throws
  }
}

/** host + validated extrasUrl, or null if the path is unsafe. */
export function buildCheckoutUrl(
  host: string,
  extrasUrl: string
): string | null {
  if (!isSafeRelativePath(extrasUrl)) return null
  return `${host}${extrasUrl}`
}
