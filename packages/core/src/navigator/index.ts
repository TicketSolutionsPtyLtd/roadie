export const NAVIGATOR_EXPANDED_COOKIE = 'roadie-navigator-expanded'
export const NAVIGATOR_EXPANDED_ATTRIBUTE = 'data-navigator-expanded'

const VERTICAL = '[data-slot=navigator-primary][data-orientation=vertical]'
const FROM_DOCUMENT = `[${NAVIGATOR_EXPANDED_ATTRIBUTE}] ${VERTICAL}[data-from-document]`

/** The `navigator-expanded` variant's selector list, for tests that assert it matches. */
export const NAVIGATOR_EXPANDED_SCOPE = `${VERTICAL}[data-expanded], ${VERTICAL}[data-expanded] *, ${FROM_DOCUMENT}, ${FROM_DOCUMENT} *`

/**
 * A blocking `<head>` script that paints a persisted expanded navigation before hydration. Pair with `<Navigator expandedFromDocument>`.
 * @example
 * <script dangerouslySetInnerHTML={{ __html: getNavigatorExpandedScript() }} />
 */
export function getNavigatorExpandedScript(): string {
  // Blocked cookies throw; the default collapsed state is the right fallback.
  return `try{var d=document.documentElement;/(?:^|; )${NAVIGATOR_EXPANDED_COOKIE}=1(?:;|$)/.test(document.cookie)?d.setAttribute('${NAVIGATOR_EXPANDED_ATTRIBUTE}',''):d.removeAttribute('${NAVIGATOR_EXPANDED_ATTRIBUTE}')}catch(x){}`
}

/** The cookie string to write when the user toggles the vertical navigation. */
export function serializeNavigatorExpandedCookie(expanded: boolean): string {
  return `${NAVIGATOR_EXPANDED_COOKIE}=${expanded ? 1 : 0}; path=/; max-age=31536000; samesite=lax`
}
