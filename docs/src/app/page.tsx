import Link from 'next/link'

import { Heading, Text, View } from '@oztix/roadie-components'

export default function Home() {
  return (
    <View as='main' maxW='breakpoint.lg' mx='auto' py='400' gap='400'>
      {/* Hero Section */}
      <View as='section' gap='200'>
        <Heading as='h1' textStyle='display.prose.1'>
          Roadie design system
        </Heading>
        <Text textStyle='prose.lead' fontSize='xl'>
          A comprehensive collection of reusable components and design
          guidelines for building consistent, beautiful user interfaces across
          Oztix applications.
        </Text>
      </View>

      {/* Quick Links */}
      <View
        as='section'
        display='grid'
        gridTemplateColumns='repeat(auto-fit, minmax(250px, 1fr))'
        gap='400'
        mb='800'
      >
        <QuickLinkCard
          title='Getting started'
          description='Learn how to set up and use the Roadie Design System in your project.'
          href='/overview/getting-started'
        />
        <QuickLinkCard
          title='Components'
          description='Explore our library of ready-to-use components.'
          href='/components'
        />
        <QuickLinkCard
          title='Design tokens'
          description='View our design tokens for colors, spacing, typography, and more.'
          href='/tokens'
        />
      </View>

      {/* Featured Components */}
      <View as='section' gap='400'>
        <Heading as='h2' textStyle='display.prose.2'>
          Featured components
        </Heading>
        <View
          display='grid'
          gridTemplateColumns='repeat(auto-fit, minmax(250px, 1fr))'
          gap='400'
        >
          <ComponentCard
            title='Text'
            description='Typography components for consistent text styling across applications.'
            href='/components/text'
          />
          <ComponentCard
            title='View'
            description='A layout component that provides a flexible container for arranging child elements.'
            href='/components/view'
          />
          <ComponentCard
            title='Button'
            description='A versatile button component with multiple appearances and sizes.'
            href='/components/button'
          />
        </View>
      </View>
    </View>
  )
}

function ComponentCard({
  title,
  description,
  href
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <View
      as={Link}
      href={href}
      p='400'
      gap='200'
      borderRadius='200'
      border='1px solid'
      borderColor='border.subtle'
      bg='bg'
      transition='all 0.2s'
      _hover={{
        bg: 'bg.subtlest',
        borderColor: 'border',
        transform: 'translateY(-2px)'
      }}
    >
      <Heading as='h3' textStyle='display.ui.4'>
        {title}
      </Heading>
      <Text color='fg.subtle' fontSize='md' lineHeight='normal'>
        {description}
      </Text>
    </View>
  )
}

function QuickLinkCard({
  title,
  description,
  href
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <View
      as={Link}
      href={href}
      p='400'
      gap='200'
      borderRadius='200'
      bg='bg.subtlest'
      transition='all 0.2s'
      _hover={{
        bg: 'bg.subtle',
        transform: 'translateY(-2px)'
      }}
    >
      <Heading as='h3' textStyle='display.ui.4'>
        {title}
      </Heading>
      <Text color='fg.subtle' fontSize='sm' lineHeight='normal'>
        {description}
      </Text>
    </View>
  )
}
