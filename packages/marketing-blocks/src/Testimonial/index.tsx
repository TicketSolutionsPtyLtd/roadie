import { useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import type { BlockImage } from '../Provider'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import { type TestimonialPreset, testimonialDefinition } from './definition'

export type { TestimonialPreset } from './definition'

export type TestimonialPerson = {
  /** The person quoted. */
  name: string
  /** Their job title, such as `Head of Programming`. */
  role?: string
  /** A square portrait. */
  image?: BlockImage
}

export type TestimonialOrganisation = {
  /** Shown as text when there's no logo, and read out when the logo has no alt text. */
  name: string
  /** The organisation's logo, at most 48px tall under the person's role. Its name stands in when the logo has no alt text. */
  logo?: BlockImage
}

export type TestimonialProps = {
  /**
   * The look to render. `quote` is the only one so far.
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
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The quote, without quotation marks; the block draws them. */
  quote: string
  /** Who said it. */
  person: TestimonialPerson
  /** Where they work. */
  organisation?: TestimonialOrganisation
  /** A photo faded behind the whole block, which then pads its content. Decorative, so its alt text isn't read. */
  backgroundImage?: BlockImage
}

/** A client's quote, large and centred, with their portrait, role, and organisation. */
export function Testimonial({
  preset,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  quote,
  person,
  organisation,
  backgroundImage
}: TestimonialProps) {
  const { name, variant } = presetOf(testimonialDefinition, preset)
  const headingId = useId()
  return (
    <BlockRoot
      block={testimonialDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={headingId}
      className='relative isolate grid'
    >
      {backgroundImage && (
        <BlockImg
          image={{ ...backgroundImage, alt: '' }}
          sizes='100vw'
          className='absolute inset-0 -z-1 size-full object-cover opacity-10'
        />
      )}
      <div
        className={cn(
          'container-4xl grid justify-items-center gap-16 *:min-w-0',
          backgroundImage && 'py-12 @xl:py-16 @3xl:py-20'
        )}
      >
        <BlockHeading
          id={headingId}
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
        <figure className='grid justify-items-center gap-8 *:min-w-0'>
          <Quote>{quote}</Quote>
          <Citation person={person} organisation={organisation} />
        </figure>
      </div>
    </BlockRoot>
  )
}

// The logo is a small mark under the role, as on the website, whatever its file's size.
const LOGO_WIDTH = 160

// The glyph's negative margin tucks the quote's first line into its lower
// half, as a typeset pull quote does.
function Quote({ children }: { children: string }) {
  return (
    <blockquote
      className={
        'isolate max-w-2xl text-center text-display-prose-5 leading-tight text-balance text-strong @xl:text-display-prose-4 ' +
        'before:relative before:-z-1 before:-mb-[0.45em] before:block before:text-[10em] before:leading-[0.5] before:text-subtler before:opacity-50 before:content-[open-quote] before:intent-info after:content-[no-close-quote]'
      }
    >
      <p>{children}</p>
    </blockquote>
  )
}

function Citation({
  person,
  organisation
}: Pick<TestimonialProps, 'person' | 'organisation'>) {
  const logo = organisation?.logo
  return (
    <figcaption className='flex items-start gap-4 @xl:gap-6 @3xl:gap-8'>
      {person.image && (
        <div className='aspect-square w-20 shrink-0 overflow-clip rounded-xl border-4 border-normal intent-info @xl:w-30'>
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
