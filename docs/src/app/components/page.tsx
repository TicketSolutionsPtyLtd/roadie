import Link from 'next/link'

import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

import { Heading, Text } from '@oztix/roadie-components'

type ComponentMetadata = {
  name: string
  title: string
  description: string
  status: string
  category: string
}

type CategorizedComponents = {
  [key: string]: ComponentMetadata[]
}

export async function generateStaticParams() {
  return []
}

export default async function ComponentsPage() {
  const componentsDir = join(process.cwd(), 'src/app/components')
  const entries = await readdir(componentsDir, { withFileTypes: true })

  const components = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (dir) => {
        try {
          const mdxPath = join(componentsDir, dir.name, 'page.mdx')
          const content = await readFile(mdxPath, 'utf-8')

          const metadataMatch = content.match(
            /export const metadata = ({[\s\S]*?})/m
          )
          let metadata = {
            title: dir.name,
            description: '',
            status: 'unknown',
            category: 'Other',
          }

          if (metadataMatch) {
            try {
              const parseMetadata = new Function(`return ${metadataMatch[1]}`)
              const evalMetadata = parseMetadata()
              metadata = { ...metadata, ...evalMetadata }
            } catch (e) {
              console.error(`Error parsing metadata for ${dir.name}:`, e)
            }
          }

          return { name: dir.name, ...metadata }
        } catch (e) {
          console.error(`Error processing ${dir.name}:`, e)
          return {
            name: dir.name,
            title: dir.name,
            description: '',
            status: 'unknown',
            category: 'Other',
          }
        }
      })
  )

  const categorizedComponents = components.reduce((acc, component) => {
    const category = component.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(component)
    return acc
  }, {} as CategorizedComponents)

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <Heading as="h1" size="4xl">Components</Heading>
        <Text emphasis="subtle" size="xl">
          A collection of components built with Base UI and styled with Tailwind CSS.
        </Text>
      </div>

      {Object.entries(categorizedComponents).map(([category, components]) => (
        <div key={category} className="flex flex-col gap-4">
          <Heading as="h2" size="2xl">{category}</Heading>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {components.map((component) => (
              <Link
                key={component.name}
                href={`/components/${component.name}`}
                className="p-4 rounded-md flex flex-col gap-2 bg-neutral-1 border border-neutral-7 hover:bg-neutral-3 transition-colors no-underline"
              >
                <Heading as="h3" size="lg">{component.title}</Heading>
                <Text emphasis="subtle">{component.description}</Text>
                <Text
                  size="sm"
                  emphasis="strong"
                  intent={
                    component.status === 'stable'
                      ? 'success'
                      : component.status === 'beta'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {component.status}
                </Text>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
