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

  return { components: categorizedComponents }
}

export default async function ComponentsPage() {
  const { components } = await generateStaticParams()

  return (
    <View as='main' gap='600'>
      {/* Hero Section */}
      <View as='header' gap='200'>
        <Heading as='h1' textStyle='display.prose.1'>
          Components
        </Heading>
        <Text textStyle='prose.lead' color='fg.subtle' fontSize='xl'>
          Our component library provides a set of reusable UI components built with React, designed
          for consistency and flexibility.
        </Text>
      </View>

      {/* Components by Category */}
      <View gap='800'>
        {Object.entries(components).map(([category, categoryComponents]) => (
          <View key={category} gap='200'>
            <Heading as='h2' textStyle='display.prose.2'>
              {category}
            </Heading>
            <View
              display='grid'
              gridTemplateColumns='repeat(auto-fill, minmax(300px, 1fr))'
              gap='400'
            >
              {categoryComponents.map((component) => (
                <Link
                  key={component.name}
                  href={`/components/${component.name}`}
                  className={css({
                    display: 'block',
                    p: '400',
                    borderRadius: '200',
                    border: '1px solid',
                    borderColor: 'border.subtle',
                    bg: 'bg',
                    transition: 'all 0.2s',
                    _hover: {
                      bg: 'bg.subtlest',
                      borderColor: 'border',
                      transform: 'translateY(-2px)'
                    }
                  })}
                >
                  <View display='flex' flexDirection='row' alignItems='center' gap='200' mb='200'>
                    <Heading as='h3' textStyle='display.prose.4'>
                      {component.title}
                    </Heading>
                    {component.status && (
                      <span
                        data-status={component.status}
                        className={css({
                          fontSize: 'xs',
                          px: '100',
                          py: '050',
                          borderRadius: '100',
                          border: '1px solid',
                          borderColor: 'border.subtle',
                          bg: 'bg.subtle',
                          color: 'fg.subtle',
                          fontWeight: 'medium',
                          '&[data-status="stable"]': {
                            borderColor: 'border.success',
                            bg: 'bg.success',
                            color: 'fg.success'
                          },
                          '&[data-status="beta"]': {
                            borderColor: 'border.warning',
                            bg: 'bg.warning',
                            color: 'fg.warning'
                          },
                          '&[data-status="experimental"]': {
                            borderColor: 'border.information',
                            bg: 'bg.information',
                            color: 'fg.information'
                          }
                        })}
                      >
                        {component.status}
                      </span>
                    )}
                  </View>
                  <Text
                    className={css({
                      color: 'fg.subtle',
                      fontSize: 'md',
                      lineHeight: 'normal'
                    })}
                  >
                    {component.description}
                  </Text>
                </Link>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
