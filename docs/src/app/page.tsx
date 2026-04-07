import Link from 'next/link'

import {
  ArrowRightIcon,
  GearIcon,
  HeartIcon,
  MagicWandIcon,
  MoonIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  WheelchairMotionIcon
} from '@phosphor-icons/react/ssr'

import { Badge, Button, Card, Code } from '@oztix/roadie-components'
import { HighFive } from '@oztix/roadie-components/spot-illustrations'

const intents = [
  'neutral',
  'brand',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
] as const

export default function Home() {
  return (
    <main className='mx-auto grid max-w-4xl gap-20 py-8'>
      {/* Hero */}
      <section className='grid gap-8'>
        <div className='grid gap-3'>
          <h1 className='text-display-prose-1 text-strong'>
            Roadie design system
          </h1>
          <p className='text-lg text-subtle'>
            Consistent, accessible, and beautiful UI for Oztix applications.
          </p>
        </div>
        <div className='flex gap-3'>
          <Button
            intent='accent'
            emphasis='strong'
            render={<Link href='/overview/getting-started' />}
          >
            Get started
          </Button>
          <Button emphasis='normal' render={<Link href='/components' />}>
            Browse components
            <ArrowRightIcon weight='bold' className='size-4' />
          </Button>
        </div>
      </section>

      {/* Foundations */}
      <section className='grid gap-6'>
        <div className='grid gap-1'>
          <h2 className='text-display-ui-3 text-strong'>Foundations</h2>
          <p className='text-subtle'>
            The building blocks behind every component — color, type, layout,
            and more.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <FoundationCard
            href='/foundations/colors'
            title='Colors'
            description='OKLCH color scales and intents'
            preview={
              <div className='flex gap-0.5'>
                {intents.map((intent) => (
                  <div
                    key={intent}
                    className={`intent-${intent} h-4 flex-1 emphasis-strong first:rounded-l-sm last:rounded-r-sm`}
                  />
                ))}
              </div>
            }
          />
          <FoundationCard
            href='/foundations/typography'
            title='Typography'
            description='Text styles and fluid scaling'
            preview={
              <p className='truncate text-display-ui-4 text-strong'>Aa Bb Cc</p>
            }
          />
          <FoundationCard
            href='/foundations/layout'
            title='Layout'
            description='Grid, spacing, and layout patterns'
            preview={
              <div className='grid grid-cols-3 gap-1'>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className='h-2.5 rounded-xs bg-subtle' />
                ))}
              </div>
            }
          />
          <FoundationCard
            href='/foundations/elevation'
            title='Elevation'
            description='Shadow scale and depth'
            preview={
              <div className='flex items-end gap-2'>
                {['shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg'].map(
                  (s) => (
                    <div
                      key={s}
                      className={`size-6 emphasis-raised rounded-md ${s}`}
                    />
                  )
                )}
              </div>
            }
          />
          <FoundationCard
            href='/foundations/shape'
            title='Shape'
            description='Border-radius scale'
            preview={
              <div className='flex items-end gap-2'>
                {[
                  'rounded-sm',
                  'rounded-md',
                  'rounded-lg',
                  'rounded-xl',
                  'rounded-full'
                ].map((r) => (
                  <div
                    key={r}
                    className={`size-6 border border-subtle bg-subtle ${r}`}
                  />
                ))}
              </div>
            }
          />
          <FoundationCard
            href='/foundations/interactions'
            title='Interactions'
            description='Interactive states and utilities'
            preview={
              <div className='flex gap-2'>
                <div className='h-5 w-12 emphasis-strong rounded-full intent-accent' />
                <div className='h-5 w-12 emphasis-normal rounded-full' />
              </div>
            }
          />
          <FoundationCard
            href='/foundations/iconography'
            title='Iconography'
            description='Phosphor Bold icons and sizing'
            preview={
              <div className='flex gap-2 text-subtle'>
                <HeartIcon weight='bold' className='size-5' />
                <StarIcon weight='bold' className='size-5' />
                <PlusIcon weight='bold' className='size-5' />
                <TrashIcon weight='bold' className='size-5' />
                <GearIcon weight='bold' className='size-5' />
              </div>
            }
          />
          <FoundationCard
            href='/foundations/accessibility'
            title='Accessibility'
            description='Inclusive design and semantic HTML'
            preview={
              <div className='flex items-center gap-3'>
                <WheelchairMotionIcon
                  weight='bold'
                  className='size-5 text-subtle'
                />
                <div className='h-5 w-12 rounded-md outline outline-2 outline-offset-2 outline-accent-9' />
              </div>
            }
          />
          <FoundationCard
            href='/foundations/motion'
            title='Motion'
            description='Duration, easing, and animation tokens'
            preview={
              <div className='grid gap-1'>
                {['w-4', 'w-8', 'w-14', 'w-full'].map((w) => (
                  <div
                    key={w}
                    className={`h-1.5 rounded-full bg-subtle ${w}`}
                  />
                ))}
              </div>
            }
          />
          <FoundationCard
            href='/foundations/performance'
            title='Performance'
            description='Speed principles and optimisation'
            preview={
              <div className='flex items-end gap-1'>
                {['h-2', 'h-3', 'h-4', 'h-5', 'h-6'].map((h) => (
                  <div key={h} className={`w-3 rounded-xs bg-subtle ${h}`} />
                ))}
              </div>
            }
          />
        </div>
      </section>

      {/* Tokens */}
      <section className='grid gap-6'>
        <div className='grid gap-1'>
          <h2 className='text-display-ui-3 text-strong'>Design tokens</h2>
          <p className='text-subtle'>
            Semantic CSS custom properties that power theming across intents and
            modes.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Card
            as={Link}
            href='/tokens'
            className='is-interactive h-full p-6 no-underline'
          >
            <h3 className='text-display-ui-5 text-strong'>Overview</h3>
            <p className='text-sm text-subtle'>Introduction and usage guide</p>
          </Card>
          <Card
            as={Link}
            href='/tokens/reference'
            className='is-interactive h-full p-6 no-underline'
          >
            <h3 className='text-display-ui-5 text-strong'>Reference</h3>
            <p className='text-sm text-subtle'>Complete token documentation</p>
          </Card>
        </div>
      </section>

      {/* Components */}
      <section className='grid gap-6'>
        <div className='grid gap-1'>
          <h2 className='text-display-ui-3 text-strong'>Components</h2>
          <p className='text-subtle'>
            Accessible React components built on Base UI, styled with intent and
            emphasis.
          </p>
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {[
            {
              label: 'Button',
              href: '/components/button',
              description: 'Actions and CTAs'
            },
            {
              label: 'Card',
              href: '/components/card',
              description: 'Content containers'
            },
            {
              label: 'Badge',
              href: '/components/badge',
              description: 'Status and labels'
            },
            {
              label: 'Accordion',
              href: '/components/accordion',
              description: 'Expandable content'
            },
            {
              label: 'Input',
              href: '/components/input',
              description: 'Text input fields'
            },
            {
              label: 'Select',
              href: '/components/select',
              description: 'Selection menus'
            }
          ].map((item) => (
            <Card
              key={item.href}
              as={Link}
              href={item.href}
              className='is-interactive h-full p-6 no-underline'
            >
              <h3 className='text-display-ui-6 text-strong'>{item.label}</h3>
              <p className='text-sm text-subtle'>{item.description}</p>
            </Card>
          ))}
        </div>
        <Link
          href='/components'
          className='text-sm text-subtle hover:text-normal'
        >
          View all components <ArrowRightIcon className='inline size-3' />
        </Link>
      </section>

      {/* Key Features */}
      <section className='grid gap-8'>
        <h2 className='text-display-ui-3 text-strong'>Key features</h2>
        <div className='grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-8'>
          <FeatureCard
            icon={<MagicWandIcon weight='bold' className='size-6' />}
            title='Tailwind-native styling'
            description='Built on Tailwind CSS v4 with custom @utility directives for intent/emphasis theming.'
            demo={
              <Code className='text-xs'>intent-accent emphasis-strong</Code>
            }
          />
          <FeatureCard
            icon={<WheelchairMotionIcon weight='bold' className='size-6' />}
            title='Accessible by default'
            description='Components built on Base UI for robust accessibility and keyboard navigation.'
          />
          <FeatureCard
            icon={<MoonIcon weight='bold' className='size-6' />}
            title='Dark mode ready'
            description='OKLCH color scales with automatic dark mode via CSS custom properties.'
            demo={
              <div className='flex gap-1'>
                <div
                  className='size-6 rounded-md border'
                  style={{
                    backgroundColor: 'var(--color-neutral-1)',
                    borderColor: 'var(--color-neutral-4)'
                  }}
                />
                <div
                  className='size-6 rounded-md border'
                  style={{
                    backgroundColor: 'var(--color-neutral-12)',
                    borderColor: 'var(--color-neutral-10)'
                  }}
                />
              </div>
            }
          />
        </div>
      </section>

      {/* Get Started CTA */}
      <Card
        as='section'
        intent='accent'
        emphasis='subtle'
        className='grid grid-cols-[1fr_auto] items-center gap-6 p-8'
      >
        <div className='grid justify-items-start gap-3'>
          <h2 className='text-display-ui-3 text-strong'>Ready to build?</h2>
          <p className='text-subtle'>
            Get up and running with Roadie in minutes.
          </p>
          <Button
            intent='accent'
            emphasis='strong'
            render={<Link href='/overview/getting-started' />}
          >
            Getting started guide
          </Button>
        </div>
        <HighFive className='hidden size-24 md:block' />
      </Card>
    </main>
  )
}

function FoundationCard({
  href,
  title,
  description,
  preview
}: {
  href: string
  title: string
  description: string
  preview: React.ReactNode
}) {
  return (
    <Card
      as={Link}
      href={href}
      className='is-interactive grid h-full gap-3 p-5 no-underline'
    >
      <div className='grid gap-0.5'>
        <h3 className='text-display-ui-6 text-strong'>{title}</h3>
        <p className='text-sm text-subtle'>{description}</p>
      </div>
      {preview}
    </Card>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  demo
}: {
  icon: React.ReactNode
  title: string
  description: string
  demo?: React.ReactNode
}) {
  return (
    <div className='grid content-start gap-3'>
      <div className='flex gap-1 text-accent-11'>
        {icon}
        <h3 className='text-display-ui-5 text-strong'>{title}</h3>
      </div>
      <p className='text-subtle'>{description}</p>
      {demo}
    </div>
  )
}
