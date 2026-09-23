import type { ComponentProps } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { RoadieRoutedLink } from '../Link/RoadieRoutedLink'

export type CardLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  /**
   * Where the card goes. Internal hrefs route through the configured
   * `RoadieLinkProvider`; external hrefs open in a new tab.
   */
  href: string
  /** Force external-link treatment. */
  external?: boolean
}

/** The card's main link, usually wrapping the title text. It covers the whole card, and other links and buttons inside the card stay clickable above it. */
export function CardLink({ className, ...props }: CardLinkProps) {
  return (
    <RoadieRoutedLink
      data-slot='card-link'
      data-interactive-target=''
      className={cn('text-inherit no-underline', className)}
      {...props}
    />
  )
}

CardLink.displayName = 'Card.Link'
