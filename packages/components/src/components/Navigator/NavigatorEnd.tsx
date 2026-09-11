import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { navigatorEndVariants } from './variants'

export type NavigatorEndProps = ComponentProps<'div'>

/** Bottom-anchored group in the primary navigation — account, settings. */
export function NavigatorEnd({ className, ...props }: NavigatorEndProps) {
  return (
    <div
      data-slot='navigator-end'
      className={cn(navigatorEndVariants(), className)}
      {...props}
    />
  )
}

NavigatorEnd.displayName = 'Navigator.End'
