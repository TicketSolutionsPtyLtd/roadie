import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { listVariants } from './variants'

export type ListEmphasis = 'subtler' | 'subtle' | 'normal'

export type ListRootProps = ComponentProps<'ul'> & {
  /**
   * Surface, mirroring Roadie's emphasis shortcuts — `subtler` (default) no
   * fill, `subtle` tinted, `normal` a bordered normal surface. Applied to each
   * row, or to the card when `contained`.
   */
  emphasis?: ListEmphasis
  /**
   * Draw the rows as a card — a single surface with square, flush rows inside
   * it — instead of individually rounded rows. With `List.Group`s, each group
   * gets its own card and the titles sit above them.
   *
   * @default false
   */
  contained?: boolean
}

export function ListRoot({
  className,
  emphasis = 'subtler',
  contained = false,
  ...props
}: ListRootProps) {
  return (
    <ul
      data-slot='list'
      // Exactly one of these is ever set, which is what lets the section and
      // item rules key off them without fighting: uncontained, the rows wear
      // the emphasis; contained, the sections do and the rows stay transparent
      // against the card.
      data-emphasis={contained ? undefined : emphasis}
      data-contained={contained ? emphasis : undefined}
      className={cn(listVariants({ emphasis, contained }), className)}
      {...props}
    />
  )
}

ListRoot.displayName = 'List.Root'
