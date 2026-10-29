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
  align?: 'center' | 'start'
  id?: string
  className?: string
}

export function BlockHeading({
  eyebrow,
  title,
  titleHighlight,
  description,
  level = 2,
  align = 'center',
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
        className={cn(
          'max-w-4xl text-balance text-strong',
          level === 1 ? 'text-display-prose-1' : 'text-display-prose-2'
        )}
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
        <p className='max-w-3xl text-xl text-balance text-subtle'>
          {description}
        </p>
      )}
    </div>
  )
}
