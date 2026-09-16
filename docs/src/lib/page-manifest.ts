import { access, readFile, readdir } from 'fs/promises'
import { join } from 'path'

export type CatalogueEntry = {
  name: string
  title: string
  description: string
  category: string
  href: string
  order?: number
}

export type CatalogueCategory = {
  name: string
  entries: CatalogueEntry[]
  /** Route of the category's overview page, when `{category-slug}/page.mdx` exists. */
  overviewHref?: string
}

/** A route whose child pages are grouped by their `metadata.category`. */
export type Catalogue = { route: string; categories: readonly string[] }

export const COMPONENTS: Catalogue = {
  route: '/components',
  categories: [
    'Navigation',
    'Layout',
    'Actions',
    'Forms',
    'Overlays',
    'Collections',
    'Status',
    'Media & brand',
    'Text'
  ]
}

export const FOUNDATIONS: Catalogue = {
  route: '/foundations',
  categories: ['Visual', 'Content', 'Behaviour', 'Building apps']
}

export const TOKENS: Catalogue = {
  route: '/tokens',
  categories: [
    'Reference',
    'Color',
    'Type, shape and depth',
    'Motion and utilities'
  ]
}

export const WIDGETS: Catalogue = { route: '/roadie-widgets', categories: [] }

const APP_DIR = join(process.cwd(), 'src/app')

// Matches both `metadata = {` and `metadata: Metadata = {`.
export const METADATA_RE =
  /export const metadata(?:\s*:\s*[\w.]+)?\s*=\s*({[\s\S]*?})/m

type PageMetadata = Record<string, unknown> & {
  title?: string
  description?: string
  category?: string
  order?: number
  hidden?: boolean
}

/** A page's `metadata`: undefined when the file is missing, null when it has none. */
export async function readPageMetadata(
  path: string
): Promise<PageMetadata | null | undefined> {
  let content: string
  try {
    content = await readFile(path, 'utf-8')
  } catch {
    return undefined
  }
  const match = content.match(METADATA_RE)
  if (!match) {
    // Only a page that declares metadata but fails to match is an error.
    if (content.includes('export const metadata')) {
      console.error(`No metadata match for ${path}`)
    }
    return null
  }
  try {
    return new Function(`return ${match[1]}`)()
  } catch {
    console.error(`Error parsing metadata for ${path}`)
    return null
  }
}

async function readEntry(
  route: string,
  name: string
): Promise<CatalogueEntry | null> {
  for (const file of ['page.mdx', 'page.tsx']) {
    const metadata = await readPageMetadata(join(APP_DIR, route, name, file))
    if (metadata === undefined) continue
    if (metadata?.hidden) return null
    return {
      name,
      href: `${route}/${name}`,
      title: metadata?.title ?? name,
      description: metadata?.description ?? '',
      category: metadata?.category ?? 'Other',
      order: metadata?.order
    }
  }
  return null
}

async function overviewHref(
  route: string,
  category: string
): Promise<string | undefined> {
  const slug = category.toLowerCase()
  try {
    await access(join(APP_DIR, route, slug, 'page.mdx'))
    return `${route}/${slug}`
  } catch {
    return undefined
  }
}

/** A catalogue's visible pages, grouped in its category order and sorted by `order`, then title, within. */
export async function getCatalogue({
  route,
  categories
}: Catalogue): Promise<CatalogueCategory[]> {
  const dirs = await readdir(join(APP_DIR, route), { withFileTypes: true })
  const entries = (
    await Promise.all(
      dirs
        .filter((dir) => dir.isDirectory())
        .map((dir) => readEntry(route, dir.name))
    )
  ).filter((entry) => entry !== null)

  const rank = (category: string) => {
    const index = categories.indexOf(category)
    return index === -1 ? categories.length : index
  }
  entries.sort(
    (a, b) =>
      rank(a.category) - rank(b.category) ||
      a.category.localeCompare(b.category) ||
      (a.order ?? Infinity) - (b.order ?? Infinity) ||
      a.title.localeCompare(b.title)
  )

  const groups: CatalogueCategory[] = []
  for (const entry of entries) {
    const last = groups.at(-1)
    if (last?.name === entry.category) last.entries.push(entry)
    else groups.push({ name: entry.category, entries: [entry] })
  }
  await Promise.all(
    groups.map(async (group) => {
      group.overviewHref = await overviewHref(route, group.name)
    })
  )
  return groups
}

export const countEntries = (categories: CatalogueCategory[]) =>
  categories.reduce((total, { entries }) => total + entries.length, 0)

async function collectPageTitle(
  dir: string,
  route: string,
  out: Record<string, string>
): Promise<void> {
  for (const file of ['page.mdx', 'page.tsx']) {
    const metadata = await readPageMetadata(join(dir, file))
    if (metadata === undefined) continue
    if (metadata?.title) out[route] = metadata.title
    return
  }
}

async function walkPageTitles(
  dir: string,
  route: string,
  out: Record<string, string>
): Promise<void> {
  await collectPageTitle(dir, route, out)
  const entries = await readdir(dir, { withFileTypes: true })
  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        walkPageTitles(
          join(dir, entry.name),
          `${route === '/' ? '' : route}/${entry.name}`,
          out
        )
      )
  )
}

/** Route → `metadata.title` for every page; the header's title, never the nav's shortened label. */
export async function getPageTitles(): Promise<Record<string, string>> {
  const titles: Record<string, string> = {}
  await walkPageTitles(APP_DIR, '/', titles)
  return titles
}
