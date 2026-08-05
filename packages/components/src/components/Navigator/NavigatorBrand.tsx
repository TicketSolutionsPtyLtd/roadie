import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { navigatorBrandVariants } from './variants'

export type NavigatorBrandProps = ComponentProps<'div'>

/**
 * Logo or wordmark pinned to the top of the rail. Desktop-only — it lives
 * inside the rail, which is hidden on mobile, and the tab bar has no brand
 * slot. `Navigator.Primary` detects it by reference and skips it in the item
 * walk so it never counts toward rail form, nesting or tab derivation.
 */
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
