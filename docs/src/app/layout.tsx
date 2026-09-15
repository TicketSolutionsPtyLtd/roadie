import type { Metadata } from 'next'

import { join } from 'path'

import {
  DocsNavigator,
  type NavigationItem,
  type NavigationSection
} from '@/components/Navigation'
import { Providers } from '@/components/Providers'
import { CHANGELOG_URL } from '@/lib/changelog'
import {
  COMPONENTS,
  type Catalogue,
  type CatalogueCategory,
  FOUNDATIONS,
  TOKENS,
  WIDGETS,
  getCatalogue,
  getPageTitles,
  readPageMetadata
} from '@/lib/page-manifest'
import { getAssetPath } from '@/utils/getAssetPath'

import { getNavigatorExpandedScript } from '@oztix/roadie-core/navigator'
import { getThemeScript } from '@oztix/roadie-core/theme'

import './globals.css'

async function guide(href: string, file: string): Promise<NavigationItem> {
  const metadata = await readPageMetadata(join(process.cwd(), 'src/app', file))
  return {
    title: metadata?.title ?? href,
    href,
    description: metadata?.description
  }
}

/** Flat items, in group order, for `FooterNav`'s previous and next links. */
const flatten = (route: string, groups: CatalogueCategory[]) => [
  { title: 'Overview', href: route },
  ...groups.flatMap((group) => [
    ...(group.overviewHref
      ? [{ title: group.name, href: group.overviewHref }]
      : []),
    ...group.entries.map(({ title, href }) => ({ title, href }))
  ])
]

async function catalogueSection(
  title: string,
  catalogue: Catalogue,
  options: Pick<NavigationSection, 'root' | 'searchable'> = {}
): Promise<NavigationSection> {
  const groups = await getCatalogue(catalogue)
  return {
    title,
    href: catalogue.route,
    items: flatten(catalogue.route, groups),
    groups,
    ...options
  }
}

async function getNavigationItems(): Promise<NavigationSection[]> {
  return [
    {
      title: 'Home',
      href: '/',
      root: 'page',
      items: await Promise.all([
        guide('/overview/getting-started', 'overview/getting-started/page.mdx'),
        guide('/overview/philosophy', 'overview/philosophy/page.mdx'),
        guide('/overview/vue-integration', 'overview/vue-integration/page.mdx'),
        {
          title: 'Changelog',
          href: CHANGELOG_URL,
          description: 'Every release, on GitHub.'
        }
      ])
    },
    await catalogueSection('Foundations', FOUNDATIONS, { root: 'page' }),
    await catalogueSection('Tokens', TOKENS, { root: 'page' }),
    await catalogueSection('Components', COMPONENTS, {
      root: 'page',
      searchable: true
    }),
    {
      title: 'Widgets',
      href: WIDGETS.route,
      items: flatten(WIDGETS.route, await getCatalogue(WIDGETS))
    }
  ]
}

export const metadata: Metadata = {
  title: 'Roadie Design System',
  description:
    'Tokens, foundations, React components and Vue widgets for building consistent, accessible Oztix apps.',
  icons: {
    icon: getAssetPath('/favicon.png'),
    apple: getAssetPath('/favicon.png')
  }
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [items, pageTitles] = await Promise.all([
    getNavigationItems(),
    getPageTitles()
  ])

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <meta name='color-scheme' content='light' />
        <script
          dangerouslySetInnerHTML={{
            __html: getThemeScript({ followSystem: true })
          }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: getNavigatorExpandedScript() }}
        />
      </head>
      <body className='isolate'>
        <Providers>
          <DocsNavigator items={items} pageTitles={pageTitles}>
            {children}
          </DocsNavigator>
        </Providers>
      </body>
    </html>
  )
}
