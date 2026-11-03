'use client'

import { Carousel } from '@oztix/roadie-components/carousel'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  gapOf,
  intentClass,
  isFilled
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type TestimonialPreset, testimonialDefinition } from './definition'

export type { TestimonialPreset } from './definition'

export type TestimonialPerson = {
  /** The person quoted. */
  name: string
  /** Their job title, such as `Head of Programming`. */
  role?: string
  /** A portrait, cropped square. */
  image?: BlockImage
}

export type TestimonialOrganisation = {
  /** Shown as text when there's no logo, and read out when the logo has no alt text. */
  name: string
  /** The organisation's logo, at most 48px tall under the person's role. Its name stands in when the logo has no alt text. */
  logo?: BlockImage
}

export type TestimonialQuote = {
  /** The quote, without quotation marks; the block draws them. */
  quote: string
  /** Who said it. */
  person: TestimonialPerson
  /** Where they work. */
  organisation?: TestimonialOrganisation
}

export type TestimonialProps = {
  /**
   * `quote` shows one quote, large; `carousel` steps through them all, one at a time, with dots.
   * @default 'quote'
   */
  preset?: TestimonialPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section title, as an `h2`. */
  title: string
  /** Words in the title to mark, such as `say it best`. */
  highlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The quotes, in order. `quote` takes exactly one, and shows only the first; `carousel` takes two or more and steps through them all. */
  quotes: readonly TestimonialQuote[]
  /** A photo faded behind the whole block, which then pads its content. It fills the block at any shape, with no ratio. Decorative, so its alt text isn't read. Over an `emphasis`, it fades over the surface's colour. */
  image?: BlockImage
  /** Links under the quote. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The block's intent: it tints the quote mark, the portrait's border, and highlighted words. Info for the quote mark and portrait without one. */
  intent?: BlockIntent
  /** The surface behind the whole block: a band, full width and rounded once the block is wide, or a panel with `contained`. None by default. */
  emphasis?: BlockEmphasis
  /** Draws the `emphasis` or `image` as a panel inside the page padding instead of a band. Read only when there's an `emphasis` or `image`. */
  contained?: boolean
  /**
   * The heading's, quote's and citation's alignment.
   * @default 'center'
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller, with tighter gaps.
   * @default 'lg'
   */
  size?: BlockSize
}

/** Clients' quotes, large and centred, with their portrait, role, and organisation: one, or several in a carousel. */
export function Testimonial(props: TestimonialProps) {
  const { quotes, image, intent, size } = props
  const block = useBlock(testimonialDefinition, props)
  const { align } = block
  const heading = <BlockHeading {...block.heading} />
  const gap = gapOf(size, 'wide')
  return (
    <BlockRoot
      {...block.root}
      // The carousel is the landmark the heading names; naming both repeats it.
      aria-labelledby={block.name === 'carousel' ? undefined : block.heading.id}
    >
      <BlockSurface
        emphasis={block.emphasis}
        contained={block.contained}
        width='4xl'
        backdrop={
          image && (
            <BlockImg
              image={{ ...image, alt: '' }}
              sizes='100vw'
              className='absolute inset-0 -z-1 size-full object-cover opacity-10'
            />
          )
        }
        className={cn(
          'grid *:min-w-0',
          gap,
          align === 'center' && 'justify-items-center'
        )}
      >
        {block.name === 'carousel' ? (
          <Carousel className={cn('grid w-full', gap)}>
            <Carousel.Title id={block.heading.id} render={() => heading} />
            {/* Clipped sideways only, so the quote mark rising above each quote shows. */}
            <Carousel.Content overflow='hidden' className='overflow-y-visible'>
              {quotes.map((item, index) => (
                <Carousel.Item
                  key={`${index}-${item.person.name}`}
                  className='basis-full'
                >
                  <QuoteFigure
                    {...item}
                    intent={intent}
                    filled={isFilled(block.emphasis)}
                    align={align}
                  />
                </Carousel.Item>
              ))}
            </Carousel.Content>
            <Carousel.Dots className='justify-self-center' />
          </Carousel>
        ) : (
          <>
            {heading}
            {quotes[0] && (
              <QuoteFigure
                {...quotes[0]}
                intent={intent}
                filled={isFilled(block.emphasis)}
                align={align}
              />
            )}
          </>
        )}
        <BlockActions {...block.actions} />
      </BlockSurface>
    </BlockRoot>
  )
}

function QuoteFigure({
  quote,
  person,
  organisation,
  intent,
  filled,
  align
}: TestimonialQuote & {
  intent?: BlockIntent
  filled: boolean
  align: BlockAlign
}) {
  return (
    <figure
      className={cn(
        'grid gap-8 *:min-w-0',
        align === 'center' && 'justify-items-center'
      )}
    >
      <Quote intent={intent} filled={filled} align={align}>
        {quote}
      </Quote>
      <Citation person={person} organisation={organisation} intent={intent} />
    </figure>
  )
}

// The logo is a small mark under the role, as on the website, whatever its file's size.
const LOGO_WIDTH = 160

function Quote({
  children,
  intent,
  filled,
  align
}: {
  children: string
  intent?: BlockIntent
  /** On a filled surface the quote and its mark take the fill's text colour. */
  filled: boolean
  align: BlockAlign
}) {
  return (
    <blockquote
      className={cn(
        'isolate max-w-2xl text-display-prose-5',
        align === 'center' ? 'text-center' : 'text-start',
        'leading-tight text-balance @xl:text-display-prose-4',
        'before:relative before:-z-1 before:block before:text-subtler before:opacity-50 before:content-[open-quote] after:content-[no-close-quote]',
        // Centred, the mark tucks behind the first line, as a typeset pull quote
        // does; at the start edge it would cover the opening words, so it sits
        // smaller, clear above them.
        align === 'center'
          ? 'before:-mb-[0.45em] before:text-[10em] before:leading-[0.5]'
          : 'before:mt-[0.35em] before:mb-0 before:text-[5em] before:leading-[0.3]',
        !filled && intentClass(intent ?? 'info')
      )}
    >
      <p
        className={cn(
          !filled && intentClass(intent ?? 'neutral'),
          'text-strong'
        )}
      >
        {children}
      </p>
    </blockquote>
  )
}

function Citation({
  person,
  organisation,
  intent
}: Pick<TestimonialQuote, 'person' | 'organisation'> & {
  intent?: BlockIntent
}) {
  const logo = organisation?.logo
  return (
    <figcaption className='flex items-start gap-4 @xl:gap-6 @3xl:gap-8'>
      {person.image && (
        <div
          className={cn(
            'aspect-square w-20 shrink-0 overflow-clip rounded-xl border-4 border-normal @xl:w-30',
            intentClass(intent ?? 'info')
          )}
        >
          <BlockImg
            image={person.image}
            sizes='120px'
            className='size-full object-cover'
          />
        </div>
      )}
      <div className='grid justify-items-start gap-2'>
        <div className='grid'>
          <p className='text-display-ui-4 text-strong'>{person.name}</p>
          {person.role && (
            <p className='text-base text-subtle @xl:text-lg'>{person.role}</p>
          )}
          {organisation && !logo && (
            <p className='text-base text-subtle @xl:text-lg'>
              {organisation.name}
            </p>
          )}
        </div>
        {logo && (
          <BlockImg
            image={{ ...logo, alt: logo.alt || organisation.name }}
            sizes={`${LOGO_WIDTH}px`}
            className='h-auto max-h-12 w-auto max-w-40 rounded-md object-contain'
          />
        )}
      </div>
    </figcaption>
  )
}
