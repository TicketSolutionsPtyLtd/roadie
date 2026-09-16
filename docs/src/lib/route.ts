import { usePathname } from 'next/navigation'

/**
 * A pathname as a route key: no trailing slash, so `/components/` and
 * `/components` name one page, the way the manifest and the nav items key them.
 * See docs/solutions/best-practices/pathname-as-a-route-key.md.
 */
export const toRoute = (pathname: string) => pathname.replace(/\/+$/, '') || '/'

/** The route the browser is on, keyed as every route lookup in the docs keys it. */
export const useRoute = () => toRoute(usePathname())
