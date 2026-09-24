import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CalloutActionsProps = ComponentProps<'div'>

/** Buttons or links. They sit below the text in a narrow callout and beside it in a wide one. */
export function CalloutActions({ className, ...props }: CalloutActionsProps) {
  return (
    <div
      data-slot='callout-actions'
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    />
  )
}

CalloutActions.displayName = 'Callout.Actions'
