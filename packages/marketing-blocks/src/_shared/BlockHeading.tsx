import { Highlight } from '@oztix/roadie-components/highlight'
import { cn } from '@oztix/roadie-core/utils'

import type { BlockAlign, BlockIntent, BlockSize } from './surface'

export type BlockHeadingProps = {
  eyebrow?: string
  title: string
  /** Words in the title to mark, such as `more tickets`. */
  titleHighlight?: string | string[]
  description?: string
  /** 1 only for the block that opens the page. */
  level?: 1 | 2
  /** The title's `text-display-prose-*` step, when the preset sets one other than the level's. */
  step?: TitleStep
  /** The block's size; `md` sets the title a step smaller. */
  size?: BlockSize
  align?: BlockAlign
  /** The block's intent; highlighted words take it, or brand-secondary without one. */
  intent?: BlockIntent
  /** Runs the description the heading's full width instead of balancing it to a measure. */
  wide?: boolean
  id?: string
  className?: string
}

export type TitleStep = 1 | 2 | 3 | 4 | 5

const TITLE_STEP: Record<TitleStep, string> = {
  1: 'text-display-prose-1',
  2: 'text-display-prose-2',
  3: 'text-display-prose-3',
  4: 'text-display-prose-4',
  5: 'text-display-prose-5'
}

/** A title's step at a block's size: `md` is one step smaller than the preset's. */
export function titleStep(step: TitleStep, size: BlockSize | undefined): TitleStep {
  return size === 'md' ? (Math.min(step + 1, 5) as TitleStep) : step
}

export function BlockHeading({
  eyebrow,
  title,
  titleHighlight,
  description,
  level = 2,
  step = level,
  size,
  align = 'center',
  intent,
  wide = false,
  id,
  className
}: BlockHeadingProps) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-1 gap-2',
        align === 'center' ? 'justify-items-center text-center' : 'text-start',
        className
      )}
    >
      {eyebrow && <p className='text-display-prose-5 text-strong'>{eyebrow}</p>}
      <Heading
        id={id}
        className={cn(
          'max-w-5xl text-balance wrap-anywhere text-strong',
          TITLE_STEP[titleStep(step, size)]
        )}
      >
        {titleHighlight ? (
          <Highlight
            text={title}
            query={titleHighlight}
            intent={intent ?? 'brand-secondary'}
          />
        ) : (
          title
        )}
      </Heading>
      {description && (
        <p
          className={cn(
            'text-xl wrap-anywhere text-subtle',
            wide ? 'text-pretty' : 'max-w-3xl text-balance'
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
