import { type ReactNode, useId } from 'react'

import { Highlight } from '@oztix/roadie-components/highlight'
import { Prose } from '@oztix/roadie-components/prose'
import {
  Heart,
  HighFive,
  MapPin
} from '@oztix/roadie-components/spot-illustrations'

import { BlockHeading } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import { richTextDefinition } from './definition'

export type RichTextPreset = (typeof richTextDefinition.presets)[number]['name']

const ILLUSTRATIONS = { Heart, HighFive, MapPin }

export type RichTextIllustration = keyof typeof ILLUSTRATIONS

export type RichTextProps = {
  /**
   * `statement` centres a title and a few large paragraphs under an
   * illustration; `article-body` sets long-form text at a reading width.
   * @default 'statement'
   */
  preset?: RichTextPreset
  /** The block's place on the page, counting from 1. */
  position?: number
  /** The section's anchor, such as `our-mission`. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section's `h2`. Optional in `article-body`, where the body can carry its own headings. */
  title?: string
  /** Words in the title to mark, such as `Australian-owned`. */
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The rich text, already rendered, such as paragraphs from a CMS. Set in `Prose`; headings inside start at `h3`. */
  body?: ReactNode
  /**
   * The spot illustration above the title in `statement`.
   * @default 'Heart'
   */
  illustration?: RichTextIllustration
}

/** A title and rich text, from a short statement to an article. */
export function RichText({ preset, position, id, ...content }: RichTextProps) {
  const headingId = useId()
  const { name, variant } = presetOf(richTextDefinition, preset)
  return (
    <BlockRoot
      block={richTextDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={content.title ? headingId : undefined}
    >
      {name === 'article-body' ? (
        <ArticleBody headingId={headingId} {...content} />
      ) : (
        <Statement headingId={headingId} {...content} />
      )}
    </BlockRoot>
  )
}

type PresetProps = Omit<RichTextProps, 'preset' | 'position' | 'id'> & {
  headingId: string
}

function Statement({
  headingId,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  illustration = 'Heart'
}: PresetProps) {
  const Illustration = ILLUSTRATIONS[illustration]
  return (
    <div className='container-8xl grid justify-items-center gap-4 py-8 text-center @3xl:py-16 @5xl:py-32'>
      <Illustration outline className='size-16' />
      {eyebrow && <p className='text-display-prose-5 text-strong'>{eyebrow}</p>}
      {title && (
        <h2
          id={headingId}
          className='max-w-4xl text-display-prose-4 text-balance text-strong'
        >
          {titleHighlight ? (
            <Highlight
              text={title}
              query={titleHighlight}
              intent='brand-secondary'
            />
          ) : (
            title
          )}
        </h2>
      )}
      {description && (
        <p className='max-w-3xl text-xl text-balance text-subtle'>
          {description}
        </p>
      )}
      {body && (
        <Prose
          size='lg'
          className='text-balance text-subtle [--prose-size:var(--text-xl)] *:mx-auto'
        >
          {body}
        </Prose>
      )}
    </div>
  )
}

function ArticleBody({
  headingId,
  eyebrow,
  title,
  titleHighlight,
  description,
  body
}: PresetProps) {
  return (
    <div className='container-3xl grid gap-6 py-8 @3xl:py-12'>
      {title && (
        <BlockHeading
          id={headingId}
          align='start'
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
      )}
      {body && <Prose size='lg'>{body}</Prose>}
    </div>
  )
}
