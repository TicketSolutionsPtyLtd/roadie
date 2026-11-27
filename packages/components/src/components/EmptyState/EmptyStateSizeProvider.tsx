'use client'

import type { ReactNode } from 'react'

import { EmptyStateContext } from './EmptyStateContext'
import type { EmptyStateSize } from './variants'

/** A client sibling, so EmptyStateRoot stays a Server Component and only EmptyState.IconTile reads the size. */
export function EmptyStateSizeProvider({
  size,
  children
}: {
  size: EmptyStateSize
  children: ReactNode
}) {
  return <EmptyStateContext value={size}>{children}</EmptyStateContext>
}
