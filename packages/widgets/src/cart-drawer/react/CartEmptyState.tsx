'use client'

import { Button } from '@oztix/roadie-components'

type CartEmptyStateProps = {
  /** App-specific browse target (replaces the website's hardcoded route). */
  browseHref: string
  onNavigate: (href: string) => void
}

export function CartEmptyState({
  browseHref,
  onNavigate
}: CartEmptyStateProps) {
  // Roadie Button + onNavigate — no next/link. Routing is the consumer's job.
  return (
    <div className='grid gap-4'>
      <p className='text-prose text-subtle'>Your cart is empty.</p>
      <Button
        intent='brand'
        emphasis='strong'
        onClick={() => onNavigate(browseHref)}
      >
        Browse Events
      </Button>
    </div>
  )
}
