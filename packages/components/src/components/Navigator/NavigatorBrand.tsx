import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'
import { Logo } from '../Logo'
import { navigatorBrandVariants } from './variants'

export type NavigatorBrandProps = Omit<
  ComponentProps<'a'>,
  'href' | 'children'
> & {
  /** Where the brand leads; routes through `RoadieLinkProvider`. @default '/' */
  href?: string
  /** The mark, then anything that shows once expanded; it names the link. @default <Logo /> */
  children?: ReactNode
}

/** The Oztix logo, or your own mark, atop the vertical navigation, linking home. */
export function NavigatorBrand({
  href = '/',
  className,
  children = <Logo />,
  ...props
}: NavigatorBrandProps) {
  return (
    <RoadieRoutedLink
      data-slot='navigator-brand'
      href={href}
      className={cn(navigatorBrandVariants(), className)}
      {...props}
    >
      {children}
    </RoadieRoutedLink>
  )
}

NavigatorBrand.displayName = 'Navigator.Brand'
