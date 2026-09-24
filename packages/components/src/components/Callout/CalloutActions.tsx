import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

export type CalloutActionsProps = ComponentProps<'div'>

/** Buttons or links. They sit below the text in a narrow callout and beside it in a wide one. */
export function CalloutActions({ className, ...props }: CalloutActionsProps) {
  return (
    <div
      data-slot='callout-actions'
      className={cn(
        'col-start-2 row-start-3 mt-3 flex flex-wrap items-center gap-2',
        '@lg:col-start-3 @lg:row-span-2 @lg:row-start-1 @lg:ms-4 @lg:mt-0 @lg:self-center',
        className
      )}
      {...props}
    />
  )
}

CalloutActions.displayName = 'Callout.Actions'
