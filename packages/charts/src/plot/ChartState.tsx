'use client'

import { useContext } from 'react'

import { ChartBarIcon, WarningIcon } from '@phosphor-icons/react'

import { EmptyState } from '@oztix/roadie-components/empty-state'

import { ChartCardContext } from '../Chart/context'

/** A chart's empty or draw-error state, small in a card and medium alone. */
export function ChartState({
  error = false,
  children
}: {
  error?: boolean
  children: string
}) {
  const card = useContext(ChartCardContext)
  return (
    <EmptyState
      size={card ? 'sm' : 'md'}
      intent={error ? 'danger' : undefined}
      data-slot={error ? 'chart-error' : 'chart-empty'}
    >
      <EmptyState.IconTile aria-hidden>
        {error ? (
          <WarningIcon weight='duotone' />
        ) : (
          <ChartBarIcon weight='duotone' />
        )}
      </EmptyState.IconTile>
      {/* A chart can't know the page's heading outline. */}
      <EmptyState.Title render={<p />}>{children}</EmptyState.Title>
    </EmptyState>
  )
}
