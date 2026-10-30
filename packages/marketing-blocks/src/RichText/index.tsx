import { type ReactNode, useId } from 'react'

import { Prose } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import {
  SPOT_ILLUSTRATIONS,
  type SpotIllustrationName
} from '../_shared/illustrations'
import { presetOf } from '../_shared/presets'
import {
  type BlockEmphasis,
  type BlockIntent,
  emphasisClass
} from '../_shared/surface'
import { type RichTextPreset, richTextDefinition } from './definition'

export type { RichTextPreset } from './definition'

export type RichTextProps = {
  /**
   * `statement` centres a title and a few large paragraphs under an
   * illustration; `long-form` sets long-form text at a reading width.
   * @default 'statement'
   */
  preset?: RichTextPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section's `h2`. Optional in `long-form`, where the body can carry its own headings. */
  title?: string
  /** Words in the title to mark, such as `Australian-owned`. */
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The rich text, already rendered, such as paragraphs from a CMS. Set in `Prose`. Its headings start at `h3` under a title, or `h2` with none. */
  body?: ReactNode
  /** Links after the body. The first is the strong one. */
  actions?: readonly BlockAction[]
  /**
   * The spot illustration above the title in `statement`.
   * @default 'Heart'
   */
  illustration?: SpotIllustrationName
  /**
   * The block's intent: its highlighted words and strong action take it.
   * Without one, the highlight is brand-secondary and the action accent.
   */
  intent?: BlockIntent
  /**
   * A band behind `statement`, full width and rounded once the block is wide;
   * none by default. Applies to `statement` only: `long-form` accepts it and
   * ignores it, so a CMS can send it for either preset.
   */
  emphasis?: RichTextEmphasis
}

/** The surfaces a statement's text stays readable on, in both themes. */
export type RichTextEmphasis = Extract<
  BlockEmphasis,
  'subtle' | 'subtler' | 'raised'
>

/** A title and rich text, from a short statement to an article. */
export function RichText({ preset, position, id, ...content }: RichTextProps) {
  const headingId = useId()
  const { name, variant } = presetOf(richTextDefinition, preset)
  return (
    <BlockRoot
      block={richTextDefinition.name}
      intent={content.intent}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      aria-labelledby={content.title ? headingId : undefined}
    >
      {name === 'long-form' ? (
        <LongForm headingId={headingId} {...content} />
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
  intent,
  emphasis,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  actions,
  illustration = 'Heart'
}: PresetProps) {
  const Illustration = SPOT_ILLUSTRATIONS[illustration]
  // The breathing room is this preset's look, the one block with outer
  // padding; a band keeps it inside, and runs full width like every section band.
  const content = (
    <div className='container-8xl'>
      <div className='grid justify-items-center gap-4 py-8 text-center *:min-w-0 @xl:py-16 @4xl:py-32'>
        <Illustration outline className='size-16' />
        {title ? (
          <BlockHeading
            className='[&>h2]:max-w-none'
            id={headingId}
            intent={intent}
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
        <BlockActions
          actions={actions}
          intent={intent}
          className='justify-center'
        />
      </div>
    </div>
  )
  if (!emphasis) return content
  return (
    <div
      data-slot='statement-band'
      className={cn('@7xl:rounded-3xl', emphasisClass(emphasis))}
    >
      {content}
    </div>
  )
}

function LongForm({
  headingId,
  intent,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  actions
}: PresetProps) {
  return (
    <div className='container-3xl grid gap-6 *:min-w-0'>
      {title ? (
        <BlockHeading
          id={headingId}
          intent={intent}
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
      <BlockActions actions={actions} intent={intent} />
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
