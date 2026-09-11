import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { listVariants } from './variants'

export type ListEmphasis = 'subtler' | 'subtle' | 'normal'

export type ListRootProps = ComponentProps<'ul'> & {
  /** Surface for each row, or for the card when `contained`. */
  emphasis?: ListEmphasis
  /**
   * Draw the rows as one card; each `List.Group` gets its own.
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
      // Mutually exclusive, so section and item rules never fight.
      data-emphasis={contained ? undefined : emphasis}
      data-contained={contained ? emphasis : undefined}
      className={cn(listVariants({ emphasis, contained }), className)}
      {...props}
    />
  )
}

ListRoot.displayName = 'List.Root'
