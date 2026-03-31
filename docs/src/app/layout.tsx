import type { Metadata } from 'next'

import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

import { FooterNav } from '@/components/FooterNav'
import { Navigation } from '@/components/Navigation'
import { getAssetPath } from '@/utils/getAssetPath'

import './globals.css'

interface ComponentMetadata {
  name: string
  title: string
  description: string
  status: string
  category: string
}

async function getNavigationItems() {
  const componentsDir = join(process.cwd(), 'src/app/components')
  const foundationsDir = join(process.cwd(), 'src/app/foundations')
  const overviewDir = join(process.cwd(), 'src/app/overview')
  const tokensDir = join(process.cwd(), 'src/app/tokens')

  async function getMetadataFromFile(
    filePath: string,
    defaultTitle: string
  ): Promise<{ title: string; description: string } | null> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const metadataMatch = content.match(
        /export const metadata = ({[\s\S]*?})/m
      )

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

  const gettingStartedMetadata = await getMetadataFromFile(
    join(overviewDir, 'getting-started/page.mdx'),
    'Getting Started'
  )

  const foundationEntries = await readdir(foundationsDir, {
    withFileTypes: true,
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
              href: `/foundations/${dir.name}`,
            }
          }
          return {
            title: metadata.title,
            href: `/foundations/${dir.name}`,
          }
        })
    )
  ).filter((page): page is { title: string; href: string } => page !== null)

  const entries = await readdir(componentsDir, { withFileTypes: true })
  const components = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (dir) => {
        try {
          const mdxPath = join(componentsDir, dir.name, 'page.mdx')
          const tsxPath = join(componentsDir, dir.name, 'page.tsx')

          let content: string
          try {
            content = await readFile(mdxPath, 'utf-8')
          } catch {
            try {
              content = await readFile(tsxPath, 'utf-8')
            } catch {
              return null
            }
          }

          const metadataMatch = content.match(
            /export const metadata = ({[\s\S]*?})/m
          )
          let metadata: ComponentMetadata = {
            name: dir.name,
            title: dir.name,
            description: '',
            status: 'unknown',
            category: 'Other',
          }

          if (metadataMatch) {
            try {
              const evalMetadata = eval(`(${metadataMatch[1]})`)
              metadata = { ...metadata, ...evalMetadata }
            } catch {
              console.error(`Error parsing metadata for ${dir.name}`)
            }
          }

          return metadata
        } catch {
          return null
        }
      })
  )

  const validComponents = components.filter(
    (comp): comp is ComponentMetadata => comp !== null
  )

  const indexMetadata = await getMetadataFromFile(
    join(process.cwd(), 'src/app/page.mdx'),
    'Introduction'
  )

  const tokensMetadata = await getMetadataFromFile(
    join(tokensDir, 'page.mdx'),
    'Design Tokens'
  )
  const tokensReferenceMetadata = await getMetadataFromFile(
    join(tokensDir, 'reference/page.tsx'),
    'Reference'
  )

  const navigationItems = [
    {
      title: 'Overview',
      href: '/',
      items: [
        indexMetadata
          ? { title: indexMetadata.title, href: '/' }
          : { title: 'Introduction', href: '/' },
        gettingStartedMetadata
          ? {
              title: gettingStartedMetadata.title,
              href: '/overview/getting-started',
            }
          : { title: 'Getting Started', href: '/overview/getting-started' },
        {
          title: 'Changelog',
          href: 'https://github.com/ticketsolutionsptyltd/roadie/blob/main/packages/components/CHANGELOG.md',
        },
      ],
    },
  ]

  if (foundationPages.length > 0) {
    navigationItems.push({
      title: 'Foundations',
      href: '/foundations',
      items: foundationPages,
    })
  }

  navigationItems.push({
    title: 'Tokens',
    href: '/tokens',
    items: [
      {
        title: tokensMetadata?.title || 'Overview',
        href: '/tokens',
      },
      {
        title: tokensReferenceMetadata?.title || 'Reference',
        href: '/tokens/reference',
      },
    ],
  })

  if (validComponents.length > 0) {
    navigationItems.push({
      title: 'Components',
      href: '/components',
      items: [
        {
          title: 'Overview',
          href: '/components',
        },
        ...validComponents
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((comp) => ({
            title: comp.title,
            href: `/components/${comp.name}`,
          })),
      ],
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
    apple: getAssetPath('/favicon.png'),
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const items = await getNavigationItems()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme =
                  localStorage.getItem('theme') ||
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                document.documentElement.classList.toggle('dark', theme === 'dark')
                window.__theme = theme
              } catch {}
            `,
          }}
        />
      </head>
      <body className="overflow-x-hidden">
        <div className="min-h-screen max-w-[100vw] flex flex-row">
          <Navigation items={items} />
          <main className="flex-1 px-4 md:px-8 lg:px-12 py-4 md:py-12 lg:py-20 max-w-4xl mx-auto">
            {children}
            <FooterNav items={items} />
          </main>
        </div>
      </body>
    </html>
  )
}
