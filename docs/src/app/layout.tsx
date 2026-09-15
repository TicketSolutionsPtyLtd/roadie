import type { Metadata } from 'next'

import { readdir } from 'fs/promises'
import { join } from 'path'

import { DocsNavigator } from '@/components/Navigation'
import { Providers } from '@/components/Providers'
import {
  type ComponentCategory,
  getComponentManifest,
  getPageTitles,
  groupByCategory,
  readPageMetadata
} from '@/lib/component-manifest'
import { getAssetPath } from '@/utils/getAssetPath'

import { getNavigatorExpandedScript } from '@oztix/roadie-core/navigator'
import { getThemeScript } from '@oztix/roadie-core/theme'

import './globals.css'

async function getNavigationItems(categories: ComponentCategory[]) {
  const foundationsDir = join(process.cwd(), 'src/app/foundations')
  const overviewDir = join(process.cwd(), 'src/app/overview')
  const tokensDir = join(process.cwd(), 'src/app/tokens')
  const widgetsDir = join(process.cwd(), 'src/app/roadie-widgets')

  const getMetadataFromFile = async (
    filePath: string,
    defaultTitle: string
  ) => {
    const metadata = await readPageMetadata(filePath)
    if (metadata === undefined) return null
    return {
      title: metadata?.title ?? defaultTitle,
      description: metadata?.description ?? ''
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

  const tokensReferenceMetadata = await getMetadataFromFile(
    join(tokensDir, 'reference/page.tsx'),
    'Reference'
  )

  const navigationItems: {
    title: string
    href: string
    items: {
      title: string
      href?: string
      description?: string
    }[]
  }[] = [
    {
      title: 'Home',
      href: '/',
      items: [
        {
          // Hardcoded: the page's metadata.title is the header's concern.
          title: 'Installation',
          href: '/overview/getting-started',
          description: gettingStartedMetadata?.description
        },
        {
          title: philosophyMetadata?.title ?? 'Philosophy',
          href: '/overview/philosophy',
          description: philosophyMetadata?.description
        },
        {
          title: vueIntegrationMetadata?.title ?? 'Vue integration',
          href: '/overview/vue-integration',
          description: vueIntegrationMetadata?.description
        },
        {
          title: 'Changelog',
          href: 'https://github.com/ticketsolutionsptyltd/roadie/blob/main/packages/components/CHANGELOG.md',
          description: 'Every release, on GitHub.'
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

  navigationItems.push({
    title: 'Components',
    href: '/components',
    items: [
      { title: 'Overview', href: '/components' },
      ...categories.flatMap((category) => [
        ...(category.overviewHref
          ? [{ title: category.name, href: category.overviewHref }]
          : []),
        ...category.components.map((component) => ({
          title: component.title,
          href: `/components/${component.name}`
        }))
      ])
    ]
  })

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
          // Hardcoded: the page's metadata.title is the header's concern.
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
  const componentCategories = await groupByCategory(
    await getComponentManifest()
  )
  const items = await getNavigationItems(componentCategories)
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
