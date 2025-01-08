import Link from 'next/link'

import { Accessibility, Box, Moon, Palette, Shapes, Wand2 } from 'lucide-react'

import { Button, Heading, Text, View } from '@oztix/roadie-components'

export default function Home() {
  return (
    <View as='main' maxW='breakpoint.lg' mx='auto' py='400' gap='1000'>
      {/* Hero Section */}
      <View as='section' gap='200'>
        <Heading as='h1' textStyle='display.prose.1'>
          Roadie design system
        </Heading>
        <Text textStyle='prose.lead'>
          A comprehensive design system for building consistent, accessible, and
          beautiful user interfaces across Oztix applications.
        </Text>
      </View>

      {/* Core Sections */}
      <View as='section' display='flex' flexDirection='column' gap='400'>
        {/* Foundations and Tokens row */}
        <View
          display='grid'
          gridTemplateColumns={{
            base: '1fr',
            lg: 'repeat(2, 1fr)'
          }}
          gap='400'
        >
          <SectionCard
            icon={<Palette size={24} />}
            title='Foundations'
            description='Essential design foundations including typography, spacing, and color systems.'
            items={[
              {
                label: 'Colors',
                href: '/foundations/colors',
                description: 'Color palette and usage'
              },
              {
                label: 'Spacing',
                href: '/foundations/spacing',
                description: 'Layout and spacing scale'
              },
              {
                label: 'Typography',
                href: '/foundations/typography',
                description: 'Text styles and font system'
              }
            ]}
          />
          <SectionCard
            icon={<Shapes size={24} />}
            title='Design tokens'
            description='Semantic design tokens for consistent theming and styling.'
            items={[
              {
                label: 'Overview',
                href: '/tokens',
                description: 'Introduction and usage guide'
              },
              {
                label: 'Reference',
                href: '/tokens/reference',
                description: 'Complete token documentation'
              }
            ]}
          />
        </View>

        {/* Components row */}
        <SectionCard
          icon={<Box size={24} />}
          title='Components'
          description='A comprehensive library of accessible, customizable React components.'
          items={[
            {
              label: 'View',
              href: '/components/view',
              description: 'Flexible layout primitive'
            },
            {
              label: 'Text',
              href: '/components/text',
              description: 'Typography component'
            },
            {
              label: 'Heading',
              href: '/components/heading',
              description: 'Heading component'
            },
            {
              label: 'Code',
              href: '/components/code',
              description: 'Code and syntax highlighting'
            },
            {
              label: 'Button',
              href: '/components/button',
              description: 'Interactive button styles'
            },
            {
              label: 'View all',
              href: '/components',
              description: 'All components'
            }
          ]}
        />
      </View>

      {/* Key Features */}
      <View as='section' gap='400'>
        <View gap='200'>
          <Heading as='h2' textStyle='display.prose.4'>
            Key features
          </Heading>
          <Text textStyle='prose.lead' emphasis='subtle'>
            Discover the powerful features that make Roadie a complete design
            system solution
          </Text>
        </View>
        <View
          display='grid'
          gridTemplateColumns='repeat(auto-fit, minmax(250px, 1fr))'
          gap='400'
        >
          <FeatureCard
            icon={<Wand2 size={24} />}
            title='Type-safe styling'
            description='Built with PandaCSS for type-safe, performant styling with semantic tokens.'
          />
          <FeatureCard
            icon={<Accessibility size={24} />}
            title='Accessible by default'
            description='Components built on react-aria-components for robust accessibility support.'
          />
          <FeatureCard
            icon={<Moon size={24} />}
            title='Dark mode ready'
            description='Semantic tokens and themes support light and dark modes out of the box.'
          />
        </View>
      </View>

      {/* Getting Started */}
      <View
        as='section'
        gap='200'
        alignItems='flex-start'
        bg='neutral.surface.subtle'
        p='400'
        borderRadius='200'
      >
        <View gap='200'>
          <Heading as='h2' textStyle='display.prose.3'>
            Get started
          </Heading>
          <Text textStyle='prose.lead' emphasis='subtle'>
            Ready to build? Follow our guide to start using Roadie in your
            project.
          </Text>
        </View>
        <Link href='/overview/getting-started'>
          <Button colorPalette='accent' emphasis='strong'>
            Getting started guide
          </Button>
        </Link>
      </View>
    </View>
  )
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <View gap='200'>
      <View display='flex' gap='200' color='accent.fg'>
        {icon}
        <Heading as='h3' textStyle='display.ui.4'>
          {title}
        </Heading>
      </View>
      <Text emphasis='subtle' fontSize='md' lineHeight='normal'>
        {description}
      </Text>
    </View>
  )
}

function SectionCard({
  icon,
  title,
  description,
  items
}: {
  icon: React.ReactNode
  title: string
  description: string
  items: Array<{ label: string; href: string; description: string }>
}) {
  return (
    <View
      pt='400'
      pb='200'
      borderRadius='200'
      border='1px solid'
      borderColor='neutral.border.subtle'
      bg='neutral.surface'
    >
      <View gap='100' px='400'>
        <View display='flex' gap='200'>
          {icon}
          <Heading as='h3' textStyle='display.ui.4'>
            {title}
          </Heading>
        </View>
        <Text emphasis='subtle' fontSize='sm' lineHeight='normal'>
          {description}
        </Text>
      </View>
      <View
        as='ul'
        pt='200'
        px='200'
        display='grid'
        gridTemplateColumns={{
          base: '1fr',
          md: items.length > 2 ? 'repeat(auto-fit, minmax(250px, 1fr))' : '1fr'
        }}
      >
        {items.map((item) => (
          <View key={item.href} as='li'>
            <View
              as={Link}
              href={item.href}
              display='flex'
              flexDirection='column'
              gap='050'
              p='200'
              borderRadius='100'
              height='full'
              transition='all 0.2s'
              _hover={{
                bg: 'neutral.surface.subtle'
              }}
            >
              <Text color='accent.fg' fontWeight='medium'>
                {item.label}
              </Text>
              <Text fontSize='sm' emphasis='subtle'>
                {item.description}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
