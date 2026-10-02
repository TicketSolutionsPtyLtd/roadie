'use client'

import { useContext } from 'react'

import { ChartBarIcon, WarningIcon } from '@phosphor-icons/react'

import { EmptyState } from '@oztix/roadie-components/empty-state'

import { ChartCardContext } from '../Chart/context'

/**
 * A chart's empty or draw-error state: small in a card, medium alone, and
 * text only in a plot of a set height, such as a small multiples panel.
 */
export function ChartState({
  error = false,
  height,
  children
}: {
  error?: boolean
  height?: number
  children: string
}) {
  const card = useContext(ChartCardContext)
  const fitted = height !== undefined
  return (
    <EmptyState
      size={card || fitted ? 'sm' : 'md'}
      intent={error ? 'danger' : undefined}
      data-slot={error ? 'chart-error' : 'chart-empty'}
      className='content-center'
      style={fitted ? { minHeight: height } : undefined}
    >
      {!fitted && (
        <EmptyState.IconTile aria-hidden>
          {error ? (
            <WarningIcon weight='duotone' />
          ) : (
            <ChartBarIcon weight='duotone' />
          )}
        </EmptyState.IconTile>
      )}
      {/* A chart can't know the page's heading outline. */}
      <EmptyState.Title render={<p />}>{children}</EmptyState.Title>
    </EmptyState>
  )
}
