import type { ReactNode } from 'react'

import { ArrowRightIcon, ArrowUpRightIcon } from '@phosphor-icons/react/ssr'

import { ChartPreview } from '@/components/ChartPreview'
import { ComponentSkeleton, Skel } from '@/components/ComponentSkeleton'
import { FoundationPreview } from '@/components/FoundationPreview'
import { HomeGuides } from '@/components/HomeGuides'
import { Image } from '@/components/Image'
import { PreviewCard } from '@/components/PreviewGrid'
import { CHANGELOG_URL, getRecentReleases } from '@/lib/changelog'
import {
  BRAND,
  CHARTS,
  COMPONENTS,
  CONTENT,
  FOUNDATIONS,
  WIDGETS,
  countEntries,
  getCatalogue
} from '@/lib/page-manifest'

import { Badge } from '@oztix/roadie-components/badge'
import { Button } from '@oztix/roadie-components/button'
import { Code } from '@oztix/roadie-components/code'
import { Logo } from '@oztix/roadie-components/logo'

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

// A last card alone on its row spans the row, at whatever column count and
// card count, and a spanning card's art caps its height rather than growing.
const EXPLORE_GRID = [
  'grid grid-cols-1 gap-3 @sm:grid-cols-2 @lg:grid-cols-3 @3xl:grid-cols-4 @2xl:gap-4',
  '@sm:@max-lg:*:last:odd:col-span-full',
  '@lg:@max-3xl:*:last:nth-[3n+1]:col-span-full',
  '@3xl:*:last:nth-[4n+1]:col-span-full',
  '**:data-[slot=preview-thumbnail]:max-h-44'
].join(' ')

export default async function Home() {
  const [brand, foundations, content, components, charts, widgets, releases] =
    await Promise.all([
      getCatalogue(BRAND),
      getCatalogue(FOUNDATIONS),
      getCatalogue(CONTENT),
      getCatalogue(COMPONENTS),
      getCatalogue(CHARTS),
      getCatalogue(WIDGETS),
      getRecentReleases(3)
    ])

  return (
    <div className='@container grid gap-16'>
      <section className='grid justify-items-start gap-6'>
        <Image
          src='/roadie-logo.png'
          alt=''
          width={96}
          height={96}
          priority
          className='size-20 @xl:size-24'
        />
        <div className='grid justify-items-start gap-4'>
          <div className='grid gap-2'>
            <h1 className='text-display-prose-1 text-strong'>
              Roadie design system
            </h1>
            <p className='text-lg text-subtle'>
              Brand and writing guidelines, tokens, React components, and
              widgets for consistent, accessible Oztix products.
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button
              intent='accent'
              emphasis='strong'
              href='/overview/getting-started'
            >
              Installation
            </Button>
            <Button emphasis='normal' href='/overview/philosophy'>
              Philosophy
            </Button>
          </div>
        </div>
      </section>

      <HomeSection title='Explore'>
        <ul className={EXPLORE_GRID}>
          <PreviewCard
            href='/brand'
            title='Brand'
            subtitle={plural(countEntries(brand), 'guide')}
          >
            <BrandArt />
          </PreviewCard>
          <PreviewCard
            href='/foundations'
            title='Foundations'
            subtitle={plural(countEntries(foundations), 'guide')}
          >
            <FoundationsArt />
          </PreviewCard>
          <PreviewCard
            href='/content'
            title='Content'
            subtitle={plural(countEntries(content), 'guide')}
          >
            <ContentArt />
          </PreviewCard>
          <PreviewCard href='/tokens' title='Tokens' subtitle='Every variable'>
            <TokensArt />
          </PreviewCard>
          <PreviewCard
            href='/components'
            title='Components'
            subtitle={plural(countEntries(components), 'component')}
          >
            <ComponentsArt />
          </PreviewCard>
          <PreviewCard
            href='/charts'
            title='Charts'
            subtitle={plural(countEntries(charts), 'guide')}
          >
            <ChartPreview name='data-visualisation' />
          </PreviewCard>
          <PreviewCard
            href='/roadie-widgets'
            title='Widgets'
            subtitle={plural(countEntries(widgets), 'widget')}
          >
            <ComponentSkeleton name='drawer' />
          </PreviewCard>
        </ul>
      </HomeSection>

      <HomeSection title='Guides'>
        <HomeGuides />
      </HomeSection>

      <HomeSection
        title='How Roadie works'
        action={
          <Button href='/overview/philosophy' emphasis='subtler' size='sm'>
            Philosophy
            <ArrowRightIcon weight='bold' className='size-4' />
          </Button>
        }
      >
        <ul className='grid gap-4 @2xl:grid-cols-3'>
          <Principle
            title='Intent picks the palette'
            demo={
              <div className='flex flex-wrap justify-center gap-2'>
                <Badge size='sm' intent='accent' emphasis='strong'>
                  Accent
                </Badge>
                <Badge size='sm' intent='success' emphasis='strong'>
                  Success
                </Badge>
                <Badge size='sm' intent='danger' emphasis='strong'>
                  Danger
                </Badge>
              </div>
            }
          >
            One <Code>intent-*</Code> class sets the colours, and everything
            inside inherits them.
          </Principle>
          <Principle
            title='Emphasis sets the weight'
            demo={
              <div className='flex flex-wrap justify-center gap-2 intent-accent'>
                <Badge size='sm' emphasis='strong'>
                  Strong
                </Badge>
                <Badge size='sm' emphasis='normal'>
                  Normal
                </Badge>
                <Badge size='sm' emphasis='subtle'>
                  Subtle
                </Badge>
              </div>
            }
          >
            <Code>emphasis-*</Code> presets pair background, text and border,
            with their hover states.
          </Principle>
          <Principle
            title='Grid first'
            demo={
              <div className='grid w-40 gap-1.5'>
                {['w-full', 'w-3/4', 'w-full'].map((width, index) => (
                  <div
                    key={index}
                    className='grid h-6 content-center rounded-md border border-subtle bg-normal px-2'
                  >
                    <Skel className={`h-1.5 ${width}`} />
                  </div>
                ))}
              </div>
            }
          >
            Stacks are <Code>grid gap-*</Code>, not margins, so spacing lives in
            one place.
          </Principle>
        </ul>
      </HomeSection>

      <HomeSection
        title='What’s new'
        action={
          <Button href={CHANGELOG_URL} emphasis='subtler' size='sm'>
            Changelog
            <ArrowUpRightIcon weight='bold' className='size-4' />
          </Button>
        }
      >
        <ul className='grid divide-y divide-subtle border-y border-subtle'>
          {releases.map((release) => (
            <li
              key={release.version}
              className='grid gap-1 py-4 @md:grid-cols-[5rem_1fr] @md:gap-4'
            >
              <p className='font-mono text-sm text-subtle'>
                v{release.version}
              </p>
              <ul className='grid gap-1'>
                {release.changes.map((change) => (
                  <li key={change}>{withInlineCode(change)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </HomeSection>
    </div>
  )
}

function HomeSection({
  title,
  action,
  children
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className='grid gap-4'>
      <div className='flex items-center justify-between gap-4'>
        <h2 className='text-display-ui-3 text-strong'>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Principle({
  title,
  demo,
  children
}: {
  title: string
  demo: ReactNode
  children: ReactNode
}) {
  return (
    <li className='grid content-start items-center gap-3 @md:grid-cols-[14rem_1fr] @md:gap-6 @2xl:grid-cols-1 @2xl:gap-3'>
      <div className='grid h-28 place-content-center rounded-xl bg-subtle p-4'>
        {demo}
      </div>
      <div className='grid gap-1'>
        <h3 className='text-display-ui-6 text-strong'>{title}</h3>
        <p className='text-sm text-subtle'>{children}</p>
      </div>
    </li>
  )
}

/** Changelog text with its backtick spans set as `Code`. */
function withInlineCode(text: string) {
  return text
    .split('`')
    .map((part, index) =>
      index % 2 === 1 ? <Code key={index}>{part}</Code> : part
    )
}

const BRAND_HUES = [
  'intent-brand-blue',
  'intent-brand-purple',
  'intent-brand-orange'
]

function BrandArt() {
  return (
    <div className='grid w-40 justify-items-center gap-3'>
      <Logo size='lg' aria-hidden />
      <div className='grid w-full grid-cols-3 gap-1'>
        {BRAND_HUES.map((intent) => (
          <div
            key={intent}
            className={`h-6 emphasis-strong rounded-sm ${intent}`}
          />
        ))}
      </div>
    </div>
  )
}

function FoundationsArt() {
  return (
    <div className='grid w-40 gap-3'>
      <FoundationPreview name='colors' />
      <div className='flex items-center justify-between'>
        <span className='text-3xl leading-none font-bold text-strong'>Aa</span>
        <div className='flex gap-1.5'>
          {['rounded-sm', 'rounded-lg', 'rounded-full'].map((radius) => (
            <div key={radius} className={`size-6 emphasis-normal ${radius}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ContentArt() {
  return (
    <div className='grid w-40 gap-2'>
      <div className='grid emphasis-normal gap-1.5 justify-self-start rounded-xl rounded-bl-sm px-3 py-2'>
        <Skel className='h-1.5 w-20' />
        <Skel className='h-1.5 w-12' />
      </div>
      <div className='grid emphasis-strong gap-1.5 justify-self-end rounded-xl rounded-br-sm px-3 py-2 intent-accent'>
        <div className='h-1.5 w-16 rounded-sm bg-normal opacity-50' />
        <div className='h-1.5 w-10 rounded-sm bg-normal opacity-50' />
      </div>
    </div>
  )
}

function ComponentsArt() {
  return (
    <div className='grid justify-items-center gap-3'>
      <ComponentSkeleton name='button' />
      <ComponentSkeleton name='badge' />
      <ComponentSkeleton name='input' />
    </div>
  )
}

function TokensArt() {
  return (
    <div className='grid w-40 gap-2'>
      {['intent-accent', 'intent-success', 'intent-neutral'].map((intent) => (
        <div key={intent} className={`flex items-center gap-2 ${intent}`}>
          <div className='size-5 shrink-0 emphasis-strong rounded-md' />
          <Skel className='h-2 flex-1' />
        </div>
      ))}
    </div>
  )
}
