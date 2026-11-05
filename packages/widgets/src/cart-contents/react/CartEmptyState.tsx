'use client'

import { BagIcon } from '@phosphor-icons/react'

import { Button } from '@oztix/roadie-components/button'
import { EmptyState } from '@oztix/roadie-components/empty-state'

type CartEmptyStateProps = {
  /** App-specific browse target (replaces the website's hardcoded route). */
  browseHref: string
  onNavigate: (href: string) => void
  size?: 'sm' | 'md'
}

export function CartEmptyState({
  browseHref,
  onNavigate,
  size = 'sm'
}: CartEmptyStateProps) {
  return (
    <EmptyState size={size}>
      <EmptyState.IconTile>
        <BagIcon weight='duotone' aria-hidden='true' />
      </EmptyState.IconTile>
      <EmptyState.Title>Your cart is empty</EmptyState.Title>
      <EmptyState.Description>
        Browse events and add tickets to get started.
      </EmptyState.Description>
      <EmptyState.Actions>
        <Button
          intent='brand'
          emphasis='strong'
          onClick={() => onNavigate(browseHref)}
        >
          Browse events
        </Button>
      </EmptyState.Actions>
    </EmptyState>
  )
}
