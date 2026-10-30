import { type ReactNode, useId } from 'react'

import { Prose } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading, descriptionClass } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import {
  SPOT_ILLUSTRATIONS,
  type SpotIllustrationName
} from '../_shared/illustrations'
import { presetOf } from '../_shared/presets'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  bySize
} from '../_shared/surface'
import { type RichTextPreset, richTextDefinition } from './definition'

export type { RichTextPreset } from './definition'

export type RichTextProps = {
  /**
   * `statement` centres a title and a few large paragraphs under an
   * illustration, with generous space around them; `long-form` sets
   * long-form text at a reading width, aligned to the start.
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
  /** The surface behind the block: a band, full width and rounded once the block is wide, or a panel with `contained`. None by default. */
  emphasis?: BlockEmphasis
  /** Draws the `emphasis` as a panel inside the page padding instead of a band. */
  contained?: boolean
  /**
   * The heading's and text's alignment.
   * @default 'center' in `statement`, 'start' in `long-form`
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller, with tighter gaps.
   * @default 'lg'
   */
  size?: BlockSize
}

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

// The statement's body runs a step above Prose's own lg.
const STATEMENT_BODY: Record<BlockSize, string> = {
  sm: '',
  md: '',
  lg: '[--prose-size:var(--text-xl)]'
}

const STATEMENT_ALIGN: Record<BlockAlign, string> = {
  center: 'justify-items-center text-center',
  start: 'text-start'
}

function Statement({
  headingId,
  intent,
  emphasis,
  contained,
  align = 'center',
  size,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  actions,
  illustration = 'Heart'
}: PresetProps) {
  const Illustration = SPOT_ILLUSTRATIONS[illustration]
  const onSurface = emphasis != null
  return (
    <BlockSurface
      emphasis={emphasis}
      contained={contained}
      className={cn(
        'grid *:min-w-0',
        bySize(size, { sm: 'gap-2', md: 'gap-3', lg: 'gap-4' }),
        STATEMENT_ALIGN[align],
        // The breathing room is this preset's look, the one block with outer
        // padding. On a surface, the surface pads it, with a little more once wide.
        onSurface ? '@4xl:py-12' : 'py-8 @xl:py-16 @4xl:py-32'
      )}
    >
      <Illustration outline className='size-16' />
      {title ? (
        <BlockHeading
          className='[&>h2]:max-w-none'
          id={headingId}
          intent={intent}
          step={4}
          size={size}
          align={align}
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
      ) : (
        <Intro eyebrow={eyebrow} description={description} size={size} />
      )}
      {body && (
        <Prose
          size={bySize(size, { sm: 'md', md: 'lg', lg: 'lg' })}
          className={cn(
            'text-balance text-subtle',
            STATEMENT_BODY[size ?? 'lg'],
            align === 'center' && '*:mx-auto'
          )}
        >
          {body}
        </Prose>
      )}
      <BlockActions
        actions={actions}
        intent={intent}
        className={cn(align === 'center' && 'justify-center')}
      />
    </BlockSurface>
  )
}

function LongForm({
  headingId,
  intent,
  emphasis,
  contained,
  align = 'start',
  size,
  eyebrow,
  title,
  titleHighlight,
  description,
  body,
  actions
}: PresetProps) {
  return (
    <BlockSurface
      emphasis={emphasis}
      contained={contained}
      width='3xl'
      className={cn(
        'grid *:min-w-0',
        bySize(size, { sm: 'gap-3', md: 'gap-4', lg: 'gap-6' }),
        align === 'center' && 'text-center'
      )}
    >
      {title ? (
        <BlockHeading
          id={headingId}
          intent={intent}
          size={size}
          align={align}
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
      ) : (
        <Intro eyebrow={eyebrow} description={description} size={size} />
      )}
      {body && (
        <Prose size={bySize(size, { sm: 'md', md: 'md', lg: 'lg' })}>
          {body}
        </Prose>
      )}
      <BlockActions
        actions={actions}
        intent={intent}
        className={cn(align === 'center' && 'justify-center')}
      />
    </BlockSurface>
  )
}

/** The eyebrow and description BlockHeading would set, for a block with no title. */
function Intro({
  eyebrow,
  description,
  size
}: Pick<PresetProps, 'eyebrow' | 'description' | 'size'>) {
  if (!eyebrow && !description) return null
  return (
    <div className='grid gap-2'>
      {eyebrow && <p className='text-display-prose-5 text-strong'>{eyebrow}</p>}
      {description && (
        <p
          className={cn(
            'max-w-3xl text-balance text-subtle',
            descriptionClass(size)
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
