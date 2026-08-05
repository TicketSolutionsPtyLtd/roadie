import { access, readFile, readdir } from 'fs/promises'
import { join } from 'path'

export type ComponentSummary = {
  name: string
  title: string
  description: string
  category: string
}

export type ComponentCategory = {
  name: string
  components: ComponentSummary[]
  /** Route of the category's overview page, when `{category-slug}/page.mdx` exists. */
  overviewHref?: string
}

export const CATEGORY_ORDER = [
  'Actions',
  'Forms',
  'Navigation',
  'Overlays',
  'Content',
  'Typography',
  'Layout'
]

const COMPONENTS_DIR = join(process.cwd(), 'src/app/components')
const APP_DIR = join(process.cwd(), 'src/app')

// Pages write either `export const metadata = {` or, in TypeScript,
// `export const metadata: Metadata = {`. Both have to match, or a page
// silently resolves no title.
const METADATA_RE =
  /export const metadata(?:\s*:\s*[\w.]+)?\s*=\s*({[\s\S]*?})/m

async function readMetadata(dir: string): Promise<ComponentSummary | null> {
  for (const file of ['page.mdx', 'page.tsx']) {
    try {
      const content = await readFile(join(COMPONENTS_DIR, dir, file), 'utf-8')
      const match = content.match(METADATA_RE)
      const fallback = {
        name: dir,
        title: dir,
        description: '',
        category: 'Other'
      }
      if (!match) return fallback
      try {
        const parsed = new Function(`return ${match[1]}`)()
        if (parsed.hidden) return null
        return { ...fallback, ...parsed, name: dir }
      } catch {
        console.error(`Error parsing metadata for ${dir}`)
        return fallback
      }
    } catch {
      // Try the next filename.
    }
  }
  return null
}

/** Every visible component, sorted by category order then title. */
export async function getComponentManifest(): Promise<ComponentSummary[]> {
  const entries = await readdir(COMPONENTS_DIR, { withFileTypes: true })
  const components = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readMetadata(entry.name))
  )

  return components
    .filter((component): component is ComponentSummary => component !== null)
    .sort((a, b) => {
      const order = categoryRank(a.category) - categoryRank(b.category)
      return order !== 0 ? order : a.title.localeCompare(b.title)
    })
}

async function collectPageTitle(
  dir: string,
  route: string,
  out: Record<string, string>
): Promise<void> {
  // `.mdx` first: if a route somehow had both, the authored content page
  // wins. In practice this never happens — Next.js App Router forbids both
  // a `page.mdx` and a `page.tsx` in the same route directory — so the loop
  // is defensive, not load-bearing.
  for (const file of ['page.mdx', 'page.tsx']) {
    let content: string
    try {
      content = await readFile(join(dir, file), 'utf-8')
    } catch {
      continue // No page of this kind in this directory.
    }
    const match = content.match(METADATA_RE)
    if (!match) {
      // A page with no `metadata` export at all (the homepage's own
      // in-body `<h1>`, the `/debug/*` routes) is normal and expected —
      // silent. But a page that *does* declare `export const metadata`
      // and still fails to match is the real failure: the pane header
      // renders this title as the page's only `<h1>`, so a miss there
      // means the page silently ships with no heading at all. Shout only
      // for that case, or the warning fires on every render of the known
      // exceptions and trains readers to ignore it.
      if (content.includes('export const metadata')) {
        console.error(`No metadata match for ${route}`)
      }
      return
    }
    try {
      const parsed = new Function(`return ${match[1]}`)()
      if (parsed.title) out[route] = parsed.title
    } catch {
      console.error(`Error parsing metadata for ${route}`)
    }
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

/**
 * Route → page title, sourced from every page's own `metadata.title`, `.mdx`
 * and `.tsx` alike across the whole site — not just `/components/*`. This is
 * the header's source of truth: the nav rail can shorten a label for its own
 * row (see the hardcoded 'Overview' rows in `layout.tsx`), but the page
 * heading must not silently inherit that shortening.
 */
export async function getPageTitles(): Promise<Record<string, string>> {
  const titles: Record<string, string> = {}
  await walkPageTitles(APP_DIR, '/', titles)
  return titles
}

const categoryRank = (category: string) => {
  const index = CATEGORY_ORDER.indexOf(category)
  return index === -1 ? CATEGORY_ORDER.length : index
}

async function categoryOverviewHref(
  categoryName: string
): Promise<string | undefined> {
  const slug = categoryName.toLowerCase()
  try {
    await access(join(COMPONENTS_DIR, slug, 'page.mdx'))
    return `/components/${slug}`
  } catch {
    return undefined
  }
}

/** The same list, grouped — the shape the secondary pane declares from. */
export async function groupByCategory(
  components: ComponentSummary[]
): Promise<ComponentCategory[]> {
  const groups: ComponentCategory[] = []
  for (const component of components) {
    const name = component.category || 'Other'
    const existing = groups.find((group) => group.name === name)
    if (existing) existing.components.push(component)
    else groups.push({ name, components: [component] })
  }
  await Promise.all(
    groups.map(async (group) => {
      group.overviewHref = await categoryOverviewHref(group.name)
    })
  )
  return groups
}
