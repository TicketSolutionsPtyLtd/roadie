import Link from 'next/link'

import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

import { Heading, Text, View } from '@oztix/roadie-components'

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
          const metadataMatch = content.match(
            /export const metadata = ({[\s\S]*?})/m
          )
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
      <View gap='300'>
        <Heading as='h1' textStyle='display.prose.1'>
          Components
        </Heading>
        <Text emphasis='subtle' textStyle='prose.lead' fontSize='xl'>
          A collection of components built with Ark UI and styled with PandaCSS.
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
              <View
                key={component.name}
                as={Link}
                href={`/components/${component.name}`}
                padding='300'
                borderRadius='md'
                gap='200'
                backgroundColor='neutral.surface.raised'
                borderWidth='1px'
                borderStyle='solid'
                borderColor='neutral.border.subtle'
                _hover={{
                  backgroundColor: 'neutral.surface.raised.hover'
                }}
              >
                <Heading as='h3' textStyle='display.prose.4'>
                  {component.title}
                </Heading>
                <Text emphasis='subtle'>{component.description}</Text>
                <Text
                  textStyle='ui.meta'
                  emphasis='strong'
                  colorPalette={
                    component.status === 'stable'
                      ? 'success'
                      : component.status === 'beta'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {component.status}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}
