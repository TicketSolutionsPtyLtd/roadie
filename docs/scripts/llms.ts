import type { TokenFamily } from '@roadie-core/tokens'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

import { cardSizeTable } from '../src/lib/card-sizes.ts'
import { DASHBOARD_EXAMPLES } from '../src/lib/dashboard-examples.ts'
import {
  type LlmsLink,
  type LlmsSection,
  type ManifestComponent,
  type TokenFamilyMarkdown,
  allTokensToMarkdown,
  dashboardExampleToMarkdown,
  linkLine,
  llmsIndex,
  markdownTable,
  pageToMarkdown,
  tokenFamilyToMarkdown
} from '../src/lib/llms.ts'
import {
  CATALOGUE_PAGES,
  CHARTS,
  COMPONENTS,
  type Catalogue,
  FOUNDATIONS,
  TOKENS,
  WIDGETS,
  getCatalogue,
  getMarkdownRoutes,
  readPageMetadata
} from '../src/lib/page-manifest.ts'
import {
  ALL_TOKENS_INTRO,
  TOKEN_FAMILY_PAGES
} from '../src/lib/token-families.ts'

const require = createRequire(import.meta.url)
const appDir = path.resolve('src/app')
const outDir = path.resolve('out')
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

type Manifest = { docs: string; components: ManifestComponent[] }
const manifests = [
  '@oztix/roadie-components',
  '@oztix/roadie-charts',
  '@oztix/roadie-widgets'
].map((pkg) => require(`${pkg}/roadie.manifest.json`) as Manifest)
const site = `${new URL(manifests[0]!.docs).origin}${basePath}`
const components = manifests.flatMap((manifest) => manifest.components)

const routes = await getMarkdownRoutes()
const markdownRoutes = new Set(routes)

const pageUrl = (route: string) =>
  markdownRoutes.has(route)
    ? `${site}${route}.md`
    : `${site}${route.replace(/\/$/, '')}/`

function resolveLink(href: string) {
  const [route = '', hash] = href.split('#')
  const url = pageUrl(route.replace(/\/+$/, '') || '/')
  return hash === undefined ? url : `${url}#${hash}`
}

const metadataOf = async (route: string) =>
  (await readPageMetadata(path.join(appDir, route, 'page.mdx'))) ??
  readPageMetadata(path.join(appDir, route, 'page.tsx'))

const { tokens } = JSON.parse(
  await readFile(
    require.resolve('../../packages/core/src/tokens/tokens.json'),
    'utf8'
  )
) as {
  tokens: (TokenFamilyMarkdown['tokens'][number] & { family: string })[]
}

const catalogueMarkdown: Record<string, string> = Object.fromEntries(
  await Promise.all(
    Object.entries(CATALOGUE_PAGES).map(async ([name, catalogue]) => [
      name,
      (await getCatalogue(catalogue))
        .map((group) =>
          [
            `## ${group.name}`,
            group.entries
              .map((entry) =>
                linkLine({
                  title: entry.title,
                  url: pageUrl(entry.href),
                  description: entry.description || undefined
                })
              )
              .join('\n')
          ].join('\n\n')
        )
        .join('\n\n')
    ])
  )
)

const renderers = {
  CardSizes: () => {
    const { head, rows } = cardSizeTable()
    return markdownTable(
      head,
      rows.map(({ size, spans, use }) => [
        `\`${size}\``,
        ...spans.map(String),
        use
      ])
    )
  },
  CatalogueIndex: ({ name }: Record<string, string | true>) => {
    if (typeof name !== 'string' || !Object.hasOwn(catalogueMarkdown, name))
      throw new Error(`<CatalogueIndex name="${name}"> names no catalogue`)
    return catalogueMarkdown[name]!
  }
}

function familyMarkdown(family: TokenFamily, description?: string) {
  const { title, intro, guidance } = TOKEN_FAMILY_PAGES[family]
  return {
    title,
    description,
    intro,
    guidance: guidance.map(({ title, href }) => ({
      title,
      url: resolveLink(href)
    })),
    tokens: tokens.filter((token) => token.family === family)
  }
}

async function markdownFor(route: string) {
  const metadata = await metadataOf(route)
  const title = metadata?.title ?? route
  const description = metadata?.description
  const family = metadata?.tokenFamily
  if (typeof family === 'string') {
    if (!Object.hasOwn(TOKEN_FAMILY_PAGES, family))
      throw new Error(`${route} names an unknown tokenFamily: ${family}`)
    return tokenFamilyToMarkdown({
      ...familyMarkdown(family as TokenFamily, description),
      title
    })
  }
  if (metadata?.allTokens) {
    return allTokensToMarkdown({
      title,
      description,
      intro: ALL_TOKENS_INTRO,
      families: (Object.keys(TOKEN_FAMILY_PAGES) as TokenFamily[]).map(
        (family) => familyMarkdown(family)
      )
    })
  }
  const example = metadata?.dashboardExample
  if (typeof example === 'string') {
    if (!Object.hasOwn(DASHBOARD_EXAMPLES, example))
      throw new Error(`${route} names an unknown dashboardExample: ${example}`)
    const { create, ...code } =
      DASHBOARD_EXAMPLES[example as keyof typeof DASHBOARD_EXAMPLES]
    return dashboardExampleToMarkdown({
      title,
      description,
      spec: create(),
      ...code
    })
  }
  return pageToMarkdown({
    title,
    description: metadata?.description,
    mdx: await readFile(path.join(appDir, route, 'page.mdx'), 'utf8'),
    components: components.filter((component) =>
      component.docs?.endsWith(`${route}/`)
    ),
    resolveLink,
    renderers
  })
}

for (const route of routes) {
  const md = await markdownFor(route)
  await mkdir(path.dirname(path.join(outDir, route)), { recursive: true })
  await writeFile(path.join(outDir, `${route}.md`), md)
}

async function link(route: string): Promise<LlmsLink> {
  const metadata = await metadataOf(route)
  return {
    title: metadata?.title ?? route,
    url: pageUrl(route),
    description: metadata?.description
  }
}

async function catalogueSection(
  name: string,
  catalogue: Catalogue
): Promise<LlmsSection> {
  const groups = await getCatalogue(catalogue)
  const links: LlmsLink[] = markdownRoutes.has(catalogue.route)
    ? [await link(catalogue.route)]
    : []
  for (const group of groups) {
    if (group.overviewHref) links.push(await link(group.overviewHref))
    for (const entry of group.entries) {
      if (entry.crossListedFrom || entry.href === group.overviewHref) continue
      links.push({
        title: entry.title,
        url: pageUrl(entry.href),
        description: entry.description || undefined
      })
    }
  }
  return { name, links }
}

const sections: LlmsSection[] = [
  {
    name: 'Guides',
    links: await Promise.all(
      routes
        .filter((route) => route.startsWith('/overview/'))
        .map((route) => link(route))
    )
  },
  await catalogueSection('Foundations', FOUNDATIONS),
  await catalogueSection('Components', COMPONENTS),
  await catalogueSection('Charts', CHARTS),
  await catalogueSection('Tokens', TOKENS),
  await catalogueSection('Widgets', WIDGETS)
]

await writeFile(
  path.join(outDir, 'llms.txt'),
  llmsIndex({
    title: 'Roadie',
    summary:
      'Roadie is Oztix’s design system: CSS tokens and utilities, React components, and charts, published as @oztix/roadie-core, @oztix/roadie-components, and @oztix/roadie-charts.',
    details: [
      `Links ending in \`.md\` are markdown versions of the docs pages, with each component’s props. The rest are HTML pages.`,
      'Import each component from its own subpath, such as `@oztix/roadie-components/button`. Style with Roadie’s semantic utilities and intents, never hardcoded colours or `dark:` variants.'
    ].join('\n\n'),
    sections
  })
)

console.log(`wrote llms.txt and ${routes.length} markdown pages for ${site}`)
