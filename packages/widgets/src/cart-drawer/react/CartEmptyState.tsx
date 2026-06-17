'use client'

import { BagIcon } from '@phosphor-icons/react'

import { Button, EmptyState } from '@oztix/roadie-components'

type CartEmptyStateProps = {
  /** App-specific browse target (replaces the website's hardcoded route). */
  browseHref: string
  onNavigate: (href: string) => void
}

export function CartEmptyState({
  browseHref,
  onNavigate
}: CartEmptyStateProps) {
  return (
    <EmptyState>
      <EmptyState.IconTile>
        <BagIcon weight='bold' aria-hidden='true' />
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
