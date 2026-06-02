'use client'

import { ShoppingBagIcon } from '@phosphor-icons/react'

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
  // Centered empty state (parity with the Website). Roadie Button + onNavigate
  // — no next/link; routing is the consumer's job.
  return (
    <div className='flex flex-col items-center justify-center px-6 py-16 text-center'>
      <div className='mb-6 flex size-24 items-center justify-center rounded-full bg-subtle'>
        <ShoppingBagIcon
          weight='bold'
          className='size-10 text-subtler'
          aria-hidden='true'
        />
      </div>
      <h2 className='mb-2 text-display-ui-3 text-strong'>Your cart is empty</h2>
      <p className='mb-6 max-w-xs text-balance text-prose text-subtle'>
        Browse events and add tickets to get started.
      </p>
      <Button
        intent='brand'
        emphasis='strong'
        size='lg'
        onClick={() => onNavigate(browseHref)}
      >
        Browse Events
      </Button>
    </div>
  )
}
