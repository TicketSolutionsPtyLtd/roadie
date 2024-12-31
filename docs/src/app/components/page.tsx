import Link from 'next/link'

import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

import { Heading, Text, View } from '@oztix/roadie-components'
import { css } from '@oztix/roadie-core/css'

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

          // Extract metadata from the file
          const metadataMatch = content.match(/export const metadata = ({[\s\S]*?})/m)
          let metadata = {
            title: dir.name,
            description: '',
            status: 'unknown',
            category: 'Other'
          }

          if (metadataMatch) {
            try {
              // Safely evaluate the metadata object
              const evalMetadata = eval(`(${metadataMatch[1]})`)
              metadata = { ...metadata, ...evalMetadata }
            } catch (e) {
              console.error(`Error parsing metadata for ${dir.name}:`, e)
            }
          }

          return {
            name: dir.name,
            ...metadata
          }
        } catch (e) {
          console.error(`Error processing ${dir.name}:`, e)
          return {
            name: dir.name,
            title: dir.name,
            description: '',
            status: 'unknown',
            category: 'Other'
          }
        }
      })
  )

  // Group components by category
  const categorizedComponents = components.reduce((acc, component) => {
    const category = component.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(component)
    return acc
  }, {} as CategorizedComponents)

  return (
    <View gap='600'>
      <View>
        <Heading as='h1'>Components</Heading>
        <Text color='fg.subtle'>
          A collection of components built with React Aria Components and styled with PandaCSS.
        </Text>
      </View>

      {Object.entries(categorizedComponents).map(([category, components]) => (
        <View key={category} gap='300'>
          <Heading as='h2' textStyle='display.prose.2'>
            {category}
          </Heading>
          <View
            display='grid'
            gridTemplateColumns={{
              base: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)'
            }}
            gap='300'
          >
            {components.map((component) => (
              <Link
                key={component.name}
                href={`/components/${component.name}`}
                className={css({
                  textDecoration: 'none',
                  color: 'fg',
                  _hover: {
                    textDecoration: 'none'
                  }
                })}
              >
                <View
                  backgroundColor='bg.subtle'
                  padding='300'
                  borderRadius='100'
                  gap='200'
                  borderWidth='1px'
                  borderStyle='solid'
                  borderColor='border.subtle'
                  _hover={{
                    backgroundColor: 'bg.subtle.hovered'
                  }}
                >
                  <Heading as='h3' textStyle='display.prose.3'>
                    {component.title}
                  </Heading>
                  <Text color='fg.subtle'>{component.description}</Text>
                  <Text
                    textStyle='ui.small'
                    color={
                      component.status === 'stable'
                        ? 'fg.success'
                        : component.status === 'beta'
                          ? 'fg.warning'
                          : 'fg.subtle'
                    }
                  >
                    {component.status}
                  </Text>
                </View>
              </Link>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}
