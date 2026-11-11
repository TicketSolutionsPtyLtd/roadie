import type { ReactNode } from 'react'

import { Prose } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading, descriptionClass } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import {
  type SpotIllustrationName,
  spotIllustration
} from '../_shared/illustrations'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  bySize,
  gapOf
} from '../_shared/surface'
import { type BlockFrame, useBlock } from '../_shared/useBlock'
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
  highlight?: string | string[]
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
  /** The surface behind the block: a band across the window, or a panel with `contained`. None by default. */
  emphasis?: BlockEmphasis
  /** Draws the `emphasis` as a rounded panel within the page's frame, in line with the hero, instead of a band across the window. */
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
export function RichText(props: RichTextProps) {
  const block = useBlock(richTextDefinition, props)
  return (
    <BlockRoot
      {...block.root}
      aria-labelledby={props.title ? block.heading.id : undefined}
    >
      {block.name === 'long-form' ? (
        <LongForm {...props} block={block} />
      ) : (
        <Statement {...props} block={block} />
      )}
    </BlockRoot>
  )
}

type PresetProps = RichTextProps & { block: BlockFrame }

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
  block,
  size,
  eyebrow,
  title,
  description,
  body,
  illustration = 'Heart'
}: PresetProps) {
  const { align, emphasis } = block
  const Illustration = spotIllustration(illustration, 'Heart')
  const onSurface = emphasis != null
  return (
    <BlockSurface
      emphasis={emphasis}
      contained={block.contained}
      className={cn(
        'grid *:min-w-0',
        gapOf(size, 'tight'),
        STATEMENT_ALIGN[align],
        // The breathing room is this preset's look, the one block with outer
        // padding. On a surface, the surface pads it, with a little more once wide.
        onSurface ? '@4xl:py-12' : 'py-8 @xl:py-16 @4xl:py-32'
      )}
    >
      <Illustration outline className='size-16' />
      {title ? (
        <BlockHeading
          {...block.heading}
          className='[&>h2]:max-w-none'
          step={4}
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
      <BlockActions {...block.actions} />
    </BlockSurface>
  )
}

function LongForm({
  block,
  size,
  eyebrow,
  title,
  description,
  body
}: PresetProps) {
  return (
    <BlockSurface
      emphasis={block.emphasis}
      contained={block.contained}
      width='3xl'
      className={cn(
        'grid *:min-w-0',
        gapOf(size, 'snug'),
        block.align === 'center' && 'text-center'
      )}
    >
      {title ? (
        <BlockHeading {...block.heading} />
      ) : (
        <Intro eyebrow={eyebrow} description={description} size={size} />
      )}
      {body && (
        <Prose size={bySize(size, { sm: 'md', md: 'md', lg: 'lg' })}>
          {body}
        </Prose>
      )}
      <BlockActions {...block.actions} />
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
