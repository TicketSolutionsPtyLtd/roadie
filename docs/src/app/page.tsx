import Link from 'next/link'

import {
  Cube,
  MagicWand,
  Moon,
  Palette,
  Shapes,
  WheelchairMotion
} from '@phosphor-icons/react/ssr'

import { Button, Card } from '@oztix/roadie-components'

export default function Home() {
  return (
    <main className='mx-auto grid max-w-4xl gap-20 py-8'>
      {/* Hero Section */}
      <section className='grid gap-3'>
        <h1 className='text-display-prose-1 text-strong'>
          Roadie design system
        </h1>
        <p className='text-lg text-subtle'>
          A comprehensive design system for building consistent, accessible, and
          beautiful user interfaces across Oztix applications.
        </p>
      </section>

      {/* Core Sections */}
      <section className='grid gap-8'>
        <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
          <SectionCard
            icon={<Palette size={24} weight='bold' />}
            title='Foundations'
            description='Essential design foundations including typography, spacing, and color systems.'
            items={[
              {
                label: 'Colors',
                href: '/foundations/colors',
                description: 'Color palette and usage'
              },
              {
                label: 'Layout',
                href: '/foundations/layout',
                description: 'Grid, spacing, and layout patterns'
              },
              {
                label: 'Typography',
                href: '/foundations/typography',
                description: 'Text styles and font system'
              },
              {
                label: 'Elevation',
                href: '/foundations/elevation',
                description: 'Shadow scale and depth hierarchy'
              }
            ]}
          />
          <SectionCard
            icon={<Shapes size={24} weight='bold' />}
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
        </div>

        <SectionCard
          icon={<Cube size={24} weight='bold' />}
          title='Components'
          description='A comprehensive library of accessible, customizable React components.'
          items={[
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
      </section>

      {/* Key Features */}
      <section className='grid gap-8'>
        <div className='grid gap-3'>
          <h2 className='text-display-ui-3 text-strong'>Key features</h2>
          <p className='text-lg text-subtle'>
            Discover the powerful features that make Roadie a complete design
            system solution
          </p>
        </div>
        <div className='grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-8'>
          <FeatureCard
            icon={<MagicWand size={24} weight='bold' />}
            title='Tailwind-native styling'
            description='Built with Tailwind CSS v4 and custom @utility directives for intent/emphasis theming.'
          />
          <FeatureCard
            icon={<WheelchairMotion size={24} weight='bold' />}
            title='Accessible by default'
            description='Components built on Base UI for robust accessibility support.'
          />
          <FeatureCard
            icon={<Moon size={24} weight='bold' />}
            title='Dark mode ready'
            description='OKLCH color scales with automatic dark mode via CSS custom properties.'
          />
        </div>
      </section>

      {/* Getting Started */}
      <Card as='section' className='grid justify-items-start gap-3 p-8'>
        <h2 className='text-display-ui-3 text-strong'>Get started</h2>
        <p className='text-lg text-subtle'>
          Ready to build? Follow our guide to start using Roadie in your
          project.
        </p>
        <Button
          intent='accent'
          emphasis='strong'
          render={<Link href='/overview/getting-started' />}
        >
          Getting started guide
        </Button>
      </Card>
    </main>
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
    <div className='grid gap-3'>
      <div className='text-accent-11 flex gap-3'>
        {icon}
        <h3 className='text-display-ui-5 text-strong'>{title}</h3>
      </div>
      <p className='text-subtle'>{description}</p>
    </div>
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
    <Card className='pt-8 pb-4'>
      <div className='grid gap-1 px-8'>
        <div className='flex gap-3'>
          {icon}
          <h3 className='text-display-ui-5 text-strong'>{title}</h3>
        </div>
        <p className='text-sm text-subtle'>{description}</p>
      </div>
      <ul
        className={`grid grid-cols-1 px-4 pt-4 ${items.length > 2 ? 'md:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]' : ''}`}
      >
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className='is-interactive grid h-full gap-0.5 rounded-lg emphasis-subtler p-4 no-underline'
            >
              <h4 className='text-display-ui-6 text-strong intent-accent'>
                {item.label}
              </h4>
              <p className='text-sm text-subtle'>{item.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
