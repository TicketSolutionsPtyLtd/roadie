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

// Matches both `metadata = {` and `metadata: Metadata = {`.
export const METADATA_RE =
  /export const metadata(?:\s*:\s*[\w.]+)?\s*=\s*({[\s\S]*?})/m

type PageMetadata = Record<string, unknown> & {
  title?: string
  description?: string
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

async function readMetadata(dir: string): Promise<ComponentSummary | null> {
  for (const file of ['page.mdx', 'page.tsx']) {
    const metadata = await readPageMetadata(join(COMPONENTS_DIR, dir, file))
    if (metadata === undefined) continue
    if (metadata?.hidden) return null
    return {
      title: dir,
      description: '',
      category: 'Other',
      ...metadata,
      name: dir
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
