import type { Metadata } from 'next'

import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

import { DocsNavigator } from '@/components/Navigation'
import { Providers } from '@/components/Providers'
import {
  METADATA_RE,
  getComponentManifest,
  getPageTitles,
  groupByCategory
} from '@/lib/component-manifest'
import { getAssetPath } from '@/utils/getAssetPath'

import { getNavigatorExpandedScript } from '@oztix/roadie-core/navigator'
import { getThemeScript } from '@oztix/roadie-core/theme'

import './globals.css'

async function getNavigationItems() {
  const foundationsDir = join(process.cwd(), 'src/app/foundations')
  const overviewDir = join(process.cwd(), 'src/app/overview')
  const tokensDir = join(process.cwd(), 'src/app/tokens')
  const widgetsDir = join(process.cwd(), 'src/app/roadie-widgets')

  async function getMetadataFromFile(
    filePath: string,
    defaultTitle: string
  ): Promise<{ title: string; description: string } | null> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const metadataMatch = content.match(METADATA_RE)

      if (metadataMatch) {
        try {
          return eval(`(${metadataMatch[1]})`)
        } catch {
          console.error(`Error parsing metadata for ${filePath}`)
        }
      }
      return { title: defaultTitle, description: '' }
    } catch {
      return null
    }
  }

  const philosophyMetadata = await getMetadataFromFile(
    join(overviewDir, 'philosophy/page.mdx'),
    'Philosophy'
  )

  const gettingStartedMetadata = await getMetadataFromFile(
    join(overviewDir, 'getting-started/page.mdx'),
    'Getting Started'
  )

  const vueIntegrationMetadata = await getMetadataFromFile(
    join(overviewDir, 'vue-integration/page.mdx'),
    'Vue Integration'
  )

  const foundationEntries = await readdir(foundationsDir, {
    withFileTypes: true
  })
  const foundationPages = (
    await Promise.all(
      foundationEntries
        .filter((entry) => entry.isDirectory())
        .map(async (dir) => {
          const metadata = await getMetadataFromFile(
            join(foundationsDir, dir.name, 'page.mdx'),
            dir.name
          )
          if (!metadata) {
            const tsxMetadata = await getMetadataFromFile(
              join(foundationsDir, dir.name, 'page.tsx'),
              dir.name
            )
            if (!tsxMetadata) return null
            return {
              title: tsxMetadata.title,
              href: `/foundations/${dir.name}`
            }
          }
          return {
            title: metadata.title,
            href: `/foundations/${dir.name}`
          }
        })
    )
  ).filter((page): page is { title: string; href: string } => page !== null)

  const validComponents = await getComponentManifest()

  const tokensReferenceMetadata = await getMetadataFromFile(
    join(tokensDir, 'reference/page.tsx'),
    'Reference'
  )

  const navigationItems: {
    title: string
    href: string
    items: { title: string; href?: string; label?: boolean }[]
  }[] = [
    {
      title: 'Get started',
      href: '/get-started',
      items: [
        philosophyMetadata
          ? {
              title: philosophyMetadata.title,
              href: '/overview/philosophy'
            }
          : { title: 'Philosophy', href: '/overview/philosophy' },
        gettingStartedMetadata
          ? {
              title: gettingStartedMetadata.title,
              href: '/overview/getting-started'
            }
          : { title: 'Getting Started', href: '/overview/getting-started' },
        vueIntegrationMetadata
          ? {
              title: vueIntegrationMetadata.title,
              href: '/overview/vue-integration'
            }
          : {
              title: 'Vue Integration',
              href: '/overview/vue-integration'
            },
        {
          title: 'Migrating to v2',
          href: '/migration'
        },
        {
          title: 'Changelog',
          href: 'https://github.com/ticketsolutionsptyltd/roadie/blob/main/packages/components/CHANGELOG.md'
        }
      ]
    }
  ]

  if (foundationPages.length > 0) {
    navigationItems.push({
      title: 'Foundations',
      href: '/foundations',
      items: foundationPages
    })
  }

  navigationItems.push({
    title: 'Tokens',
    href: '/tokens',
    items: [
      {
        // Hardcoded: the page's metadata.title is the header's concern.
        title: 'Overview',
        href: '/tokens'
      },
      {
        title: tokensReferenceMetadata?.title || 'Reference',
        href: '/tokens/reference'
      }
    ]
  })

  if (validComponents.length > 0) {
    const sortedCategories = await groupByCategory(validComponents)

    const componentItems: { title: string; href?: string; label?: boolean }[] =
      [{ title: 'Overview', href: '/components' }]

    for (const { name: category, components: comps } of sortedCategories) {
      const categorySlug = category.toLowerCase()
      const overviewPath = join(
        process.cwd(),
        `src/app/components/${categorySlug}/page.mdx`
      )
      let hasOverview = false
      try {
        await readFile(overviewPath)
        hasOverview = true
      } catch {
        // No overview page for this category
      }

      if (hasOverview) {
        componentItems.push({
          title: category,
          href: `/components/${categorySlug}`
        })
      }
      for (const comp of comps.sort((a, b) => a.title.localeCompare(b.title))) {
        componentItems.push({
          title: comp.title,
          href: `/components/${comp.name}`
        })
      }
    }

    navigationItems.push({
      title: 'Components',
      href: '/components',
      items: componentItems
    })
  }

  let widgetPages: { title: string; href: string }[] = []
  try {
    const widgetEntries = await readdir(widgetsDir, { withFileTypes: true })
    widgetPages = (
      await Promise.all(
        widgetEntries
          .filter((entry) => entry.isDirectory())
          .map(async (dir) => {
            const metadata = await getMetadataFromFile(
              join(widgetsDir, dir.name, 'page.mdx'),
              dir.name
            )
            if (!metadata) return null
            return {
              title: metadata.title,
              href: `/roadie-widgets/${dir.name}`
            }
          })
      )
    ).filter((page): page is { title: string; href: string } => page !== null)
  } catch {
    // No widgets directory yet
  }

  if (widgetPages.length > 0) {
    navigationItems.push({
      title: 'Widgets',
      href: '/roadie-widgets',
      items: [
        {
          // Hardcoded, like the Tokens and Components overview rows — the
          // page's own metadata.title ('Widgets') is the header's concern.
          title: 'Overview',
          href: '/roadie-widgets'
        },
        ...widgetPages.sort((a, b) => a.title.localeCompare(b.title))
      ]
    })
  }

  return navigationItems
}

export const metadata: Metadata = {
  title: 'Roadie Design System',
  description:
    'A comprehensive collection of reusable components for building consistent user interfaces across Oztix applications.',
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
  const items = await getNavigationItems()
  const componentCategories = await groupByCategory(
    await getComponentManifest()
  )
  const pageTitles = await getPageTitles()

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
          <DocsNavigator
            items={items}
            componentCategories={componentCategories}
            pageTitles={pageTitles}
          >
            {children}
          </DocsNavigator>
        </Providers>
      </body>
    </html>
  )
}
