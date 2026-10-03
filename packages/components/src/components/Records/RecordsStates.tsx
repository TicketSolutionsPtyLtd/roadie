'use client'

import {
  MagnifyingGlassIcon,
  TrayIcon,
  WarningIcon
} from '@phosphor-icons/react'

import { describeRecordFilter } from '@oztix/roadie-core/records'

import { Button } from '../Button'
import { EmptyState } from '../EmptyState'
import type { RecordsInstance } from './useRecords'

export const errorMessage = (records: RecordsInstance) =>
  typeof records.error === 'string'
    ? records.error
    : `Couldn't load ${records.recordName.other}`

/** A range that failed after others loaded, shown in place of its rows. */
export const rangeErrorMessage = (records: RecordsInstance) =>
  `Couldn't load more ${records.recordName.other}`

// A component can't know the page's heading outline, so state titles are text.
const stateTitle = <p />

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

const NAMED_PARTS = 3

/** The search and filters that matched nothing, as people read their chips. */
function unmatched(records: RecordsInstance): string {
  // The applied view leaves out filters the fields can't apply.
  const { search, filters: applied } = records.appliedView.query
  const words = search.trim()
  const parts = [
    ...(words ? [`“${words}”`] : []),
    ...applied.map(
      (filter) =>
        describeRecordFilter(filter, records.fields, {
          now: records.now,
          timeZone: records.timeZone
        }).label
    )
  ]
  if (parts.length > NAMED_PARTS)
    return words
      ? `your search and ${applied.length} filters`
      : `these ${applied.length} filters`
  if (parts.length < 2) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

export function RecordsError({ records }: { records: RecordsInstance }) {
  return (
    <EmptyState size='sm' intent='danger' data-slot='records-error'>
      <EmptyState.IconTile aria-hidden>
        <WarningIcon weight='duotone' />
      </EmptyState.IconTile>
      <EmptyState.Title render={stateTitle}>
        {errorMessage(records)}
      </EmptyState.Title>
      {typeof records.error !== 'string' && (
        <EmptyState.Description>
          Check your connection and try again.
        </EmptyState.Description>
      )}
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
  const parts = unmatched(records)
  return (
    <EmptyState size='sm' data-slot='records-empty'>
      <EmptyState.IconTile aria-hidden>
        <MagnifyingGlassIcon weight='duotone' />
      </EmptyState.IconTile>
      <EmptyState.Title render={stateTitle}>No {other} match</EmptyState.Title>
      <EmptyState.Description>
        {parts && `Nothing matches ${parts}. `}Try a different search or clear
        the filters.
      </EmptyState.Description>
      <EmptyState.Actions>
        <Button onClick={records.clearQuery}>Clear search and filters</Button>
      </EmptyState.Actions>
    </EmptyState>
  )
}
