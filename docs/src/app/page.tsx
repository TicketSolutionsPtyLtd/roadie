import Link from 'next/link'

import { Cube, MagicWand, Moon, Palette, Shapes, WheelchairMotion } from '@phosphor-icons/react/ssr'

import { Button, Heading, Text } from '@oztix/roadie-components'

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto py-8 flex flex-col gap-20">
      {/* Hero Section */}
      <section className="flex flex-col gap-3">
        <Heading as="h1" size="4xl">
          Roadie design system
        </Heading>
        <Text size="lg" emphasis="subtle">
          A comprehensive design system for building consistent, accessible, and
          beautiful user interfaces across Oztix applications.
        </Text>
      </section>

      {/* Core Sections */}
      <section className="flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SectionCard
            icon={<Palette size={24} weight='bold' />}
            title="Foundations"
            description="Essential design foundations including typography, spacing, and color systems."
            items={[
              { label: 'Colors', href: '/foundations/colors', description: 'Color palette and usage' },
              { label: 'Spacing', href: '/foundations/spacing', description: 'Layout and spacing scale' },
              { label: 'Typography', href: '/foundations/typography', description: 'Text styles and font system' },
            ]}
          />
          <SectionCard
            icon={<Shapes size={24} weight='bold' />}
            title="Design tokens"
            description="Semantic design tokens for consistent theming and styling."
            items={[
              { label: 'Overview', href: '/tokens', description: 'Introduction and usage guide' },
              { label: 'Reference', href: '/tokens/reference', description: 'Complete token documentation' },
            ]}
          />
        </div>

        <SectionCard
          icon={<Cube size={24} weight='bold' />}
          title="Components"
          description="A comprehensive library of accessible, customizable React components."
          items={[
            { label: 'Text', href: '/components/text', description: 'Typography component' },
            { label: 'Heading', href: '/components/heading', description: 'Heading component' },
            { label: 'Code', href: '/components/code', description: 'Code and syntax highlighting' },
            { label: 'Button', href: '/components/button', description: 'Interactive button styles' },
            { label: 'View all', href: '/components', description: 'All components' },
          ]}
        />
      </section>

      {/* Key Features */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Heading as="h2" size="2xl">Key features</Heading>
          <Text size="lg" emphasis="subtle">
            Discover the powerful features that make Roadie a complete design system solution
          </Text>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-8">
          <FeatureCard icon={<MagicWand size={24} weight='bold' />} title="Tailwind-native styling" description="Built with Tailwind CSS v4 and custom @utility directives for intent/emphasis theming." />
          <FeatureCard icon={<WheelchairMotion size={24} weight='bold' />} title="Accessible by default" description="Components built on Base UI for robust accessibility support." />
          <FeatureCard icon={<Moon size={24} weight='bold' />} title="Dark mode ready" description="OKLCH color scales with automatic dark mode via CSS custom properties." />
        </div>
      </section>

      {/* Getting Started */}
      <section className="flex flex-col gap-3 items-start emphasis-subtle-surface p-8 rounded-lg">
        <Heading as="h2" size="2xl">Get started</Heading>
        <Text size="lg" emphasis="subtle">
          Ready to build? Follow our guide to start using Roadie in your project.
        </Text>
        <Button intent="accent" emphasis="strong" render={<Link href="/overview/getting-started" />}>
          Getting started guide
        </Button>
      </section>
    </main>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 text-accent-11">
        {icon}
        <Heading as="h3" size="lg">{title}</Heading>
      </div>
      <Text emphasis="subtle">{description}</Text>
    </div>
  )
}

function SectionCard({ icon, title, description, items }: {
  icon: React.ReactNode
  title: string
  description: string
  items: Array<{ label: string; href: string; description: string }>
}) {
  return (
    <div className="pt-8 pb-4 rounded-lg border border-neutral-7 bg-neutral-3">
      <div className="flex flex-col gap-1 px-8">
        <div className="flex gap-3">
          {icon}
          <Heading as="h3" size="lg">{title}</Heading>
        </div>
        <Text emphasis="subtle" size="sm">{description}</Text>
      </div>
      <ul className={`pt-4 px-4 grid grid-cols-1 ${items.length > 2 ? 'md:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]' : ''}`}>
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex flex-col gap-0.5 p-4 rounded-md h-full transition-all hover:bg-neutral-4 no-underline">
              <Heading as="h4" size="base" intent="accent">{item.label}</Heading>
              <Text size="sm" emphasis="subtle">{item.description}</Text>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
