import { type ReactNode, useId } from 'react'

import { Prose } from '@oztix/roadie-components/prose'

import type { BlockAction } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import {
  SPOT_ILLUSTRATIONS,
  type SpotIllustrationName
} from '../_shared/illustrations'
import { presetOf } from '../_shared/presets'
import { richTextDefinition } from './definition'

export type RichTextPreset = (typeof richTextDefinition.presets)[number]['name']

export type RichTextProps = {
  /**
   * `statement` centres a title and a few large paragraphs under an
   * illustration; `article-body` sets long-form text at a reading width.
   * @default 'statement'
   */
  preset?: RichTextPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
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
  /** Links after the body. The first is the strong one. */
  actions?: readonly BlockAction[]
  /**
   * The spot illustration above the title in `statement`.
   * @default 'Heart'
   */
  illustration?: SpotIllustrationName
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
  actions,
  illustration = 'Heart'
}: PresetProps) {
  const Illustration = SPOT_ILLUSTRATIONS[illustration]
  return (
    <div className='container-8xl grid justify-items-center gap-4 text-center'>
      <Illustration outline className='size-16' />
      {title ? (
        <BlockHeading
          id={headingId}
          size={4}
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
      ) : (
        <Intro eyebrow={eyebrow} description={description} />
      )}
      {body && (
        <Prose
          size='lg'
          className='text-balance text-subtle [--prose-size:var(--text-xl)] *:mx-auto'
        >
          {body}
        </Prose>
      )}
      <BlockActions actions={actions} className='justify-center' />
    </div>
  )
}

function ArticleBody({
  headingId,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  actions
}: PresetProps) {
  return (
    <div className='container-3xl grid gap-6'>
      {title ? (
        <BlockHeading
          id={headingId}
          align='start'
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
      ) : (
        <Intro eyebrow={eyebrow} description={description} />
      )}
      {body && <Prose size='lg'>{body}</Prose>}
      <BlockActions actions={actions} />
    </div>
  )
}

/** The eyebrow and description BlockHeading would set, for a block with no title. */
function Intro({
  eyebrow,
  description
}: Pick<PresetProps, 'eyebrow' | 'description'>) {
  if (!eyebrow && !description) return null
  return (
    <div className='grid gap-2'>
      {eyebrow && <p className='text-display-prose-5 text-strong'>{eyebrow}</p>}
      {description && (
        <p className='max-w-3xl text-xl text-balance text-subtle'>
          {description}
        </p>
      )}
    </div>
  )
}
