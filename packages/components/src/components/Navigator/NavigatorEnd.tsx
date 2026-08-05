import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { navigatorEndVariants } from './variants'

export type NavigatorEndProps = ComponentProps<'div'>

/**
 * Bottom-anchored group in the rail — account, organisation switcher,
 * settings. Also a position marker: `Navigator.Primary` detects it by
 * reference to decide whether a mobile End slot exists and what the final
 * tab is called.
 */
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
