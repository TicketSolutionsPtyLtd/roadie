import { useId } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import type { BlockAction } from '../Provider'
import { BlockActions } from '../_shared/BlockActions'
import { BlockHeading } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import { BlockSurface } from '../_shared/BlockSurface'
import { type StatItem, StatList } from '../_shared/StatList'
import { presetOf } from '../_shared/presets'
import type {
  BlockAlign,
  BlockEmphasis,
  BlockIntent,
  BlockSize
} from '../_shared/surface'
import { type StatsPreset, statsDefinition } from './definition'

export type { StatItem } from '../_shared/StatList'
export type { StatsPreset } from './definition'

export type StatsProps = {
  /**
   * The named look. `figures` sets a heading over a wrapping row of figures,
   * aligned to the start, with any `emphasis` drawn as an inset panel.
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
  titleHighlight?: string | string[]
  /** A sentence under the title. */
  description?: string
  /** The stats, each a value as written, its label, and an optional spot illustration. */
  items: readonly StatItem[]
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
  inset?: boolean
  /**
   * The heading's and actions' alignment. The figures always start.
   * @default 'start'
   */
  align?: BlockAlign
  /**
   * `md` sets the title a step smaller, with tighter gaps.
   * @default 'lg'
   */
  size?: BlockSize
}

/** Key numbers as they were written, each with a spot illustration and a label. */
export function Stats({
  preset,
  position,
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  items,
  actions,
  intent,
  emphasis,
  inset = true,
  align = 'start',
  size
}: StatsProps) {
  const { name, variant } = presetOf(statsDefinition, preset)
  const headingId = useId()
  return (
    <BlockRoot
      block={statsDefinition.name}
      variant={variant}
      preset={name}
      position={position}
      id={id}
      intent={intent}
      aria-labelledby={headingId}
    >
      <BlockSurface
        emphasis={emphasis}
        inset={inset}
        className={cn(
          'grid grid-cols-1 *:min-w-0',
          size === 'md' ? 'gap-6' : 'gap-8'
        )}
      >
        <BlockHeading
          id={headingId}
          intent={intent}
          align={align}
          size={size}
          className='grid-cols-1'
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
        <StatList items={items} />
        <BlockActions
          actions={actions}
          intent={intent}
          className={cn(align === 'center' && 'justify-center')}
        />
      </BlockSurface>
    </BlockRoot>
  )
}
