import { Highlight } from '@oztix/roadie-components/highlight'
import { cn } from '@oztix/roadie-core/utils'

export type BlockHeadingProps = {
  eyebrow?: string
  title: string
  /** Words in the title to mark, such as `more tickets`. */
  titleHighlight?: string | string[]
  description?: string
  /** 1 only for the block that opens the page. */
  level?: 1 | 2
  /** The title's `text-display-prose-*` step, when the preset sets one other than the level's. */
  size?: 1 | 2 | 3 | 4
  align?: 'center' | 'start'
  /** Runs the description the heading's full width instead of balancing it to a measure. */
  wide?: boolean
  id?: string
  className?: string
}

const TITLE_SIZE = {
  1: 'text-display-prose-1',
  2: 'text-display-prose-2',
  3: 'text-display-prose-3',
  4: 'text-display-prose-4'
} as const

export function BlockHeading({
  eyebrow,
  title,
  titleHighlight,
  description,
  level = 2,
  size = level,
  align = 'center',
  wide = false,
  id,
  className
}: BlockHeadingProps) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div
      className={cn(
        'grid gap-2',
        align === 'center' ? 'justify-items-center text-center' : 'text-start',
        className
      )}
    >
      {eyebrow && <p className='text-display-prose-5 text-strong'>{eyebrow}</p>}
      <Heading
        id={id}
        className={cn('max-w-4xl text-balance text-strong', TITLE_SIZE[size])}
      >
        {titleHighlight ? (
          <Highlight
            text={title}
            query={titleHighlight}
            intent='brand-secondary'
          />
        ) : (
          title
        )}
      </Heading>
      {description && (
        <p
          className={cn(
            'text-xl text-subtle',
            wide ? 'text-pretty' : 'max-w-3xl text-balance'
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
