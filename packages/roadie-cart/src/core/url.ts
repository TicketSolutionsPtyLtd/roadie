/** True only for same-origin absolute paths: one leading "/", not "//", no scheme. */
export function isSafeRelativePath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0) return false
  if (path !== path.trim()) return false // reject leading/trailing whitespace tricks
  if (/[\t\n\r]/.test(path)) return false // browsers strip these → can reposition slashes
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

/** host + validated extrasUrl, or null if the path is unsafe. */
export function buildCheckoutUrl(
  host: string,
  extrasUrl: string
): string | null {
  if (!isSafeRelativePath(extrasUrl)) return null
  return `${host}${extrasUrl}`
}
