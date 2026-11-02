import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import { type StatItem, StatList } from '../_shared/StatList'
import {
  type BlockAlign,
  type BlockEmphasis,
  type BlockIntent,
  type BlockSize,
  gapOf
} from '../_shared/surface'
import { useBlock } from '../_shared/useBlock'
import { type StatsPreset, statsDefinition } from './definition'

export type { StatItem } from '../_shared/StatList'
export type { StatsPreset } from './definition'

export type StatsProps = {
  /**
   * The named look. `figures` sets a heading over a wrapping row of figures,
   * aligned to the start, with any `emphasis` drawn as a contained panel.
   * @default 'figures'
   */
  preset?: StatsPreset
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** An id for linking to the block. */
  id?: string
  /** A short line above the title. */
  eyebrow?: string
  /** The section's heading, such as `By the numbers`. */
  title: string
  /** Words in the title to mark, such as `numbers`. */
  highlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The stats, three to six, each a value as written, its label, and an optional spot illustration. */
  stats: readonly StatItem[]
  /** Links under the figures. The first is the strong one. */
  actions?: readonly BlockAction[]
  /** The block's intent. The figures, heading, and highlights take its strong text colour. */
  intent?: BlockIntent
  /** The surface behind the heading and figures. None by default. */
  emphasis?: BlockEmphasis
  /**
   * Draws the `emphasis` as a panel inside the page padding; `false` runs it full width as a band.
   * @default true
   */
  contained?: boolean
  /**
   * The heading's and actions' alignment. The figures always start.
   * @default 'start'
   */
  align?: BlockAlign
  /**
   * `md` and `sm` set the title one and two steps smaller, with tighter gaps.
   * @default 'lg'
   */
  size?: BlockSize
}

/** Three to six key numbers as they were written, each with a spot illustration and a label. */
export function Stats(props: StatsProps) {
  const block = useBlock(statsDefinition, props)
  return (
    <BlockRoot {...block.root}>
      <BlockSurface
        emphasis={block.emphasis}
        contained={block.contained}
        className={cn(
          'grid grid-cols-1 *:min-w-0',
          gapOf(props.size, 'normal')
        )}
      >
        <BlockHeading {...block.heading} className='grid-cols-1' />
        <StatList items={props.stats} />
        <BlockActions {...block.actions} />
      </BlockSurface>
    </BlockRoot>
  )
}
