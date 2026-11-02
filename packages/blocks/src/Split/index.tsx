import type { ReactNode } from 'react'

import { Prose } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import { type StatItem, StatList } from '../_shared/StatList'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type SplitPreset, splitDefinition } from './definition'

export type { StatItem } from '../_shared/StatList'
export type { SplitPreset } from './definition'

/** The figures beside a `stats` split's text. */
export type SplitStats = {
  /** The aside's heading, such as `By the numbers`. */
  title: string
  /** A sentence under the aside's heading. */
  description?: string
  /** The stats, each a value as written, its label, and an optional spot illustration. */
  items: readonly StatItem[]
}

export type SplitProps = {
  /**
   * The look. `image-start` and `image-end` set the `image` before or after the heading, body, and actions. `stats` sets the `stats` beside long-form text. For a list of rows that alternate sides, use Splits.
   * @default 'image-start'
   */
  preset?: SplitPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section's heading. */
  title: string
  /** Words in the title to mark, such as `partnerships`. */
  highlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** Rich text under the heading, already rendered, such as from Portable Text. The block sets it in `Prose`. */
  body?: ReactNode
  /** Links under the text, as buttons. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The image beside the text in `image-start` and `image-end`. On phones, it sits above the text in both. */
  image?: BlockImage
  /** The figures beside the text in `stats`. They wrap below the text on narrow widths. */
  stats?: SplitStats
  /**
   * The block's intent, which its highlights and actions take. On a surface, the title takes it and the rest of the text stays neutral.
   */
  intent?: BlockIntent
  /** The surface behind the block. Unset, it has none. */
  emphasis?: BlockEmphasis
  /** Draws the surface as a panel inside the page's padding instead of a full-width band. Unset, it's a panel. */
  contained?: boolean
  /**
   * The heading's and text's alignment.
   * @default 'start'
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller and tightens the gaps. Beside an image, they narrow it to two fifths, cropped 8 by 5, and set the body in subtle text.
   * @default 'lg'
   */
  size?: BlockSize
}

/** A section of text beside an image, or beside the numbers that back it up. */
export function Split(props: SplitProps) {
  const { body, image, stats, intent, size = 'lg' } = props
  const block = useBlock(splitDefinition, props)
  const { name, align } = block

  return (
    <BlockRoot {...block.root}>
      <MediaText
        emphasis={block.emphasis}
        contained={block.contained}
        intent={intent}
        align={align}
        size={size}
        image={name === 'stats' ? undefined : image}
        imageEnd={name === 'image-end'}
        stats={name === 'stats' ? stats : undefined}
        body={body}
        heading={<BlockHeading {...block.heading} step={2} />}
        actions={<BlockActions {...block.actions} />}
      />
    </BlockRoot>
  )
}

function MediaText({
  emphasis,
  contained,
  intent,
  align,
  size,
  image,
  imageEnd,
  stats,
  body,
  heading,
  actions
}: Pick<
  SplitProps,
  'emphasis' | 'contained' | 'intent' | 'image' | 'stats' | 'body'
> & {
  align: BlockAlign
  size: BlockSize
  imageEnd: boolean
  heading: ReactNode
  actions: ReactNode
}) {
  const compact = size === 'sm' || size === 'md'
  const content = (
    <div
      className={cn(
        'grid min-w-0 grid-cols-1 content-start wrap-break-word',
        compact ? 'gap-4' : 'gap-6',
        align === 'center' && 'justify-items-center text-center',
        // On a surface the title keeps the block's intent, and the rest of the text reads as neutral, as on the live site.
        emphasis && ['intent-neutral', HEADING_INTENT[intent ?? 'neutral']]
      )}
    >
      {heading}
      {body && (
        <Prose
          size={stats && !compact ? 'lg' : 'md'}
          className={cn(
            stats && 'max-w-[60ch] [&>h3]:text-display-prose-5',
            compact && 'text-subtle'
          )}
        >
          {body}
        </Prose>
      )}
      {actions}
    </div>
  )

  if (stats) {
    return (
      <BlockSurface
        emphasis={emphasis}
        contained={contained}
        className='grid grid-cols-1 gap-12 @3xl:grid-cols-[minmax(0,1fr)_20rem] @5xl:gap-x-24'
      >
        {content}
        <StatsAside {...stats} />
      </BlockSurface>
    )
  }

  return (
    <BlockSurface
      emphasis={emphasis}
      contained={contained}
      className={cn(
        'grid grid-cols-1 items-center',
        compact ? 'gap-6 @3xl:gap-12' : 'gap-8 @5xl:gap-16',
        image &&
          (compact
            ? imageEnd
              ? '@xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'
              : '@xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
            : '@xl:grid-cols-2')
      )}
    >
      {image && (
        <div
          className={cn(
            'min-w-0 overflow-hidden',
            compact ? 'aspect-8/5' : 'aspect-4/3',
            emphasis ? 'rounded-xl' : 'rounded-2xl',
            imageEnd && '@xl:order-last'
          )}
        >
          <BlockImg
            image={image}
            sizes={
              compact
                ? '(min-width: 40rem) 40vw, 100vw'
                : '(min-width: 40rem) 50vw, 100vw'
            }
            className='size-full object-cover'
          />
        </div>
      )}
      {content}
    </BlockSurface>
  )
}

// Literal class names, so Tailwind finds them.
const HEADING_INTENT: Record<BlockIntent, string> = {
  neutral: '[&_h2]:intent-neutral',
  brand: '[&_h2]:intent-brand',
  'brand-secondary': '[&_h2]:intent-brand-secondary',
  'brand-purple': '[&_h2]:intent-brand-purple',
  accent: '[&_h2]:intent-accent',
  info: '[&_h2]:intent-info',
  success: '[&_h2]:intent-success',
  warning: '[&_h2]:intent-warning',
  danger: '[&_h2]:intent-danger'
}

function StatsAside({ title, description, items }: SplitStats) {
  return (
    <div className='grid min-w-0 content-start gap-4'>
      <div className='grid gap-0.5'>
        <h3 className='text-display-prose-4 text-strong'>{title}</h3>
        {description && <p className='text-subtle'>{description}</p>}
      </div>
      <StatList items={items} />
    </div>
  )
}
