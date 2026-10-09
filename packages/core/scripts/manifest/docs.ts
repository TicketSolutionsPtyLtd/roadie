import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

export type DocsPage = {
  route: string
  components: string[]
  description?: string
  status?: string
  example?: string
}

const COMPONENT =
  /<PropsDefinitions\b[^>]*?\bcomponent=(?:'([^']+)'|"([^"]+)"|\{\[([^\]]*)\]\})/g
const QUOTED = /'([^']+)'|"([^"]+)"/g
const LIVE_FENCE = /^```tsx-live[^\n]*\n([\s\S]*?)^```/m

const METADATA = /^export const metadata = \{\n([\s\S]*?)^\}/m

function metadataField(mdx: string, field: string) {
  const block = mdx.match(METADATA)?.[1] ?? ''
  const match = block.match(
    new RegExp(
      `^\\s+${field}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`,
      'm'
    )
  )
  const value = match?.[1] ?? match?.[2]
  return value?.replace(/\\(.)/g, '$1')
}

export function parseDocsPage(mdx: string, route: string): DocsPage {
  const components = Array.from(mdx.matchAll(COMPONENT)).flatMap(
    ([, single, double, list]) =>
      list === undefined
        ? [(single ?? double)!]
        : Array.from(list.matchAll(QUOTED), ([, a, b]) => (a ?? b)!)
  )
  const example = mdx.match(LIVE_FENCE)?.[1]?.trimEnd()
  return {
    route,
    components,
    description: metadataField(mdx, 'description'),
    status: metadataField(mdx, 'status'),
    example
  }
}

export function readDocsPages(appDir: string): DocsPage[] {
  if (!existsSync(appDir)) return []
  return readdirSync(appDir, { recursive: true, encoding: 'utf8' })
    .filter((file) => path.basename(file) === 'page.mdx')
    .sort()
    .map((file) =>
      parseDocsPage(
        readFileSync(path.join(appDir, file), 'utf8'),
        `/${path.dirname(file).split(path.sep).join('/')}/`
      )
    )
}

export function toKebab(pascal: string) {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function slugOf(page: DocsPage) {
  return page.route.split('/').filter(Boolean).at(-1)
}

export type PageMatch = { page: DocsPage; own: boolean }

export function pageForComponent(
  pages: DocsPage[],
  name: string
): PageMatch | undefined {
  const listing = pages.filter((page) => page.components.includes(name))
  const named = pages.filter((page) => slugOf(page) === toKebab(name))
  const own = named.find((page) => listing.includes(page)) ?? named[0]
  if (own) return { page: own, own: true }
  return listing[0] && { page: listing[0], own: false }
}
