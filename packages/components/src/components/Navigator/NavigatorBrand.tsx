import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { navigatorBrandVariants } from './variants'

export type NavigatorBrandProps = ComponentProps<'div'>

/** Logo or wordmark at the top of the primary navigation, on desktop only. */
export function NavigatorBrand({ className, ...props }: NavigatorBrandProps) {
  return (
    <div
      data-slot='navigator-brand'
      className={cn(navigatorBrandVariants(), className)}
      {...props}
    />
  )
}

NavigatorBrand.displayName = 'Navigator.Brand'
