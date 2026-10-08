import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

export type DocsPage = {
  route: string
  componentPaths: string[]
  description?: string
  status?: string
  example?: string
}

const COMPONENT_PATH = /componentPath=(?:'([^']+)'|"([^"]+)"|\{\[([^\]]*)\]\})/g
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
  const componentPaths = Array.from(mdx.matchAll(COMPONENT_PATH)).flatMap(
    ([, single, double, list]) =>
      list === undefined
        ? [(single ?? double)!]
        : Array.from(list.matchAll(QUOTED), ([, a, b]) => (a ?? b)!)
  )
  const example = mdx.match(LIVE_FENCE)?.[1]?.trimEnd()
  return {
    route,
    componentPaths,
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

export function componentDirOf(componentPath: string) {
  return /\.[cm]?[jt]sx?$/.test(componentPath)
    ? path.posix.dirname(componentPath)
    : componentPath.replace(/\/$/, '')
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
  name: string,
  componentDir: string
): PageMatch | undefined {
  const referencing = pages.filter((page) =>
    page.componentPaths.some((p) => componentDirOf(p) === componentDir)
  )
  const named = pages.filter((page) => slugOf(page) === toKebab(name))
  const ownFile = `${componentDir}/${name}.tsx`
  const own = named.find((page) => referencing.includes(page)) ?? named[0]
  if (own) return { page: own, own: true }
  const documenting = pages.find((page) =>
    page.componentPaths.includes(ownFile)
  )
  if (documenting) return { page: documenting, own: false }
  if (path.posix.basename(componentDir) !== name) return undefined
  const page =
    referencing.find(
      (candidate) =>
        candidate.componentPaths[0] !== undefined &&
        componentDirOf(candidate.componentPaths[0]) === componentDir
    ) ?? referencing[0]
  return page && { page, own: false }
}
