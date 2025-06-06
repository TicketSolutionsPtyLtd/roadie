import type { Metadata } from 'next'

import { access, readFile, readdir } from 'fs/promises'
import { join } from 'path'

import { FooterNav } from '@/components/FooterNav'
import { Navigation } from '@/components/Navigation'
import { getAssetPath } from '@/utils/getAssetPath'

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

interface NavItem {
  title: string
  href: string
}

interface NavSection {
  title: string
  href: string
  items: NavItem[]
}

// Helper function to check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

// Helper function to extract metadata object from file content
function extractMetadataObject(content: string): Record<string, string> | null {
  const metadataStart = content.indexOf('export const metadata = {')
  if (metadataStart === -1) return null

  let braceCount = 0
  let metadataEnd = -1
  for (
    let i = metadataStart + 'export const metadata = {'.length;
    i < content.length;
    i++
  ) {
    if (content[i] === '{') braceCount++
    else if (content[i] === '}') {
      if (braceCount === 0) {
        metadataEnd = i
        break
      }
      braceCount--
    }
  }

  if (metadataEnd === -1) return null

  try {
    const metadataString = content.substring(
      metadataStart + 'export const metadata = '.length,
      metadataEnd + 1
    )

    // Validate the metadata string before evaluation
    if (!/^\{[\s\S]*\}$/.test(metadataString)) {
      console.error('Invalid metadata object structure')
      return null
    }

    // Only allow specific properties in the metadata object
    const allowedProperties = ['title', 'description', 'status', 'category']
    const metadata = new Function('return ' + metadataString)()

    // Validate that all properties are strings
    for (const [key, value] of Object.entries(metadata)) {
      if (!allowedProperties.includes(key) || typeof value !== 'string') {
        console.error(`Invalid metadata property: ${key}`)
        return null
      }
    }

    return metadata
  } catch {
    return null
  }
}

// Helper function to read metadata from MDX/TSX files
async function getMetadataFromFile(
  filePath: string,
  defaultTitle: string,
  isComponent: boolean = false
): Promise<{
  title: string
  description: string
  status?: string
  category?: string
} | null> {
  if (!(await fileExists(filePath))) return null

  try {
    const content = await readFile(filePath, 'utf-8')
    const metadata = extractMetadataObject(content)

    if (!metadata) return { title: defaultTitle, description: '' }

    return {
      title: metadata.title || defaultTitle,
      description: metadata.description || '',
      ...(isComponent && {
        status: metadata.status || 'unknown',
        category: metadata.category || 'Other'
      })
    }
  } catch (e) {
    console.error(`Error reading file ${filePath}:`, e)
    return null
  }
}

// Helper function to get metadata from either MDX or TSX file
async function getMetadataFromFiles(
  mdxPath: string,
  tsxPath: string,
  defaultTitle: string,
  isComponent: boolean = false
) {
  const metadata = await getMetadataFromFile(mdxPath, defaultTitle, isComponent)
  if (metadata?.title) return metadata

  const tsxMetadata = await getMetadataFromFile(
    tsxPath,
    defaultTitle,
    isComponent
  )
  if (tsxMetadata?.title) return tsxMetadata

  return null
}

async function getNavigationItems(): Promise<NavSection[]> {
  const componentsDir = join(process.cwd(), 'src/app/components')
  const foundationsDir = join(process.cwd(), 'src/app/foundations')
  const overviewDir = join(process.cwd(), 'src/app/overview')
  const tokensDir = join(process.cwd(), 'src/app/tokens')

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
          const metadata = await getMetadataFromFiles(
            join(foundationsDir, dir.name, 'page.mdx'),
            join(foundationsDir, dir.name, 'page.tsx'),
            dir.name
          )
          if (!metadata?.title) return null
          return {
            title: metadata.title,
            href: `/foundations/${dir.name}`
          }
        })
    )
  ).filter((page): page is NavItem => page !== null)

  // Get component pages metadata
  const entries = await readdir(componentsDir, { withFileTypes: true })
  const components = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (dir) => {
        const metadata = await getMetadataFromFiles(
          join(componentsDir, dir.name, 'page.mdx'),
          join(componentsDir, dir.name, 'page.tsx'),
          dir.name,
          true
        )

        if (!metadata?.title) {
          return {
            name: dir.name,
            title: dir.name,
            description: '',
            status: 'unknown',
            category: 'Other'
          } as ComponentMetadata
        }

        return { ...metadata, name: dir.name } as ComponentMetadata
      })
  )

  const validComponents = components.filter(
    (comp): comp is ComponentMetadata => comp !== null
  )

  // Get index page metadata
  const indexMetadata = await getMetadataFromFile(
    join(process.cwd(), 'src/app/page.mdx'),
    'Introduction'
  )

  // Get tokens pages metadata
  const tokensMetadata = await getMetadataFromFile(
    join(tokensDir, 'page.mdx'),
    'Design Tokens'
  )
  const tokensReferenceMetadata = await getMetadataFromFile(
    join(tokensDir, 'reference/page.tsx'),
    'Reference'
  )

  const navigationItems: NavSection[] = [
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

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        {/*
          Inline theme script must run synchronously before any content loads
          to prevent flash of wrong theme. This script:
          1. Checks localStorage for saved theme preference
          2. Falls back to system color scheme preference
          3. Sets theme before any content is painted
        */}
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
            `
          }}
        />
      </head>
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
