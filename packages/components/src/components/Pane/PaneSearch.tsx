import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { paneSearchVariants } from './variants'

export type PaneSearchProps = Omit<
  ComponentProps<'input'>,
  'onChange' | 'value' | 'type'
> & {
  value: string
  onValueChange: (next: string) => void
}

/**
 * Search field styled for a pane header.
 *
 * Deliberately carries no filtering behaviour: filtering a pane's list is a
 * plain `.filter()` on the consumer's own data. The predicate registry this
 * replaces existed only because filtered-out rows had to stay declared to keep
 * navigation state alive — a constraint that no longer exists.
 */
export function PaneSearch({
  className,
  value,
  onValueChange,
  placeholder,
  ...props
}: PaneSearchProps) {
  return (
    <input
      type='search'
      data-slot='pane-search'
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className={cn(paneSearchVariants(), className)}
      {...props}
    />
  )
}

PaneSearch.displayName = 'Pane.Search'
