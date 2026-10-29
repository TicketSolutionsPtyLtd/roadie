import { useId } from 'react'

import { BlockHeading } from '../_shared/BlockHeading'
import { BlockRoot } from '../_shared/BlockRoot'
import { presetOf } from '../_shared/presets'
import { type StatItem, StatList } from './StatList'
import { statsDefinition } from './definition'

export type { SpotIllustrationName, StatItem } from './StatList'

export type StatsProps = {
  /**
   * The named look. `company-facts` sets a heading over a wrapping row of stats.
   * @default 'company-facts'
   */
  preset?: 'company-facts'
  /** The block's place on the page, counting from 1, reported with its events. */
  position?: number
  /** The section's id, for linking to it as an anchor. */
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
  items
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
      aria-labelledby={headingId}
    >
      <div className='container-8xl grid gap-8'>
        <BlockHeading
          id={headingId}
          align='start'
          eyebrow={eyebrow}
          title={title}
          titleHighlight={titleHighlight}
          description={description}
        />
        <StatList items={items} />
      </div>
    </BlockRoot>
  )
}
