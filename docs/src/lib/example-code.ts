/** The one `/examples/` page `next build` renders; `scripts/example-pages.ts` copies it to every example's address. */
export const EXAMPLE_SHELL = 'shell'

/** A docs page's live examples, as JSON, for an isolated example to read in the browser. */
export const exampleCodeHref = (page: string) => `/example-code/${page}.json`

/** The docs page and example id an `/examples/<page>/<id>/` path names. */
export function exampleAt(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] !== 'examples' || segments.length < 3) return undefined
  return {
    page: segments.slice(1, -1).join('/'),
    id: segments.at(-1) ?? ''
  }
}
