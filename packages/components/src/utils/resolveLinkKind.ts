/**
 * Classifies an `href` so smart-href components can pick the right
 * element and routing strategy. Pure, server-safe, no React imports —
 * runs identically on the server and client.
 *
 * - `undefined` → `'button'` (caller renders `<button>` instead of an anchor)
 * - `https://…`, `http://…`, `//…` → `'external'` (renders `<a target rel>`)
 * - `mailto:`, `tel:`, `sms:` → `'protocol'` (renders plain `<a>`, no target)
 * - everything else → `'internal'` (renders the configured `Link` if present,
 *   else plain `<a>`). Empty string passes through as `'internal'` —
 *   classifying invalid hrefs is the caller's responsibility.
 */
export type ResolvedLinkKind = 'button' | 'external' | 'protocol' | 'internal'

const EXTERNAL_PATTERN = /^(https?:)?\/\//i
const PROTOCOL_PATTERN = /^(mailto|tel|sms):/i

export function resolveLinkKind(href: string | undefined): ResolvedLinkKind {
  if (href === undefined) return 'button'
  if (EXTERNAL_PATTERN.test(href)) return 'external'
  if (PROTOCOL_PATTERN.test(href)) return 'protocol'
  return 'internal'
}
