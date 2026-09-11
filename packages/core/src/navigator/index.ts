/** The `navigator-expanded` variant's selector list, for tests that assert it matches. */
export const NAVIGATOR_EXPANDED_SCOPE =
  '[data-slot=navigator-primary][data-orientation=vertical][data-expanded], [data-slot=navigator-primary][data-orientation=vertical][data-expanded] *, [data-navigator-expanded] [data-slot=navigator-primary][data-orientation=vertical][data-from-document], [data-navigator-expanded] [data-slot=navigator-primary][data-orientation=vertical][data-from-document] *'

export const NAVIGATOR_EXPANDED_COOKIE = 'roadie-navigator-expanded'
export const NAVIGATOR_EXPANDED_ATTRIBUTE = 'data-navigator-expanded'

type NavigatorCookieOptions = { cookieName?: string }

const COOKIE_NAME = /^[\w-]+$/

const cookieNameOf = (options?: NavigatorCookieOptions) => {
  const name = options?.cookieName ?? NAVIGATOR_EXPANDED_COOKIE
  if (!COOKIE_NAME.test(name)) {
    throw new Error(
      `[Roadie] Invalid Navigator cookie name ${JSON.stringify(name)}. Use letters, digits, "_" and "-".`
    )
  }
  return name
}

/**
 * A blocking `<head>` script for static sites that paints a persisted expanded
 * vertical navigation before hydration. Pair with `<Navigator expandedFromDocument>`.
 *
 * @example
 * <script dangerouslySetInnerHTML={{ __html: getNavigatorExpandedScript() }} />
 */
export function getNavigatorExpandedScript(
  options?: NavigatorCookieOptions
): string {
  const name = cookieNameOf(options)
  return `try{var d=document.documentElement;/(?:^|; )${name}=1(?:;|$)/.test(document.cookie)?d.setAttribute('${NAVIGATOR_EXPANDED_ATTRIBUTE}',''):d.removeAttribute('${NAVIGATOR_EXPANDED_ATTRIBUTE}')}catch(x){}`
}

/** The cookie string to write when the user toggles the vertical navigation. */
export function serializeNavigatorExpandedCookie(
  expanded: boolean,
  options?: NavigatorCookieOptions
): string {
  return `${cookieNameOf(options)}=${expanded ? 1 : 0}; path=/; max-age=31536000; samesite=lax`
}
