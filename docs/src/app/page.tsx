import type { ReactNode } from 'react'

import { ArrowRightIcon, ArrowUpRightIcon } from '@phosphor-icons/react/ssr'

import { ComponentSkeleton, Skel } from '@/components/ComponentSkeleton'
import { FoundationPreview } from '@/components/FoundationPreview'
import { HomeGuides } from '@/components/HomeGuides'
import { Image } from '@/components/Image'
import { PreviewCard } from '@/components/PreviewGrid'
import { CHANGELOG_URL, getRecentReleases } from '@/lib/changelog'
import {
  COMPONENTS,
  FOUNDATIONS,
  WIDGETS,
  countEntries,
  getCatalogue
} from '@/lib/page-manifest'

import { Badge } from '@oztix/roadie-components/badge'
import { Button } from '@oztix/roadie-components/button'
import { Code } from '@oztix/roadie-components/code'

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

export default async function Home() {
  const [foundations, components, widgets, releases] = await Promise.all([
    getCatalogue(FOUNDATIONS),
    getCatalogue(COMPONENTS),
    getCatalogue(WIDGETS),
    getRecentReleases(3)
  ])

  return (
    <div className='@container grid gap-16'>
      <section className='grid items-center gap-6 @xl:grid-cols-[auto_1fr]'>
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
              Tokens, React components and Vue widgets for consistent,
              accessible Oztix apps.
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
        <ul className='grid grid-cols-2 gap-3 @2xl:grid-cols-4 @2xl:gap-4'>
          <PreviewCard
            href='/foundations'
            title='Foundations'
            subtitle={plural(countEntries(foundations), 'guide')}
          >
            <FoundationsArt />
          </PreviewCard>
          <PreviewCard
            href='/components'
            title='Components'
            subtitle={plural(countEntries(components), 'component')}
          >
            <ComponentsArt />
          </PreviewCard>
          <PreviewCard href='/tokens' title='Tokens' subtitle='Every variable'>
            <TokensArt />
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
