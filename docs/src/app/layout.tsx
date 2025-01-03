import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

import { FooterNav } from '@/components/FooterNav'
import { Navigation } from '@/components/Navigation'

import { View } from '@oztix/roadie-components'
import { css } from '@oztix/roadie-core/css'

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

  // Helper function to read metadata from MDX files
  async function getMetadataFromFile(
    filePath: string,
    defaultTitle: string
  ): Promise<{ title: string; description: string } | null> {
    try {
      const content = await readFile(filePath, 'utf-8')
      const metadataMatch = content.match(/export const metadata = ({[\s\S]*?})/m)

      if (metadataMatch) {
        try {
          // eslint-disable-next-line no-eval
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

  // Get overview pages metadata
  const gettingStartedMetadata = await getMetadataFromFile(
    join(overviewDir, 'getting-started/page.mdx'),
    'Getting Started'
  )

  // Get foundations pages metadata
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
          // If MDX file doesn't exist or has no metadata, try TSX file
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

  // Get component pages metadata
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

          const metadataMatch = content.match(/export const metadata = ({[\s\S]*?})/m)
          let metadata: ComponentMetadata = {
            name: dir.name,
            title: dir.name,
            description: '',
            status: 'unknown',
            category: 'Other'
          }

          if (metadataMatch) {
            try {
              // eslint-disable-next-line no-eval
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

  const validComponents = components.filter((comp): comp is ComponentMetadata => comp !== null)

  // Get index page metadata
  const indexMetadata = await getMetadataFromFile(
    join(process.cwd(), 'src/app/page.mdx'),
    'Introduction'
  )

  // Get tokens pages metadata
  const tokensMetadata = await getMetadataFromFile(join(tokensDir, 'page.mdx'), 'Design Tokens')
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
              href: '/overview/getting-started'
            }
          : { title: 'Getting Started', href: '/overview/getting-started' },
        {
          title: 'Changelog',
          href: 'https://github.com/ticketsolutionsptyltd/roadie/blob/main/CHANGELOG.md'
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

  // Add tokens section
  navigationItems.push({
    title: 'Tokens',
    href: '/tokens',
    items: [
      {
        title: tokensMetadata?.title || 'Overview',
        href: '/tokens'
      },
      {
        title: tokensReferenceMetadata?.title || 'Reference',
        href: '/tokens/reference'
      }
    ]
  })

  if (validComponents.length > 0) {
    navigationItems.push({
      title: 'Components',
      href: '/components',
      items: [
        {
          title: 'Overview',
          href: '/components'
        },
        ...validComponents
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((comp) => ({
            title: comp.title,
            href: `/components/${comp.name}`
          }))
      ]
    })
  }

  return navigationItems
}

export const metadata = {
  title: 'Roadie Design System',
  description:
    'A comprehensive collection of reusable components for building consistent user interfaces across Oztix applications.'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const items = await getNavigationItems()

  return (
    <html lang='en'>
      <body
        className={css({
          overflowX: 'hidden'
        })}
      >
        <View minH='screen' maxW='100vw' flexDirection='row'>
          <Navigation items={items} />
          <View
            as='main'
            flex='1'
            px={{ base: '300', md: '500', lg: '600' }}
            py={{ base: '300', md: '600', lg: '1000' }}
            maxW='breakpoint-lg'
            mx='auto'
          >
            {children}
            <FooterNav items={items} />
          </View>
        </View>
      </body>
    </html>
  )
}
