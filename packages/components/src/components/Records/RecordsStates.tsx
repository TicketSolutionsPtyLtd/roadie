'use client'

import {
  MagnifyingGlassIcon,
  TrayIcon,
  WarningIcon
} from '@phosphor-icons/react'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import type { RecordsInstance } from './useRecords'

export const errorMessage = (records: RecordsInstance) =>
  typeof records.error === 'string'
    ? records.error
    : `Couldn't load ${records.recordName.other}`

// A component can't know the page's heading outline, so state titles are text.
const stateTitle = <p />

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

export function RecordsError({ records }: { records: RecordsInstance }) {
  return (
    <EmptyState size='sm' intent='danger' data-slot='records-error'>
      <EmptyState.IconTile aria-hidden>
        <WarningIcon weight='duotone' />
      </EmptyState.IconTile>
      <EmptyState.Title render={stateTitle}>
        {errorMessage(records)}
      </EmptyState.Title>
      <EmptyState.Description>
        Check your connection and try again.
      </EmptyState.Description>
      {records.onRetry && (
        <EmptyState.Actions>
          <Button emphasis='strong' onClick={records.onRetry}>
            Retry
          </Button>
        </EmptyState.Actions>
      )}
    </EmptyState>
  )
}

export function RecordsEmpty({ records }: { records: RecordsInstance }) {
  const { other } = records.recordName
  if (!records.filtered)
    return (
      <EmptyState size='sm' data-slot='records-empty'>
        <EmptyState.IconTile aria-hidden>
          <TrayIcon weight='duotone' />
        </EmptyState.IconTile>
        <EmptyState.Title render={stateTitle}>No {other} yet</EmptyState.Title>
        <EmptyState.Description>
          {capitalise(other)} you add appear here.
        </EmptyState.Description>
      </EmptyState>
    )
  return (
    <EmptyState size='sm' data-slot='records-empty'>
      <EmptyState.IconTile aria-hidden>
        <MagnifyingGlassIcon weight='duotone' />
      </EmptyState.IconTile>
      <EmptyState.Title render={stateTitle}>No {other} match</EmptyState.Title>
      <EmptyState.Description>
        Try a different search or clear the filters.
      </EmptyState.Description>
      <EmptyState.Actions>
        <Button onClick={records.clearQuery}>Clear search and filters</Button>
      </EmptyState.Actions>
    </EmptyState>
  )
}
