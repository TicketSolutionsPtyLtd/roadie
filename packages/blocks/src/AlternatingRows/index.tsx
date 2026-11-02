import { Card } from '@oztix/roadie-components/card'
import { Mark } from '@oztix/roadie-components/mark'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction, BlockImage } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockImg } from '../_shared/BlockImg'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
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
import {
  type AlternatingRowsPreset,
  alternatingRowsDefinition
} from './definition'

export type { AlternatingRowsPreset } from './definition'

/** One of the rows. */
export type AlternatingRow = {
  /** The row's heading, marked in the row's intent. */
  title: string
  /** A short line under the title. */
  subtitle?: string
  description?: string
  /** A photo, cropped square, beside the text. Give every row one. */
  image?: BlockImage
  /** The row's own page. Its title becomes the link, and the whole row the place to click. */
  href?: string
  /** This row's intent, in place of the block's, which tints the row and marks its title. */
  intent?: BlockIntent
}

export type AlternatingRowsProps = {
  /**
   * The look. `text-blocks` sets `rows` as a title set on a colour, with text beside a square photo, alternating sides, starting with the photo.
   * @default 'text-blocks'
   */
  preset?: AlternatingRowsPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section's heading. */
  title: string
  /** Words in the title to mark, such as `values`. */
  highlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The rows, three to six. */
  rows: readonly AlternatingRow[]
  /** Links under the rows, as buttons. The first is the strong one. */
  actions?: readonly BlockAction[]
  /**
   * The block's intent, which its highlights, actions, and marks take. Without one, the titles are marked in a cycle of info, brand, and brand-secondary.
   */
  intent?: BlockIntent
  /** The surface behind the block. Unset, it has none. */
  emphasis?: BlockEmphasis
  /** Draws the surface as a panel inside the page's padding instead of a full-width band. */
  contained?: boolean
  /** Every row's surface. Unset, rows have none, though a linked row with none takes `subtler`. */
  itemEmphasis?: ItemEmphasis
  /**
   * The heading's alignment.
   * @default 'start'
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller and tighten the gaps between rows.
   * @default 'lg'
   */
  size?: BlockSize
}

/** Three to six values or story steps, each a sentence or two beside a photo, alternating sides. */
export function AlternatingRows(props: AlternatingRowsProps) {
  const { rows, intent, itemEmphasis, size = 'lg' } = props
  const block = useBlock(alternatingRowsDefinition, props)

  return (
    <BlockRoot {...block.root}>
      <BlockSurface
        emphasis={block.emphasis}
        contained={block.contained}
        className='grid grid-cols-1 gap-12 wrap-anywhere'
      >
        <BlockHeading
          {...block.heading}
          step={2}
          wide={block.align === 'start'}
        />
        <ul className={cn('grid grid-cols-1', gapOf(size, 'wider'))}>
          {rows.map((row, index) => (
            <Row
              key={`${index}-${row.title}`}
              item={row}
              index={index}
              itemEmphasis={itemEmphasis}
              blockIntent={intent}
            />
          ))}
        </ul>
        <BlockActions {...block.actions} />
      </BlockSurface>
    </BlockRoot>
  )
}

function Row({
  item,
  index,
  itemEmphasis,
  blockIntent
}: {
  item: AlternatingRow
  index: number
  itemEmphasis: ItemEmphasis | undefined
  blockIntent: BlockIntent | undefined
}) {
  const imageFirst = index % 2 === 0
  return (
    <li
      className={cn(
        itemSurfaceClass(item, itemEmphasis),
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
            intent={cycledMarkIntent(item, blockIntent, index)}
            className='px-3 text-display-prose-4'
          >
            {item.href ? (
              <Card.Link href={item.href}>{item.title}</Card.Link>
            ) : (
              item.title
            )}
          </Mark>
          {item.subtitle && (
            <Mark
              render={<p />}
              intent='neutral'
              className='px-3 py-1 text-display-ui-5'
            >
              {item.subtitle}
            </Mark>
          )}
        </div>
        {item.description && (
          <p className='text-lg text-subtle'>{item.description}</p>
        )}
      </div>
      <div
        aria-hidden={!item.image || undefined}
        className={cn(
          'relative aspect-square w-full max-w-80 overflow-hidden rounded-3xl bg-subtle @xl:max-w-none',
          imageFirst && '@xl:-order-1'
        )}
      >
        {item.image && (
          <BlockImg
            image={item.image}
            sizes='(min-width: 768px) 40vw, 100vw'
            className='absolute inset-0 size-full object-cover'
          />
        )}
      </div>
    </li>
  )
}
