import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { navigatorBrandVariants } from './variants'

export type NavigatorBrandProps = Omit<ComponentProps<'a'>, 'href'> & {
  /** Where the brand leads; routes through `RoadieLinkProvider`. @default '/' */
  href?: string
}

/** Logo or wordmark atop the vertical navigation, linking home; its content names the link. */
export function NavigatorBrand({
  href = '/',
  className,
  ...props
}: NavigatorBrandProps) {
  return (
    <RoadieRoutedLink
      data-slot='navigator-brand'
      href={href}
      className={cn(navigatorBrandVariants(), className)}
      {...props}
    />
  )
}

NavigatorBrand.displayName = 'Navigator.Brand'
