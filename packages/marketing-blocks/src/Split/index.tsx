import type { ReactNode } from 'react'

import { Card } from '@oztix/roadie-components/card'
import { Mark } from '@oztix/roadie-components/mark'
import { Prose } from '@oztix/roadie-components/prose'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import { type StatItem, StatList } from '../_shared/StatList'
import { cycledMarkIntent, itemSurfaceClass } from '../_shared/items'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  type ItemEmphasis,
  gapOf
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type SplitPreset, splitDefinition } from './definition'

export type { StatItem } from '../_shared/StatList'
export type { SplitPreset } from './definition'

/** The stats beside a `media-text` split, in place of its image. */
export type SplitStats = {
  /** The aside's heading, such as `By the numbers`. */
  title: string
  /** A sentence under the aside's heading. */
  description?: string
  /** The stats, each a value as written, its label, and an optional spot illustration. */
  items: readonly StatItem[]
}

/** A row of `alternating-rows`. */
export type SplitRow = {
  /** The row's heading, marked in the row's intent. */
  title: string
  /** A short line under the title. */
  subtitle?: string
  description?: string
  /** A photo, cropped square, beside the text. */
  image?: BlockImage
  /** The row's own page. Its title becomes the link, and the whole row the place to click. */
  href?: string
  /** This row's intent, in place of the block's, which tints the row and marks its title. */
  intent?: BlockIntent
}

export type SplitProps = {
  /**
   * The look. `media-text` sets an image, or `stats`, beside the heading, body, and actions. `alternating-rows` sets `items` as rows of text beside a square image, alternating sides.
   * @default 'media-text'
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
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** `media-text`'s rich text under the heading, already rendered, such as from Portable Text. The block sets it in `Prose`. */
  body?: ReactNode
  /** Links under the text, as buttons. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The `media-text` image, shown before the text. */
  image?: BlockImage
  /** The `media-text` stats, in place of the image, beside long-form text. They wrap below the text on narrow widths. */
  stats?: SplitStats
  /** The `alternating-rows` rows. */
  items?: readonly SplitRow[]
  /**
   * The block's intent, which its highlights, actions, and marks take. On a surface, the title takes it and the rest of the text stays neutral. Without one, `alternating-rows` marks its titles in a cycle of info, brand, and brand-secondary.
   */
  intent?: BlockIntent
  /** The surface behind the block. Unset, it has none. */
  emphasis?: BlockEmphasis
  /** Draws the surface as a panel inside the page's padding instead of a full-width band. Unset, `media-text` is contained and `alternating-rows` is a band. */
  contained?: boolean
  /** Every row's surface in `alternating-rows`. Unset, rows have none, though a linked row with none takes `subtler`. */
  itemEmphasis?: ItemEmphasis
  /**
   * The heading's and text's alignment.
   * @default 'start'
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller and tightens the gaps. In `media-text`, it narrows the image to two fifths, cropped 8 by 5, and sets the body in subtle text.
   * @default 'lg'
   */
  size?: BlockSize
}

/** Text beside an image or the numbers that back it up, or rows of text and images that alternate sides. */
export function Split(props: SplitProps) {
  const {
    body,
    image,
    stats,
    items = [],
    intent,
    itemEmphasis,
    size = 'lg'
  } = props
  const block = useBlock(splitDefinition, props)
  const { name, align } = block
  const heading = (
    <BlockHeading
      {...block.heading}
      step={2}
      wide={name === 'alternating-rows' && align === 'start'}
    />
  )
  const blockActions = <BlockActions {...block.actions} />

  return (
    <BlockRoot {...block.root}>
      {name === 'alternating-rows' ? (
        <BlockSurface
          emphasis={block.emphasis}
          contained={block.contained}
          className='grid grid-cols-1 gap-12 wrap-anywhere'
        >
          {heading}
          <ul className={cn('grid grid-cols-1', gapOf(size, 'wider'))}>
            {items.map((row, index) => (
              <AlternatingRow
                key={`${index}-${row.title}`}
                row={row}
                index={index}
                itemEmphasis={itemEmphasis}
                blockIntent={intent}
              />
            ))}
          </ul>
          {blockActions}
        </BlockSurface>
      ) : (
        <MediaText
          emphasis={block.emphasis}
          contained={block.contained}
          intent={intent}
          align={align}
          size={size}
          image={image}
          stats={stats}
          body={body}
          heading={heading}
          actions={blockActions}
        />
      )}
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
  heading: ReactNode
  actions: ReactNode
}) {
  const compact = size === 'sm' || size === 'md'
  const media = stats ? undefined : image
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
        media &&
          (compact
            ? '@xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
            : '@xl:grid-cols-2')
      )}
    >
      {media && (
        <div
          className={cn(
            'min-w-0 overflow-hidden',
            compact ? 'aspect-8/5' : 'aspect-4/3',
            emphasis ? 'rounded-xl' : 'rounded-2xl'
          )}
        >
          <BlockImg
            image={media}
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

function AlternatingRow({
  row,
  index,
  itemEmphasis,
  blockIntent
}: {
  row: SplitRow
  index: number
  itemEmphasis: ItemEmphasis | undefined
  blockIntent: BlockIntent | undefined
}) {
  const imageFirst = index % 2 === 0
  return (
    <li
      className={cn(
        itemSurfaceClass(row, itemEmphasis),
        'grid items-start gap-x-12 gap-y-4 rounded-3xl @xl:items-center',
        imageFirst
          ? '@xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
          : '@xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'
      )}
    >
      <div className='grid gap-4'>
        <div className='grid'>
          <Mark
            render={<h3 />}
            intent={cycledMarkIntent(row, blockIntent, index)}
            className='px-3 text-display-prose-4'
          >
            {row.href ? (
              <Card.Link href={row.href}>{row.title}</Card.Link>
            ) : (
              row.title
            )}
          </Mark>
          {row.subtitle && (
            <Mark
              render={<p />}
              intent='neutral'
              className='px-3 py-1 text-display-ui-5'
            >
              {row.subtitle}
            </Mark>
          )}
        </div>
        {row.description && (
          <p className='text-lg text-subtle'>{row.description}</p>
        )}
      </div>
      <div
        aria-hidden={!row.image || undefined}
        className={cn(
          'relative aspect-square w-full max-w-80 overflow-hidden rounded-3xl bg-subtle @xl:max-w-none',
          imageFirst && '@xl:-order-1'
        )}
      >
        {row.image && (
          <BlockImg
            image={row.image}
            sizes='(min-width: 768px) 40vw, 100vw'
            className='absolute inset-0 size-full object-cover'
          />
        )}
      </div>
    </li>
  )
}
